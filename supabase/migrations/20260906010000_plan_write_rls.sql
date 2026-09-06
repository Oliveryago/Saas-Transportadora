-- Controle de escrita por plano (subscription_plan)
-- 2026-09-05
--
-- Cole no SQL Editor do Supabase. Idempotente.
--
-- O front-end (planPermissions.ts) só esconde/desabilita botões.
-- Estas políticas RESTRICTIVE são a trava real de INSERT/UPDATE/DELETE.
-- SELECT continua liberado em todos os planos (visualização).
--
-- Matriz (igual a src/config/planPermissions.ts):
--   free:     frota, motoristas, combustivel
--   basic:    + manutencao
--   premium:  + estoque, troca_oleo, troca_pneus, rodizio, marcacao_pneus,
--               lavagem, pedagio, estacionamento, seguro, acidentes,
--               fornecedores, financeiro, relatorios, configuracoes
--
-- Plano nulo/desconhecido = free.
-- tenants NÃO é restringido (SuperAdmin continua podendo mudar o plano).
--
-- Exceção: INSERT em public.users também libera SuperAdmin (provisionar
-- empresa nova no plano free/basic). company_settings segue a matriz.
--
-- Manutenção com baixa de peça no estoque exige escrita em "estoque"
-- (premium). Basic pode gravar maintenance_records, mas não movimentar estoque.

CREATE OR REPLACE FUNCTION public.plan_write_modules(plan text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(btrim(coalesce(plan, 'free')))
    WHEN 'premium' THEN ARRAY[
      'frota', 'motoristas', 'combustivel', 'manutencao', 'estoque',
      'troca_oleo', 'troca_pneus', 'rodizio', 'marcacao_pneus', 'lavagem',
      'pedagio', 'estacionamento', 'seguro', 'acidentes', 'fornecedores',
      'financeiro', 'relatorios', 'configuracoes'
    ]
    WHEN 'basic' THEN ARRAY[
      'frota', 'motoristas', 'combustivel', 'manutencao'
    ]
    ELSE ARRAY[
      'frota', 'motoristas', 'combustivel'
    ]
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_plan_write_access(p_tenant_id uuid, p_module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    p_module_key = ANY (
      public.plan_write_modules(
        (SELECT t.subscription_plan FROM public.tenants t WHERE t.id = p_tenant_id)
      )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'superadmin'
        OR COALESCE((u.metadata->>'superadmin')::boolean, false)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.plan_write_modules(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_plan_write_access(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plan_write_modules(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_plan_write_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_superadmin() TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_plan_write_policies(
  p_table text,
  p_module text,
  p_tenant_sql text DEFAULT 'tenant_id'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE NOTICE 'Tabela % não existe — pulando políticas de plano', p_table;
    RETURN;
  END IF;

  EXECUTE format('DROP POLICY IF EXISTS plan_write_insert ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS plan_write_update ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS plan_write_delete ON public.%I', p_table);

  EXECUTE format(
    'CREATE POLICY plan_write_insert ON public.%I AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_plan_write_access(%s, %L))',
    p_table, p_tenant_sql, p_module
  );
  EXECUTE format(
    'CREATE POLICY plan_write_update ON public.%I AS RESTRICTIVE FOR UPDATE USING (public.has_plan_write_access(%s, %L)) WITH CHECK (public.has_plan_write_access(%s, %L))',
    p_table, p_tenant_sql, p_module, p_tenant_sql, p_module
  );
  EXECUTE format(
    'CREATE POLICY plan_write_delete ON public.%I AS RESTRICTIVE FOR DELETE USING (public.has_plan_write_access(%s, %L))',
    p_table, p_tenant_sql, p_module
  );
END;
$$;

SELECT public.apply_plan_write_policies('vehicles', 'frota');
SELECT public.apply_plan_write_policies('implements', 'frota');

SELECT public.apply_plan_write_policies('drivers', 'motoristas');

SELECT public.apply_plan_write_policies('fuel_records', 'combustivel');

SELECT public.apply_plan_write_policies('maintenance_records', 'manutencao');
SELECT public.apply_plan_write_policies(
  'manutencao_itens',
  'manutencao',
  '(SELECT mr.tenant_id FROM public.maintenance_records mr WHERE mr.id = maintenance_id)'
);

SELECT public.apply_plan_write_policies('itens_estoque', 'estoque');
SELECT public.apply_plan_write_policies('lotes_estoque', 'estoque');
SELECT public.apply_plan_write_policies('notas_fiscais', 'estoque');
SELECT public.apply_plan_write_policies('itens_estoque_codigos_fornecedor', 'estoque');
SELECT public.apply_plan_write_policies(
  'movimentacoes_estoque',
  'estoque',
  '(SELECT ie.tenant_id FROM public.itens_estoque ie WHERE ie.id = item_id)'
);

SELECT public.apply_plan_write_policies('oil_change_alerts', 'troca_oleo');
SELECT public.apply_plan_write_policies('tire_changes', 'troca_pneus');
SELECT public.apply_plan_write_policies('rotation_records', 'rodizio');

SELECT public.apply_plan_write_policies('pneus_individuais', 'marcacao_pneus');
SELECT public.apply_plan_write_policies('pneus_movimentacoes', 'marcacao_pneus');
SELECT public.apply_plan_write_policies('pneus_recapagens', 'marcacao_pneus');
SELECT public.apply_plan_write_policies('pneus_codigo_seq', 'marcacao_pneus');

SELECT public.apply_plan_write_policies('washing_records', 'lavagem');
SELECT public.apply_plan_write_policies('toll_records', 'pedagio');
SELECT public.apply_plan_write_policies('parking_records', 'estacionamento');
SELECT public.apply_plan_write_policies('insurance_records', 'seguro');
SELECT public.apply_plan_write_policies('accident_records', 'acidentes');
SELECT public.apply_plan_write_policies('suppliers', 'fornecedores');
SELECT public.apply_plan_write_policies('fornecedores', 'fornecedores');

SELECT public.apply_plan_write_policies('company_settings', 'configuracoes');

-- users: só INSERT (Novo Usuário). SuperAdmin precisa criar admin de empresa free/basic.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'Tabela users não existe — pulando política de plano';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS plan_write_insert ON public.users;
  CREATE POLICY plan_write_insert ON public.users
    AS RESTRICTIVE
    FOR INSERT
    WITH CHECK (
      public.has_plan_write_access(tenant_id, 'configuracoes')
      OR public.is_current_user_superadmin()
    );
END $$;

DROP FUNCTION IF EXISTS public.apply_plan_write_policies(text, text, text);
