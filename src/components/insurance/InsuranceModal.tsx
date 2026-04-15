import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useInsuranceRecords } from "../../hooks/useInsuranceRecords";
import type { InsuranceRecord, Vehicle } from "../../types";

interface Props { open: boolean; onClose: () => void; editingRecord?: InsuranceRecord | null; vehicles: Vehicle[]; }

function InsuranceModal({ open, onClose, editingRecord, vehicles }: Props) {
    const { addRecord, updateRecord } = useInsuranceRecords();
    const [vehicleId, setVehicleId] = useState("");
    const [broker, setBroker] = useState("");
    const [insuranceType, setInsuranceType] = useState("");
    const [expirationDate, setExpirationDate] = useState("");
    const [insurer, setInsurer] = useState("");
    const [policyNumber, setPolicyNumber] = useState("");
    const [valueBrl, setValueBrl] = useState(0);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setVehicleId(editingRecord.vehicle_id); setBroker(editingRecord.broker || "");
            setInsuranceType(editingRecord.insurance_type || ""); setExpirationDate(editingRecord.expiration_date || "");
            setInsurer(editingRecord.insurer || ""); setPolicyNumber(editingRecord.policy_number || "");
            setValueBrl(editingRecord.value_brl || 0); setNotes(editingRecord.notes || "");
        } else {
            setVehicleId(vehicles.length > 0 ? vehicles[0].id : ""); setBroker(""); setInsuranceType("");
            setExpirationDate(""); setInsurer(""); setPolicyNumber(""); setValueBrl(0); setNotes("");
        }
        setError(null);
    }, [editingRecord, open, vehicles]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!vehicleId) { setError("Selecione um veículo"); return; }
        setLoading(true);
        try {
            const data = { vehicle_id: vehicleId, broker: broker || undefined, insurance_type: insuranceType || undefined, expiration_date: expirationDate || undefined, insurer: insurer || undefined, policy_number: policyNumber || undefined, value_brl: valueBrl || undefined, notes: notes || undefined, tenant_id: "" };
            if (editingRecord) await updateRecord(editingRecord.id, data);
            else await addRecord(data as any);
            onClose();
        } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar"); }
        finally { setLoading(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{editingRecord ? "Editar" : "Novo"} Seguro</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            <option value="">Selecione</option>
                            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Corretor</label><input type="text" value={broker} onChange={(e) => setBroker(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Seguro</label><input type="text" value={insuranceType} onChange={(e) => setInsuranceType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Completo, Terceiros..." /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Seguradora</label><input type="text" value={insurer} onChange={(e) => setInsurer(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nº Apólice</label><input type="text" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label><input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label><input type="number" value={valueBrl || ""} onChange={(e) => setValueBrl(parseFloat(e.target.value) || 0)} step="0.01" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
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
export default InsuranceModal;
