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
  if (!d) return false;
  const { data: url } = await supabase.storage.from(KOVA).createSignedUrl(`${userId}/${tur}/${d.name}`, 60, { download: d.name });
  if (!url) return false;
  window.location.href = url.signedUrl;
  return true;
}
