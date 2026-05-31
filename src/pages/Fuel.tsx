import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFuelRecords } from "../hooks/useFuelRecords";
import { useVehicles } from "../hooks/useVehicles";
import { useAuth } from "../contexts/AuthContext";
import { useCompanySettings } from "../hooks/useCompanySettings";
import {
  Plus, LogOut, ArrowLeft, Trash2, Edit2, Gauge, Info,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Fuel as FuelIcon, FileText, Loader2,
  Download
} from "lucide-react";
import { generateVoucher } from "../services/documentGenerator";
import { urlToDataURL } from "../services/companySettingsHelper";
import FuelModal from "../components/fuel/FuelModal";
import { FuelReportModal } from "../components/fuel/FuelReportModal";
import VehicleFilter from "../components/shared/VehicleFilter";
import { FuelRecord } from "../types";
import { formatLocalDate } from "../lib/utils/date";

interface TrechoData {
  recordId: string;
  vehicleId: string;
  date: string;
  kmInicial: number;
  kmFinal: number;
  distancia: number;
  liters: number;
  kmPorLitro: number;
  valorTotal: number;
  posto: string;
  isFirst: boolean;
  isFull: boolean;
}

const formatTimelineDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const dateOnly = dateStr.split("T")[0];
  const parts = dateOnly.split("-").map(Number);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export function Fuel() {
  const { user, tenant, signOut } = useAuth();
  const { settings: companySettings } = useCompanySettings();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const { records, deleteRecord, addRecord, updateRecord } = useFuelRecords(selectedVehicleId);
  const { vehicles } = useVehicles();
  const navigate = useNavigate();
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [generatingVoucher, setGeneratingVoucher] = useState<string | null>(null);
  // reportModal: null = closed, 'all' = frota geral, vehicleId = individual
  const [reportModal, setReportModal] = useState<{ vehicleId?: string } | null>(null);

  async function handleGenerateVoucher(trecho: TrechoData) {
    setGeneratingVoucher(trecho.recordId);
    try {
      const v = vehicles.find(v => v.id === trecho.vehicleId);
      if (!v) return;
      
      const details: Record<string, string | number> = {
        "Posto": trecho.posto,
        "Litros": `${trecho.liters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L`,
        "KM Registrado": trecho.kmFinal.toLocaleString("pt-BR")
      };

      if (!trecho.isFirst && trecho.kmPorLitro !== -1) {
        details["KM Inicial"] = trecho.kmInicial.toLocaleString("pt-BR");
        details["Distância"] = `${trecho.distancia.toLocaleString("pt-BR")} km`;
        details["Consumo"] = `${trecho.kmPorLitro.toFixed(2)} km/l`;
      } else if (trecho.kmPorLitro === -1) {
        details["Consumo"] = "Parcial (Acumulado)";
      }

      await generateVoucher({
        id: trecho.recordId,
        type: "Combustível",
        date: trecho.date,
        vehiclePlate: v.license_plate,
        vehicleModel: v.model,
        value: trecho.valorTotal,
        details,
        tenantName: tenant?.name,
        company: {
          settings: companySettings,
          logoDataUrl: companySettings?.logo_url
            ? await urlToDataURL(companySettings.logo_url)
            : null,
        },
      });
    } catch (error) {
      console.error("Error generating voucher:", error);
      alert("Erro ao gerar comprovante.");
    } finally {
      setGeneratingVoucher(null);
    }
  }

  const handleEdit = (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (record) {
      setEditingRecord(record as any);
      setFuelModalOpen(true);
    }
  };

  const getVehicle = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);
  const getVehicleName = (vehicleId: string) => {
    const v = getVehicle(vehicleId);
    return v ? `${v.license_plate} - ${v.model}` : "Veículo desconhecido";
  };

  // Build trecho data per vehicle
  const trechosPerVehicle = useMemo(() => {
    const vehicleIds = [...new Set(records.map((r) => r.vehicle_id))];
    const result: Record<string, TrechoData[]> = {};

    vehicleIds.forEach((vehicleId) => {
      const vehicleRecords = records
        .filter((r) => r.vehicle_id === vehicleId)
        .sort((a, b) => a.km_digital - b.km_digital);

      let lastFullRecord: FuelRecord | null = null;
      let pendingLiters = 0;

      result[vehicleId] = vehicleRecords.map((record, index) => {
        const isFirst = index === 0;
        const prev = !isFirst ? vehicleRecords[index - 1] : null;
        const distancia = prev ? record.km_digital - prev.km_digital : 0;
        
        let kmPorLitro = 0;
        const isFull = record.is_full_tank !== false;

        if (isFull) {
          if (lastFullRecord) {
            const totalDistance = record.km_digital - lastFullRecord.km_digital;
            const totalLiters = pendingLiters + record.liters;
            kmPorLitro = totalLiters > 0 ? totalDistance / totalLiters : 0;
          }
          // Reset accumulators for next block
          lastFullRecord = record;
          pendingLiters = 0;
        } else {
          // It's a partial refill. Accumulate liters for next full refill.
          pendingLiters += record.liters;
          kmPorLitro = -1; // Use -1 as a flag for "Partial/Unknown"
        }

        return {
          recordId: record.id,
          vehicleId: record.vehicle_id,
          date: record.date || record.created_at,
          kmInicial: prev ? prev.km_digital : 0,
          kmFinal: record.km_digital,
          distancia,
          liters: record.liters,
          kmPorLitro,
          valorTotal: Number(record.value_brl || 0),
          posto: record.fuel_station || "-",
          isFirst,
          isFull,
        };
      });
    });

    return result;
  }, [records]);

  // Stats (Filtered by active selection)
  const allTrechos = useMemo(() => {
    return Object.values(trechosPerVehicle)
      .flat()
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return b.kmFinal - a.kmFinal;
      });
  }, [trechosPerVehicle]);

  const trechosComConsumo = allTrechos.filter((t) => !t.isFirst && t.kmPorLitro > 0);

  // We only count liters that were actually part of a completed consumption segment
  const consumableLiters = trechosComConsumo.reduce((sum, t) => sum + t.liters, 0);
  const totalKm = trechosComConsumo.reduce((sum, t) => sum + t.distancia, 0);

  const avgKmL = consumableLiters > 0 ? totalKm / consumableLiters : 0;

  const totalCost = records.reduce((sum, r) => sum + Number(r.value_brl || 0), 0);
  const totalRecords = records.length;
  const currentTotalLiters = records.reduce((sum, r) => sum + Number(r.liters || 0), 0);

  function getConsumoBadge(kml: number) {
    if (kml >= 3) return { label: "Bom", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: TrendingUp, dot: "bg-emerald-500" };
    if (kml >= 2) return { label: "Normal", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Minus, dot: "bg-amber-500" };
    return { label: "Alto consumo", color: "bg-red-100 text-red-800 border-red-200", icon: TrendingDown, dot: "bg-red-500" };
  }

  // Average per vehicle
  function getVehicleAvgKmL(vehicleId: string) {
    const trechos = (trechosPerVehicle[vehicleId] || []).filter((t) => !t.isFirst && t.kmPorLitro > 0);
    if (trechos.length === 0) return null;
    return trechos.reduce((s, t) => s + t.kmPorLitro, 0) / trechos.length;
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
                <Gauge className="w-5 h-5 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">Abastecimentos</h1>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <VehicleFilter 
                value={selectedVehicleId} 
                onChange={setSelectedVehicleId} 
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <button onClick={() => signOut()} className="text-gray-700 hover:text-gray-900">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => { setEditingRecord(null); setFuelModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Abastecimento
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-white rounded-lg shadow-sm border overflow-hidden">
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-4 py-2 text-sm font-medium transition ${viewMode === "timeline" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 text-sm font-medium transition ${viewMode === "table" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Tabela
              </button>
            </div>

            {/* Relatório Geral */}
            <button
              onClick={() => setReportModal({})}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium shadow-sm text-sm disabled:opacity-50 transition"
            >
              <Download className="w-4 h-4" />
              Relatório Geral
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Registros</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalRecords}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Litros Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{currentTotalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })}L</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Gasto Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">KM Percorridos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalKm.toLocaleString("pt-BR")}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-emerald-500 col-span-2 md:col-span-1">
            <div className="flex items-center gap-1">
              <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Média Geral</p>
              <div className="relative">
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => setShowTooltip(!showTooltip)}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-50">
                    <div className="font-semibold mb-1">ℹ️ Como é calculado?</div>
                    <p>O consumo é calculado com base na distância percorrida desde o último abastecimento e nos litros abastecidos neste registro.</p>
                    <p className="mt-1 text-gray-300">Cada trecho = KM atual − KM anterior ÷ litros abastecidos.</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-emerald-600">{avgKmL > 0 ? avgKmL.toFixed(2) : "-"}</p>
              <span className="text-sm text-gray-400">km/l</span>
            </div>
            {avgKmL > 0 && (
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getConsumoBadge(avgKmL).color}`}>
                  {(() => { const Badge = getConsumoBadge(avgKmL); return <Badge.icon className="w-3 h-3" />; })()}
                  {getConsumoBadge(avgKmL).label}
                </span>
              </div>
            )}
          </div>
        </div>


        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow text-center py-16">
            <Gauge className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 text-lg">Nenhum abastecimento registrado ainda</p>
            <p className="text-gray-400 text-sm mt-1">Adicione o primeiro para começar a acompanhar o consumo</p>
          </div>
        ) : viewMode === "timeline" ? (
          /* =================== TIMELINE VIEW =================== */
          <div className="space-y-6">
            {Object.entries(trechosPerVehicle).map(([vehicleId, trechos]) => {
              const vehicle = getVehicle(vehicleId);
              const avgVehicle = getVehicleAvgKmL(vehicleId);
              const isExpanded = expandedVehicle === vehicleId || Object.keys(trechosPerVehicle).length === 1;

              return (
                <div key={vehicleId} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Vehicle header */}
                  <button
                    onClick={() => setExpandedVehicle(isExpanded ? null : vehicleId)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <FuelIcon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{vehicle?.license_plate || "?"}</p>
                        <p className="text-sm text-gray-500">{vehicle?.model || "Desconhecido"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 uppercase">Abastecimentos</p>
                        <p className="font-bold text-gray-900">{trechos.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase">Consumo Médio</p>
                        {avgVehicle ? (
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{avgVehicle.toFixed(2)} km/l</p>
                            <span className={`w-2.5 h-2.5 rounded-full ${getConsumoBadge(avgVehicle).dot}`}></span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Aguardando dados</p>
                        )}
                      </div>
                      {/* Individual vehicle report button */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setReportModal({ vehicleId })}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 font-medium transition"
                          title="Relatório deste veículo"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Relatório
                        </button>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>

                  {/* Timeline trechos */}
                  {isExpanded && (
                    <div className="border-t px-5 pb-5">
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                        {[...trechos].reverse().map((trecho, _index) => {
                          const badge = !trecho.isFirst && trecho.kmPorLitro > 0 ? getConsumoBadge(trecho.kmPorLitro) : null;

                          return (
                            <div key={trecho.recordId} className="relative pl-12 py-4">
                              {/* Timeline dot */}
                              <div className={`absolute left-3.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${trecho.isFirst ? "bg-gray-400" : badge ? badge.dot : "bg-gray-400"
                                }`} style={{ top: "1.5rem" }}></div>

                              {/* Card */}
                              <div className={`rounded-lg border p-4 transition hover:shadow-sm ${trecho.isFirst ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"
                                }`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  {/* Left: date and station */}
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatTimelineDate(trecho.date)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">Posto: {trecho.posto}</p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">
                                      R$ {trecho.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <button
                                      onClick={() => handleGenerateVoucher(trecho)}
                                      disabled={generatingVoucher === trecho.recordId}
                                      className="text-indigo-400 hover:text-indigo-600 transition disabled:opacity-50"
                                      title="Gerar Comprovante (PDF)"
                                    >
                                      {generatingVoucher === trecho.recordId ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleEdit(trecho.recordId)} className="text-blue-400 hover:text-blue-600 transition" title="Editar">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteRecord(trecho.recordId)} className="text-red-400 hover:text-red-600 transition" title="Excluir">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Trecho details */}
                                {trecho.isFirst ? (
                                  <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <p className="text-xs text-blue-700">
                                      Consumo ainda não disponível — aguardando próximo abastecimento
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Consumo do trecho anterior
                                      </span>
                                      {trecho.kmPorLitro === -1 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">
                                          Abastecimento Parcial
                                        </span>
                                      ) : badge && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                                          {(() => { const Icon = badge.icon; return <Icon className="w-3 h-3" />; })()}
                                          {badge.label}
                                        </span>
                                      )}
                                    </div>

                                    {/* Journey visualization */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="flex-1 bg-gray-100 rounded-lg p-2.5 text-center">
                                        <p className="text-xs text-gray-400">KM Inicial</p>
                                        <p className="font-bold text-gray-700 text-sm">{trecho.kmInicial.toLocaleString("pt-BR")}</p>
                                      </div>
                                      <div className="flex flex-col items-center px-1">
                                        <span className="text-xs font-bold text-emerald-600">{trecho.distancia.toLocaleString("pt-BR")} km</span>
                                        <div className="w-8 h-0.5 bg-emerald-400 my-0.5 relative">
                                          <div className="absolute right-0 -top-1 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-transparent border-l-emerald-400"></div>
                                        </div>
                                      </div>
                                      <div className="flex-1 bg-gray-100 rounded-lg p-2.5 text-center">
                                        <p className="text-xs text-gray-400">KM Final</p>
                                        <p className="font-bold text-gray-700 text-sm">{trecho.kmFinal.toLocaleString("pt-BR")}</p>
                                      </div>
                                    </div>

                                    {/* Metrics row */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                                        <p className="text-xs text-gray-400">Distância</p>
                                        <p className="font-semibold text-gray-800 text-sm">{trecho.distancia.toLocaleString("pt-BR")} km</p>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                                        <p className="text-xs text-gray-400">Litros</p>
                                        <p className="font-semibold text-gray-800 text-sm">{trecho.liters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L</p>
                                      </div>
                                      <div className={`rounded-lg p-2 text-center ${trecho.kmPorLitro === -1 ? "bg-gray-50 italic" : trecho.kmPorLitro >= 3 ? "bg-emerald-50" : trecho.kmPorLitro >= 2 ? "bg-amber-50" : "bg-red-50"
                                        }`}>
                                        <p className="text-xs text-gray-400">Resultado</p>
                                        <p className={`font-bold text-sm ${trecho.kmPorLitro === -1 ? "text-gray-500 font-medium" : trecho.kmPorLitro >= 3 ? "text-emerald-700" : trecho.kmPorLitro >= 2 ? "text-amber-700" : "text-red-700"
                                          }`}>
                                          {trecho.kmPorLitro === -1 ? "Pendente" : `${trecho.kmPorLitro.toFixed(2)} km/l`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* KM and liters pill */}
                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                                  <span>KM: {trecho.kmFinal.toLocaleString("pt-BR")}</span>
                                  <span>•</span>
                                  <span>{trecho.liters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} litros</span>
                                  {trecho.isFull === false && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-500 font-medium uppercase tracking-tighter">Parcial</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* =================== TABLE VIEW =================== */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Veículo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">KM Inicial</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">KM Final</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Distância</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Litros</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                      <div className="flex items-center justify-center gap-1">
                        Consumo do Trecho
                        <div className="relative group">
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                            Desempenho entre abastecimentos: distância ÷ litros
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Posto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allTrechos.map((trecho) => {
                    const badge = !trecho.isFirst && trecho.kmPorLitro > 0 ? getConsumoBadge(trecho.kmPorLitro) : null;
                    return (
                      <tr key={trecho.recordId} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{getVehicleName(trecho.vehicleId)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatLocalDate(trecho.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{trecho.isFirst ? "-" : trecho.kmInicial.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{trecho.kmFinal.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {trecho.isFirst ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className="font-medium text-gray-900">{trecho.distancia.toLocaleString("pt-BR")} km</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{trecho.liters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">R$ {trecho.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          {trecho.isFirst ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-100">
                              <Info className="w-3 h-3" />
                              Aguardando
                            </span>
                          ) : trecho.kmPorLitro === -1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs border border-gray-200" title="Aguardando próximo tanque cheio para calcular">
                              Parcial
                            </span>
                          ) : badge ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                              {(() => { const Icon = badge.icon; return <Icon className="w-3 h-3" />; })()}
                              {trecho.kmPorLitro.toFixed(2)} km/l
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{trecho.posto}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleGenerateVoucher(trecho)}
                              disabled={generatingVoucher === trecho.recordId}
                              className="text-indigo-400 hover:text-indigo-600 transition disabled:opacity-50"
                              title="Gerar Comprovante (PDF)"
                            >
                              {generatingVoucher === trecho.recordId ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleEdit(trecho.recordId)} className="text-blue-400 hover:text-blue-600 transition" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteRecord(trecho.recordId)} className="text-red-400 hover:text-red-600 transition" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <FuelModal
          open={fuelModalOpen}
          onClose={() => { setFuelModalOpen(false); setEditingRecord(null); }}
          editingRecord={editingRecord}
          vehicles={vehicles}
          addRecord={addRecord}
          updateRecord={updateRecord}
        />

        <FuelReportModal
          open={reportModal !== null}
          onClose={() => setReportModal(null)}
          trechos={
            reportModal?.vehicleId
              ? (trechosPerVehicle[reportModal.vehicleId] || [])
              : Object.values(trechosPerVehicle).flat()
          }
          vehicles={vehicles}
          tenantName={tenant?.name}
          vehicleId={reportModal?.vehicleId}
          company={{ settings: companySettings }}
        />
      </main>
    </div>
  );
}

export default Fuel;
