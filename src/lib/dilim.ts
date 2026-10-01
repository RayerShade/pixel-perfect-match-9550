import { onlineMi, type Ders, type DersOlayi } from "./schedule-data";

export const ONLINE_DILIM = "Online Dersler";
export const SECMELI_DILIM = "Seçmeli Dersler";
export const DIGER = "Diğer";

export const baslikYap = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("tr-TR"))
    .replace(/\s+/g, " ")
    .trim();

/** Dilim adını listede yazdığı gibi al (sadece boşlukları düzelt, "Dilimi" eki dahil). */
const dilimAdi = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
  return /^dikey koridor/.test(t.toLocaleLowerCase("tr-TR")) ? "Dikey Koridor" : t;
};

/** Ders notunun ilk parçası "HÜCRE DİLİMİ / ANATOMİ AD. - ..." → dilim + ana dal. */
export function dilimDal(d: Ders): { dilim: string; dal: string } {
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

/** Ders / uygulama sayılmayan etkinlikler: tören, sınav, tatil, oryantasyon vb. */
const DERS_DEGIL =
  /t[öo]ren|a[çc][ıi]l[ıi][şs]|kapan[ıi][şs]|ceremony|opening|closing|s[ıi]nav|\bexam|quiz|komite|\bbayram|tatil|holiday|oryantasyon|orientation|mezuniyet|graduation|yemin|kutlama|anma|\bsemineri?\b.*(?:tan[ıi]t)|de[ğg]erlendirme|feedback|geri bildirim/i;

/** Bir takvim olayının ait olduğu dilim / ana dal ve devam türü. Sayılmayacaksa null. */
export function olayKategori(o: DersOlayi): { dilim: string; dal: string; tur: OlayTuru } | null {
  const d = o.ders;
  if (o.ozelId || d.courseType === "sinav") return null;
  if (/\(seçilmedi\)/.test(d.courseName)) return null;
  if (DERS_DEGIL.test(d.courseName)) return null;
  // Seçmeliler tek bölüm; her seçmeli kendi devamıyla ayrı.
  if (d.courseType === "secmeli" || d.electiveId || /seçmeli grubu/.test(d.notes))
    return { dilim: SECMELI_DILIM, dal: d.courseName.trim(), tur: "ders" };
  const tur: OlayTuru = d.courseType === "pratik" || d.courseType === "pbl" ? "uygulama" : "ders";
  const { dilim, dal } = dilimDal(d);
  // Online dersler tek bölüm; her dersin devamı ayrı.
  if (onlineMi(o)) return { dilim: ONLINE_DILIM, dal: d.courseName.trim(), tur };
  // Uygulamalar dilimlerinin altında, listedeki adıyla (örn. "Anatomi Uygulaması").
  if (tur === "uygulama") return { dilim, dal: d.courseName.replace(/\s*\((telafi|repeat)\)$/i, "").trim(), tur };
  return { dilim, dal, tur };
}
