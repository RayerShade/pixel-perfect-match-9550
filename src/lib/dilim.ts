import { onlineMi, type Ders, type DersOlayi } from "./schedule-data";

export const ONLINE_DILIM = "Online Dersler";
export const SECMELI_DILIM = "Seçmeli Dersler";
export const DIGER = "Diğer";
export const ENTEGRE_DAL = "Entegre Oturumlar";

export const baslikYap = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("tr-TR"))
    .replace(/\s+/g, " ")
    .trim();

/** Dilim adını listede yazdığı gibi al. "DOKU + HAREKET-1" gibi birleşik yazımlarda ilk dilim esas alınır. */
const dilimAdi = (s: string) => {
  const t = (s.split("+")[0] ?? s)
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*\d{1,2}\s*$/u, "")
    .trim()
    .toLocaleUpperCase("tr-TR");
  return /^dikey koridor/.test(t.toLocaleLowerCase("tr-TR")) ? "Dikey Koridor" : t;
};

/** Ders notunun ilk parçası "HÜCRE DİLİMİ / ANATOMİ AD. - ..." → dilim + ana dal. */
export function dilimDal(d: Ders): { dilim: string; dal: string } {
  if (d.dilim?.trim() || d.dal?.trim()) {
    const oto = dilimDal({ ...d, dilim: undefined, dal: undefined });
    return { dilim: d.dilim?.trim() ? dilimAdi(d.dilim) : oto.dilim, dal: d.dal?.replace(/[‐‑–—]/g, "-").replace(/\s*-\s*\d{1,2}\s*$/u, "").replace(/\s+/g, " ").trim() || oto.dal };
  }
  const bolum = (d.notes.split(" · ")[0] ?? "").trim();
  const i = bolum.indexOf("/");
  if (i >= 0) {
    const dilim = dilimAdi(bolum.slice(0, i)) || DIGER;
    const dalHam = bolum.slice(i + 1).split(/\s+-\s+|\s*-\s*(?=[A-ZÇĞİÖŞÜ]{3})/)[0] ?? "";
    const dal = dalHam.replace(/\s*-\s*$/, "").replace(/\s+/g, " ").trim() || "Genel";
    return { dilim, dal };
  }
  if (/dilim|koridor/.test(bolum.toLocaleLowerCase("tr-TR")) && bolum.length < 60) return { dilim: dilimAdi(bolum), dal: "Genel" };
  return { dilim: DIGER, dal: "Genel" };
}

export type OlayTuru = "ders" | "uygulama";
export interface Kategori {
  dilim: string;
  dal: string;
  tur: OlayTuru;
}

/** Ders / uygulama sayılmayan etkinlikler: tören, sınav, tatil, oryantasyon vb. */
const DERS_DEGIL =
  /t[öo]ren|a[çc][ıi]l[ıi][şs]|kapan[ıi][şs]|ceremony|opening|closing|s[ıi]nav|\bexam|quiz|komite|\bbayram|arefe|tatil|holiday|oryantasyon|orientation|mezuniyet|graduation|yemin|kutlama|(?:^|\s)anma(?:\s|$)|\bsemineri?\b.*(?:tan[ıi]t)|de[ğg]erlendirme|feedback|geri bildirim|toplanmas/i;

const katla = (s: string) =>
  s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Uygulama dal adı: "Anatomi Uygulama 12 / 21" → "Anatomi Uygulaması". */
function uygulamaAdi(ad: string) {
  // "LABORATORY SKILLS (HISTOLOGY AND EMBRYOLOGY 1) - i1" → "Histology And Embryology — Laboratory Skills"
  const lab = ad.match(/^laboratory skills\s*(?:repeat\s*)?\(([^)]+)\)/i);
  if (lab && !/telafi|repeat/i.test(lab[1]!)) return `${lab[1]!.replace(/\s*\d+\s*$/, "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} — Laboratory Skills`;
  let t = ad
    .replace(/\s*[İI]\s*\d+(\s*-\s*\d+)?\s*$/u, "")
    .replace(/\s*\+\s*telafi.*$/iu, "")
    .replace(/\s*-?\s*\btelafi\b.*$/iu, "")
    .replace(/\s*\(.*\)\s*$/u, "")
    .replace(/\s+\d+(\s*\/\s*\d+)?\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  t = t.replace(/^[^(]*\)\s*/u, (m) => (m.includes("(") ? m : m.replace(/\)\s*$/, " "))).replace(/\s*\($/, "").replace(/\)/g, (m, i, str) => (str.slice(0, i).includes("(") ? m : "")).trim();
  t = t.replace(/BIOCHEMISTY/i, "BIOCHEMISTRY");
  // Tamamı büyük harf İngilizce adlar ("BIOPHYSICS") → "Biophysics"
  if (/^[A-Z0-9 &\-—/().,]+$/.test(t) && /[A-Z]{3}/.test(t)) t = t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  const r = t.replace(/(uygulama)\s*$/iu, (m) => (m === m.toLocaleUpperCase("tr-TR") ? `${m}SI` : `${m}sı`));
  return /^uygulamas[ıi]$/iu.test(r) ? "Uygulama" : r;
}

