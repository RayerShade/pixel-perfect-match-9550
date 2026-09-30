create table public.super_adminler (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.super_adminler to authenticated;
grant all on public.super_adminler to service_role;
alter table public.super_adminler enable row level security;

create table public.panel_erisim (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bitis timestamptz not null
);
grant all on public.panel_erisim to service_role;
alter table public.panel_erisim enable row level security;

create table public.panel_denemeler (
  id bigserial primary key,
  user_id uuid not null,
  zaman timestamptz not null default now()
);
grant all on public.panel_denemeler to service_role;
alter table public.panel_denemeler enable row level security;

create table public.panel_ayar (
  id int primary key default 1 check (id = 1),
  sifre_hash text not null
);
grant all on public.panel_ayar to service_role;
alter table public.panel_ayar enable row level security;
insert into public.panel_ayar (id, sifre_hash) values (1, '$2a$10$GKSw/ivkMirRE.W5/xH85eZWlSvS8OnsERyRr8pQ7brUeOciD4hiO');

create or replace function public.gercek_super_admin_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users where id = auth.uid() and lower(email) = 'cerandeniz435@gmail.com' and email_confirmed_at is not null)
      or exists (select 1 from public.super_adminler where user_id = auth.uid())
$$;

create or replace function public.orijinal_admin_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select public.gercek_super_admin_mi()
      or exists (select 1 from public.panel_erisim where user_id = auth.uid() and bitis > now())
$$;

create policy "Super adminler listesini panel gorur" on public.super_adminler
  for select to authenticated using (public.orijinal_admin_mi());

create or replace function public.super_admin_ayarla(_user_id uuid, _ver boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.gercek_super_admin_mi() then raise exception 'Bu işlemi yalnızca super admin yapabilir'; end if;
  if _user_id = auth.uid() then raise exception 'Kendi yetkini değiştiremezsin'; end if;
  if exists (select 1 from auth.users where id = _user_id and lower(email) = 'cerandeniz435@gmail.com') then
    raise exception 'Ana super adminin yetkisi değiştirilemez';
  end if;
  if _ver then
    insert into public.super_adminler (user_id) values (_user_id) on conflict do nothing;
    insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
  else
    delete from public.super_adminler where user_id = _user_id;
  end if;
end $$;

create or replace function public.panel_sifre_dene(_sifre text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare _uid uuid := auth.uid(); _h text;
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  if (select count(*) from public.panel_denemeler where user_id = _uid and zaman > now() - interval '15 minutes') >= 5 then
    raise exception 'Çok fazla deneme. 15 dakika sonra tekrar dene.';
  end if;
  select sifre_hash into _h from public.panel_ayar where id = 1;
  if _h is null or extensions.crypt(coalesce(_sifre,''), _h) <> _h then
    insert into public.panel_denemeler (user_id) values (_uid);
    return false;
  end if;
  delete from public.panel_denemeler where user_id = _uid;
  insert into public.panel_erisim (user_id, bitis) values (_uid, now() + interval '12 hours')
    on conflict (user_id) do update set bitis = excluded.bitis;
  return true;
end $$;

create or replace function public.hesap_hazirla(_ad_soyad text, _ogrenci_no text)
returns boolean language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _email text; _onayli timestamptz; _no text := coalesce(nullif(trim(_ogrenci_no), ''), '');
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  select email, email_confirmed_at into _email, _onayli from auth.users where id = _uid;
  if not exists (select 1 from public.profiles where id = _uid)
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

revoke all on function public.gercek_super_admin_mi() from public, anon;
revoke all on function public.super_admin_ayarla(uuid, boolean) from public, anon;
revoke all on function public.panel_sifre_dene(text) from public, anon;
grant execute on function public.gercek_super_admin_mi() to authenticated, service_role;
grant execute on function public.super_admin_ayarla(uuid, boolean) to authenticated, service_role;
grant execute on function public.panel_sifre_dene(text) to authenticated, service_role;