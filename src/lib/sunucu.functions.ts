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
    const { error } = await db.from(data.tablo).delete().eq(TABLOLAR[data.tablo], data.anahtar);
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
