import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useOilChangeAlerts } from "../../hooks/useOilChangeAlerts";
import { useVehicles } from "../../hooks/useVehicles";
import type { OilChangeAlert } from "../../types";

interface OilChangeModalProps {
    open: boolean;
    onClose: () => void;
    editingAlert?: OilChangeAlert | null;
}

function OilChangeModal({ open, onClose, editingAlert }: OilChangeModalProps) {
    const { addAlert, updateAlert } = useOilChangeAlerts();
    const { vehicles } = useVehicles();

    const [vehicleId, setVehicleId] = useState("");
    const [alertType, setAlertType] = useState<"km" | "date" | "both">("km");
    const [kmInterval, setKmInterval] = useState(15000);
    const [daysInterval, setDaysInterval] = useState(180);
    const [lastChangeKm, setLastChangeKm] = useState(0);
    const [lastChangeDate, setLastChangeDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingAlert) {
            setVehicleId(editingAlert.vehicle_id);
            setAlertType(editingAlert.alert_type);
            setKmInterval(editingAlert.km_interval || 15000);
            setDaysInterval(editingAlert.days_interval || 180);
            setLastChangeKm(editingAlert.last_change_km || 0);
            setLastChangeDate(editingAlert.last_change_date || new Date().toISOString().split("T")[0]);
        } else {
            setVehicleId(vehicles.length > 0 ? vehicles[0].id : "");
            setAlertType("km");
            setKmInterval(15000);
            setDaysInterval(180);
            setLastChangeKm(0);
            setLastChangeDate(new Date().toISOString().split("T")[0]);
        }
        setError(null);
    }, [editingAlert, vehicles, open]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!vehicleId) { setError("Selecione um veículo"); return; }
        setLoading(true);

        try {
            const data = {
                vehicle_id: vehicleId,
                alert_type: alertType,
                km_interval: (alertType === "km" || alertType === "both") ? kmInterval : undefined,
                days_interval: (alertType === "date" || alertType === "both") ? daysInterval : undefined,
                last_change_km: lastChangeKm || undefined,
                last_change_date: lastChangeDate || undefined,
                alert_status: "active" as const,
            };

            if (editingAlert) {
                await updateAlert(editingAlert.id, data);
            } else {
                await addAlert(data as any);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao salvar");
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingAlert ? "Editar Troca de Óleo" : "Nova Troca de Óleo"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                        <select
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Selecione um veículo</option>
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Alerta</label>
                        <select
                            value={alertType}
                            onChange={(e) => setAlertType(e.target.value as "km" | "date" | "both")}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="km">Por Quilometragem</option>
                            <option value="date">Por Data</option>
                            <option value="both">Ambos</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">KM da Última Troca</label>
                            <input
                                type="number"
                                value={lastChangeKm}
                                onChange={(e) => setLastChangeKm(parseInt(e.target.value))}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Última Troca</label>
                            <input
                                type="date"
                                value={lastChangeDate}
                                onChange={(e) => setLastChangeDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {(alertType === "km" || alertType === "both") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Intervalo de KM para Troca
                            </label>
                            <input
                                type="number"
                                value={kmInterval}
                                onChange={(e) => setKmInterval(parseInt(e.target.value))}
                                min="1000"
                                step="1000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: 15000"
                            />
                            <p className="text-xs text-gray-500 mt-1">Alerta 1.000 km antes</p>
                        </div>
                    )}

                    {(alertType === "date" || alertType === "both") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Intervalo em Dias
                            </label>
                            <input
                                type="number"
                                value={daysInterval}
                                onChange={(e) => setDaysInterval(parseInt(e.target.value))}
                                min="30"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: 180"
                            />
                            <p className="text-xs text-gray-500 mt-1">Alerta 7 dias antes</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {loading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default OilChangeModal;
