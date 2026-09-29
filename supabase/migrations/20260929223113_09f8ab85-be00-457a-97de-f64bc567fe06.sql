CREATE OR REPLACE FUNCTION public.hesap_hazirla(_ad_soyad text, _ogrenci_no text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _uid uuid := auth.uid(); _email text; _onayli timestamptz;
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  select email, email_confirmed_at into _email, _onayli from auth.users where id = _uid;
  insert into public.profiles (id, email, ad_soyad, ogrenci_no)
  values (_uid, _email, coalesce(nullif(trim(_ad_soyad), ''), ''), coalesce(nullif(trim(_ogrenci_no), ''), ''))
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