import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-5-sonnet-20240620";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `Voce e um extrator de dados altamente preciso especializado em CNH brasileira.
A CNH possui um layout padronizado. Preste MUITA atencao as posicoes e rotulos dos campos:
- NOME COMPLETO: Fica na parte superior, abaixo da palavra "NOME".
- CPF: Fica abaixo do rotulo "CPF", no formato XXX.XXX.XXX-XX. NAO confunda com o RG ou Orgao Emissor.
- DATA DE NASCIMENTO: Fica abaixo do rotulo "DATA NASCIMENTO", ao lado do CPF.
- NUMERO DA CNH (N REGISTRO): Fica no campo inferior rotulado "N REGISTRO". Sao exatamente 11 digitos. ATENCAO EXTREMA: NUNCA extraia o numero impresso na vertical (na lateral esquerda do documento, em vermelho ou preto). O verdadeiro numero de registro fica na parte de baixo, proximo a validade.
- CATEGORIA: Fica no campo rotulado "CAT. HAB.". Letras validas: A, B, C, D, E, AB, AC, AD, AE. NAO confunda com o campo "ACC" ou "PERMISSAO".
- VALIDADE: Fica abaixo do rotulo "VALIDADE", na parte inferior.

RELEIA CADA DIGITO COM ATENCAO ANTES DE RESPONDER. Um erro de 1 digito invalida o cadastro.

Responda APENAS com um objeto JSON valido, sem texto adicional, sem markdown.
Campos esperados:
{"nomeCompleto":string|null,"cpf":string|null,"dataNascimento":string|null,"numeroCNH":string|null,"categoria":string|null,"validade":string|null}

Regras formatacao:
- dataNascimento e validade: no formato YYYY-MM-DD.
- cpf: retorne apenas numeros (11 digitos).
- numeroCNH: retorne apenas numeros (11 digitos).
- categoria: retorne apenas as letras (ex: AB, AE, C).
Se nao encontrar ou estiver ilegivel, retorne null.`;

function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function isValidCategory(cat: string): boolean {
  const valid = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
  return valid.includes(cat.toUpperCase());
}

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metodo nao permitido." }), { status: 405, headers: CORS_HEADERS });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY nao configurada no servidor." }), { status: 500, headers: CORS_HEADERS });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Body invalido." }), { status: 400, headers: CORS_HEADERS }); }

  const { pdfBase64 } = body;
  if (!pdfBase64) return new Response(JSON.stringify({ error: "Campo pdfBase64 ausente." }), { status: 400, headers: CORS_HEADERS });

  console.log(`[OCR API] Iniciando processamento. Tamanho do payload: ${Math.round(pdfBase64.length / 1024)}KB`);

  let mediaType = "application/pdf";
  let sourceType = "document";
  
  if (pdfBase64.startsWith("data:")) {
    const match = pdfBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    if (match) {
      mediaType = match[1];
      if (mediaType.startsWith("image/")) {
        sourceType = "image";
      }
    }
  }

  console.log(`[OCR API] Tipo detectado: ${sourceType} (${mediaType})`);

  const cleanBase64 = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;

  const requestHeaders: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };

  if (sourceType === "document") {
    requestHeaders["anthropic-beta"] = "pdfs-2024-09-25";
  }

  console.log(`[OCR API] Chamando Anthropic usando modelo: ${MODEL}`);

  let ar;
  try {
    ar = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ 
        model: MODEL, 
        max_tokens: 512, 
        system: SYSTEM_PROMPT, 
        messages: [{ 
          role: "user", 
          content: [
            { type: sourceType, source: { type: "base64", media_type: mediaType, data: cleanBase64 } }, 
            { type: "text", text: "Extraia os dados desta CNH e retorne apenas o JSON. Releia os digitos e obedeça ao prompt de sistema." }
          ] 
        }] 
      }),
    });
  } catch (err) { 
    console.error(`[OCR API] Erro de fetch Anthropic:`, err);
    return new Response(JSON.stringify({ error: `Falha de conexao: ${err}` }), { status: 502, headers: CORS_HEADERS }); 
  }

  if (!ar.ok) { 
    const e = await ar.text(); 
    console.error(`[OCR API] Erro retornado pela Anthropic (${ar.status}):`, e);
    return new Response(JSON.stringify({ error: `API Anthropic ${ar.status}: ${e}` }), { status: 502, headers: CORS_HEADERS }); 
  }

  const ad = await ar.json();
  const rawText = ad?.content?.[0]?.text ?? "";
  
  console.log(`[OCR API] Resposta bruta da IA:`, rawText);

  let extracted;
  try {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON");
    extracted = JSON.parse(m[0]);
  } catch { 
    console.error(`[OCR API] Falha no Parse JSON. Texto bruto:`, rawText);
    return new Response(JSON.stringify({ error: "Modelo nao retornou JSON valido.", rawResponse: rawText }), { status: 422, headers: CORS_HEADERS }); 
  }

  console.log(`[OCR API] JSON Extraido com sucesso:`, JSON.stringify(extracted));

  // Validacoes Pós-Extracao
  if (extracted.cpf) {
    const cleanCpf = extracted.cpf.replace(/\D/g, '');
    if (!isValidCPF(cleanCpf)) {
      console.warn(`[OCR API] CPF Invalido rejeitado (falhou no digito verificador): ${extracted.cpf}`);
      extracted.cpf = null;
    } else {
      extracted.cpf = cleanCpf;
    }
  }

  if (extracted.categoria && !isValidCategory(extracted.categoria)) {
    console.warn(`[OCR API] Categoria Invalida rejeitada: ${extracted.categoria}`);
    extracted.categoria = null;
  }

  if (extracted.dataNascimento && !isValidDate(extracted.dataNascimento)) {
    console.warn(`[OCR API] Data de nascimento invalida rejeitada: ${extracted.dataNascimento}`);
    extracted.dataNascimento = null;
  }

  if (extracted.validade && !isValidDate(extracted.validade)) {
    console.warn(`[OCR API] Validade invalida rejeitada: ${extracted.validade}`);
    extracted.validade = null;
  }

  console.log(`[OCR API] Finalizando com sucesso.`);
  return new Response(JSON.stringify(extracted), { status: 200, headers: CORS_HEADERS });
});
