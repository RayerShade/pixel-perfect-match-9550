import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sunucu paneli: yalnızca süper admin. Tüm işlemler sunucuda yetki kontrolünden sonra yapılır. */
export const TABLOLAR = { profiles: "id", user_data: "user_id", user_roles: "id", global_data: "anahtar" } as const;
const tabloSema = z.enum(["profiles", "user_data", "user_roles", "global_data"]);
const KOVA = "ogrenci-dosyalari";

async function yetkili(ctx: { supabase: { rpc: (f: "orijinal_admin_mi") => PromiseLike<{ data: unknown }> } }) {
  const { data } = await ctx.supabase.rpc("orijinal_admin_mi");
  if (!data) throw new Error("Yalnızca süper admin.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any as typeof supabaseAdmin & { from: (t: string) => any };
}

export const sunucuKullanicilar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await yetkili(context as never);
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      olusturma: u.created_at,
      sonGiris: u.last_sign_in_at ?? null,
      onayli: Boolean(u.email_confirmed_at),
      yontem: (u.identities ?? []).map((i) => i.provider).join(", "),
      yasakli: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
    }));
  });

export const kullaniciIslem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), islem: z.enum(["onayla", "yasakla", "yasakKaldir", "cikisYaptir"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    if (data.userId === context.userId) throw new Error("Kendi hesabına uygulanamaz.");
    const g =
      data.islem === "onayla" ? { email_confirm: true } :
      data.islem === "yasakla" ? { ban_duration: "876000h" } :
      { ban_duration: "none" };
    if (data.islem === "cikisYaptir") {
      // Kısa bir yasak tüm oturumları geçersiz kılar, hemen kaldırılır.
      await db.auth.admin.updateUserById(data.userId, { ban_duration: "1s" });
      await db.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
      return { ok: true };
    }
    const { error } = await db.auth.admin.updateUserById(data.userId, g);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const tabloOku = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tablo: tabloSema }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    const { data: rows, error } = await db.from(data.tablo).select("*").limit(1000);
    if (error) throw new Error(error.message);
    return JSON.stringify(rows ?? []);
  });

export const satirKaydet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tablo: tabloSema, satir: z.record(z.string(), z.unknown()) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    const pk = TABLOLAR[data.tablo];
    if (data.satir[pk] == null && data.tablo !== "user_roles") throw new Error(`${pk} gerekli.`);
    const { error } = await db.from(data.tablo).upsert(data.satir as never, { onConflict: pk });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const satirSil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tablo: tabloSema, anahtar: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    const { error } = await db.from(data.tablo).delete().eq(TABLOLAR[data.tablo] as never, data.anahtar as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dosyaListele = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await yetkili(context as never);
    const s = db.storage.from(KOVA);
    const out: { yol: string; boyut: number; tarih: string | null }[] = [];
    const { data: kullar } = await s.list("", { limit: 1000 });
    for (const k of kullar ?? []) {
      const { data: turler } = await s.list(k.name, { limit: 100 });
      for (const t of turler ?? []) {
        const { data: dosyalar } = await s.list(`${k.name}/${t.name}`, { limit: 100 });
        for (const f of dosyalar ?? []) {
          out.push({ yol: `${k.name}/${t.name}/${f.name}`, boyut: Number((f.metadata as { size?: number } | null)?.size ?? 0), tarih: f.updated_at ?? null });
        }
      }
    }
    return out;
  });

export const dosyaIslem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ yol: z.string().min(1).max(500), islem: z.enum(["indir", "sil"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    const s = db.storage.from(KOVA);
    if (data.islem === "sil") {
      const { error } = await s.remove([data.yol]);
      if (error) throw new Error(error.message);
      return { url: null };
    }
    const { data: u, error } = await s.createSignedUrl(data.yol, 60, { download: true });
    if (error) throw new Error(error.message);
    return { url: u.signedUrl };
  });

export const sunucuOzet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await yetkili(context as never);
    const { data: u } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = u?.users ?? [];
    const simdi = Date.now(), gun = 86400000;
    const { data: roller } = await db.from("user_roles").select("user_id, role");
    const { data: genel } = await db.from("global_data").select("anahtar, updated_at");
    const { data: ud } = await db.from("user_data").select("user_id, veri, secmeliler");
    const kayit14: number[] = Array(14).fill(0);
    for (const x of users) { const d = Math.floor((simdi - new Date(x.created_at).getTime()) / gun); if (d < 14) kayit14[13 - d] = (kayit14[13 - d] ?? 0) + 1; }
    const veriler = (ud ?? []) as { veri: Record<string, unknown> | null; secmeliler: unknown[] | null }[];
    return {
      toplam: users.length,
      onayli: users.filter((x) => x.email_confirmed_at).length,
      yasakli: users.filter((x) => x.banned_until && new Date(x.banned_until) > new Date()).length,
      google: users.filter((x) => (x.identities ?? []).some((i) => i.provider === "google")).length,
      aktif24: users.filter((x) => x.last_sign_in_at && simdi - new Date(x.last_sign_in_at).getTime() < gun).length,
      aktif7: users.filter((x) => x.last_sign_in_at && simdi - new Date(x.last_sign_in_at).getTime() < 7 * gun).length,
      admin: (roller ?? []).filter((r: { role: string }) => r.role === "admin").length,
      yillikYuklu: veriler.filter((v) => Array.isArray(v.veri?.["dersler"]) && (v.veri?.["dersler"] as unknown[]).length).length,
      ogrenciYuklu: veriler.filter((v) => Array.isArray(v.veri?.["ogrenciler"]) && (v.veri?.["ogrenciler"] as unknown[]).length).length,
      secmeliSecen: veriler.filter((v) => (v.secmeliler ?? []).length).length,
      kayit14,
      genel: (genel ?? []) as { anahtar: string; updated_at: string }[],
    };
  });

