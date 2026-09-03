import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useVehicles } from "../../hooks/useVehicles";
import { ocrService, crlvFieldsFromOcr, getDocumentOcrUserMessage } from "../../services/motorista/ocrService";
import { DocumentOcrBar } from "../shared/DocumentOcrBar";
import { AttachedDocumentCard } from "../shared/AttachedDocumentCard";
import { CrlvExtractedFields } from "../shared/CrlvExtractedFields";
import { validateCnhFile } from "../../utils/cnhDocument";
import type { Vehicle } from "../../types";

interface VehicleModalProps {
  open: boolean;
  onClose: () => void;
  editingVehicle?: Vehicle | null;
}

export function VehicleModal({
  open,
  onClose,
  editingVehicle,
}: VehicleModalProps) {
  const {
    addVehicle,
    updateVehicle,
    uploadVehicleDocument,
    getVehicleDocSignedUrl,
    deleteVehicleDocument,
  } = useVehicles();
  const [licensePlate, setLicensePlate] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentKm, setCurrentKm] = useState(0);
  const [tankCapacity, setTankCapacity] = useState<number | "">("");
  const [extras, setExtras] = useState<Partial<Vehicle>>({});
  const [crlvUrl, setCrlvUrl] = useState("");
  const [crlvFileName, setCrlvFileName] = useState<string | null>(null);
  const [crlvUploadedAt, setCrlvUploadedAt] = useState("");
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingVehicle) {
      setLicensePlate(editingVehicle.license_plate);
      setModel(editingVehicle.model);
      setYear(editingVehicle.year || new Date().getFullYear());
      setCurrentKm(editingVehicle.current_km);
      setTankCapacity(editingVehicle.tank_capacity || "");
      setCrlvUrl(editingVehicle.crlv_url || "");
      setCrlvFileName(editingVehicle.crlv_file_name || null);
      setCrlvUploadedAt(editingVehicle.crlv_uploaded_at || "");
      setExtras({
        year_manufacture: editingVehicle.year_manufacture,
        chassi: editingVehicle.chassi,
        renavam: editingVehicle.renavam,
        color: editingVehicle.color,
        crlv_fuel: editingVehicle.crlv_fuel,
        load_capacity: editingVehicle.load_capacity,
        crlv_category: editingVehicle.crlv_category,
      });
    } else {
      setLicensePlate("");
      setModel("");
      setYear(new Date().getFullYear());
      setCurrentKm(0);
      setTankCapacity("");
      setCrlvUrl("");
      setCrlvFileName(null);
      setCrlvUploadedAt("");
      setExtras({});
    }
    setOcrSuccess(false);
    setOcrError(null);
    setError(null);
  }, [editingVehicle, open]);

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
      uploadVehicleDocument(file),
    ]);

    let nextUrl = previousUrl;
    let nextFileName = file.name;
    if (uploadOutcome.status === "fulfilled" && uploadOutcome.value) {
      nextUrl = uploadOutcome.value.path;
      nextFileName = uploadOutcome.value.fileName;
      setCrlvFileName(uploadOutcome.value.fileName);
      if (previousUrl && previousUrl !== nextUrl) {
        deleteVehicleDocument(previousUrl).catch((err) => console.error("Falha ao remover CRLV anterior:", err));
      }
    } else if (uploadOutcome.status === "rejected") {
      console.error("[CRLV] Falha no upload:", uploadOutcome.reason);
      setError(uploadOutcome.reason instanceof Error ? uploadOutcome.reason.message : "Não foi possível salvar o arquivo. Os dados extraídos ainda podem ser usados.");
    }

    if (ocrOutcome.status === "fulfilled") {
      const mapped = crlvFieldsFromOcr(ocrOutcome.value, nextUrl);
      console.log("[OCR] CRLV mapeado para o formulário:", mapped);
      if (mapped.license_plate) setLicensePlate(mapped.license_plate);
      if (mapped.model) setModel(mapped.model);
      if (mapped.year) setYear(mapped.year);
      setCrlvUrl(mapped.crlv_url || nextUrl);
      if (nextUrl !== previousUrl) {
        setCrlvUploadedAt(uploadedAt);
        setCrlvFileName(nextFileName);
      }
      setExtras((prev) => ({
        ...prev,
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
      console.error("[OCR] Falha no CRLV:", ocrOutcome.reason);
      setOcrError(getDocumentOcrUserMessage(ocrOutcome.reason, "documento do veículo"));
      if (nextUrl !== previousUrl) {
        setCrlvUrl(nextUrl);
        setCrlvUploadedAt(uploadedAt);
        setCrlvFileName(nextFileName);
      }
    }

    setOcrProcessing(false);
  }

  async function handleRemoveDocument() {
    if (crlvUrl) await deleteVehicleDocument(crlvUrl);
    setCrlvUrl("");
    setCrlvFileName(null);
    setCrlvUploadedAt("");
    if (editingVehicle?.id) {
      await updateVehicle(editingVehicle.id, { crlv_url: null, crlv_uploaded_at: null, crlv_file_name: null });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      license_plate: licensePlate.toUpperCase(),
      model,
      year,
      current_km: currentKm,
      tank_capacity: tankCapacity === "" ? null : Number(tankCapacity),
      ...extras,
      crlv_url: crlvUrl || null,
      crlv_uploaded_at: crlvUploadedAt || null,
      crlv_file_name: crlvFileName || null,
    };

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
      } else {
        await addVehicle({
          ...payload,
          active: true,
        } as any);
      }
      onClose();
    } catch (err: any) {
      console.error("Error saving vehicle:", err);
      const message = err?.message || err?.details || "Erro ao salvar o veículo. Verifique se a placa já existe.";
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
            {editingVehicle ? "Editar Cavalo" : "Novo Cavalo"}
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
              placeholder="ABC-1234"
              required
            />
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
              placeholder="Scania R440"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1980"
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KM Atual
              </label>
              <input
                type="number"
                value={currentKm}
                onChange={(e) => setCurrentKm(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidade do Tanque (Litros)
            </label>
            <input
              type="number"
              value={tankCapacity}
              onChange={(e) => setTankCapacity(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 840"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Usado para estimar o nível de combustível atual.
            </p>
          </div>

          <CrlvExtractedFields extras={extras} onChange={(patch) => setExtras((prev) => ({ ...prev, ...patch }))} />

          {crlvUrl && (
            <AttachedDocumentCard
              title="Documento do veículo (CRLV)"
              storagePath={crlvUrl}
              fileName={crlvFileName || undefined}
              signedUrlLoader={getVehicleDocSignedUrl}
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

export default VehicleModal;
