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

/** Ders notunun ilk parçası "HÜCRE DİLİMİ / ANATOMİ AD. - ..." → dilim + ana dal. */
export function dilimDal(d: Ders): { dilim: string; dal: string } {
  const bolum = (d.notes.split(" · ")[0] ?? "").trim();
  const i = bolum.indexOf("/");
  if (i >= 0) {
    const dilim = baslikYap(bolum.slice(0, i).replace(/\s*dilimi?\s*$/i, "")) || DIGER;
    const dalHam = bolum.slice(i + 1).split(/\s+-\s+|\s*-\s*(?=[A-ZÇĞİÖŞÜ]{3})/)[0] ?? "";
    const dal = baslikYap(dalHam.replace(/\s*-\s*$/, "")) || "Genel";
    return { dilim: /^dikey koridor/i.test(dilim) ? "Dikey Koridor" : dilim, dal };
  }
  if (/dilim/i.test(bolum) && bolum.length < 60) return { dilim: baslikYap(bolum.replace(/\s*dilimi?\s*$/i, "")), dal: "Genel" };
  return { dilim: DIGER, dal: "Genel" };
}

export type OlayTuru = "ders" | "uygulama";

/** Bir takvim olayının ait olduğu dilim / ana dal ve devam türü. Sayılmayacaksa null. */
export function olayKategori(o: DersOlayi): { dilim: string; dal: string; tur: OlayTuru } | null {
  const d = o.ders;
  if (o.ozelId || d.courseType === "sinav") return null;
  if (/\(seçilmedi\)/.test(d.courseName)) return null;
  if (d.courseType === "secmeli" || d.electiveId || /seçmeli grubu/.test(d.notes))
    return { dilim: SECMELI_DILIM, dal: baslikYap(d.courseName), tur: "ders" };
  const tur: OlayTuru = d.courseType === "pratik" || d.courseType === "pbl" ? "uygulama" : "ders";
  const { dilim, dal } = dilimDal(d);
  if (onlineMi(o)) return { dilim: ONLINE_DILIM, dal, tur };
  if (tur === "uygulama") return { dilim, dal: baslikYap(d.courseName.replace(/\s*uygulaması$/i, "").replace(/\s*\(telafi\)$/i, "")), tur };
  return { dilim, dal, tur };
}
