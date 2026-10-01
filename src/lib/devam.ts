import { kisiselUygula } from "@/components/OzelDersler";
import { addDays, isoDate, startOfWeek } from "./date-utils";
import { olayKategori, type OlayTuru } from "./dilim";
import { haftaninOlaylari, type DersOlayi, type Ogrenci, type YuklenenVeri } from "./schedule-data";
import type { Ayarlar } from "./store";

export const ESIK: Record<OlayTuru, number> = { ders: 0.7, uygulama: 0.8 };
/** Bu kadar oturum yapılmadan uyarı verilmez (ilk haftalarda yanlış alarm olmasın). */
export const EN_AZ_OTURUM = 5;

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
    ...(veri?.uygulamalar ?? []).map((u) => u.date).filter(Boolean),
  ].sort();
  if (!tarihler.length) return [];
  let hafta = startOfWeek(new Date(`${tarihler[0]}T00:00:00`));
  const son = new Date(`${tarihler[tarihler.length - 1]}T00:00:00`);
  const ilk = hafta;
  const out: DersOlayi[] = [];
  for (let i = 0; hafta <= son && i < 60; i++) {
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
  uyari: boolean;
}

export function devamHesapla(olaylar: DersOlayi[], katilim: Record<string, true>, simdi = new Date()): DevamGrubu[] {
  const m = new Map<string, DevamGrubu>();
  for (const o of olaylar) {
    const k = olayKategori(o);
    if (!k) continue;
    const id = `${k.dilim}|${k.tur}|${k.dal}`;
    const g = m.get(id) ?? { ...k, yapilan: 0, girilen: 0, toplam: 0, oran: 1, uyari: false };
    g.toplam++;
    if (gecti(o, simdi)) {
      g.yapilan++;
      if (katilim[o.key]) g.girilen++;
    }
    m.set(id, g);
  }
  return [...m.values()].map((g) => {
    const oran = g.yapilan ? g.girilen / g.yapilan : 1;
    return { ...g, oran, uyari: g.yapilan >= EN_AZ_OTURUM && oran < ESIK[g.tur] };
  });
}

export const bugunIso = () => isoDate(new Date());
