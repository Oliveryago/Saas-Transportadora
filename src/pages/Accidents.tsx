import { useState } from "react";
import { Plus, Edit2, Trash2, AlertOctagon, Calendar, MapPin } from "lucide-react";
import { useAccidentRecords } from "../hooks/useAccidentRecords";
import { useVehicles } from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import AccidentModal from "../components/accidents/AccidentModal";
import { PlanLockBanner, PlanWriteButton } from "../components/shared/PlanWriteButton";
import { usePlanAccess } from "../hooks/usePlanAccess";
import type { AccidentRecord } from "../types";
import VehicleFilter from "../components/shared/VehicleFilter";
import { DateFilterPicker } from "../components/shared/DateFilter";
import { useDateFilter } from "../hooks/useDateFilter";
import { formatLocalDate, parseLocalDate } from "../lib/utils/date";

export function Accidents() {
    const { canWrite } = usePlanAccess("acidentes");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter();
    const { records, loading, deleteRecord } = useAccidentRecords(selectedVehicleId, dateFilter);
    const { vehicles } = useVehicles();
    const { drivers } = useDrivers();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AccidentRecord | null>(null);

    const getVehicleName = (id: string) => { const v = vehicles.find((v) => v.id === id); return v ? `${v.license_plate} - ${v.model}` : id; };
    const getDriverName = (id?: string) => { if (!id) return "-"; const d = drivers.find((d) => d.id === id); return d?.nome_completo || id; };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-900">Sinistros</h1><p className="text-gray-500 text-sm">{records.length} registros</p></div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <VehicleFilter value={selectedVehicleId} onChange={setSelectedVehicleId} />
                        <DateFilterPicker value={dateFilter} onChange={setDateFilter} />
                        <PlanWriteButton moduleKey="acidentes" onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 tracking-tight"><Plus className="w-4 h-4" /> Novo Sinistro</PlanWriteButton>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-6">
                <PlanLockBanner moduleKey="acidentes" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><AlertOctagon className="w-8 h-8 text-red-500" /><div><p className="text-sm text-gray-500">Total sinistros</p><p className="text-2xl font-bold">{records.length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><Calendar className="w-8 h-8 text-purple-500" /><div><p className="text-sm text-gray-500">Este ano</p><p className="text-2xl font-bold">{records.filter(r => { const d = parseLocalDate(r.date); return d && d.getFullYear() === new Date().getFullYear(); }).length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><MapPin className="w-8 h-8 text-amber-500" /><div><p className="text-sm text-gray-500">Estados</p><p className="text-2xl font-bold">{new Set(records.map(r => r.uf).filter(Boolean)).size}</p></div></div></div>
                </div>
                {loading ? <p className="text-gray-500 text-center py-12">Carregando...</p> : records.length === 0 ? (
                    <div className="text-center py-12"><AlertOctagon className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum sinistro registrado</p></div>
                ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Data</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Veículo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Motorista</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Local</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Nº BO</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Descrição</th><th className="px-4 py-3"></th></tr></thead>
                            <tbody className="divide-y">{records.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{formatLocalDate(r.date)}</td>
                                    <td className="px-4 py-3 text-sm">{getVehicleName(r.vehicle_id)}</td>
                                    <td className="px-4 py-3 text-sm">{getDriverName(r.driver_id)}</td>
                                    <td className="px-4 py-3 text-sm">{[r.city, r.uf].filter(Boolean).join(" - ") || "-"}</td>
                                    <td className="px-4 py-3 text-sm">{r.report_number || "-"}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]">{r.description || "-"}</td>
                                    <td className="px-4 py-3"><div className="flex gap-1 justify-end"><PlanWriteButton moduleKey="acidentes" iconOnly title="Editar" onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></PlanWriteButton><PlanWriteButton moduleKey="acidentes" iconOnly title="Excluir" onClick={() => deleteRecord(r.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></PlanWriteButton></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </main>
            {canWrite && <AccidentModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editingRecord={editing} vehicles={vehicles} drivers={drivers} />}
        </div>
    );
}
