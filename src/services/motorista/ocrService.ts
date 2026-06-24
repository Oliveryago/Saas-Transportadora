/**
 * Serviço de OCR para Processamento de CNH - V12.0 (FINAL RESOLUTION)
 * 
 * Estratégia:
 * 1. PDF -> Renderiza Página 1 (Escala 3x) -> JPEG 0.8 (Otimizado)
 * 2. Envia para Supabase Edge Function (tcvwyxaalephjqqoqiff)
 * 3. Edge Function -> Google Vision OCR -> Parser Inteligente
 * 
 * Vantagem: Resolução 3x é o "sweet spot" para o Google Vision ler perfeitamente
 * sem estourar o limite de payload da requisição.
 */

import { supabase } from "../../lib/supabase";

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
    console.log("%c--- SISTEMA DE OCR V12.0 (FINAL) ---", "background: #111827; color: #10b981; font-size: 18px; padding: 10px; border-radius: 8px; border: 1px solid #10b981;");

    try {
      let base64Image = "";
      
      if (file.type === 'application/pdf') {
        console.log("%c[PDF] Iniciando conversão de PDF para Imagem...", "color: #3b82f6;");
        
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
        
        // Escala 3.0x: Alta definição suficiente para OCR, mas leve para a rede
        const viewport = page.getViewport({ scale: 3.0 }); 
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        
        ctx.fillStyle = 'white'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        // JPEG 0.8: Reduz drasticamente o tamanho do Base64 sem perder nitidez crítica
        base64Image = canvas.toDataURL('image/jpeg', 0.8);
        console.log(`%c[PDF] Imagem gerada: ${Math.round(base64Image.length / 1024)} KB`, "color: #3b82f6; font-style: italic;");
      } else {
        console.log("%c[IMAGE] Codificando imagem...", "color: #3b82f6;");
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      console.log("%c[CLOUD] Enviando para processamento seguro...", "color: #8b5cf6; font-weight: bold;");
      
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("%c--- FALHA NO PROCESSAMENTO CLOUD ---", "color: #ef4444; font-weight: bold; font-size: 16px;");
        console.log("%cHTTP Status:", "font-weight: bold;", response.status);
        
        if (data.google_error) {
          console.error("%cDETALHE DO GOOGLE VISION:", "color: #ef4444; font-weight: bold;");
          console.dir(data.google_error);
          
          // Alerta amigável sobre faturamento/ativação se for o caso
          if (JSON.stringify(data.google_error).includes("BILLING_NOT_ENABLED")) {
            alert("ERRO GOOGLE: Faturamento não ativado. Você precisa vincular um cartão na conta do Google Cloud para usar a Vision API.");
          }
        }
        
        throw new Error(data.error || "Erro ao processar documento.");
      }

      console.log("%c[SUCCESS] Extração concluída!", "color: #10b981; font-weight: bold; font-size: 14px;");
      console.table({
        "Nome": data.nome_completo,
        "CPF": data.cpf,
        "CNH": data.numero_cnh,
        "Nascimento": data.data_nascimento,
        "Validade": data.validade_cnh,
        "Categoria": data.categoria_cnh,
      });
      
      return {
        ...data,
        method: 'google_vision'
      };

    } catch (error: any) {
      console.error("[OCR ERROR]", error);
      throw new Error(error.message || "Falha técnica no OCR.");
    }
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  }
};
