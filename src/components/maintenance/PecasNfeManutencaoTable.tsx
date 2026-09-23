import { useMemo, useState } from "react";
import { CamposMarcacaoFogo } from "../estoque/CamposMarcacaoFogo";
import { SeletorItemEstoque } from "../estoque/SeletorItemEstoque";
import { formatBRL } from "../../lib/utils/money";
import type { ItemEstoque } from "../../types/estoque";
import type { PneuIndividual } from "../../types/pneu";
import type { LinhaNfeManutencao } from "../../services/estoque/consumoManutencao";

interface Props {
  linhas: LinhaNfeManutencao[];
  onChange: (linhas: LinhaNfeManutencao[]) => void;
  itens: ItemEstoque[];
  saldos: Map<string, number>;
  pneusPorItem: Map<string, PneuIndividual[]>;
  onCriarItem?: (nome: string, linhaIndex: number) => Promise<void>;
  notaJaNoEstoque: boolean;
}

export function PecasNfeManutencaoTable({
  linhas,
  onChange,
  itens,
  saldos,
  pneusPorItem,
  onCriarItem,
  notaJaNoEstoque,
}: Props) {
  const [buscaPorLinha, setBuscaPorLinha] = useState<Record<number, string>>({});
  const [abertoPorLinha, setAbertoPorLinha] = useState<Record<number, boolean>>({});

  const usadoPorItem = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const linha of linhas) {
      if (!linha.item_id) continue;
      mapa.set(linha.item_id, (mapa.get(linha.item_id) || 0) + (Number(linha.qty_estoque) || 0));
    }
    return mapa;
  }, [linhas]);

  function patch(index: number, partial: Partial<LinhaNfeManutencao>) {
    onChange(linhas.map((linha, i) => (i === index ? { ...linha, ...partial } : linha)));
  }

  function setQtyEstoque(index: number, raw: number) {
    const linha = linhas[index];
    const total = linha.quantidade_total;
    let e = Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (e < 0) e = 0;
    if (e > total) e = Math.floor(total);
    if (!linha.item_id) e = 0;
    const pneus = linha.item_id ? (pneusPorItem.get(linha.item_id) || []) : [];
    const ids = linha.is_pneu ? pneus.slice(0, e).map((p) => p.id) : linha.pneus_estoque_ids;
    patch(index, {
      qty_estoque: e,
      qty_compra: Math.round((total - e) * 1000) / 1000,
      pneus_estoque_ids: ids,
      marcacoes_fogo: e === linha.qty_estoque ? linha.marcacoes_fogo : Array.from({ length: Math.floor(total - e) }, (_, i) => linha.marcacoes_fogo[i] || ""),
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700">Peças da nota</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Informe quantas unidades já estavam no estoque. O restante é compra desta nota e entra com o valor unitário da NF-e.
        </p>
      </div>
      {notaJaNoEstoque && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Esta NF-e já foi lançada no estoque. Use só “já em estoque” — a compra nova fica bloqueada para não duplicar o lote.
        </p>
      )}

      <div className="space-y-3">
        {linhas.map((linha, index) => {
          const item = itens.find((i) => i.id === linha.item_id);
          const saldoItem = linha.item_id ? (saldos.get(linha.item_id) || 0) : 0;
          const usadoOutros = linha.item_id
            ? (usadoPorItem.get(linha.item_id) || 0) - (Number(linha.qty_estoque) || 0)
            : 0;
          const saldoLivre = Math.max(0, saldoItem - usadoOutros);
          const eTravado = !linha.item_id;
          const eExcedeTotal = linha.qty_estoque > linha.quantidade_total;
          const eExcedeSaldo = linha.qty_estoque > saldoLivre;
          const pneus = linha.item_id ? (pneusPorItem.get(linha.item_id) || []) : [];
          const busca = buscaPorLinha[index] ?? (linha.item_nome || linha.descricao);

          return (
            <div key={linha.n_item} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{linha.descricao}</p>
                  <p className="text-[11px] text-gray-500">
                    {linha.ncm ? `NCM ${linha.ncm}` : "Sem NCM"}
                    {linha.is_pneu ? " · Pneu" : ""}
                    {linha.codigo_fornecedor ? ` · cProd ${linha.codigo_fornecedor}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {formatBRL(linha.quantidade_total * linha.valor_unitario)}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] text-gray-500">Qtd. na nota</p>
                  <p className="text-sm font-medium">{linha.quantidade_total}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Valor unitário da nota</p>
                  <p className="text-sm font-medium">{formatBRL(linha.valor_unitario)}</p>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Qtd. já em estoque</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={eTravado}
                    value={linha.qty_estoque}
                    onChange={(e) => setQtyEstoque(index, Number(e.target.value))}
                    className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white ${
                      eExcedeTotal || eExcedeSaldo ? "border-red-400" : "border-gray-300"
                    } disabled:bg-gray-100 disabled:text-gray-400`}
                  />
                  {eTravado && (
                    <p className="text-[11px] text-amber-700 mt-1">Vincule o item para usar estoque.</p>
                  )}
                  {eExcedeTotal && (
                    <p className="text-[11px] text-red-600 mt-1">Não pode ser maior que a quantidade da nota.</p>
                  )}
                  {!eTravado && eExcedeSaldo && (
                    <p className="text-[11px] text-red-600 mt-1">
                      Saldo disponível: {saldoLivre.toLocaleString("pt-BR")}
                    </p>
                  )}
                  {!eTravado && !eExcedeSaldo && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Saldo nos lotes: {saldoLivre.toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Qtd. comprada nesta nota</p>
                  <p className="text-sm font-medium">{linha.qty_compra}</p>
                  {notaJaNoEstoque && linha.qty_compra > 0 && (
                    <p className="text-[11px] text-red-600 mt-1">Zere a compra — a nota já está no estoque.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Item do estoque</label>
                <SeletorItemEstoque
                  itens={itens}
                  busca={busca}
                  itemSelecionado={item || null}
                  criandoNovo={false}
                  aberto={Boolean(abertoPorLinha[index])}
                  onAberto={(aberto) => setAbertoPorLinha((prev) => ({ ...prev, [index]: aberto }))}
                  onBusca={(valor) => {
                    setBuscaPorLinha((prev) => ({ ...prev, [index]: valor }));
                    if (linha.item_id) {
                      patch(index, { item_id: null, item_nome: null, qty_estoque: 0, qty_compra: linha.quantidade_total, pneus_estoque_ids: [] });
                    }
                  }}
                  onSelecionar={(selecionado) => {
                    const pneus = pneusPorItem.get(selecionado.id) || [];
                    patch(index, {
                      item_id: selecionado.id,
                      item_nome: selecionado.nome,
                      pneus_estoque_ids: linha.is_pneu ? pneus.slice(0, linha.qty_estoque).map((p) => p.id) : [],
                    });
                    setBuscaPorLinha((prev) => ({ ...prev, [index]: selecionado.nome }));
                    setAbertoPorLinha((prev) => ({ ...prev, [index]: false }));
                  }}
                  onCriarNovo={() => {
                    void onCriarItem?.(busca.trim() || linha.descricao, index);
                  }}
                  onLimpar={() => {
                    patch(index, {
                      item_id: null,
                      item_nome: null,
                      qty_estoque: 0,
                      qty_compra: linha.quantidade_total,
                      pneus_estoque_ids: [],
                    });
                    setBuscaPorLinha((prev) => ({ ...prev, [index]: linha.descricao }));
                  }}
                  placeholder="Buscar item equivalente no estoque"
                />
              </div>

              {linha.is_pneu && linha.qty_estoque > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-600 mb-1">
                    Pneus do estoque (mais antigos sugeridos)
                  </p>
                  {pneus.length === 0 ? (
                    <p className="text-xs text-red-600">Não há pneus serializados disponíveis neste item.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {pneus.map((pneu) => {
                        const checked = linha.pneus_estoque_ids.includes(pneu.id);
                        return (
                          <label key={pneu.id} className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded-md px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? linha.pneus_estoque_ids.filter((id) => id !== pneu.id)
                                  : [...linha.pneus_estoque_ids, pneu.id];
                                patch(index, { pneus_estoque_ids: next });
                              }}
                            />
                            <span className="font-mono">{pneu.codigo_marcacao || "sem marcação"}</span>
                            <span className="text-gray-400">{pneu.data_compra || ""}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {linha.pneus_estoque_ids.length !== Math.floor(linha.qty_estoque) && (
                    <p className="text-[11px] text-red-600 mt-1">
                      Selecione exatamente {Math.floor(linha.qty_estoque)} unidade(s).
                    </p>
                  )}
                </div>
              )}

              {linha.is_pneu && linha.qty_compra > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-orange-800">Marcação de fogo das unidades compradas nesta nota</p>
                  <CamposMarcacaoFogo
                    quantidade={linha.qty_compra}
                    marcacoes={linha.marcacoes_fogo}
                    onChange={(i, valor) => {
                      const next = [...linha.marcacoes_fogo];
                      next[i] = valor;
                      patch(index, { marcacoes_fogo: next });
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function validarLinhasNfeManutencao(
  linhas: LinhaNfeManutencao[],
  saldos: Map<string, number>,
  notaJaNoEstoque: boolean,
): string | null {
  const usado = new Map<string, number>();
  for (const linha of linhas) {
    if (linha.qty_estoque < 0 || linha.qty_compra < 0) {
      return `Quantidades inválidas em "${linha.descricao}".`;
    }
    if (!Number.isInteger(linha.qty_estoque)) {
      return `"Já em estoque" de "${linha.descricao}" precisa ser um número inteiro.`;
    }
    if (linha.qty_estoque > linha.quantidade_total) {
      return `"Já em estoque" de "${linha.descricao}" não pode ultrapassar a quantidade da nota.`;
    }
    if (!linha.item_id) {
      if (linha.qty_estoque > 0) return `Vincule "${linha.descricao}" ao estoque para usar unidades já guardadas.`;
      if (linha.qty_compra > 0) return `Vincule "${linha.descricao}" ao catálogo para lançar a compra desta nota.`;
      continue;
    }
    const ja = usado.get(linha.item_id) || 0;
    const saldo = saldos.get(linha.item_id) || 0;
    if (ja + linha.qty_estoque > saldo) {
      return `Saldo insuficiente para "${linha.descricao}". Disponível: ${saldo - ja}.`;
    }
    usado.set(linha.item_id, ja + linha.qty_estoque);
    if (notaJaNoEstoque && linha.qty_compra > 0) {
      return `A nota já está no estoque. Zere a compra de "${linha.descricao}".`;
    }
    if (linha.is_pneu && linha.qty_estoque > 0 && linha.pneus_estoque_ids.length !== Math.floor(linha.qty_estoque)) {
      return `Selecione as marcações de fogo do estoque para "${linha.descricao}".`;
    }
    if (linha.is_pneu && linha.qty_compra > 0) {
      const marcas = linha.marcacoes_fogo.slice(0, Math.floor(linha.qty_compra));
      if (marcas.length !== Math.floor(linha.qty_compra) || marcas.some((m) => !m.trim())) {
        return `Preencha a marcação de fogo das unidades compradas de "${linha.descricao}".`;
      }
    }
  }
  return null;
}
