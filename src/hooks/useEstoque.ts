import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  ItemEstoque,
  MovimentacaoEstoque,
  NovaEntradaInput,
  NovaSaidaInput,
} from '../types/estoque';

export function useEstoque() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarItens = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('itens_estoque')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setItens(data as ItemEstoque[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  const criarItem = useCallback(
    async (item: Pick<ItemEstoque, 'nome' | 'categoria' | 'unidade_medida' | 'estoque_minimo'> & { tenant_id: string }) => {
      const { data, error } = await supabase.from('itens_estoque').insert(item).select().single();
      if (error) throw error;
      await carregarItens();
      return data as ItemEstoque;
    },
    [carregarItens]
  );

  const editarItem = useCallback(
    async (
      id: string,
      updates: Pick<ItemEstoque, 'nome' | 'categoria' | 'unidade_medida' | 'estoque_minimo' | 'estoque_atual' | 'custo_medio'>
    ) => {
      const { error } = await supabase
        .from('itens_estoque')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      await carregarItens();
    },
    [carregarItens]
  );

  const registrarEntrada = useCallback(
    async (input: NovaEntradaInput) => {
      const { error } = await supabase.rpc('registrar_entrada_estoque', {
        p_item_id: input.itemId,
        p_quantidade: input.quantidade,
        p_valor_unitario: input.valorUnitario,
        p_fornecedor_id: input.fornecedorId ?? null,
        p_observacao: input.observacao ?? null,
      });
      if (error) throw error;
      await carregarItens();
    },
    [carregarItens]
  );

  const registrarSaida = useCallback(
    async (input: NovaSaidaInput) => {
      const { error } = await supabase.rpc('registrar_saida_estoque', {
        p_item_id: input.itemId,
        p_quantidade: input.quantidade,
        p_vehicle_id: input.caminhaoId ?? null,
        p_maintenance_id: input.manutencaoId ?? null,
        p_observacao: input.observacao ?? null,
      });
      if (error) throw error;
      await carregarItens();
    },
    [carregarItens]
  );

  const buscarHistoricoItem = useCallback(async (itemId: string) => {
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('item_id', itemId)
      .order('data_movimento', { ascending: false });
    if (error) throw error;
    return data as MovimentacaoEstoque[];
  }, []);

  const itensAbaixoDoMinimo = itens.filter((item) => item.estoque_atual <= item.estoque_minimo);
  const valorTotalEmEstoque = itens.reduce((total, item) => total + item.estoque_atual * item.custo_medio, 0);

  return {
    itens,
    loading,
    error,
    itensAbaixoDoMinimo,
    valorTotalEmEstoque,
    criarItem,
    editarItem,
    registrarEntrada,
    registrarSaida,
    buscarHistoricoItem,
    recarregar: carregarItens,
  };
}
