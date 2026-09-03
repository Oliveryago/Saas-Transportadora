import React, { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Trash2, X, Download } from "lucide-react";
import { downloadFromUrl } from "../../utils/cnhDocument";

interface AttachedDocumentCardProps {
  title: string;
  storagePath: string;
  fileName?: string;
  signedUrlLoader: (path: string) => Promise<string | null>;
  onRemove: () => Promise<void> | void;
  removeConfirmMessage?: string;
}

function displayName(storagePath: string, fileName?: string) {
  if (fileName) return fileName;
  const base = storagePath.split("/").pop() || storagePath;
  return base.replace(/^[0-9a-f-]{36}_/i, "");
}

function isPdf(name: string) {
  return /\.pdf($|\?)/i.test(name);
}

export const AttachedDocumentCard: React.FC<AttachedDocumentCardProps> = ({
  title,
  storagePath,
  fileName,
  signedUrlLoader,
  onRemove,
  removeConfirmMessage = "Remover o arquivo? Você poderá enviar outro.",
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = displayName(storagePath, fileName);
  const pdf = isPdf(label) || isPdf(storagePath);

  useEffect(() => {
    let cancelled = false;
    setLoadingUrl(true);
    setError(null);
    signedUrlLoader(storagePath)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível abrir o arquivo.");
      })
      .finally(() => {
        if (!cancelled) setLoadingUrl(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath, signedUrlLoader]);

  const handleDownload = async () => {
    if (!signedUrl) return;
    setDownloading(true);
    try {
      await downloadFromUrl(signedUrl, label);
    } catch (err) {
      console.error("Erro ao baixar documento:", err);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(removeConfirmMessage)) return;
    setRemoving(true);
    try {
      await onRemove();
    } catch (err) {
      console.error("Erro ao remover documento:", err);
      alert("Não foi possível remover o arquivo. Tente novamente.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          {pdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase">{title}</p>
          {loadingUrl ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Gerando link...
            </span>
          ) : signedUrl ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="block truncate text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left"
              title="Visualizar arquivo"
            >
              {label}
            </button>
          ) : (
            <span className="block truncate text-sm text-gray-700">{label}</span>
          )}
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
        {signedUrl && !loadingUrl && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
            title="Baixar CNH"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Remover arquivo"
        >
          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {previewOpen && signedUrl && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-800 truncate pr-4">{label}</p>
              <div className="flex items-center gap-2">
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Visualizar CNH
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Baixar CNH
                </button>
                <button type="button" onClick={() => setPreviewOpen(false)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-gray-100 flex-1 min-h-[60vh]">
              {pdf ? (
                <iframe title={title} src={signedUrl} className="w-full h-full min-h-[60vh]" />
              ) : (
                <img src={signedUrl} alt={title} className="max-h-[75vh] w-full object-contain mx-auto" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
