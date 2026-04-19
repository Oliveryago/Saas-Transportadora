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
  console.log("%c--- SISTEMA DE OCR V2.0 ATIVO ---", "background: #00ff00; color: black; font-size: 20px; padding: 10px; border-radius: 8px;");

  // Melhora na busca do Nome
  let nome = "";
  const lines = text.split('\n').map(l => l.trim().toUpperCase());
  
  // 1. Tenta achar especificamente após a palavra NOME
  const nomeMatch = text.match(/NOME[ ]*(COMPLETO)?[ ]*[:\-]?([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]{10,})/i);
  if (nomeMatch && nomeMatch[2]) {
    nome = nomeMatch[2].trim();
  } else {
    // 2. Procura a maior linha em caixa alta que pareça um nome
    nome = lines.find(l => 
      l.length > 10 && 
      /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+$/.test(l) && 
      !l.includes("CNH") && !l.includes("BRASIL") && !l.includes("DENTIDADE")
    ) || "";
  }

  // CPF (Prioriza o que tem pontos e traço)
  const cpfWithMask = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  const all11Digits = text.match(/\d{11}/g) || [];
  const cpfFound = cpfWithMask ? cpfWithMask[0] : (all11Digits.length > 0 ? all11Digits[0] : "");
  const cpf = cpfFound.replace(/[^0-9]/g, "");

  // Registro/CNH (Cuidado para não ser igual ao CPF)
  let cnh = "";
  const registroMatch = text.match(/REGISTRO[ ]*[:\- ]*[ ]*(\d{11})/i);
  if (registroMatch) {
    cnh = registroMatch[1];
  } else {
    // Pega o primeiro número de 11 dígitos que NÃO seja o CPF
    cnh = all11Digits.find(n => n !== cpfFound && n !== cpf) || (all11Digits[0] || "");
  }

  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  const catMatch = text.match(/CAT[.\s]*([A-E]{1,2})/i);

  const result = {
    nome_completo: nome.split('\n')[0].trim(),
    cpf,
    numero_cnh: cnh.replace(/\D/g, ""),
    categoria_cnh: catMatch ? catMatch[1] : "",
    validade_cnh: dates.length > 1 ? dates[1].split('/').reverse().join('-') : "",
    data_nascimento: dates.length > 0 ? dates[0].split('/').reverse().join('-') : "",
    confidence: (cpf || nome) ? 0.8 : 0.1,
    rawText: text
  };

  console.log("%cTEXTO BRUTO QUE O SISTEMA LEU:", "font-weight: bold; font-size: 14px; color: #4f46e5;");
  console.log(text);
  
  console.log("%cTABELA DE EXTRAÇÃO:", "font-weight: bold; color: green;");
  console.table({
    "Nome Detectado": result.nome_completo,
    "CPF": result.cpf,
    "CNH (Registro)": result.numero_cnh,
    "Data Nasc": result.data_nascimento,
    "Total Datas": dates.length
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
 * Extrai texto de um PDF usando PDF.js (via CDN para evitar problemas de build)
 */
const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log("Iniciando extração inteligente de PDF...");
  
  try {
    // Carrega o PDF.js dinamicamente se não estiver disponível
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
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Erro ao ler PDF com PDF.js:", error);
    // Fallback: tenta ler como texto simples se o PDF.js falhar
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject("Erro ao ler arquivo");
      reader.readAsText(file);
    });
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




