import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Shield, DollarSign, AlertTriangle } from "lucide-react";
import { useInsuranceRecords } from "../hooks/useInsuranceRecords";
import { useVehicles } from "../hooks/useVehicles";
import InsuranceModal from "../components/insurance/InsuranceModal";
import type { InsuranceRecord } from "../types";

export function Insurance() {
    const { records, loading, deleteRecord } = useInsuranceRecords();
    const { vehicles } = useVehicles();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<InsuranceRecord | null>(null);

    const totalCost = useMemo(() => records.reduce((a, r) => a + (r.value_brl || 0), 0), [records]);
    const expiring = useMemo(() => {
        const in30 = new Date(); in30.setDate(in30.getDate() + 30);
        return records.filter((r) => r.expiration_date && new Date(r.expiration_date) <= in30).length;
    }, [records]);
    const getVehicleName = (id: string) => { const v = vehicles.find((v) => v.id === id); return v ? `${v.license_plate} - ${v.model}` : id; };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-900">Seguros</h1><p className="text-gray-500 text-sm">{records.length} apólices</p></div>
                    <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Novo Seguro</button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><Shield className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{records.length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-amber-500" /><div><p className="text-sm text-gray-500">Vencendo em 30 dias</p><p className="text-2xl font-bold text-amber-600">{expiring}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-emerald-500" /><div><p className="text-sm text-gray-500">Custo total</p><p className="text-2xl font-bold">R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></div></div>
                </div>
                {loading ? <p className="text-gray-500 text-center py-12">Carregando...</p> : records.length === 0 ? (
                    <div className="text-center py-12"><Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhuma apólice</p></div>
                ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Veículo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Seguradora</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tipo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Apólice</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Vencimento</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Valor</th><th className="px-4 py-3"></th></tr></thead>
                            <tbody className="divide-y">{records.map((r) => {
                                const isExpiring = r.expiration_date && new Date(r.expiration_date) <= new Date(Date.now() + 30 * 86400000);
                                const isExpired = r.expiration_date && new Date(r.expiration_date) < new Date();
                                return (
                                    <tr key={r.id} className={`hover:bg-gray-50 ${isExpired ? "bg-red-50" : isExpiring ? "bg-amber-50" : ""}`}>
                                        <td className="px-4 py-3 text-sm">{getVehicleName(r.vehicle_id)}</td>
                                        <td className="px-4 py-3 text-sm">{r.insurer || "-"}</td>
                                        <td className="px-4 py-3 text-sm">{r.insurance_type || "-"}</td>
                                        <td className="px-4 py-3 text-sm">{r.policy_number || "-"}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{r.expiration_date ? (<span className={isExpired ? "text-red-600" : isExpiring ? "text-amber-600" : ""}>{new Date(r.expiration_date).toLocaleDateString("pt-BR")}</span>) : "-"}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{r.value_brl ? `R$ ${r.value_brl.toFixed(2)}` : "-"}</td>
                                        <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteRecord(r.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></td>
                                    </tr>
                                )
                            })}</tbody>
                        </table>
                    </div>
                )}
            </main>
            <InsuranceModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editingRecord={editing} vehicles={vehicles} />
        </div>
    );
}
