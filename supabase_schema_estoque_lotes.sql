-- Estoque por lote + notas fiscais
-- 2026-09-05
--
-- Inventário do schema já existente (não havia pasta supabase/migrations;
-- o banco foi criado por SQL na raiz do repo):
--   itens_estoque          item de peça/insumo (saldo em estoque_atual)
--   fornecedores
--   movimentacoes_estoque
--   manutencao_itens
--   pneus_individuais      unidade serializada (codigo_marcacao = marcação de fogo)
--   pneus_codigo_seq / pneus_movimentacoes / pneus_recapagens
--   vehicles / maintenance_records
--
-- Reaproveita:
--   itens_estoque.rastreavel_individualmente  (item serializado / pneu)
--   pneus_individuais                         (unidade de pneu — não duplicar)
--   codigo_marcacao                           (marcação de fogo)
--   vehicles.id  /  maintenance_records.id
--
-- Cria apenas:
--   notas_fiscais
--   lotes_estoque
-- e estende pneus_individuais com lote_id e manutencao_id.
--
-- estoque_atual NÃO é removido: vira cache da soma dos lotes, preenchido
-- com um lote "ajuste manual" (nota_fiscal_id nulo) para não zerar o saldo.

-- ---------------------------------------------------------------------------
-- 1) Flag de item serializado (já existe desde supabase_schema_pneus_individuais.sql)
-- ---------------------------------------------------------------------------
ALTER TABLE public.itens_estoque
  ADD COLUMN IF NOT EXISTS rastreavel_individualmente boolean NOT NULL DEFAULT false;

UPDATE public.itens_estoque
SET rastreavel_individualmente = true
WHERE categoria = 'pneu' AND rastreavel_individualmente = false;

COMMENT ON COLUMN public.itens_estoque.rastreavel_individualmente IS
  'Item serializado (pneu): cada unidade tem marcação de fogo em pneus_individuais.';

COMMENT ON COLUMN public.itens_estoque.estoque_atual IS
  'Cache denormalizado: soma de lotes_estoque.quantidade_restante. Não usar como fonte da verdade.';

-- ---------------------------------------------------------------------------
-- 2) Notas fiscais
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave_acesso text NOT NULL,
  numero_nota text,
  fornecedor_nome text,
  fornecedor_cnpj text,
  data_emissao date,
  valor_total numeric(12,2),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notas_fiscais_chave_acesso_len CHECK (char_length(chave_acesso) = 44),
  CONSTRAINT notas_fiscais_chave_tenant_unica UNIQUE (tenant_id, chave_acesso)
);

CREATE INDEX IF NOT EXISTS notas_fiscais_tenant_id_idx
  ON public.notas_fiscais (tenant_id);

COMMENT ON TABLE public.notas_fiscais IS
  'NF-e de entrada de estoque. chave_acesso tem 44 dígitos e é única por tenant.';

-- ---------------------------------------------------------------------------
-- 3) Lotes de estoque (vinculados ao item JÁ EXISTENTE: itens_estoque)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lotes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.itens_estoque(id) ON DELETE CASCADE,
  nota_fiscal_id uuid REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  quantidade_recebida numeric(10,2) NOT NULL,
  quantidade_restante numeric(10,2) NOT NULL,
  valor_unitario numeric(10,2),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lotes_estoque_quantidade_recebida_nao_negativa CHECK (quantidade_recebida >= 0),
  CONSTRAINT lotes_estoque_quantidade_restante_nao_negativa CHECK (quantidade_restante >= 0),
  CONSTRAINT lotes_estoque_restante_nao_excede_recebida CHECK (quantidade_restante <= quantidade_recebida)
);

CREATE INDEX IF NOT EXISTS lotes_estoque_item_id_idx
  ON public.lotes_estoque (item_id);

CREATE INDEX IF NOT EXISTS lotes_estoque_nota_fiscal_id_idx
  ON public.lotes_estoque (nota_fiscal_id);

CREATE INDEX IF NOT EXISTS lotes_estoque_tenant_id_idx
  ON public.lotes_estoque (tenant_id);

COMMENT ON TABLE public.lotes_estoque IS
  'Lote de entrada. nota_fiscal_id nulo = ajuste manual (migração do saldo antigo). Saldo do item = soma de quantidade_restante.';

COMMENT ON COLUMN public.lotes_estoque.nota_fiscal_id IS
  'Nulo no lote de ajuste manual gerado na migração do estoque_atual legado.';

