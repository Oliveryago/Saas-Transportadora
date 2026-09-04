export type CategoriaItem = 'oleo' | 'pneu' | 'filtro' | 'peca_motor' | 'eletrica' | 'outro';
export type UnidadeMedida = 'litro' | 'unidade' | 'kit';
export type TipoMovimentacao = 'entrada' | 'saida';

export interface ItemEstoque {
  id: string;
  tenant_id: string;
  nome: string;
  categoria: CategoriaItem;
  unidade_medida: UnidadeMedida;
  estoque_minimo: number;
  estoque_atual: number;
  custo_medio: number;
  ativo: boolean;
  criado_em: string;
  rastreavel_individualmente?: boolean;
}

export interface Fornecedor {
  id: string;
  tenant_id: string;
  nome: string;
  contato: string | null;
}

export interface MovimentacaoEstoque {
  id: string;
  item_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  valor_unitario: number | null;
  fornecedor_id: string | null;
  vehicle_id: string | null;
  maintenance_id: string | null;
  observacao: string | null;
  data_movimento: string;
  usuario_id: string | null;
}

export interface ManutencaoItem {
  id: string;
  maintenance_id: string;
  item_id: string;
  quantidade: number;
  custo_alocado: number;
}

export interface NovaEntradaInput {
  itemId: string;
  quantidade: number;
  valorUnitario: number;
  fornecedorId?: string;
  observacao?: string;
}

export interface NovaSaidaInput {
  itemId: string;
  quantidade: number;
  caminhaoId?: string;
  manutencaoId?: string;
  observacao?: string;
}
