import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMaintenanceRecords } from "../hooks/useMaintenanceRecords";
import { useVehicles } from "../hooks/useVehicles";
import { useAuth } from "../contexts/AuthContext";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { Plus, ArrowLeft, LogOut, Trash2, Edit2, Wrench, FileText, Loader2 } from "lucide-react";
import { generateMaintenanceOS } from "../services/documentGenerator";
import { urlToDataURL } from "../services/companySettingsHelper";
import MaintenanceModal from "../components/maintenance/MaintenanceModal";
import VehicleFilter from "../components/shared/VehicleFilter";
import { formatLocalDate, parseLocalDate } from "../lib/utils/date";

export function Maintenance() {
    const { user, signOut, tenant } = useAuth();
    const { settings: companySettings } = useCompanySettings();
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const { records, deleteRecord, refetch } = useMaintenanceRecords(selectedVehicleId);
    const { vehicles } = useVehicles();
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    const getVehicleName = (id?: string) => {
        if (!id) return "-";
        const v = vehicles.find((v) => v.id === id);
        return v ? `${v.license_plate} - ${v.model}` : "-";
    };

    const typeLabels: Record<string, string> = {
        preventiva: "Preventiva", corretiva: "Corretiva", pneus: "Pneus",
        eletrica: "Elétrica", freios: "Freios", suspensao: "Suspensão",
        motor: "Motor", cambio: "Câmbio", outro: "Outro",
    };

    const totalGasto = records.reduce((sum, r) => sum + Number(r.value_brl || 0), 0);
    const thisMonth = records.filter((r) => {
        const parsed = parseLocalDate(r.date);
        if (!parsed) return false;
        const now = new Date();
        return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
    });

    function handleModalClose() {
        setModalOpen(false);
        setEditingRecord(null);
        refetch();
    }

    const [generatingOS, setGeneratingOS] = useState<string | null>(null);

    async function handleGenerateOS(record: any) {
        setGeneratingOS(record.id);
        const v = vehicles.find(v => v.id === record.vehicle_id);
        if (!v) {
            setGeneratingOS(null);
            return;
        }

        try {
            const logoDataUrl = companySettings?.logo_url
                ? await urlToDataURL(companySettings.logo_url)
                : null;
            await generateMaintenanceOS({
                id: record.id,
                vehiclePlate: v.license_plate,
                vehicleModel: v.model,
                date: record.date,
                type: typeLabels[record.type] || record.type,
                description: record.description || "",
                parts: record.parts || [],
                totalValue: record.value_brl || 0,
                tenantName: tenant?.name,
                company: { settings: companySettings, logoDataUrl },
            });
        } catch (error) {
            console.error("Failed to generate OS:", error);
            alert("Erro ao gerar Ordem de Serviço. Verifique o console.");
        } finally {
            setGeneratingOS(null);
        }
    }

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
                                <Wrench className="w-5 h-5 text-orange-600" />
                                <h1 className="text-xl font-bold text-gray-900">Manutenção</h1>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <VehicleFilter 
                                value={selectedVehicleId} 
                                onChange={setSelectedVehicleId} 
                            />
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500">{tenant?.name}</p>
                            </div>
                            <button onClick={() => signOut()} className="text-gray-700 hover:text-gray-900 transition-colors">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Total de Manutenções</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{records.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Manutenções Este Mês</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{thisMonth.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm">Gasto Total</p>
                        <p className="text-3xl font-bold text-orange-600 mt-2">
                            R$ {totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => { setEditingRecord(null); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 mb-6"
                >
                    <Plus className="w-5 h-5" />
                    Nova Manutenção
                </button>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {records.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Veículo</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Descrição</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Valor (R$)</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {records.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {formatLocalDate(record.date)}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                                    {typeLabels[record.type] || record.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{getVehicleName(record.vehicle_id)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{record.description || "-"}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                {record.value_brl ? `R$ ${Number(record.value_brl).toFixed(2)}` : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleGenerateOS(record)}
                                                        disabled={generatingOS === record.id}
                                                        className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                                        title="Gerar Ordem de Serviço (PDF)"
                                                    >
                                                        {generatingOS === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingRecord(record as any); setModalOpen(true); }}
                                                        className="text-blue-600 hover:text-blue-700"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteRecord(record.id)} className="text-red-600 hover:text-red-700" title="Excluir">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-12">
                            <Wrench className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <p>Nenhuma manutenção registrada ainda</p>
                        </div>
                    )}
                </div>

                <MaintenanceModal
                    open={modalOpen}
                    onClose={handleModalClose}
                    editingRecord={editingRecord}
                />
            </main>
        </div>
    );
}

export default Maintenance;
