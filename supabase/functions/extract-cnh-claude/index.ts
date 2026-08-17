/**
 * Supabase Edge Function: extract-cnh-claude
 * Recebe PDF em base64, chama a API da Anthropic e retorna dados extraidos da CNH.
 * ANTHROPIC_API_KEY deve ser configurada como secret no Supabase.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = Voce e um extrator de dados de documentos brasileiros.
Analise o documento CNH fornecido e extraia os dados.
Responda APENAS com um objeto JSON valido, sem texto adicional, sem markdown.
O JSON deve ter exatamente estes campos:
{"nomeCompleto":string|null,"cpf":string|null,"dataNascimento":string|null,"numeroCNH":string|null,"categoria":string|null,"validade":string|null}
Regras: Retorne null para campos nao encontrados. Nunca invente dados.
dataNascimento e validade: formato YYYY-MM-DD. cpf e numeroCNH: apenas numeros. categoria: apenas letras.;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metodo nao permitido." }), { status: 405, headers: CORS_HEADERS });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY nao configurada no servidor." }), { status: 500, headers: CORS_HEADERS });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Body invalido." }), { status: 400, headers: CORS_HEADERS }); }

  const { pdfBase64 } = body;
  if (!pdfBase64) return new Response(JSON.stringify({ error: "Campo pdfBase64 ausente." }), { status: 400, headers: CORS_HEADERS });

  const cleanBase64 = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;

  let ar;
  try {
    ar = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-beta": "pdfs-2024-09-25", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 512, system: SYSTEM_PROMPT, messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: cleanBase64 } }, { type: "text", text: "Extraia os dados desta CNH e retorne apenas o JSON." }] }] }),
    });
  } catch (err) { return new Response(JSON.stringify({ error: Falha de conexao:  }), { status: 502, headers: CORS_HEADERS }); }

  if (!ar.ok) { const e = await ar.text(); return new Response(JSON.stringify({ error: API Anthropic :  }), { status: 502, headers: CORS_HEADERS }); }

  const ad = await ar.json();
  const rawText = ad?.content?.[0]?.text ?? "";

  let extracted;
  try {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON");
    extracted = JSON.parse(m[0]);
  } catch { return new Response(JSON.stringify({ error: "Modelo nao retornou JSON valido. Preencha manualmente.", rawResponse: rawText }), { status: 422, headers: CORS_HEADERS }); }

  return new Response(JSON.stringify(extracted), { status: 200, headers: CORS_HEADERS });
});
