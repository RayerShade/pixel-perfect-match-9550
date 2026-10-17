import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const alanSema = {
  type: ["string", "null"],
} as const;

const CIKTI_SEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ozet", "degisiklikler"],
  properties: {
    ozet: { type: "string" },
    degisiklikler: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["hedef", "id", "islem", "alanlar", "neden"],
        properties: {
          hedef: { type: "string", enum: ["ders", "uygulama"] },
          id: { type: "string" },
          islem: { type: "string", enum: ["guncelle", "sil"] },
          neden: { type: "string" },
          alanlar: {
            type: "object",
            additionalProperties: false,
            required: ["ad", "tur", "dilim", "dal", "derslik", "tarih", "baslangic", "bitis"],
            properties: {
              ad: alanSema,
              tur: { type: ["string", "null"], enum: ["teorik", "pratik", "pbl", "secmeli", "sinav", null] },
              dilim: alanSema,
              dal: alanSema,
              derslik: alanSema,
              tarih: alanSema,
              baslangic: alanSema,
              bitis: alanSema,
            },
          },
        },
      },
    },
  },
};

const SISTEM = `Sen bir tıp fakültesi ders programı veri düzeltme asistanısın. Sana bir dönemin satırları verilir.
Satır biçimi: D|id|tarih|saat|ad|tür|dilim|ana dal|derslik|not  (D=ders) ve U|id|tarih|saat|ad|tür|dilim|ana dal|yer|gruplar (U=uygulama).
Türler: teorik, pratik (laboratuvar/uygulama), pbl (PDÖ), secmeli, sinav.
Görevin: admin bir talimat verdiyse yalnız o talimatı uygula; vermediyse verideki hataları bul: aynı dilim/ana dalın farklı yazımları, yanlış tür (ör. uygulama/lab dersinin teorik görünmesi), eksik/kesik ders adları, dilimi boş ya da yanlış dersler, mantıksız saatler.
Kurallar: Yalnız gerçekten emin olduğun değişiklikleri öner. Veri uydurma. Değişmeyen alanlar null olsun. id'leri aynen kopyala. tarih YYYY-AA-GG, saat SS:DD. "neden" kısa Türkçe açıklama. "ozet" Türkçe 1-3 cümle. En fazla 80 değişiklik.`;

export const aiVeriDuzelt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        satirlar: z.array(z.string().max(400)).min(1).max(4000),
        talimat: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Bu işlem için admin yetkisi gerekli.");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, mesaj: "Yapay zekâ anahtarı tanımlı değil." };

    const girdi = `${data.talimat?.trim() ? `ADMİN TALİMATI: ${data.talimat.trim()}` : "ADMİN TALİMATI: yok — tüm veriyi incele."}\n\nVERİ:\n${data.satirlar.join("\n")}`;
    let r: Response;
    try {
      r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          Authorization: `Bearer ${key}`,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          instructions: SISTEM,
          input: [{ role: "user", content: girdi }],
          text: { format: { type: "json_schema", name: "duzeltmeler", strict: true, schema: CIKTI_SEMA } },
        }),
      });
    } catch {
      return { ok: false as const, mesaj: "Yapay zekâ servisine ulaşılamadı." };
    }
    if (!r.ok || !r.body) {
      let m = "";
      try { m = ((await r.json()) as { message?: string; error?: { message?: string } }).message ?? ""; } catch { /* yok */ }
      const durum: Record<number, string> = {
        402: "Yapay zekâ kredisi bitti. Ayarlar → Plans & credits'ten kredi ekleyebilirsin.",
        403: "Yapay zekâ kullanımı bu çalışma alanında engelli ya da limit doldu.",
        429: "Çok sık istek gönderildi, biraz bekleyip tekrar dene.",
      };
      return { ok: false as const, mesaj: durum[r.status] ?? `Yapay zekâ servisi hata verdi (${r.status}). ${m}`.trim() };
    }

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let tampon = "", metin = "", hata = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      tampon += dec.decode(value, { stream: true });
      let i;
      while ((i = tampon.indexOf("\n")) >= 0) {
        const satir = tampon.slice(0, i).trim();
        tampon = tampon.slice(i + 1);
        if (!satir.startsWith("data:")) continue;
        const v = satir.slice(5).trim();
        if (!v || v === "[DONE]") continue;
        try {
          const e = JSON.parse(v) as { type?: string; delta?: string; response?: { error?: { message?: string } }; message?: string };
          if (e.type === "response.output_text.delta" && e.delta) metin += e.delta;
          else if (e.type === "response.failed" || e.type === "error") hata = e.response?.error?.message ?? e.message ?? "bilinmeyen hata";
        } catch { /* parça */ }
      }
    }
    if (hata) return { ok: false as const, mesaj: `Yapay zekâ isteği başarısız: ${hata}` };
    if (!metin.trim()) return { ok: false as const, mesaj: "Yapay zekâ bir yanıt üretmedi." };
    const sema = z.object({
      ozet: z.string(),
      degisiklikler: z.array(
        z.object({
          hedef: z.enum(["ders", "uygulama"]),
          id: z.string(),
          islem: z.enum(["guncelle", "sil"]),
          neden: z.string(),
          alanlar: z.object({
            ad: z.string().nullable(), tur: z.enum(["teorik", "pratik", "pbl", "secmeli", "sinav"]).nullable(),
            dilim: z.string().nullable(), dal: z.string().nullable(), derslik: z.string().nullable(),
            tarih: z.string().nullable(), baslangic: z.string().nullable(), bitis: z.string().nullable(),
          }),
        }),
      ).max(200),
    });
    try {
      const p = sema.safeParse(JSON.parse(metin));
      if (!p.success) return { ok: false as const, mesaj: "Yapay zekâ geçersiz bir yanıt döndürdü." };
      return { ok: true as const, ...p.data };
    } catch {
      return { ok: false as const, mesaj: "Yapay zekâ yanıtı okunamadı." };
    }
  });
