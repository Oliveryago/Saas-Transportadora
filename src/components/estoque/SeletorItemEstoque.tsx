import { useEffect, useRef } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import type { ItemEstoque } from "../../types/estoque";

interface Props {
  itens: ItemEstoque[];
  busca: string;
  itemSelecionado: ItemEstoque | null;
  criandoNovo: boolean;
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  onBusca: (valor: string) => void;
  onSelecionar: (item: ItemEstoque) => void;
  onCriarNovo: () => void;
  onLimpar: () => void;
  placeholder?: string;
}

export function SeletorItemEstoque({
  itens,
  busca,
  itemSelecionado,
  criandoNovo,
  aberto,
  onAberto,
  onBusca,
  onSelecionar,
  onCriarNovo,
  onLimpar,
  placeholder = "Digite ou selecione uma peça...",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nomeLimpo = busca.trim();
  const filtrados = itens.filter((item) => item.nome.toLowerCase().includes(busca.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        onAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onAberto]);

  return (
    <div className="relative">
      <div className="flex items-center border border-slate-200 rounded-md px-3 py-2 gap-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 bg-white">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={busca}
          onChange={(e) => {
            onBusca(e.target.value);
            onAberto(true);
          }}
          onFocus={() => onAberto(true)}
          className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
        />
        {(itemSelecionado || criandoNovo || busca) && (
          <button type="button" onClick={onLimpar} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </div>
      {itemSelecionado && (
        <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1">
          <Check size={11} /> {itemSelecionado.nome}
        </p>
      )}
      {criandoNovo && !itemSelecionado && (
        <p className="flex items-center gap-1 text-[11px] text-blue-600 mt-1">
          <Plus size={11} /> Novo item será cadastrado
        </p>
      )}
      {aberto && (
        <div
          ref={dropdownRef}
          className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filtrados.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] text-slate-400 uppercase tracking-wide">Itens cadastrados</p>
              {filtrados.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => onSelecionar(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                >
                  <span className="text-slate-800">{item.nome}</span>
                  <span className="text-[11px] text-slate-400">{item.categoria}</span>
                </button>
              ))}
            </>
          )}
          {nomeLimpo && (
            <button
              type="button"
              onMouseDown={onCriarNovo}
              className="w-full text-left px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-slate-100"
            >
              <Plus size={14} />
              Criar "<span className="font-medium">{nomeLimpo}</span>"
            </button>
          )}
          {!nomeLimpo && filtrados.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-400 text-center">Digite para buscar ou criar um item</p>
          )}
        </div>
      )}
    </div>
  );
}
