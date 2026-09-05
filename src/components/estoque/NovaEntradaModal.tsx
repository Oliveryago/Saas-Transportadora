import { useRef, useState } from "react";
import { FileUp, Loader2, Plus, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useEstoque } from "../../hooks/useEstoque";
import { useNfeImportacao } from "../../hooks/useNfeImportacao";
import { confirmarEntradaManual } from "../../services/nfe/nfeImportacao";
import type { CategoriaItem, ItemEstoque, UnidadeMedida } from "../../types/estoque";
import type { NfeItemPreview, NfePreview } from "../../types/nfe";
import { itemEhRastreavel, nomeParecePneu } from "../../types/pneu";
import { CamposMarcacaoFogo, marcacoesCompletas } from "./CamposMarcacaoFogo";
import { SeletorItemEstoque } from "./SeletorItemEstoque";

interface Props {
  itens: ItemEstoque[];
  onClose: () => void;
  onSaved: () => void;
}

type Modo = "escolha" | "xml" | "manual";

type LinhaXml = NfeItemPreview & {
  busca: string;
  criandoNovo: boolean;
  dropdownAberto: boolean;
  marcacoes: string[];
};

type LinhaManual = {
  id: string;
  busca: string;
  item: ItemEstoque | null;
  criandoNovo: boolean;
  dropdownAberto: boolean;
  categoria: CategoriaItem;
  unidade: UnidadeMedida;
  quantidade: string;
  valorUnitario: string;
  medida: string;
  marcacoes: string[];
};

const CATEGORIAS: { value: CategoriaItem; label: string }[] = [
  { value: "oleo", label: "Óleo" },
  { value: "pneu", label: "Pneu" },
  { value: "filtro", label: "Filtro" },
  { value: "eletrica", label: "Elétrica" },
  { value: "peca_motor", label: "Peça de Motor" },
  { value: "outro", label: "Outro" },
];

const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: "unidade", label: "Unidade" },
  { value: "litro", label: "Litro" },
  { value: "kit", label: "Kit" },
];

function novaLinhaManual(): LinhaManual {
  return {
    id: crypto.randomUUID(),
    busca: "",
    item: null,
    criandoNovo: false,
    dropdownAberto: false,
    categoria: "outro",
    unidade: "unidade",
    quantidade: "",
    valorUnitario: "",
    medida: "",
    marcacoes: [],
  };
}

function ajustarMarcacoes(atual: string[], quantidade: number, isPneu: boolean): string[] {
  if (!isPneu) return [];
  const qtd = Math.max(0, Math.floor(Number(quantidade) || 0));
  return Array.from({ length: qtd }, (_, i) => atual[i] ?? "");
}

