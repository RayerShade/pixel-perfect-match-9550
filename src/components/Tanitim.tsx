import { useEffect, useLayoutEffect, useState } from "react";
import { useAyarlar } from "@/lib/store";

const ADIMLAR = [
  { hedef: "nav-/", baslik: "Takvim", metin: "Haftalık ders programın burada. Bir derse dokunarak saat, amfi ve hoca ayrıntılarını görebilir, derse girdiğini işaretleyebilirsin." },
  { hedef: "ekle", baslik: "Ders ekle", metin: "Bu + düğmesiyle istediğin gün ve saate kendi dersini ekleyebilirsin; haftalık, iki haftada bir veya aylık tekrarlatabilirsin." },
  { hedef: "pdf", baslik: "PDF indir", metin: "Görüntülediğin gün, hafta ya da ayın programını yazdırmaya hazır PDF olarak indir." },
  { hedef: "zil", baslik: "Bildirimler", metin: "Duyurular, destek cevapları ve programdaki değişiklikler buraya düşer. Okunmamış varsa kırmızı rozet görürsün." },
  { hedef: "nav-/dersler", baslik: "Dersler", metin: "Derslerin dilim ve ana dallara göre listelenir. Devam durumunu buradan takip eder, toplu işaretleyebilirsin." },
  { hedef: "nav-/secmeliler", baslik: "Seçmeliler", metin: "Her gruptan bir seçmeli seç; seçtiğin ders her hafta takvimine otomatik eklenir." },
  { hedef: "nav-/destek", baslik: "Destek", metin: "Sorun, öneri veya şikayetlerini buradan ilet; cevaplar aynı sayfada görünür." },
  { hedef: "nav-/ayarlar", baslik: "Ayarlar", metin: "Online dersleri, telafileri, hafta sonunu ve takvim saatlerini buradan gösterip gizleyebilirsin." },
];

function bul(h: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tur="${h}"]`));
  return els.find((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed") ?? null;
}

export function Tanitim() {
  const { guncelle } = useAyarlar();
  const [i, setI] = useState(0);
  const [kutu, setKutu] = useState<DOMRect | null>(null);
  const adimlar = ADIMLAR;
  const bitir = () => guncelle({ turGordu: true });

  useLayoutEffect(() => {
    let iptal = false;
    const olc = () => {
      if (iptal) return;
      const el = bul(adimlar[i]!.hedef);
      if (!el) { setKutu(null); return; }
      setKutu(el.getBoundingClientRect());
    };
    const el = bul(adimlar[i]!.hedef);
    if (!el) {
      // Bu sayfada yoksa adımı atla
      if (i < adimlar.length - 1) setI(i + 1); else bitir();
      return;
    }
    el.scrollIntoView({ block: "nearest" });
    olc();
    window.addEventListener("resize", olc);
    window.addEventListener("scroll", olc, true);
    return () => { iptal = true; window.removeEventListener("resize", olc); window.removeEventListener("scroll", olc, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const t = setTimeout(() => { const el = bul(adimlar[i]!.hedef); if (el) setKutu(el.getBoundingClientRect()); }, 300);
    return () => clearTimeout(t);
  }, [i, adimlar]);

  if (!kutu) return null;
  const a = adimlar[i]!;
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.min(300, vw - 24);
  const altta = kutu.top + kutu.height / 2 < vh / 2;
  const merkez = kutu.left + kutu.width / 2;
  const left = Math.max(12, Math.min(vw - W - 12, merkez - W / 2));
  const okLeft = Math.max(16, Math.min(W - 16, merkez - left));
  const pad = 6;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Site tanıtımı">
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
        style={{ top: kutu.top - pad, left: kutu.left - pad, width: kutu.width + pad * 2, height: kutu.height + pad * 2, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 55%, transparent)" }}
      />
      <div
        className="absolute rounded-2xl border border-border bg-surface p-4 shadow-xl transition-all duration-300"
        style={{ width: W, left, ...(altta ? { top: kutu.bottom + pad + 12 } : { bottom: vh - kutu.top + pad + 12 }) }}
      >
        <span
          className="absolute h-3 w-3 rotate-45 border-border bg-surface"
          style={{ left: okLeft - 6, ...(altta ? { top: -7, borderLeftWidth: 1, borderTopWidth: 1 } : { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 }) }}
        />
        <p className="text-[11px] font-semibold text-primary">{i + 1} / {adimlar.length}</p>
        <h3 className="mt-0.5 text-sm font-bold">{a.baslik}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.metin}</p>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={bitir} className="text-xs text-muted-foreground hover:text-foreground">Atla</button>
          <span className="flex-1" />
          {i > 0 ? <button onClick={() => setI(i - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Geri</button> : null}
          <button
            onClick={() => (i < adimlar.length - 1 ? setI(i + 1) : bitir())}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {i < adimlar.length - 1 ? "İleri" : "Bitir"}
          </button>
        </div>
      </div>
    </div>
  );
}
