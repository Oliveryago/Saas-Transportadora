import { supabase } from "../../lib/supabase";
import type { ConsumoLoteParte, MaintenancePart } from "../../types";
import type { NfeNota } from "../../types/nfe";
import { dataEntradaPneu, type PneuIndividual } from "../../types/pneu";
import {
  criarLoteEstoque,
  garantirNotaFiscal,
  inserirUnidadesPneu,
  upsertCodigoFornecedor,
  validarMarcacoesPneus,
} from "../nfe/nfeImportacao";
import { consumirPeps, custoTotalPartes } from "./peps";

export interface LinhaNfeManutencao {
  n_item: number;
  descricao: string;
  codigo_fornecedor: string;
  ncm: string;
  quantidade_total: number;
  valor_unitario: number;
  is_pneu: boolean;
  medida_extraida: string | null;
  item_id: string | null;
  item_nome: string | null;
  qty_estoque: number;
  qty_compra: number;
  marcacoes_fogo: string[];
  pneus_estoque_ids: string[];
}

export async function listarPneusEmEstoque(tenantId: string, itemId: string): Promise<PneuIndividual[]> {
  const { data, error } = await supabase
    .from("pneus_individuais")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("item_id", itemId)
    .in("status", ["em_estoque", "recapado", "disponivel"]);
  if (error) throw new Error(error.message);
  return ((data as PneuIndividual[]) ?? []).sort((a, b) => dataEntradaPneu(a).localeCompare(dataEntradaPneu(b)));
}

export function sugerirPneusMaisAntigos(pneus: PneuIndividual[], quantidade: number): string[] {
  const qtd = Math.max(0, Math.floor(quantidade));
  return pneus.slice(0, qtd).map((p) => p.id);
}

async function baixarPneus(tenantId: string, pneuIds: string[], maintenanceId: string) {
  if (!pneuIds.length) return;
  const { error } = await supabase
    .from("pneus_individuais")
    .update({ status: "baixado", manutencao_id: maintenanceId })
    .eq("tenant_id", tenantId)
    .in("id", pneuIds);
  if (error) throw new Error(error.message);
}

export async function aplicarLinhasNfeNaManutencao(input: {
  tenantId: string;
  maintenanceId: string;
  vehicleId?: string;
  nota: NfeNota;
  linhas: LinhaNfeManutencao[];
}): Promise<MaintenancePart[]> {
  const { tenantId, maintenanceId, vehicleId, nota, linhas } = input;
  const notaInfo = await garantirNotaFiscal(tenantId, nota);
  const parts: MaintenancePart[] = [];

  validarMarcacoesPneus(
    linhas
      .filter((linha) => linha.is_pneu && linha.qty_compra > 0)
      .map((linha) => ({
        descricao: linha.descricao,
        is_pneu: true,
        quantidade: linha.qty_compra,
        marcacoes_fogo: linha.marcacoes_fogo,
      })),
  );

  for (const linha of linhas) {
    if (linha.qty_estoque <= 0 && linha.qty_compra <= 0) continue;
    if (!linha.item_id) {
      throw new Error(`Vincule o item "${linha.descricao}" ao catálogo de estoque.`);
    }

    const lotePartes: ConsumoLoteParte[] = [];

    if (linha.qty_estoque > 0) {
      if (linha.is_pneu) {
        const disponiveis = await listarPneusEmEstoque(tenantId, linha.item_id);
        if (linha.pneus_estoque_ids.length !== Math.floor(linha.qty_estoque)) {
          throw new Error(`Selecione ${Math.floor(linha.qty_estoque)} pneu(s) do estoque para "${linha.descricao}".`);
        }
        const escolhidos = linha.pneus_estoque_ids.map((id) => disponiveis.find((p) => p.id === id));
        if (escolhidos.some((p) => !p)) {
          throw new Error(`Uma marcação de fogo escolhida para "${linha.descricao}" já não está disponível.`);
        }
        for (const pneu of escolhidos) {
          const partesE = await consumirPeps({
            tenantId,
            itemId: linha.item_id,
            quantidade: 1,
            maintenanceId,
            vehicleId,
            observacao: `Baixa PEPS pneu ${pneu!.codigo_marcacao || pneu!.id} — NF ${nota.numero_nota || ""}`,
            origem: "estoque_anterior",
            loteIdsPermitidos: pneu!.lote_id ? [pneu!.lote_id] : undefined,
          });
          lotePartes.push(...partesE);
        }
        await baixarPneus(tenantId, linha.pneus_estoque_ids, maintenanceId);
      } else {
        const partesE = await consumirPeps({
          tenantId,
          itemId: linha.item_id,
          quantidade: linha.qty_estoque,
          maintenanceId,
          vehicleId,
          observacao: `Baixa PEPS (já em estoque) — NF ${nota.numero_nota || ""}`,
          origem: "estoque_anterior",
        });
        lotePartes.push(...partesE);
      }
    }

    if (linha.qty_compra > 0) {
      if (notaInfo.temLotes) {
        throw new Error(
          `A NF-e ${nota.numero_nota || ""} já foi lançada no estoque. Informe as unidades em "já em estoque" em vez de comprar de novo.`
        );
      }
      const loteId = await criarLoteEstoque({
        tenantId,
        itemId: linha.item_id,
        notaFiscalId: notaInfo.id,
        quantidade: linha.qty_compra,
        valorUnitario: linha.valor_unitario,
      });
      await upsertCodigoFornecedor(tenantId, linha.item_id, nota.fornecedor_cnpj, linha.codigo_fornecedor);

      if (linha.is_pneu) {
        await supabase
          .from("itens_estoque")
          .update({ rastreavel_individualmente: true })
          .eq("id", linha.item_id)
          .eq("tenant_id", tenantId);
        const pneuIds = await inserirUnidadesPneu({
          tenantId,
          itemId: linha.item_id,
          loteId,
          quantidade: Math.floor(linha.qty_compra),
          valorUnitario: linha.valor_unitario,
          medida: linha.medida_extraida,
          marcacoes: linha.marcacoes_fogo,
          dataCompra: nota.data_emissao || null,
          notaFiscal: nota.chave_acesso,
          fornecedor: nota.fornecedor_nome || null,
        });
        await baixarPneus(tenantId, pneuIds, maintenanceId);
      }

      const partesC = await consumirPeps({
        tenantId,
        itemId: linha.item_id,
        quantidade: linha.qty_compra,
        maintenanceId,
        vehicleId,
        observacao: `Compra nesta nota e baixa imediata — NF ${nota.numero_nota || ""}`,
        origem: "nota_atual",
        loteIdsPermitidos: [loteId],
      });
      lotePartes.push(...partesC);
    }

    const quantidade = linha.qty_estoque + linha.qty_compra;
    const custo = custoTotalPartes(lotePartes);
    parts.push({
      name: linha.item_nome || linha.descricao,
      quantity: quantidade,
      cost: quantidade > 0 ? Math.round((custo / quantidade) * 100) / 100 : 0,
      origin: "estoque",
      item_id: linha.item_id,
      qty_estoque: linha.qty_estoque,
      qty_compra: linha.qty_compra,
      lotes: lotePartes,
      is_pneu: linha.is_pneu,
    });
  }

  return parts;
}
