import React, { useState } from "react";
import { UserPlus, Search, Filter, Mail, Phone, MapPin, User, ChevronRight, FileText } from "lucide-react";
import { useDrivers } from "../hooks/useDrivers";
import { MotoristaForm } from "../components/motorista/MotoristaForm";

export function Drivers() {
  const { drivers, loading, addDriver } = useDrivers();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddMotorista = async (data: any) => {
    try {
      await addDriver(data);
      setShowForm(false);
      alert("Motorista cadastrado com sucesso!");
    } catch (error) {
      console.error("Falha ao salvar:", error);
      alert("Erro ao salvar motorista.");
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cpf.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Motoristas</h1>
          <p className="text-gray-500">Controle de motoristas e documentosda frota</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
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
          <MotoristaForm onSubmit={handleAddMotorista} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Actions Bar */}
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

          {/* Drivers Grid */}
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
              {filteredDrivers.map((driver) => (
                <div 
                  key={driver.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <User className="w-6 h-6" />
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
                      CPF: {driver.cpf}
                    </p>

                    <div className="space-y-2 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>CNH: {driver.numero_cnh || '---'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{driver.endereco || 'Endereço não informado'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
                    <span className="text-xs font-bold text-gray-400 uppercase group-hover:text-indigo-400">Ver Detalhes</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
