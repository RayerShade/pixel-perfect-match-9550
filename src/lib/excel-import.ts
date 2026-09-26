import type { Ders, DersTuru, HaftalikAmfiKaydi } from "./schedule-data";
import { isoDate, startOfWeek } from "./date-utils";

export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ALANLAR: Record<string, string[]> = {
  ders: ["ders", "ders adi", "dersin adi", "konu", "course", "ders konu"],
  hoca: ["ogretim uyesi", "ogretim elemani", "hoca", "egitici", "instructor", "sorumlu"],
  tur: ["tur", "ders turu", "tip", "type"],
  gun: ["gun", "day"],
  tarih: ["tarih", "date"],
  saat: ["saat", "zaman", "time"],
  baslangic: ["baslangic", "baslama", "baslangic saati", "start"],
  bitis: ["bitis", "bitis saati", "end"],
  grup: ["grup", "sube", "group"],
  amfi: ["amfi", "derslik", "sinif", "salon", "yer", "mekan", "classroom", "amfi derslik"],
  not: ["not", "notlar", "aciklama", "notes"],
};

const GUNLER = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];

function alanBul(baslik: string): string | null {
  const n = normalize(baslik);
  for (const [alan, esler] of Object.entries(ALANLAR)) if (esler.includes(n)) return alan;
  for (const [alan, esler] of Object.entries(ALANLAR))
    if (esler.some((e) => n.startsWith(e))) return alan;
  return null;
}

function saatNorm(v: unknown): string {
  if (v instanceof Date) return `${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}`;
  if (typeof v === "number" && v < 1) {
    const m = Math.round(v * 1440);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  const m = String(v ?? "").match(/(\d{1,2})[.:](\d{2})/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : "";
}

function saatAraligi(v: unknown): [string, string] {
  const all = [...String(v ?? "").matchAll(/(\d{1,2})[.:](\d{2})/g)];
  if (all.length >= 2)
    return [`${all[0]![1]!.padStart(2, "0")}:${all[0]![2]}`, `${all[1]![1]!.padStart(2, "0")}:${all[1]![2]}`];
  return [saatNorm(v), ""];
}

function tarihNorm(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) return isoDate(new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12));
  if (typeof v === "number" && v > 20000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const m = String(v ?? "").match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const iso = String(v ?? "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : "";
}

function gunNorm(v: unknown): number {
  const n = normalize(String(v ?? ""));
  const i = GUNLER.findIndex((g) => n.startsWith(g.slice(0, 3)));
  return i + 1;
}

function turNorm(v: unknown, ad: string): DersTuru {
  const n = normalize(`${v ?? ""} ${ad}`);
  if (/sinav|kurul deg|degerlendirme/.test(n)) return "sinav";
  if (/pdo|pbl|probleme dayali/.test(n)) return "pbl";
  if (/secmeli/.test(n)) return "secmeli";
  if (/lab|pratik|uygulama/.test(n)) return "pratik";
  return "teorik";
}

type Satir = Record<string, unknown>;

async function satirlariOku(file: File): Promise<Satir[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const out: Satir[] = [];
  for (const ad of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[ad]!, { header: 1, defval: "", raw: true });
    // başlık satırını bul: en az 2 bilinen alan içeren ilk satır
    const bi = rows.findIndex((r) => r.filter((c) => alanBul(String(c))).length >= 2);
    if (bi < 0) continue;
    const harita = rows[bi]!.map((c) => alanBul(String(c)));
    let sonTarih: unknown = "";
    let sonGun: unknown = "";
    for (const r of rows.slice(bi + 1)) {
      const s: Satir = {};
      harita.forEach((alan, i) => {
        if (alan && s[alan] === undefined) s[alan] = r[i];
      });
      // birleştirilmiş hücreler için tarih/gün devralma
      if (s["tarih"]) sonTarih = s["tarih"];
      else s["tarih"] = sonTarih;
      if (s["gun"]) sonGun = s["gun"];
      else s["gun"] = sonGun;
      if (String(s["ders"] ?? "").trim()) out.push(s);
    }
  }
  return out;
}

function saatler(s: Satir): [string, string] {
  if (s["baslangic"]) return [saatNorm(s["baslangic"]), saatNorm(s["bitis"])];
  return saatAraligi(s["saat"]);
}

function bitisTahmin(bas: string, bit: string) {
  if (bit) return bit;
  const [h, m] = bas.split(":").map(Number);
  const t = h! * 60 + m! + 50;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export async function yillikProgramOku(file: File): Promise<Ders[]> {
  const satirlar = await satirlariOku(file);
  const dersler: Ders[] = [];
  satirlar.forEach((s, i) => {
    const [bas, bit] = saatler(s);
    if (!bas) return;
    const ad = String(s["ders"]).trim();
    const tarih = tarihNorm(s["tarih"]);
    const gun = tarih ? ((new Date(`${tarih}T00:00:00`).getDay() + 6) % 7) + 1 : gunNorm(s["gun"]);
    if (!gun) return;
    dersler.push({
      id: `x-${i}`,
      courseName: ad,
      instructor: String(s["hoca"] ?? "").trim(),
      courseType: turNorm(s["tur"], ad),
      dayOfWeek: gun,
      date: tarih || undefined,
      startTime: bas,
      endTime: bitisTahmin(bas, bit),
      defaultClassroom: String(s["amfi"] ?? "").trim(),
      group: String(s["grup"] ?? "").trim(),
      semester: "",
      notes: String(s["not"] ?? "").trim(),
    });
  });
  return dersler;
}

export async function haftalikAmfiOku(file: File): Promise<HaftalikAmfiKaydi[]> {
  const satirlar = await satirlariOku(file);
  const kayitlar: HaftalikAmfiKaydi[] = [];
  satirlar.forEach((s, i) => {
    const [bas, bit] = saatler(s);
    const tarih = tarihNorm(s["tarih"]);
    if (!bas || !tarih) return;
    const amfi = String(s["amfi"] ?? "").trim();
    kayitlar.push({
      id: `u-${tarih}-${bas}-${i}`,
      week: isoDate(startOfWeek(new Date(`${tarih}T00:00:00`))),
      date: tarih,
      startTime: bas,
      endTime: bit,
      courseName: String(s["ders"]).trim(),
      group: String(s["grup"] ?? "").trim(),
      classroom: amfi,
      amphitheater: amfi,
      sourceFile: file.name,
      status: amfi ? "eslesti" : "bekliyor",
      confidence: 0,
      manuallyConfirmed: false,
    });
  });
  return kayitlar;
}
