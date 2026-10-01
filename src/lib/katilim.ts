import { useCallback } from "react";
import { useAyarlar } from "./store";

/** Derse girdim işaretleri. */
export function useKatilim() {
  const { ayarlar, guncelle } = useAyarlar();
  const katilim = ayarlar.katilim ?? {};
  const ayarla = useCallback(
    (keys: string[], girdi: boolean) =>
      guncelle((prev) => {
        const k = { ...(prev.katilim ?? {}) };
        for (const key of keys) {
          if (girdi) k[key] = true;
          else delete k[key];
        }
        return { katilim: k };
      }),
    [guncelle],
  );
  const uyariKapat = useCallback(
    (dilim: string, kapali: boolean) =>
      guncelle((prev) => {
        const l = new Set(prev.devamUyariKapali ?? []);
        if (kapali) l.add(dilim);
        else l.delete(dilim);
        return { devamUyariKapali: [...l] };
      }),
    [guncelle],
  );
  return { katilim, ayarla, kapali: ayarlar.devamUyariKapali ?? [], uyariKapat };
}
