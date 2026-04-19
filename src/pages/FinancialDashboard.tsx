import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
    Fuel, Wrench, Disc, SprayCan, Ticket,
    Car, ShieldCheck, DollarSign, TrendingUp, Calendar
} from "lucide-react";
import VehicleFilter from "../components/shared/VehicleFilter";

interface CategoryTotal {
    label: string;
    icon: typeof Fuel;
    color: string;
    bgColor: string;
    borderColor: string;
    month: number;
    total: number;
}

function formatBRL(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinancialDashboard() {
    const { tenant } = useAuth();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"month" | "year" | "all">("month");
    const [categories, setCategories] = useState<CategoryTotal[]>([]);
    const [grandTotal, setGrandTotal] = useState(0);
    const [recentEntries, setRecentEntries] = useState<any[]>([]);

    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

    useEffect(() => {
        if (tenant?.id) fetchFinancialData();
    }, [tenant?.id, period, selectedVehicleId]);

    async function fetchFinancialData() {
        if (!tenant?.id) return;
        setLoading(true);

        const now = new Date();
        let fromDate: string | null = null;

        if (period === "month") {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else if (period === "year") {
            fromDate = new Date(now.getFullYear(), 0, 1).toISOString();
        }

        function applyFilter(query: any) {
            let q = query.eq("tenant_id", tenant!.id);
            if (fromDate) q = q.gte("created_at", fromDate);
            if (selectedVehicleId) q = q.eq("vehicle_id", selectedVehicleId);
            return q;
        }

        const [fuel, maintenance, tires, washing, tolls, parking, insurance] = await Promise.all([
            applyFilter(supabase.from("fuel_records").select("value_brl, created_at, vehicle_id")),
            applyFilter(supabase.from("maintenance_records").select("value_brl, created_at, vehicle_id, type")),
            applyFilter(supabase.from("tire_changes").select("value_brl, created_at, vehicle_id")),
            applyFilter(supabase.from("washing_records").select("value_brl, created_at, vehicle_id")),
            applyFilter(supabase.from("toll_records").select("value_brl, created_at, vehicle_id")),
            applyFilter(supabase.from("parking_records").select("value_brl, created_at, vehicle_id")),
            applyFilter(supabase.from("insurance_records").select("value_brl, created_at, vehicle_id")),
        ]);

        const sum = (arr: any[]) =>
            (arr || []).reduce((acc: number, r: any) => acc + (r.value_brl || 0), 0);

        const cats: CategoryTotal[] = [
            {
                label: "Combustível", icon: Fuel,
                color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-400",
                month: sum(fuel.data || []), total: sum(fuel.data || []),
            },
            {
                label: "Manutenção", icon: Wrench,
                color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-400",
                month: sum(maintenance.data || []), total: sum(maintenance.data || []),
            },
            {
                label: "Troca de Pneus", icon: Disc,
                color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-400",
                month: sum(tires.data || []), total: sum(tires.data || []),
            },
            {
                label: "Lavagem", icon: SprayCan,
                color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-400",
                month: sum(washing.data || []), total: sum(washing.data || []),
            },
            {
                label: "Pedágios", icon: Ticket,
                color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-400",
                month: sum(tolls.data || []), total: sum(tolls.data || []),
            },
            {
                label: "Estacionamento", icon: Car,
                color: "text-violet-700", bgColor: "bg-violet-50", borderColor: "border-violet-400",
                month: sum(parking.data || []), total: sum(parking.data || []),
            },
            {
                label: "Seguros", icon: ShieldCheck,
                color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-400",
                month: sum(insurance.data || []), total: sum(insurance.data || []),
            },
        ];

        const total = cats.reduce((acc, c) => acc + c.total, 0);
        setGrandTotal(total);
        setCategories(cats);

        // Recent entries (all combined, sorted by date)
        type Entry = { label: string; value: number; date: string };
        const recent: Entry[] = [
            ...(fuel.data || []).map((r: any) => ({ label: "Combustível", value: r.value_brl || 0, date: r.created_at })),
            ...(maintenance.data || []).map((r: any) => ({ label: "Manutenção", value: r.value_brl || 0, date: r.created_at })),
            ...(tires.data || []).map((r: any) => ({ label: "Troca de Pneus", value: r.value_brl || 0, date: r.created_at })),
            ...(washing.data || []).map((r: any) => ({ label: "Lavagem", value: r.value_brl || 0, date: r.created_at })),
            ...(tolls.data || []).map((r: any) => ({ label: "Pedágio", value: r.value_brl || 0, date: r.created_at })),
            ...(parking.data || []).map((r: any) => ({ label: "Estacionamento", value: r.value_brl || 0, date: r.created_at })),
            ...(insurance.data || []).map((r: any) => ({ label: "Seguro", value: r.value_brl || 0, date: r.created_at })),
        ];
        recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentEntries(recent.slice(0, 10));
        setLoading(false);
    }

    const maxValue = Math.max(...categories.map((c) => c.total), 1);

    const periodLabel = {
        month: "Este mês",
        year: "Este ano",
        all: "Todo período",
    }[period];

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenant?.name} — {periodLabel}</p>
                    </div>
                    {/* Period & Vehicle filters */}
                    <div className="flex items-center gap-4">
                        <VehicleFilter 
                            value={selectedVehicleId} 
                            onChange={setSelectedVehicleId} 
                        />
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                        {(["month", "year", "all"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {p === "month" ? "Mês" : p === "year" ? "Ano" : "Tudo"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                ) : (
                    <>
                        {/* Grand Total Card */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-8 text-white shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total Geral de Gastos</p>
                                    <p className="text-4xl font-bold mt-1">{formatBRL(grandTotal)}</p>
                                    <p className="text-blue-200 text-sm mt-1 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> {periodLabel}
                                    </p>
                                </div>
                                <DollarSign className="w-16 h-16 text-white/30" />
                            </div>
                        </div>

                        {/* Category Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {categories.map((cat) => (
                                <div key={cat.label}
                                    className={`bg-white rounded-xl shadow-sm border-l-4 ${cat.borderColor} p-5`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${cat.bgColor}`}>
                                            <cat.icon className={`w-5 h-5 ${cat.color}`} />
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                            {cat.label}
                                        </span>
                                    </div>
                                    <p className={`text-xl font-bold ${cat.color}`}>{formatBRL(cat.total)}</p>
                                    {/* Mini bar */}
                                    <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${cat.bgColor.replace("bg-", "bg-").replace("-50", "-400")}`}
                                            style={{ width: `${(cat.total / maxValue) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" /> Comparativo por Categoria
                            </h2>
                            <div className="space-y-4">
                                {categories
                                    .sort((a, b) => b.total - a.total)
                                    .map((cat) => (
                                        <div key={cat.label} className="flex items-center gap-4">
                                            <div className="w-28 text-sm text-gray-600 text-right shrink-0 truncate">
                                                {cat.label}
                                            </div>
                                            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full flex items-center px-3 transition-all duration-500 ${cat.bgColor.replace("-50", "-200")}`}
                                                    style={{ width: `${Math.max((cat.total / maxValue) * 100, cat.total > 0 ? 3 : 0)}%` }}
                                                >
                                                    {cat.total > 0 && (
                                                        <span className={`text-xs font-semibold ${cat.color} whitespace-nowrap`}>
                                                            {formatBRL(cat.total)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {cat.total === 0 && (
                                                <span className="text-xs text-gray-400">R$ 0,00</span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Recent entries */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Últimos Lançamentos</h2>
                            {recentEntries.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {recentEntries.map((entry, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-3">
                                            <div>
                                                <p className="font-medium text-gray-800">{entry.label}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(entry.date).toLocaleDateString("pt-BR", {
                                                        day: "2-digit", month: "short", year: "numeric"
                                                    })}
                                                </p>
                                            </div>
                                            <span className="font-semibold text-gray-900">{formatBRL(entry.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">
                                    Nenhum lançamento encontrado para o período selecionado
                                </p>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
