import { supabase } from "@/integrations/supabase/client";

export type KisiselTur = "yillik" | "uygulama" | "ogrenci";
const KOVA = "ogrenci-dosyalari";

/** Orijinal Excel dosyasını buluta kaydeder: {userId}/{tur}/{dosyaAdi} (eski dosya silinir). */
export async function dosyaBulutaKaydet(userId: string, tur: KisiselTur, f: File) {
  await dosyaBuluttanSil(userId, tur);
  const ad = f.name.replace(/[^\w.\-]+/g, "_");
  const { error } = await supabase.storage.from(KOVA).upload(`${userId}/${tur}/${ad}`, f, { upsert: true });
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
