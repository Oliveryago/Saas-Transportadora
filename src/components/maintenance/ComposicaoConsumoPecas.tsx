import { formatBRL } from "../../lib/utils/money";
import type { ConsumoLoteParte } from "../../types";

interface Props {
  lotes?: ConsumoLoteParte[] | null;
  compact?: boolean;
}

export function ComposicaoConsumoPecas({ lotes, compact }: Props) {
  if (!lotes?.length) return null;

  return (
    <div className={compact ? "mt-1 space-y-0.5" : "mt-2 border border-slate-100 rounded-lg overflow-hidden"}>
      {!compact && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-1.5 bg-slate-50">
          Consumo por lote / nota
        </p>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400">
            <th className="text-left font-medium px-3 py-1">Origem</th>
            <th className="text-right font-medium px-3 py-1">Qtd</th>
            <th className="text-right font-medium px-3 py-1">Unit.</th>
            <th className="text-right font-medium px-3 py-1">Custo</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((parte, index) => (
            <tr key={`${parte.lote_id}-${index}`} className="border-t border-slate-100">
              <td className="px-3 py-1.5 text-slate-700">
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mr-1 ${
                  parte.origem === "nota_atual"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-50 text-blue-700"
                }`}>
                  {parte.origem === "nota_atual" ? "Nesta nota" : "Estoque"}
                </span>
                {parte.numero_nota ? `NF ${parte.numero_nota}` : "Lote sem NF"}
                {parte.fornecedor_nome ? ` · ${parte.fornecedor_nome}` : ""}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{parte.quantidade}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatBRL(parte.valor_unitario)}</td>
              <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatBRL(parte.custo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
