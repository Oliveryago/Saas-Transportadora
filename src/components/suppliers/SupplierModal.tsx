import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useSuppliers } from "../../hooks/useSuppliers";
import type { Supplier, SupplierType } from "../../types";
import { SUPPLIER_TYPE_LABELS } from "../../types";

interface SupplierModalProps {
    open: boolean;
    onClose: () => void;
    editingRecord?: Supplier | null;
}

function SupplierModal({ open, onClose, editingRecord }: SupplierModalProps) {
    const { addSupplier, updateSupplier } = useSuppliers();
    const [type, setType] = useState<SupplierType>("outro");
    const [companyName, setCompanyName] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [cep, setCep] = useState("");
    const [uf, setUf] = useState("");
    const [city, setCity] = useState("");
    const [street, setStreet] = useState("");
    const [number, setNumber] = useState("");
    const [phones, setPhones] = useState<string[]>([""]);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setType(editingRecord.type);
            setCompanyName(editingRecord.company_name);
            setCnpj(editingRecord.cnpj || "");
            setCep(editingRecord.cep || "");
            setUf(editingRecord.uf || "");
            setCity(editingRecord.city || "");
            setStreet(editingRecord.street || "");
            setNumber(editingRecord.number || "");
            setPhones(editingRecord.phones?.length > 0 ? editingRecord.phones : [""]);
            setNotes(editingRecord.notes || "");
        } else {
            setType("outro");
            setCompanyName("");
            setCnpj("");
            setCep("");
            setUf("");
            setCity("");
            setStreet("");
            setNumber("");
            setPhones([""]);
            setNotes("");
        }
        setError(null);
    }, [editingRecord, open]);

    function addPhone() { setPhones([...phones, ""]); }
    function removePhone(index: number) { setPhones(phones.filter((_, i) => i !== index)); }
    function updatePhone(index: number, value: string) {
        const updated = [...phones];
        updated[index] = value;
        setPhones(updated);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!companyName.trim()) { setError("Nome da empresa é obrigatório"); return; }
        setLoading(true);
        try {
            const data = {
                type, company_name: companyName, cnpj: cnpj || undefined, cep: cep || undefined,
                uf: uf || undefined, city: city || undefined, street: street || undefined,
                number: number || undefined, phones: phones.filter((p) => p.trim()), notes: notes || undefined,
                tenant_id: "",
            };
            if (editingRecord) { await updateSupplier(editingRecord.id, data); }
            else { await addSupplier(data as any); }
            onClose();
        } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar"); }
        finally { setLoading(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{editingRecord ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                            <select value={type} onChange={(e) => setType(e.target.value as SupplierType)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {(Object.entries(SUPPLIER_TYPE_LABELS) as [SupplierType, string][]).map(([k, l]) => (
                                    <option key={k} value={k}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                            <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="00.000.000/0000-00" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                            <input type="text" value={cep} onChange={(e) => setCep(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                            <input type="text" value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefones</label>
                        {phones.map((phone, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" value={phone} onChange={(e) => updatePhone(i, e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {phones.length > 1 && (
                                    <button type="button" onClick={() => removePhone(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addPhone} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                            <Plus className="w-4 h-4" /> Adicionar telefone
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {loading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default SupplierModal;
