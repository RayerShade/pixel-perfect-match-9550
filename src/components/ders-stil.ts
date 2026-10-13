import type { DersTuru } from "@/lib/schedule-data";

export const TUR_SINIFI: Record<DersTuru, string> = {
  teorik: "ders-teorik",
  pratik: "ders-pratik",
  pbl: "ders-pbl",
  secmeli: "ders-secmeli",
  sinav: "ders-sinav",
};

export const TUR_NOKTA: Record<DersTuru, string> = {
  teorik: "bg-teorik",
  pratik: "bg-pratik",
  pbl: "bg-pbl",
  secmeli: "bg-secmeli",
  sinav: "bg-sinav",
};

/** Dersliği kesinleşmiş (haftalık amfi ya da admin onaylı) olaylar: altın/amber. */
export const KESIN_SINIFI = "border-2 border-altin bg-altin/20 text-foreground";
