import { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { useEstoque } from '../../hooks/useEstoque';
import { formatBRL } from '../../lib/utils/money';
import type { CategoriaItem, ItemEstoque, UnidadeMedida } from '../../types/estoque';
import { itemEhRastreavel } from '../../types/pneu';

interface Props {
  item: ItemEstoque;
  onClose: () => void;
  onSaved: () => void;
  onExcluir: () => void;
}

const CATEGORIAS: { value: CategoriaItem; label: string }[] = [
  { value: 'oleo', label: 'Óleo' },
  { value: 'pneu', label: 'Pneu' },
  { value: 'filtro', label: 'Filtro' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'peca_motor', label: 'Peça de Motor' },
  { value: 'outro', label: 'Outro' },
];

const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'litro', label: 'Litro' },
  { value: 'kit', label: 'Kit' },
];

export function EditarItemModal({ item, onClose, onSaved, onExcluir }: Props) {
  const { editarItem, reativarItem } = useEstoque();

  const [nome, setNome] = useState(item.nome);
  const [categoria, setCategoria] = useState<CategoriaItem>(item.categoria);
  const [unidade, setUnidade] = useState<UnidadeMedida>(item.unidade_medida);
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(item.estoque_minimo));
  const [ncm, setNcm] = useState(item.ncm ?? '');
  const [marca, setMarca] = useState(item.marca ?? '');
  const [modelo, setModelo] = useState(item.modelo ?? '');
  const [medida, setMedida] = useState(item.medida ?? '');
  const [rastreavel, setRastreavel] = useState(item.rastreavel_individualmente ?? item.categoria === 'pneu');
  const [salvando, setSalvando] = useState(false);
  const [reativando, setReativando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mostraMedida = categoria === 'pneu' || rastreavel || itemEhRastreavel({ ...item, categoria, rastreavel_individualmente: rastreavel, nome });

  useEffect(() => {
    setNome(item.nome);
    setCategoria(item.categoria);
    setUnidade(item.unidade_medida);
    setEstoqueMinimo(String(item.estoque_minimo));
    setNcm(item.ncm ?? '');
    setMarca(item.marca ?? '');
    setModelo(item.modelo ?? '');
    setMedida(item.medida ?? '');
    setRastreavel(item.rastreavel_individualmente ?? item.categoria === 'pneu');
    setErro(null);
  }, [item.id]);

  async function salvar() {
    setErro(null);
    if (!nome.trim()) {
      setErro('O nome do item é obrigatório.');
      return;
    }
    setSalvando(true);
    try {
      await editarItem(item.id, {
        nome: nome.trim(),
        categoria,
        unidade_medida: unidade,
        estoque_minimo: Number(estoqueMinimo) || 0,
        rastreavel_individualmente: rastreavel,
        ncm: ncm.trim() || null,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        medida: mostraMedida ? (medida.trim() || null) : (item.medida ?? null),
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar alterações.');
    } finally {
      setSalvando(false);
    }
  }

  async function reativar() {
    setErro(null);
    setReativando(true);
    try {
      await reativarItem(item.id);
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao reativar o item.');
    } finally {
      setReativando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Editar item</h2>
            <p className="text-xs text-slate-400">Altere os dados cadastrais. Lotes e histórico de consumo não mudam.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {item.ativo === false && (
            <div className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-600">
                Item inativo: não aparece em novas entradas nem no consumo de manutenção. O histórico permanece.
              </p>
              <button
                type="button"
                onClick={() => void reativar()}
                disabled={reativando}
                className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
              >
                {reativando ? 'Reativando...' : 'Reativar'}
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500">Nome do item</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => {
                  const next = e.target.value as CategoriaItem;
                  setCategoria(next);
                  if (next === 'pneu') setRastreavel(true);
                }}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 bg-white focus:outline-none focus:border-blue-400"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Unidade</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 bg-white focus:outline-none focus:border-blue-400"
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">NCM</label>
            <input
              type="text"
              inputMode="numeric"
              value={ncm}
              onChange={(e) => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Ex.: 40111000"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Marca</label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Modelo</label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>

          {mostraMedida && (
            <div>
              <label className="text-xs font-medium text-slate-500">Medida</label>
              <input
                type="text"
                value={medida}
                onChange={(e) => setMedida(e.target.value)}
                placeholder="Ex.: 295/80R22.5"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Vale para as próximas entradas. Pneus já registrados não são alterados.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500">Estoque mínimo</label>
            <input
              type="number"
              min="0"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Alerta será exibido quando o saldo ficar abaixo desse valor.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
              <p className="text-[11px] text-slate-400">Saldo atual</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {item.estoque_atual} {item.unidade_medida}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
              <p className="text-[11px] text-slate-400">Custo médio</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{formatBRL(item.custo_medio)}</p>
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-slate-400">
            Saldo e custo vêm dos lotes (notas fiscais). Não podem ser editados aqui.
          </p>

          <label className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={rastreavel}
              onChange={(e) => setRastreavel(e.target.checked)}
            />
            <span>
              <span className="font-medium">Rastreável individualmente</span>
              <span className="block text-[11px] text-slate-500">Marque para pneus: cada unidade ganha código de marcação de fogo. Óleo, filtro e demais itens continuam por saldo.</span>
            </span>
          </label>

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 mt-5">
          <button
            type="button"
            onClick={onExcluir}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Excluir
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition"
            >
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
