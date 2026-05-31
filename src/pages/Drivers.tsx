import React, { useState } from "react";
import { UserPlus, Search, Filter, MapPin, User, ChevronRight, FileText, FileDown } from "lucide-react";
import { useDrivers } from "../hooks/useDrivers";
import { useVehicles } from "../hooks/useVehicles";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { useImplements } from "../hooks/useImplements";
import { MotoristaForm } from "../components/motorista/MotoristaForm";
import { generateDriverProfile } from "../services/documentGenerator";
import type { Driver } from "../types";

export function Drivers() {
  const { drivers, loading, addDriver, updateDriver } = useDrivers();
  const { vehicles } = useVehicles();
  const { implements: implementsList } = useImplements();
  const { settings, logoPreview: logoDataUrl } = useCompanySettings();
  
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddMotorista = async (data: any) => {
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, data);
        alert("Motorista atualizado com sucesso!");
      } else {
        await addDriver(data);
        alert("Motorista cadastrado com sucesso!");
      }
      setShowForm(false);
      setEditingDriver(null);
    } catch (error) {
      console.error("Falha ao salvar:", error);
      alert(`Erro ao salvar motorista: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setShowForm(true);
  };

  const handleGenerateProfile = async (e: React.MouseEvent, driver: Driver) => {
    e.stopPropagation();
    
    // Build full address string if using separate fields
    let fullAddress = driver.endereco || "";
    if (!fullAddress && driver.street) {
      const parts = [
        driver.street,
        driver.number,
        driver.neighborhood,
        driver.city,
        driver.state ? `- ${driver.state}` : "",
        driver.cep ? `CEP: ${driver.cep}` : ""
      ].filter(Boolean);
      fullAddress = parts.join(", ");
    }

    const vehicle = vehicles.find(v => v.id === driver.vehicle_id);
    const vehicleStr = vehicle ? `${vehicle.license_plate} - ${vehicle.model}` : "";

    const implement = implementsList.find(i => i.id === driver.implement_id);
    const implementStr = implement ? `${implement.license_plate} - ${implement.model}` : "";

    const implement2 = implementsList.find(i => i.id === driver.implement2_id);
    const implement2Str = implement2 ? `${implement2.license_plate} - ${implement2.model}` : "";

    await generateDriverProfile({
      id: driver.id,
      name: driver.nome_completo,
      cpf: driver.cpf,
      birthDate: driver.data_nascimento,
      phone: driver.phone,
      cnhNumber: driver.numero_cnh,
      cnhCategory: driver.categoria_cnh,
      cnhValidity: driver.validade_cnh,
      address: fullAddress,
      active: driver.active,
      photoUrl: driver.photo_url,
      vehiclePlate: vehicleStr,
      implementPlate: implementStr,
      implement2Plate: implement2Str,
      company: { settings, logoDataUrl }
    });
  };

  const filteredDrivers = drivers.filter(d => 
    d.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cpf.includes(searchTerm)
  );

  const maskCpf = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `***.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-**`;
    }
    return cpf;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Motoristas</h1>
          <p className="text-gray-500">Controle de motoristas e documentos da frota</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingDriver(null);
            } else {
              setShowForm(true);
            }
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-md transition-all font-semibold"
        >
          {showForm ? "Voltar para Lista" : (
            <>
              <UserPlus className="w-5 h-5" />
              Novo Motorista
            </>
          )}
        </button>
      </header>

      {showForm ? (
        <div className="max-w-4xl mx-auto">
          <MotoristaForm onSubmit={handleAddMotorista} initialData={editingDriver || undefined} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-medium">
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Nenhum motorista encontrado.</p>
              <button 
                onClick={() => setShowForm(true)}
                className="mt-4 text-indigo-600 font-semibold hover:underline"
              >
                Cadastrar o primeiro agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrivers.map((driver) => {
                const linkedVehicle = vehicles.find(v => v.id === driver.vehicle_id);
                return (
                  <div 
                    key={driver.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
                  >
                    <div className="p-5 flex-1 cursor-pointer" onClick={() => handleEdit(driver)}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 overflow-hidden border border-indigo-100">
                          {driver.photo_url ? (
                            <img src={driver.photo_url} alt="Perfil" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${driver.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {driver.active ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1 font-mono uppercase tracking-tighter">
                            CNH: {driver.categoria_cnh || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 truncate">
                        {driver.nome_completo}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-4 font-medium">
                        CPF: {maskCpf(driver.cpf)}
                      </p>

                      <div className="space-y-2 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>CNH: {driver.numero_cnh || '---'}</span>
                        </div>
                        {linkedVehicle && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="truncate">Vínculo: {linkedVehicle.license_plate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50">
                      <div 
                        className="flex-1 px-5 py-3 flex items-center justify-between group-hover:bg-indigo-50 transition-colors cursor-pointer"
                        onClick={() => handleEdit(driver)}
                      >
                        <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-indigo-400">Editar</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                      </div>
                      <div className="w-px h-full bg-gray-200"></div>
                      <button
                        onClick={(e) => handleGenerateProfile(e, driver)}
                        className="px-4 py-3 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Gerar Ficha em PDF"
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
