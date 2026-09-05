import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { formatBRL } from "../../lib/utils/money";
import {
  avaliarExclusaoItem,
  excluirItemEstoque,
  inativarItemEstoque,
  type AvaliacaoExclusaoItem,
} from "../../services/estoque/exclusaoItem";
import type { ItemEstoque } from "../../types/estoque";

interface Props {
  item: ItemEstoque;
  onClose: () => void;
  onDone: () => void;
}

export function ExcluirItemModal({ item, onClose, onDone }: Props) {
  const { tenant } = useAuth();
  const [avaliacao, setAvaliacao] = useState<AvaliacaoExclusaoItem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!tenant?.id) {
        setErro("Empresa não identificada.");
        setCarregando(false);
        return;
      }
      setCarregando(true);
      setErro(null);
      try {
        const resultado = await avaliarExclusaoItem(tenant.id, item.id);
        if (ativo) setAvaliacao(resultado);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível verificar os lotes deste item.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [item.id, tenant?.id]);

  async function executarExclusao() {
    if (!tenant?.id) return;
    setExecutando(true);
    setErro(null);
    try {
      await excluirItemEstoque(tenant.id, item);
      onDone();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir o item.");
    } finally {
      setExecutando(false);
    }
  }

  async function executarInativacao() {
    if (!tenant?.id) return;
    setExecutando(true);
    setErro(null);
    try {
      await inativarItemEstoque(tenant.id, item.id);
      onDone();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao inativar o item.");
    } finally {
      setExecutando(false);
    }
  }

  const caso = avaliacao?.caso;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {caso === "consumido" ? "Não é possível excluir" : "Excluir item"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{item.nome}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {carregando && (
            <p className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Verificando lotes vinculados...
            </p>
          )}

          {!carregando && caso === "sem_lote" && (
            <>
              <p className="text-sm text-slate-600">
                Excluir o item <strong>{item.nome}</strong>? Ele nunca teve entrada de estoque. Esta ação não pode ser desfeita.
              </p>
              {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}
              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void executarExclusao()}
                  disabled={executando}
                  className="flex-1 text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {executando ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </>
          )}

          {!carregando && caso === "lotes_intocados" && avaliacao && (
            <>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-sm text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <p>
                  Este item possui lote(s) de estoque ainda não usados em manutenção. A exclusão remove esse valor do estoque.
                </p>
              </div>
              <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-left">
                      <th className="px-3 py-2 font-medium">Origem</th>
                      <th className="px-3 py-2 font-medium text-right">Qtd</th>
                      <th className="px-3 py-2 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avaliacao.lotes.map((lote) => (
                      <tr key={lote.id} className="border-t border-slate-50">
                        <td className="px-3 py-2 text-slate-700">{lote.origem}</td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {lote.quantidade_recebida}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatBRL(lote.valor_lote)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-3 text-right">
                Total a remover: {formatBRL(avaliacao.valorTotal)}
              </p>
              {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}
              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void executarExclusao()}
                  disabled={executando}
                  className="flex-1 text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {executando ? "Excluindo..." : "Excluir e remover do estoque"}
                </button>
              </div>
            </>
          )}

          {!carregando && caso === "consumido" && (
            <>
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-800">
                <Trash2 size={16} className="mt-0.5 shrink-0" />
                <p>
                  Este item já teve quantidade consumida em manutenção. A exclusão definitiva quebraria o vínculo entre a nota fiscal e a baixa, exigido para rastreabilidade fiscal e garantia.
                </p>
              </div>
              {item.ativo === false ? (
                <p className="text-sm text-slate-600 mt-3">
                  O item já está inativo: não aparece em novas entradas nem no consumo de manutenção, mas permanece em relatórios, histórico e consultas de garantia.
                </p>
              ) : (
                <p className="text-sm text-slate-600 mt-3">
                  Você pode inativar o item. Ele some das listas de nova entrada de estoque e de novo consumo em manutenção, mas continua em relatórios, histórico de manutenções e consultas de garantia. Depois é possível reativar sem perder o histórico.
                </p>
              )}
              {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}
              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
                >
                  {item.ativo === false ? "Fechar" : "Cancelar"}
                </button>
                {item.ativo !== false && (
                  <button
                    type="button"
                    onClick={() => void executarInativacao()}
                    disabled={executando}
                    className="flex-1 text-sm px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {executando ? "Inativando..." : "Inativar item"}
                  </button>
                )}
              </div>
            </>
          )}

          {!carregando && !caso && erro && (
            <>
              <p className="text-sm text-red-600">{erro}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full text-sm px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
