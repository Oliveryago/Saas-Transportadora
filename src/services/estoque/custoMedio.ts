import { supabase } from "../../lib/supabase";

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Custo médio ponderado pelos lotes com quantidade restante. */
export function custoMedioPonderado(
  lotes: Array<{ quantidade_restante?: unknown; valor_unitario?: unknown }>,
): number {
  let quantidade = 0;
  let valor = 0;
  for (const lote of lotes) {
    const qtd = num(lote.quantidade_restante);
    if (qtd <= 0) continue;
    quantidade += qtd;
    valor += qtd * num(lote.valor_unitario);
  }
  if (quantidade <= 0) return 0;
  return Math.round((valor / quantidade) * 100) / 100;
}

export async function buscarCustoMedioPorItem(tenantId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("lotes_estoque")
    .select("item_id, quantidade_restante, valor_unitario")
    .eq("tenant_id", tenantId);
  if (error) throw error;

  const porItem = new Map<string, Array<{ quantidade_restante: number; valor_unitario: number }>>();
  for (const lote of data ?? []) {
    if (!lote.item_id) continue;
    const lista = porItem.get(lote.item_id) ?? [];
    lista.push({
      quantidade_restante: num(lote.quantidade_restante),
      valor_unitario: num(lote.valor_unitario),
    });
    porItem.set(lote.item_id, lista);
  }

  const custos = new Map<string, number>();
  for (const [itemId, lotes] of porItem) {
    custos.set(itemId, custoMedioPonderado(lotes));
  }
  return custos;
}

export function aplicarCustoMedioDosLotes<T extends { id: string; custo_medio: number }>(
  itens: T[],
  custos: Map<string, number>,
): T[] {
  return itens.map((item) =>
    custos.has(item.id) ? { ...item, custo_medio: custos.get(item.id) as number } : item,
  );
}

export async function sincronizarCustoMedioItem(tenantId: string, itemId: string): Promise<number> {
  const { data, error } = await supabase
    .from("lotes_estoque")
    .select("quantidade_restante, valor_unitario")
    .eq("tenant_id", tenantId)
    .eq("item_id", itemId);
  if (error) throw error;

  const custo = custoMedioPonderado(data ?? []);
  const { error: updateError } = await supabase
    .from("itens_estoque")
    .update({ custo_medio: custo })
    .eq("id", itemId)
    .eq("tenant_id", tenantId);
  if (updateError) throw updateError;
  return custo;
}
