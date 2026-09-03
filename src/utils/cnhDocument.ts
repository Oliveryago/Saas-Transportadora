export const MAX_CNH_UPLOAD_BYTES = 10 * 1024 * 1024;
export const CNH_EXPIRY_WARNING_DAYS = 60;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validateCnhFile(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const allowedExt = /\.(jpe?g|png|webp|pdf)$/.test(name);
  if (!ALLOWED_TYPES.has(type) && !allowedExt) {
    return "Envie apenas JPG, PNG ou PDF.";
  }
  if (file.size > MAX_CNH_UPLOAD_BYTES) {
    return "O arquivo deve ter no máximo 10 MB.";
  }
  return null;
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
      reject(new Error("Imagem inválida ou corrompida."));
    };
    img.src = url;
  });
}

async function imageFileToJpegDataUrl(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(img, 0, 0);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), width: img.width, height: img.height };
}

/** Converte JPG/PNG/WEBP em PDF de uma página. PDFs passam direto. */
export async function fileToCnhPdf(file: File): Promise<File> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) return file;

  const { default: jsPDF } = await import("jspdf");
  const { dataUrl, width, height } = await imageFileToJpegDataUrl(file);
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const scale = Math.min((pageW - margin * 2) / width, (pageH - margin * 2) / height);
  const w = width * scale;
  const h = height * scale;
  pdf.addImage(dataUrl, "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h);

  const blob = pdf.output("blob");
  const baseName = file.name.replace(/\.[^.]+$/, "") || "cnh";
  return new File([blob], `${baseName}.pdf`, { type: "application/pdf" });
}

export type CnhExpiryStatus = "ok" | "warning" | "expired" | "none";

export function daysUntilCnhExpiry(validade?: string | null): number | null {
  if (!validade) return null;
  const iso = validade.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!iso) return null;
  const expiry = new Date(`${iso[1]}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function getCnhExpiryStatus(validade?: string | null): CnhExpiryStatus {
  const days = daysUntilCnhExpiry(validade);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= CNH_EXPIRY_WARNING_DAYS) return "warning";
  return "ok";
}

export function formatCnhExpiryLabel(validade?: string | null): string | null {
  const days = daysUntilCnhExpiry(validade);
  if (days === null) return null;
  if (days < 0) return `CNH vencida há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "CNH vence hoje";
  if (days <= CNH_EXPIRY_WARNING_DAYS) return `CNH vence em ${days} dia${days === 1 ? "" : "s"}`;
  return null;
}

export async function downloadFromUrl(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível baixar o arquivo.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName.replace(/\.[^.]+$/, "")}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
