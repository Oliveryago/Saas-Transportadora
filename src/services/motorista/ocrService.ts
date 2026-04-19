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
  method?: 'heuristic' | 'tesseract' | 'none'; // Identifica o método usado
}

/**
 * Tenta extrair dados usando padrões (Regex)
 */
const extractDataHeuristically = (text: string): OCRResult => {
  console.log("Iniciando extração heurística no texto obtido...");

  // Regex para CPF (considerando possíveis falhas de leitura do OCR)
  const cpfMatch = text.match(/\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}/) || text.match(/\d{11}/);
  
  // Regex para Datas (DD/MM/AAAA ou variações comuns de OCR)
  const dates = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/g) || [];
  
  // Regex para Número da CNH (11 dígitos, às vezes espalhados)
  const cnhMatch = text.match(/\d{11}/);

  // Tentativa de achar nome (Linhas em caixa alta)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  // Geralmente o nome do motorista na CNH está no topo ou após "NOME"
  const potentialName = lines.find(l => /^[A-Z\s]{10,}$/.test(l)) || "";

  return {
    nome_completo: potentialName,
    cpf: cpfMatch ? cpfMatch[0].replace(/\s/g, "") : "",
    numero_cnh: cnhMatch ? cnhMatch[0] : "",
    categoria_cnh: (text.match(/\s([ABCDE]{1,2})\s/) || [])[1] || "",
    validade_cnh: dates.length > 1 ? dates[1].replace(/\//g, '-').split('-').reverse().join('-') : "",
    data_nascimento: dates.length > 0 ? dates[0].replace(/\//g, '-').split('-').reverse().join('-') : "",
    confidence: (cpfMatch || dates.length > 0) ? 0.7 : 0.1,
    rawText: text
  };
};

/**
 * Executa OCR real usando Tesseract.js
 */
const runTesseractOCR = async (file: File): Promise<string> => {
  console.log("Iniciando motor Tesseract.js...");
  const worker = await createWorker('por+eng', 1, {
    logger: m => console.log("[Tesseract Progress]:", m.status, Math.round(m.progress * 100) + "%")
  });
  
  try {
    const { data: { text } } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
    console.log("Motor Tesseract.js encerrado.");
  }
};

/**
 * Lê o conteúdo do arquivo como texto (apenas para PDFs digitais)
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject("Erro ao ler arquivo");
    reader.readAsText(file);
  });
};

export const ocrService = {
  /**
   * Processamento principal da CNH (AGORA COM OCR REAL)
   */
  async processCNH(file: File): Promise<OCRResult> {
    const isImage = file.type.startsWith('image/');
    console.log("CNH Service:", file.name, "Tipo:", file.type, "Extensão:", isImage ? "Imagem" : "Documento");

    try {
      let textContent = "";
      let method: OCRResult['method'] = 'none';

      if (isImage) {
        // FLUXO 1: IMAGEM -> OCR REAL
        textContent = await runTesseractOCR(file);
        method = 'tesseract';
      } else {
        // FLUXO 2: PDF -> TENTA TEXTO BRUTO PRIMEIRO
        const raw = await readFileAsText(file);
        
        // Verifica se o PDF tem texto útil (heurística mínima)
        if (raw.length > 50 && (raw.includes('CPF') || /\d{3}/.test(raw))) {
           textContent = raw;
           method = 'heuristic';
        } else {
           // PDF é uma imagem? No momento não temos renderizador de PDF para OCR.
           // Mas poderíamos sinalizar que o PDF é escaneado e precisa de motor.
           console.warn("PDF parece ser uma imagem. Texto bruto insuficiente.");
           textContent = "[Aviso: PDF escaneado precisa de motor de visão para extração completa]";
           method = 'none';
        }
      }

      // Processa o texto (seja do OCR ou do PDF)
      const result = extractDataHeuristically(textContent);
      return { ...result, method };

    } catch (error) {
      console.error("Erro crítico no processamento CNH:", error);
      throw new Error("Não foi possível processar o documento enviado.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};


