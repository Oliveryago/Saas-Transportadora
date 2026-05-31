import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useReportData, type ReportType } from "../hooks/useReportData";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { exportToPDF, exportToExcel, formatBRL, formatDate } from "../services/reportExporter";
import { urlToDataURL } from "../services/companySettingsHelper";
import {
  ArrowLeft, FileText, FileSpreadsheet, Search,
  Truck, Fuel, Wrench, Users, DollarSign, BarChart3, Loader2
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Skeleton } from "../components/shared/SkeletonLoader";
import { getLocalDateString } from "../lib/utils/date";

const REPORT_CONFIGS: Record<ReportType, {
  title: string;
  icon: any;
  description: string;
  color: string;
}> = {
  "vehicle-cost": {
    title: "Custo por Veículo",
    icon: Truck,
    description: "Custos totais de cada veículo por categoria",
    color: "text-blue-600",
  },
  "fuel-consumption": {
    title: "Consumo de Combustível",
    icon: Fuel,
    description: "Histórico de abastecimentos com consumo",
    color: "text-green-600",
  },
  maintenance: {
    title: "Manutenções",
    icon: Wrench,
    description: "Manutenções realizadas por veículo e tipo",
    color: "text-orange-600",
  },
  drivers: {
    title: "Motoristas",
    icon: Users,
    description: "Desempenho e eficiência por motorista",
    color: "text-purple-600",
  },
  financial: {
    title: "Financeiro Consolidado",
    icon: DollarSign,
    description: "Visão geral de todos os custos da frota",
    color: "text-emerald-600",
  },
};

const PIE_COLORS = ["#22c55e", "#f97316", "#6366f1", "#06b6d4", "#eab308", "#8b5cf6"];

