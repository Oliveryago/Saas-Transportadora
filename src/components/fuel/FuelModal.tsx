import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSuppliers } from "../../hooks/useSuppliers";
import type { FuelRecord, Vehicle, FuelType } from "../../types";
import { FUEL_TYPE_LABELS } from "../../types";

interface FuelModalProps {
  open: boolean;
  onClose: () => void;
  editingRecord?: FuelRecord | null;
  vehicles: Vehicle[];
  addRecord: (record: Omit<FuelRecord, "id" | "created_at" | "updated_at">) => Promise<FuelRecord>;
  updateRecord: (id: string, updates: Partial<FuelRecord>) => Promise<FuelRecord>;
}

function FuelModal({ open, onClose, editingRecord, vehicles, addRecord, updateRecord }: FuelModalProps) {
  const { suppliers } = useSuppliers();
  const [vehicleId, setVehicleId] = useState("");
  const [kmDigital, setKmDigital] = useState(0);
  const [liters, setLiters] = useState(0);
  const [fuelType, setFuelType] = useState<FuelType>("diesel_s500");
  const [pricePerLiter, setPricePerLiter] = useState(0);
  const [hasArla, setHasArla] = useState(false);
  const [arlaLiters, setArlaLiters] = useState(0);
  const [arlaPricePerLiter, setArlaPricePerLiter] = useState(0);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [fuelStation, setFuelStation] = useState("");
  const [date, setDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postoSuppliers = suppliers.filter((s) => s.type === "posto");
  const filteredSuggestions = postoSuppliers.filter((s) =>
    s.company_name.toLowerCase().includes(fuelStation.toLowerCase())
  );

  const effectivePrice = hasDiscount && discountValue > 0 ? discountValue : pricePerLiter;
  const dieselValue = liters > 0 && effectivePrice > 0 ? liters * effectivePrice : 0;
  const arlaValue = hasArla && arlaLiters > 0 && arlaPricePerLiter > 0 ? arlaLiters * arlaPricePerLiter : 0;
  const totalValue = dieselValue + arlaValue;

  useEffect(() => {
    if (editingRecord) {
      setVehicleId(editingRecord.vehicle_id);
      setDate(editingRecord.date || editingRecord.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]);
      setKmDigital(editingRecord.km_digital);
      setLiters(editingRecord.liters);
      setFuelType((editingRecord.fuel_type as FuelType) || "diesel_s500");
      setPricePerLiter(editingRecord.price_per_liter || 0);
      setHasArla(!!editingRecord.arla_liters);
      setArlaLiters(editingRecord.arla_liters || 0);
      setArlaPricePerLiter(editingRecord.arla_price_per_liter || 0);
      setHasDiscount(editingRecord.has_discount || false);
      setDiscountValue(editingRecord.discount_value || 0);
      setFuelStation(editingRecord.fuel_station || "");
    } else {
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : "");
      setDate(new Date().toISOString().split("T")[0]);
      setKmDigital(0);
      setLiters(0);
      setFuelType("diesel_s500");
      setPricePerLiter(0);
      setHasArla(false);
      setArlaLiters(0);
      setArlaPricePerLiter(0);
      setHasDiscount(false);
      setDiscountValue(0);
      setFuelStation("");
    }
    setError(null);
  }, [editingRecord, vehicles, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vehicleId) { setError("Selecione um veículo"); return; }
    if (liters <= 0) { setError("Quantidade de litros deve ser maior que 0"); return; }
    if (pricePerLiter <= 0) { setError("Informe o preço por litro"); return; }

    setLoading(true);
    try {
      const data = {
        vehicle_id: vehicleId,
        date: date || new Date().toISOString().split("T")[0],
        km_digital: kmDigital,
        liters,
        fuel_type: fuelType,
        price_per_liter: pricePerLiter,
        arla_liters: hasArla ? arlaLiters : undefined,
        arla_price_per_liter: hasArla ? arlaPricePerLiter : undefined,
        has_discount: hasDiscount,
        discount_value: hasDiscount ? discountValue : undefined,
        value_brl: totalValue,
        fuel_station: fuelStation,
      };

      if (editingRecord) {
        await updateRecord(editingRecord.id, data);
      } else {
        await addRecord({
          ...data,
          km_photo_url: undefined,
          validations: { verified: false, issues: [] },
          driver_id: "",
        } as any);
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {editingRecord ? "Editar Abastecimento" : "Novo Abastecimento"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Selecione um veículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Combustível *</label>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {(Object.entries(FUEL_TYPE_LABELS) as [FuelType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KM Digital *</label>
              <input type="number" value={kmDigital || ""} onChange={(e) => setKmDigital(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Litros *</label>
              <input type="number" value={liters || ""} onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
                step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço/Litro (R$) *</label>
              <input type="number" value={pricePerLiter || ""} onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
            </div>
          </div>

          {/* Arla toggle */}
          {fuelType.includes("diesel") && (
            <>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={hasArla} onChange={(e) => setHasArla(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-blue-900">Adicionou Arla 32?</span>
              </div>

              {hasArla && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Litros de Arla *</label>
                    <input type="number" value={arlaLiters || ""} onChange={(e) => setArlaLiters(parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço/Litro Arla (R$) *</label>
                    <input type="number" value={arlaPricePerLiter || ""} onChange={(e) => setArlaPricePerLiter(parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Discount toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">Tem desconto?</span>
          </div>

          {hasDiscount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço com Desconto (R$/L) *</label>
              <input type="number" value={discountValue || ""} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-emerald-300" min="0" />
            </div>
          )}

          {/* Total calculated */}
          {totalValue > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700 font-medium">Valor Total Calculado:</span>
                <span className="text-lg font-bold text-blue-800">
                  R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {hasDiscount && discountValue > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Economia: R$ {((pricePerLiter - discountValue) * liters).toFixed(2)} ({((1 - discountValue / pricePerLiter) * 100).toFixed(1)}% de desconto)
                </p>
              )}
            </div>
          )}

          {/* Fuel station with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Posto de Combustível</label>
            <input type="text" value={fuelStation}
              onChange={(e) => { setFuelStation(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite ou selecione um posto..." />
            {showSuggestions && fuelStation && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <button key={s.id} type="button"
                    onMouseDown={(e) => { e.preventDefault(); setFuelStation(s.company_name); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700">
                    {s.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FuelModal;
