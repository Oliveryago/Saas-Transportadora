/**
 * Cliente genérico de OCR via Edge Function (Claude Vision).
 * Usado por CNH e documento de veículo (CRLV). A API key fica só no backend.
 */

import { supabase } from "../../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_PDF_BYTES = 4.5 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1800;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const REJECTED_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/avif"]);

export type OcrErrorCode =
  | "network"
  | "timeout"
  | "auth"
  | "unreadable"
  | "parse"
  | "invalid_file"
  | "too_large"
  | "unknown";

export class OcrError extends Error {
  code: OcrErrorCode;
  status?: number;
  details?: unknown;

  constructor(code: OcrErrorCode, message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "OcrError";
    this.code = code;
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

type PreparedFile = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";
  sourceType: "image" | "document";
  originalName: string;
  originalType: string;
  originalSize: number;
  preparedBytes: number;
};

function logOcrError(stage: string, extra: Record<string, unknown>) {
  console.error(`[OCR] ${stage}`, extra);
}

function mapBackendCode(code?: string, status?: number): OcrErrorCode {
  if (code === "network" || code === "timeout" || code === "auth" || code === "unreadable" || code === "parse" || code === "invalid_file" || code === "too_large") {
    return code;
  }
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 504) return "timeout";
  if (status === 413) return "too_large";
  if (status === 422) return "unreadable";
  if (typeof status === "number" && status >= 500) return "network";
  return "unknown";
}

function isRetryable(code: OcrErrorCode) {
  return code === "network" || code === "timeout" || code === "parse";
}

function detectMimeFromMagic(bytes: Uint8Array, fallbackType: string): string {
  if (bytes.length >= 4) {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  if (bytes.length >= 12) {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (["heic", "heif", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return fallbackType;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new OcrError("invalid_file", "Falha ao ler o arquivo."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new OcrError("invalid_file", "Arquivo de imagem inválido ou corrompido."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new OcrError("invalid_file", "Falha ao compactar a imagem."));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function compressImage(file: File, detectedType: string): Promise<{ blob: Blob; mediaType: "image/jpeg" | "image/png" | "image/webp" }> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new OcrError("invalid_file", "Não foi possível processar a imagem neste navegador.");
  ctx.drawImage(img, 0, 0, width, height);

  const outputType: "image/jpeg" = "image/jpeg";
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, outputType, quality);
  while (blob.size > TARGET_IMAGE_BYTES && quality > 0.5) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size > TARGET_IMAGE_BYTES && (width > 1280 || height > 1280)) {
    const shrink = 1280 / Math.max(width, height);
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, outputType, 0.72);
  }

  console.log("[OCR] Imagem preparada", {
    original: { w: img.width, h: img.height, bytes: file.size, type: file.type || detectedType },
    prepared: { w: canvas.width, h: canvas.height, bytes: blob.size, type: outputType, quality },
  });

  return { blob, mediaType: outputType };
}

export async function prepareDocumentFile(file: File): Promise<PreparedFile> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedType = detectMimeFromMagic(header, file.type || "").toLowerCase();
  const name = file.name || "documento";

  if (REJECTED_TYPES.has(detectedType) || REJECTED_TYPES.has(file.type)) {
    throw new OcrError(
      "invalid_file",
      "Este formato (HEIC/HEIF) não é suportado. Tire a foto em JPEG ou envie um PDF.",
      { details: { detectedType, fileType: file.type, name } },
    );
  }

  const isPdf = detectedType === "application/pdf" || file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
  const isImage = ALLOWED_IMAGE_TYPES.has(detectedType) || ALLOWED_IMAGE_TYPES.has(file.type);

  if (!isPdf && !isImage) {
    throw new OcrError(
      "invalid_file",
      "Envie uma foto em JPG/PNG ou um arquivo PDF.",
      { details: { detectedType, fileType: file.type, name, size: file.size } },
    );
  }

  if (isPdf) {
    if (file.size > MAX_PDF_BYTES) {
      throw new OcrError("too_large", "O PDF é muito grande. Envie um arquivo de até 4 MB ou uma foto.", {
        details: { size: file.size, max: MAX_PDF_BYTES },
      });
    }
    const dataUrl = await blobToDataUrl(file);
    return {
      base64: dataUrl,
      mediaType: "application/pdf",
      sourceType: "document",
      originalName: name,
      originalType: file.type,
      originalSize: file.size,
      preparedBytes: file.size,
    };
  }

  const { blob, mediaType } = await compressImage(file, detectedType || file.type);
  const dataUrl = await blobToDataUrl(blob);
  return {
    base64: dataUrl,
    mediaType,
    sourceType: "image",
    originalName: name,
    originalType: file.type,
    originalSize: file.size,
    preparedBytes: blob.size,
  };
}

async function callOnce(functionName: string, prepared: PreparedFile, attempt: number): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new OcrError("auth", "Sessão expirada. Faça login novamente.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  console.log("[OCR] Enviando para Edge Function", {
    attempt,
    functionName,
    url,
    mediaType: prepared.mediaType,
    sourceType: prepared.sourceType,
    original: { name: prepared.originalName, type: prepared.originalType, size: prepared.originalSize },
    preparedBytes: prepared.preparedBytes,
    payloadKB: Math.round(prepared.base64.length / 1024),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        fileBase64: prepared.base64,
        mediaType: prepared.mediaType,
        sourceType: prepared.sourceType,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    logOcrError(isAbort ? "Timeout ao chamar Edge Function" : "Falha de rede ao chamar Edge Function", {
      attempt,
      functionName,
      cause: err instanceof Error ? { name: err.name, message: err.message } : err,
    });
    throw new OcrError(isAbort ? "timeout" : "network", isAbort ? "Tempo esgotado ao processar o documento." : "Falha de conexão com o servidor.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  const rawBody = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    logOcrError("Resposta da Edge Function não é JSON", {
      attempt,
      status: response.status,
      body: rawBody.slice(0, 2000),
    });
    throw new OcrError("network", "Resposta inválida do servidor.", {
      status: response.status,
      details: rawBody.slice(0, 2000),
    });
  }

  if (!response.ok) {
    const code = mapBackendCode(typeof data.code === "string" ? data.code : undefined, response.status);
    logOcrError("Edge Function retornou erro", { attempt, functionName, status: response.status, code, body: data });
    throw new OcrError(code, typeof data.error === "string" ? data.error : "Erro ao processar o documento.", {
      status: response.status,
      details: data,
    });
  }

  console.log("[OCR] JSON completo da API (antes do mapeamento):", data);
  return data;
}

export async function invokeExtractFunction<T>(
  functionName: string,
  file: File,
  mapResponse: (raw: Record<string, unknown>) => T,
): Promise<T> {
  const prepared = await prepareDocumentFile(file);
  let lastError: OcrError | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callOnce(functionName, prepared, attempt);
      return mapResponse(raw);
    } catch (err) {
      const ocrError = err instanceof OcrError
        ? err
        : new OcrError("unknown", err instanceof Error ? err.message : "Erro desconhecido ao processar o documento.", { details: err });
      lastError = ocrError;
      logOcrError(`Tentativa ${attempt} falhou`, {
        functionName,
        code: ocrError.code,
        status: ocrError.status,
        message: ocrError.message,
        details: ocrError.details,
      });
      if (!isRetryable(ocrError.code) || attempt === 2) break;
      console.warn("[OCR] Retry automático após falha recuperável:", ocrError.code);
    }
  }

  throw lastError ?? new OcrError("unknown", "Erro ao processar o documento.");
}

export function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}
