import { createWorker } from 'tesseract.js';

/**
 * Serviço de OCR para Processamento de CNH - V7.0
 * 
 * Realidade:
 * - PDFs da Carteira Digital de Trânsito (CDT) usam codificação de fonte customizada
 * - Letras saem embaralhadas tanto no texto digital quanto no OCR
 * - Números (CPF, datas) são extraídos corretamente pelo texto digital
 * 
 * Estratégia:
 * - PDF: Extrai texto digital de todas as páginas → pega CPF + datas
 * - Imagem (foto): Usa Tesseract OCR (funciona bem com fotos tiradas da CNH física)
 * - Campos não detectados ficam vazios para preenchimento manual
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

// ==========================================
// PARSER DE CAMPOS DA CNH
// ==========================================
const extractDataHeuristically = (text: string): OCRResult => {
  console.clear();
  console.log("%c--- SISTEMA DE OCR V7.0 ---", "background: #00ff00; color: black; font-size: 20px; padding: 10px;");

  // ===== CPF =====
  let cpf = "";
  // Formato com máscara: 122.469.278-03
  const cpfMask = text.match(/(\d{3}[.\s]\d{3}[.\s]\d{3}[-.\s]\d{2})/);
  if (cpfMask) {
    cpf = cpfMask[1].replace(/\D/g, "");
  }
  // Formato sem máscara: procura blocos de 11 dígitos
  if (!cpf) {
    const blocks = text.match(/\b\d{11}\b/g) || [];
    // Filtra blocos que parecem ser CPF (não começam com 4011 que é assinatura digital)
    for (const b of blocks) {
      if (!b.startsWith("4011")) {
        cpf = b;
        break;
      }
    }
    // Se só tiver blocos com 4011, pega qualquer um
    if (!cpf && blocks.length > 0) cpf = blocks[0];
  }

  // ===== DATAS (DD/MM/AAAA) =====
  const allDates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  let dataNasc = "";
  let dataVal = "";

  for (const d of allDates) {
    const parts = d.split('/');
    const year = parseInt(parts[2]);
    const formatted = parts.reverse().join('-'); // YYYY-MM-DD

    if (year >= 1940 && year <= 2010 && !dataNasc) {
      dataNasc = formatted;
    } else if (year >= 2024 && !dataVal) {
      dataVal = formatted;
    }
  }

  // ===== NOME =====
  let nome = "";
  const NOT_NAMES = [
    "REPÚBLICA", "FEDERATIVA", "BRASIL", "MINISTÉRIO", "INFRAESTRUTURA",
    "SECRETARIA", "NACIONAL", "TRÂNSITO", "SENATRAN", "CONTRAN", "DENATRAN",
    "DETRAN", "SERPRO", "ASSINADOR", "DEPARTAMENTO", "HABILITAÇÃO",
    "CARTEIRA", "DOCUMENTO", "CERTIFICADO", "PROVISÓRIA", "MEDIDA",
    "PORTADOR", "ASSINATURA", "OBSERVAÇÕES", "DIGITAL", "FILIAÇÃO",
    "PERMISSÃO", "ESTADUAL", "IDENTIDADE", "REGISTRO", "HABILITACAO"
  ];

  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
  for (const line of lines) {
    const clean = line.toUpperCase().trim();
    if (
      clean.length >= 10 &&
      clean.length <= 50 &&
      clean.split(/\s+/).length >= 2 &&
      clean.split(/\s+/).length <= 5 &&
      /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+$/.test(clean) &&
      !NOT_NAMES.some(k => clean.includes(k))
    ) {
      nome = clean;
      break;
    }
  }

  // ===== REGISTRO (N° CNH) =====
  let cnh = "";
  // Procura padrão REGISTRO + número
  const regPatterns = [
    /N[°º]\s*REGISTRO\s*[:\-.\s]*(\d{9,11})/i,
    /REGISTRO\s*[:\-.\s]*(\d{9,11})/i,
  ];
  for (const p of regPatterns) {
    const m = text.match(p);
    if (m && m[1]) { cnh = m[1]; break; }
  }
  // Fallback: segundo bloco de 11 dígitos diferente do CPF
  if (!cnh) {
    const all11 = text.match(/\b\d{11}\b/g) || [];
    for (const n of all11) {
      if (n !== cpf && !n.startsWith("4011")) {
        cnh = n;
        break;
      }
    }
  }

  // ===== CATEGORIA =====
  let categoria = "";
  const catPatterns = [
    /CAT[.\s]*HAB[.\s]*[:\s]*([A-E]{1,3})/i,
    /CATEGORIA[:\s]*([A-E]{1,3})/i,
    /CAT[.\s]+([A-E]{1,3})/i,
  ];
  for (const p of catPatterns) {
    const m = text.match(p);
    if (m && m[1]) { categoria = m[1].toUpperCase(); break; }
  }

  // ===== RESULTADO =====
  const fieldsFound = [cpf, dataNasc, dataVal, nome, cnh, categoria].filter(f => f.length > 0).length;
  
  const result: OCRResult = {
    nome_completo: nome.replace(/\d/g, "").replace(/\s{2,}/g, " ").trim(),
    cpf,
    numero_cnh: cnh.replace(/\D/g, ""),
    categoria_cnh: categoria,
    validade_cnh: dataVal,
    data_nascimento: dataNasc,
    confidence: fieldsFound / 6,
    rawText: text
  };

  // Debug
  console.log("%cTEXTO BRUTO:", "color: #4f46e5; font-weight: bold;");
  console.log(text);
  
  console.log("%cCAMPOS EXTRAÍDOS:", "color: green; font-weight: bold; font-size: 14px;");
  console.table({
    "Nome": result.nome_completo || "⚠️ Não detectado (preencher manualmente)",
    "CPF": result.cpf || "⚠️ Não detectado",
    "CNH": result.numero_cnh || "⚠️ Não detectado (preencher manualmente)",
    "Nascimento": result.data_nascimento || "⚠️ Não detectado",
    "Validade": result.validade_cnh || "⚠️ Não detectado",
    "Categoria": result.categoria_cnh || "⚠️ Não detectada (preencher manualmente)",
    "Campos OK": `${fieldsFound}/6`
  });

  if (fieldsFound < 6) {
    console.log("%c⚠️ Alguns campos não foram detectados automaticamente. O PDF da Carteira Digital usa codificação especial que limita a leitura de alguns campos. Preencha manualmente os campos vazios.", "color: #d97706; font-size: 12px;");
  }

  return result;
};

// ==========================================
// TESSERACT OCR (apenas para IMAGENS/FOTOS)
// ==========================================
const runTesseractOCR = async (file: File): Promise<string> => {
  console.log("[OCR] Iniciando Tesseract.js para imagem...");
  const worker = await createWorker('por+eng', 1, {
    logger: m => {
      if (m.progress > 0 && m.progress < 1) {
        console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  try {
    const { data: { text } } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
};

// ==========================================
// EXTRAÇÃO DE PDF (texto digital direto)
// ==========================================
const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log("%c[PDF] Extraindo texto digital de todas as páginas...", "color: #4f46e5; font-weight: bold;");
  
  try {
    // Carrega PDF.js
    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      await new Promise(r => { script.onload = r; });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    
    console.log(`[PDF] ${totalPages} página(s)`);

    let fullText = "";

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Reconstrói texto preservando posição
      let pageText = "";
      let lastY: number | null = null;
      
      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === "") continue;
        
        // Nova linha quando Y muda significativamente
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 3) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        
        pageText += item.str;
        lastY = item.transform[5];
      }
      
      console.log(`[PDF] Pág ${i}: ${pageText.length} chars`);
      fullText += pageText + "\n";
    }

    console.log(`[PDF] Total: ${fullText.length} caracteres extraídos`);
    return fullText;

  } catch (error) {
    console.error("[PDF] Erro:", error);
    throw new Error("Não foi possível ler o PDF.");
  }
};

// ==========================================
// SERVIÇO PÚBLICO
// ==========================================
export const ocrService = {
  async processCNH(file: File): Promise<OCRResult> {
    const isImage = file.type.startsWith('image/');
    
    try {
      let textContent = "";
      let method: OCRResult['method'] = 'none';

      if (isImage) {
        // Fotos da CNH: usa Tesseract OCR
        textContent = await runTesseractOCR(file);
        method = 'tesseract';
      } else {
        // PDFs: usa extração de texto digital (rápido e preciso para números)
        textContent = await extractTextFromPDF(file);
        method = 'heuristic';
      }

      const result = extractDataHeuristically(textContent);
      return { ...result, method };

    } catch (error) {
      console.error("Erro fatal:", error);
      throw new Error("Falha ao processar documento.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};
