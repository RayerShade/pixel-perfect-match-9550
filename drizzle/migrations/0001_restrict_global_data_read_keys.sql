DROP POLICY "Herkes okur" ON public.global_data;

CREATE POLICY "Ortak anahtarları herkes okur"
ON public.global_data
FOR SELECT
TO authenticated
USING (
  anahtar IN ('amfi', 'secmeli', 'donemler', 'duyuru')
  OR anahtar LIKE 'program:%'
);