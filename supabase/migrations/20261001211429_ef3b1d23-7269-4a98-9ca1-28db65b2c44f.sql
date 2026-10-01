CREATE OR REPLACE FUNCTION public.duyuru_listesi()
RETURNS TABLE(baslik text, metin text, zaman timestamptz, alici integer, okuyan integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.orijinal_admin_mi() then raise exception 'Yetkisiz'; end if;
  return query select b.baslik, b.metin, b.created_at, count(*)::int, count(*) filter (where b.okundu)::int
  from public.bildirimler b where b.tur = 'duyuru'
  group by b.baslik, b.metin, b.created_at order by b.created_at desc limit 300;
end $$;
REVOKE ALL ON FUNCTION public.duyuru_listesi() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.duyuru_listesi() TO authenticated;

CREATE OR REPLACE FUNCTION public.duyuru_sil(_baslik text, _metin text, _zaman timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _n integer;
begin
  if not public.orijinal_admin_mi() then raise exception 'Yetkisiz'; end if;
  delete from public.bildirimler where tur = 'duyuru' and baslik = _baslik and metin = _metin and created_at = _zaman;
  get diagnostics _n = row_count;
  return _n;
end $$;
REVOKE ALL ON FUNCTION public.duyuru_sil(text,text,timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.duyuru_sil(text,text,timestamptz) TO authenticated;