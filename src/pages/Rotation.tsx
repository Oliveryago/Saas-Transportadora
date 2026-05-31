import { useState } from "react";
import { Plus, Edit2, Trash2, RotateCcw, Gauge } from "lucide-react";
import { useRotationRecords } from "../hooks/useRotationRecords";
import { useVehicles } from "../hooks/useVehicles";
import RotationModal from "../components/rotation/RotationModal";
import type { RotationRecord } from "../types";
import { formatLocalDate } from "../lib/utils/date";

export function Rotation() {
    const { records, loading, deleteRecord } = useRotationRecords();
    const { vehicles } = useVehicles();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<RotationRecord | null>(null);

    const getVehicleName = (id: string) => { const v = vehicles.find((v) => v.id === id); return v ? `${v.license_plate} - ${v.model}` : id; };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-900">Rodízio</h1><p className="text-gray-500 text-sm">{records.length} registros</p></div>
                    <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Novo Rodízio</button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><RotateCcw className="w-8 h-8 text-indigo-500" /><div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{records.length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><Gauge className="w-8 h-8 text-orange-500" /><div><p className="text-sm text-gray-500">Veículos com rodízio</p><p className="text-2xl font-bold">{new Set(records.map((r) => r.vehicle_id)).size}</p></div></div></div>
                </div>
                {loading ? <p className="text-gray-500 text-center py-12">Carregando...</p> : records.length === 0 ? (
                    <div className="text-center py-12"><RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum registro</p></div>
                ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Veículo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Data</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Hodômetro</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Próx. Rodízio KM</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Obs</th><th className="px-4 py-3"></th></tr></thead>
                            <tbody className="divide-y">{records.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{getVehicleName(r.vehicle_id)}</td>
                                    <td className="px-4 py-3 text-sm">{formatLocalDate(r.date)}</td>
                                    <td className="px-4 py-3 text-sm">{r.current_odometer ? r.current_odometer.toLocaleString("pt-BR") : "-"}</td>
                                    <td className="px-4 py-3 text-sm font-medium">{r.next_rotation_km ? r.next_rotation_km.toLocaleString("pt-BR") : "-"}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]">{r.notes || "-"}</td>
                                    <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteRecord(r.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </main>
            <RotationModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editingRecord={editing} vehicles={vehicles} />
        </div>
    );
}
