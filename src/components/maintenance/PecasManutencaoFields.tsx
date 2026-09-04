import { Package, Plus, Trash2, Wallet } from "lucide-react";
import type { ItemEstoque } from "../../types/estoque";
import type { MaintenancePart } from "../../types";
import { formatBRL, parseBRLDigits } from "../../lib/utils/money";

export type PecaLinhaOrigin = "estoque" | "avulsa";

export interface PecaLinha {
  id: string;
  origin: PecaLinhaOrigin;
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

function newLine(origin: PecaLinhaOrigin = "avulsa"): PecaLinha {
  return {
    id: crypto.randomUUID(),
    origin,
    itemId: "",
    name: "",
    quantity: 1,
    unitCost: 0,
  };
}

export function emptyPecaLinha(): PecaLinha {
  return newLine("avulsa");
}

export function linhasFromParts(parts?: MaintenancePart[] | null): PecaLinha[] {
  if (!parts?.length) return [emptyPecaLinha()];
  return parts.map((part) => ({
    id: crypto.randomUUID(),
    origin: part.origin === "estoque" && part.item_id ? "estoque" : "avulsa",
    itemId: part.item_id || "",
    name: part.name || "",
    quantity: Number(part.quantity) > 0 ? Number(part.quantity) : 1,
    unitCost: Number(part.cost) || 0,
  }));
}

export function lineTotal(line: PecaLinha): number {
  return (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
}

export function partsTotal(lines: PecaLinha[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function toMaintenanceParts(lines: PecaLinha[]): MaintenancePart[] {
  return lines
    .filter((line) => !isBlankLine(line))
    .map((line) => ({
      name: line.name.trim(),
      quantity: Number(line.quantity) || 0,
      cost: Number(line.unitCost) || 0,
      origin: line.origin,
      item_id: line.origin === "estoque" ? line.itemId : undefined,
    }));
}

function isBlankLine(line: PecaLinha): boolean {
  return !line.name.trim() && !line.itemId && (Number(line.quantity) || 0) <= 1 && (Number(line.unitCost) || 0) === 0;
}

export function availableStockForLine(
  line: PecaLinha,
  lines: PecaLinha[],
  item: ItemEstoque | undefined,
  alreadyDeducted: Map<string, number>
): number {
  if (!item) return 0;
  const usedByOthers = lines
    .filter((other) => other.id !== line.id && other.origin === "estoque" && other.itemId === item.id)
    .reduce((sum, other) => sum + (Number(other.quantity) || 0), 0);
  const already = alreadyDeducted.get(item.id) || 0;
  return item.estoque_atual + already - usedByOthers;
}

export function validatePecaLinhas(
  lines: PecaLinha[],
  itens: ItemEstoque[],
  alreadyDeducted: Map<string, number>
): string | null {
  const filled = lines.filter((line) => !isBlankLine(line));
  for (const line of filled) {
    if (line.origin === "estoque") {
      if (!line.itemId) return "Selecione o item de estoque em todas as linhas de estoque.";
      if (!(Number(line.quantity) > 0)) return `Informe a quantidade de "${line.name || "item do estoque"}".`;
      const item = itens.find((i) => i.id === line.itemId);
      const available = availableStockForLine(line, lines, item, alreadyDeducted);
      if (Number(line.quantity) > available) {
        return `Saldo insuficiente para "${item?.nome || line.name}". Disponível: ${available}.`;
      }
    } else {
      if (!line.name.trim()) return "Informe o nome de todas as peças avulsas.";
      if (!(Number(line.quantity) > 0)) return `Informe a quantidade de "${line.name}".`;
      if (line.unitCost === null || line.unitCost === undefined || Number.isNaN(Number(line.unitCost))) {
        return `Informe o valor unitário de "${line.name}".`;
      }
    }
  }
  return null;
}

const UNIT_LABEL: Record<string, string> = {
  litro: "L",
  unidade: "un",
  kit: "kit",
};

interface Props {
  lines: PecaLinha[];
  onChange: (lines: PecaLinha[]) => void;
  itens: ItemEstoque[];
  alreadyDeducted: Map<string, number>;
}

export function PecasManutencaoFields({ lines, onChange, itens, alreadyDeducted }: Props) {
  function updateLine(id: string, patch: Partial<PecaLinha>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function setOrigin(line: PecaLinha, origin: PecaLinhaOrigin) {
    updateLine(line.id, {
      origin,
      itemId: "",
      name: "",
      quantity: 1,
      unitCost: 0,
    });
  }

  function setStockItem(line: PecaLinha, itemId: string) {
    const item = itens.find((i) => i.id === itemId);
    updateLine(line.id, {
      itemId,
      name: item?.nome || "",
      unitCost: item ? Number(item.custo_medio) || 0 : 0,
      quantity: line.quantity > 0 ? line.quantity : 1,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700">Peças utilizadas na manutenção</label>
        <button
          type="button"
          onClick={() => onChange([...lines, newLine("avulsa")])}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Plus className="w-4 h-4" />
          Adicionar peça
        </button>
      </div>

      <div className="space-y-3">
        {lines.map((line) => {
          const item = itens.find((i) => i.id === line.itemId);
          const available = availableStockForLine(line, lines, item, alreadyDeducted);
          const insufficient = line.origin === "estoque" && item && Number(line.quantity) > available;

          return (
            <div key={line.id} className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOrigin(line, "estoque")}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition ${
                      line.origin === "estoque"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <Package size={12} />
                    Usar item do estoque
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigin(line, "avulsa")}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition ${
                      line.origin === "avulsa"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <Wallet size={12} />
                    Peça avulsa (pagamento direto)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(lines.length === 1 ? [emptyPecaLinha()] : lines.filter((l) => l.id !== line.id))}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remover linha"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {line.origin === "estoque" ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Item</label>
                    <select
                      value={line.itemId}
                      onChange={(e) => setStockItem(line, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um item</option>
                      {itens.map((stockItem) => (
                        <option key={stockItem.id} value={stockItem.id}>
                          {stockItem.nome} — saldo: {stockItem.estoque_atual} {UNIT_LABEL[stockItem.unidade_medida] || stockItem.unidade_medida}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Quantidade
                      {item && (
                        <span className="ml-1 text-gray-400">
                          (disp.: {available} {UNIT_LABEL[item.unidade_medida] || item.unidade_medida})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 ${
                        insufficient ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                    {insufficient && (
                      <p className="text-xs text-red-500 mt-1">Saldo insuficiente. Disponível: {available}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Valor unitário</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700">
                      {formatBRL(line.unitCost)}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Custo médio do estoque</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Nome da peça</label>
                    <input
                      type="text"
                      value={line.name}
                      onChange={(e) => updateLine(line.id, { name: e.target.value })}
                      placeholder="Ex.: Pastilha de freio, mão de obra..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Valor unitário</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatBRL(line.unitCost)}
                      onChange={(e) => updateLine(line.id, { unitCost: parseBRLDigits(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <p className="text-sm text-gray-600">
                  Total da linha: <span className="font-semibold text-gray-900">{formatBRL(lineTotal(line))}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Itens de estoque e peças avulsas podem ser misturados na mesma manutenção. Mão de obra pode ser lançada como peça avulsa.
      </p>
    </div>
  );
}
