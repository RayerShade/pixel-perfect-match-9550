import type { DersOlayi } from "@/lib/schedule-data";

const satir = (metin: string) => metin.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (tarih: Date) => tarih.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const baslangic = (tarih: Date, saat: string) => {
  const [h = 0, m = 0] = saat.split(":").map(Number);
  return new Date(tarih.getFullYear(), tarih.getMonth(), tarih.getDate(), h, m);
};

/** Görünen kişisel programı Apple/Google Calendar'a aktarılabilen ICS dosyası olarak indirir. */
export function programIcsIndir({ olaylar, dosyaAdi, takvimAdi = "İTF Ders Programı" }: { olaylar: DersOlayi[]; dosyaAdi: string; takvimAdi?: string }) {
  const benzersiz = [...new Map(olaylar.map((o) => [o.key, o])).values()];
  const etkinlikler = benzersiz.map((o) => {
    const bas = baslangic(o.date, o.ders.startTime);
    const bit = baslangic(o.date, o.ders.endTime);
    const yer = o.amfi ?? o.ders.defaultClassroom ?? "";
    return ["BEGIN:VEVENT", `UID:${satir(o.key)}@itftakvim.xyz`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(bas)}`, `DTEND:${utc(bit)}`, `SUMMARY:${satir(o.ders.courseName)}`, yer ? `LOCATION:${satir(yer)}` : "", o.ders.instructor ? `DESCRIPTION:${satir(`Öğretim elemanı: ${o.ders.instructor}`)}` : "", "END:VEVENT"].filter(Boolean).join("\r\n");
  });
  const metin = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//İTF Takvim//TR", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${satir(takvimAdi)}`, ...etkinlikler, "END:VCALENDAR", ""].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([metin], { type: "text/calendar;charset=utf-8" }));
  a.download = dosyaAdi.endsWith(".ics") ? dosyaAdi : `${dosyaAdi}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
};