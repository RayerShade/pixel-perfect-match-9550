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
