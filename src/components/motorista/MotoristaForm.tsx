import React, { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle, Loader2, User as UserIcon, Truck, Trash2 } from "lucide-react";
import { ocrService } from "../../services/motorista/ocrService";
import { useVehicles } from "../../hooks/useVehicles";
import { useImplements } from "../../hooks/useImplements";
import { useDrivers } from "../../hooks/useDrivers";
import { Driver } from "../../types";

interface MotoristaFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: Partial<Driver>;
}

export const MotoristaForm: React.FC<MotoristaFormProps> = ({ onSubmit, initialData }) => {
  const { vehicles } = useVehicles();
  const { implements: implementsList } = useImplements();
  const { uploadDriverPhoto, uploadingPhoto } = useDrivers();

  const [formData, setFormData] = useState({
    nome_completo: initialData?.nome_completo || "",
    cpf: initialData?.cpf || "",
    data_nascimento: initialData?.data_nascimento || "",
    numero_cnh: initialData?.numero_cnh || "",
    categoria_cnh: initialData?.categoria_cnh || "",
    validade_cnh: initialData?.validade_cnh || "",
    cep: initialData?.cep || "",
    street: initialData?.street || "",
    number: initialData?.number || "",
    neighborhood: initialData?.neighborhood || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    phone: initialData?.phone || "",
    photo_url: initialData?.photo_url || "",
    vehicle_id: initialData?.vehicle_id || "",
    implement_id: initialData?.implement_id || "",
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null);

  const handleCnhUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    try {
      const result = await ocrService.processCNH(file);
      setFormData(prev => ({
        ...prev,
        nome_completo: result.nome_completo || prev.nome_completo,
        cpf: result.cpf || prev.cpf,
        numero_cnh: result.numero_cnh || prev.numero_cnh,
        categoria_cnh: result.categoria_cnh || prev.categoria_cnh,
        validade_cnh: result.validade_cnh || prev.validade_cnh,
        data_nascimento: result.data_nascimento || prev.data_nascimento
      }));
      setOcrSuccess(true);
    } catch (error) {
      console.error("Erro no OCR:", error);
      alert("Houve um erro ao processar a CNH. Por favor, preencha manualmente.");
    } finally {
      setIsProcessingOCR(false);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
          ) : ocrSuccess ? (
            <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Dados Extraídos com Sucesso
            </span>
          ) : (
            <label className="flex items-center gap-2 text-sm text-indigo-600 cursor-pointer hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
              <Upload className="w-4 h-4" />
              Auto-preencher com CNH
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleCnhUpload} />
            </label>
          )}
        </div>
      </div>

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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nome Completo *</label>
              <input required type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.nome_completo} onChange={e => setFormData({ ...formData, nome_completo: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">CPF *</label>
              <input required type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Data de Nascimento</label>
              <input type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.data_nascimento} onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Telefone / WhatsApp</label>
              <input type="text" placeholder="(11) 99999-9999" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Número da CNH</label>
              <input type="text" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.numero_cnh} onChange={e => setFormData({ ...formData, numero_cnh: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Categoria</label>
                <input type="text" placeholder="Ex: E" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.categoria_cnh} onChange={e => setFormData({ ...formData, categoria_cnh: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Validade</label>
                <input type="date" className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.validade_cnh} onChange={e => setFormData({ ...formData, validade_cnh: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
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
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t">
        <button
          type="submit"
          disabled={isProcessingOCR || uploadingPhoto}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          {initialData ? "Atualizar Motorista" : "Salvar Motorista"}
        </button>
      </div>
    </form>
  );
};
