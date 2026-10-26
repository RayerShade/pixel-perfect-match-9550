import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const esc = (v: unknown) => String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const local = (date: string, time: string) => `${date.replace(/-/g, "")}T${(time || "00:00").replace(":", "")}00`;
const addDays = (date: string, days: number) => { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const isoDay = (date: string) => { const day = new Date(date + "T12:00:00Z").getUTCDay(); return day === 0 ? 7 : day; };
const groupMatch = (groups: string[] = [], group = "", sub = "") => {
  const g = String(group).replace(/\s/g, "").toUpperCase(), a = String(sub).replace(/\s/g, "").toUpperCase(), full = a && !a.startsWith(g) ? g + a : a || g;
  return groups.some((x) => { const v = String(x).replace(/\s/g, "").toUpperCase(); return v === g || v === a || v === full || (v.length === 1 && g.startsWith(v)); });
};
export const Route = createFileRoute("/api/takvim/ics")({ server: { handlers: { GET: async ({ request }) => {
  const token = new URL(request.url).searchParams.get("t") || "";
  if (!/^[a-z0-9]{20,}$/i.test(token)) return new Response("Takvim bağlantısı geçersiz.", { status: 404 });
  const { data: row } = await supabaseAdmin.from("user_data").select("ayarlar,secmeliler,veri").filter("ayarlar->>takvimAbonelikToken", "eq", token).maybeSingle();
  if (!row) return new Response("Takvim bağlantısı bulunamadı.", { status: 404 });
  const ayar = (row.ayarlar || {}) as Record<string, any>; const key = ayar.donemId && ayar.dil ? `program:${ayar.donemId}:${ayar.dil}` : "";
  const { data: global } = key ? await supabaseAdmin.from("global_data").select("veri").eq("anahtar", key).maybeSingle() : { data: null };
  const veri = (global?.veri || {}) as any; const today = new Date().toISOString().slice(0,10); const events: string[] = [];
  const push = (uid: string, title: string, date: string, start: string, end: string, place = "", note = "") => events.push(["BEGIN:VEVENT", "UID:" + esc(uid) + "@itftakvim.xyz", "DTSTAMP:" + stamp(new Date()), "DTSTART;TZID=Europe/Istanbul:" + local(date,start), "DTEND;TZID=Europe/Istanbul:" + local(date,end), "SUMMARY:" + esc(title), place ? "LOCATION:" + esc(place) : "", note ? "DESCRIPTION:" + esc(note) : "", "END:VEVENT"].filter(Boolean).join("\r\n"));
  for (const d of veri.dersler || []) { for (let n=0;n<180;n++) { const date = addDays(today,n); if ((d.date && d.date !== date) || (!d.date && isoDay(date) !== Number(d.dayOfWeek))) continue; push("ders-"+d.id+"-"+date,d.courseName,date,d.startTime,d.endTime,d.defaultClassroom,d.instructor); } }
  const ogr = veri.ogrenciler?.[String(ayar.ogrenciNo || "").replace(/^0+/,"")] || {}; const group = ayar.grupElle?.grup || ogr.grup || "", sub = ayar.grupElle?.altGrup || ogr.altGrup || "";
  for (const u of veri.uygulamalar || []) if (u.date >= today && groupMatch(u.gruplar,group,sub)) push("uyg-"+u.id,u.ad,u.date,u.startTime,u.endTime,u.yer,u.hoca);
  for (const o of ayar.ozelDersler || []) if (o.tarih >= today) push("ozel-"+o.id,o.ad,o.tarih,o.startTime,o.endTime,o.yer,o.not);
  const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ITF Takvim//TR","X-WR-CALNAME:İTF Takvim","CALSCALE:GREGORIAN",...events,"END:VCALENDAR",""].join("\r\n");
  return new Response(ics,{headers:{"content-type":"text/calendar; charset=utf-8","cache-control":"no-store","content-disposition":"inline; filename=itf-takvim.ics"}});
}}}});