import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Truck, LogOut, Menu, X, Fuel as FuelIcon, AlertCircle, Wrench, Droplets,
  Building2, ChevronRight, ParkingCircle, CircleDot, Milestone, RotateCcw,
  Shield, AlertOctagon, ArrowLeft, Settings, Users, TrendingUp, Activity,
  Gauge, BarChart3, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, ReferenceLine
} from "recharts";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { Skeleton } from "../components/shared/SkeletonLoader";
import VehicleFilter from "../components/shared/VehicleFilter";
import { DateFilterPicker } from "../components/shared/DateFilter";
import { useDateFilter } from "../hooks/useDateFilter";

export function Dashboard() {
  const { user, tenant, signOut, isSuperAdmin, isImpersonating, impersonatedTenant, stopImpersonation } = useAuth();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter();
  const {
    loading, metrics, costByCategory, vehicleConsumption,
    fleetAvgConsumption, dailyFuel, alertItems, recentActivity
  } = useDashboardMetrics(selectedVehicleId, dateFilter);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: "Frota", icon: Truck, path: "/fleet", color: "text-blue-600" },
    { label: "Abastecimento", icon: FuelIcon, path: "/fuel", color: "text-green-600" },
    { label: "Manutenção", icon: Wrench, path: "/maintenance", color: "text-orange-600" },
    { label: "Troca de Óleo", icon: Droplets, path: "/oil-change", color: "text-amber-600" },
    { label: "Fornecedores", icon: Users, path: "/suppliers", color: "text-teal-600" },
    { label: "Estacionamento", icon: ParkingCircle, path: "/parking", color: "text-violet-600" },
    { label: "Troca de Pneus", icon: CircleDot, path: "/tire-change", color: "text-slate-600" },
    { label: "Lavação", icon: Droplets, path: "/washing", color: "text-cyan-600" },
    { label: "Pedágios", icon: Milestone, path: "/tolls", color: "text-amber-700" },
    { label: "Rodízio", icon: RotateCcw, path: "/rotation", color: "text-indigo-600" },
    { label: "Seguros", icon: Shield, path: "/insurance", color: "text-emerald-600" },
    { label: "Sinistros", icon: AlertOctagon, path: "/accidents", color: "text-red-600" },
    { label: "Configurações", icon: Settings, path: "/settings", color: "text-gray-600" },
  ];

  if (isSuperAdmin) {
    navItems.push({ label: "SuperAdmin", icon: Building2, path: "/superadmin", color: "text-purple-600" });
  }

  const metricCards = [
    {
      label: "Veículos Ativos",
      value: metrics.vehiclesActive,
      subtitle: `${metrics.vehiclesInactive} inativos`,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      path: "/fleet",
    },
    {
      label: "Motoristas",
      value: metrics.driversCount,
      subtitle: "Ativos no sistema",
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      path: "/settings",
    },
    {
      label: "Abastecimentos (Mês)",
      value: metrics.fuelCountMonth,
      subtitle: `R$ ${metrics.fuelTotalMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: FuelIcon,
      color: "text-green-600",
      bgColor: "bg-green-50",
      path: "/fuel",
    },
    {
      label: "Manutenção (Mês)",
      value: `R$ ${(metrics.maintenanceCostMonth / 1000).toFixed(1)}k`,
      subtitle: "Custo total",
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      path: "/maintenance",
    },
    {
      label: "KM Rodados (Mês)",
      value: metrics.totalKmMonth > 0 ? `${(metrics.totalKmMonth / 1000).toFixed(1)}k` : "—",
      subtitle: "Distância total",
      icon: Gauge,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      path: "/fleet",
    },
    {
      label: "Consumo Médio",
      value: metrics.avgConsumption > 0 ? `${metrics.avgConsumption.toFixed(1)}` : "—",
      subtitle: "km/litro da frota",
      icon: TrendingUp,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      path: "/fuel",
    },
    {
      label: "Alertas Pendentes",
      value: alertItems.filter(a => a.urgency !== "green").length,
      subtitle: `${alertItems.filter(a => a.urgency === "red").length} urgentes`,
      icon: AlertCircle,
      color: alertItems.filter(a => a.urgency === "red").length > 0 ? "text-red-600" : "text-amber-600",
      bgColor: alertItems.filter(a => a.urgency === "red").length > 0 ? "bg-red-50" : "bg-amber-50",
      path: "/oil-change",
    },
  ];

  const CHART_COLORS = {
    combustivel: "#22c55e",
    manutencao: "#f97316",
    pneus: "#6366f1",
    lavagem: "#06b6d4",
    pedagio: "#eab308",
    estacionamento: "#8b5cf6",
  };

  const urgencyColors = {
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
    yellow: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
  };

  const CONSUMPTION_COLORS = ["#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4", "#fef9c3", "#fde68a", "#fbbf24", "#f59e0b"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation top bar */}
      {isImpersonating && impersonatedTenant && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">
                Visualizando: <strong>{impersonatedTenant.name}</strong>
              </span>
            </div>
            <button
              onClick={() => { stopImpersonation(); navigate("/superadmin"); }}
              className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar às Empresas
            </button>
          </div>
        </div>
      )}

      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                {isImpersonating ? impersonatedTenant?.name : 'Gerente de Frota'}
              </span>
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="hidden md:flex items-center gap-6">
              <VehicleFilter 
                value={selectedVehicleId} 
                onChange={setSelectedVehicleId} 
              />
              <DateFilterPicker value={dateFilter} onChange={setDateFilter} />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{tenant?.name}</p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => navigate("/superadmin")}
                  className="px-2 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  SUPERADMIN
                </button>
              )}
              <button onClick={() => signOut()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden pb-4 border-t">
              <div className="pt-4 pb-3 text-right border-b mb-4">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{tenant?.name}</p>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900 w-full py-3 px-2"
                >
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-3 text-gray-700 hover:text-gray-900 w-full py-3 px-2 border-t mt-2"
              >
                <LogOut className="w-5 h-5" /> Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} variant="card" count={1} />
              ))}
            </div>
            <Skeleton variant="table" count={6} />
          </div>
        ) : (
          <>
            {/* ===== METRIC CARDS ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
              {metricCards.map((card) => (
                <button
                  key={card.label}
                  onClick={() => navigate(card.path)}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all text-left group border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{card.label}</p>
                  <p className="text-xs text-gray-400 truncate">{card.subtitle}</p>
                </button>
              ))}
            </div>

            {/* ===== NAVIGATION GRID ===== */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all text-left group border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            {/* ===== CHARTS ROW 1: Custo por Categoria + Consumo por Veículo ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Custo por Categoria (6 meses) */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Custo por Categoria</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Últimos 6 meses</p>
                {costByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: any) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="combustivel" name="Combustível" fill={CHART_COLORS.combustivel} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="manutencao" name="Manutenção" fill={CHART_COLORS.manutencao} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="pneus" name="Pneus" fill={CHART_COLORS.pneus} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="lavagem" name="Lavagem" fill={CHART_COLORS.lavagem} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="pedagio" name="Pedágio" fill={CHART_COLORS.pedagio} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="estacionamento" name="Estacionamento" fill={CHART_COLORS.estacionamento} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </div>

              {/* Consumo por Veículo (Top 10) */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Consumo por Veículo</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Top 10 — km/litro (maior = melhor)</p>
                {vehicleConsumption.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vehicleConsumption} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(1)}`} />
                      <YAxis
                        dataKey="plate"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={90}
                      />
                      <Tooltip
                        formatter={(value: any) => `${Number(value).toFixed(2)} km/L`}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <ReferenceLine x={fleetAvgConsumption} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: `Média: ${fleetAvgConsumption.toFixed(1)}`, fontSize: 11, fill: "#64748b" }} />
                      <Bar dataKey="avgKmPerLiter" name="km/L" radius={[0, 4, 4, 0]}>
                        {vehicleConsumption.map((_, i) => (
                          <Cell key={i} fill={CONSUMPTION_COLORS[i] || "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    Sem dados de consumo disponíveis
                  </div>
                )}
              </div>
            </div>

            {/* ===== CHART: Abastecimentos por Dia ===== */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">Abastecimentos por Dia</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">Últimos 30 dias — quantidade e valor</p>
              {dailyFuel.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyFuel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      formatter={(value: any, name: any) => {
                        if (name === "Quantidade") return [value, name];
                        return [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      name="Quantidade"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalValue"
                      name="Valor (R$)"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400">
                  Sem abastecimentos nos últimos 30 dias
                </div>
              )}
            </div>

            {/* ===== BOTTOM: Alertas + Atividade Recente ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Mapa de Alertas */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Alertas</h2>
                </div>
                {alertItems.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {alertItems.map((alert) => {
                      const colors = urgencyColors[alert.urgency];
                      return (
                        <button
                          key={alert.id}
                          onClick={() => navigate(alert.path)}
                          className={`w-full text-left p-3 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-sm transition-all`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {alert.plate} — {alert.model}
                              </p>
                              <p className={`text-xs ${colors.text} mt-0.5`}>
                                {alert.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {alert.alertType}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Shield className="w-10 h-10 mb-2 text-green-400" />
                    <p className="text-sm font-medium text-green-600">Tudo em dia!</p>
                    <p className="text-xs">Nenhum alerta ativo</p>
                  </div>
                )}
              </div>

              {/* Atividade Recente */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">Atividade Recente</h2>
                </div>
                {recentActivity.length > 0 ? (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            activity.type === "Abastecimento" ? "bg-green-500" :
                            activity.type === "Manutenção" ? "bg-orange-500" :
                            "bg-blue-500"
                          }`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.type}
                              {activity.vehiclePlate && (
                                <span className="text-gray-500 font-normal"> — {activity.vehiclePlate}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {new Date(activity.date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Nenhuma atividade recente
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
