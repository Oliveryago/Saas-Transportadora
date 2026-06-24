import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAccidentRecords } from "../../hooks/useAccidentRecords";
import type { AccidentRecord, Vehicle, Driver } from "../../types";
import { getLocalDateString } from "../../lib/utils/date";

interface Props { open: boolean; onClose: () => void; editingRecord?: AccidentRecord | null; vehicles: Vehicle[]; drivers: Driver[]; }

function AccidentModal({ open, onClose, editingRecord, vehicles, drivers }: Props) {
    const { addRecord, updateRecord } = useAccidentRecords();
    const [vehicleId, setVehicleId] = useState("");
    const [driverId, setDriverId] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(getLocalDateString());
    const [reportNumber, setReportNumber] = useState("");
    const [uf, setUf] = useState("");
    const [city, setCity] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setVehicleId(editingRecord.vehicle_id); setDriverId(editingRecord.driver_id || "");
            setDescription(editingRecord.description || ""); setDate(editingRecord.date);
            setReportNumber(editingRecord.report_number || ""); setUf(editingRecord.uf || "");
            setCity(editingRecord.city || ""); setNotes(editingRecord.notes || "");
        } else {
            setVehicleId(vehicles.length > 0 ? vehicles[0].id : ""); setDriverId("");
            setDescription(""); setDate(getLocalDateString());
            setReportNumber(""); setUf(""); setCity(""); setNotes("");
        }
        setError(null);
    }, [editingRecord, open, vehicles]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!vehicleId) { setError("Selecione um veículo"); return; }
        setLoading(true);
        try {
            const data = { vehicle_id: vehicleId, driver_id: driverId || undefined, description: description || undefined, date, report_number: reportNumber || undefined, uf: uf || undefined, city: city || undefined, notes: notes || undefined };
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
                    <h3 className="text-lg font-bold text-gray-900">{editingRecord ? "Editar" : "Novo"} Sinistro</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label><select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required><option value="">Selecione</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label><select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg"><option value="">Selecione</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.nome_completo}</option>)}</select></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Data *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nº BO</label><input type="text" value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">UF</label><input type="text" value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Observação</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
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
export default AccidentModal;
