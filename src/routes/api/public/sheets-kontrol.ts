import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Google Sheets kaynaklarını cron ile güvenli biçimde kontrol eder. */
export const Route = createFileRoute("/api/public/sheets-kontrol")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Eski Lovable cron anahtarı geçerliyse koru; değilse yalnız bu iş için oluşturulmuş
        // ve veritabanında tutulan Sheets anahtarını doğrula.
        const eskiDogrulama = await authenticateCronRequest(request);
        if (eskiDogrulama) {
          const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
          if (!token) return eskiDogrulama;
          const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await (admin as any).rpc("sheets_cron_token_dogrula", { _token: token });
          if (error || !data) return eskiDogrulama;
        }
        const { sheetsKontrol } = await import("@/lib/sheets-takip.server");
        const sonuc = await sheetsKontrol();
        return Response.json({ kontrol: sonuc.length, degisen: sonuc.filter((s) => s.degisti).length });
      },
    },
  },
});
