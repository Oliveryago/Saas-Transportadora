import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Milestone, DollarSign, MapPin } from "lucide-react";
import { useTollRecords } from "../hooks/useTollRecords";
import { useVehicles } from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import TollModal from "../components/tolls/TollModal";
import type { TollRecord } from "../types";
import VehicleFilter from "../components/shared/VehicleFilter";

export function Tolls() {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const { records, loading, deleteRecord } = useTollRecords(selectedVehicleId);
    const { vehicles } = useVehicles();
    const { drivers } = useDrivers();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TollRecord | null>(null);

    const totalCost = useMemo(() => records.reduce((a, r) => a + (r.value_brl || 0), 0), [records]);
    const getVehicleName = (id: string) => { const v = vehicles.find((v) => v.id === id); return v ? `${v.license_plate}` : id; };
    const getDriverName = (id?: string) => { if (!id) return "-"; const d = drivers.find((d) => d.id === id); return d?.nome_completo || id; };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-900">Pedágios</h1><p className="text-gray-500 text-sm">{records.length} registros</p></div>
                    <div className="flex items-center gap-4">
                        <VehicleFilter value={selectedVehicleId} onChange={setSelectedVehicleId} />
                        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 tracking-tight"><Plus className="w-4 h-4" /> Novo Pedágio</button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><Milestone className="w-8 h-8 text-amber-500" /><div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{records.length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><MapPin className="w-8 h-8 text-purple-500" /><div><p className="text-sm text-gray-500">Cidades</p><p className="text-2xl font-bold">{new Set(records.map((r) => r.city).filter(Boolean)).size}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-emerald-500" /><div><p className="text-sm text-gray-500">Custo total</p><p className="text-2xl font-bold">R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></div></div>
                </div>
                {loading ? <p className="text-gray-500 text-center py-12">Carregando...</p> : records.length === 0 ? (
                    <div className="text-center py-12"><Milestone className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum registro</p></div>
                ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Veículo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Motorista</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">UF/Cidade</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Viagem</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Data</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Valor</th><th className="px-4 py-3"></th></tr></thead>
                            <tbody className="divide-y">{records.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{getVehicleName(r.vehicle_id)}</td>
                                    <td className="px-4 py-3 text-sm">{getDriverName(r.driver_id)}</td>
                                    <td className="px-4 py-3 text-sm">{[r.uf, r.city].filter(Boolean).join(" - ") || "-"}</td>
                                    <td className="px-4 py-3 text-sm">{r.trip || "-"}</td>
                                    <td className="px-4 py-3 text-sm">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                                    <td className="px-4 py-3 text-sm font-medium">{r.value_brl ? `R$ ${r.value_brl.toFixed(2)}` : "-"}</td>
                                    <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteRecord(r.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </main>
            <TollModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editingRecord={editing} vehicles={vehicles} drivers={drivers} />
        </div>
    );
}
