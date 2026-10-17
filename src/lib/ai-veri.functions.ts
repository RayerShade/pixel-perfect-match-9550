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
        saglayici: z.enum(["lovable", "deepseek"]).default("lovable"),
        dsModel: z.enum(["deepseek-chat", "deepseek-reasoner"]).default("deepseek-chat"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Bu işlem için admin yetkisi gerekli.");
    const girdi = `${data.talimat?.trim() ? `ADMİN TALİMATI: ${data.talimat.trim()}` : "ADMİN TALİMATI: yok — tüm veriyi incele."}\n\nVERİ:\n${data.satirlar.join("\n")}`;
    let metin = "";
    if (data.saglayici === "deepseek") {
      const ds = await deepseekCagir(girdi, data.dsModel);
      if (!ds.ok) return ds;
      metin = ds.metin;
    } else {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, mesaj: "Yapay zekâ anahtarı tanımlı değil." };
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
    let tampon = "", hata = "";
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
    }
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
      const temiz = metin.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
      const p = sema.safeParse(JSON.parse(temiz));
      if (!p.success) return { ok: false as const, mesaj: "Yapay zekâ geçersiz bir yanıt döndürdü." };
      return { ok: true as const, ...p.data };
    } catch {
      return { ok: false as const, mesaj: "Yapay zekâ yanıtı okunamadı." };
    }
  });

const DS_EK = `\n\nYanıtı YALNIZCA şu biçimde geçerli bir JSON nesnesi olarak ver (başka metin yok):
{"ozet":"...","degisiklikler":[{"hedef":"ders"|"uygulama","id":"...","islem":"guncelle"|"sil","neden":"...","alanlar":{"ad":null,"tur":null,"dilim":null,"dal":null,"derslik":null,"tarih":null,"baslangic":null,"bitis":null}}]}
"alanlar" içindeki 8 anahtarın hepsi her zaman olsun; değişmeyenler null. tur yalnız teorik|pratik|pbl|secmeli|sinav|null.`;

async function deepseekCagir(girdi: string, model: string): Promise<{ ok: true; metin: string } | { ok: false; mesaj: string }> {
  const key = process.env["DEEPSEEK_API_KEY"];
  if (!key) return { ok: false, mesaj: "DeepSeek API anahtarı tanımlı değil." };
  let r: Response;
  try {
    r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 8000,
        ...(model === "deepseek-chat" ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: SISTEM + DS_EK },
          { role: "user", content: girdi + "\n\nYanıtı json olarak ver." },
        ],
      }),
    });
  } catch {
    return { ok: false, mesaj: "DeepSeek servisine ulaşılamadı." };
  }
  if (!r.ok || !r.body) {
    const durum: Record<number, string> = {
      401: "DeepSeek API anahtarı geçersiz.",
      402: "DeepSeek bakiyen yetersiz. DeepSeek hesabına bakiye yükleyip tekrar dene.",
      429: "DeepSeek'e çok sık istek gönderildi, biraz bekleyip tekrar dene.",
    };
    return { ok: false, mesaj: durum[r.status] ?? `DeepSeek hata verdi (${r.status}).` };
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let tampon = "", metin = "";
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
        const e = JSON.parse(v) as { choices?: { delta?: { content?: string | null } }[] };
        const c = e.choices?.[0]?.delta?.content;
        if (c) metin += c;
      } catch { /* parça */ }
    }
  }
  return { ok: true, metin };
}
