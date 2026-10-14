import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type YemekKategorisi = "breakfast" | "lunch";
export interface YemekGunu {
  tarih: string;
  kahvalti: string | null;
  ogle: string | null;
}

const KAYNAK = "https://sks.istanbul.edu.tr/meals-by-date";
const onbellek = new Map<string, { zaman: number; veri: YemekGunu[] }>();
const GECERLI_MS = 30 * 60_000;

async function ogunAl(tarih: string, kategori: YemekKategorisi): Promise<string | null> {
  const url = new URL(KAYNAK);
  url.searchParams.set("date", tarih);
  url.searchParams.set("category", kategori);
  const yanit = await fetch(url, { headers: { accept: "application/json" } });
  if (!yanit.ok) throw new Error("SKS yemek listesine ulaşılamadı.");
  const veri = (await yanit.json()) as { success?: boolean; meal?: unknown };
  if (!veri.success || typeof veri.meal !== "string") return null;
  return veri.meal.replace(/<[^>]*>/g, "").replace(/\r?\n/g, "\n").replace(/[ \t]+/g, " ").trim() || null;
}

export const yemekListesiGetir = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ yil: z.number().int().min(2025).max(2035), ay: z.number().int().min(1).max(12) }).parse(d))
  .handler(async ({ data }): Promise<{ kaynak: string; gunler: YemekGunu[] }> => {
    const anahtar = `${data.yil}-${String(data.ay).padStart(2, "0")}`;
    const eski = onbellek.get(anahtar);
    if (eski && Date.now() - eski.zaman < GECERLI_MS) return { kaynak: KAYNAK, gunler: eski.veri };

    const sonGun = new Date(data.yil, data.ay, 0).getDate();
    const tarihler = Array.from({ length: sonGun }, (_, i) => `${anahtar}-${String(i + 1).padStart(2, "0")}`);
    const gunler = await Promise.all(tarihler.map(async (tarih) => {
      const [kahvalti, ogle] = await Promise.all([ogunAl(tarih, "breakfast"), ogunAl(tarih, "lunch")]);
      return { tarih, kahvalti, ogle };
    }));
    onbellek.set(anahtar, { zaman: Date.now(), veri: gunler });
    return { kaynak: KAYNAK, gunler };
  });
