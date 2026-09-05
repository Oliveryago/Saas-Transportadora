-- Atributos cadastrais do item de estoque (NCM, marca, modelo, medida)
-- 2026-09-05
--
-- Editar o item NÃO altera lotes já registrados (quantidade, valor unitário)
-- nem o histórico de consumo. Estes campos valem para o cadastro e para
-- as próximas entradas.

ALTER TABLE public.itens_estoque
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS medida text;

COMMENT ON COLUMN public.itens_estoque.ncm IS
  'NCM cadastral do item. Não altera lotes já recebidos.';

COMMENT ON COLUMN public.itens_estoque.marca IS
  'Marca cadastral. Não altera unidades/lotes já registrados.';

COMMENT ON COLUMN public.itens_estoque.modelo IS
  'Modelo cadastral. Não altera unidades/lotes já registrados.';

COMMENT ON COLUMN public.itens_estoque.medida IS
  'Medida cadastral (pneu). Não altera pneus individuais já registrados.';
