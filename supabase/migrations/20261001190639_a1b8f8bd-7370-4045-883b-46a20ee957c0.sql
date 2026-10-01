CREATE TABLE public.sheets_kaynaklari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anahtar text NOT NULL,
  tur text NOT NULL CHECK (tur IN ('yillik','uygulama','ogrenci','amfi','secmeli')),
  url text NOT NULL,
  son_hash text,
  son_kontrol timestamptz,
  son_degisim timestamptz,
  hata text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anahtar, tur, url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheets_kaynaklari TO authenticated;
GRANT ALL ON public.sheets_kaynaklari TO service_role;
ALTER TABLE public.sheets_kaynaklari ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sheets okur" ON public.sheets_kaynaklari FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin sheets ekler" ON public.sheets_kaynaklari FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin sheets gunceller" ON public.sheets_kaynaklari FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin sheets siler" ON public.sheets_kaynaklari FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));