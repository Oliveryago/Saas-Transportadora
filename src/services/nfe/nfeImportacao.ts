import { supabase } from "../../lib/supabase";
import { NfeImportError, type NfeConfirmResult, type NfeItemPreview, type NfePreview } from "../../types/nfe";
import type { CategoriaItem, UnidadeMedida } from "../../types/estoque";
import { sincronizarCustoMedioItem } from "../estoque/custoMedio";
import { parseNfeXml, somenteDigitos } from "./parseNfeXml";

export interface EntradaManualLinha {
  item_id: string | null;
  nome: string;
  categoria: CategoriaItem;
  unidade_medida: UnidadeMedida;
  quantidade: number;
  valor_unitario: number;
  is_pneu: boolean;
  medida: string | null;
  marcacoes_fogo: string[];
}

export async function preVisualizarNfe(xml: string, tenantId: string): Promise<NfePreview> {
  if (!tenantId) throw new NfeImportError("Tenant não identificado.");
  const { nota, itens } = parseNfeXml(xml);
  const cnpj = somenteDigitos(nota.fornecedor_cnpj);

  const ja_importada = await notaJaImportada(tenantId, nota.chave_acesso);

  const { data: mapas, error: mapErr } = await supabase
    .from("itens_estoque_codigos_fornecedor")
    .select("item_id, codigo_produto, item:itens_estoque(id, nome, ativo)")
    .eq("tenant_id", tenantId)
    .eq("fornecedor_cnpj", cnpj);
  if (mapErr) throw new NfeImportError(mapErr.message);

  const porCodigo = new Map<string, { id: string; nome: string }>();
  for (const row of mapas ?? []) {
    const item = unwrapItem(row.item);
    if (!item || item.ativo === false) continue;
    porCodigo.set(normalizarCodigo(row.codigo_produto), { id: item.id, nome: item.nome });
  }

  const itensPreview: NfeItemPreview[] = itens.map((item) => {
    const achado = porCodigo.get(normalizarCodigo(item.codigo_fornecedor)) ?? null;
    return {
      ...item,
      item_id: achado?.id ?? null,
      item_nome: achado?.nome ?? null,
    };
  });

  return {
    nota,
    itens: itensPreview,
    nao_encontrados: itensPreview.filter((item) => !item.item_id),
    ja_importada,
  };
}

export async function preVisualizarNfeArquivo(arquivo: File, tenantId: string): Promise<NfePreview> {
  const xml = await arquivo.text();
  return preVisualizarNfe(xml, tenantId);
}

export async function confirmarImportacaoNfe(tenantId: string, preview: NfePreview): Promise<NfeConfirmResult> {
  if (!tenantId) throw new NfeImportError("Tenant não identificado.");
  if (!preview?.nota?.chave_acesso) throw new NfeImportError("Dados da nota incompletos.");

  const notaExistente = await buscarNotaPorChave(tenantId, preview.nota.chave_acesso);
  if (notaExistente && (await notaTemLotes(notaExistente.id))) {
    throw new NfeImportError("Esta nota fiscal já foi importada (chave de acesso duplicada).");
  }
  if (notaExistente) {
    await supabase.from("notas_fiscais").delete().eq("id", notaExistente.id).eq("tenant_id", tenantId);
  }

  const semVinculo = (preview.itens ?? []).filter((item) => !item.item_id);
  if (semVinculo.length > 0) {
    throw new NfeImportError(
      `${semVinculo.length} item(ns) da nota ainda não foram vinculados ao catálogo.`
    );
  }

  validarMarcacoesPneus(preview.itens);

  const notaInsert = {
    tenant_id: tenantId,
    chave_acesso: preview.nota.chave_acesso,
    numero_nota: preview.nota.numero_nota || null,
    fornecedor_nome: preview.nota.fornecedor_nome || null,
    fornecedor_cnpj: somenteDigitos(preview.nota.fornecedor_cnpj) || null,
    data_emissao: preview.nota.data_emissao || null,
    valor_total: preview.nota.valor_total,
  };

  const { data: notaRow, error: notaErr } = await supabase
    .from("notas_fiscais")
    .insert(notaInsert)
    .select("id")
    .single();

  if (notaErr) {
    if (notaErr.code === "23505") {
      throw new NfeImportError("Esta nota fiscal já foi importada (chave de acesso duplicada).");
    }
    throw new NfeImportError(notaErr.message);
  }

  const notaId = notaRow.id as string;
  const lotesIds: string[] = [];
  const pneusIds: string[] = [];
  const itensParaCusto = new Set<string>();

  try {
    for (const item of preview.itens) {
      const itemId = item.item_id as string;
      const quantidade = item.is_pneu ? Math.floor(Number(item.quantidade)) : Number(item.quantidade);
      const valorUnitario = Number(item.valor_unitario);
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw new NfeImportError(`Quantidade inválida no item "${item.descricao}".`);
      }
      if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
        throw new NfeImportError(`Valor unitário inválido no item "${item.descricao}".`);
      }

      const { data: loteRow, error: loteErr } = await supabase
        .from("lotes_estoque")
        .insert({
          tenant_id: tenantId,
          item_id: itemId,
          nota_fiscal_id: notaId,
          quantidade_recebida: quantidade,
          quantidade_restante: quantidade,
          valor_unitario: valorUnitario,
        })
        .select("id")
        .single();
      if (loteErr) throw new NfeImportError(loteErr.message);
      lotesIds.push(loteRow.id);
      itensParaCusto.add(itemId);

      await upsertCodigoFornecedor(tenantId, itemId, preview.nota.fornecedor_cnpj, item.codigo_fornecedor);

      if (item.is_pneu) {
        await supabase
          .from("itens_estoque")
          .update({ rastreavel_individualmente: true })
          .eq("id", itemId)
          .eq("tenant_id", tenantId);

        const ids = await inserirUnidadesPneu({
          tenantId,
          itemId,
          loteId: loteRow.id,
          quantidade,
          valorUnitario,
          medida: item.medida_extraida,
          marcacoes: item.marcacoes_fogo ?? [],
          dataCompra: preview.nota.data_emissao || null,
          notaFiscal: preview.nota.chave_acesso,
          fornecedor: preview.nota.fornecedor_nome || null,
        });
        pneusIds.push(...ids);
      }
    }
  } catch (err) {
    await reverterImportacao(notaId, lotesIds);
    throw err;
  }

  await sincronizarCustos(tenantId, itensParaCusto);

  return {
    nota_id: notaId,
    lotes_ids: lotesIds,
    pneus_ids: pneusIds,
    itens_vinculados: preview.itens.length,
    pneus_criados: pneusIds.length,
  };
}