export const kullaniciEkIslem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), islem: z.enum(["sil", "adminVer", "adminAl", "sifreLinki", "girisLinki"]), origin: z.string().url().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    if (data.userId === context.userId) throw new Error("Kendi hesabına uygulanamaz.");
    if (data.islem === "sil") {
      const { error } = await db.auth.admin.deleteUser(data.userId);
      if (error) throw new Error(error.message);
      return { link: null };
    }
    if (data.islem === "adminVer") {
      const { error } = await db.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
      return { link: null };
    }
    if (data.islem === "adminAl") {
      const { error } = await db.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
      return { link: null };
    }
    const { data: kul } = await db.auth.admin.getUserById(data.userId);
    const email = kul?.user?.email;
    if (!email) throw new Error("E-posta yok.");
    const tip = data.islem === "sifreLinki" ? "recovery" : "magiclink";
    const { data: l, error } = await db.auth.admin.generateLink({
      type: tip, email,
      ...(data.origin ? { options: { redirectTo: `${data.origin}${tip === "recovery" ? "/reset-password" : "/"}` } } : {}),
    });
    if (error) throw new Error(error.message);
    return { link: l.properties?.action_link ?? null };
  });

export const kullaniciOlustur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().email().max(200),
    sifre: z.string().min(6).max(100),
    adSoyad: z.string().max(100).default(""),
    ogrenciNo: z.string().max(30).default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    const { data: u, error } = await db.auth.admin.createUser({
      email: data.email, password: data.sifre, email_confirm: true,
      user_metadata: { ad_soyad: data.adSoyad, ogrenci_no: data.ogrenciNo },
    });
    if (error) throw new Error(error.message);
    const id = u.user.id;
    await db.from("profiles").upsert({ id, email: data.email, ad_soyad: data.adSoyad, ogrenci_no: data.ogrenciNo }, { onConflict: "id" });
    await db.from("user_data").upsert({ user_id: id }, { onConflict: "user_id" });
    return { id };
  });

export const kullaniciDuzenle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    email: z.string().email().max(200).optional(),
    sifre: z.string().min(6).max(100).optional().or(z.literal("")),
    adSoyad: z.string().max(100).optional(),
    ogrenciNo: z.string().max(30).optional(),
    grup: z.string().max(50).optional(),
    altGrup: z.string().max(50).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    if (data.userId === context.userId && (data.email || data.sifre)) throw new Error("Kendi e-posta/şifreni buradan değiştiremezsin.");
    const g: Record<string, unknown> = {};
    if (data.email) g.email = data.email;
    if (data.sifre) g.password = data.sifre;
    if (Object.keys(g).length) {
      const { error } = await db.auth.admin.updateUserById(data.userId, g);
      if (error) throw new Error(error.message);
    }
    if (data.adSoyad !== undefined || data.ogrenciNo !== undefined || data.email) {
      const { data: mevcut } = await db.from("profiles").select("*").eq("id", data.userId).maybeSingle();
      const { error } = await db.from("profiles").upsert({
        id: data.userId,
        email: data.email ?? mevcut?.email ?? "",
        ad_soyad: data.adSoyad ?? mevcut?.ad_soyad ?? "",
        ogrenci_no: data.ogrenciNo ?? mevcut?.ogrenci_no ?? "",
      }, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    if (data.grup !== undefined || data.altGrup !== undefined) {
      const { data: mevcut } = await db.from("user_data").select("ayarlar").eq("user_id", data.userId).maybeSingle();
      const ayarlar = { ...((mevcut?.ayarlar ?? {}) as Record<string, unknown>) };
      const grup = (data.grup ?? "").trim();
      ayarlar.grupElle = grup ? { grup, altGrup: (data.altGrup ?? "").trim() } : null;
      const { error } = await db.from("user_data").upsert({ user_id: data.userId, ayarlar }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const tamYedek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await yetkili(context as never);
    const out: Record<string, unknown> = { tarih: new Date().toISOString() };
    for (const t of Object.keys(TABLOLAR)) {
      const { data, error } = await db.from(t).select("*").limit(5000);
      if (error) throw new Error(error.message);
      out[t] = data;
    }
    return JSON.stringify(out);
  });

export const yedekGeriYukle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ metin: z.string().max(20_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await yetkili(context as never);
    const y = JSON.parse(data.metin) as Record<string, unknown>;
    const sonuc: Record<string, number> = {};
    for (const [t, pk] of Object.entries(TABLOLAR)) {
      const rows = y[t];
      if (!Array.isArray(rows) || !rows.length) continue;
      const { error } = await db.from(t).upsert(rows as never, { onConflict: t === "user_roles" ? "user_id,role" : pk });
      if (error) throw new Error(`${t}: ${error.message}`);
      sonuc[t] = rows.length;
    }
    return sonuc;
  });
