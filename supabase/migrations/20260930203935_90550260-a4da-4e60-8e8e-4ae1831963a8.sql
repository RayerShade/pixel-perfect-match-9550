CREATE UNIQUE INDEX IF NOT EXISTS profiles_ogrenci_no_tekil ON public.profiles (ogrenci_no) WHERE ogrenci_no <> '';

CREATE OR REPLACE FUNCTION public.ogrenci_no_kilidi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if old.ogrenci_no <> '' and new.ogrenci_no is distinct from old.ogrenci_no
     and auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Öğrenci numarası değiştirilemez';
  end if;
  return new;
end $$;
DROP TRIGGER IF EXISTS ogrenci_no_kilidi ON public.profiles;
CREATE TRIGGER ogrenci_no_kilidi BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ogrenci_no_kilidi();

CREATE OR REPLACE FUNCTION public.hesap_hazirla(_ad_soyad text, _ogrenci_no text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _uid uuid := auth.uid(); _email text; _onayli timestamptz; _no text := coalesce(nullif(trim(_ogrenci_no), ''), '');
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  select email, email_confirmed_at into _email, _onayli from auth.users where id = _uid;
  if _no <> '' and exists (select 1 from public.profiles where ogrenci_no = _no and id <> _uid) then
    _no := '';
  end if;
  insert into public.profiles (id, email, ad_soyad, ogrenci_no)
  values (_uid, _email, coalesce(nullif(trim(_ad_soyad), ''), ''), _no)
  on conflict (id) do update set
    email = excluded.email,
    ad_soyad = case when excluded.ad_soyad <> '' then excluded.ad_soyad else profiles.ad_soyad end,
    ogrenci_no = case when profiles.ogrenci_no = '' then excluded.ogrenci_no else profiles.ogrenci_no end,
    updated_at = now();
  insert into public.user_data (user_id) values (_uid) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'user') on conflict do nothing;
  if lower(_email) = 'cerandeniz435@gmail.com' and _onayli is not null then
    insert into public.user_roles (user_id, role) values (_uid, 'admin') on conflict do nothing;
  end if;
  return public.has_role(_uid, 'admin');
end $function$;

-- Kayıt ekranında numaraya göre bilgileri gösterir (soyad maskeli).
CREATE OR REPLACE FUNCTION public.ogrenci_sorgula(_no text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare _d text := regexp_replace(coalesce(_no,''), '\D', '', 'g'); _r record; _donem text;
begin
  if length(_d) < 3 then return jsonb_build_object('bulundu', false, 'kayitli', false); end if;
  select g.anahtar, o.value as ogr into _r
  from public.global_data g, jsonb_each(coalesce(g.veri->'ogrenciler','{}'::jsonb)) o
  where g.anahtar like 'program:%' and regexp_replace(coalesce(o.value->>'no',''), '\D', '', 'g') = _d
  limit 1;
  if _r is null then
    return jsonb_build_object('bulundu', false, 'kayitli', exists(select 1 from public.profiles where ogrenci_no = trim(_no)));
  end if;
  select e->>'ad' into _donem from public.global_data g, jsonb_array_elements(g.veri->'liste') e
   where g.anahtar = 'donemler' and e->>'id' = split_part(_r.anahtar, ':', 2);
  return jsonb_build_object(
    'bulundu', true,
    'ad', coalesce(_r.ogr->>'ad',''),
    'soyad', left(coalesce(_r.ogr->>'soyad',''), 1) || repeat('*', greatest(length(coalesce(_r.ogr->>'soyad','')) - 1, 0)),
    'grup', concat_ws(' / ', nullif(_r.ogr->>'grup',''), nullif(_r.ogr->>'altGrup','')),
    'donem', coalesce(_donem, ''),
    'dil', split_part(_r.anahtar, ':', 3),
    'kayitli', exists(select 1 from public.profiles where ogrenci_no = trim(_no) or ogrenci_no = _d));
end $$;
REVOKE EXECUTE ON FUNCTION public.ogrenci_sorgula(text) FROM public;
GRANT EXECUTE ON FUNCTION public.ogrenci_sorgula(text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ogrenci_no_kilidi() FROM public, anon, authenticated;