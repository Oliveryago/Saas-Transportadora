import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOilChangeAlerts } from "../hooks/useOilChangeAlerts";
import { useVehicles } from "../hooks/useVehicles";
import { useFuelRecords } from "../hooks/useFuelRecords";
import { useAuth } from "../contexts/AuthContext";
import { Plus, ArrowLeft, LogOut, Trash2, Edit2, Droplets, AlertTriangle, Bell, Settings } from "lucide-react";
import OilChangeModal from "../components/oilchange/OilChangeModal";
import { OIL_TYPE_LABELS } from "../types";

export function OilChange() {
    const { user, signOut } = useAuth();
    const { alerts, deleteAlert, getPendingAlerts } = useOilChangeAlerts();
    const { vehicles } = useVehicles();
    const { getLatestKmByVehicle } = useFuelRecords();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAlert, setEditingAlert] = useState(null);

    const kmMap = getLatestKmByVehicle();
    const pending = getPendingAlerts(vehicles, kmMap);

    const getVehicleName = (id: string) => {
        const v = vehicles.find((v) => v.id === id);
        return v ? `${v.license_plate} - ${v.model}` : "Veículo desconhecido";
    };

    const getStatus = (alert: any) => {
        const isPending = pending.some((p) => p.id === alert.id);
        if (isPending) return { label: "⚠️ Trocar Agora", color: "bg-red-100 text-red-800" };
        if (alert.alert_status === "inactive") return { label: "Inativo", color: "bg-gray-100 text-gray-600" };
        return { label: "✅ OK", color: "bg-green-100 text-green-800" };
    };

    const getNextChange = (alert: any) => {
        const vehicle = vehicles.find((v) => v.id === alert.vehicle_id);
        const parts = [];

        // Use the provided KM (from fuel records) if available, otherwise fallback to vehicle.current_km
        const currentKm = kmMap.get(alert.vehicle_id) ?? vehicle?.current_km ?? 0;

        if ((alert.alert_type === "km" || alert.alert_type === "both") && alert.last_change_km && alert.km_interval) {
            const nextKm = alert.last_change_km + alert.km_interval;
            const remaining = nextKm - currentKm;
            parts.push(`${remaining > 0 ? remaining.toLocaleString("pt-BR") : 0} km restantes`);
        }

        if ((alert.alert_type === "date" || alert.alert_type === "both") && alert.last_change_date && alert.days_interval) {
            const nextDate = new Date(new Date(alert.last_change_date).getTime() + alert.days_interval * 86400000);
            parts.push(`até ${nextDate.toLocaleDateString("pt-BR")}`);
        }

        return parts.join(" | ") || "-";
    };

    const getCurrentKmLabel = (vehicleId: string) => {
        const km = kmMap.get(vehicleId);
        if (km) return `${km.toLocaleString("pt-BR")} km (Abastecimento)`;
        const v = vehicles.find(v => v.id === vehicleId);
        return v ? `${v.current_km.toLocaleString("pt-BR")} km (Frota)` : "-";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate("/")} className="text-gray-600 hover:text-gray-900">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Droplets className="w-5 h-5 text-amber-600" />
                                <h1 className="text-xl font-bold text-gray-900">Troca de Óleo</h1>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                            <button onClick={() => signOut()} className="text-gray-700 hover:text-gray-900">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Alert banner */}
                {pending.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-red-800">
                                {pending.length} veículo{pending.length > 1 ? "s" : ""} precisa{pending.length > 1 ? "m" : ""} de troca de óleo!
                            </p>
                            <p className="text-sm text-red-600">
                                {pending.map((p) => getVehicleName(p.vehicle_id)).join(", ")}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total de Alertas</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{alerts.length}</p>
                            </div>
                            <Bell className="w-8 h-8 text-amber-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Alertas Ativos</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {alerts.filter((a) => a.alert_status === "active").length}
                                </p>
                            </div>
                            <Droplets className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Pendentes</p>
                                <p className="text-3xl font-bold text-red-600 mt-2">{pending.length}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => { setEditingAlert(null); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 mb-6"
                >
                    <Plus className="w-5 h-5" />
                    Nova Troca de Óleo
                </button>

                <div className="grid gap-4">
                    {alerts.map((alert) => {
                        const status = getStatus(alert);
                        return (
                            <div key={alert.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Droplets className="w-6 h-6 text-amber-500" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900">{getVehicleName(alert.vehicle_id)}</h3>
                                                {alert.oil_type && (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500 border border-gray-200 bg-gray-50 px-2 py-0.5 rounded">
                                                        <Settings className="w-3 h-3" />
                                                        {OIL_TYPE_LABELS[alert.oil_type as keyof typeof OIL_TYPE_LABELS]}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditingAlert(alert as any); setModalOpen(true); }}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => deleteAlert(alert.id)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Última Troca (KM)</p>
                                        <p className="font-semibold">{alert.last_change_km ? alert.last_change_km.toLocaleString("pt-BR") : "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">KM Atual</p>
                                        <p className="font-semibold">{getCurrentKmLabel(alert.vehicle_id)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Intervalo</p>
                                        <p className="font-semibold">
                                            {alert.km_interval ? `${alert.km_interval.toLocaleString("pt-BR")} km` : ""}
                                            {alert.km_interval && alert.days_interval ? " / " : ""}
                                            {alert.days_interval ? `${alert.days_interval} dias` : ""}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Próxima Troca</p>
                                        <p className="font-semibold text-amber-700">{getNextChange(alert)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {alerts.length === 0 && (
                        <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">
                            <Droplets className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <p>Nenhuma troca de óleo registrada ainda</p>
                        </div>
                    )}
                </div>

                <OilChangeModal
                    open={modalOpen}
                    onClose={() => { setModalOpen(false); setEditingAlert(null); }}
                    editingAlert={editingAlert}
                />
            </main>
        </div>
    );
}

export default OilChange;
