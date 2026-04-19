import { createWorker } from 'tesseract.js';

/**
 * Serviço de OCR para Processamento de CNH - V6.0
 * Foco: PDF da Carteira Digital de Trânsito (CDT)
 * 
 * Estratégia em 3 fases:
 * 1. Tenta ler campos de formulário/anotações do PDF
 * 2. Tenta texto digital de todas as páginas
 * 3. Renderiza cada página removendo fundo verde e faz OCR
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
  console.log("%c--- SISTEMA DE OCR V6.0 ---", "background: #00ff00; color: black; font-size: 20px; padding: 10px;");

  const upperText = text.toUpperCase();

  // Lista de palavras que NÃO são nomes de pessoas
  const NOT_NAMES = [
    "REPÚBLICA", "FEDERATIVA", "BRASIL", "MINISTÉRIO", "INFRAESTRUTURA",
    "SECRETARIA", "NACIONAL", "TRÂNSITO", "SENATRAN", "CONTRAN", "DENATRAN",
    "DETRAN", "SERPRO", "ASSINADOR", "DEPARTAMENTO", "HABILITAÇÃO",
    "CARTEIRA", "DOCUMENTO", "CERTIFICADO", "PROVISÓRIA", "MEDIDA",
    "PORTADOR", "ASSINATURA", "OBSERVAÇÕES", "DIGITAL", "FILIAÇÃO",
    "PERMISSÃO", "VALIDADO", "QR-CODE", "ESTADUAL", "IDENTIDADE",
    "HABILITACAO", "EMISSORA", "REGISTRO"
  ];

  // ===== CPF =====
  let cpf = "";
  const cpfMask = text.match(/(\d{3}[.\s]\d{3}[.\s]\d{3}[-.\s]\d{2})/);
  if (cpfMask) {
    cpf = cpfMask[1].replace(/\D/g, "");
  } else {
    const d11 = text.match(/\d{11}/g);
    if (d11) cpf = d11[0];
  }

  // ===== DATAS =====
  const allDates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  let dataNasc = "";
  let dataVal = "";

  for (const d of allDates) {
    const year = parseInt(d.split('/')[2]);
    if (year >= 1940 && year <= 2010 && !dataNasc) {
      dataNasc = d.split('/').reverse().join('-');
    } else if (year >= 2024 && !dataVal) {
      dataVal = d.split('/').reverse().join('-');
    }
  }

  // ===== NOME =====
  let nome = "";
  // Estratégia: procurar linhas com 2+ palavras, só letras, que não sejam termos governamentais
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
  
  for (const line of lines) {
    const clean = line.toUpperCase().trim();
    // Deve ter pelo menos 2 palavras, apenas letras e espaços
    if (
      clean.length >= 8 &&
      clean.length <= 60 &&
      clean.split(/\s+/).length >= 2 &&
      /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s]+$/.test(clean) &&
      !NOT_NAMES.some(k => clean.includes(k))
    ) {
      nome = clean;
      break;
    }
  }

  // ===== REGISTRO (N° CNH) =====
  let cnh = "";
  // Procura "REGISTRO" seguido de número
  const regMatch = upperText.match(/REGISTRO\s*[:\-.\s]*(\d{9,11})/);
  if (regMatch) {
    cnh = regMatch[1];
  } else {
    // Procura todos os blocos de 9-11 dígitos que NÃO sejam o CPF
    const allNums = text.match(/\d{9,11}/g) || [];
    for (const n of allNums) {
      const cleanN = n.replace(/\D/g, "");
      if (cleanN !== cpf && cleanN.length >= 9) {
        // Ignora números que parecem ser códigos de segurança (começam com 4011...)
        if (!cleanN.startsWith("4011") && !cleanN.startsWith("SP")) {
          cnh = cleanN;
          break;
        }
      }
    }
    // Se ainda não achou, tenta qualquer 11 dígitos diferente do CPF
    if (!cnh) {
      const all11 = text.match(/\d{11}/g) || [];
      for (const n of all11) {
        if (n !== cpf) { cnh = n; break; }
      }
    }
  }

  // ===== CATEGORIA =====
  let categoria = "";
  const catPatterns = [
    /CAT[.\s]*HAB[.\s]*[:\s]*([A-E]{1,3})/i,
    /CATEGORIA[:\s]*([A-E]{1,3})/i,
    /CAT[.\s]+([A-E]{1,3})/i,
    /ACC[:\s]*([A-E]{1,3})/i,
  ];
  for (const p of catPatterns) {
    const m = text.match(p);
    if (m && m[1]) { categoria = m[1].toUpperCase(); break; }
  }
  // Fallback: procura em OBSERVAÇÕES
  if (!categoria) {
    const obsMatch = text.match(/OBSERVA[ÇC][ÕO]ES[:\s]*([A-Z\s,;\/]+)/i);
    if (obsMatch) {
      const letters = obsMatch[1].match(/[A-E]/gi);
      if (letters) categoria = [...new Set(letters.map(l => l.toUpperCase()))].join('');
    }
  }

  const result: OCRResult = {
    nome_completo: nome.replace(/\d/g, "").replace(/\s{2,}/g, " ").trim(),
    cpf,
    numero_cnh: cnh.replace(/\D/g, ""),
    categoria_cnh: categoria,
    validade_cnh: dataVal,
    data_nascimento: dataNasc,
    confidence: (cpf && nome) ? 0.95 : (cpf ? 0.6 : 0.2),
    rawText: text
  };

  console.log("%cTEXTO BRUTO:", "color: #4f46e5; font-weight: bold;");
  console.log(text);
  console.log("%cCAMPOS EXTRAÍDOS:", "color: green; font-weight: bold; font-size: 14px;");
  console.table({
    "Nome": result.nome_completo,
    "CPF": result.cpf,
    "CNH": result.numero_cnh,
    "Nascimento": result.data_nascimento,
    "Validade": result.validade_cnh,
    "Categoria": result.categoria_cnh,
    "Confiança": result.confidence
  });

  return result;
};

// ==========================================
// MOTOR TESSERACT (para imagens e fallback)
// ==========================================
const runTesseractOCR = async (file: File): Promise<string> => {
  console.log("[OCR] Iniciando Tesseract.js...");
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
// EXTRATOR DE PDF - 3 FASES
// ==========================================
const loadPDFJS = async () => {
  if (!(window as any).pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    await new Promise(r => { script.onload = r; });
  }
  const lib = (window as any).pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return lib;
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log("%c[PDF V6.0] Iniciando extração...", "color: #4f46e5; font-weight: bold; font-size: 14px;");
  
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  console.log(`[PDF] ${totalPages} página(s) detectada(s)`);

  // ===== FASE 1: Annotations / Form Fields =====
  console.log("[PDF] FASE 1: Buscando campos de formulário...");
  let annotationText = "";
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    try {
      const annotations = await page.getAnnotations();
      if (annotations.length > 0) {
        console.log(`[PDF] Página ${i}: ${annotations.length} anotação(ões)`);
        for (const ann of annotations) {
          if (ann.fieldValue) annotationText += ann.fieldName + ": " + ann.fieldValue + "\n";
          if (ann.alternativeText) annotationText += ann.alternativeText + "\n";
          if (ann.contents) annotationText += ann.contents + "\n";
        }
      }
    } catch (e) {
      console.log(`[PDF] Sem anotações na página ${i}`);
    }
  }

  if (annotationText.length > 30) {
    console.log("%c[PDF] ✅ Dados encontrados em campos de formulário!", "color: green; font-weight: bold;");
    console.log("Anotações:", annotationText);
    return annotationText;
  }

  // ===== FASE 2: Texto digital de todas as páginas =====
  console.log("[PDF] FASE 2: Extraindo texto digital de todas as páginas...");
  let fullText = "";
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    
    let pageText = "";
    let lastY: number | null = null;
    for (const item of tc.items as any[]) {
      if (!item.str) continue;
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 3) {
        pageText += "\n";
      }
      pageText += item.str + " ";
      lastY = item.transform[5];
    }
    
    console.log(`[PDF] Página ${i} texto (${pageText.length} chars):`, pageText.substring(0, 200));
    fullText += pageText + "\n";
  }

  // Verifica se o texto tem dados úteis de verdade (um NOME com 2+ palavras em maiúsculas)
  const hasCPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/.test(fullText);
  const hasRealName = fullText.split('\n').some(line => {
    const t = line.trim().toUpperCase();
    return t.length > 10 && t.split(/\s+/).length >= 2 && 
      /^[A-ZÁÉÍÓÚÃÕÂÊÎÔÛ\s]+$/.test(t) &&
      !["REPÚBLICA", "MINISTÉRIO", "SECRETARIA", "DEPARTAMENTO", "ASSINATURA"].some(k => t.includes(k));
  });

  if (hasCPF && hasRealName) {
    console.log("%c[PDF] ✅ Texto digital com dados válidos encontrado!", "color: green; font-weight: bold;");
    return fullText;
  }

  console.log("[PDF] ⚠️ Texto digital incompleto ou com encoding errado.");

  // ===== FASE 3: Renderizar para OCR com remoção de fundo verde =====
  console.log("%c[PDF] FASE 3: Renderizando para OCR (com limpeza de fundo verde)...", "color: #d97706; font-weight: bold;");
  
  let ocrFullText = "";
  // Renderiza CADA página separadamente
  for (let i = 1; i <= Math.min(totalPages, 2); i++) {
    console.log(`[PDF] Renderizando página ${i}...`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 4.0 }); // 4x para máxima nitidez
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    // LIMPEZA: Remove fundo verde e aumenta contraste do texto
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = imgData.data;
    for (let j = 0; j < px.length; j += 4) {
      const r = px[j], g = px[j+1], b = px[j+2];
      
      // Detecta pixels verdes (fundo da CNH) e torna branco
      if (g > 100 && g > r * 1.2 && g > b * 1.2) {
        px[j] = px[j+1] = px[j+2] = 255; // Branco
      }
      // Detecta pixels escuros (texto) e torna preto puro
      else if (r < 100 && g < 100 && b < 100) {
        px[j] = px[j+1] = px[j+2] = 0; // Preto
      }
      // Pixels claros (fundo branco/cinza claro) ficam brancos
      else if (r > 200 && g > 200 && b > 200) {
        px[j] = px[j+1] = px[j+2] = 255;
      }
      // O resto: converte para escala de cinza e aplica threshold
      else {
        const avg = (r + g + b) / 3;
        const val = avg < 140 ? 0 : 255;
        px[j] = px[j+1] = px[j+2] = val;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // OCR na página limpa
    const pageOcrText = await new Promise<string>((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return reject("Erro blob");
        try {
          const img = new File([blob], `page_${i}.png`, { type: "image/png" });
          resolve(await runTesseractOCR(img));
        } catch (e) { reject(e); }
      }, 'image/png');
    });

    console.log(`[PDF] OCR página ${i} (${pageOcrText.length} chars):`, pageOcrText.substring(0, 300));
    ocrFullText += pageOcrText + "\n";
  }

  // COMBINA: texto digital (números corretos) + OCR (pode ter o nome)
  const combined = fullText + "\n---OCR---\n" + ocrFullText;
  return combined;
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
        textContent = await runTesseractOCR(file);
        method = 'tesseract';
      } else {
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
