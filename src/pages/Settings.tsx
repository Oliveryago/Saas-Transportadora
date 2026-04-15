import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
    User, Lock, Building2, Save,
    Users, UserPlus, X, Eye, EyeOff,
    AlertCircle, CheckCircle2, Truck
} from "lucide-react";

interface TenantUser {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

type AlertMsg = { type: "success" | "error"; text: string } | null;

export function Settings() {
    const { user, tenant } = useAuth();
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<AlertMsg>(null);

    // User management
    const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userAlert, setUserAlert] = useState<AlertMsg>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<"admin" | "driver">("driver");

    useEffect(() => {
        if (isAdmin && tenant?.id) fetchUsers();
    }, [isAdmin, tenant?.id]);

    async function fetchUsers() {
        setUsersLoading(true);
        const { data } = await supabase
            .from("users")
            .select("id, name, email, role, created_at")
            .eq("tenant_id", tenant!.id)
            .order("created_at");
        setTenantUsers(data || []);
        setUsersLoading(false);
    }

    function resetUserModal() {
        setShowUserModal(false);
        setUserAlert(null);
        setNewUserName(""); setNewUserEmail(""); setNewUserPassword("");
        setNewUserRole("driver"); setShowPassword(false);
    }

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setUserAlert(null);
        try {
            const res = await supabase.functions.invoke("create-user", {
                body: {
                    email: newUserEmail,
                    password: newUserPassword,
                    name: newUserName,
                    tenant_id: tenant!.id,
                    role: newUserRole,
                },
            });

            if (res.error) throw new Error(res.error.message);
            if (res.data?.error) throw new Error(res.data.error);

            setUserAlert({ type: "success", text: `Usuário "${newUserName}" criado com sucesso!` });
            await fetchUsers();
            setTimeout(resetUserModal, 2000);
        } catch (err: any) {
            setUserAlert({ type: "error", text: err.message || "Erro ao criar usuário" });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();
        setPwMessage(null);
        if (newPassword !== confirmPassword) {
            setPwMessage({ type: "error", text: "As senhas não coincidem" });
            return;
        }
        if (newPassword.length < 6) {
            setPwMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres" });
            return;
        }
        setPwLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPwMessage({ type: "success", text: "Senha atualizada com sucesso!" });
            setNewPassword(""); setConfirmPassword("");
        } catch (error: any) {
            setPwMessage({ type: "error", text: error.message || "Erro ao atualizar senha" });
        } finally {
            setPwLoading(false);
        }
    }

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

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
                {/* Perfil */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Perfil do Usuário
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                                    {user?.name || "N/A"}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                                    {user?.email || "N/A"}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Building2 className="w-4 h-4" /> Empresa
                                </label>
                                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                                    {tenant?.name || "N/A"}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 capitalize">
                                    {roleLabel[user?.role || ""] || user?.role || "Usuário"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usuários da Empresa — somente Admin */}
                {isAdmin && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" /> Usuários da Empresa
                            </h2>
                            <button
                                onClick={() => setShowUserModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                            >
                                <UserPlus className="w-4 h-4" /> Novo Usuário
                            </button>
                        </div>
                        <div className="p-6">
                            {usersLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {tenantUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between py-3">
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
                                        <p className="text-center text-gray-400 py-6">Nenhum usuário cadastrado</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Segurança */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" /> Segurança
                        </h2>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                <input
                                    type="password" value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                                <input
                                    type="password" value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Repita a senha"
                                />
                            </div>
                            {pwMessage && (
                                <div className={`p-3 rounded-lg text-sm ${pwMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {pwMessage.text}
                                </div>
                            )}
                            <button
                                type="submit" disabled={pwLoading || !newPassword}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pwLoading
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <Save className="w-4 h-4" />}
                                Atualizar Senha
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            {/* Modal Novo Usuário */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-600" /> Novo Usuário
                            </h2>
                            <button onClick={resetUserModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input type="text" required value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nome do usuário" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input type="email" required value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="email@empresa.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} required
                                        value={newUserPassword} minLength={6}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                                        placeholder="Mínimo 6 caracteres" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Acesso</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${newUserRole === "admin" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                                        <input type="radio" name="role" value="admin" checked={newUserRole === "admin"}
                                            onChange={() => setNewUserRole("admin")} className="sr-only" />
                                        <Users className="w-6 h-6 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-700">Admin Empresa</span>
                                        <span className="text-xs text-gray-500 text-center">Gerencia usuários e dashboards</span>
                                    </label>
                                    <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${newUserRole === "driver" ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
                                        <input type="radio" name="role" value="driver" checked={newUserRole === "driver"}
                                            onChange={() => setNewUserRole("driver")} className="sr-only" />
                                        <Truck className="w-6 h-6 text-green-600" />
                                        <span className="text-sm font-medium text-gray-700">Motorista</span>
                                        <span className="text-xs text-gray-500 text-center">Lançamento de dados</span>
                                    </label>
                                </div>
                            </div>

                            {userAlert && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${userAlert.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {userAlert.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {userAlert.text}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetUserModal}
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
        </div>
    );
}
