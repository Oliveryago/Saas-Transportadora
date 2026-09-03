-- Bucket privado para documentos de CNH (dados sensíveis)
-- Execute no SQL Editor do Supabase se o bucket ainda não existir.

INSERT INTO storage.buckets (id, name, public)
VALUES ('cnh-documents', 'cnh-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Authenticated users can read cnh documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cnh documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update cnh documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete cnh documents" ON storage.objects;

CREATE POLICY "Authenticated users can read cnh documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cnh-documents'
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

CREATE POLICY "Authenticated users can upload cnh documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cnh-documents'
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

CREATE POLICY "Authenticated users can update cnh documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cnh-documents'
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

CREATE POLICY "Authenticated users can delete cnh documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cnh-documents'
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
