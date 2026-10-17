-- Planlı duyurular yalnızca yönetim tarafından görülebilir ve değiştirilebilir.
create table if not exists public.duyuru_planlari (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(baslik) between 1 and 200),
  metin text not null check (char_length(metin) between 1 and 2000),
  hedef jsonb not null default '{"tip":"herkes"}'::jsonb,
  yayin_zamani timestamptz not null,
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'gonderiliyor', 'gonderildi', 'iptal')),
  olusturan uuid references auth.users(id) on delete set null default auth.uid(),
  gonderildi_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists duyuru_planlari_bekleyen_zaman_idx
  on public.duyuru_planlari (yayin_zamani) where durum = 'bekliyor';

alter table public.duyuru_planlari enable row level security;

drop policy if exists "Admin planlı duyuruları yönetir" on public.duyuru_planlari;
create policy "Admin planlı duyuruları yönetir"
  on public.duyuru_planlari for all
  using (public.orijinal_admin_mi())
  with check (public.orijinal_admin_mi());
