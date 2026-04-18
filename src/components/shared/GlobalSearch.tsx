import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Truck, Fuel, Wrench, BarChart, Settings, Users, LayoutDashboard, Car, Disc, SprayCan, Ticket, ShieldCheck, AlertOctagon, X, Droplet, RefreshCcw } from "lucide-react";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const items = [
    { label: "Dashboard (Início)", to: "/", icon: LayoutDashboard, keywords: "home inicio painel kpi" },
    { label: "Frota de Veículos", to: "/fleet", icon: Truck, keywords: "caminhoes cavalos carretas registro" },
    { label: "Abastecimento", to: "/fuel", icon: Fuel, keywords: "posto litro diesel gasolina valor consumo" },
    { label: "Manutenção", to: "/maintenance", icon: Wrench, keywords: "oficina conserto mecanica preventiva peça" },
    { label: "Troca de Óleo", to: "/oil-change", icon: Droplet, keywords: "oleo lubrificante filtro revisao motor" },
    { label: "Troca de Pneus", to: "/tire-change", icon: Disc, keywords: "pneu estepe borracha recapagem sulco" },
    { label: "Rodízio de Pneus", to: "/rotation", icon: RefreshCcw, keywords: "rodizio eixos pneus rotacionar" },
    { label: "Lavagem", to: "/washing", icon: SprayCan, keywords: "lavajato ducha interno chassi produto" },
    { label: "Estacionamento", to: "/parking", icon: Car, keywords: "estacionar vaga patio pernoite diaria" },
    { label: "Pedágios", to: "/tolls", icon: Ticket, keywords: "cancela pedagio tag semparar conectcar veloe rota caminho" },
    { label: "Seguros", to: "/insurance", icon: ShieldCheck, keywords: "apolice cobertura corretora sinistro vida franquia" },
    { label: "Sinistros (Acidentes)", to: "/accidents", icon: AlertOctagon, keywords: "acidente batida bo avaria roubo furto pr" },
    { label: "Relatórios", to: "/reports", icon: BarChart, keywords: "pdf xlsx planilhas exportacao dados grafico" },
    { label: "Fornecedores", to: "/suppliers", icon: Users, keywords: "oficinas postos lojas prestadores contatos" },
    { label: "Configurações", to: "/settings", icon: Settings, keywords: "minha conta perfil tenant tema empresa" },
  ];

  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase();
    return item.label.toLowerCase().includes(search) || item.keywords.includes(search);
  });

  const handleSelect = (to: string) => {
    setIsOpen(false);
    navigate(to);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] px-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header / Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 border-none focus:ring-0 text-lg px-4 py-2 text-slate-800 placeholder-slate-400 bg-transparent outline-none"
            placeholder="Ir para o módulo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Nenhum módulo encontrado para "{searchTerm}"</p>
              <p className="text-sm mt-1">Tente palavras-chave relacionadas</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Menu & Módulos
              </p>
              {filteredItems.map((item, id) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to + id}
                    onClick={() => handleSelect(item.to)}
                    className="w-full flex items-center justify-between px-3 py-3 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors group focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-500/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 rounded-lg transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-700 group-hover:text-blue-700">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-blue-400 hidden sm:inline-block border border-slate-200 group-hover:border-blue-200 px-2 py-1 rounded">
                      ↵ Entrar
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] uppercase font-bold shadow-sm">
                Ctrl
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] uppercase font-bold shadow-sm">
                K
              </kbd>
              <span className="ml-1">para buscar</span>
            </span>
            <span className="flex items-center gap-1 hidden sm:flex">
               <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] uppercase font-bold shadow-sm">
                ESC
              </kbd>
              <span className="ml-1">para sair</span>
            </span>
          </div>
          <span className="font-semibold tracking-wide uppercase">Busca Global</span>
        </div>
      </div>
    </div>
  );
}
