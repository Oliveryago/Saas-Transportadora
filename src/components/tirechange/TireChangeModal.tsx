import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTireChanges } from "../../hooks/useTireChanges";
import type { TireChange, Vehicle } from "../../types";
import { getLocalDateString } from "../../lib/utils/date";
import { SeletorOrigemCusto } from "../estoque/SeletorOrigemCusto";
import { VinculoPneuMarcacao } from "./VinculoPneuMarcacao";
import { supabase } from "../../lib/supabase";

interface Props { open: boolean; onClose: () => void; editingRecord?: TireChange | null; vehicles: Vehicle[]; }

function TireChangeModal({ open, onClose, editingRecord, vehicles }: Props) {
    const { addRecord, updateRecord } = useTireChanges();
    const [vehicleId, setVehicleId] = useState("");
    const [brand, setBrand] = useState("");
    const [dimension, setDimension] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [kmAtChange, setKmAtChange] = useState(0);
    const [nextChangeKm, setNextChangeKm] = useState(0);
    const [valorStr, setValorStr] = useState("0");
    const [itemEstoqueSelecionado, setItemEstoqueSelecionado] = useState<string | null>(null);
    const [quantidadeEstoque, setQuantidadeEstoque] = useState(0);
    const [hasDiscount, setHasDiscount] = useState(false);
    const [discountValue, setDiscountValue] = useState(0);
    const [date, setDate] = useState(getLocalDateString());
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRecord) {
            setVehicleId(editingRecord.vehicle_id); setBrand(editingRecord.brand || ""); setDimension(editingRecord.dimension || "");
            setQuantity(editingRecord.quantity || 1); setKmAtChange(editingRecord.km_at_change || 0);
            setNextChangeKm(editingRecord.next_change_km || 0); setValorStr(String(editingRecord.value_brl || 0));
            setHasDiscount(editingRecord.has_discount || false); setDiscountValue(editingRecord.discount_value || 0);
            setDate(editingRecord.date); setNotes(editingRecord.notes || "");
        } else {
            setVehicleId(vehicles.length > 0 ? vehicles[0].id : ""); setBrand(""); setDimension(""); setQuantity(1);
            setKmAtChange(0); setNextChangeKm(0); setValorStr("0"); setHasDiscount(false); setDiscountValue(0);
            setDate(getLocalDateString()); setNotes("");
        }
        setItemEstoqueSelecionado(null);
        setQuantidadeEstoque(0);
        setError(null);
    }, [editingRecord, open, vehicles]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!vehicleId) { setError("Selecione um veículo"); return; }
        setLoading(true);
        try {
            const valueBrl = parseFloat(valorStr) || 0;
            const data = { vehicle_id: vehicleId, brand: brand || undefined, dimension: dimension || undefined, quantity, km_at_change: kmAtChange || undefined, next_change_km: nextChangeKm || undefined, value_brl: valueBrl || undefined, has_discount: hasDiscount, discount_value: hasDiscount ? discountValue : undefined, date, notes: notes || undefined };

            let savedId: string | undefined;
            if (editingRecord) {
                const updated = await updateRecord(editingRecord.id, data);
                savedId = updated?.id ?? editingRecord.id;
            } else {
                const created = await addRecord(data as any);
                savedId = created?.id;
            }

            // Baixa no estoque se necessário (sem lançamento financeiro extra)
            if (itemEstoqueSelecionado && quantidadeEstoque > 0 && savedId) {
                await supabase.rpc('registrar_saida_estoque', {
                    p_item_id: itemEstoqueSelecionado,
                    p_quantidade: quantidadeEstoque,
                    p_vehicle_id: vehicleId || null,
                    p_maintenance_id: savedId,
                    p_observacao: 'Baixa automatica via troca de pneu',
                });
            }

            onClose();
        } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar"); }
        finally { setLoading(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{editingRecord ? "Editar" : "Nova"} Troca de Pneu</h3>
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
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensão</label>
                            <input type="text" value={dimension} onChange={(e) => setDimension(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="295/80R22.5" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">KM no dia da troca</label>
                            <input type="number" value={kmAtChange || ""} onChange={(e) => setKmAtChange(parseInt(e.target.value) || 0)} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima troca (KM)</label>
                            <input type="number" value={nextChangeKm || ""} onChange={(e) => setNextChangeKm(parseInt(e.target.value) || 0)} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <SeletorOrigemCusto
                        valor={valorStr}
                        onChangeValor={setValorStr}
                        onSelecionarItemEstoque={(id, qtd) => {
                            setItemEstoqueSelecionado(id);
                            setQuantidadeEstoque(qtd);
                        }}
                        labelValor="Valor Total (R$)"
                    />
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                        <span className="text-sm font-medium text-gray-700">Tem desconto?</span>
                    </div>
                    {hasDiscount && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor com Desconto (R$)</label>
                            <input type="number" value={discountValue || ""} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} step="0.01" min="0" className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <VinculoPneuMarcacao vehicleId={vehicleId} />
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
export default TireChangeModal;
