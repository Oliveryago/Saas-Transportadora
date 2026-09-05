export interface NfeNota {
  chave_acesso: string;
  numero_nota: string;
  data_emissao: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  valor_total: number;
}

export interface NfeItemExtraido {
  n_item: number;
  descricao: string;
  codigo_fornecedor: string;
  ncm: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  is_pneu: boolean;
  medida_extraida: string | null;
}

export interface NfeItemPreview extends NfeItemExtraido {
  item_id: string | null;
  item_nome: string | null;
  marcacoes_fogo?: string[];
}

export interface NfePreview {
  nota: NfeNota;
  itens: NfeItemPreview[];
  nao_encontrados: NfeItemPreview[];
  ja_importada: boolean;
}

export interface NfeConfirmResult {
  nota_id: string;
  lotes_ids: string[];
  pneus_ids: string[];
  itens_vinculados: number;
  pneus_criados: number;
}

export class NfeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NfeImportError";
  }
}
