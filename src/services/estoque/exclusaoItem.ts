import { supabase } from "../../lib/supabase";
import type { ItemEstoque } from "../../types/estoque";

export type CasoExclusaoItem = "sem_lote" | "lotes_intocados" | "consumido";

export interface LoteResumoExclusao {
  id: string;
  quantidade_recebida: number;
  quantidade_restante: number;
  valor_unitario: number;
  valor_lote: number;
  origem: string;
}

export interface AvaliacaoExclusaoItem {
  caso: CasoExclusaoItem;
  lotes: LoteResumoExclusao[];
  valorTotal: number;
}

const PNEU_CONSUMIDO = new Set([
  "montado",
  "em_uso",
  "recapado",
  "baixado",
  "descartado",
]);

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unwrapNota(nota: unknown): { numero_nota?: string | null; chave_acesso?: string | null } | null {
  if (!nota) return null;
  const row = Array.isArray(nota) ? nota[0] : nota;
  if (!row || typeof row !== "object") return null;
  return row as { numero_nota?: string | null; chave_acesso?: string | null };
}

function origemLote(nota: unknown): string {
  const row = unwrapNota(nota);
  if (!row) return "Entrada manual";
  if (row.numero_nota) return `NF ${row.numero_nota}`;
  if (row.chave_acesso) return `NF ${String(row.chave_acesso).slice(-8)}`;
  return "Entrada manual";
}

function throwIfError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || "Falha ao consultar o estoque.");
}

export async function avaliarExclusaoItem(
  tenantId: string,
  itemId: string,
): Promise<AvaliacaoExclusaoItem> {
  const { data: lotesData, error: lotesError } = await supabase
    .from("lotes_estoque")
    .select("id, quantidade_recebida, quantidade_restante, valor_unitario, nota_fiscal_id")
    .eq("tenant_id", tenantId)
    .eq("item_id", itemId);

  throwIfError(lotesError);

  const notaIds = [...new Set((lotesData ?? []).map((lote) => lote.nota_fiscal_id).filter(Boolean))] as string[];
  const notasPorId = new Map<string, { numero_nota?: string | null; chave_acesso?: string | null }>();
  if (notaIds.length > 0) {
    const { data: notas, error: notasError } = await supabase
      .from("notas_fiscais")
      .select("id, numero_nota, chave_acesso")
      .eq("tenant_id", tenantId)
      .in("id", notaIds);
    throwIfError(notasError);
    for (const nota of notas ?? []) {
      notasPorId.set(nota.id, nota);
    }
  }

  const lotes: LoteResumoExclusao[] = (lotesData ?? []).map((lote) => {
    const recebida = num(lote.quantidade_recebida);
    const unitario = num(lote.valor_unitario);
    return {
      id: lote.id,
      quantidade_recebida: recebida,
      quantidade_restante: num(lote.quantidade_restante),
      valor_unitario: unitario,
      valor_lote: recebida * unitario,
      origem: origemLote(lote.nota_fiscal_id ? notasPorId.get(lote.nota_fiscal_id) : null),
    };
  });

  const valorTotal = lotes.reduce((acc, lote) => acc + lote.valor_lote, 0);

  const [{ count: saidas, error: saidasError }, { count: manutencoes, error: manutError }, { data: pneus, error: pneusError }] =
    await Promise.all([
      supabase
        .from("movimentacoes_estoque")
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId)
        .eq("tipo", "saida"),
      supabase
        .from("manutencao_itens")
        .select("id", { count: "exact", head: true })
        .eq("item_id", itemId),
      supabase
        .from("pneus_individuais")
        .select("id, status, vehicle_id, manutencao_id")
        .eq("tenant_id", tenantId)
        .eq("item_id", itemId),
    ]);

  throwIfError(saidasError);
  throwIfError(manutError);
  throwIfError(pneusError);

  const loteConsumido = lotes.some(
    (lote) => lote.quantidade_restante + 0.0001 < lote.quantidade_recebida,
  );

  const pneuConsumido = (pneus ?? []).some(
    (pneu) =>
      PNEU_CONSUMIDO.has(String(pneu.status ?? "")) ||
      Boolean(pneu.vehicle_id) ||
      Boolean(pneu.manutencao_id),
  );

  const consumido =
    loteConsumido || (saidas ?? 0) > 0 || (manutencoes ?? 0) > 0 || pneuConsumido;

  if (consumido) {
    return { caso: "consumido", lotes, valorTotal };
  }
  if (lotes.length > 0) {
    return { caso: "lotes_intocados", lotes, valorTotal };
  }
  return { caso: "sem_lote", lotes, valorTotal: 0 };
}

export async function excluirItemEstoque(
  tenantId: string,
  item: ItemEstoque,
): Promise<void> {
  const avaliacao = await avaliarExclusaoItem(tenantId, item.id);
  if (avaliacao.caso === "consumido") {
    throw new Error(
      "Este item já teve consumo em manutenção e não pode ser excluído. Inative-o para tirá-lo das novas entradas.",
    );
  }

  const { data: lotesAntes, error: lotesAntesError } = await supabase
    .from("lotes_estoque")
    .select("id, nota_fiscal_id")
    .eq("tenant_id", tenantId)
    .eq("item_id", item.id);
  throwIfError(lotesAntesError);

  const loteIds = [...new Set((lotesAntes ?? []).map((lote) => lote.id))];
  const notaIds = [...new Set((lotesAntes ?? []).map((lote) => lote.nota_fiscal_id).filter(Boolean))] as string[];

  if (loteIds.length > 0) {
    const { error: pneusLoteError } = await supabase
      .from("pneus_individuais")
      .delete()
      .eq("tenant_id", tenantId)
      .in("lote_id", loteIds);
    throwIfError(pneusLoteError);
  }

  const { error: pneusItemError } = await supabase
    .from("pneus_individuais")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("item_id", item.id);
  throwIfError(pneusItemError);

  const { error: movError } = await supabase
    .from("movimentacoes_estoque")
    .delete()
    .eq("item_id", item.id);
  throwIfError(movError);

  const { error: lotesError } = await supabase
    .from("lotes_estoque")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("item_id", item.id);
  throwIfError(lotesError);

  const { error } = await supabase
    .from("itens_estoque")
    .delete()
    .eq("id", item.id)
    .eq("tenant_id", tenantId);

  throwIfError(error);

  await removerNotasSemLotes(tenantId, notaIds);
}

async function removerNotasSemLotes(tenantId: string, notaIds: string[]): Promise<void> {
  for (const notaId of notaIds) {
    const { count, error: countError } = await supabase
      .from("lotes_estoque")
      .select("id", { count: "exact", head: true })
      .eq("nota_fiscal_id", notaId);
    throwIfError(countError);
    if ((count ?? 0) > 0) continue;

    const { error } = await supabase
      .from("notas_fiscais")
      .delete()
      .eq("id", notaId)
      .eq("tenant_id", tenantId);
    throwIfError(error);
  }
}

export async function inativarItemEstoque(tenantId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from("itens_estoque")
    .update({ ativo: false })
    .eq("id", itemId)
    .eq("tenant_id", tenantId);

  throwIfError(error);
}

export async function reativarItemEstoque(tenantId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from("itens_estoque")
    .update({ ativo: true })
    .eq("id", itemId)
    .eq("tenant_id", tenantId);

  throwIfError(error);
}
