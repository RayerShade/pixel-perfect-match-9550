-- Google Sheets cron çağrısı için ayrı, sadece hash karşılaştırmasıyla doğrulanan anahtar.
-- Anahtarın kendisi yalnızca Supabase Vault ve pg_cron komutunda okunabilir.
create extension if not exists pgcrypto;

create or replace function public.sheets_cron_token_dogrula(_token text)
returns boolean
language sql
security definer
set search_path = public, vault, extensions
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'sheets_cron_secret'
      and encode(extensions.digest(decrypted_secret, 'sha256'), 'hex')
          = encode(extensions.digest(_token, 'sha256'), 'hex')
  );
$$;

revoke all on function public.sheets_cron_token_dogrula(text) from public;
grant execute on function public.sheets_cron_token_dogrula(text) to service_role;


alter table public.sheets_kaynaklari
  add column if not exists kontrol_tipi text not null default 'aralik' check (kontrol_tipi in ('aralik', 'gunluk', 'haftalik')),
  add column if not exists saatler jsonb not null default '[]'::jsonb,
  add column if not exists hafta_gunleri integer[] not null default '{}'::integer[];
