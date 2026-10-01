import type { Ders, DersTuru, HaftalikAmfiKaydi, SecmeliOlay } from "./schedule-data";
import { addDays, isoDate, startOfWeek } from "./date-utils";

export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ALANLAR: Record<string, string[]> = {
  ders: ["ders", "ders adi", "dersin adi", "konu", "course", "ders konu", "subject"],
  hoca: ["ogretim uyesi", "ogretim elemani", "hoca", "egitici", "instructor", "sorumlu"],
  tur: ["tur", "ders turu", "tip", "type"],
  gun: ["gun", "day"],
  tarih: ["tarih", "date", "start date"],
  saat: ["saat", "zaman", "time"],
  baslangic: ["baslangic", "baslama", "baslangic saati", "start", "start time"],
  bitis: ["bitis", "bitis saati", "end", "end time"],
  grup: ["grup", "sube", "group"],
  amfi: ["amfi", "derslik", "sinif", "salon", "yer", "mekan", "classroom", "amfi derslik", "location"],
  not: ["not", "notlar", "aciklama", "notes", "description"],
  bolum: ["dilim adi anabilim dali", "dilim", "anabilim dali", "bolum"],
  donem: ["donem", "donem no", "donem adi"],
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

export function tarihNorm(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) return isoDate(new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12));
  if (typeof v === "number" && v > 20000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const m = String(v ?? "").match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const iso = String(v ?? "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return turkceTarih(String(v ?? ""));
}

const AYLAR_N = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];

