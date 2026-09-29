create or replace function public.orijinal_admin_mi()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users where id = auth.uid() and lower(email) = 'cerandeniz435@gmail.com' and email_confirmed_at is not null)
$$;

create or replace function public.admin_yetki_ayarla(_user_id uuid, _ver boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.orijinal_admin_mi() then raise exception 'Bu işlemi yalnızca ana admin yapabilir'; end if;
  if _user_id = auth.uid() then raise exception 'Kendi yetkini değiştiremezsin'; end if;
  if _ver then
    insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = 'admin';
  end if;
end $$;

revoke execute on function public.orijinal_admin_mi() from public, anon;
revoke execute on function public.admin_yetki_ayarla(uuid, boolean) from public, anon;
grant execute on function public.orijinal_admin_mi() to authenticated;
grant execute on function public.admin_yetki_ayarla(uuid, boolean) to authenticated;