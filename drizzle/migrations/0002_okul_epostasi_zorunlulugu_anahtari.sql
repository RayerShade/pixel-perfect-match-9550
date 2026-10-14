-- Okul e-postası zorunluluğu tek bir anahtara bağlanıyor: kod kalır, yalnızca kapılır.
alter table public.panel_ayar
  add column if not exists okul_epostasi_zorunlu boolean not null default false;

-- Kayıt ekranı bu anahtarı anonim okuyabilir (yalnızca true/false döner).
create or replace function public.okul_epostasi_zorunlu_mu()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.panel_ayar where okul_epostasi_zorunlu);
$$;

-- Anahtarı yalnızca super admin çevirebilir.
create or replace function public.okul_epostasi_ayarla(_ver boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.gercek_super_admin_mi() then raise exception 'Bu işlemi yalnızca super admin yapabilir'; end if;
  update public.panel_ayar set okul_epostasi_zorunlu = _ver;
  if not found then raise exception 'Panel ayar kaydı bulunamadı'; end if;
end $$;

-- hesap_hazirla: eski davranış aynen korunur, tek fark baştaki koşulun anahtara bakması.
create or replace function public.hesap_hazirla(_ad_soyad text, _ogrenci_no text)
returns boolean language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _email text; _onayli timestamptz; _no text := coalesce(nullif(trim(_ogrenci_no), ''), '');
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  select email, email_confirmed_at into _email, _onayli from auth.users where id = _uid;
  if public.okul_epostasi_zorunlu_mu()
     and not exists (select 1 from public.profiles where id = _uid)
     and lower(coalesce(_email,'')) not like '%@ogr.iu.edu.tr'
     and lower(coalesce(_email,'')) <> 'cerandeniz435@gmail.com'
     and not exists (select 1 from public.super_adminler where user_id = _uid) then
    raise exception 'IU_EPOSTA_GEREKLI';
  end if;
  if _no <> '' and exists (select 1 from public.profiles where ogrenci_no = _no and id <> _uid) then _no := ''; end if;
  insert into public.profiles (id, email, ad_soyad, ogrenci_no)
  values (_uid, _email, coalesce(nullif(trim(_ad_soyad), ''), ''), _no)
  on conflict (id) do update set
    email = excluded.email,
    ad_soyad = case when excluded.ad_soyad <> '' then excluded.ad_soyad else profiles.ad_soyad end,
    ogrenci_no = case when profiles.ogrenci_no = '' then excluded.ogrenci_no else profiles.ogrenci_no end,
    updated_at = now();
  insert into public.user_data (user_id) values (_uid) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'user') on conflict do nothing;
  if (lower(_email) = 'cerandeniz435@gmail.com' and _onayli is not null)
     or exists (select 1 from public.super_adminler where user_id = _uid) then
    insert into public.user_roles (user_id, role) values (_uid, 'admin') on conflict do nothing;
  end if;
  return public.has_role(_uid, 'admin');
end $$;

comment on column public.panel_ayar.okul_epostasi_zorunlu is 'true = yeni hesaplar yalnızca @ogr.iu.edu.tr ile açılabilir (super admin hariç). false = her e-posta ile açılabilir.';

revoke all on function public.okul_epostasi_ayarla(boolean) from public, anon;
grant execute on function public.okul_epostasi_ayarla(boolean) to authenticated, service_role;
grant execute on function public.okul_epostasi_zorunlu_mu() to anon, authenticated, service_role;