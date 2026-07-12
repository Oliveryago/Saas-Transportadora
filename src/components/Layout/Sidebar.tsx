import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
    LayoutDashboard,
    Truck,
    Fuel,
    Wrench,
    Droplet,
    Users,
    Car,
    Disc,
    SprayCan,
    Ticket,
    RefreshCcw,
    ShieldCheck,
    AlertOctagon,
    Settings,
    Building2,
    BarChart2,
    ArrowLeft,
    Search,
    UserCircle
} from "lucide-react";
import { NotificationBell } from "../shared/NotificationBell";

export function Sidebar() {
    const { user, isSuperAdmin, isImpersonating, impersonatedTenant, stopImpersonation } = useAuth();
    const navigate = useNavigate();

    const menuItems = [
        { to: "/", icon: LayoutDashboard, label: "Dashboard", allowedRoles: ["superadmin", "admin", "manager", "driver"] },
        { to: "/financial", icon: BarChart2, label: "Financeiro", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/fleet", icon: Truck, label: "Frota", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/drivers", icon: UserCircle, label: "Motoristas", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/fuel", icon: Fuel, label: "Abastecimento", allowedRoles: ["superadmin", "admin", "manager", "driver"] },
        { to: "/maintenance", icon: Wrench, label: "Manutenção", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/oil-change", icon: Droplet, label: "Troca de Óleo", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/tire-change", icon: Disc, label: "Troca de Pneus", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/rotation", icon: RefreshCcw, label: "Rodízio", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/washing", icon: SprayCan, label: "Lavagem", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/parking", icon: Car, label: "Estacionamento", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/tolls", icon: Ticket, label: "Pedágios", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/insurance", icon: ShieldCheck, label: "Seguros", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/accidents", icon: AlertOctagon, label: "Sinistros", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/settings", icon: Settings, label: "Configurações", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/suppliers", icon: Users, label: "Fornecedores", allowedRoles: ["superadmin", "admin", "manager"] },
        { to: "/reports", icon: BarChart2, label: "Relatórios", allowedRoles: ["superadmin", "admin", "manager"] },
    ].filter(item => user && (item.allowedRoles.includes(user.role) || isSuperAdmin));

    function handleStopImpersonation() {
        stopImpersonation();
        navigate("/superadmin");
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white overflow-y-auto z-40 hidden md:block">
            {/* Impersonation Banner */}
            {isImpersonating && impersonatedTenant && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-white" />
                        <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Visualizando</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{impersonatedTenant.name}</p>
                    <button
                        onClick={handleStopImpersonation}
                        className="flex items-center gap-1 mt-2 text-xs text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors w-full justify-center font-medium"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Voltar às Empresas
                    </button>
                </div>
            )}

            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                        Transportadora
                    </h1>
                    <NotificationBell />
                </div>
                
                <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg transition-colors group"
                >
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                        <span className="text-sm font-medium group-hover:text-slate-200">Busca Rápida</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded bg-slate-900 border border-slate-600 font-mono text-[10px] text-slate-400 font-bold shadow-sm">Ctrl</kbd>
                        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded bg-slate-900 border border-slate-600 font-mono text-[10px] text-slate-400 font-bold shadow-sm">K</kbd>
                    </div>
                </button>
            </div>

            <nav className="px-4 pb-6">
                <ul className="space-y-1">
                    {menuItems.map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}

                    {isSuperAdmin && (
                        <>
                            <li className="pt-3">
                                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sistema</p>
                            </li>
                            <li>
                                <NavLink
                                    to="/superadmin"
                                    onClick={() => { if (isImpersonating) stopImpersonation(); }}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? "bg-amber-500 text-white"
                                            : "text-amber-400 hover:text-white hover:bg-amber-500/20"
                                        }`
                                    }
                                >
                                    <Building2 className="w-5 h-5" />
                                    <span className="font-medium">SuperAdmin</span>
                                </NavLink>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </aside>
    );
}
