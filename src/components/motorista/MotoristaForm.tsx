import React, { useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { ocrService } from "../../services/motorista/ocrService";
import { Driver } from "../../types";

interface MotoristaFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: Partial<Driver>;
}

export const MotoristaForm: React.FC<MotoristaFormProps> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    nome_completo: initialData?.nome_completo || "",
    cpf: initialData?.cpf || "",
    data_nascimento: initialData?.data_nascimento || "",
    numero_cnh: initialData?.numero_cnh || "",
    categoria_cnh: initialData?.categoria_cnh || "",
    validade_cnh: initialData?.validade_cnh || "",
    endereco: initialData?.endereco || "",
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    try {
      const result = await ocrService.processCNH(file);
      setFormData(prev => ({
        ...prev,
        nome_completo: result.nome_completo,
        cpf: result.cpf,
        numero_cnh: result.numero_cnh,
        categoria_cnh: result.categoria_cnh,
        validade_cnh: result.validade_cnh,
        data_nascimento: result.data_nascimento
      }));
      setOcrSuccess(true);
    } catch (error) {
      console.error("Erro no OCR:", error);
      alert("Houve um erro ao processar a CNH. Por favor, preencha manualmente.");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Cadastro de Motorista</h2>
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
              Subir CNH para preenchimento rápido
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Nome Completo</label>
          <input
            required
            type="text"
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.nome_completo}
            onChange={e => setFormData({ ...formData, nome_completo: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">CPF</label>
          <input
            required
            type="text"
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.cpf}
            onChange={e => setFormData({ ...formData, cpf: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Data de Nascimento</label>
          <input
            type="date"
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.data_nascimento}
            onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Número da CNH</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.numero_cnh}
            onChange={e => setFormData({ ...formData, numero_cnh: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Categoria</label>
          <input
            placeholder="Ex: AD, B, E"
            type="text"
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.categoria_cnh}
            onChange={e => setFormData({ ...formData, categoria_cnh: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase">Validade</label>
          <input
            type="date"
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.validade_cnh}
            onChange={e => setFormData({ ...formData, validade_cnh: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase">Endereço Completo</label>
        <textarea
          rows={2}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none"
          value={formData.endereco}
          onChange={e => setFormData({ ...formData, endereco: e.target.value })}
        />
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isProcessingOCR}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          {initialData ? "Atualizar Motorista" : "Cadastrar Motorista"}
        </button>
      </div>
    </form>
  );
};
