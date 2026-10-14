import { kisiselUygula } from "@/components/OzelDersler";
import { addDays, isoDate, startOfWeek } from "./date-utils";
import { kategoriHaritasi, type OlayTuru } from "./dilim";
import { gecerliUygulamalar, haftaninOlaylari, type DersOlayi, type Ogrenci, type YuklenenVeri } from "./schedule-data";
import type { Ayarlar } from "./store";

export type { OlayTuru };

/** Programın tüm haftalarındaki olaylar (takvimle aynı anahtarlarla). */
export function tumOlaylar(
  veri: YuklenenVeri | undefined,
  secmeliler: string[],
  manuel: Record<string, string>,
  ogrenci: Ogrenci | undefined,
  ayarlar: Ayarlar,
): DersOlayi[] {
  const tarihler = [
    ...(veri?.dersler ?? []).map((d) => d.date).filter((t): t is string => Boolean(t)),
    ...gecerliUygulamalar(veri).map((u) => u.date).filter(Boolean),
  ].sort();
  if (!tarihler.length) return [];
  let hafta = startOfWeek(new Date(`${tarihler[0]}T00:00:00`));
  const son = new Date(`${tarihler[tarihler.length - 1]}T00:00:00`);
  const ilk = hafta;
  const out: DersOlayi[] = [];
  for (let i = 0; hafta <= son && i < 80; i++) {
    out.push(...haftaninOlaylari(hafta, secmeliler, manuel, veri, ogrenci, ayarlar.gizliSecmeliGruplari ?? [], ayarlar.telafiGoster ?? true));
    hafta = addDays(hafta, 7);
  }
  return kisiselUygula(out, ilk, addDays(son, 7), ayarlar);
}

/** Dersin başlangıcı geçti mi (bugünkü dersler başladıysa sayılır). */
export function gecti(o: DersOlayi, simdi = new Date()) {
  const [h, m] = o.ders.startTime.split(":").map(Number);
  const t = new Date(o.date);
  t.setHours(h ?? 0, m ?? 0, 0, 0);
  return t.getTime() <= simdi.getTime();
}

export interface DevamGrubu {
  dilim: string;
  dal: string;
  tur: OlayTuru;
  yapilan: number;
  girilen: number;
  toplam: number;
  oran: number;
}

export function devamHesapla(olaylar: DersOlayi[], katilim: Record<string, true>, simdi = new Date()): DevamGrubu[] {
  const m = new Map<string, DevamGrubu>();
  const kat = kategoriHaritasi(olaylar);
  for (const o of olaylar) {
    const k = kat.get(o.key);
    if (!k) continue;
    const id = `${k.dilim}|${k.tur}`;
    const g = m.get(id) ?? { ...k, dal: k.tur === "uygulama" ? "uygulamalar" : "teorik dersler", yapilan: 0, girilen: 0, toplam: 0, oran: 1 };
    g.toplam++;
    if (gecti(o, simdi)) {
      g.yapilan++;
      if (katilim[o.key]) g.girilen++;
    }
    m.set(id, g);
  }
  return [...m.values()].map((g) => {
    const kacan = g.yapilan - g.girilen;
    const oran = g.toplam ? kacan / g.toplam : 0;
    return { ...g, oran };
  });
}

export const bugunIso = () => isoDate(new Date());
