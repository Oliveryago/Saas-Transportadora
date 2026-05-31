import React, { useState, useMemo } from "react";
import { X, FileText, Download, Calendar, Loader2 } from "lucide-react";
import type { CompanySettings } from "../../types";

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

interface VehicleInfo {
  id: string;
  license_plate: string;
  model: string;
}

interface CompanyInfo {
  settings?: CompanySettings | null;
  logoDataUrl?: string | null;
}

interface FuelReportModalProps {
  open: boolean;
  onClose: () => void;
  trechos: TrechoData[];
  vehicles: VehicleInfo[];
  tenantName?: string;
  vehicleId?: string;
  company?: CompanyInfo;
}

function getMonthOptions(trechos: TrechoData[]) {
  const months = new Set<string>();
  trechos.forEach((t) => {
    const d = t.date.split("T")[0];
    const [year, month] = d.split("-");
    months.add(`${year}-${month}`);
  });
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((m) => {
      const [year, month] = m.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
}

export function FuelReportModal({
  open,
  onClose,
  trechos,
  vehicles,
  tenantName,
  vehicleId,
  company,
}: FuelReportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [loading, setLoading] = useState(false);

  const monthOptions = useMemo(() => getMonthOptions(trechos), [trechos]);

  const filteredTrechos = useMemo(() => {
    if (selectedMonth === "all") return trechos;
    return trechos.filter((t) => {
      const d = t.date.split("T")[0];
      const [year, month] = d.split("-");
      return `${year}-${month}` === selectedMonth;
    });
  }, [trechos, selectedMonth]);

  const vehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) : null;

  const summary = useMemo(() => {
    const trechosComConsumo = filteredTrechos.filter((t) => !t.isFirst && t.kmPorLitro > 0);
    const totalKm = trechosComConsumo.reduce((s, t) => s + t.distancia, 0);
    const totalLitros = filteredTrechos.reduce((s, t) => s + t.liters, 0);
    const totalValor = filteredTrechos.reduce((s, t) => s + t.valorTotal, 0);
    const consumableLiters = trechosComConsumo.reduce((s, t) => s + t.liters, 0);
    const avgKmL = consumableLiters > 0 ? totalKm / consumableLiters : 0;
    return { totalKm, totalLitros, totalValor, avgKmL, count: filteredTrechos.length };
  }, [filteredTrechos]);

  async function handleGenerate() {
    if (filteredTrechos.length === 0) {
      alert("Nenhum registro encontrado para o período selecionado.");
      return;
    }
    setLoading(true);
    try {
      if (format === "pdf") {
        const { generateFuelReportPDF } = await import("../../services/fuelReportGenerator");
        await generateFuelReportPDF(filteredTrechos, vehicles, tenantName, vehicleId, selectedMonth, company);
      } else {
        const { generateFuelReportExcel } = await import("../../services/fuelReportGenerator");
        await generateFuelReportExcel(filteredTrechos, vehicles, tenantName, vehicleId, selectedMonth, company);
      }
      onClose();
    } catch (e) {
      console.error("Erro ao gerar relatório:", e);
      alert("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Gerar Relatório</h2>
              <p className="text-xs text-gray-500">
                {vehicle ? `${vehicle.license_plate} — ${vehicle.model}` : "Frota Completa"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Period filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Período
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-gray-50"
            >
              <option value="all">Todos os períodos</option>
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Format selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Formato</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition ${
                  format === "pdf"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition ${
                  format === "excel"
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <FileText className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Preview summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Prévia do Período</p>
            {filteredTrechos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">Nenhum registro encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Registros</p>
                  <p className="font-bold text-gray-800">{summary.count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Custo Total</p>
                  <p className="font-bold text-emerald-700">
                    R$ {summary.totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Litros</p>
                  <p className="font-bold text-gray-800">
                    {summary.totalLitros.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Consumo Médio</p>
                  <p className="font-bold text-gray-800">
                    {summary.avgKmL > 0 ? `${summary.avgKmL.toFixed(2)} km/l` : "-"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || filteredTrechos.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loading ? "Gerando..." : "Gerar Relatório"}
          </button>
        </div>
      </div>
    </div>
  );
}
