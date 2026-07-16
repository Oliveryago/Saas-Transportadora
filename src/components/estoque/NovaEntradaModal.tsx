import { useState } from 'react';
import { X } from 'lucide-react';
import { useEstoque } from '../../hooks/useEstoque';
import type { ItemEstoque } from '../../types/estoque';

interface Props {
  itens: ItemEstoque[];
  onClose: () => void;
  onSaved: () => void;
}

export function NovaEntradaModal({ itens, onClose, onSaved }: Props) {
  const { registrarEntrada } = useEstoque();
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!itemId || !quantidade || !valorUnitario) {
      setErro('Preencha item, quantidade e valor unitario.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await registrarEntrada({
        itemId,
        quantidade: Number(quantidade),
        valorUnitario: Number(valorUnitario),
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar entrada.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-slate-900">Nova entrada de estoque</h2>
          <button onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Item</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1"
            >
              <option value="">Selecione um item</option>
              {itens.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500">Quantidade</label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Valor unitario pago (R$)</label>
            <input
              type="number"
              value={valorUnitario}
              onChange={(e) => setValorUnitario(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm mt-1"
            />
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-md border border-slate-200">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Salvar entrada'}
          </button>
        </div>
      </div>
    </div>
  );
}
