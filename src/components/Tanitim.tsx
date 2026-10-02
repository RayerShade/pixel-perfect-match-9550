import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";

type Adim = { sayfa: "/" | "/dersler" | "/secmeliler" | "/destek" | "/ayarlar"; hedef: string; baslik: string; metin: string };

const ADIMLAR: Adim[] = [
  { sayfa: "/", hedef: "nav-/", baslik: "Takvim", metin: "Haftalık ders programın burada. Bir derse dokunarak saat, amfi ve hoca ayrıntılarını görebilir, derse girdiğini işaretleyebilirsin." },
  { sayfa: "/", hedef: "ekle", baslik: "Ders ekle", metin: "Bu + düğmesiyle istediğin gün ve saate kendi dersini ekleyebilirsin; haftalık, iki haftada bir veya aylık tekrarlatabilirsin." },
  { sayfa: "/", hedef: "pdf", baslik: "PDF indir", metin: "Görüntülediğin gün, hafta ya da ayın programını yazdırmaya hazır PDF olarak indir." },
  { sayfa: "/", hedef: "zil", baslik: "Bildirimler", metin: "Duyurular, destek cevapları ve programdaki değişiklikler buraya düşer. Okunmamış varsa kırmızı rozet görürsün." },
  { sayfa: "/dersler", hedef: "nav-/dersler", baslik: "Dersler", metin: "Bu sayfada tüm derslerin ve uygulamaların listelenir." },
  { sayfa: "/dersler", hedef: "dilim", baslik: "Dilimler ve devam", metin: "Dersler dilimlere, dilim içinde ana dallara ayrılır. Bir dilimin tüm derslerini ya da tek tek dersleri 'girdim' diye işaretleyebilirsin; bir dilimdeki teoriklerin en az %70'ine, uygulamaların en az %80'ine girmezsen o dilimden kalırsın; sınıra yaklaşınca uyarı alırsın." },
  { sayfa: "/secmeliler", hedef: "nav-/secmeliler", baslik: "Seçmeliler", metin: "Seçmeli derslerini buradan seçersin." },
  { sayfa: "/secmeliler", hedef: "secmeli-grup", baslik: "Seçmeli grupları", metin: "Her gruptan bir ders seç; seçtiğin ders her hafta takvimine otomatik eklenir. İstemediğin grubu takvimden gizleyebilirsin." },
  { sayfa: "/destek", hedef: "nav-/destek", baslik: "Destek", metin: "Sorun, öneri veya şikayetlerini buradan iletirsin." },
  { sayfa: "/destek", hedef: "yeni-talep", baslik: "Talep aç", metin: "Türünü seçip mesajını yaz. Cevap geldiğinde zilde bildirim görürsün ve konuşmaya buradan devam edersin." },
  { sayfa: "/ayarlar", hedef: "nav-/ayarlar", baslik: "Ayarlar", metin: "Hesabın ve takvim tercihlerin burada." },
  { sayfa: "/ayarlar", hedef: "ogrenci-bilgi", baslik: "Öğrenci bilgilerin", metin: "Adın, numaran, dönemin ve grubun öğrenci listesinden otomatik bulunur. Numaranı değiştirmek için destekten yazman gerekir." },
  { sayfa: "/ayarlar", hedef: "takvim-gorunum", baslik: "Takvim görünümü", metin: "Online dersleri, telafileri, hafta sonunu ve takvim saatlerini buradan gösterip gizleyebilirsin. Hepsi bu kadar, iyi dersler!" },
];

const ANAHTAR = "tur-adim";

function bul(h: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tur="${h}"]`));
  return els.find((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed") ?? null;
}

export function Tanitim() {
  const { guncelle } = useAyarlar();
  const nav = useNavigate();
  const yol = useLocation({ select: (l) => l.pathname });
  const [i, setIState] = useState(() => {
    const n = Number(typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ANAHTAR) : 0);
    return Number.isFinite(n) && n >= 0 && n < ADIMLAR.length ? n : 0;
  });
  const [kutu, setKutu] = useState<DOMRect | null>(null);
  const setI = (n: number) => { sessionStorage.setItem(ANAHTAR, String(n)); setKutu(null); setIState(n); };
  const bitir = () => { sessionStorage.removeItem(ANAHTAR); guncelle({ turGordu: true }); };
  const a = ADIMLAR[i]!;

  useEffect(() => {
    if (yol !== a.sayfa) { void nav({ to: a.sayfa }); return; }
    let iptal = false;
    let deneme = 0;
    let el: HTMLElement | null = null;
    const olc = () => { if (!iptal && el) setKutu(el.getBoundingClientRect()); };
    const ara = () => {
      if (iptal) return;
      el = bul(a.hedef);
      if (!el) {
        if (++deneme > 25) { if (i < ADIMLAR.length - 1) setI(i + 1); else bitir(); return; }
        t = setTimeout(ara, 150);
        return;
      }
      el.scrollIntoView({ block: el.offsetHeight > window.innerHeight * 0.5 ? "start" : "center" });
      setTimeout(olc, 250);
      olc();
    };
    let t = setTimeout(ara, 100);
    window.addEventListener("resize", olc);
    window.addEventListener("scroll", olc, true);
    return () => { iptal = true; clearTimeout(t); window.removeEventListener("resize", olc); window.removeEventListener("scroll", olc, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, yol]);

  if (!kutu) return <div className="fixed inset-0 z-[60] bg-foreground/50" />;
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.min(300, vw - 24);
  const pad = 6;
  const ust = Math.max(kutu.top, 0), alt = Math.min(kutu.bottom, vh);
  const altta = ust + (alt - ust) / 2 < vh / 2;
  const merkez = kutu.left + kutu.width / 2;
  const left = Math.max(12, Math.min(vw - W - 12, merkez - W / 2));
  const okLeft = Math.max(16, Math.min(W - 16, merkez - left));
  const konum = altta
    ? { top: Math.min(alt + pad + 12, vh - 220) }
    : { bottom: Math.min(vh - ust + pad + 12, vh - 220) };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Site tanıtımı">
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
        style={{ top: kutu.top - pad, left: kutu.left - pad, width: kutu.width + pad * 2, height: kutu.height + pad * 2, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 55%, transparent)" }}
      />
      <div className="absolute rounded-2xl border border-border bg-surface p-4 shadow-xl transition-all duration-300" style={{ width: W, left, ...konum }}>
        <span
          className="absolute h-3 w-3 rotate-45 border-border bg-surface"
          style={{ left: okLeft - 6, ...(altta ? { top: -7, borderLeftWidth: 1, borderTopWidth: 1 } : { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 }) }}
        />
        <p className="text-[11px] font-semibold text-primary">{i + 1} / {ADIMLAR.length}</p>
        <h3 className="mt-0.5 text-sm font-bold">{a.baslik}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.metin}</p>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={bitir} className="text-xs text-muted-foreground hover:text-foreground">Atla</button>
          <span className="flex-1" />
          {i > 0 ? <button onClick={() => setI(i - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Geri</button> : null}
          <button onClick={() => (i < ADIMLAR.length - 1 ? setI(i + 1) : bitir())} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            {i < ADIMLAR.length - 1 ? "İleri" : "Bitir"}
          </button>
        </div>
      </div>
    </div>
  );
}
