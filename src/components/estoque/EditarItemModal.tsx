import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useEstoque } from '../../hooks/useEstoque';
import type { CategoriaItem, ItemEstoque, UnidadeMedida } from '../../types/estoque';

interface Props {
  item: ItemEstoque;
  onClose: () => void;
  onSaved: () => void;
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

export function EditarItemModal({ item, onClose, onSaved }: Props) {
  const { editarItem } = useEstoque();

  const [nome, setNome] = useState(item.nome);
  const [categoria, setCategoria] = useState<CategoriaItem>(item.categoria);
  const [unidade, setUnidade] = useState<UnidadeMedida>(item.unidade_medida);
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(item.estoque_minimo));
  const [estoqueAtual, setEstoqueAtual] = useState(String(item.estoque_atual));
  const [custoMedio, setCustoMedio] = useState(String(item.custo_medio));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Reinicializa os campos sempre que o item mudar
  useEffect(() => {
    setNome(item.nome);
    setCategoria(item.categoria);
    setUnidade(item.unidade_medida);
    setEstoqueMinimo(String(item.estoque_minimo));
    setEstoqueAtual(String(item.estoque_atual));
    setCustoMedio(String(item.custo_medio));
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
        estoque_atual: Number(estoqueAtual) || 0,
        custo_medio: Number(custoMedio) || 0,
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar alterações.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Editar item</h2>
            <p className="text-xs text-slate-400">Altere os dados cadastrais do item</p>
          </div>
          <button onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-medium text-slate-500">Nome do item</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Categoria e Unidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaItem)}
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

          {/* Estoque mínimo */}
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

          {/* Saldo atual e Custo médio — editáveis */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Saldo atual</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
              <p className="text-[11px] text-slate-400 mt-1">Corrija se o saldo estiver errado.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Custo médio (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={custoMedio}
                onChange={(e) => setCustoMedio(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
              <p className="text-[11px] text-slate-400 mt-1">Corrija se o custo estiver errado.</p>
            </div>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
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
  );
}
