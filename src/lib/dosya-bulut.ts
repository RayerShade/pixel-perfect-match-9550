import { supabase } from "@/integrations/supabase/client";

export type KisiselTur = "yillik" | "uygulama" | "ogrenci";
const KOVA = "ogrenci-dosyalari";

/** Orijinal Excel dosyasını buluta kaydeder: {userId}/{tur}/{dosyaAdi} (eski dosya silinir). */
export async function dosyaBulutaKaydet(userId: string, tur: KisiselTur, f: File) {
  await dosyaGuvenli(f);
  await dosyaBuluttanSil(userId, tur);
  const ad = f.name.replace(/[^\w.\-]+/g, "_");
  const { error } = await supabase.storage.from(KOVA).upload(`${userId}/${tur}/${ad}`, f, { upsert: true, contentType: "application/octet-stream" });
  if (error) console.error("Dosya buluta kaydedilemedi", error);
}

export async function dosyaBuluttanSil(userId: string, tur: KisiselTur) {
  const { data } = await supabase.storage.from(KOVA).list(`${userId}/${tur}`);
  if (data?.length) await supabase.storage.from(KOVA).remove(data.map((d) => `${userId}/${tur}/${d.name}`));
}

/** Kaydedilmiş dosyayı indirir (admin veya sahibi). */
export async function dosyaIndir(userId: string, tur: KisiselTur): Promise<boolean> {
  const { data } = await supabase.storage.from(KOVA).list(`${userId}/${tur}`);
  const d = data?.[0];
  if (!d) return yedektenIndir(userId, tur);
  const { data: url } = await supabase.storage.from(KOVA).createSignedUrl(`${userId}/${tur}/${d.name}`, 60, { download: d.name });
  if (!url) return false;
  window.location.href = url.signedUrl;
  return true;
}

const ALAN: Record<KisiselTur, [string, string]> = {
  yillik: ["dersler", "yillikDosya"],
  uygulama: ["uygulamalar", "uygulamaDosya"],
  ogrenci: ["ogrenciler", "ogrenciDosya"],
};

/** Orijinali yoksa hesapta kayıtlı verilerden Excel oluşturur. */
async function yedektenIndir(userId: string, tur: KisiselTur): Promise<boolean> {
  const [alan, adAlan] = ALAN[tur];
  const { data } = await supabase.from("user_data").select("veri").eq("user_id", userId).maybeSingle();
  const v = (data?.veri ?? {}) as Record<string, unknown>;
  const ham = v[alan];
  if (!ham) return false;
  const satirlar = (Array.isArray(ham) ? ham : Object.entries(ham as Record<string, object>).map(([no, o]) => ({ no, ...o }))).map(
    (r) => Object.fromEntries(Object.entries(r as Record<string, unknown>).map(([k, x]) => [k, typeof x === "object" && x !== null ? JSON.stringify(x) : x])),
  );
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(satirlar), "Veri");
  const ad = String(v[adAlan] ?? tur).replace(/\.(xlsx|xls|csv)$/i, "");
  XLSX.writeFile(wb, `${ad} (kayıtlı veri).xlsx`);
  return true;
}

const EN_BUYUK = 10 * 1024 * 1024;

/** Yalnızca gerçek Excel/CSV dosyalarını kabul eder; uzantı, boyut ve dosya imzası (ilk baytlar) kontrol edilir. */
export async function dosyaGuvenli(f: File) {
  const uz = f.name.toLowerCase().split(".").pop() ?? "";
  if (!["xlsx", "xls", "csv"].includes(uz)) throw new Error("Sadece .xlsx, .xls veya .csv dosyası yüklenebilir.");
  if (f.size === 0) throw new Error("Dosya boş.");
  if (f.size > EN_BUYUK) throw new Error("Dosya 10 MB'tan büyük olamaz.");
  const b = new Uint8Array(await f.slice(0, 8).arrayBuffer());
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  const ok =
    uz === "xlsx" ? hex.startsWith("504b0304") :
    uz === "xls" ? hex.startsWith("d0cf11e0a1b11ae1") :
    !b.some((x) => x === 0);
  if (!ok) throw new Error("Bu dosya gerçek bir Excel dosyası değil, yüklenmedi.");
}
