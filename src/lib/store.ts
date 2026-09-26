import type { YuklenenVeri } from "./schedule-data";
import { useCallback, useEffect, useState } from "react";

const ELECTIVE_KEY = "ders-takvim:secmeliler";
const AMFI_KEY = "ders-takvim:manuel-amfi";
const AYAR_KEY = "ders-takvim:ayarlar";

export interface Ayarlar {
  ogrenciAdi: string;
  donem: string;
  grup: string;
  haftaSonuGoster: boolean;
  gunBaslangic: number;
  gunBitis: number;
}

export const VARSAYILAN_AYARLAR: Ayarlar = {
  ogrenciAdi: "Tıp Fakültesi Öğrencisi",
  donem: "2026 Güz — Dönem I",
  grup: "A / A-1",
  haftaSonuGoster: false,
  gunBaslangic: 8,
  gunBitis: 18,
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
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    setSecili(readArray(ELECTIVE_KEY, ["sec-etik", "sec-tarih"]));
    setHazir(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setSecili((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem(ELECTIVE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { secili, toggle, hazir };
}

export function useManuelAmfiler() {
  const [manuel, setManuel] = useState<Record<string, string>>({});

  useEffect(() => {
    setManuel(read<Record<string, string>>(AMFI_KEY, {}));
  }, []);

  const ata = useCallback((key: string, amfi: string) => {
    setManuel((prev) => {
      const next = { ...prev, [key]: amfi };
      window.localStorage.setItem(AMFI_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { manuel, ata };
}

export function useAyarlar() {
  const [ayarlar, setAyarlar] = useState<Ayarlar>(VARSAYILAN_AYARLAR);

  useEffect(() => {
    setAyarlar(read<Ayarlar>(AYAR_KEY, VARSAYILAN_AYARLAR));
  }, []);

  const guncelle = useCallback((patch: Partial<Ayarlar>) => {
    setAyarlar((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(AYAR_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { ayarlar, guncelle };
}

const VERI_KEY = "ders-takvim:yuklenen-veri";
export interface VeriMeta { yillikDosya?: string; amfiDosyalari?: string[] }

export function useYuklenenVeri() {
  const [veri, setVeri] = useState<YuklenenVeri & VeriMeta>({ dersler: null, amfi: null });
  useEffect(() => {
    const yukle = () => setVeri(read(VERI_KEY, { dersler: null, amfi: null }));
    yukle();
    window.addEventListener("ders-takvim:veri", yukle);
    return () => window.removeEventListener("ders-takvim:veri", yukle);
  }, []);
  const kaydet = useCallback((patch: Partial<YuklenenVeri & VeriMeta>) => {
    const prev = read<YuklenenVeri & VeriMeta>(VERI_KEY, { dersler: null, amfi: null });
    window.localStorage.setItem(VERI_KEY, JSON.stringify({ ...prev, ...patch }));
    window.dispatchEvent(new Event("ders-takvim:veri"));
  }, []);
  return { veri, kaydet };
}
