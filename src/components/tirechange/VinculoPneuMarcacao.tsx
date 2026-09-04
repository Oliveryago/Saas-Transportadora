import { useState } from "react";
import { Search } from "lucide-react";
import { usePneusIndividuais } from "../../hooks/usePneusIndividuais";
import type { PneuIndividual } from "../../types/pneu";
import { PNEU_STATUS_LABEL } from "../../types/pneu";

interface Props {
  vehicleId: string;
  posicao?: string;
}

export function VinculoPneuMarcacao({ vehicleId, posicao }: Props) {
  const { buscarPorCodigo, atualizarStatus } = usePneusIndividuais();
  const [codigo, setCodigo] = useState("");
  const [pneu, setPneu] = useState<PneuIndividual | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function buscar() {
    setErro(null);
    setOk(null);
    setBusy(true);
    try {
      const found = await buscarPorCodigo(codigo);
      if (!found) {
        setPneu(null);
        setErro("Código não encontrado.");
        return;
      }
      setPneu(found);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro na busca");
    } finally {
      setBusy(false);
    }
  }

  async function vincular() {
    if (!pneu) return;
    if (pneu.status === "aguardando_marcacao") {
      setErro("Este pneu ainda aguarda marcação de fogo. Confirme a aplicação antes de montar.");
      return;
    }
    if (!vehicleId) {
      setErro("Selecione o veículo da troca primeiro.");
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      await atualizarStatus([pneu.id], "montado", {
        vehicle_id: vehicleId,
        posicao: posicao || null,
        observacao: "Vinculado pela troca de pneu",
      });
      setOk(`Pneu ${pneu.codigo_marcacao} montado neste veículo.`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao vincular");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50">
      <p className="text-xs font-medium text-slate-600">Vincular pneu pela marcação de fogo (opcional)</p>
      <div className="flex gap-2">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="PNEU-2026-00001"
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <button type="button" onClick={buscar} disabled={busy || !codigo.trim()} className="px-3 py-2 border rounded-lg text-sm inline-flex items-center gap-1">
          <Search size={14} /> Buscar
        </button>
      </div>
      {pneu && (
        <div className="text-xs text-slate-600">
          {pneu.codigo_marcacao} · {PNEU_STATUS_LABEL[pneu.status]} · {[pneu.marca, pneu.medida].filter(Boolean).join(" ")}
          <button type="button" onClick={vincular} disabled={busy} className="ml-2 text-blue-700 font-medium hover:underline">
            Montar neste veículo
          </button>
        </div>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {ok && <p className="text-xs text-emerald-700">{ok}</p>}
    </div>
  );
}
