import React, { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { downloadFromUrl } from "../../utils/cnhDocument";

interface DriverCnhActionsProps {
  cnhUrl?: string | null;
  fileName?: string | null;
  getSignedUrl: (path: string) => Promise<string | null>;
}

export const DriverCnhActions: React.FC<DriverCnhActionsProps> = ({
  cnhUrl,
  fileName,
  getSignedUrl,
}) => {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  if (!cnhUrl) {
    return <span className="text-xs text-gray-400">Sem CNH anexada</span>;
  }

  const resolveUrl = async () => {
    const url = await getSignedUrl(cnhUrl);
    if (!url) throw new Error("Link da CNH indisponível.");
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
      alert("Não foi possível abrir a CNH.");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy("download");
    try {
      const url = await resolveUrl();
      await downloadFromUrl(url, fileName || "cnh.pdf");
    } catch (err) {
      console.error(err);
      alert("Não foi possível baixar a CNH.");
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
        title="Visualizar CNH"
      >
        {busy === "view" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
        Visualizar
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={!!busy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold uppercase text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        title="Baixar CNH"
      >
        {busy === "download" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Baixar
      </button>
    </div>
  );
};
