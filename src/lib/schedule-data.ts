import { addDays, hashString, isoDate, startOfWeek } from "./date-utils";
import { hucreDili } from "./excel-import";

export type DersTuru = "teorik" | "pratik" | "pbl" | "secmeli" | "sinav";

export const DERS_TURU_ETIKET: Record<DersTuru, string> = {
  teorik: "Teorik Ders",
  pratik: "Laboratuvar / Pratik",
  pbl: "PDÖ Oturumu",
  secmeli: "Seçmeli Ders",
  sinav: "Sınav",
};

/** Fixed yearly schedule entry (repeats weekly across the semester). */
export interface Ders {
  id: string;
  courseName: string;
  instructor: string;
  courseType: DersTuru;
  dayOfWeek: number; // 1 = Pazartesi ... 7 = Pazar
  date?: string | undefined; // Excel'de belirli tarih varsa (YYYY-MM-DD)
  startTime: string;
  endTime: string;
  defaultClassroom: string;
  group: string;
  semester: string;
  notes: string;
  electiveId?: string;
}

export interface Secmeli {
  id: string;
  electiveName: string;
  instructor: string;
  courseCode: string;
  description: string;
  semester: string;
  quota: number;
}

export interface HaftalikAmfiKaydi {
  id: string;
  week: string; // monday iso
  date: string;
  startTime: string;
  endTime: string;
  courseName: string;
  group: string;
  classroom: string;
  amphitheater: string;
  sourceFile: string;
  status: "eslesti" | "bekliyor";
  confidence: number;
  manuallyConfirmed: boolean;
}

export const SECMELILER: Secmeli[] = [];

export const DERSLER: Ders[] = [];

/**
 * Sample "weekly amphitheater file" output. In the real app this comes from the
 * uploaded Excel file; here it is derived deterministically from the week key so
 * every week looks plausible and a few rows stay unmatched on purpose.
 */
export interface SecmeliOlay {
  ad: string;
  date: string;
  startTime: string;
  endTime: string;
  amfi: string;
}

export interface Ogrenci {
  no: string;
  ad: string;
  soyad: string;
  grup: string; // "A"
  altGrup: string; // "a1"
}

export interface UygulamaOlayi {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  ad: string;
  hoca: string;
  yer: string;
  dilim: string;
  gruplar: string[]; // "A", "D1" ...
}

/** Uygulama hücresindeki grup ("A" tüm grup, "D1" yalnızca d1 alt grubu) öğrenciye uyuyor mu? */
export const grubaUyar = (gruplar: string[], o: Ogrenci) =>
  gruplar.some((g) => g[0] === o.grup && (g.length === 1 || o.altGrup.toUpperCase() === g));

export function ogrenciBul(
  veri: YuklenenVeri | undefined,
  no: string,
  elle?: { grup: string; altGrup: string } | null,
): Ogrenci | undefined {
  const k = no.replace(/\D/g, "");
  const tablo = veri?.ogrenciler ?? {};
  const kk = k.replace(/^0+/, "");
  const o = k
    ? (tablo[k] ?? tablo[kk] ?? Object.entries(tablo).find(([n]) => n.replace(/^0+/, "") === kk)?.[1])
    : undefined;
  if (!elle?.grup) return o;
  return { no: k, ad: "", soyad: "", ...o, grup: elle.grup, altGrup: elle.altGrup };
}

const YIL_ESLEK = /20\d{2}\s*[-–/]\s*20\d{2}/;

export interface DosyaBilgisi {
  yillikDosya?: string | null | undefined;
  secmeliDosya?: string | null | undefined;
  uygulamaDosya?: string | null | undefined;
  ogrenciDosya?: string | null | undefined;
  amfiDosyalari?: string[] | null | undefined;
}

