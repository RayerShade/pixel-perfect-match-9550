import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { kisiselTakvimOlaylari } from "@/lib/personal-calendar.server";

const esc = (value: unknown) => String(value ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const local = (date: string, time: string) => `${date.replace(/-/g, "")}T${(time || "00:00").replace(":", "")}00`;

export const Route = createFileRoute("/api/takvim/ics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("t") || "";
        if (!/^[a-z0-9]{20,}$/i.test(token)) return new Response("Takvim bağlantısı geçersiz.", { status: 404 });

        const db: any = supabaseAdmin;
        const { data: personal } = await db
          .from("user_data")
          .select("ayarlar,secmeliler,manuel_amfi")
          .filter("ayarlar->>takvimAbonelikToken", "eq", token)
          .maybeSingle();
        if (!personal) return new Response("Takvim bağlantısı bulunamadı.", { status: 404 });

        const ayar = personal.ayarlar ?? {};
        const key = ayar.donemId && ayar.dil ? `program:${ayar.donemId}:${ayar.dil}` : "";
        const { data: global } = key
          ? await db.from("global_data").select("veri").eq("anahtar", key).maybeSingle()
          : { data: null };

        const events = kisiselTakvimOlaylari(global?.veri ?? {}, personal);
        const icalEvents = events.map((olay) =>
          [
            "BEGIN:VEVENT",
            `UID:${esc(olay.key)}@itftakvim.xyz`,
            `DTSTAMP:${stamp(new Date())}`,
            `DTSTART;TZID=Europe/Istanbul:${local(olay.tarih, olay.baslangic)}`,
            `DTEND;TZID=Europe/Istanbul:${local(olay.tarih, olay.bitis)}`,
            `SUMMARY:${esc(olay.baslik)}`,
            olay.yer ? `LOCATION:${esc(olay.yer)}` : "",
            olay.aciklama ? `DESCRIPTION:${esc(olay.aciklama)}` : "",
            "END:VEVENT",
          ].filter(Boolean).join("\r\n"),
        );

        const ics = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//ITF Takvim//TR",
          "X-WR-CALNAME:İTF Takvim",
          "CALSCALE:GREGORIAN",
          ...icalEvents,
          "END:VCALENDAR",
          "",
        ].join("\r\n");
        return new Response(ics, {
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "cache-control": "no-store",
            "content-disposition": "inline; filename=itf-takvim.ics",
          },
        });
      },
    },
  },
});