export function Reports() {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const { settings: companySettings } = useCompanySettings();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");

  const { data, vehicles, drivers, loading, error, fetchReport } = useReportData(
    selectedReport || "vehicle-cost",
    {
      startDate: `${startDate}T00:00:00`,
      endDate: `${endDate}T23:59:59`,
      vehicleId: vehicleFilter || undefined,
      driverId: driverFilter || undefined,
    }
  );

  const handleGenerate = useCallback(() => {
    if (!selectedReport) return;
    fetchReport();
  }, [selectedReport, fetchReport]);

  const periodLabel = `${formatDate(startDate)} a ${formatDate(endDate)}`;

  async function handleExportPDF() {
    if (!selectedReport || data.length === 0) return;
    const config = REPORT_CONFIGS[selectedReport];
    const cols = getColumns(selectedReport);
    const logoDataUrl = companySettings?.logo_url
      ? await urlToDataURL(companySettings.logo_url)
      : null;
    await exportToPDF(
      { columns: cols, rows: formatRows(selectedReport, data) },
      {
        title: config.title,
        company: { settings: companySettings, logoDataUrl },
        companyName: tenant?.name,
        period: periodLabel,
      }
    );
  }

  async function handleExportExcel() {
    if (!selectedReport || data.length === 0) return;
    const config = REPORT_CONFIGS[selectedReport];
    const cols = getColumns(selectedReport);
    await exportToExcel(
      { columns: cols, rows: formatRows(selectedReport, data) },
      {
        title: config.title,
        company: { settings: companySettings },
        companyName: tenant?.name,
        period: periodLabel,
      }
    );
  }

  function getColumns(type: ReportType) {
    switch (type) {
      case "vehicle-cost":
        return [
          { header: "Placa", dataKey: "plate" },
          { header: "Modelo", dataKey: "model" },
          { header: "KM Rodados", dataKey: "kmRun", align: "right" as const },
          { header: "Combustível", dataKey: "fuel", align: "right" as const },
          { header: "Manutenção", dataKey: "maintenance", align: "right" as const },
          { header: "Pneus", dataKey: "tires", align: "right" as const },
          { header: "Lavagem", dataKey: "washing", align: "right" as const },
          { header: "Pedágio", dataKey: "tolls", align: "right" as const },
          { header: "Estacion.", dataKey: "parking", align: "right" as const },
          { header: "Total", dataKey: "total", align: "right" as const },
          { header: "R$/km", dataKey: "costPerKm", align: "right" as const },
        ];
      case "fuel-consumption":
        return [
          { header: "Data", dataKey: "date" },
          { header: "Placa", dataKey: "plate" },
          { header: "Motorista", dataKey: "driver" },
          { header: "KM", dataKey: "km", align: "right" as const },
          { header: "Litros", dataKey: "liters", align: "right" as const },
          { header: "Valor", dataKey: "value", align: "right" as const },
          { header: "R$/Litro", dataKey: "pricePerLiter", align: "right" as const },
          { header: "Posto", dataKey: "station" },
        ];
      case "maintenance":
        return [
          { header: "Data", dataKey: "date" },
          { header: "Placa", dataKey: "plate" },
          { header: "Tipo", dataKey: "type" },
          { header: "Descrição", dataKey: "description" },
          { header: "Peças", dataKey: "partsCount", align: "center" as const },
          { header: "Custo Peças", dataKey: "partsCost", align: "right" as const },
          { header: "Valor Total", dataKey: "totalValue", align: "right" as const },
        ];
      case "drivers":
        return [
          { header: "Motorista", dataKey: "name" },
          { header: "KM Rodados", dataKey: "kmRun", align: "right" as const },
          { header: "Abastecimentos", dataKey: "fuelCount", align: "center" as const },
          { header: "Custo Combustível", dataKey: "fuelCost", align: "right" as const },
          { header: "Acidentes", dataKey: "accidents", align: "center" as const },
          { header: "Média km/L", dataKey: "avgConsumption", align: "right" as const },
        ];
      case "financial":
        return [
          { header: "Categoria", dataKey: "category" },
          { header: "Registros", dataKey: "count", align: "center" as const },
          { header: "Valor", dataKey: "value", align: "right" as const },
          { header: "% do Total", dataKey: "percentage", align: "right" as const },
        ];
    }
  }

  function formatRows(type: ReportType, rows: any[]) {
    switch (type) {
      case "vehicle-cost":
        return rows.map(r => ({
          ...r,
          kmRun: r.kmRun.toLocaleString("pt-BR"),
          fuel: formatBRL(r.fuel),
          maintenance: formatBRL(r.maintenance),
          tires: formatBRL(r.tires),
          washing: formatBRL(r.washing),
          tolls: formatBRL(r.tolls),
          parking: formatBRL(r.parking),
          total: formatBRL(r.total),
          costPerKm: r.costPerKm > 0 ? formatBRL(r.costPerKm) : "-",
        }));
      case "fuel-consumption":
        return rows.map(r => ({
          ...r,
          date: formatDate(r.date),
          km: r.km.toLocaleString("pt-BR"),
          liters: r.liters.toFixed(1),
          value: formatBRL(r.value),
          pricePerLiter: r.pricePerLiter > 0 ? formatBRL(r.pricePerLiter) : "-",
        }));
      case "maintenance":
        return rows.map(r => ({
          ...r,
          date: formatDate(r.date),
          partsCost: formatBRL(r.partsCost),
          totalValue: formatBRL(r.totalValue),
        }));
      case "drivers":
        return rows.map(r => ({
          ...r,
          kmRun: r.kmRun.toLocaleString("pt-BR"),
          fuelCost: formatBRL(r.fuelCost),
          avgConsumption: r.avgConsumption > 0 ? r.avgConsumption.toFixed(2) : "-",
        }));
      case "financial":
        return rows.map(r => ({
          ...r,
          value: formatBRL(r.value),
          percentage: `${r.percentage.toFixed(1)}%`,
        }));
    }
  }

  // Report selection screen
  if (!selectedReport) {
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
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-500 mb-6">Selecione o tipo de relatório que deseja gerar:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(REPORT_CONFIGS) as [ReportType, typeof REPORT_CONFIGS[ReportType]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedReport(key)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center mb-4 transition-colors`}>
                  <config.icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{config.title}</h3>
                <p className="text-sm text-gray-500">{config.description}</p>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const config = REPORT_CONFIGS[selectedReport];
  const formattedData = data.length > 0 ? formatRows(selectedReport, data) : [];
  const columns = getColumns(selectedReport);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedReport(null)} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <config.icon className={`w-5 h-5 ${config.color}`} />
                <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
              </div>
            </div>
            {data.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
              />
            </div>
            {(selectedReport === "vehicle-cost" || selectedReport === "fuel-consumption" || selectedReport === "maintenance") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Veículo</label>
                <select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                >
                  <option value="">Todos</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
                  ))}
                </select>
              </div>
            )}
            {(selectedReport === "fuel-consumption" || selectedReport === "drivers") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Motorista</label>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                >
                  <option value="">Todos</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Gerar
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <Skeleton variant="table" count={8} />}

        {/* Results */}
        {!loading && data.length > 0 && (
          <>
            {/* Financial pie chart */}
            {selectedReport === "financial" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4">Distribuição por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.filter(d => d.category !== "TOTAL" && d.value > 0)}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category, percentage }: any) => `${category} (${percentage.toFixed(1)}%)`}
                    >
                      {data.filter(d => d.category !== "TOTAL").map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Data table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {data.length} registro{data.length !== 1 ? "s" : ""} encontrado{data.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-gray-400">{periodLabel}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.dataKey}
                          className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formattedData.map((row: any, i: number) => {
                      const isTotal = row.category === "TOTAL";
                      return (
                        <tr
                          key={i}
                          className={`hover:bg-gray-50 transition ${isTotal ? "bg-indigo-50 font-bold" : ""}`}
                        >
                          {columns.map((col) => (
                            <td
                              key={col.dataKey}
                              className={`px-4 py-3 text-sm ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${isTotal ? "text-indigo-900" : "text-gray-700"}`}
                            >
                              {row[col.dataKey] ?? "-"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && data.length === 0 && selectedReport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 text-lg">Nenhum dado encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Selecione o período e clique em "Gerar"</p>
          </div>
        )}
      </main>
    </div>
  );
}