/** Dönem bilgisi: yüklenen yıllık programdaki "Dönem" sütunu + dosya adlarındaki eğitim yılı/dönem. */
export function donemBilgisi(veri: (YuklenenVeri & DosyaBilgisi) | undefined): string {
  const sayac = new Map<string, number>();
  (veri?.dersler ?? []).forEach((d) => {
    const s = (d.semester ?? "").replace(/\s+/g, " ").trim();
    if (s) sayac.set(s, (sayac.get(s) ?? 0) + 1);
  });
  const donem = [...sayac].sort((a, b) => b[1]! - a[1]!)[0]?.[0] ?? "";
  const adlar = [
    veri?.yillikDosya,
    veri?.secmeliDosya,
    veri?.uygulamaDosya,
    veri?.ogrenciDosya,
    ...(veri?.amfiDosyalari ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const yil = adlar.match(YIL_ESLEK)?.[0]?.replace(/\s+/g, "") ?? "";
  const terim = /g[üu]z/i.test(adlar) ? "Güz" : /bahar/i.test(adlar) ? "Bahar" : "";
  const bas = [yil, terim].filter(Boolean).join(" ");
  if (bas && donem) return `${bas} — ${donem}`;
  return bas || donem;
}

export interface YuklenenVeri {
  ogrenciler?: Record<string, Ogrenci> | null | undefined;
  uygulamalar?: UygulamaOlayi[] | null | undefined;
  dersler: Ders[] | null;
  amfi: HaftalikAmfiKaydi[] | null;
  secmeliOlaylari?: SecmeliOlay[] | null | undefined;
  /** Hafta (pazartesi iso) → o haftanın amfi programındaki amfi/derslik adları */
  amfiAdlari?: Record<string, string[]> | null | undefined;
  /** Genel seçmeli ders amfi programı (öncelikli kaynak) */
  genelSecmeliler?: GenelSecmeli[] | null | undefined;
}

export interface GenelSecmeli {
  ad: string;
  hoca: string;
  saat: string;
  amfi: string;
  bilgi: string;
  tarihler: string[];
}

const VARSAYILAN_AMFILER: string[] = [];

/** Eşleşme bekleyen dersler için amfi seçenekleri: önce o haftanın dosyası, yoksa tüm yüklenen haftalar. */
export function amfiSecenekleri(veri: YuklenenVeri | undefined, mondayIso: string): string[] {
  const adlar = veri?.amfiAdlari;
  if (adlar?.[mondayIso]?.length) return adlar[mondayIso]!;
  const hepsi = new Set<string>(Object.values(adlar ?? {}).flat());
  (veri?.amfi ?? []).forEach((k) => k.amphitheater && hepsi.add(k.amphitheater));
  return hepsi.size ? [...hepsi].sort((a, b) => a.localeCompare(b, "tr")) : VARSAYILAN_AMFILER;
}

export interface SecmeliGrupDersi {
  id: string;
  ad: string;
  grup: number;
  amfi: string;
  saat: string;
  hoca?: string;
  bilgi?: string;
}

const SECMELI_SLOT = /^se[çc]meli ders/i;
const trBaslik = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("tr-TR"));

/** Yıllık programdaki "Seçmeli Dersler - N" saatleri → grup saatleri (1., 2., 3. seçmeli). */
export function secmeliSaatleri(veri?: YuklenenVeri): string[] {
  const set = new Set(
    (veri?.dersler ?? []).filter((d) => SECMELI_SLOT.test(d.courseName)).map((d) => d.startTime),
  );
  const l = [...set].sort();
  return l.length ? l : ["13:30", "14:20", "15:10"];
}

const secAnahtar = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]+/g, "");
const secId = (grup: number, ad: string) =>
  `g${grup}-${ad.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]+/g, "-")}`;

export function secmeliVeriVar(veri?: YuklenenVeri) {
  return Boolean(veri?.genelSecmeliler?.length || veri?.secmeliOlaylari?.length);
}

/** Seçmeli listesi: önce genel seçmeli programı, eksikler haftalık amfi dosyalarından tamamlanır. */
export function secmeliGruplari(veri?: YuklenenVeri): SecmeliGrupDersi[] {
  const saatler = secmeliSaatleri(veri);
  const map = new Map<string, SecmeliGrupDersi>();
  for (const g of veri?.genelSecmeliler ?? []) {
    const grup = saatler.indexOf(g.saat) + 1;
    if (!grup) continue;
    const ad = trBaslik(g.ad);
    const id = secId(grup, ad);
    map.set(id, { id, ad, grup, amfi: g.amfi, saat: g.saat, hoca: g.hoca, bilgi: g.bilgi });
  }
  // İsimler yalnızca genel seçmeli listesinden; haftalık amfi dosyası yalnız konum için kullanılır.
  // Konum iki kaynakta farklıysa haftalık amfi programındaki tercih edilir.
  for (const o of veri?.secmeliOlaylari ?? []) {
    const grup = saatler.indexOf(o.startTime) + 1;
    if (!grup) continue;
    const var_ = [...map.values()].find(
      (m) => m.grup === grup && secAnahtar(m.ad) === secAnahtar(trBaslik(o.ad)),
    );
    if (var_ && o.amfi && o.amfi !== var_.amfi) var_.amfi = o.amfi;
  }
  return [...map.values()].sort((a, b) => a.grup - b.grup || a.ad.localeCompare(b.ad, "tr"));
}