export function NovaEntradaModal({ itens, onClose, onSaved }: Props) {
  const { tenant } = useAuth();
  const { criarItem } = useEstoque();
  const { preVisualizarArquivo, confirmar, loading: lendoXml, error: erroHook, limparErro } = useNfeImportacao();
  const fileRef = useRef<HTMLInputElement>(null);

  const [modo, setModo] = useState<Modo>("escolha");
  const [preview, setPreview] = useState<NfePreview | null>(null);
  const [linhasXml, setLinhasXml] = useState<LinhaXml[]>([]);
  const [linhasManual, setLinhasManual] = useState<LinhaManual[]>([novaLinhaManual()]);
  const [arquivoNome, setArquivoNome] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mensagemErro = erro || erroHook;

  function voltarEscolha() {
    setModo("escolha");
    setPreview(null);
    setLinhasXml([]);
    setArquivoNome("");
    setErro(null);
    limparErro();
    setLinhasManual([novaLinhaManual()]);
  }

  async function aoEscolherXml(file: File | undefined) {
    if (!file) return;
    setErro(null);
    setArquivoNome(file.name);
    try {
      const result = await preVisualizarArquivo(file);
      setPreview(result);
      setLinhasXml(
        result.itens.map((item) => ({
          ...item,
          busca: item.item_nome || item.descricao,
          criandoNovo: false,
          dropdownAberto: false,
          marcacoes: ajustarMarcacoes([], item.quantidade, item.is_pneu),
        }))
      );
      setModo("xml");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "XML inválido ou que não é uma NF-e.");
      setModo("escolha");
    }
  }

  function atualizarXml(index: number, patch: Partial<LinhaXml>) {
    setLinhasXml((prev) =>
      prev.map((linha, i) => {
        if (i !== index) return linha;
        const next = { ...linha, ...patch };
        const qtd = patch.quantidade ?? next.quantidade;
        const isPneu = patch.is_pneu ?? next.is_pneu;
        if (patch.quantidade != null || patch.is_pneu != null) {
          next.marcacoes = ajustarMarcacoes(next.marcacoes, qtd, isPneu);
        }
        return next;
      })
    );
  }

  function atualizarManual(id: string, patch: Partial<LinhaManual>) {
    setLinhasManual((prev) =>
      prev.map((linha) => {
        if (linha.id !== id) return linha;
        const next = { ...linha, ...patch };
        const isPneu = linhaEhPneu(next);
        if (patch.quantidade != null || patch.item !== undefined || patch.categoria != null || patch.busca != null) {
          next.marcacoes = ajustarMarcacoes(next.marcacoes, Number(next.quantidade), isPneu);
        }
        return next;
      })
    );
  }

  function linhaEhPneu(linha: LinhaManual): boolean {
    if (linha.item) return itemEhRastreavel(linha.item);
    return linha.categoria === "pneu" || nomeParecePneu(linha.busca);
  }

  const xmlPodeConfirmar =
    Boolean(preview) &&
    !preview?.ja_importada &&
    linhasXml.length > 0 &&
    linhasXml.every((linha) => Boolean(linha.item_id || linha.criandoNovo)) &&
    linhasXml.every((linha) => marcacoesCompletas(linha.is_pneu, linha.quantidade, linha.marcacoes));

  const manualPodeSalvar =
    linhasManual.length > 0 &&
    linhasManual.every((linha) => (linha.item || linha.criandoNovo) && linha.quantidade && linha.valorUnitario) &&
    linhasManual.every((linha) => marcacoesCompletas(linhaEhPneu(linha), Number(linha.quantidade), linha.marcacoes));

  async function confirmarXml() {
    if (!tenant?.id || !preview) return;
    setErro(null);
    if (preview.ja_importada) {
      setErro("Esta nota fiscal já foi importada (chave de acesso duplicada).");
      return;
    }
    setSalvando(true);
    try {
      const itensConfirmados: NfeItemPreview[] = [];
      for (const linha of linhasXml) {
        let itemId = linha.item_id;
        if (!itemId) {
          const novo = await criarItem({
            nome: linha.descricao.trim() || linha.busca.trim(),
            categoria: linha.is_pneu ? "pneu" : "outro",
            unidade_medida: "unidade",
            estoque_minimo: 1,
            tenant_id: tenant.id,
            rastreavel_individualmente: linha.is_pneu,
            ncm: linha.ncm || null,
            medida: linha.medida_extraida || null,
          });
          itemId = novo.id;
        }
        itensConfirmados.push({
          ...linha,
          item_id: itemId,
          item_nome: linha.item_nome || linha.descricao,
          marcacoes_fogo: linha.marcacoes,
          medida_extraida: linha.medida_extraida,
        });
      }
      await confirmar({
        ...preview,
        itens: itensConfirmados,
        nao_encontrados: [],
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar a entrada da nota.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarManual() {
    if (!tenant?.id) return;
    setErro(null);
    setSalvando(true);
    try {
      const linhas = [];
      for (const linha of linhasManual) {
        let itemId = linha.item?.id ?? null;
        const isPneu = linhaEhPneu(linha);
        if (!itemId) {
          const novo = await criarItem({
            nome: linha.busca.trim(),
            categoria: isPneu ? "pneu" : linha.categoria,
            unidade_medida: linha.unidade,
            estoque_minimo: 1,
            tenant_id: tenant.id,
            rastreavel_individualmente: isPneu,
            medida: linha.medida || null,
          });
          itemId = novo.id;
        }
        linhas.push({
          item_id: itemId,
          nome: linha.item?.nome || linha.busca.trim(),
          categoria: isPneu ? "pneu" : linha.categoria,
          unidade_medida: linha.unidade,
          quantidade: Number(linha.quantidade),
          valor_unitario: Number(linha.valorUnitario),
          is_pneu: isPneu,
          medida: linha.medida || null,
          marcacoes_fogo: linha.marcacoes,
        });
      }
      await confirmarEntradaManual(tenant.id, linhas);
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar a entrada manual.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl p-5 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Nova entrada de estoque</h2>
            {modo === "xml" && preview && (
              <p className="text-xs text-slate-500 mt-0.5">
                NF {preview.nota.numero_nota || "—"} · {preview.nota.fornecedor_nome || "Fornecedor"} · {arquivoNome}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {modo === "escolha" && (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void aoEscolherXml(file);
              }}
            />
            <button
              type="button"
              disabled={lendoXml}
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-8 text-center transition disabled:opacity-60"
            >
              {lendoXml ? (
                <Loader2 size={28} className="mx-auto text-blue-600 animate-spin" />
              ) : (
                <FileUp size={28} className="mx-auto text-blue-600" />
              )}
              <p className="mt-2 text-sm font-medium text-blue-800">Importar XML da nota</p>
              <p className="text-xs text-blue-600 mt-1">Selecione o arquivo XML da NF-e</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setErro(null);
                limparErro();
                setModo("manual");
              }}
              className="block w-full text-center text-sm text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
            >
              Prefiro cadastrar manualmente
            </button>
          </div>
        )}

        {modo === "xml" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-slate-50 rounded-lg p-3">
              <div>
                <p className="text-slate-400">Chave</p>
                <p className="font-mono text-slate-700 break-all">{preview.nota.chave_acesso}</p>
              </div>
              <div>
                <p className="text-slate-400">Emissão</p>
                <p className="text-slate-700">{preview.nota.data_emissao || "—"}</p>
              </div>
              <div>
                <p className="text-slate-400">CNPJ</p>
                <p className="text-slate-700">{preview.nota.fornecedor_cnpj || "—"}</p>
              </div>
              <div>
                <p className="text-slate-400">Total</p>
                <p className="text-slate-700">
                  {preview.nota.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>

            {preview.ja_importada && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                Esta nota fiscal já foi importada (chave de acesso duplicada).
              </p>
            )}

            <div className="space-y-3">
              {linhasXml.map((linha, index) => (
                <div key={`${linha.n_item}-${index}`} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-5">
                      <label className="text-[11px] text-slate-500">Item</label>
                      <input
                        value={linha.descricao}
                        onChange={(e) => atualizarXml(index, { descricao: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-0.5"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        min="0"
                        value={linha.quantidade}
                        onChange={(e) => atualizarXml(index, { quantidade: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-0.5"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[11px] text-slate-500">Valor unitário</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linha.valor_unitario}
                        onChange={(e) => atualizarXml(index, { valor_unitario: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-0.5"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end pb-1">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={linha.is_pneu}
                          onChange={(e) => atualizarXml(index, { is_pneu: e.target.checked })}
                        />
                        Pneu
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500">Catálogo interno</label>
                    {linha.item_id && !linha.criandoNovo ? (
                      <p className="text-sm text-emerald-700 mt-0.5">
                        Vinculado: {linha.item_nome}
                        <button
                          type="button"
                          className="ml-2 text-xs text-blue-600 hover:underline"
                          onClick={() => atualizarXml(index, { item_id: null, item_nome: null, busca: linha.descricao })}
                        >
                          alterar
                        </button>
                      </p>
                    ) : (
                      <div className="mt-0.5">
                        <SeletorItemEstoque
                          itens={itens}
                          busca={linha.busca}
                          itemSelecionado={itens.find((i) => i.id === linha.item_id) ?? null}
                          criandoNovo={linha.criandoNovo}
                          aberto={linha.dropdownAberto}
                          onAberto={(aberto) => atualizarXml(index, { dropdownAberto: aberto })}
                          onBusca={(valor) => atualizarXml(index, { busca: valor, item_id: null, item_nome: null, criandoNovo: false })}
                          onSelecionar={(item) =>
                            atualizarXml(index, {
                              item_id: item.id,
                              item_nome: item.nome,
                              busca: item.nome,
                              criandoNovo: false,
                              dropdownAberto: false,
                            })
                          }
                          onCriarNovo={() =>
                            atualizarXml(index, {
                              criandoNovo: true,
                              item_id: null,
                              item_nome: null,
                              dropdownAberto: false,
                              descricao: linha.busca.trim() || linha.descricao,
                            })
                          }
                          onLimpar={() =>
                            atualizarXml(index, { busca: "", item_id: null, item_nome: null, criandoNovo: false })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {linha.is_pneu && (
                    <div className="bg-orange-50 border border-orange-100 rounded-md p-2">
                      <label className="text-[11px] text-orange-800">Medida</label>
                      <input
                        value={linha.medida_extraida || ""}
                        onChange={(e) => atualizarXml(index, { medida_extraida: e.target.value || null })}
                        placeholder="275/80R22.5"
                        className="w-full max-w-xs border border-orange-200 rounded-md px-2 py-1.5 text-sm bg-white mt-0.5"
                      />
                      <CamposMarcacaoFogo
                        quantidade={linha.quantidade}
                        marcacoes={linha.marcacoes}
                        onChange={(i, valor) => {
                          const next = [...linha.marcacoes];
                          next[i] = valor;
                          atualizarXml(index, { marcacoes: next });
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {modo === "manual" && (
          <div className="space-y-3">
            {linhasManual.map((linha, index) => {
              const isPneu = linhaEhPneu(linha);
              return (
                <div key={linha.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-slate-500">Item {index + 1}</p>
                    {linhasManual.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-red-600"
                        onClick={() => setLinhasManual((prev) => prev.filter((l) => l.id !== linha.id))}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <SeletorItemEstoque
                    itens={itens}
                    busca={linha.busca}
                    itemSelecionado={linha.item}
                    criandoNovo={linha.criandoNovo}
                    aberto={linha.dropdownAberto}
                    onAberto={(aberto) => atualizarManual(linha.id, { dropdownAberto: aberto })}
                    onBusca={(valor) =>
                      atualizarManual(linha.id, {
                        busca: valor,
                        item: null,
                        criandoNovo: false,
                        categoria: nomeParecePneu(valor) ? "pneu" : linha.categoria,
                      })
                    }
                    onSelecionar={(item) =>
                      atualizarManual(linha.id, {
                        item,
                        busca: item.nome,
                        criandoNovo: false,
                        dropdownAberto: false,
                        categoria: item.categoria,
                      })
                    }
                    onCriarNovo={() =>
                      atualizarManual(linha.id, {
                        criandoNovo: true,
                        item: null,
                        dropdownAberto: false,
                        categoria: nomeParecePneu(linha.busca) ? "pneu" : linha.categoria,
                      })
                    }
                    onLimpar={() => atualizarManual(linha.id, { busca: "", item: null, criandoNovo: false })}
                  />
                  {linha.criandoNovo && !linha.item && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={linha.categoria}
                        onChange={(e) => atualizarManual(linha.id, { categoria: e.target.value as CategoriaItem })}
                        className="border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white"
                      >
                        {CATEGORIAS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={linha.unidade}
                        onChange={(e) => atualizarManual(linha.id, { unidade: e.target.value as UnidadeMedida })}
                        className="border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white"
                      >
                        {UNIDADES.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500">Quantidade</label>
                      <input
                        type="number"
                        min="0"
                        value={linha.quantidade}
                        onChange={(e) => atualizarManual(linha.id, { quantidade: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">Valor unitário pago (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linha.valorUnitario}
                        onChange={(e) => atualizarManual(linha.id, { valorUnitario: e.target.value })}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm mt-0.5"
                      />
                    </div>
                  </div>
                  {isPneu && (
                    <div className="bg-orange-50 border border-orange-100 rounded-md p-2">
                      <label className="text-[11px] text-orange-800">Medida</label>
                      <input
                        value={linha.medida}
                        onChange={(e) => atualizarManual(linha.id, { medida: e.target.value })}
                        placeholder="275/80R22.5"
                        className="w-full max-w-xs border border-orange-200 rounded-md px-2 py-1.5 text-sm bg-white mt-0.5"
                      />
                      <CamposMarcacaoFogo
                        quantidade={Number(linha.quantidade)}
                        marcacoes={linha.marcacoes}
                        onChange={(i, valor) => {
                          const next = [...linha.marcacoes];
                          next[i] = valor;
                          atualizarManual(linha.id, { marcacoes: next });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setLinhasManual((prev) => [...prev, novaLinhaManual()])}
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <Plus size={14} /> Adicionar outro item
            </button>
          </div>
        )}

        {mensagemErro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">
            {mensagemErro}
          </p>
        )}

        <div className="flex justify-between items-center gap-2 mt-5">
          <div>
            {modo !== "escolha" && (
              <button type="button" onClick={voltarEscolha} className="text-sm text-slate-500 hover:text-slate-800">
                Voltar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </button>
            {modo === "xml" && (
              <button
                type="button"
                onClick={confirmarXml}
                disabled={salvando || lendoXml || !xmlPodeConfirmar}
                className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {salvando ? "Salvando..." : "Confirmar entrada"}
              </button>
            )}
            {modo === "manual" && (
              <button
                type="button"
                onClick={salvarManual}
                disabled={salvando || !manualPodeSalvar}
                className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {salvando ? "Salvando..." : "Salvar entrada"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
