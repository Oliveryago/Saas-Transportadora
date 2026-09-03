import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const ALLOWED_MEDIA: Record<string, "image" | "document"> = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/pdf": "document",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 4.5 * 1024 * 1024;

const SYSTEM_PROMPT = `Extraia os dados do CRLV (Certificado de Registro e Licenciamento de Veículo) brasileiro e retorne APENAS um JSON válido, sem texto adicional, no seguinte formato:
{
  "placa": string,
  "modelo": string,
  "ano_fabricacao": string,
  "ano_modelo": string,
  "chassi": string,
  "renavam": string,
  "cor": string,
  "combustivel": string,
  "capacidade_carga": string,
  "categoria": string
}
Se algum campo não for legível ou não existir no documento, retorne null nesse campo. Não invente dados.

Você é um extrator preciso de documentos de veículo (CRLV / CRV / DUT).
Rótulos comuns no CRLV:
- PLACA / PLACA ÚNICA / PLACA MERCOSUL
- MARCA / MODELO / VERSÃO — junte marca + modelo (ex: "SCANIA R440", "VW CONSTELLATION")
- ANO FABRICAÇÃO / ANO FAB / ANO Fabricação
- ANO MODELO / ANO MOD
- CHASSI / N. CHASSI / NÚMERO DE IDENTIFICAÇÃO
- RENAVAM / CÓDIGO RENAVAM
- COR / COR PREDOMINANTE
- COMBUSTÍVEL / ESPÉCIE / COMBUSTIVEL
- CAPACIDADE DE CARGA / CAP. CARGA / LOTACÃO (em kg, se houver)
- CATEGORIA / ESPÉCIE/TIPO (ex: CARGA, TRAÇÃO, MISTO, PASSEIO, ÔNIBUS)

Regras:
- placa: formate no padrão que aparecer. Mercosul: ABC1D23 (sem hífen). Antigo: ABC-1234.
- ano_fabricacao e ano_modelo: 4 dígitos (ex: "2018"). Nunca corte o ano.
- chassi: copie o código completo, sem espaços extras.
- renavam: apenas dígitos.
- capacidade_carga: número em kg, sem a unidade, se visível.
- categoria: texto do documento (CARGA, TRAÇÃO, etc.), não invente.
Não use markdown. Não escreva texto fora do JSON.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function errorResponse(
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
) {
  console.error("[OCR VEICULO] Erro estruturado", { status, code, error, ...extra });
  return jsonResponse({ error, code, ...extra }, status);
}

function normalizeMediaType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === "image/jpg") return "image/jpeg";
  return lower;
}

function detectFromDataUrl(dataUrl: string): { mediaType: string; sourceType: "image" | "document" } | null {
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.+-]+);base64,/);
  if (!match) return null;
  const mediaType = normalizeMediaType(match[1]);
  const sourceType = ALLOWED_MEDIA[mediaType];
  if (!sourceType) return null;
  return { mediaType, sourceType };
}

function stripDataUrl(value: string): string {
  return value.includes(",") ? value.split(",")[1] : value;
}

function parseModelJson(rawText: string): Record<string, unknown> {
  const stripped = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta sem objeto JSON");
  return JSON.parse(match[0]);
}

function pickField(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function normalizePlate(raw: string | null): string | null {
  if (!raw) return null;
  const alnum = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(alnum)) return alnum;
  if (/^[A-Z]{3}[0-9]{4}$/.test(alnum)) return `${alnum.slice(0, 3)}-${alnum.slice(3)}`;
  return alnum.length >= 6 ? alnum : null;
}

function normalizeYear(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/(?:19|20)\d{2}/);
  return match ? match[0] : null;
}

function digitsOnly(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse(405, "method_not_allowed", "Método não permitido.");
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("[OCR VEICULO] ANTHROPIC_API_KEY ausente nos secrets do Supabase.");
      return errorResponse(500, "auth", "Falha ao processar o documento.");
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (err) {
      console.error("[OCR VEICULO] Body JSON inválido:", err);
      return errorResponse(400, "invalid_file", "Body inválido.");
    }

    const rawPayload = String(body.fileBase64 ?? body.pdfBase64 ?? "");
    if (!rawPayload) {
      return errorResponse(400, "invalid_file", "Campo fileBase64 ausente.");
    }

    let mediaType = normalizeMediaType(String(body.mediaType ?? ""));
    let sourceType = body.sourceType === "document" ? "document" as const : body.sourceType === "image" ? "image" as const : null;

    if (rawPayload.startsWith("data:")) {
      const detected = detectFromDataUrl(rawPayload);
      if (detected) {
        mediaType = detected.mediaType;
        sourceType = detected.sourceType;
      }
    }

    if (!mediaType || !ALLOWED_MEDIA[mediaType]) {
      console.error("[OCR VEICULO] media_type não suportado", { mediaType, sourceType });
      return errorResponse(400, "invalid_file", "Formato não suportado. Envie JPG, PNG, WEBP ou PDF.");
    }

    sourceType = ALLOWED_MEDIA[mediaType];
    const cleanBase64 = stripDataUrl(rawPayload).replace(/\s/g, "");
    const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
    const maxBytes = sourceType === "document" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;

    console.log("[OCR VEICULO] Payload recebido", {
      mediaType,
      sourceType,
      payloadKB: Math.round(rawPayload.length / 1024),
      approxBytes,
      model: MODEL,
    });

    if (approxBytes > maxBytes) {
      return errorResponse(413, "too_large", "Arquivo excede o limite da API.", {
        approxBytes,
        maxBytes,
        mediaType,
      });
    }

    const contentBlock = sourceType === "document"
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: cleanBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: cleanBase64 } };

    const anthropicBody = {
      model: MODEL,
      max_tokens: 768,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Extraia os dados deste CRLV/CRV e retorne APENAS o JSON, sem markdown. Placa no padrão do documento. Anos com 4 dígitos." },
        ],
      }],
    };

    console.log("[OCR VEICULO] Chamando Anthropic", { model: MODEL, sourceType, mediaType });

    let ar: Response;
    try {
      ar = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(anthropicBody),
      });
    } catch (err) {
      console.error("[OCR VEICULO] Erro de rede ao chamar Anthropic:", err);
      return errorResponse(502, "network", "Falha de conexão com o provedor de OCR.", {
        cause: String(err),
      });
    }

    const anthropicText = await ar.text();
    if (!ar.ok) {
      console.error("[OCR VEICULO] Anthropic recusou a requisição", {
        status: ar.status,
        statusText: ar.statusText,
        body: anthropicText,
        mediaType,
        sourceType,
        approxBytes,
        model: MODEL,
      });

      if (ar.status === 401 || ar.status === 403) {
        return errorResponse(502, "auth", "Falha ao processar o documento.", {
          anthropic_status: ar.status,
        });
      }

      const lower = anthropicText.toLowerCase();
      if (ar.status === 400 && (lower.includes("image") || lower.includes("media") || lower.includes("could not process"))) {
        return errorResponse(422, "unreadable", "Imagem ilegível ou formato inválido.", {
          anthropic_status: ar.status,
          anthropic_error: anthropicText.slice(0, 1500),
        });
      }

      return errorResponse(502, "anthropic", "Erro ao processar o documento.", {
        anthropic_status: ar.status,
        anthropic_error: anthropicText.slice(0, 1500),
      });
    }

    let ad: { content?: Array<{ text?: string }> };
    try {
      ad = JSON.parse(anthropicText);
    } catch (err) {
      console.error("[OCR VEICULO] Resposta Anthropic não é JSON", { anthropicText, err });
      return errorResponse(502, "parse", "Resposta inválida do provedor de OCR.", {
        rawResponse: anthropicText.slice(0, 1500),
      });
    }

    const rawText = ad?.content?.[0]?.text ?? "";
    console.log("[OCR VEICULO] Resposta bruta da IA:", rawText);

    let extracted: Record<string, unknown>;
    try {
      extracted = parseModelJson(rawText);
    } catch (err) {
      console.error("[OCR VEICULO] Falha no parse JSON", { rawText, err: String(err) });
      return errorResponse(422, "parse", "Modelo não retornou JSON válido.", {
        rawResponse: rawText.slice(0, 1500),
      });
    }

    const mapped = {
      placa: normalizePlate(pickField(extracted, "placa", "license_plate")),
      modelo: pickField(extracted, "modelo", "model", "marca_modelo"),
      ano_fabricacao: normalizeYear(pickField(extracted, "ano_fabricacao", "anoFabricacao", "ano_fab")),
      ano_modelo: normalizeYear(pickField(extracted, "ano_modelo", "anoModelo", "ano_mod")),
      chassi: pickField(extracted, "chassi", "chassis")?.replace(/\s+/g, "") ?? null,
      renavam: digitsOnly(pickField(extracted, "renavam")),
      cor: pickField(extracted, "cor", "color"),
      combustivel: pickField(extracted, "combustivel", "combustível", "fuel"),
      capacidade_carga: digitsOnly(pickField(extracted, "capacidade_carga", "capacidadeCarga", "cap_carga")),
      categoria: pickField(extracted, "categoria", "especie", "espécie"),
    };

    const readableCount = Object.values(mapped).filter(Boolean).length;
    if (readableCount === 0) {
      console.warn("[OCR VEICULO] Nenhum campo legível extraído", mapped);
      return errorResponse(422, "unreadable", "Não foi possível ler os dados do documento.", { extracted: mapped });
    }

    console.log("[OCR VEICULO] Extração concluída", mapped);
    return jsonResponse(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[OCR VEICULO] Erro não tratado:", error);
    return new Response(JSON.stringify({ error: message, code: "unknown" }), {
      headers: jsonHeaders,
      status: 500,
    });
  }
});
