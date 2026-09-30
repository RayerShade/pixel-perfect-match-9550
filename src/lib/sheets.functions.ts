import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Paylaşılan (bağlantıya sahip herkes görüntüleyebilir) Google Sheets dosyasını xlsx olarak indirir. */
export const sheetsIndir = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().min(10).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const m = data.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error("Geçerli bir Google Sheets bağlantısı değil.");
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=xlsx`, { redirect: "follow" });
    const tur = r.headers.get("content-type") ?? "";
    if (!r.ok || tur.includes("text/html")) {
      throw new Error("Dosya açılamadı. Sheets'te Paylaş → 'Bağlantıya sahip herkes görüntüleyebilir' seçili olmalı.");
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(s) };
  });
