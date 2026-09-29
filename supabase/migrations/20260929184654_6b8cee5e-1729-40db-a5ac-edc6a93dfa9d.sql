create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Kendi rolünü veya admin hepsini görür" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ad_soyad text not null default '',
  ogrenci_no text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profil okuma" on public.profiles for select to authenticated
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Profil ekleme" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Profil güncelleme" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  veri jsonb not null default '{}'::jsonb,
  ayarlar jsonb not null default '{}'::jsonb,
  secmeliler jsonb not null default '[]'::jsonb,
  manuel_amfi jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.user_data to authenticated;
grant all on public.user_data to service_role;
alter table public.user_data enable row level security;
create policy "Veri okuma" on public.user_data for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Veri ekleme" on public.user_data for insert to authenticated with check (user_id = auth.uid());
create policy "Veri güncelleme" on public.user_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.global_data (
  anahtar text primary key,
  veri jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
grant select, insert, update, delete on public.global_data to authenticated;
grant all on public.global_data to service_role;
alter table public.global_data enable row level security;
create policy "Herkes okur" on public.global_data for select to authenticated using (true);
create policy "Admin ekler" on public.global_data for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin günceller" on public.global_data for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin siler" on public.global_data for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Girişten sonra çağrılır: profili oluşturur, admin e-postası doğrulanmışsa admin rolü verir
create or replace function public.hesap_hazirla(_ad_soyad text, _ogrenci_no text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _email text;
  _onayli timestamptz;
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  select email, email_confirmed_at into _email, _onayli from auth.users where id = _uid;
  insert into public.profiles (id, email, ad_soyad, ogrenci_no)
  values (_uid, _email, coalesce(nullif(trim(_ad_soyad), ''), ''), coalesce(nullif(trim(_ogrenci_no), ''), ''))
  on conflict (id) do update set
    email = excluded.email,
    ad_soyad = case when excluded.ad_soyad <> '' then excluded.ad_soyad else profiles.ad_soyad end,
    ogrenci_no = case when excluded.ogrenci_no <> '' then excluded.ogrenci_no else profiles.ogrenci_no end,
    updated_at = now();
  insert into public.user_data (user_id) values (_uid) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (_uid, 'user') on conflict do nothing;
  if lower(_email) = 'cerandeniz435@gmail.com' and _onayli is not null then
    insert into public.user_roles (user_id, role) values (_uid, 'admin') on conflict do nothing;
  end if;
  return public.has_role(_uid, 'admin');
end $$;
revoke execute on function public.hesap_hazirla(text, text) from public, anon;
grant execute on function public.hesap_hazirla(text, text) to authenticated;