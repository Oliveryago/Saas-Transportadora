/**
 * Serviço de OCR para Processamento de CNH - V11.0 (DEBUG)
 * 
 * Esta versão foi modificada para expor o erro real vindo do backend.
 */

const EDGE_FUNCTION_URL = "https://tcvwyxaalephjqqoqiff.supabase.co/functions/v1/ocr-cnh";

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

export const ocrService = {
  async processCNH(file: File): Promise<OCRResult> {
    console.log("%c--- SISTEMA DE OCR V11.0 (DEBUG MODE) ---", "background: #f59e0b; color: black; font-size: 18px; padding: 10px; border-radius: 8px;");

    try {
      let base64Image = "";
      
      if (file.type === 'application/pdf') {
        console.log("[DEBUG] Renderizando PDF...");
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          document.head.appendChild(script);
          await new Promise(r => { script.onload = r; });
        }
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 4.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        base64Image = canvas.toDataURL('image/jpeg', 0.85); // JPEG para reduzir payload
      } else {
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      console.log("[DEBUG] Enviando para Edge Function...");
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("%c--- ERRO NO BACKEND ---", "color: red; font-weight: bold; font-size: 16px;");
        console.log("%cStatus:", "font-weight: bold;", response.status);
        console.log("%cResposta Completa:", "font-weight: bold;", data);
        
        if (data.details) {
          console.error("%cDETALHES DO GOOGLE VISION:", "color: #ff4444; font-weight: bold;");
          console.dir(data.details);
        }
        
        throw new Error(data.error || "Erro no processamento remoto.");
      }

      console.log("%c[SUCCESS] OCR Concluído!", "color: green; font-weight: bold;");
      console.table(data);
      
      return data;

    } catch (error: any) {
      console.error("[DEBUG] Erro capturado no catch:", error);
      throw new Error(error.message || "Erro técnico.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};
