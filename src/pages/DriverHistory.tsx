import { useNavigate } from "react-router-dom";
import { useFuelRecords } from "../hooks/useFuelRecords";
import { useVehicles } from "../hooks/useVehicles";
import {
  ArrowLeft,
  Fuel,
  Clock,
  Gauge,
  CheckCircle2,
} from "lucide-react";

export function DriverHistory() {
  const navigate = useNavigate();
  const { records, loading } = useFuelRecords();
  const { vehicles } = useVehicles();

  const totalLiters = records.reduce((s, r) => s + r.liters, 0);
  const totalValue = records.reduce((s, r) => s + (r.value_brl || 0), 0);

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
          <h1 className="font-bold text-lg leading-tight">Histórico</h1>
          <p className="text-xs text-blue-300">Todos os abastecimentos</p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pt-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-blue-300 font-medium">Total Litros</p>
            <p className="text-2xl font-bold mt-1">{totalLiters.toFixed(0)}L</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-blue-300 font-medium">Total Gasto</p>
            <p className="text-2xl font-bold mt-1">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Records list */}
      <div className="px-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Fuel className="w-12 h-12 text-white/20 mb-3" />
            <p className="text-gray-400">Nenhum abastecimento registrado</p>
          </div>
        ) : (
          records.map((record) => {
            const vehicle = vehicles.find((v) => v.id === record.vehicle_id);
            const dateStr = record.date
              ? new Date(record.date + "T12:00:00").toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : new Date(record.created_at).toLocaleDateString("pt-BR");

            return (
              <div
                key={record.id}
                className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                    <Fuel className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">
                        {vehicle?.license_plate || "—"} — {record.liters}L
                      </p>
                      {record.validations?.verified ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <span className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full flex-shrink-0">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                      {record.fuel_station && (
                        <> · {record.fuel_station}</>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {record.km_digital > 0 && (
                        <span className="text-xs flex items-center gap-1 text-gray-400">
                          <Gauge className="w-3 h-3" />
                          {record.km_digital.toLocaleString("pt-BR")} km
                        </span>
                      )}
                      {record.value_brl && record.value_brl > 0 && (
                        <span className="text-xs font-semibold text-green-300">
                          R$ {record.value_brl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {record.invoice_photo_url && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img
                      src={record.invoice_photo_url}
                      alt="Nota fiscal"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
