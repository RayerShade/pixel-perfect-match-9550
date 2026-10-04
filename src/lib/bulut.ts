import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { gecmisYaz } from "./gecmis";
import { PROGRAM_ALANLARI, programAnahtari, type Dil } from "./program";

export const ANAHTARLAR = {
  veri: "ders-takvim:yuklenen-veri",
  secmeliler: "ders-takvim:secmeliler",
  gizli: "ders-takvim:gizli-secmeliler",
  amfi: "ders-takvim:manuel-amfi",
  ayarlar: "ders-takvim:ayarlar",
} as const;

/** Herkes için ortak, sadece adminin yüklediği alanlar. */
export const GENEL_ALANLAR = {
  amfi: ["amfi", "secmeliOlaylari", "amfiAdlari", "amfiDosyalari"],
  secmeli: ["genelSecmeliler", "secmeliDosya"],
} as const;
const GENEL_HEPSI: string[] = [...GENEL_ALANLAR.amfi, ...GENEL_ALANLAR.secmeli, ...PROGRAM_ALANLARI];

export const BULUT_OLAY = "ders-takvim:bulut";

let yukleniyor = false;
let aktifKullanici: string | null = null;

const oku = (k: string, v: unknown) => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : v;
  } catch {
    return v;
  }
};
const sec = (o: Record<string, unknown>, alanlar: readonly string[], haric = false) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => alanlar.includes(k) !== haric));

export function yerelTemizle() {
  aktifKullanici = null;
  Object.values(ANAHTARLAR).forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event("ders-takvim:veri"));
  window.dispatchEvent(new Event(BULUT_OLAY));
}

/** Yüklenen öğrenci listesinden numaraya göre ad soyad bulur (liste yoksa boş döner). */
export function listedenOgrenciAdi(no: string): string {
  try {
    const veri = oku(ANAHTARLAR.veri, {}) as { ogrenciler?: Record<string, { ad?: string; soyad?: string }> };
    const k = no.replace(/\D/g, "").replace(/^0+/, "");
    const o = k ? veri.ogrenciler?.[k] : undefined;
    return o ? `${o.ad ?? ""} ${o.soyad ?? ""}`.trim() : "";
  } catch {
    return "";
  }
}

/** Giriş sonrası: hesabın verilerini ve ortak dosyaları cihaza indirir. */
export async function buluttanYukle(userId: string, ogrenciNo: string, meta: Record<string, unknown> = {}) {
  yukleniyor = true;
  let kaydet = false;
  try {
    const [{ data: kisisel }, { data: genel }] = await Promise.all([
      supabase.from("user_data").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("global_data").select("anahtar, veri"),
    ]);
    const ayar = { ...((kisisel?.ayarlar as Record<string, unknown>) ?? {}) };
    const gizli = (ayar["__gizli"] as string[]) ?? [];
    delete ayar["__gizli"];
    if (!ayar["ogrenciNo"] && ogrenciNo) ayar["ogrenciNo"] = ogrenciNo;
    // Dönem/dil: öğrenci numarası hangi dönemin öğrenci listesinde varsa oraya yerleştir.
    const noK = String(ayar["ogrenciNo"] ?? ogrenciNo ?? "").replace(/\D/g, "").replace(/^0+/, "");
    const eslesen = noK
      ? (genel ?? []).find((g) => g.anahtar.startsWith("program:") && (g.veri as { ogrenciler?: Record<string, unknown> })?.ogrenciler?.[noK])
      : undefined;
    if (eslesen) {
      const [, id, dil] = eslesen.anahtar.split(":");
      if (ayar["donemId"] !== id || ayar["dil"] !== dil) { ayar["donemId"] = id; ayar["dil"] = dil; kaydet = true; }
    } else {
      if (!ayar["donemId"] && meta["donem_id"]) { ayar["donemId"] = meta["donem_id"]; kaydet = true; }
      if (!ayar["dil"] && meta["dil"]) { ayar["dil"] = meta["dil"]; kaydet = true; }
    }
    const prog = ayar["donemId"] && ayar["dil"] ? programAnahtari(String(ayar["donemId"]), ayar["dil"] as Dil) : "";
    const veri: Record<string, unknown> = { dersler: null, amfi: null };
    for (const g of genel ?? []) {
      if (g.anahtar === "amfi" || g.anahtar === "secmeli" || g.anahtar === prog) Object.assign(veri, (g.veri as object) ?? {});
    }
    localStorage.setItem(ANAHTARLAR.veri, JSON.stringify(veri));
    localStorage.setItem(ANAHTARLAR.ayarlar, JSON.stringify(ayar));
    localStorage.setItem(ANAHTARLAR.secmeliler, JSON.stringify(kisisel?.secmeliler ?? []));
    localStorage.setItem(ANAHTARLAR.gizli, JSON.stringify(gizli));
    localStorage.setItem(ANAHTARLAR.amfi, JSON.stringify(kisisel?.manuel_amfi ?? {}));
    aktifKullanici = userId;
  } finally {
    yukleniyor = false;
  }
  if (kaydet) kisiselKaydet();
  window.dispatchEvent(new Event("ders-takvim:veri"));
  window.dispatchEvent(new Event(BULUT_OLAY));
}

