import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { googleTakvimEsitle } from "@/lib/google-calendar.server";
const redirectUri = "https://itftakvim.xyz/api/google-calendar/callback";
export const Route = createFileRoute("/api/google-calendar/callback")({ server: { handlers: { GET: async ({ request }) => {
  const q = new URL(request.url).searchParams, code = q.get("code"), state = q.get("state");
  const done = (s: string) => Response.redirect("https://itftakvim.xyz/ayarlar?google_calendar=" + s, 302);
  if (!code || !state) return done("error");
  const { data: pending } = await (supabaseAdmin.from("google_calendar_oauth_states" as never) as any).select("*").eq("state", state).maybeSingle();
  if (!pending || new Date(pending.expires_at).getTime() < Date.now()) return done("expired");
  await (supabaseAdmin.from("google_calendar_oauth_states" as never) as any).delete().eq("state", state);
  const clientId = process.env["GOOGLE_CALENDAR_CLIENT_ID"], secret = process.env["GOOGLE_CALENDAR_CLIENT_SECRET"];
  if (!clientId || !secret) return done("config_error");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  const token = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokenRes.ok || !token.access_token || !token.refresh_token) return done("token_error");
  const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", { method: "POST", headers: { authorization: "Bearer " + token.access_token, "content-type": "application/json" }, body: JSON.stringify({ summary: "İTF Takvim", description: "İTF Takvim tarafından yönetilir." }) });
  const cal = await calRes.json() as { id?: string };
  if (!calRes.ok || !cal.id) return done("calendar_error");
  await (supabaseAdmin.from("google_calendar_connections" as never) as any).upsert({ user_id: pending.user_id, calendar_id: cal.id, refresh_token: token.refresh_token, token_expires_at: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(), updated_at: new Date().toISOString() });
  try { await googleTakvimEsitle(pending.user_id); } catch { return done("sync_error"); }
  return done("connected");
}}}});