const ONEMSIZ = new Set(["dönem", "türkçe", "ingilizce", "dilimi", "dilim", "oturum", "ders", "dersi", "grubu"]);
const kelimeler = (s: string) =>
  new Set(
    s
      .toLocaleLowerCase("tr-TR")
      .split(/[^a-zçğıöşü]+/)
      .filter((w) => w.length >= 4 && !ONEMSIZ.has(w)),
  );
const dk = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const kesisir = (d: Ders, k: HaftalikAmfiKaydi) =>
  dk(d.startTime) < dk(k.endTime || k.startTime) + (k.endTime ? 0 : 1) && dk(k.startTime) < dk(d.endTime);
/** Yıllık programdaki ders ile amfi kaydı arasındaki isim benzerliği (0..1). */
function benzerlik(d: Ders, k: HaftalikAmfiKaydi) {
  const a = kelimeler(`${d.courseName} ${d.notes} ${d.instructor}`);
  const b = kelimeler(k.courseName);
  if (!b.size) return 0;
  let ortak = 0;
  b.forEach((w) => {
    if ([...a].some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))) ortak++;
  });
  return ortak / b.size;
}
/** İngilizce program mı? Ders adlarında Türkçe harf neredeyse hiç yoksa İngilizce kabul edilir. */
const ingCache = new WeakMap<object, boolean>();
export function ingilizceProgram(veri?: YuklenenVeri): boolean {
  const l = veri?.dersler;
  if (!l?.length) return false;
  if (ingCache.has(l)) return ingCache.get(l)!;
  // Hoca adları (" / Prof. Dr. İlhan …") Türkçe harf içerebilir: yalnız ders adına bak,
  // ve İngilizce/Türkçe sık kelimeleri karşılaştır.
  let en = 0, tr = 0;
  for (const d of l) {
    const ad = d.courseName.split(" /")[0]!.toLocaleLowerCase("tr-TR");
    if (/\b(the|and|of|to|in|for|with|introduction|what|is|health|laboratory|skills|disease|lecture)\b/.test(ad)) en++;
    if (/\b(ve|ile|giriş|nedir|için|uygulama|sağlık|hastalık|ders|dersi)\b/.test(ad) || /[çğışöü]/.test(ad)) tr++;
  }
  const r = en > tr;
  ingCache.set(l, r);
  return r;
}
/** Amfi kayıtlarından programın diline ait olanlar ("DÖNEM 1 İNGİLİZCE" satırları İngilizce programa). */
function dilKayitlari(kayitlar: HaftalikAmfiKaydi[], ing: boolean) {
  return kayitlar.filter((k) => {
    // Kutuda hem Türkçe hem İngilizce yazıyorsa (entegre oturum) iki programa da ait
    const dil = k.group === "TR+EN" ? "TR+EN" : (hucreDili(k.courseName) ?? k.group);
    if (dil === "TR+EN") return true;
    return (dil === "EN") === ing;
  });
}
const ortusme = (d: Ders, k: HaftalikAmfiKaydi) =>
  Math.min(dk(d.endTime), dk(k.endTime || k.startTime) + 1) - Math.max(dk(d.startTime), dk(k.startTime));
function enIyiKayit(d: Ders, tarih: string, kayitlar: HaftalikAmfiKaydi[], ing = false) {
  const aday = kayitlar.filter((k) => k.date === tarih && kesisir(d, k));
  let en: HaftalikAmfiKaydi | undefined;
  let skor = -Infinity;
  for (const k of aday) {
    // İngilizce programda amfi dosyasındaki adlar Türkçe: yalnız saate göre eşle.
    const s = ing ? ortusme(d, k) : benzerlik(d, k);
    if (s > skor) {
      skor = s;
      en = k;
    }
  }
  return en ? { kayit: en, skor: ing ? 1 : skor } : undefined;
}

