import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useDrivers } from "../../hooks/useDrivers";
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
  addRecord: (record: any) => Promise<FuelRecord>;
  updateRecord: (id: string, updates: Partial<FuelRecord>) => Promise<FuelRecord>;
}

function FuelModal({ open, onClose, editingRecord, vehicles, addRecord, updateRecord }: FuelModalProps) {
  const { suppliers } = useSuppliers();
  const { drivers } = useDrivers();
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
  const [driverId, setDriverId] = useState("");
  const [kmDigital, setKmDigital] = useState(0);
  const [litersPump1, setLitersPump1] = useState(0);
  const [litersPump2, setLitersPump2] = useState<number | "">("");
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
  const [additionalItems, setAdditionalItems] = useState<{ description: string, value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculated total liters from both pumps
  const totalLiters = litersPump1 + (typeof litersPump2 === "number" ? litersPump2 : 0);

  const postoSuppliers = suppliers.filter((s) => s.type === "posto");
  const filteredSuggestions = postoSuppliers.filter((s) =>
    s.company_name.toLowerCase().includes(fuelStation.toLowerCase())
  );

  const effectivePrice = hasDiscount && discountValue > 0 ? discountValue : pricePerLiter;
  const dieselValue = totalLiters > 0 && effectivePrice > 0 ? totalLiters * effectivePrice : 0;
  const adminArlaValue = hasArla && arlaLiters > 0 && arlaPricePerLiter > 0 ? arlaLiters * arlaPricePerLiter : 0;

  let finalValueBrl = 0;
  let finalPricePerLiter = pricePerLiter;
  let finalArlaPricePerLiter = arlaPricePerLiter;

  const additionalItemsTotal = additionalItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (isDriver) {
    finalValueBrl = fuelTotalValue + arlaTotalValue + additionalItemsTotal;
    finalPricePerLiter = totalLiters > 0 ? fuelTotalValue / totalLiters : 0;
    finalArlaPricePerLiter = arlaLiters > 0 ? arlaTotalValue / arlaLiters : 0;
  } else {
    finalValueBrl = dieselValue + adminArlaValue + additionalItemsTotal;
  }
  const displayTotalValue = finalValueBrl;

  useEffect(() => {
    if (editingRecord) {
      setVehicleId(editingRecord.vehicle_id);
      setDriverId(editingRecord.driver_id || "");
      setDate(editingRecord.date || editingRecord.created_at?.split("T")[0] || getLocalDateString());
      setKmDigital(editingRecord.km_digital);
      // Load pump values — fallback: pump1 = total liters for legacy records
      setLitersPump1(editingRecord.liters_pump1 ?? editingRecord.liters);
      setLitersPump2(editingRecord.liters_pump2 ?? "");
      setFuelType((editingRecord.fuel_type as FuelType) || "diesel_s500");
      setPricePerLiter(editingRecord.price_per_liter || 0);
      setHasArla(!!editingRecord.arla_liters);
      setArlaLiters(editingRecord.arla_liters || 0);
      setArlaPricePerLiter(editingRecord.arla_price_per_liter || 0);
      setHasDiscount(editingRecord.has_discount || false);
      setDiscountValue(editingRecord.discount_value || 0);
      setFuelStation(editingRecord.fuel_station || "");
      setIsFullTank(editingRecord.is_full_tank ?? true);

      if (editingRecord.additional_items?.length) {
        setAdditionalItems(editingRecord.additional_items);
      } else if (editingRecord.additional_item_description) {
        setAdditionalItems([{
          description: editingRecord.additional_item_description,
          value: editingRecord.additional_item_value || 0
        }]);
      } else {
        setAdditionalItems([]);
      }
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
      setDriverId("");
      setDate(getLocalDateString());
      setKmDigital(0);
      setLitersPump1(0);
      setLitersPump2("");
      setFuelType("diesel_s500");
      setPricePerLiter(0);
      setHasArla(false);
      setArlaLiters(0);
      setArlaPricePerLiter(0);
      setHasDiscount(false);
      setDiscountValue(0);
      setFuelStation("");
      setIsFullTank(true);
      setAdditionalItems([]);
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
    if (!isDriver && !driverId) { setError("Selecione um motorista"); return; }
    if (kmDigital <= 0) { setError("O KM registrado deve ser maior que 0"); return; }
    if (litersPump1 <= 0) { setError("Litros - Bomba 1 deve ser maior que 0"); return; }
    if (typeof litersPump2 === "number" && litersPump2 < 0) { setError("Litros - Bomba 2 não pode ser negativo"); return; }
    if (!isDriver && pricePerLiter <= 0) { setError("Informe o preço por litro"); return; }
    if (isDriver && fuelTotalValue <= 0) { setError("Informe o valor total do combustível"); return; }

    setLoading(true);
    try {
      const pump2Value = typeof litersPump2 === "number" && litersPump2 > 0 ? litersPump2 : undefined;
      const data = {
        vehicle_id: vehicleId,
        driver_id: isDriver ? undefined : driverId, // hook handles isDriver automatically
        date: date || getLocalDateString(),
        km_digital: kmDigital,
        liters: totalLiters,           // soma das duas bombas — source of truth para relatórios
        liters_pump1: litersPump1,
        liters_pump2: pump2Value,
        fuel_type: fuelType,
        price_per_liter: finalPricePerLiter,
        arla_liters: hasArla || (isDriver && arlaLiters > 0) ? arlaLiters : undefined,
        arla_price_per_liter: hasArla || (isDriver && arlaLiters > 0) ? finalArlaPricePerLiter : undefined,
        has_discount: hasDiscount,
        discount_value: hasDiscount ? discountValue : undefined,
        additional_items: additionalItems,
        additional_item_description: additionalItems.length > 0 ? additionalItems[0].description : "",
        additional_item_value: additionalItems.length > 0 ? additionalItems[0].value : 0,
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
        });
      }
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar abastecimento:", err);
      setError(err?.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {editingRecord ? "Editar Abastecimento" : "Novo Abastecimento"}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Selecione um veículo</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
                ))}
              </select>
              {selectedVehicle && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 font-medium bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 w-fit">
                  <span>KM Atual: {selectedVehicle.current_km?.toLocaleString("pt-BR")}</span>
                </div>
              )}
            </div>

            {!isDriver && (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Motorista *</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Selecione o motorista</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome_completo}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KM Registrado *</label>
              <input type="number" value={kmDigital || ""} onChange={(e) => setKmDigital(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required min="0" placeholder="Ex: 120500" />
            </div>
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
                {/* Dupla Bomba — Motorista */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Litros - Bomba 1 *</label>
                    <input type="number" value={litersPump1 || ""} onChange={(e) => setLitersPump1(parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" min="0" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Litros - Bomba 2</label>
                    <input type="number" value={litersPump2 === "" ? "" : litersPump2}
                      onChange={(e) => setLitersPump2(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" min="0" placeholder="Opcional" />
                  </div>
                </div>
                {totalLiters > 0 && (
                  <div className="flex items-center justify-between bg-blue-100 rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total de Litros</span>
                    <span className="text-sm font-bold text-blue-900">
                      {totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} L
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1">
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
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-amber-900">3. Adicionais (Opcional)</h4>
                    <p className="text-xs text-amber-700">Perfume, flanela, ou outros itens na mesma nota.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdditionalItems([...additionalItems, { description: "", value: 0 }])}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg hover:bg-amber-300 transition-colors text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Item
                  </button>
                </div>

                {additionalItems.length > 0 && (
                  <div className="space-y-3">
                    {additionalItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-200">
                        <div className="flex-1 space-y-1">
                          <label className="block text-xs font-medium text-amber-900">Descrição</label>
                          <input type="text" value={item.description} onChange={(e) => {
                            const newItems = [...additionalItems];
                            newItems[index].description = e.target.value;
                            setAdditionalItems(newItems);
                          }} placeholder="Ex: Perfume" className="w-full px-3 py-1.5 border border-amber-200 rounded text-sm focus:ring-1 focus:ring-amber-500 bg-white" />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="block text-xs font-medium text-amber-900">Valor (R$)</label>
                          <input type="number" value={item.value || ""} onChange={(e) => {
                            const newItems = [...additionalItems];
                            newItems[index].value = parseFloat(e.target.value) || 0;
                            setAdditionalItems(newItems);
                          }} step="0.01" min="0" className="w-full px-3 py-1.5 border border-amber-200 rounded text-sm focus:ring-1 focus:ring-amber-500 bg-white" />
                        </div>
                        <button type="button" onClick={() => {
                          const newItems = additionalItems.filter((_, i) => i !== index);
                          setAdditionalItems(newItems);
                        }} className="mt-5 p-1.5 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

              {/* Dupla Bomba — Admin/Gestor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Litros - Bomba 1 *</label>
                  <input type="number" value={litersPump1 || ""} onChange={(e) => setLitersPump1(parseFloat(e.target.value) || 0)}
                    step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Litros - Bomba 2</label>
                  <input type="number" value={litersPump2 === "" ? "" : litersPump2}
                    onChange={(e) => setLitersPump2(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" placeholder="Opcional" />
                </div>
              </div>
              {totalLiters > 0 && (
                <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total de Litros</span>
                  <span className="text-sm font-bold text-blue-800">
                    {totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} L
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1">
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
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800">Adicionais (Opcional)</h4>
                  <button
                    type="button"
                    onClick={() => setAdditionalItems([...additionalItems, { description: "", value: 0 }])}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Item
                  </button>
                </div>

                {additionalItems.length > 0 && (
                  <div className="space-y-3">
                    {additionalItems.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex-1 space-y-1">
                          <label className="block text-xs font-medium text-gray-700">Descrição</label>
                          <input type="text" value={item.description} onChange={(e) => {
                            const newItems = [...additionalItems];
                            newItems[index].description = e.target.value;
                            setAdditionalItems(newItems);
                          }} placeholder="Ex: Perfume" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-500 bg-white" />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="block text-xs font-medium text-gray-700">Valor (R$)</label>
                          <input type="number" value={item.value || ""} onChange={(e) => {
                            const newItems = [...additionalItems];
                            newItems[index].value = parseFloat(e.target.value) || 0;
                            setAdditionalItems(newItems);
                          }} step="0.01" min="0" className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-gray-500 bg-white" />
                        </div>
                        <button type="button" onClick={() => {
                          const newItems = additionalItems.filter((_, i) => i !== index);
                          setAdditionalItems(newItems);
                        }} className="mt-5 p-1.5 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  Economia: R$ {((pricePerLiter - discountValue) * totalLiters).toFixed(2)} ({((1 - discountValue / pricePerLiter) * 100).toFixed(1)}% de desconto)
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

          <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t border-gray-100 flex gap-3 pb-2 z-10">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading || uploading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
    </div>
    </div >
  );
}

export default FuelModal;
