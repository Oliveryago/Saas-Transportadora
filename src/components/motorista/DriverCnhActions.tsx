import React, { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { downloadFromUrl } from "../../utils/cnhDocument";

interface DriverCnhActionsProps {
  cnhUrl?: string | null;
  fileName?: string | null;
  getSignedUrl: (path: string) => Promise<string | null>;
  emptyLabel?: string;
  viewTitle?: string;
  downloadTitle?: string;
  defaultFileName?: string;
}

export const DriverCnhActions: React.FC<DriverCnhActionsProps> = ({
  cnhUrl,
  fileName,
  getSignedUrl,
  emptyLabel = "Sem CNH anexada",
  viewTitle = "Visualizar CNH",
  downloadTitle = "Baixar CNH",
  defaultFileName = "cnh.pdf",
}) => {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  if (!cnhUrl) {
    return <span className="text-xs text-gray-400">{emptyLabel}</span>;
  }

  const resolveUrl = async () => {
    const url = await getSignedUrl(cnhUrl);
    if (!url) throw new Error("Link do documento indisponível.");
    return url;
  };

  const handleView = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy("view");
    try {
      const url = await resolveUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      alert(`Não foi possível abrir o documento.`);
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy("download");
    try {
      const url = await resolveUrl();
      await downloadFromUrl(url, fileName || defaultFileName);
    } catch (err) {
      console.error(err);
      alert("Não foi possível baixar o documento.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleView}
        disabled={!!busy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold uppercase text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        title={viewTitle}
      >
        {busy === "view" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
        Visualizar
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={!!busy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold uppercase text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        title={downloadTitle}
      >
        {busy === "download" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Baixar
      </button>
    </div>
  );
};