export function aktifDersler(veri?: YuklenenVeri): Ders[] {
  return (veri?.dersler ?? DERSLER)
    // Eski yüklemelerde kayıtlı kalmış mola satırlarını da anında temizle.
    .filter((d) => !/^(lunch(?: break)?|free(?: study)? time|break)(?:\b|\s|$)/i.test(d.courseName.trim()))
    .map((d) => {
      const ad = normalizeTr(d.courseName);
      // "Uygulama Alanları" gibi ders adları uygulama değildir. Türkçede yalnız
      // doğrudan UYGULAMA, İngilizcede LABORATORY SKILLS uygulama kabul edilir.
      if (d.courseType === "pratik" && ad !== "uygulama" && !/^laboratory skills\b/i.test(ad) && !/\bpratik\b/i.test(ad))
        return { ...d, courseType: "teorik" as const };
      return d;
    });
}

const telafiMi = (d: Ders) => /\btelafi\b|\brepeat\b|\bmake[ -]?up\b/i.test(`${d.courseName} ${d.notes}`);

/** İngilizce yıllık programdaki "(Uygulama adı) İ1" parçalarından öğrencininkini seçer. */
function ingilizceLaboratuvariniSec(d: Ders, ogrenci?: Ogrenci): Ders | null {
  if (!/^laboratory skills\b/i.test(d.courseName.trim()) || !ogrenci) return d;
  const hedef = `${ogrenci.altGrup || ogrenci.grup}`.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/[^i0-9]/g, "");
  if (!hedef) return d;
  const eslesmeler = [...d.courseName.matchAll(/\(([^)]+)\)\s*[İIıi]\s*(\d+)/g)];
  if (!eslesmeler.length) return d;
  const secilen = eslesmeler.find((m) => `i${m[2]}` === hedef);
  if (!secilen) return null;
  const telafi = telafiMi(d);
  return {
    ...d,
    courseName: `${secilen[1]!.trim()}${telafi ? " (Telafi)" : ""}`,
    group: hedef.toLocaleUpperCase("tr-TR"),
    notes: [d.notes, `Laboratory Skills · Grup ${hedef.toLocaleUpperCase("tr-TR")}`].filter(Boolean).join(" · "),
  };
}

export function haftalikAmfiKayitlari(mondayIso: string, veri?: YuklenenVeri): HaftalikAmfiKaydi[] {
  if (veri?.amfi || veri?.dersler) {
    const dersler = aktifDersler(veri);
    const ing = ingilizceProgram(veri);
    return dilKayitlari(veri.amfi ?? [], ing)
      .filter((k) => k.week === mondayIso)
      .map((k) => {
        const dow = ((new Date(`${k.date}T00:00:00`).getDay() + 6) % 7) + 1;
        const ayni = dersler.filter(
          (d) => (d.date ? d.date === k.date : d.dayOfWeek === dow) && kesisir(d, k),
        );
        const skor = ing ? 1 : Math.max(0, ...ayni.map((d) => benzerlik(d, k)));
        const confidence = ayni.length ? 0.6 + 0.4 * skor : 0.3;
        return {
          ...k,
          confidence,
          status: k.amphitheater && ayni.length ? ("eslesti" as const) : ("bekliyor" as const),
        };
      })
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }
  return [];
}

export interface DersOlayi {
  key: string;
  ders: Ders;
  date: Date;
  amfi: string | null; // null => eşleşme bekliyor
  group: string;
  /** Amfi bilgisinin kaynağı */
  kaynak?: "haftalik" | "yillik" | "manuel";
  online?: boolean;
  /** Öğrencinin kendi eklediği dersin kimliği */
  ozelId?: string;
  /** Her hafta aynı ders için değişiklik anahtarı */
  hepAnahtar?: string;
  duzenlendi?: boolean;
}

export const onlineMi = (o: DersOlayi) =>
  /online|çevrim ?içi|uzaktan/i.test(`${o.amfi ?? ""} ${o.ders.defaultClassroom}`);

export type OnlineGorunum = "goster" | "gizle" | "cakismayan";

