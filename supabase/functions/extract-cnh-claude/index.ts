import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// claude-3-haiku-20240307 foi aposentado em 20/04/2026 — usava esse ID e a API quebrava.
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

const SYSTEM_PROMPT = `Extraia os dados da CNH na imagem e retorne APENAS um JSON válido, sem texto adicional, no seguinte formato:
{
  "nome_completo": string,
  "cpf": string,
  "data_nascimento": "YYYY-MM-DD",
  "numero_cnh": string,
  "categoria": string,
  "validade": "YYYY-MM-DD",
  "data_primeira_habilitacao": "YYYY-MM-DD" ou null,
  "numero_espelho": string ou null
}
Se algum campo não for legível, retorne null nesse campo. Não invente dados.

Você é um extrator de dados altamente preciso especializado em CNH brasileira.
A CNH possui um layout padronizado. Preste MUITA atenção às posições e rótulos dos campos:
- NOME COMPLETO: parte superior, abaixo da palavra "NOME".
- CPF (CAMPO CRÍTICO — procure com afinco):
  * Rótulos possíveis: "CPF", "CPF:", "N° CPF", "Nº CPF", "N° REGISTRO CPF", "DOC IDENTIDADE / CPF", "IDENTIDADE / CPF".
  * O CPF brasileiro aparece no formato XXX.XXX.XXX-XX (três pontos e um hífen). Se vir um número exatamente nesse formato, ESSE é o CPF.
  * Na CNH atual (modelo plastificado), o CPF fica na FRENTE, no bloco superior, geralmente à direita, ao lado ou abaixo da DATA DE NASCIMENTO.
  * Em modelos antigos, o CPF pode estar no VERSO do documento — se a imagem mostrar o verso, leia o verso.
  * NÃO confunda CPF com:
    - N REGISTRO / número da CNH (também tem 11 dígitos, mas SEM pontos/hífen de CPF, no rodapé).
    - RG / órgão emissor / número vertical da lateral esquerda.
  * Nunca copie o N REGISTRO para o campo cpf.
- DATA DE NASCIMENTO: abaixo do rótulo "DATA NASCIMENTO", ao lado do CPF.
- NÚMERO DA CNH (N REGISTRO): campo inferior "N REGISTRO", exatamente 11 dígitos. NUNCA extraia o número impresso na vertical (lateral esquerda).
- CATEGORIA (CAMPO CRÍTICO — leia só o retângulo "CAT. HAB."):
  * Copie APENAS as letras impressas dentro do campo rotulado "CAT. HAB." / "CAT HAB" / "CATEGORIA".
  * Letras válidas: A, B, C, D, E, AB, AC, AD, AE.
  * ERRO MAIS COMUM: confundir E com B. "AE" (moto + carreta) é frequente em motoristas de caminhão e é MUITO lido errado como "AB". Olhe de novo: B tem dois loops fechados; E tem três traços horizontais e está aberto à direita.
  * NÃO use ACC (autorização de ciclomotor), EAR, PERMISSÃO, nem junte letras de outros campos.
  * NÃO assuma "AB" por padrão. Se não tiver certeza entre B e E, releia o glifo no CAT. HAB. antes de responder.
- VALIDADE: campo "VALIDADE", na parte inferior. A data impressa é DD/MM/AAAA com ANO DE 4 DÍGITOS (ex: 05/08/2026).
  * Converta para YYYY-MM-DD (2026-08-05).
  * NUNCA corte o ano: 2026 não é 20, nem 2020. Se o ano parecer "20", relia os 4 dígitos (quase sempre 2024–2035).
- DATA DA 1ª HABILITAÇÃO: campo "1ª HABILITAÇÃO" / "DATA 1ª HABILITAÇÃO", se visível. Também use ANO COM 4 DÍGITOS.
- NÚMERO ESPELHO / RENACH: no verso, rótulos "Nº ESPELHO", "NUMERO ESPELHO", "RENACH", "N° RENACH". Se não aparecer, retorne null. Não copie o N REGISTRO da frente.

Regras de formatação:
- datas: YYYY-MM-DD com ano de 4 dígitos (ex: 2026-08-05). Nunca use ano com 2 dígitos.
- cpf: prefira XXX.XXX.XXX-XX; se só conseguir os dígitos, retorne 11 números
- numero_cnh: apenas números (11 dígitos)
- categoria: apenas as letras do CAT. HAB. (ex: AE, E, C, D, AB)
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
  console.error("[OCR API] Erro estruturado", { status, code, error, ...extra });
  return jsonResponse({ error, code, ...extra }, status);
}

function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function isValidCategory(cat: string): boolean {
  return ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"].includes(cat.toUpperCase());
}

function normalizeCategory(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-E]/g, "");
  if (!cleaned) return null;
  if (isValidCategory(cleaned)) return cleaned;
  console.warn("[OCR API] Categoria rejeitada após normalizar:", raw, "->", cleaned);
  return null;
}

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Aceita YYYY-MM-DD, DD/MM/YYYY e DD/MM/YY. Sempre devolve YYYY-MM-DD ou null. */
function normalizeDate(raw: string | null, field: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]);
    if (year < 100) {
      // "20" cortado de "2026" (não 2020). Ano de 2 dígitos na validade = 2000+YY, exceto 20 → 2026.
      if (field === "validade" && year === 20) year = 2026;
      else year = year >= 50 ? 1900 + year : 2000 + year;
    }
  } else {
    console.warn(`[OCR API] Data não reconhecida (${field}):`, raw);
    return null;
  }

  if (field === "validade" && year === 2020) {
    console.warn("[OCR API] Validade 2020 interpretada como ano cortado (2026). bruto:", raw);
    year = 2026;
  }

  const out = `${year}-${pad2(month)}-${pad2(day)}`;
  if (!isValidDate(out)) {
    console.warn(`[OCR API] Data inválida rejeitada (${field}):`, raw, "->", out);
    return null;
  }

  if (field === "validade" && year < 2024) {
    console.warn(`[OCR API] Validade com ano suspeito (possível corte de 2026 -> 20):`, out);
  }

  console.log(`[OCR API] Data normalizada (${field}):`, raw, "->", out);
  return out;
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

const CPF_MASKED_RE = /\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/;

function formatCpfMasked(digits: string): string {
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function findMaskedCpf(text: string, excludeDigits?: string | null): string | null {
  const matches = [...text.matchAll(/\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/g)].map((m) => m[1]);
  const chosen = matches.find((value) => !excludeDigits || value.replace(/\D/g, "") !== excludeDigits);
  return chosen ?? null;
}

/** Aceita 11 dígitos ou máscara XXX.XXX.XXX-XX. Inválido → null (não quebra os outros campos). */
function normalizeCpf(raw: string | null, rawModelText: string, numeroCnh: string | null): string | null {
  let digits = (raw || "").replace(/\D/g, "");
  const cnhDigits = (numeroCnh || "").replace(/\D/g, "") || null;

  if (digits.length !== 11 || (cnhDigits && digits === cnhDigits)) {
    const fallbackMasked = findMaskedCpf(rawModelText, cnhDigits);
    if (fallbackMasked) {
      digits = fallbackMasked.replace(/\D/g, "");
    } else {
      const elevens = [...rawModelText.matchAll(/(?<!\d)(\d{11})(?!\d)/g)].map((m) => m[1]);
      const other = elevens.find((d) => d !== cnhDigits);
      if (other) digits = other;
    }
  }

  if (!/^\d{11}$/.test(digits) || (cnhDigits && digits === cnhDigits)) {
    console.warn("[OCR API] CPF ausente ou inválido (regex). bruto:", raw);
    return null;
  }

  const formatted = formatCpfMasked(digits);
  if (!CPF_MASKED_RE.test(formatted)) return null;

  if (!isValidCPF(digits)) {
    console.warn("[OCR API] CPF extraído com dígito verificador inconsistente; mantendo valor:", formatted);
  } else {
    console.log("[OCR API] CPF normalizado:", formatted);
  }
  return formatted;
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
      console.error("[OCR API] ANTHROPIC_API_KEY ausente nos secrets do Supabase.");
      return errorResponse(500, "auth", "Falha ao processar o documento.");
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (err) {
      console.error("[OCR API] Body JSON inválido:", err);
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
      console.error("[OCR API] media_type não suportado", { mediaType, sourceType });
      return errorResponse(400, "invalid_file", "Formato não suportado. Envie JPG, PNG, WEBP ou PDF.");
    }

    sourceType = ALLOWED_MEDIA[mediaType];
    const cleanBase64 = stripDataUrl(rawPayload).replace(/\s/g, "");
    const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
    const maxBytes = sourceType === "document" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;

    console.log("[OCR API] Payload recebido", {
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
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: "Extraia os dados desta CNH e retorne APENAS o JSON, sem markdown. O campo cpf é obrigatório se estiver visível (formato XXX.XXX.XXX-XX, não copie o N REGISTRO). Releia CAT. HAB. letra por letra (não confunda E com B). A validade tem ano com 4 dígitos (ex: 18/04/2026 → 2026-04-18), nunca corte 2026 para 20." },
        ],
      }],
    };

    console.log("[OCR API] Chamando Anthropic", { model: MODEL, sourceType, mediaType });

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
      console.error("[OCR API] Erro de rede ao chamar Anthropic:", err);
      return errorResponse(502, "network", "Falha de conexão com o provedor de OCR.", {
        cause: String(err),
      });
    }

    const anthropicText = await ar.text();
    if (!ar.ok) {
      console.error("[OCR API] Anthropic recusou a requisição", {
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
      console.error("[OCR API] Resposta Anthropic não é JSON", { anthropicText, err });
      return errorResponse(502, "parse", "Resposta inválida do provedor de OCR.", {
        rawResponse: anthropicText.slice(0, 1500),
      });
    }

    const rawText = ad?.content?.[0]?.text ?? "";
    console.log("[OCR API] Resposta bruta da IA:", rawText);

    let extracted: Record<string, unknown>;
    try {
      extracted = parseModelJson(rawText);
    } catch (err) {
      console.error("[OCR API] Falha no parse JSON", { rawText, err: String(err) });
      return errorResponse(422, "parse", "Modelo não retornou JSON válido.", {
        rawResponse: rawText.slice(0, 1500),
      });
    }

    const mapped = {
      nome_completo: pickField(extracted, "nome_completo", "nomeCompleto"),
      cpf: pickField(extracted, "cpf"),
      data_nascimento: pickField(extracted, "data_nascimento", "dataNascimento"),
      numero_cnh: pickField(extracted, "numero_cnh", "numeroCNH"),
      categoria: pickField(extracted, "categoria", "categoria_cnh"),
      validade: pickField(extracted, "validade", "validade_cnh"),
      data_primeira_habilitacao: pickField(extracted, "data_primeira_habilitacao", "dataPrimeiraHabilitacao"),
      numero_espelho: pickField(extracted, "numero_espelho", "renach", "numeroEspelho"),
    };

    console.log("[OCR API] CPF bruto do modelo:", mapped.cpf);
    mapped.cpf = normalizeCpf(mapped.cpf, rawText, mapped.numero_cnh);

    console.log("[OCR API] Categoria bruta do modelo:", mapped.categoria);
    mapped.categoria = normalizeCategory(mapped.categoria);

    console.log("[OCR API] Datas brutas do modelo:", {
      data_nascimento: mapped.data_nascimento,
      validade: mapped.validade,
      data_primeira_habilitacao: mapped.data_primeira_habilitacao,
    });
    mapped.data_nascimento = normalizeDate(mapped.data_nascimento, "data_nascimento");
    mapped.validade = normalizeDate(mapped.validade, "validade");
    mapped.data_primeira_habilitacao = normalizeDate(mapped.data_primeira_habilitacao, "data_primeira_habilitacao");

    const readableCount = Object.values(mapped).filter(Boolean).length;
    if (readableCount === 0) {
      console.warn("[OCR API] Nenhum campo legível extraído", mapped);
      return errorResponse(422, "unreadable", "Não foi possível ler os dados da CNH.", { extracted: mapped });
    }

    console.log("[OCR API] Extração concluída", mapped);
    return jsonResponse({
      ...mapped,
      nomeCompleto: mapped.nome_completo,
      dataNascimento: mapped.data_nascimento,
      numeroCNH: mapped.numero_cnh,
      validade: mapped.validade,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[OCR API] Erro não tratado:", error);
    return new Response(JSON.stringify({ error: message, code: "unknown" }), {
      headers: jsonHeaders,
      status: 500,
    });
  }
});
