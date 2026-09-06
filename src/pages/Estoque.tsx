import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CircleDot, Droplet, Filter, Flame, Package, Pencil, Plus, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useEstoque } from '../hooks/useEstoque';
import type { CategoriaItem, ItemEstoque } from '../types/estoque';
import { NovaEntradaModal } from '../components/estoque/NovaEntradaModal';
import { EditarItemModal } from '../components/estoque/EditarItemModal';
import { ExcluirItemModal } from '../components/estoque/ExcluirItemModal';
import { PlanLockBanner, PlanWriteButton } from '../components/shared/PlanWriteButton';
import { usePlanAccess } from '../hooks/usePlanAccess';

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
  const { canWrite } = usePlanAccess('estoque');
  const {
    itens,
    itensAtivos,
    loading,
    error,
    itensAbaixoDoMinimo,
    valorTotalEmEstoque,
    recarregar,
    reativarItem,
  } = useEstoque();
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemEstoque | null>(null);
  const [itemExcluindo, setItemExcluindo] = useState<ItemEstoque | null>(null);
  const [reativandoId, setReativandoId] = useState<string | null>(null);

  const categorias = Array.from(new Set(itens.map((item) => item.categoria)));
  const itensOrdenados = [...itens].sort((a, b) => {
    if (a.ativo === false && b.ativo !== false) return 1;
    if (a.ativo !== false && b.ativo === false) return -1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  async function handleReativar(item: ItemEstoque) {
    if (!canWrite) return;
    setReativandoId(item.id);
    try {
      await reativarItem(item.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível reativar o item.');
    } finally {
      setReativandoId(null);
    }
  }

  return (
    <div className="p-6">
      <PlanLockBanner moduleKey="estoque" />
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Estoque de peças</h1>
          <p className="text-sm text-slate-500">Controle de peças e insumos da frota</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pneus/aguardando"
            className="flex items-center gap-2 border border-slate-200 text-slate-700 text-sm px-4 py-2 rounded-md hover:bg-slate-50"
          >
            <Flame size={16} />
            Marcação de fogo
          </Link>
          <PlanWriteButton
            moduleKey="estoque"
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            Nova entrada
          </PlanWriteButton>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl p-6 text-white flex items-center justify-between mb-5">
        <div>
          <p className="text-sm opacity-85">Valor total em estoque</p>
          <p className="text-3xl font-bold">{formatarMoeda(valorTotalEmEstoque)}</p>
          <p className="text-xs opacity-75 mt-1">
            {itensAtivos.length} itens ativos
            {itens.length - itensAtivos.length > 0 ? ` · ${itens.length - itensAtivos.length} inativo(s)` : ''}
          </p>
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
              <th className="px-4 py-2.5 font-normal w-24"></th>
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
            {itensOrdenados.map((item: ItemEstoque) => (
              <tr
                key={item.id}
                className={`border-b border-slate-50 last:border-0 group ${item.ativo === false ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    {item.nome}
                    {item.ativo === false && (
                      <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{item.categoria}</td>
                <td className={`px-4 py-2.5 ${item.estoque_atual <= item.estoque_minimo ? 'text-red-600 font-medium' : ''}`}>
                  {item.estoque_atual} {item.unidade_medida}
                </td>
                <td className="px-4 py-2.5">{formatarMoeda(item.custo_medio)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {item.ativo === false && (
                      <PlanWriteButton
                        moduleKey="estoque"
                        iconOnly
                        onClick={() => void handleReativar(item)}
                        disabled={reativandoId === item.id}
                        title="Reativar item"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 transition disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                      </PlanWriteButton>
                    )}
                    <PlanWriteButton
                      moduleKey="estoque"
                      iconOnly
                      onClick={() => setItemEditando(item)}
                      title="Editar item"
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                    >
                      <Pencil size={14} />
                    </PlanWriteButton>
                    <PlanWriteButton
                      moduleKey="estoque"
                      iconOnly
                      onClick={() => setItemExcluindo(item)}
                      title="Excluir item"
                      className="p-1.5 text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={14} />
                    </PlanWriteButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && modalAberto && (
        <NovaEntradaModal
          itens={itensAtivos}
          onClose={() => setModalAberto(false)}
          onSaved={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}

      {canWrite && itemEditando && (
        <EditarItemModal
          item={itemEditando}
          onClose={() => setItemEditando(null)}
          onSaved={() => {
            setItemEditando(null);
            recarregar();
          }}
          onExcluir={() => {
            const atual = itemEditando;
            setItemEditando(null);
            setItemExcluindo(atual);
          }}
        />
      )}

      {canWrite && itemExcluindo && (
        <ExcluirItemModal
          item={itemExcluindo}
          onClose={() => setItemExcluindo(null)}
          onDone={() => {
            setItemExcluindo(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
