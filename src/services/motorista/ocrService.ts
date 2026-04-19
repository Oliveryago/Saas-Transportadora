import { createWorker } from 'tesseract.js';

/**
 * Serviço de OCR para Processamento de CNH
 */

export interface OCRResult {
  nome_completo: string;
  cpf: string;
  numero_cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  data_nascimento: string;
  confidence: number;
  rawText?: string;
  method?: 'heuristic' | 'tesseract' | 'none';
}

/**
 * Tenta extrair dados usando padrões (Regex) melhorados
 */
const extractDataHeuristically = (text: string): OCRResult => {
  // LOG ULTRA VISÍVEL
  console.clear();
  console.log("%c--- SISTEMA DE OCR V4.0 ATIVO ---", "background: #00ff00; color: black; font-size: 20px; padding: 10px; border-radius: 8px;");

  const lines = text.split('\n').map(l => l.trim().toUpperCase()).filter(l => l.length > 2);
  
  // 1. EXTRAÇÃO DE NOME (Melhorado: Ignora cabeçalhos do governo)
  let nome = "";
  const keywordsToIgnore = ["MINISTÉRIO", "INFRAESTRUTURA", "SECRETARIA", "NACIONAL", "TRÂNSITO", "SENATRAN", "CONTRAN", "DENATRAN", "FEDERATIVA", "DETRAN", "SERPRO", "ASSINADOR"];
  
  // Tenta achar especificamente próximo à palavra NOME
  const nomeKeywords = [/NOME[ ]*(COMPLETO)?[ ]*[:\-]?/i, /NOME[:\-]?/i];
  let foundNameLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("NOME")) {
      foundNameLine = i;
      break;
    }
  }

  if (foundNameLine !== -1) {
    // Se a palavra NOME está na mesma linha que o nome (ex: "NOME: FULANO")
    const cleanLine = lines[foundNameLine].replace(/NOME[ ]*(COMPLETO)?[ ]*[:\-]?/i, "").trim();
    if (cleanLine.length > 5 && !keywordsToIgnore.some(k => cleanLine.includes(k))) {
      nome = cleanLine;
    } else if (lines[foundNameLine + 1]) {
      // Pega a linha seguinte
      nome = lines[foundNameLine + 1];
    }
  }

  // Fallback: Procura a linha mais longa que NÃO contenha as palavras proibidas
  if (!nome || keywordsToIgnore.some(k => nome.includes(k))) {
    const potentialNames = lines.filter(l => 
      l.length > 10 && 
      /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+$/.test(l) && 
      !keywordsToIgnore.some(k => l.includes(k)) &&
      !l.includes("CNH") && !l.includes("BRASIL")
    );
    nome = potentialNames[0] || "";
  }

  // 2. CPF (Com máscara ou 11 dígitos)
  const cpfWithMask = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  const all11Digits = text.match(/\d{11}/g) || [];
  const cpfFound = cpfWithMask ? cpfWithMask[0] : (all11Digits.length > 0 ? all11Digits[0] : "");
  const cpf = cpfFound.replace(/[^0-9]/g, "");

  // 3. REGISTRO / NÚMERO DA CNH (Melhorado: Procura por "N°" ou "REGISTRO")
  let cnh = "";
  const registroKeywords = [/REGISTRO[ :\-]*(\d{11})/i, /N[º°][ :\-]*(\d{11})/i, /CNH[ :\-]*(\d{11})/i];
  
  for (const pattern of registroKeywords) {
    const match = text.match(pattern);
    if (match && match[1]) {
      cnh = match[1];
      break;
    }
  }

  if (!cnh) {
    // Pega o segundo número de 11 dígitos que NÃO seja o CPF
    cnh = all11Digits.find(n => n.replace(/\D/g, "") !== cpf) || (all11Digits.length > 1 ? all11Digits[1] : "");
  }

  // 4. DATAS (DD/MM/AAAA)
  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  
  // 5. CATEGORIA (Padrões como "CAT. AB", "CATEGORIA D", ou apenas "AD")
  let categoria = "";
  const catPatterns = [
    /CAT[.\s]*([A-E]{1,2})/i,
    /CATEGORIA[ \-]*([A-E]{1,2})/i,
    /\s([A-E]{1,2})\s/
  ];

  for (const pattern of catPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length <= 2) {
      categoria = match[1];
      break;
    }
  }

  const result = {
    nome_completo: nome.replace(/[\d]/g, "").trim(),
    cpf,
    numero_cnh: cnh.replace(/\D/g, ""),
    categoria_cnh: categoria.trim(),
    validade_cnh: dates.length > 1 ? dates.find(d => d.includes("202"))?.split('/').reverse().join('-') || "" : "",
    data_nascimento: dates.length > 0 ? dates.find(d => d.includes("19") || d.includes("200"))?.split('/').reverse().join('-') || "" : "",
    confidence: (cpf && nome) ? 0.9 : 0.4,
    rawText: text
  };

  console.log("%cTEXTO BRUTO QUE O SISTEMA LEU:", "font-weight: bold; font-size: 11px; color: #4f46e5;");
  console.log(text);
  
  console.table({
    "Nome": result.nome_completo,
    "CPF": result.cpf,
    "CNH": result.numero_cnh,
    "Nascimento": result.data_nascimento,
    "Validade": result.validade_cnh,
    "Categoria": result.categoria_cnh
  });

  return result;
};


