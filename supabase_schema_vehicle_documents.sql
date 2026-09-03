-- Documento de veículo (CRLV) — bucket privado + colunas extras
-- Execute no SQL Editor do Supabase.

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-documents', 'vehicle-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Authenticated users can read vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle documents" ON storage.objects;

CREATE POLICY "Authenticated users can read vehicle documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-documents'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
);

CREATE POLICY "Authenticated users can upload vehicle documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-documents'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
);

CREATE POLICY "Authenticated users can update vehicle documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vehicle-documents'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
);

CREATE POLICY "Authenticated users can delete vehicle documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vehicle-documents'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
);

-- Colunas extras extraídas do CRLV
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS year_manufacture INTEGER,
  ADD COLUMN IF NOT EXISTS chassi TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS crlv_fuel TEXT,
  ADD COLUMN IF NOT EXISTS load_capacity TEXT,
  ADD COLUMN IF NOT EXISTS crlv_category TEXT,
  ADD COLUMN IF NOT EXISTS crlv_url TEXT,
  ADD COLUMN IF NOT EXISTS crlv_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crlv_file_name TEXT;

ALTER TABLE public.implements
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS year_manufacture INTEGER,
  ADD COLUMN IF NOT EXISTS chassi TEXT,
  ADD COLUMN IF NOT EXISTS renavam TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS crlv_fuel TEXT,
  ADD COLUMN IF NOT EXISTS load_capacity TEXT,
  ADD COLUMN IF NOT EXISTS crlv_category TEXT,
  ADD COLUMN IF NOT EXISTS crlv_url TEXT,
  ADD COLUMN IF NOT EXISTS crlv_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crlv_file_name TEXT;