export async function confirmarEntradaManual(
  tenantId: string,
  linhas: EntradaManualLinha[]
): Promise<NfeConfirmResult> {
  if (!tenantId) throw new NfeImportError("Tenant não identificado.");
  if (!linhas.length) throw new NfeImportError("Adicione pelo menos um item.");

  validarMarcacoesPneus(linhas.map((linha, index) => ({
    n_item: index + 1,
    descricao: linha.nome,
    codigo_fornecedor: "",
    ncm: "",
    unidade: linha.unidade_medida,
    quantidade: linha.quantidade,
    valor_unitario: linha.valor_unitario,
    is_pneu: linha.is_pneu,
    medida_extraida: linha.medida,
    item_id: linha.item_id,
    item_nome: linha.nome,
    marcacoes_fogo: linha.marcacoes_fogo,
  })));

  const lotesIds: string[] = [];
  const pneusIds: string[] = [];
  const itensParaCusto = new Set<string>();

  try {
    for (const linha of linhas) {
      if (!linha.item_id) throw new NfeImportError(`Item "${linha.nome}" sem vínculo no catálogo.`);
      const quantidade = linha.is_pneu ? Math.floor(Number(linha.quantidade)) : Number(linha.quantidade);
      const valorUnitario = Number(linha.valor_unitario);
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw new NfeImportError(`Quantidade inválida no item "${linha.nome}".`);
      }
      if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
        throw new NfeImportError(`Valor unitário inválido no item "${linha.nome}".`);
      }

      const { data: loteRow, error: loteErr } = await supabase
        .from("lotes_estoque")
        .insert({
          tenant_id: tenantId,
          item_id: linha.item_id,
          nota_fiscal_id: null,
          quantidade_recebida: quantidade,
          quantidade_restante: quantidade,
          valor_unitario: valorUnitario,
        })
        .select("id")
        .single();
      if (loteErr) throw new NfeImportError(loteErr.message);
      lotesIds.push(loteRow.id);
      itensParaCusto.add(linha.item_id);

      if (linha.is_pneu) {
        await supabase
          .from("itens_estoque")
          .update({ rastreavel_individualmente: true })
          .eq("id", linha.item_id)
          .eq("tenant_id", tenantId);

        const ids = await inserirUnidadesPneu({
          tenantId,
          itemId: linha.item_id,
          loteId: loteRow.id,
          quantidade,
          valorUnitario,
          medida: linha.medida,
          marcacoes: linha.marcacoes_fogo,
          dataCompra: new Date().toISOString().slice(0, 10),
          notaFiscal: "entrada manual",
          fornecedor: null,
        });
        pneusIds.push(...ids);
      }
    }
  } catch (err) {
    if (lotesIds.length > 0) {
      await supabase.from("pneus_individuais").delete().in("lote_id", lotesIds);
      await supabase.from("lotes_estoque").delete().in("id", lotesIds);
    }
    throw err;
  }

  await sincronizarCustos(tenantId, itensParaCusto);

  return {
    nota_id: "",
    lotes_ids: lotesIds,
    pneus_ids: pneusIds,
    itens_vinculados: linhas.length,
    pneus_criados: pneusIds.length,
  };
}

