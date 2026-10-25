import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin: bir Sheets kaynağını hemen kontrol eder (ya da hepsini). */
export const sheetsSimdiKontrol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Yetkisiz");
    const { sheetsKontrol } = await import("./sheets-takip.server");
    return sheetsKontrol(data.id);
  });


export const sheetsKaynakListele = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Yetkisiz");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("sheets_kaynaklari").select("id, anahtar, tur, aktif, aralik_dk, kontrol_tipi, saatler, hafta_gunleri, son_kontrol, son_degisim, hata").order("anahtar").order("tur");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sheetsKaynakPlanGuncelle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), aktif: z.boolean(), aralikDk: z.number().int().min(5).max(10080), tip: z.enum(["aralik", "gunluk", "haftalik"]), saatler: z.array(z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/)).max(12), haftaGunleri: z.array(z.number().int().min(0).max(6)).max(7) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Yetkisiz");
    if (data.tip !== "aralik" && !data.saatler.length) throw new Error("En az bir saat seçmelisin.");
    if (data.tip === "haftalik" && !data.haftaGunleri.length) throw new Error("En az bir gün seçmelisin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sheets_kaynaklari").update({ aktif: data.aktif, aralik_dk: data.aralikDk, kontrol_tipi: data.tip, saatler: data.saatler, hafta_gunleri: data.haftaGunleri }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
