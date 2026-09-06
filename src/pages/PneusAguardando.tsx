import { useMemo, useState } from "react";
import { Check, FileDown, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { usePneusIndividuais } from "../hooks/usePneusIndividuais";
import { gerarEtiquetasMarcacaoPneu } from "../services/pneuLabels";
import { PlanLockBanner, PlanWriteButton } from "../components/shared/PlanWriteButton";
import { usePlanAccess } from "../hooks/usePlanAccess";
import { formatLocalDate } from "../lib/utils/date";
import type { PneuIndividual } from "../types/pneu";

function grupoKey(pneu: PneuIndividual) {
  return `${pneu.nota_fiscal || "sem-nf"}|${pneu.data_compra || pneu.created_at.slice(0, 10)}`;
}

export function PneusAguardandoPage() {
  const { canWrite } = usePlanAccess("marcacao_pneus");
  const { pneus, loading, error, atualizarStatus, recarregar } = usePneusIndividuais();
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const aguardando = pneus.filter((pneu) => pneu.status === "aguardando_marcacao");
  const grupos = useMemo(() => {
    const map = new Map<string, PneuIndividual[]>();
    for (const pneu of aguardando) {
      const key = grupoKey(pneu);
      map.set(key, [...(map.get(key) || []), pneu]);
    }
    return [...map.entries()];
  }, [aguardando]);

  function toggle(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function confirmar(ids: string[]) {
    if (!canWrite || ids.length === 0) return;
    setBusy(true);
    try {
      await atualizarStatus(ids, "em_estoque", { observacao: "Marcação de fogo aplicada" });
      setSelecionados([]);
      await recarregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao confirmar marcação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <PlanLockBanner moduleKey="marcacao_pneus" />
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-600" />
            Pneus aguardando marcação de fogo
          </h1>
          <p className="text-sm text-slate-500">Códigos gerados pelo sistema para aplicação física no pneu.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={aguardando.length === 0}
            onClick={() => gerarEtiquetasMarcacaoPneu(aguardando)}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 border rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown size={16} /> PDF das etiquetas
          </button>
          <PlanWriteButton
            moduleKey="marcacao_pneus"
            disabled={busy || selecionados.length === 0}
            onClick={() => confirmar(selecionados)}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check size={16} /> Confirmar lote ({selecionados.length})
          </PlanWriteButton>
        </div>
      </div>

      {loading && <p className="text-slate-500">Carregando...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && aguardando.length === 0 && (
        <p className="text-slate-500 text-sm">Nenhum pneu aguardando marcação.</p>
      )}

      <div className="space-y-4">
        {grupos.map(([key, lista]) => {
          const sample = lista[0];
          return (
            <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    NF: {sample.nota_fiscal || "Sem nota"} · {sample.data_compra ? formatLocalDate(sample.data_compra) : "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sample.fornecedor || "Fornecedor não informado"} · {lista.length} pneu(s)
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => gerarEtiquetasMarcacaoPneu(lista)}
                >
                  PDF deste lote
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="px-4 py-2 w-10"></th>
                    <th className="px-4 py-2 font-normal">Código</th>
                    <th className="px-4 py-2 font-normal">Marca / medida</th>
                    <th className="px-4 py-2 font-normal">Valor</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((pneu) => (
                    <tr key={pneu.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selecionados.includes(pneu.id)}
                          onChange={() => toggle(pneu.id)}
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-medium">
                        <Link to={`/pneus/${pneu.id}`} className="text-blue-700 hover:underline">
                          {pneu.codigo_marcacao}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {[pneu.marca, pneu.modelo, pneu.medida].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {pneu.valor_unitario != null
                          ? pneu.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <PlanWriteButton
                          moduleKey="marcacao_pneus"
                          disabled={busy}
                          onClick={() => confirmar([pneu.id])}
                          className="text-xs text-emerald-700 hover:underline"
                        >
                          Marcação aplicada
                        </PlanWriteButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