-- ---------------------------------------------------------------------------
-- 4) Unidades de pneu: reusa pneus_individuais (codigo_marcacao = marcação de fogo)
-- ---------------------------------------------------------------------------
ALTER TABLE public.pneus_individuais
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes_estoque(id) ON DELETE SET NULL;

ALTER TABLE public.pneus_individuais
  ADD COLUMN IF NOT EXISTS manutencao_id uuid REFERENCES public.maintenance_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pneus_individuais_lote_id_idx
  ON public.pneus_individuais (lote_id);

CREATE INDEX IF NOT EXISTS pneus_individuais_manutencao_id_idx
  ON public.pneus_individuais (manutencao_id);

ALTER TABLE public.pneus_individuais
  DROP CONSTRAINT IF EXISTS pneus_individuais_status_check;

ALTER TABLE public.pneus_individuais
  ADD CONSTRAINT pneus_individuais_status_check CHECK (status IN (
    'aguardando_marcacao',
    'em_estoque',
    'montado',
    'recapado',
    'descartado',
    'disponivel',
    'em_uso',
    'baixado'
  ));

COMMENT ON COLUMN public.pneus_individuais.codigo_marcacao IS
  'Marcação de fogo. Única por tenant (UNIQUE tenant_id, codigo_marcacao).';

COMMENT ON COLUMN public.pneus_individuais.lote_id IS
  'Lote de estoque de origem desta unidade.';

COMMENT ON COLUMN public.pneus_individuais.status IS
  'Valores atuais da UI: aguardando_marcacao, em_estoque, montado, recapado, descartado. Novos: disponivel, em_uso, baixado.';

-- ---------------------------------------------------------------------------
-- 5) Migrar saldo legado → um lote por item (ajuste manual, sem NF)
-- ---------------------------------------------------------------------------
INSERT INTO public.lotes_estoque (
  tenant_id,
  item_id,
  nota_fiscal_id,
  quantidade_recebida,
  quantidade_restante,
  valor_unitario,
  criado_em
)
SELECT
  i.tenant_id,
  i.id,
  NULL,
  i.estoque_atual,
  i.estoque_atual,
  i.custo_medio,
  COALESCE(i.criado_em, now())
FROM public.itens_estoque i
WHERE i.estoque_atual > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.lotes_estoque l WHERE l.item_id = i.id
  );

UPDATE public.pneus_individuais p
SET lote_id = l.id
FROM public.lotes_estoque l
WHERE p.lote_id IS NULL
  AND p.item_id IS NOT NULL
  AND p.item_id = l.item_id
  AND l.nota_fiscal_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6) Manter estoque_atual = soma dos lotes (compatibilidade da tela atual)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalcular_estoque_atual(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.itens_estoque
  SET estoque_atual = COALESCE((
    SELECT SUM(l.quantidade_restante)
    FROM public.lotes_estoque l
    WHERE l.item_id = p_item_id
  ), 0)
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lotes_estoque_sincroniza_saldo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  PERFORM public.recalcular_estoque_atual(v_item_id);
  IF TG_OP = 'UPDATE' AND NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    PERFORM public.recalcular_estoque_atual(OLD.item_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lotes_estoque_sincroniza_saldo ON public.lotes_estoque;
CREATE TRIGGER trg_lotes_estoque_sincroniza_saldo
AFTER INSERT OR UPDATE OF item_id, quantidade_restante OR DELETE
ON public.lotes_estoque
FOR EACH ROW
EXECUTE PROCEDURE public.lotes_estoque_sincroniza_saldo();

GRANT EXECUTE ON FUNCTION public.recalcular_estoque_atual(uuid) TO authenticated;

-- Recalcula uma vez após o seed (por se o trigger não existia no insert)
UPDATE public.itens_estoque i
SET estoque_atual = COALESCE((
  SELECT SUM(l.quantidade_restante)
  FROM public.lotes_estoque l
  WHERE l.item_id = i.id
), 0)
WHERE EXISTS (SELECT 1 FROM public.lotes_estoque l WHERE l.item_id = i.id);

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notas_fiscais_por_empresa" ON public.notas_fiscais;
CREATE POLICY "notas_fiscais_por_empresa" ON public.notas_fiscais
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "lotes_estoque_por_empresa" ON public.lotes_estoque;
CREATE POLICY "lotes_estoque_por_empresa" ON public.lotes_estoque
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fiscais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes_estoque TO authenticated;
