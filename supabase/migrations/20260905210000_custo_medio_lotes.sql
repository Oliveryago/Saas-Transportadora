-- Custo médio do item = média ponderada dos lotes restantes
-- 2026-09-05
--
-- estoque_atual já era soma de quantidade_restante.
-- custo_medio ficava 0 nas entradas por XML/lote porque o trigger
-- não atualizava esse campo (só o saldo).

CREATE OR REPLACE FUNCTION public.recalcular_estoque_atual(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.itens_estoque
  SET
    estoque_atual = COALESCE((
      SELECT SUM(l.quantidade_restante)
      FROM public.lotes_estoque l
      WHERE l.item_id = p_item_id
    ), 0),
    custo_medio = COALESCE((
      SELECT CASE
        WHEN SUM(l.quantidade_restante) = 0 THEN 0
        ELSE ROUND(
          (SUM(l.quantidade_restante * COALESCE(l.valor_unitario, 0)) / SUM(l.quantidade_restante))::numeric,
          2
        )
      END
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
AFTER INSERT OR UPDATE OF item_id, quantidade_restante, valor_unitario OR DELETE
ON public.lotes_estoque
FOR EACH ROW
EXECUTE PROCEDURE public.lotes_estoque_sincroniza_saldo();

GRANT EXECUTE ON FUNCTION public.recalcular_estoque_atual(uuid) TO authenticated;

COMMENT ON COLUMN public.itens_estoque.custo_medio IS
  'Cache da média ponderada dos lotes restantes (quantidade_restante × valor_unitario).';

-- Corrige itens já importados com custo_medio zerado
UPDATE public.itens_estoque i
SET
  estoque_atual = COALESCE((
    SELECT SUM(l.quantidade_restante)
    FROM public.lotes_estoque l
    WHERE l.item_id = i.id
  ), i.estoque_atual),
  custo_medio = COALESCE((
    SELECT CASE
      WHEN SUM(l.quantidade_restante) = 0 THEN 0
      ELSE ROUND(
        (SUM(l.quantidade_restante * COALESCE(l.valor_unitario, 0)) / SUM(l.quantidade_restante))::numeric,
        2
      )
    END
    FROM public.lotes_estoque l
    WHERE l.item_id = i.id
  ), i.custo_medio)
WHERE EXISTS (SELECT 1 FROM public.lotes_estoque l WHERE l.item_id = i.id);
