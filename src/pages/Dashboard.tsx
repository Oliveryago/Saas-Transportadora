import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Truck, LogOut, Menu, X, Fuel as FuelIcon, AlertCircle, Wrench, Droplets, Building2, ChevronRight, ParkingCircle, CircleDot, Milestone, RotateCcw, Shield, AlertOctagon, ArrowLeft } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { useImplements } from "../hooks/useImplements";
import { useFuelRecords } from "../hooks/useFuelRecords";
import { useOilChangeAlerts } from "../hooks/useOilChangeAlerts";
import { useMaintenanceRecords } from "../hooks/useMaintenanceRecords";

export function Dashboard() {
  const { user, tenant, signOut, isSuperAdmin, isImpersonating, impersonatedTenant, stopImpersonation } = useAuth();
  const { vehicles } = useVehicles();
  const { implements: implements_ } = useImplements();
  const { records: fuelRecords, getLatestKmByVehicle } = useFuelRecords();
  const { alerts, getPendingAlerts } = useOilChangeAlerts();
  const { records: maintenanceRecords } = useMaintenanceRecords();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const kmMap = getLatestKmByVehicle();
  const pendingAlerts = getPendingAlerts(vehicles, kmMap);
  const thisMonthFuel = fuelRecords.filter((r) => {
    const d = new Date(r.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const navItems = [
    { label: "Frota", icon: Truck, path: "/fleet", color: "text-blue-600", count: vehicles.length },
    { label: "Abastecimento", icon: FuelIcon, path: "/fuel", color: "text-green-600", count: fuelRecords.length },
    { label: "Manutenção", icon: Wrench, path: "/maintenance", color: "text-orange-600", count: maintenanceRecords.length },
    { label: "Troca de Óleo", icon: Droplets, path: "/oil-change", color: "text-amber-600", count: alerts.length },
    { label: "Fornecedores", icon: Building2, path: "/suppliers", color: "text-teal-600", count: 0 },
    { label: "Estacionamento", icon: ParkingCircle, path: "/parking", color: "text-violet-600", count: 0 },
    { label: "Troca de Pneus", icon: CircleDot, path: "/tire-change", color: "text-slate-600", count: 0 },
    { label: "Lavação", icon: Droplets, path: "/washing", color: "text-cyan-600", count: 0 },
    { label: "Pedágios", icon: Milestone, path: "/tolls", color: "text-amber-700", count: 0 },
    { label: "Rodízio", icon: RotateCcw, path: "/rotation", color: "text-indigo-600", count: 0 },
    { label: "Seguros", icon: Shield, path: "/insurance", color: "text-emerald-600", count: 0 },
    { label: "Sinistros", icon: AlertOctagon, path: "/accidents", color: "text-red-600", count: 0 },
  ];

  if (isSuperAdmin) {
    navItems.push({ label: "SuperAdmin", icon: Building2, path: "/superadmin", color: "text-purple-600", count: 0 });
  }

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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div
            onClick={() => navigate("/fleet")}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Cavalos Mecânicos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{vehicles.length}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div
            onClick={() => navigate("/fleet")}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Implementos Ativos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{implements_.filter((i) => i.active).length}</p>
              </div>
              <Truck className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div
            onClick={() => navigate("/fuel")}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Abastecimentos (Mês)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{thisMonthFuel.length}</p>
              </div>
              <FuelIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div
            onClick={() => navigate("/oil-change")}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Alertas Pendentes</p>
                <p className={`text-3xl font-bold mt-2 ${pendingAlerts.length > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {pendingAlerts.length}
                </p>
              </div>
              <AlertCircle className={`w-8 h-8 ${pendingAlerts.length > 0 ? "text-red-600" : "text-gray-400"}`} />
            </div>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <span className="font-semibold text-gray-900">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        {/* Bottom sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Últimos Abastecimentos
            </h2>
            {fuelRecords.length > 0 ? (
              <div className="space-y-3">
                {fuelRecords.slice(0, 5).map((r) => {
                  const vehicle = vehicles.find((v) => v.id === r.vehicle_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{vehicle?.license_plate || "?"} - {vehicle?.model || "?"}</p>
                        <p className="text-xs text-gray-500">{r.liters.toFixed(1)}L &middot; R$ {(r.value_brl || 0).toFixed(2)}</p>
                      </div>
                      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Nenhum abastecimento registrado ainda
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Alertas de Manutenção
            </h2>
            {pendingAlerts.length > 0 ? (
              <div className="space-y-3">
                {pendingAlerts.map((a) => {
                  const vehicle = vehicles.find((v) => v.id === a.vehicle_id);
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{vehicle?.license_plate || "?"}</p>
                        <p className="text-xs text-red-600">Troca de óleo pendente</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Nenhum alerta ativo
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
