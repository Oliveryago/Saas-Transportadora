-- Pneus individuais (marcação de fogo)
-- Execute no SQL Editor do Supabase. Não altera funções de estoque agregado.

ALTER TABLE public.itens_estoque
  ADD COLUMN IF NOT EXISTS rastreavel_individualmente boolean NOT NULL DEFAULT false;

UPDATE public.itens_estoque
SET rastreavel_individualmente = true
WHERE categoria = 'pneu' AND rastreavel_individualmente = false;

CREATE TABLE IF NOT EXISTS public.pneus_codigo_seq (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  ultimo integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, ano)
);

CREATE TABLE IF NOT EXISTS public.pneus_individuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.itens_estoque(id) ON DELETE SET NULL,
  codigo_marcacao text NOT NULL,
  marca text,
  modelo text,
  medida text,
  valor_unitario numeric(10,2),
  data_compra date,
  nota_fiscal text,
  fornecedor text,
  status text NOT NULL DEFAULT 'aguardando_marcacao'
    CHECK (status IN ('aguardando_marcacao', 'em_estoque', 'montado', 'recapado', 'descartado')),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  posicao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, codigo_marcacao)
);

CREATE TABLE IF NOT EXISTS public.pneus_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pneu_id uuid NOT NULL REFERENCES public.pneus_individuais(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  posicao text,
  observacao text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pneus_recapagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pneu_id uuid NOT NULL REFERENCES public.pneus_individuais(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pneus_codigo_seq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pneus_individuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pneus_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pneus_recapagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pneus_codigo_seq_por_empresa" ON public.pneus_codigo_seq;
CREATE POLICY "pneus_codigo_seq_por_empresa" ON public.pneus_codigo_seq
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "pneus_individuais_por_empresa" ON public.pneus_individuais;
CREATE POLICY "pneus_individuais_por_empresa" ON public.pneus_individuais
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "pneus_movimentacoes_por_empresa" ON public.pneus_movimentacoes;
CREATE POLICY "pneus_movimentacoes_por_empresa" ON public.pneus_movimentacoes
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "pneus_recapagens_por_empresa" ON public.pneus_recapagens;
CREATE POLICY "pneus_recapagens_por_empresa" ON public.pneus_recapagens
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.next_codigo_marcacao_pneu(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano int := EXTRACT(YEAR FROM now())::int;
  v_seq int;
BEGIN
  INSERT INTO public.pneus_codigo_seq (tenant_id, ano, ultimo)
  VALUES (p_tenant_id, v_ano, 1)
  ON CONFLICT (tenant_id, ano)
  DO UPDATE SET ultimo = public.pneus_codigo_seq.ultimo + 1
  RETURNING ultimo INTO v_seq;

  RETURN 'PNEU-' || v_ano::text || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_pneus_individuais(
  p_tenant_id uuid,
  p_item_id uuid,
  p_quantidade integer,
  p_valor_unitario numeric DEFAULT NULL,
  p_marca text DEFAULT NULL,
  p_modelo text DEFAULT NULL,
  p_medida text DEFAULT NULL,
  p_nota_fiscal text DEFAULT NULL,
  p_fornecedor text DEFAULT NULL,
  p_data_compra date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.pneus_individuais
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
  v_codigo text;
  v_id uuid;
  v_ids uuid[] := '{}';
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 OR p_quantidade > 500 THEN
    RAISE EXCEPTION 'Quantidade de pneus inválida.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (tenant_id = p_tenant_id OR role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para criar pneus neste tenant.';
  END IF;

  FOR i IN 1..p_quantidade LOOP
    v_codigo := public.next_codigo_marcacao_pneu(p_tenant_id);
    INSERT INTO public.pneus_individuais (
      tenant_id, item_id, codigo_marcacao, marca, modelo, medida,
      valor_unitario, data_compra, nota_fiscal, fornecedor, status
    ) VALUES (
      p_tenant_id, p_item_id, v_codigo, p_marca, p_modelo, p_medida,
      p_valor_unitario, p_data_compra, p_nota_fiscal, p_fornecedor, 'aguardando_marcacao'
    )
    RETURNING id INTO v_id;

    INSERT INTO public.pneus_movimentacoes (tenant_id, pneu_id, tipo, observacao)
    VALUES (p_tenant_id, v_id, 'entrada', 'Entrada no estoque — aguardando marcação de fogo');

    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN QUERY
    SELECT *
    FROM public.pneus_individuais
    WHERE id = ANY (v_ids)
    ORDER BY codigo_marcacao;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_codigo_marcacao_pneu(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_pneus_individuais(uuid, uuid, integer, numeric, text, text, text, text, text, date) TO authenticated;
