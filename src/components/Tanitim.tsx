import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";

type Sayfa = "/" | "/dersler" | "/destek" | "/ayarlar";
type Adim = { sayfa: Sayfa; hedef: string; baslik: string; metin: string };

const ADIMLAR: Adim[] = [
  { sayfa: "/", hedef: "nav-/", baslik: "Takvim", metin: "Haftalık ders programını burada görürsün. Bir derse dokunarak saat, amfi ve hoca ayrıntılarını açabilir; geçmiş dersleri girdiğin olarak işaretleyebilirsin." },
  { sayfa: "/", hedef: "ekle", baslik: "Kendi dersini ekle", metin: "+ düğmesiyle istediğin gün ve saate kişisel ders ekleyebilir; haftalık, iki haftada bir ya da aylık tekrarlatabilirsin." },
  { sayfa: "/", hedef: "pdf", baslik: "PDF indir", metin: "Görüntülediğin gün, hafta veya ayın programını yazdırmaya hazır PDF olarak indirebilirsin." },
  { sayfa: "/", hedef: "zil", baslik: "Bildirimler", metin: "Duyurular, destek cevapları ve program değişiklikleri burada görünür." },
  { sayfa: "/dersler", hedef: "nav-/dersler", baslik: "Dersler", metin: "Şimdi Dersler sekmesine kendin dokun. Bu sayfada derslerin ve uygulamaların dilimlere göre listelenir." },
  { sayfa: "/dersler", hedef: "dilim", baslik: "Dilim ayrıntıları", metin: "Bir dilime dokunarak ana dalları, teorikleri ve uygulamaları açabilirsin. Ana dallar ayrı ders değildir; devam hesabı dilimin toplamı üzerinden yapılır." },
  { sayfa: "/dersler", hedef: "dilim", baslik: "Devam ve telafi", metin: "Her dilimde teorikler için en az %70, uygulamalar için en az %80 katılım gerekir. Kalan devamsızlık hakkını burada görür; telafiye katıldıysan ayrıca işaretleyebilirsin." },
  { sayfa: "/ayarlar", hedef: "nav-/ayarlar", baslik: "Ayarlar", metin: "Ayarlar sekmesine kendin dokun. Takvim görünümünü, seçmelilerini ve hesabına ait tercihleri buradan yönetirsin." },
  { sayfa: "/ayarlar", hedef: "ogrenci-bilgi", baslik: "Öğrenci bilgilerin", metin: "Adın, numaran, dönemin ve grubun öğrenci listesinden otomatik bulunur. Numara değişikliği için destekten yazabilirsin." },
  { sayfa: "/ayarlar", hedef: "takvim-gorunum", baslik: "Takvim görünümü", metin: "Online dersleri, telafi kayıtlarını ve hafta sonunu buradan gösterip gizleyebilirsin." },
  { sayfa: "/ayarlar", hedef: "secmeli-ayarlari", baslik: "Seçmeliler", metin: "Seçmeli derslerini bu düğmeden açılan pencerede seçersin. Seçimin programına otomatik eklenir." },
  { sayfa: "/destek", hedef: "nav-/destek", baslik: "Destek", metin: "Destek sekmesine kendin dokun. Sorunlarını iletebilir veya öneri gönderebilirsin." },
];

const ANAHTAR = "tur-adim";
function bul(h: string) { return Array.from(document.querySelectorAll<HTMLElement>(`[data-tur="${h}"]`)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed") ?? null; }

export function Tanitim() {
  const { guncelle } = useAyarlar();
  const yol = useLocation({ select: (l) => l.pathname });
  const [i, setIState] = useState(() => { const n = Number(typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ANAHTAR) : 0); return Number.isFinite(n) && n >= 0 && n < ADIMLAR.length ? n : 0; });
  const [kutu, setKutu] = useState<DOMRect | null>(null);
  const setI = (n: number) => { sessionStorage.setItem(ANAHTAR, String(n)); setKutu(null); setIState(n); };
  const bitir = () => { sessionStorage.removeItem(ANAHTAR); guncelle({ turGordu: true }); };
  const a = ADIMLAR[i]!;
  const dogruSayfa = yol === a.sayfa;

  useEffect(() => {
    let iptal = false; let t: ReturnType<typeof setTimeout> | undefined; let el: HTMLElement | null = null;
    const olc = () => { if (!iptal && el) setKutu(el.getBoundingClientRect()); };
    const ara = () => { el = bul(a.hedef); if (!el) { t = setTimeout(ara, 150); return; } el.scrollIntoView({ block: el.offsetHeight > window.innerHeight * 0.5 ? "start" : "center" }); olc(); t = setTimeout(olc, 250); };
    t = setTimeout(ara, 100); window.addEventListener("resize", olc); window.addEventListener("scroll", olc, true);
    return () => { iptal = true; if (t) clearTimeout(t); window.removeEventListener("resize", olc); window.removeEventListener("scroll", olc, true); };
  }, [i, yol, a.hedef]);

  const vw = typeof window === "undefined" ? 0 : window.innerWidth, vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const W = Math.min(320, vw - 24);
  const r = kutu ?? new DOMRect(vw / 2 - 1, vh / 2 - 1, 2, 2);
  const merkez = r.left + r.width / 2, left = Math.max(12, Math.min(vw - W - 12, merkez - W / 2));
  const altta = r.top + r.height / 2 < vh / 2;
  const konum = altta ? { top: Math.min(r.bottom + 18, vh - 230) } : { bottom: Math.min(vh - r.top + 18, vh - 230) };

  return <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-label="Site tanıtımı">
    {kutu ? <div className="absolute rounded-xl ring-2 ring-primary transition-all duration-300" style={{ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 55%, transparent)" }} /> : <div className="absolute inset-0 bg-foreground/55" />}
    <div className="pointer-events-auto absolute rounded-2xl border border-border bg-surface p-4 shadow-xl" style={{ width: W, left, ...konum }}>
      <p className="text-[11px] font-semibold text-primary">{i + 1} / {ADIMLAR.length}</p><h3 className="mt-0.5 text-sm font-bold">{a.baslik}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.metin}</p>
      {!dogruSayfa ? <p className="mt-2 text-[11px] font-medium text-primary">Devam etmek için vurgulanan {a.baslik} sekmesine dokun.</p> : null}
      <div className="mt-3 flex items-center gap-2"><button onClick={bitir} className="text-xs text-muted-foreground hover:text-foreground">Atla</button><span className="flex-1" />{i > 0 ? <button onClick={() => setI(i - 1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Geri</button> : null}<button disabled={!dogruSayfa} onClick={() => i < ADIMLAR.length - 1 ? setI(i + 1) : bitir()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{i < ADIMLAR.length - 1 ? "İleri" : "Bitir"}</button></div>
    </div>
  </div>;
}