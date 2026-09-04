import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { PneuIndividual, PneuMovimentacao, PneuRecapagem, PneuStatus } from "../types/pneu";

export function usePneusIndividuais() {
  const { tenant } = useAuth();
  const [pneus, setPneus] = useState<PneuIndividual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("pneus_individuais")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("codigo_marcacao", { ascending: false });
    if (err) setError(err.message);
    else setPneus((data as PneuIndividual[]) ?? []);
    setLoading(false);
  }, [tenant?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criarLoteEntrada = useCallback(async (input: {
    itemId: string;
    quantidade: number;
    valorUnitario: number;
    marca?: string;
    modelo?: string;
    medida?: string;
    notaFiscal?: string;
    fornecedor?: string;
    dataCompra?: string;
  }) => {
    if (!tenant?.id) throw new Error("Tenant não identificado.");
    const { data, error: err } = await supabase.rpc("criar_pneus_individuais", {
      p_tenant_id: tenant.id,
      p_item_id: input.itemId,
      p_quantidade: Math.floor(Number(input.quantidade)),
      p_valor_unitario: input.valorUnitario,
      p_marca: input.marca || null,
      p_modelo: input.modelo || null,
      p_medida: input.medida || null,
      p_nota_fiscal: input.notaFiscal || null,
      p_fornecedor: input.fornecedor || null,
      p_data_compra: input.dataCompra || new Date().toISOString().slice(0, 10),
    });
    if (err) throw err;
    await carregar();
    return (data as PneuIndividual[]) ?? [];
  }, [tenant?.id, carregar]);

  const atualizarStatus = useCallback(async (
    ids: string[],
    status: PneuStatus,
    extra?: { vehicle_id?: string | null; posicao?: string | null; observacao?: string }
  ) => {
    if (!tenant?.id || ids.length === 0) return;
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (extra && "vehicle_id" in extra) patch.vehicle_id = extra.vehicle_id ?? null;
    if (extra && "posicao" in extra) patch.posicao = extra.posicao ?? null;

    const { error: err } = await supabase
      .from("pneus_individuais")
      .update(patch)
      .in("id", ids)
      .eq("tenant_id", tenant.id);
    if (err) throw err;

    const movimentos = ids.map((pneu_id) => ({
      tenant_id: tenant.id,
      pneu_id,
      tipo: status,
      vehicle_id: extra?.vehicle_id ?? null,
      posicao: extra?.posicao ?? null,
      observacao: extra?.observacao ?? null,
    }));
    const { error: movErr } = await supabase.from("pneus_movimentacoes").insert(movimentos);
    if (movErr) throw movErr;
    await carregar();
  }, [tenant?.id, carregar]);

  const buscarPorCodigo = useCallback(async (codigo: string) => {
    if (!tenant?.id) return null;
    const { data, error: err } = await supabase
      .from("pneus_individuais")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("codigo_marcacao", codigo.trim().toUpperCase())
      .maybeSingle();
    if (err) throw err;
    return (data as PneuIndividual) ?? null;
  }, [tenant?.id]);

  const carregarFicha = useCallback(async (id: string) => {
    if (!tenant?.id) return null;
    const [{ data: pneu, error: pneuErr }, { data: movs }, { data: recaps }] = await Promise.all([
      supabase.from("pneus_individuais").select("*").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
      supabase.from("pneus_movimentacoes").select("*").eq("pneu_id", id).eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
      supabase.from("pneus_recapagens").select("*").eq("pneu_id", id).eq("tenant_id", tenant.id).order("data", { ascending: false }),
    ]);
    if (pneuErr) throw pneuErr;
    return {
      pneu: (pneu as PneuIndividual) ?? null,
      movimentacoes: (movs as PneuMovimentacao[]) ?? [],
      recapagens: (recaps as PneuRecapagem[]) ?? [],
    };
  }, [tenant?.id]);

  const registrarRecapagem = useCallback(async (pneuId: string, data: string, observacao?: string) => {
    if (!tenant?.id) throw new Error("Tenant não identificado.");
    const { error: err } = await supabase.from("pneus_recapagens").insert({
      tenant_id: tenant.id,
      pneu_id: pneuId,
      data,
      observacao: observacao || null,
    });
    if (err) throw err;
  }, [tenant?.id]);

  return {
    pneus,
    loading,
    error,
    recarregar: carregar,
    criarLoteEntrada,
    atualizarStatus,
    buscarPorCodigo,
    carregarFicha,
    registrarRecapagem,
  };
}