/** Öğrencinin dönem/dil seçimi değişince o programı indirir. */
export async function programiYenile() {
  const ayar = oku(ANAHTARLAR.ayarlar, {}) as Record<string, unknown>;
  const veri = sec(oku(ANAHTARLAR.veri, {}), PROGRAM_ALANLARI, true);
  if (ayar["donemId"] && ayar["dil"]) {
    const { data } = await supabase
      .from("global_data")
      .select("veri")
      .eq("anahtar", programAnahtari(String(ayar["donemId"]), ayar["dil"] as Dil))
      .maybeSingle();
    Object.assign(veri, (data?.veri as object) ?? {});
  }
  if (!veri["dersler"]) veri["dersler"] = null;
  localStorage.setItem(ANAHTARLAR.veri, JSON.stringify(veri));
  window.dispatchEvent(new Event("ders-takvim:veri"));
}

const zaman: Record<string, ReturnType<typeof setTimeout>> = {};
function ertele(k: string, fn: () => Promise<void>) {
  clearTimeout(zaman[k]);
  zaman[k] = setTimeout(() => void fn().catch((e) => console.error("Buluta kaydedilemedi", e)), 500);
}

/** Öğrencinin kendi verilerini hesaba kaydeder. */
export function kisiselKaydet() {
  if (yukleniyor || !aktifKullanici) return;
  const uid = aktifKullanici;
  ertele("kisisel", async () => {
    const veri = sec(oku(ANAHTARLAR.veri, {}), GENEL_HEPSI, true);
    const ayarlar = { ...oku(ANAHTARLAR.ayarlar, {}), __gizli: oku(ANAHTARLAR.gizli, []) };
    const { error } = await supabase.from("user_data").upsert({
      user_id: uid,
      veri: veri as Json,
      ayarlar: ayarlar as Json,
      secmeliler: oku(ANAHTARLAR.secmeliler, []) as Json,
      manuel_amfi: oku(ANAHTARLAR.amfi, {}) as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    const no = String(ayarlar.ogrenciNo ?? "").trim();
    if (no) await supabase.from("profiles").update({ ogrenci_no: no }).eq("id", uid);
  });
}

/** Ortak dosyaları (amfi / seçmeli) kaydeder — veritabanı yalnızca admine izin verir. */
export function genelKaydet(anahtar: keyof typeof GENEL_ALANLAR) {
  if (yukleniyor || !aktifKullanici) return;
  const uid = aktifKullanici;
  ertele(`genel-${anahtar}`, async () => {
    const veri = sec(oku(ANAHTARLAR.veri, {}), GENEL_ALANLAR[anahtar]);
    const { error } = await supabase
      .from("global_data")
      .upsert({ anahtar, veri: veri as Json, updated_by: uid, updated_at: new Date().toISOString() });
    if (error) throw error;
    void gecmisYaz(anahtar === "amfi" ? "Amfi programı kaydedildi" : "Genel seçmeliler kaydedildi");
  });
}

export function degisenAlanlar(patch: object) {
  const k = Object.keys(patch);
  return {
    kisisel: k.some((a) => !GENEL_HEPSI.includes(a)),
    amfi: k.some((a) => (GENEL_ALANLAR.amfi as readonly string[]).includes(a)),
    secmeli: k.some((a) => (GENEL_ALANLAR.secmeli as readonly string[]).includes(a)),
  };
}

/** Ortak dosyalar (amfi, seçmeli, öğrencinin dönem programı) değişince yeniden indirir. */
export async function genelYenile() {
  const ayar = oku(ANAHTARLAR.ayarlar, {}) as Record<string, unknown>;
  const prog = ayar["donemId"] && ayar["dil"] ? programAnahtari(String(ayar["donemId"]), ayar["dil"] as Dil) : "";
  const { data } = await supabase.from("global_data").select("anahtar, veri").in("anahtar", ["amfi", "secmeli", prog].filter(Boolean));
  const veri: Record<string, unknown> = { ...sec(oku(ANAHTARLAR.veri, {}), GENEL_HEPSI, true), dersler: null, amfi: null };
  for (const g of data ?? []) Object.assign(veri, (g.veri as object) ?? {});
  localStorage.setItem(ANAHTARLAR.veri, JSON.stringify(veri));
  window.dispatchEvent(new Event("ders-takvim:veri"));
  window.dispatchEvent(new Event(BULUT_OLAY));
}
