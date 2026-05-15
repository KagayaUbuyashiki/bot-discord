
-- Drop the broad public SELECT policies that triggered the linter
DROP POLICY IF EXISTS "Public read stalker-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read mutant-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read equipment-images" ON storage.objects;

-- Allow listing only to approved members (URL public access still works via CDN)
CREATE POLICY "Approved list stalker-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'stalker-photos' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved list mutant-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'mutant-images' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved list equipment-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'equipment-images' AND public.is_approved(auth.uid()));
