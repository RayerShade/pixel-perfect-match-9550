import { normalize, tarihNorm } from "./excel-import";
import type { GenelSecmeli } from "./schedule-data";

const metin = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * Genel seçmeli ders amfi programı: Dersin Adı | Öğretim Üyesi | tarih sütunları | Saati (birleşik) |
 * Amfisi | BİLGİ | Dönem1 Kontenjanı … Yalnızca Dönem 1'e açık Türkçe dersler alınır.
 */
export async function genelSecmeliOku(file: File): Promise<GenelSecmeli[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const out: GenelSecmeli[] = [];
  for (const sayfa of wb.SheetNames) {
    const ws = wb.Sheets[sayfa]!;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
    const bi = rows.findIndex((r) => r.some((c) => normalize(metin(c)).startsWith("dersin adi")));
    if (bi < 0) continue;
    const h = rows[bi]!;
    const col = (re: RegExp) => h.findIndex((c) => re.test(normalize(metin(c))));
    const cAd = col(/^dersin adi/);
    const cHoca = col(/ogretim/);
    const cSaat = col(/^saat/);
    const cAmfi = col(/amfi|derslik/);
    const cBilgi = col(/^bilgi/);
    const cD1 = col(/donem ?1/);
    const tarihSut = h.map((c, i) => [i, typeof c === "number" || c instanceof Date ? tarihNorm(c) : ""] as const).filter(([, t]) => t);
    let saat = "";
    for (const r of rows.slice(bi + 1)) {
      const ad = metin(r[cAd]);
      const hoca = cHoca >= 0 ? metin(r[cHoca]) : "";
      const s = [...metin(r[cSaat]).matchAll(/(\d{1,2})[.:](\d{2})/g)];
      if (s.length) saat = `${s[0]![1]!.padStart(2, "0")}:${s[0]![2]}`;
      // "İNGİLİZCE TIP" gibi tek başına başlık satırı: Türkçe bölüm bitti
      if (ad && !hoca && !metin(r[cAmfi])) break;
      if (!ad || !saat) continue;
      if (cD1 >= 0 && normalize(metin(r[cD1])) === "yok") continue;
      out.push({
        ad,
        hoca,
        saat,
        amfi: cAmfi >= 0 ? metin(r[cAmfi]) : "",
        bilgi: cBilgi >= 0 ? metin(r[cBilgi]) : "",
        tarihler: tarihSut.filter(([i]) => metin(r[i])).map(([, t]) => t),
      });
    }
  }
  return out;
}
