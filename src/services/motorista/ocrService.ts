import { supabase } from '../../lib/supabase';

/**
 * Serviço de OCR para Processamento de CNH - V8.0
 * 
 * Estratégia Profissional:
 * - PDF: Renderiza páginas em alta resolução (3x) -> Converte para Base64 -> Envia para Supabase Edge Function (Google Vision)
 * - Imagem: Converte para Base64 -> Envia para Supabase Edge Function (Google Vision)
 * 
 * Vantagem: O Google Vision lê o "desenho" das letras, ignorando codificações de fonte corrompidas do PDF.
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
  method?: 'heuristic' | 'tesseract' | 'google_vision' | 'none';
}

/**
 * Converte um Blob/File para Base64
 */
const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Carrega a biblioteca PDF.js dinamicamente se necessário
 */
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

/**
 * Renderiza uma página de PDF para um Blob de imagem (PNG)
 */
const renderPDFPageToBlob = async (pdf: any, pageNum: number): Promise<Blob> => {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 3.5 }); // 3.5x para alta definição no Google Vision
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Erro ao criar contexto de canvas");
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  // Fundo branco para garantir contraste
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  await page.render({ canvasContext: context, viewport }).promise;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Erro ao gerar Blob da página"));
    }, 'image/png');
  });
};

export const ocrService = {
  async processCNH(file: File): Promise<OCRResult> {
    console.clear();
    console.log("%c--- SISTEMA DE OCR V8.0 (GOOGLE VISION) ---", "background: #4f46e5; color: white; font-size: 18px; padding: 10px; border-radius: 8px;");
    
    try {
      let base64Image = "";
      const isPDF = file.type === 'application/pdf';

      if (isPDF) {
        console.log("%c[PDF] Processando PDF profissionalmente...", "color: #4f46e5; font-weight: bold;");
        const pdfjsLib = await loadPDFJS();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Renderiza apenas a primeira página (normalmente onde estão os dados)
        // Se precisar de mais, podemos fazer um loop e concatenar ou processar separado
        console.log("[PDF] Renderizando página 1 em alta resolução...");
        const pageBlob = await renderPDFPageToBlob(pdf, 1);
        base64Image = await fileToBase64(pageBlob);
      } else {
        console.log("%c[IMAGE] Processando imagem com Google Vision...", "color: #4f46e5; font-weight: bold;");
        base64Image = await fileToBase64(file);
      }

      console.log("%c[EDGE FUNCTION] Chamando ocr-cnh no Supabase...", "color: #059669; font-weight: bold;");
      
      const { data, error } = await supabase.functions.invoke('ocr-cnh', {
        body: { image: base64Image }
      });

      if (error) {
        console.error("Erro na Edge Function:", error);
        throw new Error(`Erro no servidor de OCR: ${error.message}`);
      }

      console.log("%c[RESULTADO] Dados extraídos com sucesso!", "color: #059669; font-weight: bold; font-size: 14px;");
      console.table({
        "Nome": data.nome_completo,
        "CPF": data.cpf,
        "CNH": data.numero_cnh,
        "Nascimento": data.data_nascimento,
        "Validade": data.validade_cnh,
        "Categoria": data.categoria_cnh,
        "Confiança": `${Math.round(data.confidence * 100)}%`
      });

      return {
        ...data,
        method: 'google_vision'
      };

    } catch (error: any) {
      console.error("Erro fatal no OCR V8.0:", error);
      throw new Error(error.message || "Falha ao processar documento.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};
