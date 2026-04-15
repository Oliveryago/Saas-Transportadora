import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useVehicles } from "../../hooks/useVehicles";
import type { Vehicle } from "../../types";

interface VehicleModalProps {
  open: boolean;
  onClose: () => void;
  editingVehicle?: Vehicle | null;
}

export function VehicleModal({
  open,
  onClose,
  editingVehicle,
}: VehicleModalProps) {
  const { addVehicle, updateVehicle } = useVehicles();
  const [licensePlate, setLicensePlate] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentKm, setCurrentKm] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingVehicle) {
      setLicensePlate(editingVehicle.license_plate);
      setModel(editingVehicle.model);
      setYear(editingVehicle.year || new Date().getFullYear());
      setCurrentKm(editingVehicle.current_km);
    } else {
      setLicensePlate("");
      setModel("");
      setYear(new Date().getFullYear());
      setCurrentKm(0);
    }
    setError(null);
  }, [editingVehicle, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, {
          license_plate: licensePlate,
          model,
          year,
          current_km: currentKm,
        });
      } else {
        await addVehicle({
          license_plate: licensePlate,
          model,
          year,
          current_km: currentKm,
          active: true,
          tenant_id: "",
        });
      }
      onClose();
    } catch (err: any) {
      console.error("Error saving vehicle:", err);
      const message = err?.message || err?.details || "Erro ao salvar o veículo. Verifique se a placa já existe.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {editingVehicle ? "Editar Cavalo" : "Novo Cavalo"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placa
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABC-1234"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Scania R440"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="2000"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KM Atual
              </label>
              <input
                type="number"
                value={currentKm}
                onChange={(e) => setCurrentKm(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VehicleModal;
