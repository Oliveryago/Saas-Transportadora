import { supabase } from "../../lib/supabase";
import type { ConsumoLoteParte, OrigemConsumoLote } from "../../types";
import type { LoteEstoque } from "../../types/estoque";
import { sincronizarCustoMedioItem } from "./custoMedio";

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unwrapNota(nota: unknown): {
  numero_nota: string | null;
  chave_acesso: string | null;
  fornecedor_nome: string | null;
} | null {
  if (!nota) return null;
  const row = Array.isArray(nota) ? nota[0] : nota;
  if (!row || typeof row !== "object") return null;
  const n = row as Record<string, unknown>;
  return {
    numero_nota: (n.numero_nota as string) || null,
    chave_acesso: (n.chave_acesso as string) || null,
    fornecedor_nome: (n.fornecedor_nome as string) || null,
  };
}

export async function listarLotesComSaldo(tenantId: string, itemId?: string): Promise<LoteEstoque[]> {
  let query = supabase
    .from("lotes_estoque")
    .select("id, tenant_id, item_id, nota_fiscal_id, quantidade_recebida, quantidade_restante, valor_unitario, criado_em, nota:notas_fiscais(numero_nota, chave_acesso, fornecedor_nome)")
    .eq("tenant_id", tenantId)
    .gt("quantidade_restante", 0)
    .order("criado_em", { ascending: true });
  if (itemId) query = query.eq("item_id", itemId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const nota = unwrapNota(row.nota);
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      item_id: row.item_id,
      nota_fiscal_id: row.nota_fiscal_id,
      quantidade_recebida: num(row.quantidade_recebida),
      quantidade_restante: num(row.quantidade_restante),
      valor_unitario: num(row.valor_unitario),
      criado_em: row.criado_em,
      numero_nota: nota?.numero_nota ?? null,
      chave_acesso: nota?.chave_acesso ?? null,
      fornecedor_nome: nota?.fornecedor_nome ?? null,
    };
  });
}

export async function saldoDisponivelLotes(tenantId: string, itemId: string): Promise<number> {
  const lotes = await listarLotesComSaldo(tenantId, itemId);
  return lotes.reduce((sum, lote) => sum + lote.quantidade_restante, 0);
}

export async function saldosPorItem(tenantId: string): Promise<Map<string, number>> {
  const lotes = await listarLotesComSaldo(tenantId);
  const mapa = new Map<string, number>();
  for (const lote of lotes) {
    mapa.set(lote.item_id, (mapa.get(lote.item_id) || 0) + lote.quantidade_restante);
  }
  return mapa;
}

export function planejarConsumoPeps(
  lotes: LoteEstoque[],
  quantidade: number,
  origem: OrigemConsumoLote = "estoque_anterior",
): ConsumoLoteParte[] {
  const partes: ConsumoLoteParte[] = [];
  let restante = quantidade;
  for (const lote of lotes) {
    if (restante <= 0) break;
    const take = Math.min(lote.quantidade_restante, restante);
    if (take <= 0) continue;
    partes.push({
      lote_id: lote.id,
      item_id: lote.item_id,
      quantidade: take,
      valor_unitario: lote.valor_unitario,
      custo: Math.round(take * lote.valor_unitario * 100) / 100,
      nota_fiscal_id: lote.nota_fiscal_id,
      numero_nota: lote.numero_nota ?? null,
      chave_acesso: lote.chave_acesso ?? null,
      fornecedor_nome: lote.fornecedor_nome ?? null,
      origem,
    });
    restante = Math.round((restante - take) * 1000) / 1000;
  }
  if (restante > 0.0001) {
    throw new Error(
      `Estoque insuficiente nos lotes. Faltam ${restante.toLocaleString("pt-BR")} unidade(s) para completar a baixa PEPS.`
    );
  }
  return partes;
}

export async function consumirPeps(input: {
  tenantId: string;
  itemId: string;
  quantidade: number;
  maintenanceId?: string;
  vehicleId?: string;
  observacao?: string;
  origem?: OrigemConsumoLote;
  loteIdsPermitidos?: string[];
}): Promise<ConsumoLoteParte[]> {
  const quantidade = Number(input.quantidade);
  if (!Number.isFinite(quantidade) || quantidade <= 0) return [];

  let lotes = await listarLotesComSaldo(input.tenantId, input.itemId);
  if (input.loteIdsPermitidos?.length) {
    const permitidos = new Set(input.loteIdsPermitidos);
    lotes = lotes.filter((lote) => permitidos.has(lote.id));
  }

  const partes = planejarConsumoPeps(lotes, quantidade, input.origem ?? "estoque_anterior");

  for (const parte of partes) {
    const lote = lotes.find((l) => l.id === parte.lote_id);
    if (!lote) throw new Error("Lote não encontrado na baixa PEPS.");
    const novoRestante = Math.round((lote.quantidade_restante - parte.quantidade) * 1000) / 1000;
    const { error: loteErr } = await supabase
      .from("lotes_estoque")
      .update({ quantidade_restante: novoRestante })
      .eq("id", parte.lote_id)
      .eq("tenant_id", input.tenantId);
    if (loteErr) throw new Error(loteErr.message);
    lote.quantidade_restante = novoRestante;

    const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
      item_id: input.itemId,
      tipo: "saida",
      quantidade: parte.quantidade,
      valor_unitario: parte.valor_unitario,
      vehicle_id: input.vehicleId ?? null,
      maintenance_id: input.maintenanceId ?? null,
      observacao: input.observacao ?? "Baixa PEPS via manutencao",
    });
    if (movErr) throw new Error(movErr.message);

    if (input.maintenanceId) {
      const { error: miErr } = await supabase.from("manutencao_itens").insert({
        maintenance_id: input.maintenanceId,
        item_id: input.itemId,
        quantidade: parte.quantidade,
        custo_alocado: parte.custo,
      });
      if (miErr) throw new Error(miErr.message);
    }
  }

  try {
    await sincronizarCustoMedioItem(input.tenantId, input.itemId);
  } catch {
    // cache
  }

  return partes;
}

export function custoTotalPartes(partes: ConsumoLoteParte[]): number {
  return Math.round(partes.reduce((sum, p) => sum + p.custo, 0) * 100) / 100;
}
