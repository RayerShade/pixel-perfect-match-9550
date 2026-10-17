import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/duyuru-planlarini-gonder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const red = await authenticateCronRequest(request);
        if (red) return red;
        const { planliDuyurulariGonder } = await import("@/lib/duyuru-plan.server");
        return Response.json({ gonderilen: await planliDuyurulariGonder() });
      },
    },
  },
});
