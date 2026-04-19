import { createWorker } from 'tesseract.js';

/**
 * Serviço de OCR para Processamento de CNH - V5.0
 * Estratégia: Texto Digital (todas as páginas) → OCR Fallback
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
 * Extrai e mapeia campos da CNH a partir do texto bruto
 */
const extractDataHeuristically = (text: string): OCRResult => {
  console.clear();
  console.log("%c--- SISTEMA DE OCR V5.0 ATIVO ---", "background: #00ff00; color: black; font-size: 20px; padding: 10px; border-radius: 8px;");

  // Normaliza o texto para facilitar o parsing
  const upperText = text.toUpperCase();
  const lines = upperText.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // ========== 1. NOME ==========
  let nome = "";
  const keywordsToIgnore = [
    "REPÚBLICA", "FEDERATIVA", "BRASIL", "MINISTÉRIO", "INFRAESTRUTURA",
    "SECRETARIA", "NACIONAL", "TRÂNSITO", "SENATRAN", "CONTRAN", "DENATRAN",
    "DETRAN", "SERPRO", "ASSINADOR", "DEPARTAMENTO", "HABILITAÇÃO",
    "CARTEIRA", "DOCUMENTO", "CERTIFICADO", "PROVISÓRIA", "MEDIDA",
    "PORTADOR", "ASSINATURA", "OBSERVAÇÕES", "DIGITAL", "FILIAÇÃO",
    "PERMISSÃO", "VALIDADO", "QR-CODE", "QR CODE"
  ];

  // Tenta encontrar o nome após a palavra "NOME" no texto
  // O PDF do CDT coloca os campos em sequência, então procuramos pelo padrão
  const nomePatterns = [
    /NOME\s*[:.]?\s*([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]{5,})/i,
    /NOME\s*\n\s*([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]{5,})/i,
  ];

  for (const pattern of nomePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!keywordsToIgnore.some(k => candidate.toUpperCase().includes(k))) {
        nome = candidate;
        break;
      }
    }
  }

  // Fallback: procura linhas que sejam apenas letras maiúsculas (nomes próprios)
  if (!nome) {
    for (const line of lines) {
      if (
        line.length >= 10 &&
        line.length <= 60 &&
        /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+$/.test(line) &&
        line.split(/\s+/).length >= 2 &&
        !keywordsToIgnore.some(k => line.includes(k))
      ) {
        nome = line;
        break;
      }
    }
  }

  // ========== 2. CPF ==========
  let cpf = "";
  // Prioridade 1: CPF com máscara (XXX.XXX.XXX-XX)
  const cpfMasked = text.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
  if (cpfMasked) {
    cpf = cpfMasked[1].replace(/[^\d]/g, "");
  } else {
    // Prioridade 2: Primeiro bloco de 11 dígitos
    const digits11 = text.match(/\d{11}/g);
    if (digits11 && digits11.length > 0) {
      cpf = digits11[0];
    }
  }

  // ========== 3. NÚMERO DE REGISTRO (CNH) ==========
  let cnh = "";
  // Procura especificamente por "Nº REGISTRO" ou "REGISTRO" seguido de números
  const registroPatterns = [
    /N[°º]\s*REGISTRO\s*[:.]?\s*(\d{9,11})/i,
    /REGISTRO\s*[:.]?\s*(\d{9,11})/i,
    /N[°º]\s*[:.]?\s*(\d{9,11})/i,
  ];

  for (const pattern of registroPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      cnh = match[1];
      break;
    }
  }

  // Fallback: segundo bloco de 11 dígitos diferente do CPF
  if (!cnh) {
    const all11 = text.match(/\d{11}/g) || [];
    for (const num of all11) {
      if (num !== cpf) {
        cnh = num;
        break;
      }
    }
  }

  // ========== 4. DATAS ==========
  const allDates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];

  let dataNascimento = "";
  let dataValidade = "";

  for (const d of allDates) {
    const year = parseInt(d.split('/')[2]);
    if (year >= 1940 && year <= 2010 && !dataNascimento) {
      dataNascimento = d.split('/').reverse().join('-'); // YYYY-MM-DD
    } else if (year >= 2024 && !dataValidade) {
      dataValidade = d.split('/').reverse().join('-');
    }
  }

  // ========== 5. CATEGORIA ==========
  let categoria = "";
  const catPatterns = [
    /CAT[.\s]*HAB[.\s]*[:.]?\s*([A-E]{1,3})/i,
    /CATEGORIA\s*[:.]?\s*([A-E]{1,3})/i,
    /CAT[.\s]*[:.]?\s*([A-E]{1,3})/i,
    /\bACC\b\s*([A-E]{1,3})/i,
  ];

  for (const pattern of catPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      categoria = match[1].toUpperCase();
      break;
    }
  }

  // Fallback: procura "EAR" nas observações (que indica as categorias habilitadas)
  if (!categoria) {
    const obsMatch = text.match(/OBSERVA[ÇC][ÕO]ES\s*[:.]?\s*([A-Z\s,;/]+)/i);
    if (obsMatch) {
      // Extrai apenas letras de A-E do campo de observações
      const obsLetters = obsMatch[1].match(/[A-E]/g);
      if (obsLetters && obsLetters.length > 0) {
        categoria = [...new Set(obsLetters)].join('');
      }
    }
  }

  const result: OCRResult = {
    nome_completo: nome.replace(/[\d]/g, "").replace(/\s{2,}/g, " ").trim(),
    cpf,
    numero_cnh: cnh.replace(/\D/g, ""),
    categoria_cnh: categoria,
    validade_cnh: dataValidade,
    data_nascimento: dataNascimento,
    confidence: (cpf && nome) ? 0.95 : (cpf ? 0.7 : 0.3),
    rawText: text
  };

  // Debug detalhado
  console.log("%cTEXTO BRUTO EXTRAÍDO:", "font-weight: bold; font-size: 11px; color: #4f46e5;");
  console.log(text);

  console.log("%cRESULTADO DA EXTRAÇÃO:", "font-weight: bold; color: green; font-size: 14px;");
  console.table({
    "Nome": result.nome_completo,
    "CPF": result.cpf,
    "CNH (Registro)": result.numero_cnh,
    "Nascimento": result.data_nascimento,
    "Validade": result.validade_cnh,
    "Categoria": result.categoria_cnh,
    "Confiança": result.confidence,
    "Total Datas": allDates.length,
    "Datas encontradas": allDates.join(' | ')
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
 * Extrai texto de um PDF - Estratégia em 2 fases:
 * FASE 1: Texto digital (todas as páginas) - Instantâneo e 100% preciso
 * FASE 2: Se não encontrar CPF no texto, renderiza como imagem e usa OCR
 */
const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log("%c[PDF] Iniciando extração inteligente V5.0...", "color: #4f46e5; font-weight: bold; font-size: 14px;");
  
  try {
    // Carrega PDF.js via CDN
    if (!(window as any).pdfjsLib) {
      console.log("[PDF] Carregando motor PDF.js...");
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // ===== FASE 1: Extrai texto digital de TODAS as páginas =====
    let fullDigitalText = "";
    const totalPages = pdf.numPages;
    console.log(`[PDF] Total de páginas: ${totalPages}`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Junta os itens de texto preservando espaços e quebras de linha
      let pageText = "";
      let lastY: number | null = null;
      
      for (const item of textContent.items as any[]) {
        if (item.str === undefined) continue;
        
        // Detecta mudança de linha pela posição Y
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += "\n";
        }
        pageText += item.str + " ";
        lastY = item.transform[5];
      }
      
      fullDigitalText += pageText + "\n--- PÁGINA " + pageNum + " ---\n";
    }

    console.log(`[PDF] Texto digital extraído: ${fullDigitalText.length} caracteres`);
    console.log("%c[PDF] Texto digital bruto:", "color: #059669;");
    console.log(fullDigitalText);

    // Verifica se o texto digital contém dados úteis (CPF é o melhor indicador)
    const hasCPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/.test(fullDigitalText) || /\d{11}/.test(fullDigitalText);
    const hasName = /NOME/i.test(fullDigitalText);
    const hasRelevantData = fullDigitalText.length > 100 && (hasCPF || hasName);

    if (hasRelevantData) {
      console.log("%c[PDF] ✅ Dados relevantes encontrados no texto digital! Usando extração instantânea.", "color: #059669; font-weight: bold; font-size: 13px;");
      return fullDigitalText;
    }

    // ===== FASE 2: Fallback para OCR (PDF é imagem/scan) =====
    console.log("%c[PDF] ⚠️ Texto digital insuficiente. Renderizando para OCR...", "color: #d97706; font-weight: bold;");
    
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 3.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error("Erro ao criar canvas");
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return reject("Erro ao gerar imagem do PDF");
        try {
          const imageFile = new File([blob], "cnh_ocr.png", { type: "image/png" });
          const text = await runTesseractOCR(imageFile);
          resolve(text);
        } catch (err) { reject(err); }
      }, 'image/png');
    });

  } catch (error) {
    console.error("[PDF] Erro crítico:", error);
    throw new Error("Não foi possível processar o PDF.");
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

      if (textContent.length < 20) {
        console.warn("Texto extraído muito curto:", textContent.length, "caracteres");
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
