import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const redirectUri = "https://itftakvim.xyz/api/google-calendar/callback";
export const Route = createFileRoute("/api/google-calendar/baslat")({ server: { handlers: { POST: async ({ request }) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Geçersiz oturum." }, { status: 401 });
  const state = crypto.randomUUID().replace(/-/g, "");
  await (supabaseAdmin.from("google_calendar_oauth_states" as never) as any).insert({ state, user_id: data.user.id, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  const clientId = process.env["GOOGLE_CALENDAR_CLIENT_ID"];
  if (!clientId) return Response.json({ error: "Google Calendar henüz yapılandırılmamış." }, { status: 503 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/calendar.app.created", state }).toString();
  return Response.json({ url: url.toString() });
}}}});