/** Bir takvim olayının ait olduğu dilim / ana dal ve devam türü. Sayılmayacaksa null. (Ham ad, birleştirme yok.) */
export function olayKategori(o: DersOlayi): Kategori | null {
  const d = o.ders;
  if (o.ozelId || d.courseType === "sinav") return null;
  if (/\(seçilmedi\)/.test(d.courseName)) return null;
  // "Mikroskop Kullanma Beceri Uygulaması - Değerlendirme" gibi uygulamalar sayılır.
  const uygAdi = (d.courseType === "pratik" || d.courseType === "pbl") && /uygulama|laboratory|lab\b/i.test(d.courseName);
  if (DERS_DEGIL.test(uygAdi ? d.courseName.replace(/de[ğg]erlendirme|feedback/giu, "") : d.courseName)) return null;
  if (d.courseType === "secmeli" || d.electiveId || /seçmeli grubu/.test(d.notes))
    return { dilim: SECMELI_DILIM, dal: d.courseName.trim(), tur: "ders" };
  const tur: OlayTuru = d.courseType === "pratik" || d.courseType === "pbl" ? "uygulama" : "ders";
  const { dilim, dal } = dilimDal(d);
  if (onlineMi(o)) return { dilim: ONLINE_DILIM, dal: d.courseName.trim(), tur };
  if (tur === "uygulama" && !d.dal?.trim()) {
    if (/telafi|repeat|make[ -]?up/iu.test(d.courseName) && /^(uygulama|laboratory skills|telafi)/iu.test(d.courseName.trim()) || /— telafi$/i.test(d.courseName))
      return { dilim, dal: /laboratory|repeat/i.test(d.courseName) ? "Laboratory Skills — Telafi" : "Telafi uygulamaları", tur };
    if (/^laboratory skills$/i.test(d.courseName.trim()) && dal === "Genel") return { dilim, dal: "Laboratory Skills", tur };
    // Genel "UYGULAMA" satırı: ana dalı biliniyorsa "Tıbbi Biyoloji Uygulaması" gibi adlandır.
    if (/^uygulama\b/.test(katla(d.courseName.trim())) && dal !== "Genel")
      return { dilim, dal: `${baslikYap(dal.replace(/\s*(anabilim dal[ıi]|a\.?\s?d\.?)\s*$/iu, ""))} Uygulaması`, tur };
    return { dilim, dal: uygulamaAdi(d.courseName), tur };
  }
  if (tur === "ders" && !d.dal?.trim() && /^(entegre oturum|integrated session)/iu.test(d.courseName.trim()))
    return { dilim, dal: ENTEGRE_DAL, tur };
  return { dilim, dal, tur };
}

// ---------- Yazım farklarını birleştirme ----------

const kokDilim = (s: string) => katla(s).replace(/\bdilimi?\b/g, "").replace(/[^a-z0-9]/g, "");
const kokDal = (s: string) =>
  katla(s)
    .replace(/\banabilim dali\b|\ba\.?\s?d\.?\s*$/g, "")
    .replace(/\buygulamasi\b|\buygulama\b|\buygulamalari\b/g, "")
    .replace(/[^a-z0-9]/g, "");

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let onceki = p[0]!;
    p[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = p[j]!;
      p[j] = Math.min(p[j]! + 1, p[j - 1]! + 1, onceki + (a[i - 1] === b[j - 1] ? 0 : 1));
      onceki = t;
    }
  }
  return p[b.length]!;
}

function benzer(a: string, b: string, dilimMi: boolean) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (dilimMi) {
    const ra = a.replace(/\d+/g, ""), rb = b.replace(/\d+/g, "");
    const da = a.match(/\d+/g)?.join() ?? "", db = b.match(/\d+/g)?.join() ?? "";
    if (ra === rb && (!da || !db || da === db)) return true;
  }
  const [k, u] = a.length <= b.length ? [a, b] : [b, a];
  if (k.length >= 8 && u.startsWith(k) && k.length / u.length >= 0.85) return true;
  if (k.length >= 8 && lev(a, b) <= (k.length > 15 ? 2 : 1)) return true;
  return false;
}

