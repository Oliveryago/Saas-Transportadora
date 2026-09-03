import React, { useState, useRef } from "react";
import { Upload, CheckCircle, Loader2, User as UserIcon, Truck, Trash2, AlertCircle } from "lucide-react";
import { ocrService, OcrError } from "../../services/motorista/ocrService";
import { useVehicles } from "../../hooks/useVehicles";
import { useImplements } from "../../hooks/useImplements";
import { useDrivers } from "../../hooks/useDrivers";
import { CnhDocumentCard } from "./CnhDocumentCard";
import { Driver } from "../../types";
import { formatCnhExpiryLabel, getCnhExpiryStatus, validateCnhFile } from "../../utils/cnhDocument";

function getOcrUserMessage(error: unknown): string {
  if (error instanceof OcrError) {
    switch (error.code) {
      case "network":
      case "timeout":
        return "Sem conexão com o servidor, tente novamente.";
      case "unreadable":
      case "parse":
        return "Não conseguimos ler a CNH, tente uma foto mais nítida ou preencha manualmente.";
      case "invalid_file":
        return error.message || "Arquivo inválido. Envie uma foto JPG/PNG ou um PDF da CNH.";
      case "too_large":
        return "O arquivo é muito grande. Envie um JPG/PNG ou PDF de até 10 MB.";
      case "auth":
        return "Não foi possível processar a CNH agora. Por favor, preencha manualmente.";
      default:
        return "Houve um erro ao processar a CNH. Por favor, preencha manualmente.";
    }
  }
  return "Houve um erro ao processar a CNH. Por favor, preencha manualmente.";
}

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!br) return "";
  let year = Number(br[3]);
  if (year < 100) year += 2000;
  return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
}

function toSqlDate(value?: string | null): string | null {
  const iso = toDateInputValue(value);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    year < 1900 ||
    year > 2200
  ) {
    return null;
  }
  return iso;
}

interface MotoristaFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: Partial<Driver>;
}

