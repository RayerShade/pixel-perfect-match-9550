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
