import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { kisiselTakvimOlaylari } from "@/lib/personal-calendar.server";

type Json = Record<string, any>;

const event = (summary: string, date: string, start: string, end: string, location = "", description = "") => ({
  summary,
  start: { dateTime: `${date}T${start}:00`, timeZone: "Europe/Istanbul" },
  end: { dateTime: `${date}T${end}:00`, timeZone: "Europe/Istanbul" },
  location,
  description,
  extendedProperties: { private: { source: "itf-takvim" } },
});

async function accessToken(conn: Json) {
  const id = process.env["GOOGLE_CALENDAR_CLIENT_ID"];
  const secret = process.env["GOOGLE_CALENDAR_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("Google Calendar ayarları eksik.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: conn["refresh_token"], grant_type: "refresh_token" }),
  });
  const data = await response.json() as { access_token?: string };
  if (!response.ok || !data.access_token) throw new Error("Google Calendar yetkisi yenilenemedi.");
  return data.access_token;
}

export async function googleTakvimEsitle(userId: string) {
  const db: any = supabaseAdmin;
  const { data: connection } = await db.from("google_calendar_connections").select("*").eq("user_id", userId).maybeSingle();
  if (!connection) throw new Error("Google Calendar bağlı değil.");

  const token = await accessToken(connection);
  const { data: personal } = await db.from("user_data").select("ayarlar,secmeliler,manuel_amfi").eq("user_id", userId).maybeSingle();
  const ayar = (personal?.ayarlar ?? {}) as Json;
  const key = ayar["donemId"] && ayar["dil"] ? `program:${ayar["donemId"]}:${ayar["dil"]}` : "";
  const { data: program } = key ? await db.from("global_data").select("veri").eq("anahtar", key).maybeSingle() : { data: null };
  const events = kisiselTakvimOlaylari((program?.veri ?? {}) as Json, personal).map((olay) =>
    event(olay.baslik, olay.tarih, olay.baslangic, olay.bitis, olay.yer, olay.aciklama),
  );

  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events`;
  let page = "";
  do {
    const response = await fetch(`${base}?privateExtendedProperty=source%3Ditf-takvim&maxResults=250${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`, { headers: { authorization: `Bearer ${token}` } });
    const old = await response.json() as { items?: Array<{ id: string }>; nextPageToken?: string };
    for (const item of old.items ?? []) await fetch(`${base}/${encodeURIComponent(item.id)}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
    page = old.nextPageToken ?? "";
  } while (page);

  for (const item of events) {
    const response = await fetch(base, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(item) });
    if (!response.ok) throw new Error("Google Calendar etkinlikleri kaydedilemedi.");
  }
  await db.from("google_calendar_connections").update({ updated_at: new Date().toISOString() }).eq("user_id", userId);
  return events.length;
}
