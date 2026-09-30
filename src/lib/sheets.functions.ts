import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function exportUrl(girdi: string): string | null {
  const u = girdi.trim().replace(/^\/\//, "https://");
  // "Web'de yayınla" bağlantısı: /spreadsheets/d/e/<id>/pubhtml
  const pub = u.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=xlsx`;
  // Her biçim: /spreadsheets/d/<id>, /spreadsheets/u/0/d/<id>, /file/d/<id>/view, /document/d/<id>
  const normal =
    u.match(/\/d\/([a-zA-Z0-9_-]{20,})/) ??
    u.match(/[?&]id=([a-zA-Z0-9_-]{20,})/) ??
    u.match(/docs\.google\.com\/[a-z]+\/([a-zA-Z0-9_-]{20,})/);
  if (normal) return `https://docs.google.com/spreadsheets/d/${normal[1]}/export?format=xlsx`;
  // Sadece kimlik yapıştırıldıysa
  if (/^[a-zA-Z0-9_-]{25,}$/.test(u)) return `https://docs.google.com/spreadsheets/d/${u}/export?format=xlsx`;
  return null;
}

/** Paylaşılan Google Sheets dosyasını xlsx olarak indirir. Hata fırlatmaz, mesaj döner. */
export const sheetsIndir = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().min(1).max(1000) }).parse(d))
  .handler(async ({ data }): Promise<{ b64: string | null; hata: string | null }> => {
    const hedef = exportUrl(data.url);
    if (!hedef) {
      return { b64: null, hata: "Geçerli bir Google Sheets bağlantısı değil. Tarayıcının adres çubuğundaki docs.google.com/spreadsheets/d/... bağlantısını yapıştır." };
    }
    try {
      const r = await fetch(hedef, { redirect: "follow" });
      const tur = r.headers.get("content-type") ?? "";
      if (!r.ok || tur.includes("text/html")) {
        return { b64: null, hata: "Dosya açılamadı. Sheets'te Paylaş → 'Bağlantıya sahip herkes görüntüleyebilir' seçili olmalı." };
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      let s = "";
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { b64: btoa(s), hata: null };
    } catch (e) {
      console.error("sheetsIndir", e);
      return { b64: null, hata: "Google Sheets'e ulaşılamadı, tekrar dene." };
    }
  });
