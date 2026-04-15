import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVehicles } from "../hooks/useVehicles";
import { useImplements } from "../hooks/useImplements";
import { useAuth } from "../contexts/AuthContext";
import { Plus, LogOut, ArrowLeft, Trash2, Edit2 } from "lucide-react";
import VehicleModal from "../components/vehicles/VehicleModal";
import ImplementModal from "../components/implements/ImplementModal";
import { IMPLEMENT_TYPE_LABELS } from "../types";
import type { Vehicle, Implement } from "../types";

export function Fleet() {
  const { user, signOut } = useAuth();
  const { vehicles, deleteVehicle } = useVehicles();
  const { implements: implements_, deleteImplement } = useImplements();
  const navigate = useNavigate();
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [implementModalOpen, setImplementModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"vehicles" | "implements">(
    "vehicles"
  );
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingImplement, setEditingImplement] = useState<Implement | null>(null);

  async function handleLogout() {
    await signOut();
  }

  async function handleDeleteVehicle(id: string) {
    if (!window.confirm("Certeza que deseja excluir este cavalo?")) return;
    try {
      await deleteVehicle(id);
    } catch (err: any) {
      console.error("Error deleting vehicle:", err);
      alert(err?.message || "Erro ao excluir veículo.");
    }
  }

  async function handleDeleteImplement(id: string) {
    if (!window.confirm("Certeza que deseja excluir este implemento?")) return;
    try {
      await deleteImplement(id);
    } catch (err: any) {
      console.error("Error deleting implement:", err);
      alert(err?.message || "Erro ao excluir implemento.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Frota</h1>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex gap-4 border-b">
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`px-4 py-2 font-medium border-b-2 ${activeTab === "vehicles"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Cavalos Mecânicos ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab("implements")}
            className={`px-4 py-2 font-medium border-b-2 ${activeTab === "implements"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Implementos ({implements_.length})
          </button>
        </div>

        {activeTab === "vehicles" && (
          <div>
            <button
              onClick={() => {
                setEditingVehicle(null);
                setVehicleModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
            >
              <Plus className="w-5 h-5" />
              Novo Cavalo
            </button>

            <div className="grid gap-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {vehicle.license_plate}
                      </h3>
                      <p className="text-sm text-gray-600">{vehicle.model}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setVehicleModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Ano</p>
                      <p className="font-semibold text-gray-900">
                        {vehicle.year || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">KM Atual</p>
                      <p className="font-semibold text-gray-900">
                        {vehicle.current_km.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {vehicles.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <p>Nenhum cavalo mecânico registrado ainda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "implements" && (
          <div>
            <button
              onClick={() => {
                setEditingImplement(null);
                setImplementModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
            >
              <Plus className="w-5 h-5" />
              Novo Implemento
            </button>

            <div className="grid gap-4">
              {implements_.map((impl) => (
                <div
                  key={impl.id}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {impl.license_plate}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {IMPLEMENT_TYPE_LABELS[impl.type] || impl.type}{" "}
                        - {impl.model}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingImplement(impl);
                          setImplementModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteImplement(impl.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {implements_.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <p>Nenhum implemento registrado ainda</p>
                </div>
              )}
            </div>
          </div>
        )}

        <VehicleModal
          open={vehicleModalOpen}
          onClose={() => {
            setVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
          editingVehicle={editingVehicle}
        />

        <ImplementModal
          open={implementModalOpen}
          onClose={() => {
            setImplementModalOpen(false);
            setEditingImplement(null);
          }}
          editingImplement={editingImplement}
        />
      </main>
    </div>
  );
}

export default Fleet;
