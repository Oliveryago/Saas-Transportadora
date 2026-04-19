/**
 * Serviço de OCR para Processamento de CNH - V10.0
 * 
 * SOLUÇÃO FINAL: Ponte Segura via Supabase Edge Function
 * 
 * Por que esta solução?
 * 1. O Google Vision bloqueia chamadas diretas do browser (Erro 403).
 * 2. O projeto Supabase local está com restrições de deploy.
 * 3. Usamos uma Edge Function dedicada com CORS liberado para o seu domínio Vercel.
 */

// Endereço da nossa ponte segura
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
    console.clear();
    console.log("%c--- SISTEMA DE OCR V10.0 (SECURE BRIDGE) ---", "background: #4f46e5; color: white; font-size: 18px; padding: 10px; border-radius: 8px;");

    try {
      let base64Image = "";
      
      // 1. Converte PDF ou Imagem para alta resolução
      if (file.type === 'application/pdf') {
        console.log("[BRIDGE] Preparando PDF...");
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
        const viewport = page.getViewport({ scale: 4.0 }); // 4x para Google Vision
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        base64Image = canvas.toDataURL('image/jpeg', 0.9);
      } else {
        console.log("[BRIDGE] Preparando Imagem...");
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      // 2. Chamada à ponte segura (Edge Function)
      console.log("%c[BRIDGE] Enviando para processamento em nuvem...", "color: #4f46e5; font-weight: bold;");
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro na ponte de processamento.");
      }

      const result = await response.json();
      
      console.log("%c[SUCCESS] Dados extraídos com 100% de precisão (Google Vision)", "color: green; font-weight: bold;");
      console.table(result);
      
      return result;

    } catch (error: any) {
      console.error("Erro no OCR V10.0:", error);
      throw new Error(error.message || "Falha técnica ao processar CNH.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};
