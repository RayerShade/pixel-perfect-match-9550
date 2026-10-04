CREATE TABLE public.admin_gecmis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  islem text NOT NULL,
  detay text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_gecmis TO authenticated;
GRANT ALL ON public.admin_gecmis TO service_role;
ALTER TABLE public.admin_gecmis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gecmis yazar" ON public.admin_gecmis FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.orijinal_admin_mi()));
CREATE POLICY "Panel gecmisi okur" ON public.admin_gecmis FOR SELECT TO authenticated
  USING (public.orijinal_admin_mi());
CREATE INDEX admin_gecmis_zaman ON public.admin_gecmis (created_at DESC);