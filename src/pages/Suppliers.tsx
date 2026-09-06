import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Building2, MapPin, Phone } from "lucide-react";
import { useSuppliers } from "../hooks/useSuppliers";
import SupplierModal from "../components/suppliers/SupplierModal";
import { PlanLockBanner, PlanWriteButton } from "../components/shared/PlanWriteButton";
import { usePlanAccess } from "../hooks/usePlanAccess";
import type { Supplier, SupplierType } from "../types";
import { SUPPLIER_TYPE_LABELS } from "../types";

export function Suppliers() {
    const { canWrite } = usePlanAccess("fornecedores");
    const { suppliers, loading, deleteSupplier } = useSuppliers();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [filterType, setFilterType] = useState<string>("all");

    const filtered = useMemo(() => {
        if (filterType === "all") return suppliers;
        return suppliers.filter((s) => s.type === filterType);
    }, [suppliers, filterType]);

    const handleEdit = (s: Supplier) => { if (!canWrite) return; setEditing(s); setModalOpen(true); };
    const handleDelete = async (id: string) => { if (!canWrite) return; if (confirm("Excluir fornecedor?")) await deleteSupplier(id); };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1><p className="text-gray-500 text-sm">{suppliers.length} fornecedores cadastrados</p></div>
                    <PlanWriteButton moduleKey="fornecedores" onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Novo Fornecedor</PlanWriteButton>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-6">
                <PlanLockBanner moduleKey="fornecedores" />
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 rounded-full text-sm ${filterType === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}`}>Todos</button>
                    {(Object.entries(SUPPLIER_TYPE_LABELS) as [SupplierType, string][]).map(([k, l]) => (
                        <button key={k} onClick={() => setFilterType(k)} className={`px-3 py-1.5 rounded-full text-sm ${filterType === k ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}`}>{l}</button>
                    ))}
                </div>
                {loading ? <p className="text-gray-500 text-center py-12">Carregando...</p> : filtered.length === 0 ? (
                    <div className="text-center py-12"><Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum fornecedor encontrado</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((s) => (
                            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{SUPPLIER_TYPE_LABELS[s.type as SupplierType] || s.type}</span>
                                        <h3 className="font-semibold text-gray-900 mt-2">{s.company_name}</h3>
                                        {s.cnpj && <p className="text-xs text-gray-500">{s.cnpj}</p>}
                                    </div>
                                    <div className="flex gap-1">
                                        <PlanWriteButton moduleKey="fornecedores" iconOnly title="Editar" onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></PlanWriteButton>
                                        <PlanWriteButton moduleKey="fornecedores" iconOnly title="Excluir" onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></PlanWriteButton>
                                    </div>
                                </div>
                                {(s.city || s.uf) && <p className="text-sm text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" />{[s.street, s.number, s.city, s.uf].filter(Boolean).join(", ")}</p>}
                                {s.phones?.length > 0 && s.phones[0] && <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{s.phones[0]}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </main>
            {canWrite && <SupplierModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editingRecord={editing} />}
        </div>
    );
}
