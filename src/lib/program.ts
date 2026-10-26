import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { gecmisYaz } from "./gecmis";
import type { Ders, Ogrenci, UygulamaOlayi } from "./schedule-data";

export type Dil = "tr" | "en";
export const DIL_ETIKET: Record<Dil, string> = { tr: "Türkçe", en: "İngilizce" };

export interface Donem {
  id: string;
  ad: string;
}

/** Dönem + dil için adminin yüklediği program dosyaları. */
export interface ProgramVerisi {
  dersler?: Ders[] | null;
  yillikDosya?: string | undefined;
  uygulamalar?: UygulamaOlayi[] | null;
  uygulamaDosya?: string | undefined;
  ogrenciler?: Record<string, Ogrenci> | null;
  ogrenciDosya?: string | undefined;
}

export const PROGRAM_ALANLARI = ["dersler", "yillikDosya", "uygulamalar", "uygulamaDosya", "ogrenciler", "ogrenciDosya"];
export const programAnahtari = (donemId: string, dil: Dil) => `program:${donemId}:${dil}`;
export const taslakProgramAnahtari = (donemId: string, dil: Dil) => `program-taslak:${donemId}:${dil}`;

export async function donemleriGetir(): Promise<Donem[]> {
  const { data } = await supabase.from("global_data").select("veri").eq("anahtar", "donemler").maybeSingle();
  return ((data?.veri as { liste?: Donem[] } | null)?.liste ?? []) as Donem[];
}

export async function donemleriKaydet(liste: Donem[]) {
  const { error } = await supabase
    .from("global_data")
    .upsert({ anahtar: "donemler", veri: { liste } as unknown as Json, updated_at: new Date().toISOString() });
  if (error) throw error;
  void gecmisYaz("Dönem listesi güncellendi", liste.map((d) => d.ad).join(", "));
}

export async function programGetir(donemId: string, dil: Dil): Promise<ProgramVerisi> {
  const { data } = await supabase.from("global_data").select("veri").eq("anahtar", programAnahtari(donemId, dil)).maybeSingle();
  return ((data?.veri as ProgramVerisi | null) ?? {}) as ProgramVerisi;
}

export async function programKaydet(donemId: string, dil: Dil, veri: ProgramVerisi) {
  const { error } = await supabase.from("global_data").upsert({
    anahtar: programAnahtari(donemId, dil),
    veri: veri as unknown as Json,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  void gecmisYaz(`Program kaydedildi (${dil.toUpperCase()})`, `${programAnahtari(donemId, dil)} · ${veri.dersler?.length ?? 0} ders · ${veri.uygulamalar?.length ?? 0} uygulama · ${Object.keys(veri.ogrenciler ?? {}).length} öğrenci`);
}

/** Ortak taslak, yayınlanan programa dokunmadan yöneticilerin kontrol etmesi içindir. */
export async function programTaslagiGetir(donemId: string, dil: Dil): Promise<ProgramVerisi | null> {
  const { data } = await supabase.from("global_data").select("veri").eq("anahtar", taslakProgramAnahtari(donemId, dil)).maybeSingle();
  return (data?.veri as ProgramVerisi | null) ?? null;
}

export async function programTaslagiKaydet(donemId: string, dil: Dil, veri: ProgramVerisi) {
  const { error } = await supabase.from("global_data").upsert({ anahtar: taslakProgramAnahtari(donemId, dil), veri: veri as unknown as Json, updated_at: new Date().toISOString() });
  if (error) throw error;
  void gecmisYaz(`Program taslağı kaydedildi (${dil.toUpperCase()})`, `${veri.dersler?.length ?? 0} ders · ${veri.uygulamalar?.length ?? 0} uygulama`);
}

export async function programTaslagiSil(donemId: string, dil: Dil) {
  const { error } = await supabase.from("global_data").delete().eq("anahtar", taslakProgramAnahtari(donemId, dil));
  if (error) throw error;
  void gecmisYaz(`Program taslağı silindi (${dil.toUpperCase()})`, programAnahtari(donemId, dil));
}

export async function donemSil(donemId: string, liste: Donem[]) {
  await donemleriKaydet(liste.filter((d) => d.id !== donemId));
  await supabase.from("global_data").delete().in("anahtar", [programAnahtari(donemId, "tr"), programAnahtari(donemId, "en")]);
  void gecmisYaz("Dönem silindi", liste.find((d) => d.id === donemId)?.ad ?? donemId);
}
