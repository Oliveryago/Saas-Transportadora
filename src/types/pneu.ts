export type PneuStatus =
  | "aguardando_marcacao"
  | "pendente_marcacao"
  | "em_estoque"
  | "montado"
  | "recapado"
  | "descartado"
  | "disponivel"
  | "em_uso"
  | "baixado";

export interface PneuIndividual {
  id: string;
  tenant_id: string;
  item_id: string | null;
  lote_id?: string | null;
  manutencao_id?: string | null;
  codigo_marcacao: string | null;
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
  pendente_marcacao: "Pendente de marcação",
  em_estoque: "Em estoque",
  montado: "Montado",
  recapado: "Recapado",
  descartado: "Descartado",
  disponivel: "Disponível",
  em_uso: "Em uso",
  baixado: "Baixado",
};

export function nomeParecePneu(nome?: string | null): boolean {
  return /\bpneus?\b/i.test(String(nome || "").trim());
}

export function itemEhRastreavel(item: {
  nome?: string;
  categoria?: string;
  rastreavel_individualmente?: boolean;
} | null | undefined): boolean {
  if (!item) return false;
  if (item.rastreavel_individualmente === true) return true;
  if (item.categoria === "pneu") return true;
  return nomeParecePneu(item.nome);
}

export function extractNfeKey(raw: string): string {
  const match = String(raw || "").match(/(\d{44})/);
  if (match) return match[1];
  return String(raw || "").trim();
}
