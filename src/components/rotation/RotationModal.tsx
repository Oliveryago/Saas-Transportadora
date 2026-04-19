import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRotationRecords } from "../../hooks/useRotationRecords";
import type { RotationRecord, Vehicle } from "../../types";

interface Props { open: boolean; onClose: () => void; editingRecord?: RotationRecord | null; vehicles: Vehicle[]; }

function RotationModal({ open, onClose, editingRecord, vehicles }: Props) {
    const { addRecord, updateRecord } = useRotationRecords();
    const [vehicleId, setVehicleId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [currentOdometer, setCurrentOdometer] = useState(0);
    const [nextRotationKm, setNextRotationKm] = useState(0);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setVehicleId(editingRecord.vehicle_id); setDate(editingRecord.date);
            setCurrentOdometer(editingRecord.current_odometer || 0); setNextRotationKm(editingRecord.next_rotation_km || 0);
            setNotes(editingRecord.notes || "");
        } else {
            setVehicleId(vehicles.length > 0 ? vehicles[0].id : ""); setDate(new Date().toISOString().split("T")[0]);
            setCurrentOdometer(0); setNextRotationKm(0); setNotes("");
        }
        setError(null);
    }, [editingRecord, open, vehicles]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!vehicleId) { setError("Selecione um veículo"); return; }
        setLoading(true);
        try {
            const data = { vehicle_id: vehicleId, date, current_odometer: currentOdometer || undefined, next_rotation_km: nextRotationKm || undefined, notes: notes || undefined };
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
                    <h3 className="text-lg font-bold text-gray-900">{editingRecord ? "Editar" : "Novo"} Rodízio</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="">Selecione</option>
                                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hodômetro Atual</label>
                            <input type="number" value={currentOdometer || ""} onChange={(e) => setCurrentOdometer(parseInt(e.target.value) || 0)} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">KM Próximo Rodízio</label>
                            <input type="number" value={nextRotationKm || ""} onChange={(e) => setNextRotationKm(parseInt(e.target.value) || 0)} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
export default RotationModal;
