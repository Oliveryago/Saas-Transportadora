import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
    ArrowLeft, LogOut, Building2, Users, Truck,
    ChevronRight, Search, Plus, X, Eye, EyeOff,
    UserPlus, AlertCircle, CheckCircle2, Trash2,
    CheckCircle, Clock, XCircle, ChevronDown
} from "lucide-react";
import type { Tenant } from "../types";

type TenantStatus = "active" | "inactive" | "negotiating";

interface TenantWithStats extends Tenant {
    user_count: number;
    vehicle_count: number;
    implement_count: number;
    status: TenantStatus;
}

interface TenantUser {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

type ModalType = "company" | "user" | "delete" | null;
type AlertMsg = { type: "success" | "error"; text: string } | null;

const STATUS_CONFIG: Record<TenantStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    active: { label: "Ativa", color: "text-green-700", bg: "bg-green-50", border: "border-green-500", icon: CheckCircle },
    negotiating: { label: "Em Processo de Contrato", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-500", icon: Clock },
    inactive: { label: "Desativada", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-400", icon: XCircle },
};

export function SuperAdmin() {
    const { user, signOut, isSuperAdmin, impersonateTenant } = useAuth();
    const navigate = useNavigate();
    const [tenants, setTenants] = useState<TenantWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
    const [selectedTenant, setSelectedTenant] = useState<TenantWithStats | null>(null);
    const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
    const [tenantVehicles, setTenantVehicles] = useState<any[]>([]);
    const [modal, setModal] = useState<ModalType>(null);
    const [alertMsg, setAlertMsg] = useState<AlertMsg>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<TenantWithStats | null>(null);
    const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

    // Company form
    const [companyName, setCompanyName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminName, setAdminName] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [newCompanyStatus, setNewCompanyStatus] = useState<TenantStatus>("active");

    // User form
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<"admin" | "driver">("admin");

    useState(() => {
        if (!isSuperAdmin) { navigate("/"); return; }
        fetchTenants();
    });

    async function fetchTenants() {
        setLoading(true);
        try {
            const { data: allTenants } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
            const { data: allUsers } = await supabase.from("users").select("id, tenant_id");
            const { data: allVehicles } = await supabase.from("vehicles").select("id, tenant_id");
            const { data: allImplements } = await supabase.from("implements").select("id, tenant_id");

            const enriched = (allTenants || []).map((t: any) => ({
                ...t,
                status: (t.status as TenantStatus) || "active",
                user_count: (allUsers || []).filter((u: any) => u.tenant_id === t.id).length,
                vehicle_count: (allVehicles || []).filter((v: any) => v.tenant_id === t.id).length,
                implement_count: (allImplements || []).filter((i: any) => i.tenant_id === t.id).length,
            }));
            setTenants(enriched);
        } catch (err) {
            console.error("Error fetching tenants:", err);
        } finally {
            setLoading(false);
        }
    }

    function handleEnterCompany(tenant: TenantWithStats) {
        impersonateTenant(tenant);
        navigate("/");
    }

    async function viewTenantDetails(tenant: TenantWithStats) {
        setSelectedTenant(tenant);
        const { data: users } = await supabase.from("users").select("*").eq("tenant_id", tenant.id).order("created_at");
        const { data: vehicles } = await supabase.from("vehicles").select("*").eq("tenant_id", tenant.id);
        setTenantUsers(users || []);
        setTenantVehicles(vehicles || []);
    }

    async function handleChangeStatus(tenantId: string, newStatus: TenantStatus) {
        setStatusMenuId(null);
        const { error } = await supabase.from("tenants").update({ status: newStatus }).eq("id", tenantId);
        if (!error) {
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
            if (selectedTenant?.id === tenantId) setSelectedTenant(prev => prev ? { ...prev, status: newStatus } : null);
        }
    }

    async function handleDeleteTenant() {
        if (!tenantToDelete) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from("tenants").delete().eq("id", tenantToDelete.id);
            if (error) throw error;
            setTenants(prev => prev.filter(t => t.id !== tenantToDelete.id));
            setModal(null);
            setTenantToDelete(null);
            if (selectedTenant?.id === tenantToDelete.id) setSelectedTenant(null);
        } catch (err: any) {
            setAlertMsg({ type: "error", text: err.message || "Erro ao excluir empresa" });
        } finally {
            setSubmitting(false);
        }
    }

    function resetModal() {
        setModal(null);
        setAlertMsg(null);
        setCompanyName(""); setAdminEmail(""); setAdminName(""); setAdminPassword("");
        setNewCompanyStatus("active");
        setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNewUserRole("admin");
        setShowPassword(false);
        setTenantToDelete(null);
    }

    async function handleCreateCompany(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setAlertMsg(null);
        try {
            const { data: tenant, error: tenantError } = await supabase
                .from("tenants")
                .insert([{ name: companyName, subscription_plan: "basic", status: newCompanyStatus }])
                .select().single();
            if (tenantError) throw tenantError;

            const res = await supabase.functions.invoke("create-user", {
                body: {
                    email: adminEmail,
                    password: adminPassword,
                    name: adminName,
                    tenant_id: tenant.id,
                    role: "admin",
                },
            });

            if (res.error) throw new Error(res.error.message);
            if (res.data?.error) throw new Error(res.data.error);

            setAlertMsg({ type: "success", text: `Empresa "${companyName}" criada com sucesso!` });
            await fetchTenants();
            setTimeout(resetModal, 2000);
        } catch (err: any) {
            setAlertMsg({ type: "error", text: err.message || "Erro ao criar empresa" });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTenant) return;
        setSubmitting(true);
        setAlertMsg(null);
        try {
            const res = await supabase.functions.invoke("create-user", {
                body: {
                    email: newUserEmail,
                    password: newUserPassword,
                    name: newUserName,
                    tenant_id: selectedTenant.id,
                    role: newUserRole,
                },
            });

            if (res.error) throw new Error(res.error.message);
            if (res.data?.error) throw new Error(res.data.error);

            setAlertMsg({ type: "success", text: `Usuário "${newUserName}" criado com sucesso!` });
            await viewTenantDetails(selectedTenant);
            setTimeout(resetModal, 2000);
        } catch (err: any) {
            setAlertMsg({ type: "error", text: err.message || "Erro ao criar usuário" });
        } finally {
            setSubmitting(false);
        }
    }

    const filteredTenants = tenants.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const statusCounts = {
        all: tenants.length,
        active: tenants.filter(t => t.status === "active").length,
        negotiating: tenants.filter(t => t.status === "negotiating").length,
        inactive: tenants.filter(t => t.status === "inactive").length,
    };

    const roleLabel: Record<string, string> = {
        superadmin: "SuperAdmin",
        admin: "Admin Empresa",
        manager: "Gestor",
        driver: "Motorista",
    };

    const roleBadge: Record<string, string> = {
        superadmin: "bg-purple-100 text-purple-700",
        admin: "bg-blue-100 text-blue-700",
        manager: "bg-teal-100 text-teal-700",
        driver: "bg-gray-100 text-gray-700",
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-50" onClick={() => setStatusMenuId(null)}>
            {/* Header */}
            <nav className="bg-gradient-to-r from-indigo-700 to-purple-700 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate("/")} className="text-white/70 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-white" />
                                <h1 className="text-xl font-bold text-white">Painel SuperAdmin</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-white/80">{user?.name}</span>
                            <span className="px-2 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold">SUPERADMIN</span>
                            <button onClick={() => signOut()} className="text-white/70 hover:text-white">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!selectedTenant ? (
                    <>
                        {/* Overview Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {(["all", "active", "negotiating", "inactive"] as const).map((s) => {
                                const cfg = s === "all"
                                    ? { label: "Total de Empresas", color: "text-indigo-700", icon: Building2, iconColor: "text-indigo-600" }
                                    : { label: STATUS_CONFIG[s].label, color: STATUS_CONFIG[s].color, icon: STATUS_CONFIG[s].icon, iconColor: STATUS_CONFIG[s].color };
                                const Icon = cfg.icon;
                                const isActive = statusFilter === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`bg-white rounded-lg shadow p-5 text-left transition-all border-2 ${isActive ? "border-indigo-500 shadow-md" : "border-transparent hover:border-gray-200"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-500 text-xs mb-1">{cfg.label}</p>
                                                <p className={`text-3xl font-bold ${cfg.color}`}>{statusCounts[s]}</p>
                                            </div>
                                            <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search + Add */}
                        <div className="flex gap-3 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar empresa..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                onClick={() => setModal("company")}
                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                            >
                                <Plus className="w-5 h-5" /> Nova Empresa
                            </button>
                        </div>

                        {/* Status filter pills */}
                        {statusFilter !== "all" && (
                            <div className="mb-4 flex items-center gap-2">
                                <span className="text-sm text-gray-600">Filtrando por:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[statusFilter].bg} ${STATUS_CONFIG[statusFilter].color}`}>
                                    {STATUS_CONFIG[statusFilter].label}
                                </span>
                                <button onClick={() => setStatusFilter("all")} className="text-xs text-gray-400 hover:text-gray-600 underline">
                                    Limpar filtro
                                </button>
                            </div>
                        )}

                        {/* Tenant list */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredTenants.map((tenant) => {
                                    const scfg = STATUS_CONFIG[tenant.status];
                                    const StatusIcon = scfg.icon;
                                    return (
                                        <div
                                            key={tenant.id}
                                            className={`bg-white rounded-lg shadow p-5 border-l-4 ${scfg.border} transition-shadow hover:shadow-lg`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => handleEnterCompany(tenant)}
                                                >
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="text-lg font-bold text-gray-900">{tenant.name}</h3>
                                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${scfg.bg} ${scfg.color}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {scfg.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-4 h-4" /> {tenant.user_count} usuário{tenant.user_count !== 1 ? "s" : ""}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Truck className="w-4 h-4" /> {tenant.vehicle_count} veículo{tenant.vehicle_count !== 1 ? "s" : ""}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                            {tenant.subscription_plan}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 ml-4" onClick={e => e.stopPropagation()}>
                                                    {/* Status dropdown */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setStatusMenuId(statusMenuId === tenant.id ? null : tenant.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                                        >
                                                            Alterar Status <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                        {statusMenuId === tenant.id && (
                                                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-52">
                                                                {(Object.entries(STATUS_CONFIG) as [TenantStatus, typeof STATUS_CONFIG["active"]][]).map(([key, cfg]) => {
                                                                    const Icon = cfg.icon;
                                                                    return (
                                                                        <button
                                                                            key={key}
                                                                            onClick={() => handleChangeStatus(tenant.id, key)}
                                                                            className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${tenant.status === key ? "font-semibold" : ""} ${cfg.color}`}
                                                                        >
                                                                            <Icon className="w-4 h-4" />
                                                                            {cfg.label}
                                                                            {tenant.status === key && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => { setTenantToDelete(tenant); setModal("delete"); }}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir empresa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <button onClick={() => handleEnterCompany(tenant)} className="p-2 text-gray-400 hover:text-gray-600">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredTenants.length === 0 && (
                                    <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">
                                        <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                        <p>Nenhuma empresa encontrada</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Tenant detail */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => setSelectedTenant(null)}
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                            >
                                <ArrowLeft className="w-4 h-4" /> Voltar às Empresas
                            </button>
                            <div className="flex items-center gap-2">
                                {/* Status dropdown no detalhe */}
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setStatusMenuId(statusMenuId === selectedTenant.id ? null : selectedTenant.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border-2 ${STATUS_CONFIG[selectedTenant.status].bg} ${STATUS_CONFIG[selectedTenant.status].color} ${STATUS_CONFIG[selectedTenant.status].border}`}
                                    >
                                        {(() => { const Icon = STATUS_CONFIG[selectedTenant.status].icon; return <Icon className="w-4 h-4" />; })()}
                                        {STATUS_CONFIG[selectedTenant.status].label}
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    {statusMenuId === selectedTenant.id && (
                                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-56">
                                            {(Object.entries(STATUS_CONFIG) as [TenantStatus, typeof STATUS_CONFIG["active"]][]).map(([key, cfg]) => {
                                                const Icon = cfg.icon;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => handleChangeStatus(selectedTenant.id, key)}
                                                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 ${selectedTenant.status === key ? "font-semibold" : ""} ${cfg.color}`}
                                                    >
                                                        <Icon className="w-4 h-4" /> {cfg.label}
                                                        {selectedTenant.status === key && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setTenantToDelete(selectedTenant); setModal("delete"); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Excluir Empresa
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTenant.name}</h2>
                            <div className="flex gap-4 text-sm text-gray-600">
                                <span>Plano: <strong>{selectedTenant.subscription_plan}</strong></span>
                                <span>Criado em: <strong>{new Date(selectedTenant.created_at).toLocaleDateString("pt-BR")}</strong></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Users */}
                            <div className="bg-white rounded-lg shadow">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-600" /> Usuários ({tenantUsers.length})
                                    </h3>
                                    <button
                                        onClick={() => setModal("user")}
                                        className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" /> Novo Usuário
                                    </button>
                                </div>
                                <div className="p-4">
                                    {tenantUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                            <div>
                                                <p className="font-medium text-gray-900">{u.name}</p>
                                                <p className="text-sm text-gray-500">{u.email}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge[u.role] || "bg-gray-100 text-gray-700"}`}>
                                                {roleLabel[u.role] || u.role}
                                            </span>
                                        </div>
                                    ))}
                                    {tenantUsers.length === 0 && (
                                        <p className="text-gray-500 text-center py-4">Nenhum usuário</p>
                                    )}
                                </div>
                            </div>

                            {/* Vehicles */}
                            <div className="bg-white rounded-lg shadow">
                                <div className="p-4 border-b">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-green-600" /> Veículos ({tenantVehicles.length})
                                    </h3>
                                </div>
                                <div className="p-4">
                                    {tenantVehicles.map((v) => (
                                        <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                            <div>
                                                <p className="font-medium text-gray-900">{v.license_plate}</p>
                                                <p className="text-sm text-gray-500">{v.model}</p>
                                            </div>
                                            <span className="text-sm text-gray-600">{v.current_km?.toLocaleString("pt-BR")} km</span>
                                        </div>
                                    ))}
                                    {tenantVehicles.length === 0 && (
                                        <p className="text-gray-500 text-center py-4">Nenhum veículo</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Modal Nova Empresa */}
            {modal === "company" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-indigo-600" /> Nova Empresa
                            </h2>
                            <button onClick={resetModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                                <input
                                    type="text" required value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Ex: Transportes Silva Ltda"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status da Empresa</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.entries(STATUS_CONFIG) as [TenantStatus, typeof STATUS_CONFIG["active"]][]).map(([key, cfg]) => {
                                        const Icon = cfg.icon;
                                        return (
                                            <label key={key} className={`flex flex-col items-center gap-1 p-3 border-2 rounded-lg cursor-pointer transition-colors text-center ${newCompanyStatus === key ? `${cfg.border} ${cfg.bg}` : "border-gray-200 hover:border-gray-300"}`}>
                                                <input type="radio" name="company_status" value={key} checked={newCompanyStatus === key}
                                                    onChange={() => setNewCompanyStatus(key)} className="sr-only" />
                                                <Icon className={`w-5 h-5 ${cfg.color}`} />
                                                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <hr className="my-2" />
                            <p className="text-sm font-medium text-gray-600">Usuário Administrador da Empresa</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text" required value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Nome do administrador"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input
                                    type="email" required value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="admin@empresa.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"} required
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        minLength={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {alertMsg && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${alertMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {alertMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {alertMsg.text}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                                    {submitting ? "Criando..." : "Criar Empresa"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Novo Usuário */}
            {modal === "user" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                                Novo Usuário — {selectedTenant?.name}
                            </h2>
                            <button onClick={resetModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text" required value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nome do usuário"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input
                                    type="email" required value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="email@empresa.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"} required
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        minLength={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Acesso</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${newUserRole === "admin" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                                        <input type="radio" name="role" value="admin" checked={newUserRole === "admin"}
                                            onChange={() => setNewUserRole("admin")} className="sr-only" />
                                        <Users className="w-6 h-6 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-700">Admin Empresa</span>
                                        <span className="text-xs text-gray-500 text-center">Gerencia usuários e visualiza dashboards</span>
                                    </label>
                                    <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${newUserRole === "driver" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                                        <input type="radio" name="role" value="driver" checked={newUserRole === "driver"}
                                            onChange={() => setNewUserRole("driver")} className="sr-only" />
                                        <Truck className="w-6 h-6 text-green-600" />
                                        <span className="text-sm font-medium text-gray-700">Motorista</span>
                                        <span className="text-xs text-gray-500 text-center">Lançamento de dados operacionais</span>
                                    </label>
                                </div>
                            </div>

                            {alertMsg && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${alertMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {alertMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {alertMsg.text}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                                    {submitting ? "Criando..." : "Criar Usuário"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmação de Exclusão */}
            {modal === "delete" && tenantToDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Excluir Empresa</h2>
                            <p className="text-gray-600 mb-2">
                                Você está prestes a excluir <strong>"{tenantToDelete.name}"</strong>.
                            </p>
                            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-6">
                                ⚠️ Esta ação é irreversível. Todos os dados da empresa serão perdidos.
                            </p>
                            {alertMsg && (
                                <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 mb-4">
                                    <AlertCircle className="w-4 h-4" />
                                    {alertMsg.text}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={resetModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button onClick={handleDeleteTenant} disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
                                    {submitting ? "Excluindo..." : "Excluir"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SuperAdmin;
