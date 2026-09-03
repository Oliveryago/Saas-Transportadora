import { supabase } from "../../lib/supabase";
import { fileToCnhPdf, validateCnhFile } from "../../utils/cnhDocument";

const SIGNED_TTL_SEC = 60 * 60;

export function extractStoragePath(value: string, bucket: string): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  const match = value.match(new RegExp(`${bucket}/(.+?)(?:\\?|$)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function uploadPrivateDocument(
  bucket: string,
  tenantId: string,
  file: File,
): Promise<{ path: string; fileName: string }> {
  const validationError = validateCnhFile(file);
  if (validationError) throw new Error(validationError);

  let toUpload = file;
  try {
    toUpload = await fileToCnhPdf(file);
  } catch (err) {
    console.warn("Falha ao converter documento para PDF; salvando o arquivo original.", err);
    toUpload = file;
  }

  const ext = toUpload.name.split(".").pop()?.toLowerCase() || "pdf";
  const safeExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "pdf";
  const original = toUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || `documento.${safeExt}`;
  const path = `${tenantId}/${crypto.randomUUID()}_${original}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, toUpload, { contentType: toUpload.type || "application/pdf", upsert: false });

  if (error) throw error;
  return { path, fileName: toUpload.name };
}

export async function getPrivateDocumentSignedUrl(bucket: string, stored: string): Promise<string | null> {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored) && !stored.includes("/storage/v1/object/")) return stored;
  const path = extractStoragePath(stored, bucket);
  if (!path) return stored;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_TTL_SEC);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePrivateDocument(bucket: string, stored: string): Promise<void> {
  const path = extractStoragePath(stored, bucket);
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
