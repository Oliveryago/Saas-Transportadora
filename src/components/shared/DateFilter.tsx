import { useState, useEffect } from "react";
import { CalendarDays, X, ChevronDown } from "lucide-react";
import type { DateFilter } from "../../types";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getYearRange() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 10; y--) years.push(y);
  return years;
}

interface DateFilterProps {
  value: DateFilter | null;
  onChange: (filter: DateFilter | null) => void;
  label?: string;
}

export function DateFilterPicker({ value, onChange, label = "Filtrar por período" }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "range">("month");

  // Month mode state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Range mode state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rangeError, setRangeError] = useState("");

  const years = getYearRange();

  useEffect(() => {
    if (value?.mode === "month") {
      setMode("month");
      if (value.month != null) setSelectedMonth(value.month);
      if (value.year != null) setSelectedYear(value.year);
    } else if (value?.mode === "range") {
      setMode("range");
      setDateFrom(value.dateFrom || "");
      setDateTo(value.dateTo || "");
    }
  }, [value]);

  function applyMonthFilter() {
    onChange({ mode: "month", month: selectedMonth, year: selectedYear });
    setOpen(false);
  }

  function applyRangeFilter() {
    setRangeError("");
    if (!dateFrom || !dateTo) {
      setRangeError("Preencha a data inicial e final.");
      return;
    }
    if (dateTo < dateFrom) {
      setRangeError("A data final deve ser igual ou posterior à data inicial.");
      return;
    }
    onChange({ mode: "range", dateFrom, dateTo });
    setOpen(false);
  }

  function clearFilter() {
    onChange(null);
    setOpen(false);
  }

  const activeLabel = value
    ? value.mode === "month" && value.month != null && value.year != null
      ? `${MONTHS[value.month]} ${value.year}`
      : value.mode === "range" && value.dateFrom && value.dateTo
      ? `${value.dateFrom.split("-").reverse().join("/")} → ${value.dateTo.split("-").reverse().join("/")}`
      : label
    : label;

  const isActive = !!value;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
          isActive
            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
        }`}
      >
        <CalendarDays className="w-4 h-4 flex-shrink-0" />
        <span className="max-w-[180px] truncate">{activeLabel}</span>
        {isActive ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearFilter(); }}
            className="ml-1 hover:bg-blue-700 rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72 p-4">
            {/* Mode Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
              <button
                type="button"
                onClick={() => setMode("month")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "month" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Mês / Ano
              </button>
              <button
                type="button"
                onClick={() => setMode("range")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === "range" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Período Personalizado
              </button>
            </div>

            {mode === "month" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ano</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={applyMonthFilter}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtro
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data inicial</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setRangeError(""); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data final</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => { setDateTo(e.target.value); setRangeError(""); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {rangeError && (
                  <p className="text-xs text-red-600">{rangeError}</p>
                )}
                <button
                  type="button"
                  onClick={applyRangeFilter}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtro
                </button>
              </div>
            )}

            {isActive && (
              <button
                type="button"
                onClick={clearFilter}
                className="w-full mt-2 py-1.5 text-gray-500 text-xs hover:text-red-600 transition-colors"
              >
                Limpar filtro — ver todos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
