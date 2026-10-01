import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exportUrl } from "./sheets-url";

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
