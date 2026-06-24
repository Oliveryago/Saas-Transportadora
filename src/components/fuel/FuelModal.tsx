import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSuppliers } from "../../hooks/useSuppliers";
import type { FuelRecord, Vehicle, FuelType } from "../../types";
import { FUEL_TYPE_LABELS } from "../../types";
import { getLocalDateString } from "../../lib/utils/date";
import { useAuth } from "../../contexts/AuthContext";
import { PhotoUpload } from "../shared/PhotoUpload";
import { usePhotoUpload } from "../../hooks/usePhotoUpload";
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
  const { user } = useAuth();
  const isDriver = user?.role === "driver";

  const {
    photos,
    uploading,
    progress,
    error: uploadError,
    uploadPhoto,
    removePhoto,
    clearPhotos,
    loadExistingPhotos,
    canAddMore
  } = usePhotoUpload({ module: "fuel_invoices", maxPhotos: 1 });

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
  const [isFullTank, setIsFullTank] = useState(true);
  const [fuelTotalValue, setFuelTotalValue] = useState(0);
  const [arlaTotalValue, setArlaTotalValue] = useState(0);
  const [additionalItemDesc, setAdditionalItemDesc] = useState("");
  const [additionalItemValue, setAdditionalItemValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postoSuppliers = suppliers.filter((s) => s.type === "posto");
  const filteredSuggestions = postoSuppliers.filter((s) =>
    s.company_name.toLowerCase().includes(fuelStation.toLowerCase())
  );

  const effectivePrice = hasDiscount && discountValue > 0 ? discountValue : pricePerLiter;
  const dieselValue = liters > 0 && effectivePrice > 0 ? liters * effectivePrice : 0;
  const adminArlaValue = hasArla && arlaLiters > 0 && arlaPricePerLiter > 0 ? arlaLiters * arlaPricePerLiter : 0;

  let finalValueBrl = 0;
  let finalPricePerLiter = pricePerLiter;
  let finalArlaPricePerLiter = arlaPricePerLiter;

  if (isDriver) {
    finalValueBrl = fuelTotalValue + arlaTotalValue + additionalItemValue;
    finalPricePerLiter = liters > 0 ? fuelTotalValue / liters : 0;
    finalArlaPricePerLiter = arlaLiters > 0 ? arlaTotalValue / arlaLiters : 0;
  } else {
    finalValueBrl = dieselValue + adminArlaValue + additionalItemValue;
  }
  const displayTotalValue = finalValueBrl;

  useEffect(() => {
    if (editingRecord) {
      setVehicleId(editingRecord.vehicle_id);
      setDate(editingRecord.date || editingRecord.created_at?.split("T")[0] || getLocalDateString());
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
      setIsFullTank(editingRecord.is_full_tank ?? true);
      setAdditionalItemDesc(editingRecord.additional_item_description || "");
      setAdditionalItemValue(editingRecord.additional_item_value || 0);
      if (editingRecord.invoice_photo_url) {
        loadExistingPhotos([editingRecord.invoice_photo_url]);
      } else {
        clearPhotos();
      }
      if (editingRecord.value_brl) {
        setFuelTotalValue(editingRecord.liters * (editingRecord.price_per_liter || 0));
        setArlaTotalValue((editingRecord.arla_liters || 0) * (editingRecord.arla_price_per_liter || 0));
      }
    } else {
      setVehicleId(vehicles.length > 0 ? vehicles[0].id : "");
      setDate(getLocalDateString());
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
      setIsFullTank(true);
      setAdditionalItemDesc("");
      setAdditionalItemValue(0);
      setFuelTotalValue(0);
      setArlaTotalValue(0);
      clearPhotos();
    }
    setError(null);
  }, [editingRecord, vehicles, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vehicleId) { setError("Selecione um veículo"); return; }
    if (liters <= 0) { setError("Quantidade de litros deve ser maior que 0"); return; }
    if (!isDriver && pricePerLiter <= 0) { setError("Informe o preço por litro"); return; }
    if (isDriver && fuelTotalValue <= 0) { setError("Informe o valor total do combustível"); return; }

    setLoading(true);
    try {
      const data = {
        vehicle_id: vehicleId,
        date: date || getLocalDateString(),
        km_digital: kmDigital,
        liters,
        fuel_type: fuelType,
        price_per_liter: finalPricePerLiter,
        arla_liters: hasArla || (isDriver && arlaLiters > 0) ? arlaLiters : undefined,
        arla_price_per_liter: hasArla || (isDriver && arlaLiters > 0) ? finalArlaPricePerLiter : undefined,
        has_discount: hasDiscount,
        discount_value: hasDiscount ? discountValue : undefined,
        additional_item_description: additionalItemDesc,
        additional_item_value: additionalItemValue,
        invoice_photo_url: photos.length > 0 ? photos[0].url : undefined,
        fuel_station: fuelStation,
        is_full_tank: isFullTank,
      };

      const dataToSave = {
        ...data,
        value_brl: finalValueBrl,
      };

      if (editingRecord) {
        await updateRecord(editingRecord.id, dataToSave);
      } else {
        await addRecord({
          ...dataToSave,
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

          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border-2 border-amber-200 shadow-sm">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isFullTank} onChange={(e) => setIsFullTank(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
            <div>
              <span className="text-sm font-bold text-amber-900 block">Abastecimento com Tanque Cheio?</span>
              <p className="text-[10px] text-amber-700 leading-tight">Marque se você completou o tanque até a boca. Se colocou apenas um valor fixo (ex: R$ 100), desmarque.</p>
            </div>
          </div>

          {isDriver ? (
            <div className="space-y-6">
              {/* Campos do Motorista */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                <h4 className="font-bold text-blue-900">1. Combustível</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Litros *</label>
                    <input type="number" value={liters || ""} onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" min="0" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Valor Total (R$) *</label>
                    <input type="number" value={fuelTotalValue || ""} onChange={(e) => setFuelTotalValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" min="0" required />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-4">
                <h4 className="font-bold text-emerald-900">2. Arla 32 (Opcional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-1">Litros de Arla</label>
                    <input type="number" value={arlaLiters || ""} onChange={(e) => {
                      setArlaLiters(parseFloat(e.target.value) || 0);
                      if (parseFloat(e.target.value) > 0) setHasArla(true);
                      else setHasArla(false);
                    }}
                      step="0.001" className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-1">Valor Total Arla (R$)</label>
                    <input type="number" value={arlaTotalValue || ""} onChange={(e) => setArlaTotalValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white" min="0" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
                <h4 className="font-bold text-amber-900">3. Adicionais (Opcional)</h4>
                <p className="text-xs text-amber-700">Perfume, flanela, ou outros itens na mesma nota.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-1">Descrição</label>
                    <input type="text" value={additionalItemDesc} onChange={(e) => setAdditionalItemDesc(e.target.value)}
                      placeholder="Ex: Perfume" className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-1">Valor (R$)</label>
                    <input type="number" value={additionalItemValue || ""} onChange={(e) => setAdditionalItemValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white" min="0" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="font-bold text-gray-800">Adicionais (Opcional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={additionalItemDesc} onChange={(e) => setAdditionalItemDesc(e.target.value)}
                      placeholder="Ex: Perfume" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input type="number" value={additionalItemValue || ""} onChange={(e) => setAdditionalItemValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 bg-white" min="0" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total calculated */}
          {displayTotalValue > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700 font-medium">Valor Total Calculado:</span>
                <span className="text-lg font-bold text-blue-800">
                  R$ {displayTotalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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

          <div className="border-t pt-4 mt-4">
            <PhotoUpload
              module="fuel_invoices"
              photos={photos}
              uploading={uploading}
              progress={progress}
              error={uploadError}
              canAddMore={canAddMore}
              maxPhotos={1}
              onUpload={uploadPhoto}
              onRemove={removePhoto}
              label="Foto do Comprovante Fiscal"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading || uploading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FuelModal;
