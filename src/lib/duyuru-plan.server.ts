import { supabaseAdmin as admin } from "@/integrations/supabase/client.server";

type Hedef = { tip?: "herkes" | "donem" | "secili"; donemId?: string; dil?: string; grup?: string; kullanicilar?: string[] };

function hedefeUyar(ayarlar: Record<string, unknown>, userId: string, hedef: Hedef) {
  if (hedef.tip === "secili") return (hedef.kullanicilar ?? []).includes(userId);
  if (hedef.tip !== "donem") return true;
  if (hedef.donemId && ayarlar.donemId !== hedef.donemId) return false;
  if (hedef.dil && ayarlar.dil !== hedef.dil) return false;
  if (hedef.grup) {
    const elle = ayarlar.grupElle as { grup?: string } | undefined;
    if ((elle?.grup ?? ayarlar.grup) !== hedef.grup) return false;
  }
  return true;
}

/** Zamanı gelen planlı duyuruları güvenli sunucu hesabıyla yalnızca bir kez yollar. */
export async function planliDuyurulariGonder() {
  const planTablo = admin.from("duyuru_planlari" as never) as any;
  const { data, error } = await planTablo.select("*").eq("durum", "bekliyor").lte("yayin_zamani", new Date().toISOString()).order("yayin_zamani");
  if (error) throw error;
  let gonderilen = 0;
  for (const plan of data ?? []) {
    // Aynı plan iki cron çalışmasıyla yakalansa da yalnızca ilk çalışan kilidi alır.
    const { data: kilit } = await planTablo.update({ durum: "gonderiliyor" }).eq("id", plan.id).eq("durum", "bekliyor").select("id").maybeSingle();
    if (!kilit) continue;
    try {
      const hedef = (plan.hedef ?? { tip: "herkes" }) as Hedef;
      const { data: kullanicilar, error: kullaniciHata } = await admin.from("user_data").select("user_id, ayarlar");
      if (kullaniciHata) throw kullaniciHata;
      const kayitlar = (kullanicilar ?? [])
        .filter((k) => hedefeUyar((k.ayarlar ?? {}) as Record<string, unknown>, k.user_id, hedef))
        .map((k) => ({ user_id: k.user_id, baslik: plan.baslik, metin: plan.metin, tur: "duyuru", link: "/" }));
      for (let i = 0; i < kayitlar.length; i += 500) {
        const { error: ekleHata } = await admin.from("bildirimler").insert(kayitlar.slice(i, i + 500));
        if (ekleHata) throw ekleHata;
      }
      await planTablo.update({ durum: "gonderildi", gonderildi_at: new Date().toISOString() }).eq("id", plan.id);
      gonderilen += 1;
    } catch (e) {
      await planTablo.update({ durum: "bekliyor" }).eq("id", plan.id);
      throw e;
    }
  }
  return gonderilen;
}