function validarMarcacoesPneus(itens: Array<{ descricao: string; is_pneu: boolean; quantidade: number; marcacoes_fogo?: string[] }>) {
  const vistas = new Set<string>();
  for (const item of itens) {
    if (!item.is_pneu) continue;
    const qtd = Math.floor(Number(item.quantidade));
    const marcas = (item.marcacoes_fogo ?? []).map((m) => m.trim().toUpperCase());
    if (marcas.length !== qtd || marcas.some((m) => !m)) {
      throw new NfeImportError(
        `Preencha a marcação de fogo das ${qtd} unidade(s) de "${item.descricao}".`
      );
    }
    for (const marca of marcas) {
      if (vistas.has(marca)) {
        throw new NfeImportError(`Marcação de fogo duplicada na entrada: ${marca}.`);
      }
      vistas.add(marca);
    }
  }
}

async function inserirUnidadesPneu(input: {
  tenantId: string;
  itemId: string;
  loteId: string;
  quantidade: number;
  valorUnitario: number;
  medida: string | null;
  marcacoes: string[];
  dataCompra: string | null;
  notaFiscal: string | null;
  fornecedor: string | null;
}): Promise<string[]> {
  const unidades = Array.from({ length: input.quantidade }, (_, i) => ({
    tenant_id: input.tenantId,
    item_id: input.itemId,
    lote_id: input.loteId,
    codigo_marcacao: (input.marcacoes[i] || "").trim().toUpperCase(),
    medida: input.medida,
    valor_unitario: input.valorUnitario,
    data_compra: input.dataCompra,
    nota_fiscal: input.notaFiscal,
    fornecedor: input.fornecedor,
    status: "em_estoque",
  }));

  const { data: pneus, error: pneuErr } = await supabase
    .from("pneus_individuais")
    .insert(unidades)
    .select("id");
  if (pneuErr) {
    if (pneuErr.code === "23505") {
      throw new NfeImportError("Uma das marcações de fogo já existe no cadastro.");
    }
    throw new NfeImportError(pneuErr.message);
  }
  return (pneus ?? []).map((pneu) => pneu.id);
}

async function buscarNotaPorChave(
  tenantId: string,
  chaveAcesso: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("notas_fiscais")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("chave_acesso", chaveAcesso)
    .maybeSingle();
  if (error) throw new NfeImportError(error.message);
  return data?.id ? { id: data.id } : null;
}

async function notaTemLotes(notaId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("lotes_estoque")
    .select("id", { count: "exact", head: true })
    .eq("nota_fiscal_id", notaId);
  if (error) throw new NfeImportError(error.message);
  return (count ?? 0) > 0;
}

async function notaJaImportada(tenantId: string, chaveAcesso: string): Promise<boolean> {
  const nota = await buscarNotaPorChave(tenantId, chaveAcesso);
  if (!nota) return false;
  return notaTemLotes(nota.id);
}

async function upsertCodigoFornecedor(
  tenantId: string,
  itemId: string,
  cnpj: string,
  codigoProduto: string
) {
  const fornecedor_cnpj = somenteDigitos(cnpj);
  const codigo_produto = String(codigoProduto || "").trim();
  if (!fornecedor_cnpj || !codigo_produto) return;

  const { error } = await supabase.from("itens_estoque_codigos_fornecedor").upsert(
    {
      tenant_id: tenantId,
      item_id: itemId,
      fornecedor_cnpj,
      codigo_produto,
    },
    { onConflict: "tenant_id,fornecedor_cnpj,codigo_produto" }
  );
  if (error) throw new NfeImportError(error.message);
}

async function reverterImportacao(notaId: string, lotesIds: string[]) {
  if (lotesIds.length > 0) {
    await supabase.from("pneus_individuais").delete().in("lote_id", lotesIds);
    await supabase.from("lotes_estoque").delete().in("id", lotesIds);
  }
  await supabase.from("notas_fiscais").delete().eq("id", notaId);
}

function normalizarCodigo(codigo: string): string {
  return String(codigo || "").trim().toUpperCase();
}

function unwrapItem(item: unknown): { id: string; nome: string; ativo?: boolean } | null {
  if (!item) return null;
  const row = Array.isArray(item) ? item[0] : item;
  if (!row || typeof row !== "object" || !("id" in row)) return null;
  return row as { id: string; nome: string; ativo?: boolean };
}

async function sincronizarCustos(tenantId: string, itemIds: Set<string>): Promise<void> {
  for (const itemId of itemIds) {
    try {
      await sincronizarCustoMedioItem(tenantId, itemId);
    } catch {
      // A listagem recalcula pelos lotes; não desfaz a entrada se só o cache falhar.
    }
  }
}
