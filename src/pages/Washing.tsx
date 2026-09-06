import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Droplets, DollarSign, Calendar } from "lucide-react";
import { useWashingRecords } from "../hooks/useWashingRecords";
import { useVehicles } from "../hooks/useVehicles";
import { useDrivers } from "../hooks/useDrivers";
import WashingModal from "../components/washing/WashingModal";
import { PlanLockBanner, PlanWriteButton } from "../components/shared/PlanWriteButton";
import { usePlanAccess } from "../hooks/usePlanAccess";
import type { WashingRecord, VehicleWashType } from "../types";
import { VEHICLE_WASH_TYPE_LABELS } from "../types";
import VehicleFilter from "../components/shared/VehicleFilter";
import { DateFilterPicker } from "../components/shared/DateFilter";
import { useDateFilter } from "../hooks/useDateFilter";
import { formatLocalDate, parseLocalDate } from "../lib/utils/date";

export function Washing() {
    const { canWrite } = usePlanAccess("lavagem");
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter();
    const { records, loading, deleteRecord } = useWashingRecords(selectedVehicleId, dateFilter);
    const { vehicles } = useVehicles();
    const { drivers } = useDrivers();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<WashingRecord | null>(null);

    const totalCost = useMemo(() => records.reduce((a, r) => a + (r.value_brl || 0), 0), [records]);
    const getVehicleName = (id: string) => { const v = vehicles.find((v) => v.id === id); return v ? `${v.license_plate}` : id; };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold text-gray-900">Lavação</h1><p className="text-gray-500 text-sm">{records.length} registros</p></div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <VehicleFilter value={selectedVehicleId} onChange={setSelectedVehicleId} />
                        <DateFilterPicker value={dateFilter} onChange={setDateFilter} />
                        <PlanWriteButton moduleKey="lavagem" onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 tracking-tight"><Plus className="w-4 h-4" /> Nova Lavação</PlanWriteButton>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-6">
                <PlanLockBanner moduleKey="lavagem" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><Droplets className="w-8 h-8 text-cyan-500" /><div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{records.length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><Calendar className="w-8 h-8 text-purple-500" /><div><p className="text-sm text-gray-500">Este mês</p><p className="text-2xl font-bold">{records.filter(r => { const d = parseLocalDate(r.date); return d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); }).length}</p></div></div></div>
                    <div className="bg-white rounded-xl p-5 border"><div className="flex items-center gap-3"><DollarSign className="w-8 h-8 text-emerald-500" /><div><p className="text-sm text-gray-500">Custo total</p><p className="text-2xl font-bold">R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></div></div>
                </div>
                {loading ? <p className="text-gray-500 text-center py-12">Carregando...</p> : records.length === 0 ? (
                    <div className="text-center py-12"><Droplets className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Nenhum registro</p></div>
                ) : (
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Veículo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tipo</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Lavajato</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Data</th><th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Valor</th><th className="px-4 py-3"></th></tr></thead>
                            <tbody className="divide-y">{records.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{getVehicleName(r.vehicle_id)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {r.services && r.services.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {r.services.map((s, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs">
                                                        {VEHICLE_WASH_TYPE_LABELS[s.type as VehicleWashType] || s.type}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs">
                                                {VEHICLE_WASH_TYPE_LABELS[r.vehicle_type as VehicleWashType] || r.vehicle_type || "-"}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{r.wash_place || "-"}</td>
                                    <td className="px-4 py-3 text-sm">{formatLocalDate(r.date)}</td>
                                    <td className="px-4 py-3 text-sm font-medium">{r.value_brl ? `R$ ${r.value_brl.toFixed(2)}` : "-"}</td>
                                    <td className="px-4 py-3"><div className="flex gap-1 justify-end"><PlanWriteButton moduleKey="lavagem" iconOnly title="Editar" onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></PlanWriteButton><PlanWriteButton moduleKey="lavagem" iconOnly title="Excluir" onClick={() => deleteRecord(r.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></PlanWriteButton></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </main>
            {canWrite && <WashingModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editingRecord={editing} vehicles={vehicles} drivers={drivers} />}
        </div>
    );
}