/**
 * Executa OCR real usando Tesseract.js
 */
const runTesseractOCR = async (file: File): Promise<string> => {
  console.log("Iniciando motor Tesseract.js...");
  const worker = await createWorker('por+eng', 1, {
    logger: m => console.log("[Tesseract]:", m.status, Math.round(m.progress * 100) + "%")
  });
  
  try {
    const { data: { text } } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
};

/**
 * Extrai texto de um PDF usando PDF.js (Via Texto Digital ou OCR Fallback)
 */
const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log("%cIniciando extração inteligente de PDF (Digital + OCR)...", "color: #4f46e5; font-weight: bold;");
  
  try {
    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    // PASSO 1: Tenta extrair a camada de texto digital primeiro (MUITO mais rápido e preciso)
    const textContent = await page.getTextContent();
    const digitalText = textContent.items.map((item: any) => item.str).join(' ');
    
    // Se encontrar um CPF ou NOME na camada de texto, usa ela
    if (digitalText.length > 50 && (digitalText.includes('.') || digitalText.includes('-'))) {
      console.log("%cTexto DIGITAL detectado no PDF. Extração instantânea concluída.", "color: #059669; font-weight: bold;");
      return digitalText;
    }

    // PASSO 2: FALLBACK PARA OCR (Se o PDF for apenas uma imagem/scaneamento)
    console.log("%cPDF sem camada de texto. Renderizando para OCR...", "color: #d97706; font-weight: bold;");
    const viewport = page.getViewport({ scale: 3.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error("Erro canvas");
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    // Converte para imagem e manda pro Tesseract
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return reject("Erro no Blob");
        try {
          const imageFile = new File([blob], "cnh_ocr.png", { type: "image/png" });
          const text = await runTesseractOCR(imageFile);
          resolve(text);
        } catch (err) { reject(err); }
      }, 'image/png');
    });

  } catch (error) {
    console.error("Erro no processamento do PDF:", error);
    throw new Error("Não foi possível ler o PDF.");
  }
};




export const ocrService = {
  async processCNH(file: File): Promise<OCRResult> {
    const isImage = file.type.startsWith('image/');
    
    try {
      let textContent = "";
      let method: OCRResult['method'] = 'none';

      if (isImage) {
        textContent = await runTesseractOCR(file);
        method = 'tesseract';
      } else {
        textContent = await extractTextFromPDF(file);
        method = 'heuristic';
      }

      // Se o texto extraído do PDF for muito curto ou parecer binário, avisa
      if (textContent.length < 50 || textContent.includes('/XObject')) {
        console.warn("Texto extraído parece insuficiente ou binário. Tentando fallback...");
      }

      const result = extractDataHeuristically(textContent);
      return { ...result, method };

    } catch (error) {
      console.error("Erro no processamento:", error);
      throw new Error("Falha ao processar documento.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};




