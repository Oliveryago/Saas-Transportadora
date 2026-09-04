import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePneusIndividuais } from "../hooks/usePneusIndividuais";
import { useVehicles } from "../hooks/useVehicles";
import type { PneuIndividual, PneuMovimentacao, PneuRecapagem } from "../types/pneu";
import { PNEU_STATUS_LABEL } from "../types/pneu";
import { formatLocalDate } from "../lib/utils/date";
import { formatBRL } from "../lib/utils/money";

export function PneuFichaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { carregarFicha, atualizarStatus, registrarRecapagem } = usePneusIndividuais();
  const { vehicles } = useVehicles();
  const [pneu, setPneu] = useState<PneuIndividual | null>(null);
  const [movs, setMovs] = useState<PneuMovimentacao[]>([]);
  const [recaps, setRecaps] = useState<PneuRecapagem[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [posicao, setPosicao] = useState("");
  const [recapData, setRecapData] = useState(new Date().toISOString().slice(0, 10));
  const [recapObs, setRecapObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    const ficha = await carregarFicha(id);
    setPneu(ficha?.pneu ?? null);
    setMovs(ficha?.movimentacoes ?? []);
    setRecaps(ficha?.recapagens ?? []);
    setVehicleId(ficha?.pneu?.vehicle_id || "");
    setPosicao(ficha?.pneu?.posicao || "");
  }

  useEffect(() => {
    load().catch((err) => setErro(err instanceof Error ? err.message : "Erro ao carregar ficha"));
  }, [id]);

  async function montar() {
    if (!pneu) return;
    if (pneu.status === "aguardando_marcacao") {
      setErro("Este pneu ainda aguarda marcação de fogo e não pode ser vinculado a um veículo.");
      return;
    }
    if (!vehicleId) {
      setErro("Selecione o veículo.");
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      await atualizarStatus([pneu.id], "montado", {
        vehicle_id: vehicleId,
        posicao,
        observacao: `Montado na posição ${posicao || "não informada"}`,
      });
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao montar pneu");
    } finally {
      setBusy(false);
    }
  }

  async function recapar() {
    if (!pneu) return;
    setBusy(true);
    try {
      await registrarRecapagem(pneu.id, recapData, recapObs);
      await atualizarStatus([pneu.id], "recapado", { observacao: recapObs || "Recapagem registrada" });
      setRecapObs("");
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar recapagem");
    } finally {
      setBusy(false);
    }
  }

  async function descartar() {
    if (!pneu) return;
    if (!confirm("Descartar este pneu? O código não poderá ser reaproveitado.")) return;
    setBusy(true);
    try {
      await atualizarStatus([pneu.id], "descartado", { vehicle_id: null, posicao: null, observacao: "Pneu descartado" });
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao descartar");
    } finally {
      setBusy(false);
    }
  }

  if (!pneu) {
    return (
      <div className="p-6">
        <p className="text-slate-500">{erro || "Carregando ficha..."}</p>
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.id === pneu.vehicle_id);

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="flex flex-wrap justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase text-slate-400">Ficha individual</p>
          <h1 className="text-2xl font-mono font-bold text-slate-900">{pneu.codigo_marcacao}</h1>
          <p className="text-sm text-slate-500">{PNEU_STATUS_LABEL[pneu.status]}</p>
        </div>
        <Link to="/pneus/aguardando" className="text-sm text-blue-600 hover:underline">Ver fila de marcação</Link>
      </div>

      {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border rounded-xl p-4 text-sm space-y-1">
          <p className="font-medium text-slate-800 mb-2">Origem</p>
          <p>NF: {pneu.nota_fiscal || "—"}</p>
          <p>Data da compra: {pneu.data_compra ? formatLocalDate(pneu.data_compra) : "—"}</p>
          <p>Fornecedor: {pneu.fornecedor || "—"}</p>
          <p>Valor: {pneu.valor_unitario != null ? formatBRL(pneu.valor_unitario) : "—"}</p>
          <p>Marca/modelo: {[pneu.marca, pneu.modelo].filter(Boolean).join(" ") || "—"}</p>
          <p>Medida: {pneu.medida || "—"}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium text-slate-800">Vínculo em veículo</p>
          <p>Atual: {vehicle ? `${vehicle.license_plate} · ${pneu.posicao || "posição não informada"}` : "Não montado"}</p>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full border rounded-md px-3 py-2">
            <option value="">Selecione o veículo</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.license_plate} - {v.model}</option>
            ))}
          </select>
          <input value={posicao} onChange={(e) => setPosicao(e.target.value)} placeholder="Posição (ex: tração L)" className="w-full border rounded-md px-3 py-2" />
          <button type="button" disabled={busy} onClick={montar} className="w-full bg-blue-600 text-white rounded-md py-2 disabled:opacity-50">
            Montar neste veículo
          </button>
          <button type="button" disabled={busy} onClick={descartar} className="w-full border border-red-200 text-red-700 rounded-md py-2">
            Descartar pneu
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <p className="font-medium text-slate-800 mb-2">Recapagens ({recaps.length})</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <input type="date" value={recapData} onChange={(e) => setRecapData(e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
          <input value={recapObs} onChange={(e) => setRecapObs(e.target.value)} placeholder="Observação" className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[12rem]" />
          <button type="button" disabled={busy} onClick={recapar} className="px-3 py-2 bg-slate-800 text-white rounded-md text-sm">Registrar recapagem</button>
        </div>
        {recaps.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma recapagem.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {recaps.map((recap) => (
              <li key={recap.id}>{formatLocalDate(recap.data)} {recap.observacao ? `· ${recap.observacao}` : ""}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <p className="font-medium text-slate-800 mb-2">Histórico</p>
        {movs.length === 0 ? (
          <p className="text-sm text-slate-500">Sem movimentações.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {movs.map((mov) => (
              <li key={mov.id} className="border-b last:border-0 pb-2">
                <span className="font-medium">{mov.tipo}</span>
                {" · "}
                {new Date(mov.created_at).toLocaleString("pt-BR")}
                {mov.posicao ? ` · ${mov.posicao}` : ""}
                {mov.observacao ? ` · ${mov.observacao}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
