import { useState, useMemo } from "react";
import type { DateFilter } from "../types";

/**
 * Calcula os limites ISO (from/to) a partir de um DateFilter.
 * Retorna undefined quando o filtro não está ativo (nenhum período selecionado).
 */
export function resolveDateFilter(filter: DateFilter | null): {
  fromISO: string | undefined;
  toISO: string | undefined;
} {
  if (!filter) return { fromISO: undefined, toISO: undefined };

  if (filter.mode === "month" && filter.year != null && filter.month != null) {
    const from = new Date(filter.year, filter.month, 1);
    const to = new Date(filter.year, filter.month + 1, 0); // último dia do mês
    return {
      fromISO: from.toISOString().split("T")[0],
      toISO: to.toISOString().split("T")[0],
    };
  }

  if (filter.mode === "range" && filter.dateFrom && filter.dateTo) {
    // Validar que dateTo >= dateFrom
    if (filter.dateTo >= filter.dateFrom) {
      return { fromISO: filter.dateFrom, toISO: filter.dateTo };
    }
  }

  return { fromISO: undefined, toISO: undefined };
}

/**
 * Hook que encapsula o estado do filtro de data.
 * Retorna o filtro atual, um setter e os valores ISO prontos para queries.
 */
export function useDateFilter() {
  const [filter, setFilter] = useState<DateFilter | null>(null);

  const { fromISO, toISO } = useMemo(() => resolveDateFilter(filter), [filter]);

  const label = useMemo(() => {
    if (!filter) return "Todos os períodos";
    if (filter.mode === "month" && filter.year != null && filter.month != null) {
      const d = new Date(filter.year, filter.month, 1);
      return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    if (filter.mode === "range" && filter.dateFrom && filter.dateTo) {
      const fmt = (s: string) => {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
      };
      return `${fmt(filter.dateFrom)} → ${fmt(filter.dateTo)}`;
    }
    return "Período inválido";
  }, [filter]);

  const clearFilter = () => setFilter(null);

  return { filter, setFilter, clearFilter, fromISO, toISO, label, isActive: !!fromISO };
}
