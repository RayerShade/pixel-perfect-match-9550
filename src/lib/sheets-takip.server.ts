import { createHash } from "node:crypto";
import { exportUrl } from "./sheets-url";
import { haftalikAmfiOku, yillikProgramOku } from "./excel-import";
import { ogrenciListesiOku, uygulamaTablosuOku } from "./uygulama-import";
import { genelSecmeliOku } from "./secmeli-import";
import { amfiArsivBirlestir, grubaUyar, type SecmeliOlay, type Ders, type HaftalikAmfiKaydi, type Ogrenci, type UygulamaOlayi } from "./schedule-data";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
type Tur = "yillik" | "uygulama" | "ogrenci" | "amfi" | "secmeli";
interface Kaynak {
  id: string;
  anahtar: string;
  tur: Tur;
  url: string;
  son_hash: string | null;
}
type Veri = Record<string, unknown>;

const bugun = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // İstanbul
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const trTarih = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y?.slice(2)}`;
};

async function indir(url: string): Promise<File> {
  const hedef = exportUrl(url);
  if (!hedef) throw new Error("Geçersiz bağlantı");
  const r = await fetch(hedef, { redirect: "follow" });
  if (!r.ok || (r.headers.get("content-type") ?? "").includes("text/html"))
    throw new Error("Dosya açılamadı (paylaşım kapalı ya da silinmiş olabilir)");
  return new File([await r.arrayBuffer()], "google-sheets.xlsx");
}

interface Degisim {
  metin: string;
  gruplar?: string[]; // uygulama için hedef gruplar
}

function dersFarki(eski: Ders[], yeni: Ders[]): Degisim[] {
  const b = bugun();
  const k = (d: Ders) => `${d.courseName}|${d.date ?? d.dayOfWeek}|${d.group}`;
  const v = (d: Ders) => `${d.startTime}-${d.endTime}|${d.defaultClassroom}`;
  const em = new Map(eski.filter((d) => !d.date || d.date >= b).map((d) => [k(d), d]));
  const ym = new Map(yeni.filter((d) => !d.date || d.date >= b).map((d) => [k(d), d]));
  const out: Degisim[] = [];
  const ne = (d: Ders) => `${d.courseName}${d.date ? ` (${trTarih(d.date)})` : ""}`;
  for (const [key, y] of ym) {
    const e = em.get(key);
    if (!e) out.push({ metin: `Yeni: ${ne(y)} ${y.startTime}` });
    else if (v(e) !== v(y)) {
      const p: string[] = [];
      if (e.startTime !== y.startTime || e.endTime !== y.endTime) p.push(`${e.startTime} → ${y.startTime}`);
      if (e.defaultClassroom !== y.defaultClassroom) p.push(`yer: ${y.defaultClassroom || "—"}`);
      out.push({ metin: `${ne(y)}: ${p.join(", ")}` });
    }
  }
  for (const [key, e] of em) if (!ym.has(key)) out.push({ metin: `Kaldırıldı: ${ne(e)} ${e.startTime}` });
  return out;
}

function uygulamaFarki(eski: UygulamaOlayi[], yeni: UygulamaOlayi[]): Degisim[] {
  const b = bugun();
  const k = (u: UygulamaOlayi) => `${u.ad}|${u.date}|${[...u.gruplar].sort().join(",")}`;
  const v = (u: UygulamaOlayi) => `${u.startTime}-${u.endTime}|${u.yer}`;
  const em = new Map(eski.filter((u) => u.date >= b).map((u) => [k(u), u]));
  const ym = new Map(yeni.filter((u) => u.date >= b).map((u) => [k(u), u]));
  const out: Degisim[] = [];
  for (const [key, y] of ym) {
    const e = em.get(key);
    if (!e) out.push({ metin: `Yeni uygulama: ${y.ad} (${trTarih(y.date)} ${y.startTime})`, gruplar: y.gruplar });
    else if (v(e) !== v(y)) out.push({ metin: `${y.ad} (${trTarih(y.date)}): ${e.startTime} → ${y.startTime}${e.yer !== y.yer ? `, yer: ${y.yer || "—"}` : ""}`, gruplar: y.gruplar });
  }
  for (const [key, e] of em) if (!ym.has(key)) out.push({ metin: `Kaldırıldı: ${e.ad} uygulaması (${trTarih(e.date)})`, gruplar: e.gruplar });
  return out;
}

function amfiFarki(eski: HaftalikAmfiKaydi[], yeni: HaftalikAmfiKaydi[]): Degisim[] {
  const b = bugun();
  const k = (a: HaftalikAmfiKaydi) => `${a.date}|${a.startTime}|${a.courseName}`;
  const em = new Map(eski.filter((a) => a.date >= b).map((a) => [k(a), a]));
  const out: Degisim[] = [];
  for (const y of yeni) {
    if (y.date < b) continue;
    const e = em.get(k(y));
    if (e && e.amphitheater !== y.amphitheater)
      out.push({ metin: `${y.courseName} (${trTarih(y.date)} ${y.startTime}): amfi ${e.amphitheater || "—"} → ${y.amphitheater || "—"}` });
  }
  return out;
}

/** Hedef öğrencilere tek bildirim. donemId/dil verilmezse herkes. */
async function bildir(admin: Admin, degisimler: Degisim[], hedef: { donemId?: string | undefined; dil?: string | undefined; ogrenciler?: Record<string, Ogrenci> | undefined }) {
  if (!degisimler.length) return 0;
  const { data: rows } = await admin.from("user_data").select("user_id, ayarlar");
  const { data: profs } = await admin.from("profiles").select("id, ogrenci_no");
  const noMap = new Map((profs ?? []).map((p) => [p.id, (p.ogrenci_no ?? "").replace(/\D/g, "").replace(/^0+/, "")]));
  const kayitlar: { user_id: string; baslik: string; metin: string; tur: string; link: string }[] = [];
  for (const r of rows ?? []) {
    const a = (r.ayarlar ?? {}) as Record<string, unknown>;
    if (hedef.donemId && (a["donemId"] !== hedef.donemId || a["dil"] !== hedef.dil)) continue;
    const ogr = hedef.ogrenciler?.[noMap.get(r.user_id) ?? ""];
    const ilgili = degisimler.filter((d) => !d.gruplar || (ogr ? grubaUyar(d.gruplar, ogr) : false));
    if (!ilgili.length) continue;
    const detay = ilgili.map((d) => `• ${d.metin}`).join("\n");
    kayitlar.push({
      user_id: r.user_id,
      baslik: `Programında ${ilgili.length} değişiklik var`,
      metin: detay,
      tur: "program",
      link: "/",
    });
  }
  for (let i = 0; i < kayitlar.length; i += 500) await admin.from("bildirimler").insert(kayitlar.slice(i, i + 500));
  return kayitlar.length;
}

async function veriAl(admin: Admin, anahtar: string): Promise<Veri> {
  const { data } = await admin.from("global_data").select("veri").eq("anahtar", anahtar).maybeSingle();
  return ((data?.veri as Veri | null) ?? {}) as Veri;
}

async function kaynakIsle(admin: Admin, k: Kaynak): Promise<{ degisti: boolean; bildirim: number }> {
  const f = await indir(k.url);
  let yeni: unknown;
  if (k.tur === "yillik") yeni = await yillikProgramOku(f);
  else if (k.tur === "uygulama") yeni = await uygulamaTablosuOku(f);
  else if (k.tur === "ogrenci") yeni = await ogrenciListesiOku(f);
  else if (k.tur === "secmeli") yeni = await genelSecmeliOku(f);
  else yeni = await haftalikAmfiOku(f);
  const h = hash(yeni);
  const simdi = new Date().toISOString();
  if (h === k.son_hash) {
    await admin.from("sheets_kaynaklari").update({ son_kontrol: simdi, hata: null }).eq("id", k.id);
    return { degisti: false, bildirim: 0 };
  }
  const ilk = k.son_hash === null; // ilk kontrol: yükleme anındaki veriyle aynı kabul edilir
  const eski = await veriAl(admin, k.anahtar);
  let veri: Veri = eski;
  let degisimler: Degisim[] = [];
  let hedef: Parameters<typeof bildir>[2] = {};
  if (k.anahtar.startsWith("program:")) {
    const [, donemId, dil] = k.anahtar.split(":");
    hedef = { donemId, dil, ogrenciler: (eski["ogrenciler"] as Record<string, Ogrenci>) ?? {} };
  }
  if (k.tur === "yillik") {
    const l = yeni as Ders[];
    if (!l.length) throw new Error("Tabloda ders bulunamadı");
    degisimler = dersFarki((eski["dersler"] as Ders[]) ?? [], l);
    veri = { ...eski, dersler: l };
  } else if (k.tur === "uygulama") {
    const l = yeni as UygulamaOlayi[];
    if (!l.length) throw new Error("Tabloda uygulama bulunamadı");
    degisimler = uygulamaFarki((eski["uygulamalar"] as UygulamaOlayi[]) ?? [], l);
    veri = { ...eski, uygulamalar: l };
  } else if (k.tur === "ogrenci") {
    const o = yeni as Record<string, Ogrenci>;
    if (!Object.keys(o).length) throw new Error("Tabloda öğrenci bulunamadı");
    veri = { ...eski, ogrenciler: o };
  } else if (k.tur === "secmeli") {
    const l = yeni as unknown[];
    if (!l.length) throw new Error("Tabloda seçmeli bulunamadı");
    if (!ilk) degisimler = [{ metin: "Seçmeli ders programı güncellendi" }];
    veri = { ...eski, genelSecmeliler: l };
  } else {
    const r = yeni as Awaited<ReturnType<typeof haftalikAmfiOku>>;
    const eskiAmfi = (eski["amfi"] as HaftalikAmfiKaydi[]) ?? [];
    degisimler = amfiFarki(eskiAmfi, r.kayitlar);
    // Yalnızca tablodaki haftalar değişir; aynı bağlantı yeni haftayla üzerine yazılsa bile eski haftalar arşivde kalır.
    veri = {
      ...eski,
      ...amfiArsivBirlestir(
        { amfi: eskiAmfi, secmeliOlaylari: eski["secmeliOlaylari"] as SecmeliOlay[] | null, amfiAdlari: eski["amfiAdlari"] as Record<string, string[]> | null },
        r,
      ),
    };
  }
  const { error } = await admin.from("global_data").upsert({ anahtar: k.anahtar, veri: veri as never, updated_at: simdi });
  if (error) throw error;
  const bildirim = ilk ? 0 : await bildir(admin, degisimler, hedef);
  await admin.from("sheets_kaynaklari").update({ son_hash: h, son_kontrol: simdi, son_degisim: simdi, hata: null }).eq("id", k.id);
  return { degisti: true, bildirim };
}

/** Aktif tüm (veya tek) kaynakları kontrol eder. Hatalı kaynak tekrar tekrar denenmez: aktif=false yapılır. */
export async function sheetsKontrol(id?: string) {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  let q = admin.from("sheets_kaynaklari").select("id, anahtar, tur, url, son_hash, son_kontrol, aralik_dk");
  q = id ? q.eq("id", id) : q.eq("aktif", true);
  const { data, error } = await q;
  if (error) throw error;
  const sonuc: { id: string; degisti: boolean; bildirim: number; hata?: string }[] = [];
  const simdi = Date.now();
  const sirada = ((data ?? []) as (Kaynak & { son_kontrol: string | null; aralik_dk: number })[]).filter(
    (k) => id || !k.son_kontrol || simdi - new Date(k.son_kontrol).getTime() >= (k.aralik_dk - 2) * 60_000,
  );
  for (const k of sirada) {
    try {
      sonuc.push({ id: k.id, ...(await kaynakIsle(admin, k)) });
    } catch (e) {
      const hata = e instanceof Error ? e.message : "Bilinmeyen hata";
      await admin.from("sheets_kaynaklari").update({ hata, aktif: false, son_kontrol: new Date().toISOString() }).eq("id", k.id);
      sonuc.push({ id: k.id, degisti: false, bildirim: 0, hata });
    }
  }
  return sonuc;
}
