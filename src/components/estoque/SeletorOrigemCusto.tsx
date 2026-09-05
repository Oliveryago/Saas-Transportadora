import { useEffect, useState } from 'react';
import { Package, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { aplicarCustoMedioDosLotes, buscarCustoMedioPorItem } from '../../services/estoque/custoMedio';
import type { ItemEstoque } from '../../types/estoque';

type Origem = 'direto' | 'estoque';

interface Props {
  valor: string;
  onChangeValor: (valor: string) => void;
  onSelecionarItemEstoque: (itemId: string | null, quantidade: number) => void;
  labelValor?: string;
}

export function SeletorOrigemCusto({
  valor,
  onChangeValor,
  onSelecionarItemEstoque,
  labelValor = 'Valor (R$)',
}: Props) {
  const [origem, setOrigem] = useState<Origem>('direto');
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState('1');

  useEffect(() => {
    let ativo = true;
    supabase
      .from('itens_estoque')
      .select('*')
      .eq('ativo', true)
      .order('nome')
      .then(async ({ data }) => {
        const itens = (data as ItemEstoque[]) ?? [];
        try {
          const tenantId = itens[0]?.tenant_id;
          if (!tenantId) {
            if (ativo) setItens(itens);
            return;
          }
          const custos = await buscarCustoMedioPorItem(tenantId);
          if (ativo) setItens(aplicarCustoMedioDosLotes(itens, custos));
        } catch {
          if (ativo) setItens(itens);
        }
      });
    return () => {
      ativo = false;
    };
  }, []);

  const itemSelecionado = itens.find((i) => i.id === itemId);
  const qtdNumero = Number(quantidade) || 0;
  const valorCalculado = itemSelecionado ? itemSelecionado.custo_medio * qtdNumero : 0;
  const saldoInsuficiente = itemSelecionado ? qtdNumero > itemSelecionado.estoque_atual : false;

  useEffect(() => {
    if (origem === 'estoque' && itemSelecionado) {
      onChangeValor(valorCalculado.toFixed(2));
      onSelecionarItemEstoque(itemId, qtdNumero);
    } else if (origem === 'direto') {
      onSelecionarItemEstoque(null, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origem, itemId, quantidade]);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOrigem('direto')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition ${
            origem === 'direto'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Wallet size={12} />
          Pagamento direto
        </button>
        <button
          type="button"
          onClick={() => setOrigem('estoque')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition ${
            origem === 'estoque'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Package size={12} />
          Usar item do estoque
        </button>
      </div>

      {/* Pagamento direto */}
      {origem === 'direto' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labelValor}</label>
          <input
            type="number"
            value={valor}
            onChange={(e) => onChangeValor(e.target.value)}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Usar do estoque */}
      {origem === 'estoque' && (
        <div className="space-y-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700">Item do estoque</p>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Item</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um item</option>
              {itens.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} — saldo: {item.estoque_atual} {item.unidade_medida}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Quantidade
              {itemSelecionado && (
                <span className="ml-2 text-gray-400">
                  (disponível: {itemSelecionado.estoque_atual} {itemSelecionado.unidade_medida})
                </span>
              )}
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              min="1"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                saldoInsuficiente
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {saldoInsuficiente && (
              <p className="text-xs text-red-500 mt-1">
                ⚠ Saldo insuficiente. Disponível: {itemSelecionado?.estoque_atual}
              </p>
            )}
          </div>

          {/* Valor calculado (read-only) */}
          <div className="bg-white border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Valor calculado (custo médio × quantidade)</p>
            <p className="text-base font-semibold text-blue-700 mt-0.5">
              {valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
