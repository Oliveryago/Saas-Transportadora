import { supabase } from "../../lib/supabase";

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
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "bin";
  const original = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || `documento.${safeExt}`;
  const path = `${tenantId}/${crypto.randomUUID()}_${original}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return { path, fileName: file.name };
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
