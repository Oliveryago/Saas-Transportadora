import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { Driver } from "../types";
import { useVehicles } from "../hooks/useVehicles";
import { ArrowLeft, User, Truck, LogOut, FileText } from "lucide-react";

export function DriverProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { vehicles } = useVehicles();
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("drivers")
      .select("*")
      .eq("tenant_id", user.tenant_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const match = data.find(
            (d) => d.nome_completo?.toLowerCase() === user.name?.toLowerCase()
          );
          setDriverProfile(match || data[0]);
        }
        setLoading(false);
      });
  }, [user]);

  const myVehicle = driverProfile?.vehicle_id
    ? vehicles.find((v) => v.id === driverProfile.vehicle_id)
    : null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/driver")}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-tight">Meu Perfil</h1>
          <p className="text-xs text-blue-300">Configurações da conta</p>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="w-24 h-24 rounded-full bg-blue-600/30 border-4 border-blue-500/30 flex items-center justify-center overflow-hidden mb-4">
            {driverProfile?.photo_url ? (
              <img
                src={driverProfile.photo_url}
                alt="Foto do Perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-blue-300" />
            )}
          </div>
          <h2 className="text-xl font-bold">{user?.name || driverProfile?.nome_completo || "Motorista"}</h2>
          <p className="text-sm text-blue-300 mt-1">{user?.email}</p>
        </div>

        {/* Informações Pessoais */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Informações do Motorista
          </h3>
          
          {loading ? (
             <div className="animate-pulse flex flex-col gap-3">
               <div className="h-4 bg-white/10 rounded w-1/2"></div>
               <div className="h-4 bg-white/10 rounded w-1/3"></div>
             </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Nome Completo</span>
                <span className="font-medium text-right">{driverProfile?.nome_completo || user?.name || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">CPF</span>
                <span className="font-medium">{driverProfile?.cpf || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">CNH</span>
                <span className="font-medium">{driverProfile?.numero_cnh || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Categoria</span>
                <span className="font-medium">{driverProfile?.categoria_cnh || "-"}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-gray-400">Validade CNH</span>
                <span className="font-medium">
                  {driverProfile?.validade_cnh 
                    ? new Date(driverProfile.validade_cnh + "T12:00:00").toLocaleDateString("pt-BR") 
                    : "-"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Veículo Vinculado */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4" /> Veículo Atual
          </h3>
          {myVehicle ? (
            <div>
              <p className="font-bold text-lg">{myVehicle.license_plate}</p>
              <p className="text-gray-400 text-sm mt-1">{myVehicle.model}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhum veículo vinculado ao seu perfil.</p>
          )}
        </div>

        {/* Ações */}
        <div className="pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
