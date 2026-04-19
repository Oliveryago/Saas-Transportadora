import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useMaintenanceRecords } from "../../hooks/useMaintenanceRecords";
import { useVehicles } from "../../hooks/useVehicles";
import { useImplements } from "../../hooks/useImplements";
import type { MaintenanceRecord } from "../../types";

interface MaintenanceModalProps {
    open: boolean;
    onClose: () => void;
    editingRecord?: MaintenanceRecord | null;
}

function MaintenanceModal({ open, onClose, editingRecord }: MaintenanceModalProps) {
    const { addRecord, updateRecord } = useMaintenanceRecords();
    const { vehicles } = useVehicles();
    const { implements: implements_ } = useImplements();

    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [valueBrl, setValueBrl] = useState(0);
    const [km, setKm] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [vehicleId, setVehicleId] = useState("");
    const [implementId, setImplementId] = useState("");
    const [parts, setParts] = useState<{ name: string; cost?: number }[]>([]);
    const [newPartName, setNewPartName] = useState("");
    const [newPartCost, setNewPartCost] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setType(editingRecord.type);
            setDescription(editingRecord.description || "");
            setValueBrl(editingRecord.value_brl || 0);
            setKm(editingRecord.km || 0);
            setDate(editingRecord.date);
            setVehicleId(editingRecord.vehicle_id || "");
            setImplementId(editingRecord.implement_id || "");
            setParts(editingRecord.parts || []);
        } else {
            setType("");
            setDescription("");
            setValueBrl(0);
            setKm(0);
            setDate(new Date().toISOString().split("T")[0]);
            setVehicleId("");
            setImplementId("");
            setParts([]);
        }
        setError(null);
    }, [editingRecord, open]);

    function addPart() {
        if (!newPartName.trim()) return;
        setParts([...parts, { name: newPartName, cost: newPartCost || undefined }]);
        setNewPartName("");
        setNewPartCost(0);
    }

    function removePart(index: number) {
        setParts(parts.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const data = {
                type,
                description: description || undefined,
                value_brl: valueBrl || undefined,
                km: km || undefined,
                date,
                vehicle_id: vehicleId || undefined,
                implement_id: implementId || undefined,
                parts,
            };

            if (editingRecord) {
                await updateRecord(editingRecord.id, data);
            } else {
                await addRecord(data as any);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingRecord ? "Editar Manutenção" : "Nova Manutenção"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selecione</option>
                                <option value="preventiva">Preventiva</option>
                                <option value="corretiva">Corretiva</option>
                                <option value="pneus">Pneus</option>
                                <option value="eletrica">Elétrica</option>
                                <option value="freios">Freios</option>
                                <option value="suspensao">Suspensão</option>
                                <option value="motor">Motor</option>
                                <option value="cambio">Câmbio</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
                        <select
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Nenhum</option>
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Implemento</label>
                        <select
                            value={implementId}
                            onChange={(e) => setImplementId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Nenhum</option>
                            {implements_.map((i) => (
                                <option key={i.id} value={i.id}>{i.license_plate} - {i.model}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Descreva a manutenção realizada..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                            <input
                                type="number"
                                value={valueBrl}
                                onChange={(e) => setValueBrl(parseFloat(e.target.value))}
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
                            <input
                                type="number"
                                value={km}
                                onChange={(e) => setKm(parseInt(e.target.value))}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Parts section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Peças</label>
                        {parts.length > 0 && (
                            <div className="space-y-1 mb-2">
                                {parts.map((part, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                                        <span>{part.name} {part.cost ? `- R$ ${part.cost.toFixed(2)}` : ""}</span>
                                        <button type="button" onClick={() => removePart(i)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPartName}
                                onChange={(e) => setNewPartName(e.target.value)}
                                placeholder="Nome da peça"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="number"
                                value={newPartCost}
                                onChange={(e) => setNewPartCost(parseFloat(e.target.value))}
                                placeholder="Custo"
                                step="0.01"
                                min="0"
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={addPart}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                            >
                                +
                            </button>
                        </div>
                    </div>

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

export default MaintenanceModal;
