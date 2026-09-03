import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Fuel, 
  Wrench, 
  Truck, 
  Menu, 
  X,
  Droplet,
  Disc,
  RefreshCcw,
  SprayCan,
  Car,
  Ticket,
  ShieldCheck,
  AlertOctagon,
  Settings,
  Users,
  BarChart2,
  Search,
  UserCircle
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { NotificationBell } from "../shared/NotificationBell";
import { useNotifications } from "../../contexts/NotificationContext";

export function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isSuperAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  const mainItems = [
    { to: "/", icon: LayoutDashboard, label: "Início", allowedRoles: ["superadmin", "admin", "manager", "driver"] },
    { to: "/fuel", icon: Fuel, label: "Abastecer", allowedRoles: ["superadmin", "admin", "manager", "driver"] },
    { to: "/fleet", icon: Truck, label: "Frota", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/maintenance", icon: Wrench, label: "Oficina", allowedRoles: ["superadmin", "admin", "manager"] },
  ].filter(item => user && item.allowedRoles.includes(user.role));

  const secondaryItems = [
    { to: "/drivers", icon: UserCircle, label: "Motoristas", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "#search", icon: Search, label: "Busca Rápida", action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })), allowedRoles: ["superadmin", "admin", "manager", "driver"] },
    { to: "/oil-change", icon: Droplet, label: "Troca de Óleo", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/tire-change", icon: Disc, label: "Troca de Pneus", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/rotation", icon: RefreshCcw, label: "Rodízio", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/washing", icon: SprayCan, label: "Lavagem", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/parking", icon: Car, label: "Estacionar", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/tolls", icon: Ticket, label: "Pedágios", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/insurance", icon: ShieldCheck, label: "Seguros", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/accidents", icon: AlertOctagon, label: "Sinistros", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/suppliers", icon: Users, label: "Fornecedores", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/financial", icon: BarChart2, label: "Financeiro", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/reports", icon: BarChart2, label: "Relatórios", allowedRoles: ["superadmin", "admin", "manager"] },
    { to: "/settings", icon: Settings, label: "Configurações", allowedRoles: ["superadmin", "admin", "manager"] },
  ].filter(item => user && item.allowedRoles.includes(user.role));

  return (
    <>
      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden"></div>

      {/* Main Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 md:hidden flex justify-around items-center pb-safe">
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full py-2 ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-6 h-6 mb-1 transition-transform ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          className="relative flex flex-col items-center justify-center w-full py-2 text-gray-500 hover:text-gray-900"
        >
          <div className="relative">
            <Menu className="w-6 h-6 mb-1" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {/* Full Sheet Menu Modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-white md:hidden overflow-y-auto pb-safe animate-in slide-in-from-bottom-full duration-300">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Menu Completo
            </h2>
            <div className="flex items-center gap-2">
                <NotificationBell variant="light" />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-2">Serviços e Frota</p>
            <div className="grid grid-cols-2 gap-2">
              {secondaryItems.map((item, idx) => {
                if (item.action) {
                  return (
                    <button
                      key={"action-" + idx}
                      onClick={() => { setMenuOpen(false); item.action(); }}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-slate-800 border-slate-700 text-slate-200 shadow-sm"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0 text-blue-400" />
                      <span className="text-sm truncate font-medium">{item.label}</span>
                    </button>
                  );
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-xl border ${
                        isActive 
                          ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" 
                          : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {isSuperAdmin && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">Administração</p>
                <div className="grid grid-cols-1 gap-2">
                  <NavLink
                    to="/superadmin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-semibold">Acesso SuperAdmin</span>
                  </NavLink>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
