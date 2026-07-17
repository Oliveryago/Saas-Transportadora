import { useState } from 'react';
import { AlertTriangle, CircleDot, Droplet, Filter, Package, Pencil, Plus, Zap } from 'lucide-react';
import { useEstoque } from '../hooks/useEstoque';
import type { CategoriaItem, ItemEstoque } from '../types/estoque';
import { NovaEntradaModal } from '../components/estoque/NovaEntradaModal';
import { EditarItemModal } from '../components/estoque/EditarItemModal';

const ICONE_CATEGORIA: Record<CategoriaItem, typeof Droplet> = {
  oleo: Droplet,
  pneu: CircleDot,
  filtro: Filter,
  eletrica: Zap,
  peca_motor: Package,
  outro: Package,
};

const COR_CATEGORIA: Record<CategoriaItem, string> = {
  oleo: 'border-l-emerald-500 text-emerald-600',
  pneu: 'border-l-red-500 text-red-600',
  filtro: 'border-l-violet-500 text-violet-600',
  eletrica: 'border-l-amber-500 text-amber-600',
  peca_motor: 'border-l-blue-500 text-blue-600',
  outro: 'border-l-slate-400 text-slate-500',
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function EstoquePage() {
  const { itens, loading, error, itensAbaixoDoMinimo, valorTotalEmEstoque, recarregar } = useEstoque();
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemEstoque | null>(null);

  const categorias = Array.from(new Set(itens.map((item) => item.categoria)));

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Estoque de peças</h1>
          <p className="text-sm text-slate-500">Controle de peças e insumos da frota</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus size={16} />
          Nova entrada
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl p-6 text-white flex items-center justify-between mb-5">
        <div>
          <p className="text-sm opacity-85">Valor total em estoque</p>
          <p className="text-3xl font-bold">{formatarMoeda(valorTotalEmEstoque)}</p>
          <p className="text-xs opacity-75 mt-1">{itens.length} itens cadastrados</p>
        </div>
        <Package size={36} className="opacity-60" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {categorias.map((categoria) => {
          const itensCategoria = itens.filter((item) => item.categoria === categoria);
          const Icone = ICONE_CATEGORIA[categoria];
          const totalUnidades = itensCategoria.reduce((soma, item) => soma + item.estoque_atual, 0);
          const custoMedio = itensCategoria.length
            ? itensCategoria.reduce((soma, item) => soma + item.custo_medio, 0) / itensCategoria.length
            : 0;

          return (
            <div key={categoria} className={`bg-white rounded-lg p-3.5 border-l-[3px] ${COR_CATEGORIA[categoria]}`}>
              <div className="flex justify-between items-start">
                <Icone size={18} className={COR_CATEGORIA[categoria].split(' ')[1]} />
                <span className="text-[10px] tracking-wide text-slate-400 uppercase">{categoria}</span>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2">{totalUnidades}</p>
              <p className="text-[11px] text-slate-400">custo medio {formatarMoeda(custoMedio)}</p>
            </div>
          );
        })}
      </div>

      {itensAbaixoDoMinimo.length > 0 && (
        <div className="bg-white rounded-lg p-4 mb-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Itens abaixo do estoque mínimo
          </p>
          {itensAbaixoDoMinimo.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-t border-slate-100 text-sm">
              <span>{item.nome}</span>
              <span className="text-red-600 font-semibold">
                {item.estoque_atual} / minimo {item.estoque_minimo}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="px-4 py-2.5 font-normal">Item</th>
              <th className="px-4 py-2.5 font-normal">Categoria</th>
              <th className="px-4 py-2.5 font-normal">Saldo</th>
              <th className="px-4 py-2.5 font-normal">Custo médio</th>
              <th className="px-4 py-2.5 font-normal w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={5}>Carregando...</td>
              </tr>
            )}
            {error && (
              <tr>
                <td className="px-4 py-4 text-red-500" colSpan={5}>{error}</td>
              </tr>
            )}
            {itens.map((item: ItemEstoque) => (
              <tr key={item.id} className="border-b border-slate-50 last:border-0 group">
                <td className="px-4 py-2.5">{item.nome}</td>
                <td className="px-4 py-2.5 text-slate-500">{item.categoria}</td>
                <td className={`px-4 py-2.5 ${item.estoque_atual <= item.estoque_minimo ? 'text-red-600 font-medium' : ''}`}>
                  {item.estoque_atual} {item.unidade_medida}
                </td>
                <td className="px-4 py-2.5">{formatarMoeda(item.custo_medio)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => setItemEditando(item)}
                    title="Editar item"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <NovaEntradaModal
          itens={itens}
          onClose={() => setModalAberto(false)}
          onSaved={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}

      {itemEditando && (
        <EditarItemModal
          item={itemEditando}
          onClose={() => setItemEditando(null)}
          onSaved={() => {
            setItemEditando(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
