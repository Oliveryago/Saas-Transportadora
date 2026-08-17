/**
 * Serviço de OCR para Processamento de CNH - v13.0 (Claude Vision)
 *
 * Estratégia:
 * 1. PDF → base64
 * 2. Envia para Supabase Edge Function (extract-cnh-claude)
 * 3. Edge Function → Anthropic Claude (document vision) → JSON com dados da CNH
 *
 * Vantagem: Claude lê PDFs nativamente, sem converter para imagem.
 * A ANTHROPIC_API_KEY fica segura no servidor (Supabase Secrets), nunca exposta ao front.
 */

import { supabase } from "../../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/extract-cnh-claude`;

export interface OCRResult {
  nome_completo: string;
  cpf: string;
  numero_cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  data_nascimento: string;
  confidence: number;
  method?: "claude" | "none";
}

export const ocrService = {
  async processCNH(file: File): Promise<OCRResult> {
    console.log("[OCR] Iniciando leitura de CNH com Claude Vision...");

    // Converte o arquivo para base64
    const pdfBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
      reader.readAsDataURL(file);
    });

    console.log(`[OCR] Arquivo convertido (${Math.round(pdfBase64.length / 1024)} KB). Enviando para processamento...`);

    // Busca o token de autenticação do usuário atual
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ pdfBase64 }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[OCR] Erro na Edge Function:", data);
      throw new Error(data.error || "Erro ao processar o documento.");
    }

    console.log("[OCR] Dados extraídos com sucesso:", data);

    // Mapeia os campos do Claude para o formato do OCRResult existente
    return {
      nome_completo: data.nomeCompleto ?? "",
      cpf: data.cpf ?? "",
      numero_cnh: data.numeroCNH ?? "",
      categoria_cnh: data.categoria ?? "",
      validade_cnh: data.validade ?? "",
      data_nascimento: data.dataNascimento ?? "",
      confidence: 1,
      method: "claude",
    };
  },

  compareData(ocrData: any, manualData: any) {
    const clean = (s: string) => s?.replace(/\D/g, "") || "";
    return clean(ocrData.cpf) === clean(manualData.cpf);
  },
};
