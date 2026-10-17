-- Destek / öneri ayrımı ve güvenli görsel ekleri
UPDATE public.destek_talepleri SET tur = 'destek' WHERE tur = 'sikayet';
ALTER TABLE public.destek_talepleri DROP CONSTRAINT IF EXISTS destek_talepleri_tur_check;
ALTER TABLE public.destek_talepleri
  ADD CONSTRAINT destek_talepleri_tur_check CHECK (tur IN ('destek', 'oneri'));

DROP POLICY IF EXISTS "Talep okuma" ON public.destek_talepleri;
DROP POLICY IF EXISTS "Talep açma" ON public.destek_talepleri;
DROP POLICY IF EXISTS "Talep güncelleme" ON public.destek_talepleri;
CREATE POLICY "Destek taleplerini okuma" ON public.destek_talepleri FOR SELECT TO authenticated
  USING (public.orijinal_admin_mi() OR (tur = 'destek' AND user_id = auth.uid()));
CREATE POLICY "Destek veya öneri açma" ON public.destek_talepleri FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tur IN ('destek', 'oneri'));
CREATE POLICY "Yalnızca yönetici talep günceller" ON public.destek_talepleri FOR UPDATE TO authenticated
  USING (public.orijinal_admin_mi()) WITH CHECK (public.orijinal_admin_mi());

DROP POLICY IF EXISTS "Mesaj yazma" ON public.destek_mesajlari;
CREATE POLICY "Yalnızca destek mesajı yazma" ON public.destek_mesajlari FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.destek_talepleri t
      WHERE t.id = talep_id
        AND t.tur = 'destek'
        AND (public.orijinal_admin_mi() OR (NOT yonetici AND t.user_id = auth.uid()))
    )
    AND (NOT yonetici OR public.orijinal_admin_mi())
  );

CREATE OR REPLACE FUNCTION public.destek_mesaj_zaman_guncelle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.destek_talepleri
  SET updated_at = NEW.created_at,
      durum = CASE WHEN NOT NEW.yonetici THEN 'acik' ELSE durum END
  WHERE id = NEW.talep_id AND tur = 'destek';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS destek_mesaj_zaman_guncelle ON public.destek_mesajlari;
CREATE TRIGGER destek_mesaj_zaman_guncelle
  AFTER INSERT ON public.destek_mesajlari
  FOR EACH ROW EXECUTE FUNCTION public.destek_mesaj_zaman_guncelle();

CREATE OR REPLACE FUNCTION public.destek_cevap_bildirimi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t record;
BEGIN
  IF NEW.yonetici THEN
    SELECT user_id, konu INTO _t FROM public.destek_talepleri WHERE id = NEW.talep_id AND tur = 'destek';
    IF _t.user_id IS NOT NULL AND _t.user_id <> NEW.user_id THEN
      INSERT INTO public.bildirimler (user_id, baslik, metin, tur, link)
      VALUES (_t.user_id, 'Destek talebine cevap geldi', left(_t.konu || ': ' || NEW.metin, 2000), 'destek', '/destek');
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE public.destek_ekleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talep_id uuid NOT NULL REFERENCES public.destek_talepleri(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  yol text NOT NULL UNIQUE,
  ad text NOT NULL CHECK (char_length(ad) BETWEEN 1 AND 180),
  boyut integer NOT NULL CHECK (boyut > 0 AND boyut <= 5242880),
  content_type text NOT NULL CHECK (content_type = 'image/jpeg'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX destek_ekleri_talep_idx ON public.destek_ekleri(talep_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.destek_ekleri TO authenticated;
GRANT ALL ON public.destek_ekleri TO service_role;
ALTER TABLE public.destek_ekleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY "İlgili ekleri okuma" ON public.destek_ekleri FOR SELECT TO authenticated
  USING (
    public.orijinal_admin_mi()
    OR EXISTS (
      SELECT 1 FROM public.destek_talepleri t
      WHERE t.id = talep_id AND t.user_id = auth.uid() AND t.tur = 'destek'
    )
  );
CREATE POLICY "Kendi talebine görsel ekleme" ON public.destek_ekleri FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.destek_talepleri t
      WHERE t.id = talep_id AND t.user_id = auth.uid() AND t.tur IN ('destek', 'oneri')
    )
  );
CREATE POLICY "Ek silme" ON public.destek_ekleri FOR DELETE TO authenticated
  USING (public.orijinal_admin_mi() OR user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('destek-ekleri', 'destek-ekleri', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg'];

CREATE POLICY "Destek görseli yükleme" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'destek-ekleri'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND array_length(storage.foldername(name), 1) = 3
    AND lower(storage.extension(name)) = 'jpg'
    AND (metadata->>'mimetype') = 'image/jpeg'
    AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
    AND EXISTS (
      SELECT 1 FROM public.destek_talepleri t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.user_id = auth.uid()
        AND t.tur IN ('destek', 'oneri')
    )
  );
CREATE POLICY "Destek görseli okuma" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'destek-ekleri'
    AND (
      public.orijinal_admin_mi()
      OR EXISTS (
        SELECT 1 FROM public.destek_talepleri t
        WHERE t.id::text = (storage.foldername(name))[2]
          AND t.user_id = auth.uid()
          AND t.tur = 'destek'
      )
    )
  );
CREATE POLICY "Destek görseli silme" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'destek-ekleri'
    AND (
      public.orijinal_admin_mi()
      OR EXISTS (
        SELECT 1 FROM public.destek_talepleri t
        WHERE t.id::text = (storage.foldername(name))[2]
          AND t.user_id = auth.uid()
          AND t.tur = 'destek'
      )
    )
  );

REVOKE ALL ON FUNCTION public.destek_mesaj_zaman_guncelle() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.destek_mesaj_zaman_guncelle() TO service_role;