/** Online dersleri ayara göre filtreler. "cakismayan": başka bir yüz yüze dersle çakışıyorsa gizle. */
export function onlineFiltrele(
  olaylar: DersOlayi[],
  genel: OnlineGorunum,
  dersBazli: Record<string, OnlineGorunum> = {},
): DersOlayi[] {
  const yuzyuze = olaylar.filter((o) => !onlineMi(o));
  return olaylar.filter((o) => {
    if (!onlineMi(o)) return true;
    const mod = dersBazli[o.ders.courseName] ?? genel;
    if (mod === "goster") return true;
    if (mod === "gizle") return false;
    const t = o.date.getTime();
    return !yuzyuze.some(
      (y) =>
        y.date.getTime() === t &&
        dk(y.ders.startTime) < dk(o.ders.endTime) &&
        dk(o.ders.startTime) < dk(y.ders.endTime),
    );
  });
}

export function haftaninOlaylari(
  monday: Date,
  seciliSecmeliler: string[],
  manuelAmfiler: Record<string, string>,
  veri?: YuklenenVeri,
  ogrenci?: Ogrenci,
  gizliGruplar: number[] = [],
  telafiGoster = true,
): DersOlayi[] {
  const mondayIso = isoDate(monday);
  const uyg = ogrenci && veri?.uygulamalar?.length ? veri.uygulamalar : null;
  // Uygulama tablosunda kayıt olan tüm günlerde genel "UYGULAMA" satırı gizlenir (eski davranış)
  const uygTarihleri = new Set(uyg?.map((u) => u.date));
  const pazar = isoDate(addDays(monday, 6));
  const kayitlar = haftalikAmfiKayitlari(mondayIso, veri);
  const tarihOf = (d: Ders) => d.date ?? isoDate(addDays(monday, d.dayOfWeek - 1));
  const ing = ingilizceProgram(veri);
  const bul = (d: Ders) => enIyiKayit(d, tarihOf(d), kayitlar, ing)?.kayit;
  const gruplar = secmeliVeriVar(veri) ? secmeliGruplari(veri) : null;
  const saatler = gruplar ? secmeliSaatleri(veri) : [];

  const uygOlaylari: DersOlayi[] = (uyg ?? [])
    .filter((u) => u.date >= mondayIso && u.date <= pazar && !!ogrenci && grubaUyar(u.gruplar, ogrenci))
    .map((u) => {
      const key = `${mondayIso}-${u.id}`;
      const amfiyeBak = !u.yer || /amfi program/i.test(normalizeTr(u.yer));
      const d: Ders = {
        id: u.id,
        courseName: `${u.ad} Uygulaması`,
        instructor: u.hoca,
        courseType: /pd[oö]/i.test(u.ad) ? "pbl" : "pratik",
        dayOfWeek: ((new Date(`${u.date}T00:00:00`).getDay() + 6) % 7) + 1,
        date: u.date,
        startTime: u.startTime,
        endTime: u.endTime,
        defaultClassroom: amfiyeBak ? "" : u.yer,
        group: u.gruplar.join(", "),
        semester: "",
        notes: [u.dilim, `Grup: ${u.gruplar.join(", ")}`].filter(Boolean).join(" · "),
      };
      const kayit = amfiyeBak ? enIyiKayit(d, u.date, kayitlar, ing) : undefined;
      return {
        key,
        ders: d,
        date: new Date(`${u.date}T00:00:00`),
        amfi: manuelAmfiler[key] ?? (amfiyeBak ? (kayit?.kayit.amphitheater || null) : u.yer),
        group: d.group,
        kaynak: manuelAmfiler[key] ? "manuel" : amfiyeBak ? "haftalik" : "yillik",
      };
    });

  const yillikDersler = aktifDersler(veri)
    .map((d) => ingilizceLaboratuvariniSec(d, ogrenci))
    .filter((d): d is Ders => d !== null)
    .filter((d) => telafiGoster || !telafiMi(d));

  return [...yillikDersler.filter(
    (d) =>
      (!d.electiveId || seciliSecmeliler.includes(d.electiveId)) &&
      (!d.date || (d.date >= mondayIso && d.date <= pazar)) &&
      // Uygulama tablosu olan günlerde genel "UYGULAMA" satırı yerine öğrencinin kendi uygulaması gösterilir
      !(uyg && d.date && uygTarihleri.has(d.date) && normalizeTr(d.courseName) === "uygulama"),
  ).map((d): DersOlayi | null => {
    const key = `${mondayIso}-${d.id}`;
    if (gruplar && SECMELI_SLOT.test(d.courseName)) {
      const grup = saatler.indexOf(d.startTime) + 1;
      // Gizlenen seçmeli grubu takvimde hiç görünmez
      if (gizliGruplar.includes(grup)) return null;
      const sec = gruplar.find((g) => g.grup === grup && seciliSecmeliler.includes(g.id));
      const t = tarihOf(d);
      const buHafta = sec
        ? veri?.secmeliOlaylari?.find((o) => o.date === t && secAnahtar(trBaslik(o.ad)) === secAnahtar(sec.ad))
        : undefined;
      const genel = sec ? veri?.genelSecmeliler?.find((g) => secAnahtar(trBaslik(g.ad)) === secAnahtar(sec.ad)) : undefined;
      const haftaVerisiVar = veri?.secmeliOlaylari?.some((o) => o.date === t);
      // Seçilen dersin bu hafta dersi yoksa takvime ekleme (genel programda tarih işaretliyse ona bak)
      if (sec && genel?.tarihler.length ? !genel.tarihler.includes(t) : sec && !genel && haftaVerisiVar && !buHafta) return null;
      const secAmfi = sec ? sec.amfi || buHafta?.amfi || "" : "";
      return {
        key,
        ders: {
          ...d,
          courseName: sec ? sec.ad : `${grup}. Seçmeli (seçilmedi)`,
          instructor: sec?.hoca || d.instructor,
          defaultClassroom: sec ? secAmfi : "Seçmeliler sayfasından seç",
          notes: `${grup}. seçmeli grubu${d.notes ? ` · ${d.notes}` : ""}`,
        },
        date: new Date(`${t}T00:00:00`),
        amfi: manuelAmfiler[key] ?? (sec ? secAmfi || null : "Seçmeliler sayfasından seç"),
        group: d.group,
        kaynak: manuelAmfiler[key] ? "manuel" : "haftalik",
      };
    }
    const kayit = bul(d);
    const manuel = manuelAmfiler[key];
    let amfi: string | null;
    let kaynak: DersOlayi["kaynak"] = "yillik";
    if (manuel) {
      amfi = manuel;
      kaynak = "manuel";
    } else if (d.courseType === "secmeli" && d.electiveId) amfi = d.defaultClassroom || null;
    else if (kayit) {
      amfi = kayit.status === "eslesti" ? kayit.amphitheater : null;
      kaynak = "haftalik";
    } else amfi = d.defaultClassroom || null;

    return {
      key,
      ders: d,
      date: new Date(`${tarihOf(d)}T00:00:00`),
      amfi,
      group: d.group,
      kaynak,
    };
  }).filter((o): o is DersOlayi => o !== null), ...uygOlaylari.filter((o) => telafiGoster || !telafiMi(o.ders))];
}

