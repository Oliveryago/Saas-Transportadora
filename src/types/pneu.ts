export type PneuStatus =
  | "aguardando_marcacao"
  | "em_estoque"
  | "montado"
  | "recapado"
  | "descartado";

export interface PneuIndividual {
  id: string;
  tenant_id: string;
  item_id: string | null;
  codigo_marcacao: string;
  marca: string | null;
  modelo: string | null;
  medida: string | null;
  valor_unitario: number | null;
  data_compra: string | null;
  nota_fiscal: string | null;
  fornecedor: string | null;
  status: PneuStatus;
  vehicle_id: string | null;
  posicao: string | null;
  created_at: string;
  updated_at: string;
}

export interface PneuMovimentacao {
  id: string;
  tenant_id: string;
  pneu_id: string;
  tipo: string;
  vehicle_id: string | null;
  posicao: string | null;
  observacao: string | null;
  created_at: string;
}

export interface PneuRecapagem {
  id: string;
  tenant_id: string;
  pneu_id: string;
  data: string;
  observacao: string | null;
  created_at: string;
}

export const PNEU_STATUS_LABEL: Record<PneuStatus, string> = {
  aguardando_marcacao: "Aguardando marcação",
  em_estoque: "Em estoque",
  montado: "Montado",
  recapado: "Recapado",
  descartado: "Descartado",
};

export function itemEhRastreavel(item: { categoria?: string; rastreavel_individualmente?: boolean } | null | undefined): boolean {
  if (!item) return false;
  if (typeof item.rastreavel_individualmente === "boolean") return item.rastreavel_individualmente;
  return item.categoria === "pneu";
}

export function extractNfeKey(raw: string): string {
  const match = String(raw || "").match(/(\d{44})/);
  if (match) return match[1];
  return String(raw || "").trim();
}
