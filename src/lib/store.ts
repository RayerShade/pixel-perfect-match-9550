import type { YuklenenVeri } from "./schedule-data";
import { useCallback, useEffect, useState } from "react";
import { BULUT_OLAY, degisenAlanlar, genelKaydet, kisiselKaydet, programiYenile } from "./bulut";
import type { Dil } from "./program";

export type Tekrar = "yok" | "hafta" | "2hafta" | "ay";
/** Öğrencinin kendi eklediği ders. */
export interface OzelDers {
  id: string;
  ad: string;
  yer: string;
  not: string;
  tarih: string; // ilk gün YYYY-MM-DD
  startTime: string;
  endTime: string;
  tekrar: Tekrar;
  bitis?: string | undefined; // tekrar son günü
}
/** Programdaki bir dersin öğrenci tarafından değiştirilmesi/silinmesi. */
export interface DersDuzeni {
  sil?: boolean;
  startTime?: string;
  endTime?: string;
}

const ELECTIVE_KEY = "ders-takvim:secmeliler";
const GIZLI_KEY = "ders-takvim:gizli-secmeliler";
const AMFI_KEY = "ders-takvim:manuel-amfi";
const AYAR_KEY = "ders-takvim:ayarlar";
const AYAR_OLAY = "ders-takvim:ayar";

export interface Ayarlar {
  /** Admin tarafından elle atanan grup (öğrenci listesinin önüne geçer). */
  grupElle?: { grup: string; altGrup: string } | null | undefined;
  ogrenciNo: string;
  ogrenciAdi: string;
  donem: string;
  grup: string;
  haftaSonuGoster: boolean;
  gunBaslangic: number;
  gunBitis: number;
  onlineGorunum: "goster" | "gizle" | "cakismayan";
  onlineDersAyarlari: Record<string, "goster" | "gizle" | "cakismayan">;
  /** Türkçe telafi uygulamaları ve İngilizce Laboratory Skills repeat/make-up kayıtları. */
  telafiGoster: boolean;
  /** Takvimde hiç gösterilmeyecek seçmeli grupları (1-3). */
  gizliSecmeliGruplari: number[];
  /** İlk girişte gösterilen bilgilendirme metni bir kez görüldü mü. */
  bilgilendirmeGordu?: boolean;
  turGordu?: boolean;
  donemId?: string | undefined;
  dil?: Dil | undefined;
  ozelDersler?: OzelDers[];
  /** Anahtar: "bir:<olay key>" (tek seferlik) veya "hep:<ders adı>|<gün>|<saat>" (her hafta) */
  dersDuzenleri?: Record<string, DersDuzeni>;
  /** Öğrencinin girdi olarak işaretlediği dersler (olay key → true). */
  katilim?: Record<string, true>;
  /** Devamsızlık uyarısı kapatılan dilimler. */
  devamUyariKapali?: string[];
}

export const VARSAYILAN_AYARLAR: Ayarlar = {
  ogrenciNo: "",
  ogrenciAdi: "Tıp Fakültesi Öğrencisi",
  donem: "2026 Güz — Dönem I",
  grup: "A / A-1",
  haftaSonuGoster: false,
  gunBaslangic: 8,
  gunBitis: 18,
  onlineGorunum: "goster",
  onlineDersAyarlari: {},
  telafiGoster: true,
  gizliSecmeliGruplari: [],
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function readArray(key: string, fallback: string[]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : fallback;
  } catch {
    return fallback;
  }
}

export function useSecmeliler() {
  const [secili, setSecili] = useState<string[]>([]);
  const [gizli, setGizli] = useState<string[]>([]);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    const yukle = () => {
      setSecili(readArray(ELECTIVE_KEY, []));
      setGizli(readArray(GIZLI_KEY, []));
      setHazir(true);
    };
    yukle();
    window.addEventListener(BULUT_OLAY, yukle);
    return () => window.removeEventListener(BULUT_OLAY, yukle);
  }, []);

  const toggle = useCallback((id: string) => {
    setSecili((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem(ELECTIVE_KEY, JSON.stringify(next));
      kisiselKaydet();
      return next;
    });
  }, []);

  /** Aynı gruptan yalnızca bir seçmeli: grubun diğer derslerini kaldırıp bunu seçer. */
  const grupSec = useCallback((id: string, grupIdleri: string[]) => {
    setSecili((prev) => {
      const secili = prev.includes(id);
      const next = [...prev.filter((x) => !grupIdleri.includes(x)), ...(secili ? [] : [id])];
      window.localStorage.setItem(ELECTIVE_KEY, JSON.stringify(next));
      kisiselKaydet();
      return next;
    });
  }, []);

  /** Seçmeliyi görmezden gelmek istediğinde listeye hiç getirmemek için gizler. */
  const gizle = useCallback((id: string) => {
    setGizli((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      window.localStorage.setItem(GIZLI_KEY, JSON.stringify(next));
      kisiselKaydet();
      return next;
    });
    setSecili((prev) => {
      if (!prev.includes(id)) return prev;
      const next = prev.filter((x) => x !== id);
      window.localStorage.setItem(ELECTIVE_KEY, JSON.stringify(next));
      kisiselKaydet();
      return next;
    });
  }, []);

  const goster = useCallback((id: string) => {
    setGizli((prev) => {
      const next = prev.filter((x) => x !== id);
      window.localStorage.setItem(GIZLI_KEY, JSON.stringify(next));
      kisiselKaydet();
      return next;
    });
  }, []);

  return { secili, gizli, toggle, grupSec, gizle, goster, hazir };
}

