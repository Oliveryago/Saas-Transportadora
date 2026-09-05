-- Importação de NF-e: código do fornecedor por item + pneus pendentes de marcação
-- Execute no SQL Editor se não usar `supabase db push`.

-- Par (fornecedor_cnpj + codigo_produto / cProd) para casar itens da nota
-- com o catálogo. Um item pode ter vários códigos (vários fornecedores).
CREATE TABLE IF NOT EXISTS public.itens_estoque_codigos_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.itens_estoque(id) ON DELETE CASCADE,
  fornecedor_cnpj text NOT NULL,
  codigo_produto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itens_estoque_codigos_fornecedor_unicos
    UNIQUE (tenant_id, fornecedor_cnpj, codigo_produto)
);

CREATE INDEX IF NOT EXISTS itens_estoque_codigos_fornecedor_item_id_idx
  ON public.itens_estoque_codigos_fornecedor (item_id);

COMMENT ON TABLE public.itens_estoque_codigos_fornecedor IS
  'Código do produto no fornecedor (prod.cProd da NF-e) por CNPJ. Usado no casamento da importação.';

ALTER TABLE public.itens_estoque_codigos_fornecedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itens_estoque_codigos_fornecedor_por_empresa"
  ON public.itens_estoque_codigos_fornecedor;
CREATE POLICY "itens_estoque_codigos_fornecedor_por_empresa"
  ON public.itens_estoque_codigos_fornecedor
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_estoque_codigos_fornecedor TO authenticated;

-- Marcação de fogo preenchida depois (tela seguinte)
ALTER TABLE public.pneus_individuais
  ALTER COLUMN codigo_marcacao DROP NOT NULL;

ALTER TABLE public.pneus_individuais
  DROP CONSTRAINT IF EXISTS pneus_individuais_status_check;

ALTER TABLE public.pneus_individuais
  ADD CONSTRAINT pneus_individuais_status_check CHECK (status IN (
    'aguardando_marcacao',
    'pendente_marcacao',
    'em_estoque',
    'montado',
    'recapado',
    'descartado',
    'disponivel',
    'em_uso',
    'baixado'
  ));