/** Ad listesini yazım farkı olan gruplara ayırır → ham ad ⇒ ortak ad. */
export function adBirlestir(adlar: string[], dilimMi: boolean): Map<string, string> {
  const say = new Map<string, number>();
  for (const a of adlar) say.set(a, (say.get(a) ?? 0) + 1);
  const kok = dilimMi ? kokDilim : kokDal;
  const gruplar: { kok: string; uyeler: string[] }[] = [];
  for (const [a] of [...say].sort((x, y) => y[1] - x[1])) {
    const k = kok(a);
    const g = gruplar.find((g) => benzer(g.kok, k, dilimMi));
    if (g) g.uyeler.push(a);
    else gruplar.push({ kok: k, uyeler: [a] });
  }
  const out = new Map<string, string>();
  for (const g of gruplar) {
    const puan = (a: string) => (dilimMi && /dilim/i.test(katla(a)) ? 1e6 : 0) + (dilimMi && /\d/.test(a) ? 1e5 : 0) + (say.get(a) ?? 0) * 10 + a.length / 100;
    const en = [...g.uyeler].sort((x, y) => puan(y) - puan(x))[0]!;
    for (const a of g.uyeler) out.set(a, en);
  }
  return out;
}

const SABIT = new Set([ONLINE_DILIM, SECMELI_DILIM, DIGER, "Dikey Koridor"]);

/**
 * Tüm olayların kategorisini birlikte hesaplar: "HAREKET-1 DİLİMİ" ile "HAREKET DİLİMİ",
 * "YAŞAMIN MOLEKÜLER TEMELLERİ" ile "... DİLİMİ", "EMBİRİYOLOJİ" ile "EMBRİYOLOJİ" gibi yazım farkları tek başlıkta toplanır.
 * Notunda yalnız dilim adı yazan dersler ("CELL") de o dilime alınır.
 */
export function kategoriHaritasi(olaylar: DersOlayi[]): Map<string, Kategori | null> {
  const ham = new Map<string, Kategori | null>();
  for (const o of olaylar) ham.set(o.key, olayKategori(o));
  const dilimler = [...ham.values()].filter((k): k is Kategori => !!k && !SABIT.has(k.dilim)).map((k) => k.dilim);
  const dm = adBirlestir(dilimler, true);
  const bilinen = new Map<string, string>();
  for (const [a, c] of dm) bilinen.set(kokDilim(a), c);
  for (const o of olaylar) {
    const k = ham.get(o.key);
    if (!k) continue;
    if (!SABIT.has(k.dilim)) k.dilim = dm.get(k.dilim) ?? k.dilim;
    else if (k.dilim === DIGER) {
      const ip = kokDilim(dilimAdi((o.ders.notes.split(" · ")[0] ?? "").split("/")[0] ?? ""));
      const bul = [...bilinen].find(([kk]) => benzer(kk, ip, true));
      if (ip && bul) k.dilim = bul[1];
    }
  }
  // Dilimi bulunamayanlar: aynı gün (yoksa aynı hafta) en çok görülen dilime alınır.
  const gun = new Map<string, Map<string, number>>();
  const ekle = (k: string, d: string) => { const m = gun.get(k) ?? new Map(); m.set(d, (m.get(d) ?? 0) + 1); gun.set(k, m); };
  const haftaK = (o: DersOlayi) => { const t = new Date(o.date); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return `h${t.toDateString()}`; };
  for (const o of olaylar) {
    const k = ham.get(o.key);
    if (k && !SABIT.has(k.dilim)) { ekle(o.date.toDateString(), k.dilim); ekle(haftaK(o), k.dilim); }
  }
  const enCok = (m?: Map<string, number>) => (m ? [...m].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined);
  for (const o of olaylar) {
    const k = ham.get(o.key);
    if (k?.dilim !== DIGER) continue;
    const d = enCok(gun.get(o.date.toDateString())) ?? enCok(gun.get(haftaK(o)));
    if (d) k.dilim = d;
  }
  // Ana dallar: aynı dilim + tür içinde birleştir.
  const grup = new Map<string, Kategori[]>();
  for (const k of ham.values()) {
    if (!k || k.dilim === ONLINE_DILIM || k.dilim === SECMELI_DILIM) continue;
    const id = `${k.dilim}|${k.tur}`;
    grup.set(id, [...(grup.get(id) ?? []), k]);
  }
  for (const ks of grup.values()) {
    const m = adBirlestir(ks.map((k) => k.dal), false);
    for (const k of ks) k.dal = m.get(k.dal) ?? k.dal;
  }
  return ham;
}

/** Admin raporu: birleştirilen yazım farkları. */
export function yazimFarklari(adlar: string[], dilimMi: boolean): { ortak: string; varyantlar: string[] }[] {
  const m = adBirlestir(adlar.filter((a) => !SABIT.has(a)), dilimMi);
  const g = new Map<string, string[]>();
  for (const [a, c] of m) if (a !== c) g.set(c, [...(g.get(c) ?? []), a]);
  return [...g].map(([ortak, varyantlar]) => ({ ortak, varyantlar }));
}
