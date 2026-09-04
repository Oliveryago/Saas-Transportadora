import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useMaintenanceRecords } from "../../hooks/useMaintenanceRecords";
import { useVehicles } from "../../hooks/useVehicles";
import { useImplements } from "../../hooks/useImplements";
import { useEstoque } from "../../hooks/useEstoque";
import type { MaintenanceRecord } from "../../types";
import { getLocalDateString } from "../../lib/utils/date";
import { formatBRL } from "../../lib/utils/money";
import { supabase } from "../../lib/supabase";
import {
  PecasManutencaoFields,
  emptyPecaLinha,
  linhasFromParts,
  partsTotal,
  toMaintenanceParts,
  validatePecaLinhas,
  type PecaLinha,
} from "./PecasManutencaoFields";

interface MaintenanceModalProps {
    open: boolean;
    onClose: () => void;
    editingRecord?: MaintenanceRecord | null;
}

function MaintenanceModal({ open, onClose, editingRecord }: MaintenanceModalProps) {
    const { addRecord, updateRecord } = useMaintenanceRecords();
    const { vehicles } = useVehicles();
    const { implements: implements_ } = useImplements();
    const { itens, registrarSaida } = useEstoque();

    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [km, setKm] = useState(0);
    const [date, setDate] = useState(getLocalDateString());
    const [vehicleId, setVehicleId] = useState("");
    const [implementId, setImplementId] = useState("");
    const [lines, setLines] = useState<PecaLinha[]>([emptyPecaLinha()]);
    const [alreadyDeducted, setAlreadyDeducted] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setType(editingRecord.type);
            setDescription(editingRecord.description || "");
            setKm(editingRecord.km || 0);
            setDate(editingRecord.date);
            setVehicleId(editingRecord.vehicle_id || "");
            setImplementId(editingRecord.implement_id || "");
            setLines(linhasFromParts(editingRecord.parts));
        } else {
            setType("");
            setDescription("");
            setKm(0);
            setDate(getLocalDateString());
            setVehicleId("");
            setImplementId("");
            setLines([emptyPecaLinha()]);
        }
        setAlreadyDeducted(new Map());
        setError(null);
    }, [editingRecord, open]);

    useEffect(() => {
        if (!open || !editingRecord?.id) return;
        let cancelled = false;
        supabase
            .from("manutencao_itens")
            .select("item_id, quantidade")
            .eq("maintenance_id", editingRecord.id)
            .then(({ data }) => {
                if (cancelled) return;
                const deducted = new Map<string, number>();
                for (const row of data || []) {
                    deducted.set(row.item_id, (deducted.get(row.item_id) || 0) + Number(row.quantidade || 0));
                }
                setAlreadyDeducted(deducted);
            });
        return () => { cancelled = true; };
    }, [editingRecord?.id, open]);

    const totalManutencao = partsTotal(lines);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const validationError = validatePecaLinhas(lines, itens, alreadyDeducted);
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        const parts = toMaintenanceParts(lines);
        const remainingDeducted = new Map(alreadyDeducted);

        try {
            const data = {
                type,
                description: description || undefined,
                value_brl: totalManutencao,
                km: km || undefined,
                date,
                vehicle_id: vehicleId || undefined,
                implement_id: implementId || undefined,
                parts,
            };

            let savedId: string | undefined;
            if (editingRecord) {
                const updated = await updateRecord(editingRecord.id, data);
                savedId = updated?.id ?? editingRecord.id;
            } else {
                const created = await addRecord(data as Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">);
                savedId = created?.id;
            }

            for (const part of parts) {
                if (part.origin !== "estoque" || !part.item_id || !savedId) continue;
                const qty = Number(part.quantity) || 0;
                const already = remainingDeducted.get(part.item_id) || 0;
                const delta = qty - already;
                if (delta > 0) {
                    await registrarSaida({
                        itemId: part.item_id,
                        quantidade: delta,
                        caminhaoId: vehicleId || undefined,
                        manutencaoId: savedId,
                        observacao: "Baixa automatica via manutencao",
                    });
                }
                remainingDeducted.set(part.item_id, Math.max(0, already - qty));
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">

                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingRecord ? "Editar Manutenção" : "Nova Manutenção"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
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

                    <PecasManutencaoFields
                        lines={lines}
                        onChange={setLines}
                        itens={itens}
                        alreadyDeducted={alreadyDeducted}
                    />

                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-3">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
                        )}
                        <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-xs font-medium text-orange-800 uppercase tracking-wide">Valor total da manutenção</p>
                                <p className="text-[11px] text-orange-700">Soma automática das peças (estoque + avulsas)</p>
                            </div>
                            <p className="text-2xl font-bold text-orange-700">{formatBRL(totalManutencao)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {loading ? "Salvando..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default MaintenanceModal;
