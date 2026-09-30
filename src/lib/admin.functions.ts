import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const hesapSil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Bu işlem için admin yetkisi gerekli.");
    if (data.userId === context.userId) throw new Error("Kendi hesabını buradan silemezsin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const hesapGuncelle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      email: z.string().trim().email().max(255).optional(),
      sifre: z.string().min(6).max(72).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Bu işlem için admin yetkisi gerekli.");
    if (data.userId === context.userId) throw new Error("Kendi hesabını buradan değiştiremezsin.");
    if (!data.email && !data.sifre) throw new Error("Değiştirilecek bir şey yok.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hedef } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (hedef.user?.email?.toLowerCase() === "cerandeniz435@gmail.com") {
      const { data: ben } = await context.supabase.rpc("orijinal_admin_mi");
      if (!ben) throw new Error("Süper adminin hesabı değiştirilemez.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ...(data.email ? { email: data.email, email_confirm: true } : {}),
      ...(data.sifre ? { password: data.sifre } : {}),
    });
    if (error) throw new Error(error.message);
    if (data.email) await supabaseAdmin.from("profiles").update({ email: data.email }).eq("id", data.userId);
    return { ok: true };
  });
