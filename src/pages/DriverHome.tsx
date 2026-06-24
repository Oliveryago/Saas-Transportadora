import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFuelRecords } from "../hooks/useFuelRecords";
import { useVehicles } from "../hooks/useVehicles";
import { supabase } from "../lib/supabase";
import type { Driver } from "../types";
import {
  Fuel,
  Truck,
  Clock,
  ChevronRight,
  LogOut,
  User,
  CheckCircle2,
  AlertCircle,
  Gauge,
} from "lucide-react";

export function DriverHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { records, loading: loadingFuel } = useFuelRecords();
  const { vehicles } = useVehicles();
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("drivers")
      .select("*")
      .eq("tenant_id", user.tenant_id)
      // match by user email or name to find driver record
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          // try to match by name
          const match = data.find(
            (d) =>
              d.nome_completo?.toLowerCase() === user.name?.toLowerCase()
          );
          setDriverProfile(match || data[0]);
        }
      });
  }, [user]);

  const myVehicle = driverProfile?.vehicle_id
    ? vehicles.find((v) => v.id === driverProfile.vehicle_id)
    : null;

  const recentRecords = records.slice(0, 3);
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalFuelMonth = records
    .filter((r) => {
      const d = new Date(r.date || r.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + r.liters, 0);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-blue-300 text-sm capitalize">{today}</p>
            <h1 className="text-2xl font-bold mt-1">
              Olá, {user?.name?.split(" ")[0] || "Motorista"} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
              {driverProfile?.photo_url ? (
                <img
                  src={driverProfile.photo_url}
                  alt="Foto"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-blue-300" />
              )}
            </div>
          </div>
        </div>

        {/* Vehicle badge */}
        {myVehicle ? (
          <div className="mt-4 flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-lg bg-blue-600/40 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-blue-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-300 font-medium">Seu veículo</p>
              <p className="text-sm font-semibold truncate">
                {myVehicle.license_plate} — {myVehicle.model}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-500/20 text-green-300 text-xs font-semibold px-2 py-1 rounded-full">
              <Gauge className="w-3 h-3" />
              {myVehicle.current_km.toLocaleString("pt-BR")} km
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 bg-yellow-500/10 rounded-xl px-4 py-3 border border-yellow-500/20">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-300">
              Nenhum veículo vinculado ao seu perfil
            </p>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <p className="text-blue-300 text-xs font-medium mb-1">Abastecimentos</p>
            <p className="text-3xl font-bold">{records.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">total registrado</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <p className="text-blue-300 text-xs font-medium mb-1">Litros este mês</p>
            <p className="text-3xl font-bold">{totalFuelMonth.toFixed(0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">litros abastecidos</p>
          </div>
        </div>
      </div>

      {/* Main action */}
      <div className="px-5 mb-6">
        <button
          onClick={() => navigate("/driver/fuel")}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-5 shadow-lg shadow-blue-900/40 active:scale-98 transition-transform"
        >
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Fuel className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-lg font-bold">Registrar Abastecimento</p>
            <p className="text-sm text-blue-200">Informe os dados do posto agora</p>
          </div>
          <ChevronRight className="w-6 h-6 text-blue-200 flex-shrink-0" />
        </button>
      </div>

      {/* Recent records */}
      <div className="px-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base">Últimos registros</h2>
          <button
            onClick={() => navigate("/driver/history")}
            className="text-blue-400 text-sm font-medium"
          >
            Ver todos
          </button>
        </div>

        {loadingFuel ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <Fuel className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhum abastecimento registrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRecords.map((record) => {
              const vehicle = vehicles.find((v) => v.id === record.vehicle_id);
              return (
                <div
                  key={record.id}
                  className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                    <Fuel className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {vehicle?.license_plate || "Veículo"} — {record.liters}L
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-400">
                        {record.date
                          ? new Date(record.date + "T12:00:00").toLocaleDateString("pt-BR")
                          : new Date(record.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      {record.fuel_station && (
                        <p className="text-xs text-gray-500 truncate">• {record.fuel_station}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {record.validations?.verified ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1 ml-auto" />
                    )}
                    {record.value_brl && record.value_brl > 0 && (
                      <p className="text-xs font-semibold text-green-300 mt-1">
                        R$ {record.value_brl.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="px-5 pb-10">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
