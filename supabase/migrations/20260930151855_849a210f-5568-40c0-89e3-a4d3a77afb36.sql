create table public.destek_talepleri (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  konu text not null check (char_length(konu) between 1 and 200),
  tur text not null default 'destek' check (tur in ('destek','oneri','sikayet')),
  durum text not null default 'acik' check (durum in ('acik','kapali')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.destek_talepleri to authenticated;
grant all on public.destek_talepleri to service_role;
alter table public.destek_talepleri enable row level security;
create policy "Talep okuma" on public.destek_talepleri for select to authenticated using (user_id = auth.uid() or public.orijinal_admin_mi());
create policy "Talep açma" on public.destek_talepleri for insert to authenticated with check (user_id = auth.uid());
create policy "Talep güncelleme" on public.destek_talepleri for update to authenticated using (user_id = auth.uid() or public.orijinal_admin_mi()) with check (user_id = auth.uid() or public.orijinal_admin_mi());

create table public.destek_mesajlari (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.destek_talepleri(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  yonetici boolean not null default false,
  metin text not null check (char_length(metin) between 1 and 4000),
  created_at timestamptz not null default now()
);
grant select, insert on public.destek_mesajlari to authenticated;
grant all on public.destek_mesajlari to service_role;
alter table public.destek_mesajlari enable row level security;
create policy "Mesaj okuma" on public.destek_mesajlari for select to authenticated using (
  public.orijinal_admin_mi() or exists (select 1 from public.destek_talepleri t where t.id = talep_id and t.user_id = auth.uid()));
create policy "Mesaj yazma" on public.destek_mesajlari for insert to authenticated with check (
  user_id = auth.uid() and (
    (yonetici and public.orijinal_admin_mi())
    or (not yonetici and exists (select 1 from public.destek_talepleri t where t.id = talep_id and t.user_id = auth.uid()))));
create index on public.destek_mesajlari (talep_id, created_at);