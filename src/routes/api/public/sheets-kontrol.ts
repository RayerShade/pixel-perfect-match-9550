import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/sheets-kontrol")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const red = await authenticateCronRequest(request);
        if (red) return red;
        const { sheetsKontrol } = await import("@/lib/sheets-takip.server");
        const sonuc = await sheetsKontrol();
        return Response.json({ kontrol: sonuc.length, degisen: sonuc.filter((s) => s.degisti).length });
      },
    },
  },
});
