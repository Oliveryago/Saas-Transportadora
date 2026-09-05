import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { writeWithColumnFallback } from '../lib/supabaseWrite';
import {
  excluirItemEstoque,
  inativarItemEstoque,
  reativarItemEstoque,
} from '../services/estoque/exclusaoItem';
import { aplicarCustoMedioDosLotes, buscarCustoMedioPorItem } from '../services/estoque/custoMedio';
import type {
  CamposCadastroItem,
  ItemEstoque,
  MovimentacaoEstoque,
  NovaEntradaInput,
  NovaSaidaInput,
} from '../types/estoque';

export function useEstoque() {
  const { tenant } = useAuth();
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarItens = useCallback(async () => {
    if (!tenant?.id) {
      setItens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('itens_estoque')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('nome', { ascending: true });

    if (err) {
      setError(err.message);
      setItens([]);
    } else {
      try {
        const custos = await buscarCustoMedioPorItem(tenant.id);
        setItens(aplicarCustoMedioDosLotes((data as ItemEstoque[]) ?? [], custos));
      } catch {
        setItens((data as ItemEstoque[]) ?? []);
      }
    }
    setLoading(false);
  }, [tenant?.id]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  const criarItem = useCallback(
    async (item: CamposCadastroItem & { tenant_id: string }) => {
      const payload: Record<string, unknown> = {
        ...item,
        rastreavel_individualmente: item.rastreavel_individualmente ?? item.categoria === 'pneu',
      };
      const data = await writeWithColumnFallback<ItemEstoque>(
        async (next) => supabase.from('itens_estoque').insert(next).select().single(),
        payload
      );
      await carregarItens();
      return data;
    },
    [carregarItens]
  );

  const editarItem = useCallback(
    async (id: string, updates: CamposCadastroItem) => {
      if (!tenant?.id) throw new Error('Empresa não identificada.');
      await writeWithColumnFallback<ItemEstoque>(
        async (next) =>
          supabase
            .from('itens_estoque')
            .update(next)
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .select()
            .single(),
        updates as Record<string, unknown>
      );
      await carregarItens();
    },
    [carregarItens, tenant?.id]
  );

  const excluirItem = useCallback(
    async (item: ItemEstoque) => {
      if (!tenant?.id) throw new Error('Empresa não identificada.');
      await excluirItemEstoque(tenant.id, item);
      await carregarItens();
    },
    [carregarItens, tenant?.id]
  );

  const inativarItem = useCallback(
    async (itemId: string) => {
      if (!tenant?.id) throw new Error('Empresa não identificada.');
      await inativarItemEstoque(tenant.id, itemId);
      await carregarItens();
    },
    [carregarItens, tenant?.id]
  );

  const reativarItem = useCallback(
    async (itemId: string) => {
      if (!tenant?.id) throw new Error('Empresa não identificada.');
      await reativarItemEstoque(tenant.id, itemId);
      await carregarItens();
    },
    [carregarItens, tenant?.id]
  );

  const registrarEntrada = useCallback(
    async (input: NovaEntradaInput) => {
      const { error: err } = await supabase.rpc('registrar_entrada_estoque', {
        p_item_id: input.itemId,
        p_quantidade: input.quantidade,
        p_valor_unitario: input.valorUnitario,
        p_fornecedor_id: input.fornecedorId ?? null,
        p_observacao: input.observacao ?? null,
      });
      if (err) throw err;
      await carregarItens();
    },
    [carregarItens]
  );

  const registrarSaida = useCallback(
    async (input: NovaSaidaInput) => {
      const { error: err } = await supabase.rpc('registrar_saida_estoque', {
        p_item_id: input.itemId,
        p_quantidade: input.quantidade,
        p_vehicle_id: input.caminhaoId ?? null,
        p_maintenance_id: input.manutencaoId ?? null,
        p_observacao: input.observacao ?? null,
      });
      if (err) throw err;
      await carregarItens();
    },
    [carregarItens]
  );

  const buscarHistoricoItem = useCallback(async (itemId: string) => {
    const { data, error: err } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('item_id', itemId)
      .order('data_movimento', { ascending: false });
    if (err) throw err;
    return data as MovimentacaoEstoque[];
  }, []);

  const itensAtivos = useMemo(() => itens.filter((item) => item.ativo !== false), [itens]);
  const itensAbaixoDoMinimo = itensAtivos.filter((item) => item.estoque_atual <= item.estoque_minimo);
  const valorTotalEmEstoque = itens.reduce((total, item) => total + item.estoque_atual * item.custo_medio, 0);

  return {
    itens,
    itensAtivos,
    loading,
    error,
    itensAbaixoDoMinimo,
    valorTotalEmEstoque,
    criarItem,
    editarItem,
    excluirItem,
    inativarItem,
    reativarItem,
    registrarEntrada,
    registrarSaida,
    buscarHistoricoItem,
    recarregar: carregarItens,
  };
}