const normalizeTr = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

export function ayinOlaylari(
  ayIcindeBirGun: Date,
  seciliSecmeliler: string[],
  manuelAmfiler: Record<string, string>,
  veri?: YuklenenVeri,
  ogrenci?: Ogrenci,
  gizliGruplar: number[] = [],
  telafiGoster = true,
): DersOlayi[] {
  const ilk = new Date(ayIcindeBirGun.getFullYear(), ayIcindeBirGun.getMonth(), 1);
  const son = new Date(ayIcindeBirGun.getFullYear(), ayIcindeBirGun.getMonth() + 1, 0);
  const olaylar: DersOlayi[] = [];
  let hafta = startOfWeek(ilk);
  while (hafta <= son) {
    olaylar.push(...haftaninOlaylari(hafta, seciliSecmeliler, manuelAmfiler, veri, ogrenci, gizliGruplar, telafiGoster));
    hafta = addDays(hafta, 7);
  }
  return olaylar;
}

/** Yıllık programdaki online derslerin adları (ders bazlı ayar için). */
export function onlineDersAdlari(veri?: YuklenenVeri): string[] {
  const set = new Set(
    aktifDersler(veri)
      .filter((d) => /online|çevrim ?içi|uzaktan/i.test(d.defaultClassroom))
      .map((d) => d.courseName),
  );
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}
