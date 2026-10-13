import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALANLAR = ["tarih", "baslangic", "bitis", "saat", "ders", "amfi", "grup", "hoca"] as const;

/**
 * Yedek tablo çözücü: yalnız normal okuma sonuç vermediğinde, admin isteğiyle çağrılır.
 * Yapay zekâya sadece ilk ≤15 satırın başlık/örnek hücreleri gider; dönen tek şey sütun haritasıdır.
 * Veriyi yine kod okur. Anahtar yoksa hiçbir çağrı yapılmaz.
 */
export const aiSutunHaritasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ satirlar: z.array(z.array(z.string().max(200)).max(40)).min(1).max(15) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Bu işlem için admin yetkisi gerekli.");
    const key = process.env["AI_TABLE_PARSER_API_KEY"];
    if (!key) return { ok: false as const, mesaj: "Yapay zekâ tablo çözücü kapalı: sunucuda AI_TABLE_PARSER_API_KEY tanımlı değil. Tablo normal yöntemle okunmaya devam eder." };
    const url = process.env["AI_TABLE_PARSER_URL"] ?? "https://api.openai.com/v1/chat/completions";
    const model = process.env["AI_TABLE_PARSER_MODEL"] ?? "gpt-4o-mini";
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `Bir ders programı tablosunun ilk satırları verilir. Yalnız JSON döndür: {"baslikSatiri": <0 tabanlı satır no>, "sutunlar": {${ALANLAR.map((a) => `"${a}": <0 tabanlı sütun no veya null>`).join(", ")}}}. Veri uydurma.` },
            { role: "user", content: JSON.stringify(data.satirlar) },
          ],
        }),
      });
      if (!r.ok) return { ok: false as const, mesaj: `Yapay zekâ servisi hata verdi (${r.status}).` };
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const ham = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
      const sema = z.object({
        baslikSatiri: z.number().int().min(0).max(data.satirlar.length - 1),
        sutunlar: z.object(Object.fromEntries(ALANLAR.map((a) => [a, z.number().int().min(0).max(39).nullable().optional()]))),
      });
      const p = sema.safeParse(ham);
      if (!p.success) return { ok: false as const, mesaj: "Yapay zekâ geçersiz bir sütun haritası döndürdü." };
      const s = p.data.sutunlar as Record<string, number | null | undefined>;
      if (s["ders"] == null || (s["saat"] == null && s["baslangic"] == null)) return { ok: false as const, mesaj: "Yapay zekâ ders/saat sütunlarını bulamadı." };
      return { ok: true as const, harita: p.data };
    } catch {
      return { ok: false as const, mesaj: "Yapay zekâ servisine ulaşılamadı (zaman aşımı)." };
    } finally {
      clearTimeout(t);
    }
  });
