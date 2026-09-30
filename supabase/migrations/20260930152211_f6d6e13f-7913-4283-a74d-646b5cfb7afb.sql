revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.orijinal_admin_mi() from public, anon;
revoke execute on function public.hesap_hazirla(text, text) from public, anon;
revoke execute on function public.admin_yetki_ayarla(uuid, boolean) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;
grant execute on function public.orijinal_admin_mi() to authenticated, service_role;
grant execute on function public.hesap_hazirla(text, text) to authenticated, service_role;
grant execute on function public.admin_yetki_ayarla(uuid, boolean) to authenticated, service_role;