/** "28 EYLÜL 2026 / Pazartesi" → 2026-09-28 */
export function turkceTarih(t: string): string {
  const m = normalize(t).match(/^(\d{1,2}) ([a-z]+) (\d{4})/);
  if (!m) return "";
  const ay = AYLAR_N.indexOf(m[2]!);
  if (ay < 0) return "";
  return `${m[3]}-${String(ay + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

function gunNorm(v: unknown): number {
  const kelimeler = normalize(String(v ?? "")).split(" ");
  for (const g of ["cumartesi", ...GUNLER]) {
    if (kelimeler.some((k) => k === g || (k.length >= 3 && g.startsWith(k) && k === kelimeler[0])))
      return GUNLER.indexOf(g) + 1;
  }
  return 0;
}

function turNorm(v: unknown, ad: string): DersTuru {
  const n = normalize(`${v ?? ""} ${ad}`);
  const adN = normalize(ad);
  if (/sinav|kurul deg|degerlendirme/.test(n)) return "sinav";
  if (/pdo|pbl|probleme dayali/.test(n)) return "pbl";
  if (/secmeli/.test(n)) return "secmeli";
  // Yıllık programda yalnızca açık uygulama satırları pratiktir. Örneğin
  // "Uygulama Alanları" bir ders adı olabilir ve uygulama sayılmamalıdır.
  if (/^laboratory skills\b/.test(adN) || adN === "uygulama" || /\bpratik\b/.test(n)) return "pratik";
  return "teorik";
}

type Satir = Record<string, unknown>;

async function satirlariOku(file: File): Promise<Satir[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
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

const ATLA = /^(ogle( yemegi)? arasi|serbest calisma|ogle yemegi|lunch(?: break)?|free(?: study)? time|break)(?:\b|\s|$)/;

function yerCoz(yer: string): { sinif: string; tur?: DersTuru } {
  const n = normalize(yer);
  if (!n) return { sinif: "" };
  if (n.includes("secmeli")) return { sinif: "Seçmeli amfi programı", tur: "secmeli" };
  if (n.includes("uygulama programina")) return { sinif: "Uygulama programı", tur: "pratik" };
  if (n.includes("amfi programina")) return { sinif: "" }; // haftalık amfi dosyasından gelecek
  if (n === "online") return { sinif: "Online" };
  return { sinif: yer.trim() };
}

export async function yillikProgramOku(file: File): Promise<Ders[]> {
  const satirlar = await satirlariOku(file);
  const dersler: Ders[] = [];
  satirlar.forEach((s, i) => {
    const [bas, bit] = saatler(s);
    if (!bas) return;
    const konu = String(s["ders"]).replace(/\s+/g, " ").trim();
    if (ATLA.test(normalize(konu))) return;
    const tarih = tarihNorm(s["tarih"]);
    const gun = tarih
      ? ((new Date(`${tarih}T00:00:00`).getDay() + 6) % 7) + 1
      : gunNorm(s["gun"]) || gunNorm(s["tarih"]);
    if (!gun) return;
    // "1-Konu / Dr. X (Dr. Y)" → ad + öğretim üyesi
    let ad = konu;
    let hoca = String(s["hoca"] ?? "").trim();
    const bol = konu.indexOf(" / ");
    if (!hoca && bol > 0) {
      ad = konu.slice(0, bol).trim();
      hoca = konu.slice(bol + 3).replace(/^\/\s*/, "").trim();
    }
    ad = ad.replace(/^\d+\s*-\s*/, "");
    const bolum = String(s["bolum"] ?? "").replace(/\s+/g, " ").trim();
    const yer = yerCoz(String(s["amfi"] ?? ""));
    const notlar = [bolum, String(s["not"] ?? "").trim()].filter(Boolean).join(" · ");
    dersler.push({
      id: `x-${i}`,
      courseName: ad,
      instructor: hoca,
      courseType: yer.tur ?? turNorm(s["tur"], `${ad} ${bolum}`),
      dayOfWeek: gun,
      date: tarih || undefined,
      startTime: bas,
      endTime: bitisTahmin(bas, bit),
      defaultClassroom: yer.sinif,
      group: String(s["grup"] ?? "").trim(),
      semester: String(s["donem"] ?? "").replace(/\s+/g, " ").trim(),
      notes: notlar,
    });
  });
  return dersler;
}

/** Hücre metnini sadeleştir: küçük harf, Türkçe karakterler düz, harf-rakam ayrık, tek boşluk. */
const ayir = (s: string) =>
  normalize(s)
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2");
/** Hücrede "dönem 1" geçiyor mu? Yazım biçimi önemsiz: dönem 1, dönem-1, dönem I, 1. dönem, d1, class 1, term 1, year 1, med 1, phase 1. */
const DONEM1_N = /(^|[^a-z0-9])(donem ?(1|i)|1 ?donem|d ?1|class ?(1|i)|term ?(1|i)|year ?(1|i)|med ?1|phase ?(1|i))(?![a-z0-9])/;
/** Hücrede "ingilizce" geçiyor mu? ingilizce, ing, eng, english, en, ingl. */
const INGILIZCE_N = /(^|[^a-z])(ingilizce|ing|eng|english|en|ingl)(?![a-z])/;
/** Hücrede "türkçe" geçiyor mu? turkce, tr, turkish. */
const TURKCE_N = /(^|[^a-z])(turkce|tr|turkish)(?![a-z])/;
/**
 * Kural basit: kutunun içinde "dönem 1" + "ingilizce" (veya eşdeğerleri) varsa İngilizce programına,
 * "dönem 1" + "türkçe" varsa Türkçe programına aittir. İkisinin de yeri/yazımı önemsiz.
 * Dönem 1 yazıp dil belirtilmemişse Türkçe sayılır.
 */
const hucreDili = (hucre: string): "EN" | "TR" | null => {
  const n = ayir(hucre);
  if (!DONEM1_N.test(n)) return null;
  if (INGILIZCE_N.test(n)) return "EN";
  return "TR";
};

/** Fakülte amfi programı: her gün için "tarih" satırı, "SAAT" + amfi adları başlığı, saat satırları. */
async function amfiIzgarasiOku(
  file: File,
  secmeliler: SecmeliOlay[],
  amfiAdlari: Record<string, string[]>,
): Promise<HaftalikAmfiKaydi[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const kayitlar: HaftalikAmfiKaydi[] = [];
  const gorulen = new Set<string>();
  for (const sayfa of wb.SheetNames) {
    const ws = wb.Sheets[sayfa]!;
    if (!ws["!ref"]) continue;
    const r = XLSX.utils.decode_range(ws["!ref"]);
    const grid: string[][] = [];
    for (let y = 0; y <= r.e.r; y++) {
      const row: string[] = [];
      for (let x = 0; x <= r.e.c; x++) {
        const c = ws[XLSX.utils.encode_cell({ r: y, c: x })];
        row.push(c ? String(c.w ?? c.v ?? "").trim() : "");
      }
      grid.push(row);
    }
    for (const m of ws["!merges"] ?? []) {
      const v = grid[m.s.r]?.[m.s.c] ?? "";
      for (let y = m.s.r; y <= m.e.r; y++)
        for (let x = m.s.c; x <= m.e.c; x++) if (grid[y]) grid[y]![x] = v;
    }
    let tarih = "";
    let amfiler: string[] = [];
    for (const row of grid) {
      const a = row[0] ?? "";
      const t = turkceTarih(a);
      if (t) {
        tarih = t;
        amfiler = [];
        continue;
      }
      if (normalize(a) === "saat") {
        amfiler = row.map((h) => h.replace(/\s+/g, " ").trim());
        if (tarih) {
          const hafta = isoDate(startOfWeek(new Date(`${tarih}T00:00:00`)));
          const set = new Set(amfiAdlari[hafta] ?? []);
          amfiler.slice(1).forEach((a) => a && normalize(a) !== "saat" && set.add(a));
          amfiAdlari[hafta] = [...set];
        }
        continue;
      }
      if (!tarih || !amfiler.length) continue;
      const [sb, se] = saatAraligi(a);
      if (!sb) continue;
      row.forEach((hucre, x) => {
        if (x === 0 || !hucre) return;
        const n = normalize(hucre);
        if (/^secmeli ?ders/.test(n)) {
          const ad = hucre.replace(/^\s*SE[ÇC]MEL[İI]\s*DERS\s*-?\s*/i, "").replace(/\s+/g, " ").trim();
          const key = `s|${tarih}|${sb}|${ad}`;
          if (ad && !gorulen.has(key)) {
            gorulen.add(key);
            secmeliler.push({ ad, date: tarih, startTime: sb, endTime: se, amfi: amfiler[x] || "" });
          }
          return;
        }
        const dil = hucreDili(hucre);
        if (!dil) return;
        if (/\btopl/.test(n)) return; // toplantı satırları öğrenci dersi değil
        const acik = saatAraligi(hucre.replace(/^[^-]*-/, ""));
        const bas = acik[1] ? acik[0] : sb;
        const bit = acik[1] ? acik[1] : se;
        const amfi = amfiler[x] || `Sütun ${x + 1}`;
        const key = `${tarih}|${sb}|${hucre}`;
        if (gorulen.has(key)) return;
        gorulen.add(key);
        kayitlar.push({
          id: `u-${tarih}-${sb}-${x}-${kayitlar.length}`,
          week: isoDate(startOfWeek(new Date(`${tarih}T00:00:00`))),
          date: tarih,
          startTime: sb < bas && acik[1] ? bas : sb,
          endTime: acik[1] && bit > se ? bit : se,
          courseName: hucre.replace(/\s+/g, " "),
          group: dil,
          classroom: amfi,
          amphitheater: amfi,
          sourceFile: file.name,
          status: "eslesti",
          confidence: 0,
          manuallyConfirmed: false,
        });
      });
    }
  }
  return kayitlar;
}

export async function haftalikAmfiOku(
  file: File,
): Promise<{
  kayitlar: HaftalikAmfiKaydi[];
  secmeliler: SecmeliOlay[];
  amfiAdlari: Record<string, string[]>;
}> {
  const secmeliler: SecmeliOlay[] = [];
  const amfiAdlari: Record<string, string[]> = {};
  const izgara = await amfiIzgarasiOku(file, secmeliler, amfiAdlari);
  if (izgara.length || secmeliler.length) {
    // Dosyada başka haftalara ait eski/ek sayfalar olabilir: yalnızca dosyanın asıl haftasını al
    const hafta = anaHafta(izgara.map((k) => k.week));
    if (!hafta) return { kayitlar: izgara, secmeliler, amfiAdlari };
    const sonu = isoDate(addDays(new Date(`${hafta}T00:00:00`), 6));
    return {
      kayitlar: izgara.filter((k) => k.week === hafta),
      secmeliler: secmeliler.filter((o) => o.date >= hafta && o.date <= sonu),
      amfiAdlari: amfiAdlari[hafta] ? { [hafta]: amfiAdlari[hafta]! } : {},
    };
  }
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
  const adlar: Record<string, string[]> = {};
  kayitlar.forEach((k) => {
    if (k.amphitheater) adlar[k.week] = [...new Set([...(adlar[k.week] ?? []), k.amphitheater])];
  });
  return { kayitlar, secmeliler, amfiAdlari: adlar };
}

/** En çok kayıt içeren hafta = dosyanın asıl haftası */
export function anaHafta(haftalar: string[]): string | undefined {
  const say = new Map<string, number>();
  haftalar.forEach((h) => say.set(h, (say.get(h) ?? 0) + 1));
  return [...say.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
