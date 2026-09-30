CREATE TABLE public.bildirimler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  baslik text NOT NULL CHECK (char_length(baslik) <= 200),
  metin text NOT NULL DEFAULT '' CHECK (char_length(metin) <= 2000),
  tur text NOT NULL DEFAULT 'bilgi',
  link text,
  okundu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bildirimler_user_idx ON public.bildirimler (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.bildirimler TO authenticated;
GRANT ALL ON public.bildirimler TO service_role;
ALTER TABLE public.bildirimler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kendi bildirimini okur" ON public.bildirimler FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Kendi bildirimini günceller" ON public.bildirimler FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Kendi bildirimini siler" ON public.bildirimler FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.bildirimler;

-- Hedef: {"tip":"herkes"} | {"tip":"donem","donemId":"..","dil":"tr|en|null"} | {"tip":"secili","kullanicilar":["uuid",..]}
CREATE OR REPLACE FUNCTION public.bildirim_gonder(_baslik text, _metin text, _hedef jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _n integer; _tip text := coalesce(_hedef->>'tip','herkes');
begin
  if not public.orijinal_admin_mi() then raise exception 'Yetkisiz'; end if;
  if coalesce(trim(_baslik),'') = '' then raise exception 'Başlık gerekli'; end if;
  insert into public.bildirimler (user_id, baslik, metin, tur)
  select p.id, left(trim(_baslik),200), left(coalesce(_metin,''),2000), 'duyuru'
  from public.profiles p
  left join public.user_data d on d.user_id = p.id
  where case _tip
    when 'herkes' then true
    when 'donem' then (nullif(_hedef->>'donemId','') is null or d.ayarlar->>'donemId' = _hedef->>'donemId')
                  and (nullif(_hedef->>'dil','') is null or d.ayarlar->>'dil' = _hedef->>'dil')
    when 'secili' then p.id::text in (select jsonb_array_elements_text(coalesce(_hedef->'kullanicilar','[]'::jsonb)))
    else false end;
  get diagnostics _n = row_count;
  return _n;
end $$;
REVOKE ALL ON FUNCTION public.bildirim_gonder(text,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bildirim_gonder(text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.destek_cevap_bildirimi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _t record;
begin
  if NEW.yonetici then
    select user_id, konu into _t from public.destek_talepleri where id = NEW.talep_id;
    if _t.user_id is not null and _t.user_id <> NEW.user_id then
      insert into public.bildirimler (user_id, baslik, metin, tur, link)
      values (_t.user_id, 'Destek talebine cevap geldi', left(_t.konu || ': ' || NEW.metin, 2000), 'destek', '/destek');
    end if;
  end if;
  return NEW;
end $$;
REVOKE ALL ON FUNCTION public.destek_cevap_bildirimi() FROM public, anon, authenticated;
CREATE TRIGGER destek_cevap_bildirimi AFTER INSERT ON public.destek_mesajlari FOR EACH ROW EXECUTE FUNCTION public.destek_cevap_bildirimi();