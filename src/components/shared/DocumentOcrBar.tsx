import { Upload, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useRef } from "react";

interface DocumentOcrBarProps {
  processing: boolean;
  success: boolean;
  error: string | null;
  buttonLabel?: string;
  processingLabel?: string;
  onFile: (file: File) => void;
}

export function DocumentOcrBar({
  processing,
  success,
  error,
  buttonLabel = "Auto-preencher com Documento do Veículo",
  processingLabel = "Processando documento...",
  onFile,
}: DocumentOcrBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        {processing ? (
          <span className="flex items-center gap-2 text-sm text-indigo-600 animate-pulse font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            {processingLabel}
          </span>
        ) : (
          <label className="flex items-center gap-2 text-sm text-indigo-600 cursor-pointer hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
            <Upload className="w-4 h-4" />
            {success ? "Enviar outro documento" : buttonLabel}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
          </label>
        )}
      </div>
      {success && !processing && (
        <p className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          Dados extraídos com sucesso
        </p>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
