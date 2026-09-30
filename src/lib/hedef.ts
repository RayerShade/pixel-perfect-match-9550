/** Duyuru / bildirim hedef kitlesi. */
export type Hedef =
  | { tip: "herkes" }
  | { tip: "donem"; donemId: string; dil: "tr" | "en" | "" }
  | { tip: "secili"; kullanicilar: string[] };

export function hedefeUyar(h: Hedef | undefined, userId: string | undefined, donemId?: string, dil?: string) {
  if (!h || h.tip === "herkes") return true;
  if (h.tip === "secili") return !!userId && h.kullanicilar.includes(userId);
  return (!h.donemId || h.donemId === donemId) && (!h.dil || h.dil === dil);
}
