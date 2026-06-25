import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFuelRecords } from "../hooks/useFuelRecords";
import { useVehicles } from "../hooks/useVehicles";
import { usePhotoUpload } from "../hooks/usePhotoUpload";
import { useSuppliers } from "../hooks/useSuppliers";
import { getLocalDateString } from "../lib/utils/date";
import type { FuelType } from "../types";
import { FUEL_TYPE_LABELS } from "../types";
import {
  ArrowLeft,
  Fuel,
  Camera,
  Gauge,
  Droplets,
  DollarSign,
  CheckCircle2,
  Loader2,
  Store,
  CalendarDays,
  ChevronDown,
  X,
  ImagePlus,
  Trash2,
} from "lucide-react";

const inputClass =
  "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all text-base";

const labelClass = "block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1.5";

export function DriverFuel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vehicles } = useVehicles();
  const { addRecord } = useFuelRecords();
  const { suppliers } = useSuppliers();
  const {
    photos,
    uploading,
    progress,
    uploadPhoto,
    removePhoto,
  } = usePhotoUpload({ module: "fuel_invoices", maxPhotos: 1 });

  const [vehicleId, setVehicleId] = useState("");
  const [kmDigital, setKmDigital] = useState("");
  const [liters, setLiters] = useState("");
  const [fuelTotalValue, setFuelTotalValue] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("diesel_s500");
  const [fuelStation, setFuelStation] = useState("");
  const [date, setDate] = useState(getLocalDateString());
  const [hasArla, setHasArla] = useState(false);
  const [arlaLiters, setArlaLiters] = useState("");
  const [arlaTotalValue, setArlaTotalValue] = useState("");
  const [isFullTank, setIsFullTank] = useState(true);
  const [additionalItemDesc, setAdditionalItemDesc] = useState("");
  const [additionalItemValue, setAdditionalItemValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showStationSuggestions, setShowStationSuggestions] = useState(false);

  const postos = suppliers.filter((s) => s.type === "posto");
  const filteredPostos = postos.filter((p) =>
    p.company_name.toLowerCase().includes(fuelStation.toLowerCase())
  );

  // Pre-select first active vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [vehicles]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const fuelNum = parseFloat(liters) || 0;
  const fuelTotal = parseFloat(fuelTotalValue) || 0;
  const arlaNum = parseFloat(arlaLiters) || 0;
  const arlaTotal = parseFloat(arlaTotalValue) || 0;
  const addlNum = parseFloat(additionalItemValue) || 0;
  const grandTotal = fuelTotal + arlaTotal + addlNum;
  const pricePerLiter = fuelNum > 0 ? fuelTotal / fuelNum : 0;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vehicleId) return setError("Selecione um veículo");
    if (fuelNum <= 0) return setError("Informe a quantidade de litros");
    if (fuelTotal <= 0) return setError("Informe o valor total do combustível");
    if (!parseInt(kmDigital)) return setError("Informe o KM atual do veículo");

    setLoading(true);
    try {
      await addRecord({
        vehicle_id: vehicleId,
        date: date,
        km_digital: parseInt(kmDigital),
        liters: fuelNum,
        fuel_type: fuelType,
        price_per_liter: pricePerLiter,
        arla_liters: hasArla && arlaNum > 0 ? arlaNum : undefined,
        arla_price_per_liter: hasArla && arlaNum > 0 && arlaTotal > 0 ? arlaTotal / arlaNum : undefined,
        value_brl: grandTotal,
        additional_item_description: additionalItemDesc || undefined,
        additional_item_value: addlNum > 0 ? addlNum : undefined,
        fuel_station: fuelStation || undefined,
        is_full_tank: isFullTank,
        invoice_photo_url: photos.length > 0 ? photos[0].url : undefined,
        tenant_id: user!.tenant_id,
        driver_id: user!.id,
        km_photo_url: undefined,
        validations: { verified: false, issues: [] },
      } as any);

      setSuccess(true);
      setTimeout(() => navigate("/driver"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar abastecimento");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Registrado!</h2>
        <p className="text-gray-400 text-center">
          Abastecimento salvo com sucesso. Redirecionando...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/driver")}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-tight">Novo Abastecimento</h1>
          <p className="text-xs text-blue-300">Preencha os dados do posto</p>
        </div>
        <div className="ml-auto">
          <Fuel className="w-6 h-6 text-blue-400" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-6 space-y-5">

        {/* Vehicle selector */}
        <div>
          <label className={labelClass}>Veículo *</label>
          <div className="relative">
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className={inputClass + " appearance-none pr-10"}
              required
            >
              <option value="">Selecione o veículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-800">
                  {v.license_plate} — {v.model}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          {selectedVehicle && (
            <p className="text-xs text-blue-300 mt-1.5 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              KM atual: {selectedVehicle.current_km.toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {/* Date & KM */}
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>
              <CalendarDays className="w-3 h-3 inline mr-1" />Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              <Gauge className="w-3 h-3 inline mr-1" />KM atual *
            </label>
            <input
              type="number"
              value={kmDigital}
              onChange={(e) => setKmDigital(e.target.value)}
              placeholder="Ex: 125400"
              className={inputClass}
              inputMode="numeric"
              required
            />
          </div>
        </div>

        {/* Fuel station */}
        <div className="relative">
          <label className={labelClass}>
            <Store className="w-3 h-3 inline mr-1" />Nome do Posto
          </label>
          <input
            type="text"
            value={fuelStation}
            onChange={(e) => {
              setFuelStation(e.target.value);
              setShowStationSuggestions(true);
            }}
            onFocus={() => setShowStationSuggestions(true)}
            onBlur={() => setTimeout(() => setShowStationSuggestions(false), 200)}
            placeholder="Ex: Posto Ipiranga BR-040"
            className={inputClass}
          />
          {showStationSuggestions && filteredPostos.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-white/20 rounded-xl mt-1 z-20 overflow-hidden shadow-xl">
              {filteredPostos.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => {
                    setFuelStation(p.company_name);
                    setShowStationSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 border-b border-white/5 last:border-0"
                >
                  {p.company_name}
                  {p.city && <span className="text-gray-400 ml-1">— {p.city}/{p.uf}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fuel type */}
        <div>
          <label className={labelClass}>Tipo de Combustível</label>
          <div className="relative">
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className={inputClass + " appearance-none pr-10"}
            >
              {Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-slate-800">
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Liters + Total */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-4">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-2">
            <Droplets className="w-4 h-4" />Diesel / Combustível
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Litros *</label>
              <input
                type="number"
                step="0.01"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="0,00"
                className={inputClass}
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                <DollarSign className="w-3 h-3 inline" />Valor Total *
              </label>
              <input
                type="number"
                step="0.01"
                value={fuelTotalValue}
                onChange={(e) => setFuelTotalValue(e.target.value)}
                placeholder="R$ 0,00"
                className={inputClass}
                inputMode="decimal"
                required
              />
            </div>
          </div>
          {pricePerLiter > 0 && (
            <p className="text-xs text-green-300 text-center">
              ≈ R$ {pricePerLiter.toFixed(3)}/L
            </p>
          )}
        </div>

        {/* Arla toggle */}
        <div>
          <button
            type="button"
            onClick={() => setHasArla(!hasArla)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
              hasArla
                ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Arla 32 também?
            </span>
            <div className={`w-11 h-6 rounded-full transition-colors ${hasArla ? "bg-blue-500" : "bg-white/20"} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hasArla ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>

          {hasArla && (
            <div className="mt-3 bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Litros Arla</label>
                  <input
                    type="number"
                    step="0.01"
                    value={arlaLiters}
                    onChange={(e) => setArlaLiters(e.target.value)}
                    placeholder="0,00"
                    className={inputClass}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className={labelClass}>Valor Arla</label>
                  <input
                    type="number"
                    step="0.01"
                    value={arlaTotalValue}
                    onChange={(e) => setArlaTotalValue(e.target.value)}
                    placeholder="R$ 0,00"
                    className={inputClass}
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full tank toggle */}
        <button
          type="button"
          onClick={() => setIsFullTank(!isFullTank)}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
            isFullTank
              ? "bg-green-600/20 border-green-500/50 text-green-300"
              : "bg-white/5 border-white/10 text-gray-400"
          }`}
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            Tanque Cheio?
          </span>
          <div className={`w-11 h-6 rounded-full transition-colors ${isFullTank ? "bg-green-500" : "bg-white/20"} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isFullTank ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </button>

        {/* Adicionais */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-4">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
            Adicionais (Opcional)
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Descrição (Ex: Perfume)</label>
              <input
                type="text"
                value={additionalItemDesc}
                onChange={(e) => setAdditionalItemDesc(e.target.value)}
                placeholder="Ex: Perfume"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <DollarSign className="w-3 h-3 inline" />Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={additionalItemValue}
                onChange={(e) => setAdditionalItemValue(e.target.value)}
                placeholder="R$ 0,00"
                className={inputClass}
                inputMode="decimal"
              />
            </div>
          </div>
        </div>

        {/* Photo upload */}
        <div>
          <label className={labelClass}>
            <Camera className="w-3 h-3 inline mr-1" />Foto da Nota Fiscal
          </label>
          {photos.length === 0 ? (
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-white/20 cursor-pointer hover:border-blue-400/50 hover:bg-white/5 transition-all">
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-blue-300">{progress}%</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImagePlus className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/50">Toque para tirar foto</p>
                  <p className="text-xs text-white/30 mt-0.5">ou escolher da galeria</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
                disabled={uploading}
              />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={photos[0].url}
                alt="Nota fiscal"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photos[0].id)}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 rounded-full flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Total summary */}
        {grandTotal > 0 && (
          <div className="bg-gradient-to-r from-blue-600/30 to-blue-500/20 rounded-2xl p-4 border border-blue-500/30">
            <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Total do abastecimento</p>
            <p className="text-3xl font-bold mt-1">
              R$ {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            {hasArla && arlaTotal > 0 && (
              <p className="text-xs text-blue-300 mt-1">
                Diesel: R$ {fuelTotal.toFixed(2)} + Arla: R$ {arlaTotal.toFixed(2)}
              </p>
            )}
            {addlNum > 0 && (
              <p className="text-xs text-blue-300 mt-1">
                Adicionais: R$ {addlNum.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <X className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-3 disabled:opacity-60 transition-all active:scale-98 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Registrar Abastecimento
            </>
          )}
        </button>
      </form>
    </div>
  );
}
