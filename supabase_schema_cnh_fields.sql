-- Campos extras da CNH no cadastro de motoristas
-- Execute no SQL Editor do Supabase.

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS data_primeira_habilitacao DATE,
  ADD COLUMN IF NOT EXISTS numero_espelho TEXT,
  ADD COLUMN IF NOT EXISTS cnh_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cnh_file_name TEXT;

COMMENT ON COLUMN public.drivers.data_primeira_habilitacao IS 'Data da 1ª habilitação extraída da CNH.';
COMMENT ON COLUMN public.drivers.numero_espelho IS 'Número espelho / RENACH da CNH.';
COMMENT ON COLUMN public.drivers.cnh_uploaded_at IS 'Data/hora do último upload do documento da CNH.';
COMMENT ON COLUMN public.drivers.cnh_file_name IS 'Nome original do arquivo da CNH enviado.';
