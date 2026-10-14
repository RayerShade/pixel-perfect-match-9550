import { normalize, tarihNorm } from "./excel-import";
import { programMetniDuzelt, programVerisiniTemizle, type Ogrenci, type UygulamaOlayi } from "./schedule-data";

async function satirlar(file: File): Promise<unknown[][]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const out: unknown[][] = [];
  for (const ad of wb.SheetNames) {
    const ws = wb.Sheets[ad]!;
    if (!ws["!ref"]) continue;
    const aralik = XLSX.utils.decode_range(ws["!ref"]);
    const grid: unknown[][] = [];
    for (let y = 0; y <= aralik.e.r; y++) {
      const satir: unknown[] = [];
      for (let x = 0; x <= aralik.e.c; x++) satir.push(ws[XLSX.utils.encode_cell({ r: y, c: x })]?.v ?? "");
      grid.push(satir);
    }
    // Excel'deki birleştirilmiş başlıklar/saat-tarih hücreleri boş satırlara taşınır.
    for (const merge of ws["!merges"] ?? []) {
      const deger = grid[merge.s.r]?.[merge.s.c] ?? "";
      for (let y = merge.s.r; y <= merge.e.r; y++)
        for (let x = merge.s.c; x <= merge.e.c; x++) if (grid[y]) grid[y]![x] = deger;
    }
    out.push(...grid, []);
  }
  return out;
}

const metin = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Öğrenci listesi: Grup | Alt Grup | Öğrenci No | Ad | Soyad (grup hücreleri birleştirilmiş olabilir). */
export async function ogrenciListesiOku(file: File): Promise<Record<string, Ogrenci>> {
  const rows = await satirlar(file);
  const out: Record<string, Ogrenci> = {};
  let grup = "";
  let alt = "";
  for (const r of rows) {
    const no = metin(r[2]).replace(/\D/g, "");
    const g = metin(r[0]).toLocaleUpperCase("tr-TR");
    const a = metin(r[1]).toLocaleLowerCase("tr-TR");
    if (/^[A-ZÇĞİÖŞÜ]\d?$/.test(g)) grup = g;
    if (/^[a-zçğıöşü]\d$/.test(a)) alt = a;
    if (no.length < 6 || !grup) continue;
    out[no.replace(/^0+/, "")] = {
      no,
      ad: metin(r[3]),
      soyad: metin(r[4]),
      grup,
      altGrup: /\d/.test(grup) || alt.startsWith(grup.toLocaleLowerCase("tr-TR")) ? alt : "",
    };
  }
  return out;
}

const saatCifti = (v: unknown): [string, string] => {
  const m = [...metin(v).matchAll(/(\d{1,2})[.:](\d{2})/g)];
  const f = (x?: RegExpMatchArray) => (x ? `${x[1]!.padStart(2, "0")}:${x[2]}` : "");
  return [f(m[0]), f(m[1])];
};

/** Uygulama tablosu: dilim başlıkları altında "Uygulama Tarihi | Saat | <uygulama sütunları>" ızgaraları. */
export async function uygulamaTablosuOku(file: File): Promise<UygulamaOlayi[]> {
  const rows = await satirlar(file);
  // Salon bilgileri: "Ad : Yer" satırları ve "Uygulama adı | Uygulama Yeri" tablosu
  const yerler: [string, string][] = [];
  let tablo = false;
  for (const r of rows) {
    const a = metin(r[0]);
    if (/uygulama tarihi/i.test(normalize(a))) break;
    if (/^uygulama adi$/.test(normalize(a))) {
      tablo = true;
      continue;
    }
    if (tablo && a && metin(r[2])) {
      yerler.push([a.replace(/^\d+\)\s*/, ""), metin(r[2])]);
      continue;
    }
    const i = a.indexOf(":");
    if (i > 0 && !a.endsWith(":")) yerler.push([a.slice(0, i).trim(), a.slice(i + 1).trim()]);
  }
  const GENEL = new Set(["temel", "tibbi", "genel", "beceri", "uygulamasi", "uygulama"]);
  const kel = (x: string) => normalize(x).split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENEL.has(w));
  const yerBul = (ad: string) => {
    const a = kel(ad);
    let en = "";
    let skor = 0;
    for (const [k, v] of yerler) {
      const kw = kel(k);
      const ortak = kw.filter((w) => a.some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))).length;
      const s2 = kw.length ? ortak / kw.length + ortak : 0;
      if (ortak && s2 > skor) {
        skor = s2;
        en = v;
      }
    }
    // "Prof.Dr. X (Kütüphane Salon 1)" → yalnızca salon
    const m = en.match(/^(?:prof|do[çc]|dr)[^(]*\((.*?)\)?\s*$/i);
    return (m ? m[1]! : en).replace(/^\(|\)$/g, "").trim();
  };

  const out: UygulamaOlayi[] = [];
  let sutunlar: { i: number; ad: string; hoca: string }[] | null = null;
  let dilim = "";
  let sonTarih: string | null | undefined = null;
  rows.forEach((r, ri) => {
    const a = metin(r[0]);
    const n = normalize(a);
    if (/uygulama.*tarihi|tarihi.*uygulama/.test(n)) {
      let ust = rows[ri - 1] ?? [];
      // Başlıkla tablo arasında boş satır varsa en yakın dolu dilim başlığını bul.
      for (let j = ri - 1; j >= 0 && !metin(ust[0]); j--) ust = rows[j - 1] ?? [];
      dilim = programMetniDuzelt(metin(ust[0]));
      sutunlar = [];
      sonTarih = null;
      for (let i = 2; i < r.length; i++) {
        let h = metin(r[i]);
        if (!h || /^saat/i.test(normalize(h))) continue;
        const p = h.match(/\(([^)]*)\)/);
        let ad = h.replace(/\([^)]*\)/g, "").trim();
        if (!ad) ad = metin(ust[i]).replace(/\([^)]*\)/g, "").trim();
        if (!ad) continue;
        sutunlar.push({ i, ad, hoca: p?.[1]?.trim() ?? "" });
      }
      return;
    }
    if (!sutunlar) return;
    if (/uygulama sayisi|not:|konu/.test(n)) {
      if (/uygulama sayisi/.test(n)) sutunlar = null;
      return;
    }
    const [bas, bit] = saatCifti(r[1]);
    // Birleştirilmiş tarih hücresi: aynı günün 2. saat satırında tarih sütunu boş gelir → önceki tarihi kullan
    const tarih = a ? tarihNorm(r[0]) : sonTarih;
    if (a) sonTarih = tarih;
    if (!tarih || !bas || tarih < "2025-01-01") return;
    for (const s of sutunlar) {
      const g = metin(r[s.i]).toLocaleUpperCase("tr-TR").replace(/\s+/g, "");
      // Hücre yalnız grup kodlarından oluşmalı (A, D1, EF, "A - B"); açıklama metinlerindeki harfler grup sayılmaz.
      if (!/^[A-ZÇĞİÖŞÜ\d,;\/+&-]*$/.test(g)) continue;
      const gruplar = [...g.matchAll(/([A-ZÇĞİÖŞÜ])(\d{0,2})/g)].map((m) => `${m[1]}${m[2] ?? ""}`);
      if (!gruplar.length) continue;
      out.push({
        id: `uy-${tarih}-${bas}-${s.i}-${ri}`,
        date: tarih,
        startTime: bas,
        endTime: bit || bas,
        ad: s.ad,
        hoca: s.hoca,
        yer: yerBul(s.ad),
        dilim,
        gruplar,
      });
    }
  });
  return programVerisiniTemizle({ uygulamalar: out }).uygulamalar ?? [];
}
