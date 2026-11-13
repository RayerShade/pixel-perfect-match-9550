import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/google-calendar/esitle")({
  server: { handlers: { POST: () => new Response("Harici takvim bağlantıları geçici olarak kapalı.", { status: 503, headers: { "Cache-Control": "no-store" } }) } },
});