export const MotoristaForm: React.FC<MotoristaFormProps> = ({ onSubmit, initialData }) => {
  const { vehicles } = useVehicles();
  const { implements: implementsList } = useImplements();
  const { uploadDriverPhoto, uploadingPhoto, uploadingCnh, uploadCnhDocument, getCnhSignedUrl, deleteCnhDocument, updateDriver } = useDrivers();

  const [formData, setFormData] = useState({
    nome_completo: initialData?.nome_completo || "",
    cpf: initialData?.cpf || "",
    data_nascimento: toDateInputValue(initialData?.data_nascimento) || "",
    numero_cnh: initialData?.numero_cnh || "",
    categoria_cnh: initialData?.categoria_cnh || "",
    validade_cnh: toDateInputValue(initialData?.validade_cnh) || "",
    data_primeira_habilitacao: toDateInputValue(initialData?.data_primeira_habilitacao) || "",
    numero_espelho: initialData?.numero_espelho || "",
    cep: initialData?.cep || "",
    street: initialData?.street || "",
    number: initialData?.number || "",
    neighborhood: initialData?.neighborhood || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    phone: initialData?.phone || "",
    photo_url: initialData?.photo_url || "",
    cnh_url: initialData?.cnh_url || "",
    cnh_uploaded_at: initialData?.cnh_uploaded_at || "",
    cnh_file_name: initialData?.cnh_file_name || "",
    vehicle_id: initialData?.vehicle_id || "",
    implement_id: initialData?.implement_id || "",
    implement2_id: initialData?.implement2_id || "",
    active: initialData?.active ?? true,
    start_date: initialData?.start_date || "",
    end_date: initialData?.end_date || "",
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cnhInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null);
  const [cnhFileName, setCnhFileName] = useState<string | null>(initialData?.cnh_file_name || null);
  const [cnhUploadError, setCnhUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCnhUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateCnhFile(file);
    if (validationError) {
      setCnhUploadError(validationError);
      if (cnhInputRef.current) cnhInputRef.current.value = "";
      return;
    }

    const previousCnhUrl = formData.cnh_url;
    setIsProcessingOCR(true);
    setOcrError(null);
    setCnhUploadError(null);
    setOcrSuccess(false);

    const [ocrOutcome, uploadOutcome] = await Promise.allSettled([
      ocrService.processCNH(file),
      uploadCnhDocument(file),
    ]);

    let nextCnhUrl = previousCnhUrl;
    let nextFileName = file.name;
    const uploadedAt = new Date().toISOString();
    if (uploadOutcome.status === "fulfilled" && uploadOutcome.value) {
      nextCnhUrl = uploadOutcome.value.path;
      nextFileName = uploadOutcome.value.fileName;
      setCnhFileName(uploadOutcome.value.fileName);
      if (previousCnhUrl && previousCnhUrl !== nextCnhUrl) {
        deleteCnhDocument(previousCnhUrl).catch((err) => console.error("Falha ao remover CNH anterior:", err));
      }
    } else if (uploadOutcome.status === "rejected") {
      console.error("[CNH] Falha no upload para o Storage:", uploadOutcome.reason);
      setCnhUploadError("Não foi possível salvar o arquivo da CNH. Os dados extraídos ainda podem ser usados.");
    }

    if (ocrOutcome.status === "fulfilled") {
      const result = ocrOutcome.value;
      console.log("[OCR] JSON completo da API (antes do mapeamento):", result);
      console.log("[OCR] CPF recebido para o formulário:", result.cpf);
      setFormData(prev => ({
        ...prev,
        nome_completo: result.nome_completo || prev.nome_completo,
        cpf: result.cpf || prev.cpf,
        numero_cnh: result.numero_cnh || prev.numero_cnh,
        categoria_cnh: result.categoria_cnh || prev.categoria_cnh,
        validade_cnh: toDateInputValue(result.validade_cnh) || prev.validade_cnh,
        data_nascimento: toDateInputValue(result.data_nascimento) || prev.data_nascimento,
        data_primeira_habilitacao: toDateInputValue(result.data_primeira_habilitacao) || prev.data_primeira_habilitacao,
        numero_espelho: result.numero_espelho || prev.numero_espelho,
        cnh_url: nextCnhUrl,
        cnh_uploaded_at: nextCnhUrl !== previousCnhUrl ? uploadedAt : prev.cnh_uploaded_at,
        cnh_file_name: nextCnhUrl !== previousCnhUrl ? nextFileName : prev.cnh_file_name,
      }));
      setOcrSuccess(true);
    } else {
      console.error("[OCR] Falha no processamento da CNH (UI)", {
        code: ocrOutcome.reason instanceof OcrError ? ocrOutcome.reason.code : "unknown",
        status: ocrOutcome.reason instanceof OcrError ? ocrOutcome.reason.status : undefined,
        message: ocrOutcome.reason instanceof Error ? ocrOutcome.reason.message : String(ocrOutcome.reason),
        details: ocrOutcome.reason instanceof OcrError ? ocrOutcome.reason.details : ocrOutcome.reason,
      });
      setOcrError(getOcrUserMessage(ocrOutcome.reason));
      if (nextCnhUrl !== previousCnhUrl) {
        setFormData(prev => ({
          ...prev,
          cnh_url: nextCnhUrl,
          cnh_uploaded_at: uploadedAt,
          cnh_file_name: nextFileName,
        }));
      }
    }

    setIsProcessingOCR(false);
    if (cnhInputRef.current) cnhInputRef.current.value = "";
  };

  const handleRemoveCnh = async () => {
    if (formData.cnh_url) {
      await deleteCnhDocument(formData.cnh_url);
    }
    setFormData(prev => ({ ...prev, cnh_url: "", cnh_uploaded_at: "", cnh_file_name: "" }));
    setCnhFileName(null);
    if (initialData?.id) {
      await updateDriver(initialData.id, { cnh_url: null, cnh_uploaded_at: null, cnh_file_name: null });
    }
    if (cnhInputRef.current) cnhInputRef.current.value = "";
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const url = await uploadDriverPhoto(file);
      if (url) {
        setFormData(prev => ({ ...prev, photo_url: url }));
        setPhotoPreview(url);
      }
    } catch (err) {
      alert("Erro ao fazer upload da foto. Tente novamente.");
      setPhotoPreview(initialData?.photo_url || null);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photo_url: "" }));
    setPhotoPreview(null);
  };

  const handleCepBlur = async () => {
    const cleanedCep = formData.cep.replace(/\D/g, "");
    if (cleanedCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const json = await res.json();
      if (!json.erro) {
        setFormData(prev => ({
          ...prev,
          street: json.logradouro || "",
          neighborhood: json.bairro || "",
          city: json.localidade || "",
          state: json.uf || "",
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    } finally {
      setFetchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    const sanitizedData = {
      ...formData,
      vehicle_id: formData.vehicle_id || null,
      implement_id: formData.implement_id || null,
      implement2_id: formData.implement2_id || null,
      data_nascimento: toSqlDate(formData.data_nascimento),
      validade_cnh: toSqlDate(formData.validade_cnh),
      data_primeira_habilitacao: toSqlDate(formData.data_primeira_habilitacao),
      numero_espelho: formData.numero_espelho || null,
      cnh_url: formData.cnh_url || null,
      cnh_uploaded_at: formData.cnh_uploaded_at || null,
      cnh_file_name: formData.cnh_file_name || null,
      start_date: toSqlDate(formData.start_date),
      end_date: toSqlDate(formData.end_date),
    };

    try {
      await onSubmit(sanitizedData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar motorista.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
      
      {/* Header & OCR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-6 mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">Dados do Motorista</h2>
        <div className="flex items-center gap-2">
          {isProcessingOCR ? (
            <span className="flex items-center gap-2 text-sm text-indigo-600 animate-pulse font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando CNH...
            </span>
          ) : (
            <>
              {ocrSuccess && (
                <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Dados Extraídos com Sucesso
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-indigo-600 cursor-pointer hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
                <Upload className="w-4 h-4" />
                {ocrSuccess ? "Enviar outra CNH" : "Enviar CNH (JPG, PNG ou PDF)"}
                <input
                  ref={cnhInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleCnhUpload}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {ocrError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            {ocrError} Os campos abaixo continuam disponíveis para preenchimento manual.
          </p>
        </div>
      )}

      {formatCnhExpiryLabel(formData.validade_cnh) && (
        <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
          getCnhExpiryStatus(formData.validade_cnh) === "expired"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{formatCnhExpiryLabel(formData.validade_cnh)}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Coluna 1: Foto do Perfil */}
        <div className="flex flex-col items-center justify-start space-y-4">
          <div className="relative group w-32 h-32 rounded-full border-4 border-gray-50 bg-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
            {photoPreview ? (
              <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-12 h-12 text-gray-300" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <label className="cursor-pointer p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors text-white">
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} ref={photoInputRef} disabled={uploadingPhoto} />
              </label>
              {photoPreview && (
                <button type="button" onClick={removePhoto} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors text-white">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Foto do Perfil</span>
        </div>

        {/* Coluna 2 e 3: Dados Pessoais & CNH */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Status do Motorista</label>
              <div className="flex items-center gap-3 mt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className={`ml-3 text-sm font-medium ${formData.active ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.active ? 'Motorista Ativo' : 'Motorista Inativo'}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Data de Início (Admissão)</label>
              <input type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Data de Saída (Demissão)</label>
              <input type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
            </div>

            <div className="space-y-1 mt-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nome Completo *</label>
              <input required type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.nome_completo} onChange={e => setFormData({ ...formData, nome_completo: e.target.value })} />
            </div>

            <div className="space-y-1 mt-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">CPF *</label>
              <input required type="text" placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Data de Nascimento</label>
              <input type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={toDateInputValue(formData.data_nascimento)} onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Telefone / WhatsApp</label>
              <input type="text" placeholder="(11) 99999-9999" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>

            <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Número da CNH</label>
                <input type="text" className="w-full min-w-0 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.numero_cnh} onChange={e => setFormData({ ...formData, numero_cnh: e.target.value })} />
              </div>
              <div className="space-y-1 w-24 shrink-0">
                <label className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Categoria</label>
                <input type="text" placeholder="Ex: E" className="w-full px-1 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none text-center uppercase" value={formData.categoria_cnh} onChange={e => setFormData({ ...formData, categoria_cnh: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1 w-64 shrink-0">
                <label className="text-xs font-semibold text-gray-500 uppercase">Validade</label>
                <input type="date" className="w-full min-w-64 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={toDateInputValue(formData.validade_cnh)} onChange={e => setFormData({ ...formData, validade_cnh: e.target.value })} />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Data da 1ª Habilitação</label>
                <input type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={toDateInputValue(formData.data_primeira_habilitacao)} onChange={e => setFormData({ ...formData, data_primeira_habilitacao: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Nº Espelho / RENACH</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.numero_espelho} onChange={e => setFormData({ ...formData, numero_espelho: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {(formData.cnh_url || cnhUploadError) && (
        <div className="space-y-2">
          {formData.cnh_url && (
            <>
              <CnhDocumentCard
                storagePath={formData.cnh_url}
                fileName={cnhFileName || formData.cnh_file_name || undefined}
                signedUrlLoader={getCnhSignedUrl}
                onRemove={handleRemoveCnh}
              />
              {formData.cnh_uploaded_at && (
                <p className="text-xs text-gray-500">
                  Último envio: {new Date(formData.cnh_uploaded_at).toLocaleString("pt-BR")}
                  {" · "}Use “Enviar outra CNH” para substituir o arquivo.
                </p>
              )}
            </>
          )}
          {cnhUploadError && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">{cnhUploadError}</p>
          )}
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
              CEP
              {fetchingCep && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
            </label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} onBlur={handleCepBlur} placeholder="00000-000" />
          </div>
          <div className="space-y-1 md:col-span-3">
            <label className="text-xs font-semibold text-gray-500 uppercase">Rua</label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Número</label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Bairro</label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Cidade</label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Estado (UF)</label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })} maxLength={2} />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-800">Vínculo de Frota</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Cavalo Mecânico (Veículo)</label>
            <select
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.vehicle_id}
              onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
            >
              <option value="">Sem vínculo</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Implemento (Carreta)</label>
            <select
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.implement_id}
              onChange={e => setFormData({ ...formData, implement_id: e.target.value })}
            >
              <option value="">Sem vínculo</option>
              {implementsList.map(i => (
                <option key={i.id} value={i.id}>{i.license_plate} - {i.model}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">2º Implemento (Opcional)</label>
            <select
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.implement2_id}
              onChange={e => setFormData({ ...formData, implement2_id: e.target.value })}
            >
              <option value="">Sem vínculo</option>
              {implementsList.map(i => (
                <option key={i.id} value={i.id}>{i.license_plate} - {i.model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-col items-end gap-3 border-t">
        {saveError && (
          <div className="w-full flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{saveError}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={isProcessingOCR || uploadingPhoto || uploadingCnh || saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          {saving ? "Salvando..." : initialData ? "Atualizar Motorista" : "Salvar Motorista"}
        </button>
      </div>
    </form>
  );
};