export function useManuelAmfiler() {
  const [manuel, setManuel] = useState<Record<string, string>>({});

  useEffect(() => {
    const yukle = () => setManuel(read<Record<string, string>>(AMFI_KEY, {}));
    yukle();
    window.addEventListener(BULUT_OLAY, yukle);
    return () => window.removeEventListener(BULUT_OLAY, yukle);
  }, []);

  const ata = useCallback((key: string, amfi: string) => {
    setManuel((prev) => {
      const next = { ...prev, [key]: amfi };
      window.localStorage.setItem(AMFI_KEY, JSON.stringify(next));
      kisiselKaydet();
      return next;
    });
  }, []);

  return { manuel, ata };
}

export function useAyarlar() {
  const [ayarlar, setAyarlar] = useState<Ayarlar>(VARSAYILAN_AYARLAR);

  useEffect(() => {
    const yukle = () => setAyarlar(read<Ayarlar>(AYAR_KEY, VARSAYILAN_AYARLAR));
    yukle();
    window.addEventListener(BULUT_OLAY, yukle);
    window.addEventListener(AYAR_OLAY, yukle);
    return () => {
      window.removeEventListener(BULUT_OLAY, yukle);
      window.removeEventListener(AYAR_OLAY, yukle);
    };
  }, []);

  const guncelle = useCallback((p: Partial<Ayarlar> | ((prev: Ayarlar) => Partial<Ayarlar>)) => {
    setAyarlar((prev) => {
      const patch = typeof p === "function" ? p(prev) : p;
      const next = { ...prev, ...patch };
      window.localStorage.setItem(AYAR_KEY, JSON.stringify(next));
      kisiselKaydet();
      setTimeout(() => window.dispatchEvent(new Event(AYAR_OLAY)), 0);
      if (("donemId" in patch && patch.donemId !== prev.donemId) || ("dil" in patch && patch.dil !== prev.dil))
        setTimeout(() => void programiYenile(), 0);
      return next;
    });
  }, []);

  return { ayarlar, guncelle };
}

const VERI_KEY = "ders-takvim:yuklenen-veri";
export interface VeriMeta {
  yillikDosya?: string | undefined;
  amfiDosyalari?: string[] | undefined;
  uygulamaDosya?: string | undefined;
  ogrenciDosya?: string | undefined;
  secmeliDosya?: string | undefined;
}

export function useYuklenenVeri() {
  const [veri, setVeri] = useState<YuklenenVeri & VeriMeta>({ dersler: null, amfi: null });
  useEffect(() => {
    const yukle = () => setVeri(temizle(read(VERI_KEY, { dersler: null, amfi: null })));
    yukle();
    window.addEventListener("ders-takvim:veri", yukle);
    return () => window.removeEventListener("ders-takvim:veri", yukle);
  }, []);
  const kaydet = useCallback((patch: Partial<YuklenenVeri & VeriMeta>) => {
    const prev = read<YuklenenVeri & VeriMeta>(VERI_KEY, { dersler: null, amfi: null });
    window.localStorage.setItem(VERI_KEY, JSON.stringify({ ...prev, ...patch }));
    window.dispatchEvent(new Event("ders-takvim:veri"));
    const d = degisenAlanlar(patch);
    if (d.kisisel) kisiselKaydet();
    if (d.amfi) genelKaydet("amfi");
    if (d.secmeli) genelKaydet("secmeli");
  }, []);
  return { veri, kaydet };
}

/**
 * Amfi arşivi hafta hafta birikir (aynı Sheets bağlantısı her hafta güncellenir).
 * Yükleme sırasında her dosyanın yalnız asıl haftası alındığı için burada ayıklama yapılmaz;
 * eskiden "dosya başına tek hafta" filtresi bu haftanın kayıtlarını siliyordu.
 */
function temizle<T extends YuklenenVeri>(v: T): T {
  return v;
}
