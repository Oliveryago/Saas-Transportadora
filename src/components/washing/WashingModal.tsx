import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useWashingRecords } from "../../hooks/useWashingRecords";
import { useSuppliers } from "../../hooks/useSuppliers";
import type { WashingRecord, Vehicle, User, VehicleWashType, Driver } from "../../types";
import { VEHICLE_WASH_TYPE_LABELS } from "../../types";

interface Props { open: boolean; onClose: () => void; editingRecord?: WashingRecord | null; vehicles: Vehicle[]; drivers: Driver[]; }

function WashingModal({ open, onClose, editingRecord, vehicles, drivers }: Props) {
    const { addRecord, updateRecord } = useWashingRecords();
    const { suppliers } = useSuppliers();
    const [vehicleId, setVehicleId] = useState("");
    const [driverId, setDriverId] = useState("");
    const [washPlace, setWashPlace] = useState("");
    const [vehicleType, setVehicleType] = useState<VehicleWashType>("cavalo");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [valueBrl, setValueBrl] = useState(0);
    const [notes, setNotes] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lavajatoSuppliers = suppliers.filter((s) => s.type === "lavajato");
    const filtered = lavajatoSuppliers.filter((s) => s.company_name.toLowerCase().includes(washPlace.toLowerCase()));

    useEffect(() => {
        if (editingRecord) {
            setVehicleId(editingRecord.vehicle_id); setDriverId(editingRecord.driver_id || "");
            setWashPlace(editingRecord.wash_place || ""); setVehicleType(editingRecord.vehicle_type || "cavalo");
            setDate(editingRecord.date); setValueBrl(editingRecord.value_brl || 0); setNotes(editingRecord.notes || "");
        } else {
            setVehicleId(vehicles.length > 0 ? vehicles[0].id : ""); setDriverId(""); setWashPlace("");
            setVehicleType("cavalo"); setDate(new Date().toISOString().split("T")[0]); setValueBrl(0); setNotes("");
        }
        setError(null);
    }, [editingRecord, open, vehicles]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!vehicleId) { setError("Selecione um veículo"); return; }
        setLoading(true);
        try {
            const data = { vehicle_id: vehicleId, driver_id: driverId || undefined, wash_place: washPlace || undefined, vehicle_type: vehicleType, date, value_brl: valueBrl || undefined, notes: notes || undefined };
            if (editingRecord) await updateRecord(editingRecord.id, data);
            else await addRecord(data as any);
            onClose();
        } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar"); }
        finally { setLoading(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{editingRecord ? "Editar" : "Nova"} Lavação</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            <option value="">Selecione</option>
                            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Veículo</label>
                        <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleWashType)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {(Object.entries(VEHICLE_WASH_TYPE_LABELS) as [VehicleWashType, string][]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                        <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Selecione</option>
                            {drivers.map((d) => <option key={d.id} value={d.id}>{d.nome_completo}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lavajato</label>
                        <input type="text" value={washPlace} onChange={(e) => { setWashPlace(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Digite ou selecione..." />
                        {showSuggestions && washPlace && filtered.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {filtered.map((s) => (
                                    <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); setWashPlace(s.company_name); setShowSuggestions(false); }}
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700">{s.company_name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                            <input type="number" value={valueBrl || ""} onChange={(e) => setValueBrl(parseFloat(e.target.value) || 0)} step="0.01" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? "Salvando..." : "Salvar"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default WashingModal;
