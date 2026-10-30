import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/hesabimi-sil")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { data: kullanici, error: kimlikHata } = await admin.auth.getUser(token);
        if (kimlikHata || !kullanici.user) return Response.json({ error: "Geçersiz oturum." }, { status: 401 });
        const userId = kullanici.user.id;
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) {
          console.error("Hesap silinemedi", error);
          return Response.json({ error: "Hesap silinemedi." }, { status: 500 });
        }
        return Response.json({ silindi: true });
      },
    },
  },
});
