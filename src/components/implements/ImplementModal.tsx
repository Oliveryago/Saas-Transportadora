import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useImplements } from "../../hooks/useImplements";
import { ocrService, crlvFieldsFromOcr, getDocumentOcrUserMessage } from "../../services/motorista/ocrService";
import { DocumentOcrBar } from "../shared/DocumentOcrBar";
import { AttachedDocumentCard } from "../shared/AttachedDocumentCard";
import { CrlvExtractedFields } from "../shared/CrlvExtractedFields";
import { validateCnhFile } from "../../utils/cnhDocument";
import type { Implement } from "../../types";
import { IMPLEMENT_TYPE_LABELS, type ImplementType } from "../../types";

interface ImplementModalProps {
  open: boolean;
  onClose: () => void;
  editingImplement?: Implement | null;
}

function ImplementModal({
  open,
  onClose,
  editingImplement,
}: ImplementModalProps) {
  const {
    addImplement,
    updateImplement,
    uploadImplementDocument,
    getImplementDocSignedUrl,
    deleteImplementDocument,
  } = useImplements();
  const [licensePlate, setLicensePlate] = useState("");
  const [type, setType] = useState<ImplementType>("carreta");
  const [model, setModel] = useState("");
  const [extras, setExtras] = useState<Partial<Implement>>({});
  const [crlvUrl, setCrlvUrl] = useState("");
  const [crlvFileName, setCrlvFileName] = useState<string | null>(null);
  const [crlvUploadedAt, setCrlvUploadedAt] = useState("");
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingImplement) {
      setLicensePlate(editingImplement.license_plate);
      setType(editingImplement.type);
      setModel(editingImplement.model);
      setCrlvUrl(editingImplement.crlv_url || "");
      setCrlvFileName(editingImplement.crlv_file_name || null);
      setCrlvUploadedAt(editingImplement.crlv_uploaded_at || "");
      setExtras({
        year: editingImplement.year,
        year_manufacture: editingImplement.year_manufacture,
        chassi: editingImplement.chassi,
        renavam: editingImplement.renavam,
        color: editingImplement.color,
        crlv_fuel: editingImplement.crlv_fuel,
        load_capacity: editingImplement.load_capacity,
        crlv_category: editingImplement.crlv_category,
      });
    } else {
      setLicensePlate("");
      setType("carreta");
      setModel("");
      setCrlvUrl("");
      setCrlvFileName(null);
      setCrlvUploadedAt("");
      setExtras({});
    }
    setOcrSuccess(false);
    setOcrError(null);
    setError(null);
  }, [editingImplement, open]);

  async function handleDocumentUpload(file: File) {
    const validationError = validateCnhFile(file);
    if (validationError) {
      setOcrError(validationError);
      return;
    }

    setOcrProcessing(true);
    setOcrError(null);
    setOcrSuccess(false);
    const previousUrl = crlvUrl;
    const uploadedAt = new Date().toISOString();

    const [ocrOutcome, uploadOutcome] = await Promise.allSettled([
      ocrService.processVehicleDocument(file),
      uploadImplementDocument(file),
    ]);

    let nextUrl = previousUrl;
    let nextFileName = file.name;
    if (uploadOutcome.status === "fulfilled" && uploadOutcome.value) {
      nextUrl = uploadOutcome.value.path;
      nextFileName = uploadOutcome.value.fileName;
      setCrlvFileName(uploadOutcome.value.fileName);
      if (previousUrl && previousUrl !== nextUrl) {
        deleteImplementDocument(previousUrl).catch((err) => console.error("Falha ao remover CRLV anterior:", err));
      }
    } else if (uploadOutcome.status === "rejected") {
      console.error("[CRLV] Falha no upload do implemento:", uploadOutcome.reason);
      setError(uploadOutcome.reason instanceof Error ? uploadOutcome.reason.message : "Não foi possível salvar o arquivo. Os dados extraídos ainda podem ser usados.");
    }

    if (ocrOutcome.status === "fulfilled") {
      const mapped = crlvFieldsFromOcr(ocrOutcome.value, nextUrl);
      if (mapped.license_plate) setLicensePlate(mapped.license_plate);
      if (mapped.model) setModel(mapped.model);
      setCrlvUrl(mapped.crlv_url || nextUrl);
      if (nextUrl !== previousUrl) {
        setCrlvUploadedAt(uploadedAt);
        setCrlvFileName(nextFileName);
      }
      setExtras((prev) => ({
        ...prev,
        ...(mapped.year ? { year: mapped.year } : {}),
        ...(mapped.year_manufacture ? { year_manufacture: mapped.year_manufacture } : {}),
        ...(mapped.chassi ? { chassi: mapped.chassi } : {}),
        ...(mapped.renavam ? { renavam: mapped.renavam } : {}),
        ...(mapped.color ? { color: mapped.color } : {}),
        ...(mapped.crlv_fuel ? { crlv_fuel: mapped.crlv_fuel } : {}),
        ...(mapped.load_capacity ? { load_capacity: mapped.load_capacity } : {}),
        ...(mapped.crlv_category ? { crlv_category: mapped.crlv_category } : {}),
      }));
      setOcrSuccess(true);
    } else {
      console.error("[OCR] Falha no CRLV do implemento:", ocrOutcome.reason);
      setOcrError(getDocumentOcrUserMessage(ocrOutcome.reason, "documento do implemento"));
      if (nextUrl !== previousUrl) {
        setCrlvUrl(nextUrl);
        setCrlvUploadedAt(uploadedAt);
        setCrlvFileName(nextFileName);
      }
    }

    setOcrProcessing(false);
  }

  async function handleRemoveDocument() {
    if (crlvUrl) await deleteImplementDocument(crlvUrl);
    setCrlvUrl("");
    setCrlvFileName(null);
    setCrlvUploadedAt("");
    if (editingImplement?.id) {
      await updateImplement(editingImplement.id, { crlv_url: null, crlv_uploaded_at: null, crlv_file_name: null });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        license_plate: licensePlate.toUpperCase(),
        type,
        model,
        ...extras,
        crlv_url: crlvUrl || null,
        crlv_uploaded_at: crlvUploadedAt || null,
        crlv_file_name: crlvFileName || null,
      };
      if (editingImplement) {
        await updateImplement(editingImplement.id, payload);
      } else {
        await addImplement({
          ...payload,
          active: true,
        } as any);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {editingImplement ? "Editar Implemento" : "Novo Implemento"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DocumentOcrBar
          processing={ocrProcessing}
          success={ocrSuccess}
          error={ocrError}
          buttonLabel="Auto-preencher com Documento do Implemento"
          onFile={handleDocumentUpload}
        />

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placa
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="XYZ-9876"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ImplementType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(IMPLEMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Carreta Refrigerada"
              required
            />
          </div>

          <CrlvExtractedFields
            extras={extras}
            showYear
            onChange={(patch) => setExtras((prev) => ({ ...prev, ...patch }))}
          />

          {crlvUrl && (
            <AttachedDocumentCard
              title="Documento do implemento (CRLV)"
              storagePath={crlvUrl}
              fileName={crlvFileName || undefined}
              signedUrlLoader={getImplementDocSignedUrl}
              onRemove={handleRemoveDocument}
              removeConfirmMessage="Remover o CRLV? Você poderá enviar outro."
            />
          )}
          {crlvUploadedAt && (
            <p className="text-xs text-gray-500">
              Último envio: {new Date(crlvUploadedAt).toLocaleString("pt-BR")}
              {" · "}Use “Enviar outro documento” para substituir o arquivo.
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || ocrProcessing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ImplementModal;
