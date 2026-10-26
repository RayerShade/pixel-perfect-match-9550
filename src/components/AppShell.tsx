import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { listedenOgrenciAdi } from "@/lib/bulut";
import { DuyuruBandi } from "@/components/DuyuruBandi";
import { BildirimZili } from "@/components/Bildirimler";
import { Tanitim } from "@/components/Tanitim";
import { NumaraBilgi, useNumaraSorgu } from "@/components/NumaraBilgi";

import { useAyarlar } from "@/lib/store";
import { CalendarDays, BookOpen, Settings, LifeBuoy, LogOut, ShieldCheck, Loader2, Info, UtensilsCrossed, GraduationCap } from "lucide-react";

const NAV = [
  { to: "/", label: "Takvim", icon: CalendarDays },
  { to: "/dersler", label: "Dersler", icon: BookOpen },
  { to: "/yemek", label: "Yemek", icon: UtensilsCrossed },
  { to: "/destek", label: "Destek", icon: LifeBuoy },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

export function AppShell({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama?: string;
  children: ReactNode;
}) {
  const { user, isAdmin, profil, hazir, cikis } = useAuth();
  const { ayarlar } = useAyarlar();
  const eksik = hazir && user && profil && !profil.ogrenci_no;
  const uyariGoster = hazir && user && profil && !eksik && !ayarlar.bilgilendirmeGordu;
  const turGoster = hazir && user && profil && !eksik && ayarlar.bilgilendirmeGordu && !ayarlar.turGordu;
  const ad = profil?.ad_soyad?.trim() || user?.email || "Öğrenci";
  const basHarf = ad.charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <div className="app-frame bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-30 px-2 pt-2 md:px-4 md:pt-3">
        <div className="ui-surface mx-auto grid max-w-[76rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-surface/90 px-3 py-2.5 backdrop-blur-xl md:flex md:justify-between md:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-teorik">İTF Takvim</p>
              <h1 className="truncate text-sm font-extrabold tracking-tight md:text-base">{baslik}</h1>
            </div>
          </div>

          <nav className="hidden items-center rounded-2xl bg-accent/70 p-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                data-tur={`nav-${to}`}
                activeOptions={{ exact: to === "/" }}
                className="ui-control flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground data-[status=active]:bg-surface data-[status=active]:text-primary data-[status=active]:shadow-sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <Link
                to="/admin"
                className="ui-control hidden items-center gap-1.5 rounded-xl bg-secmeli-soft px-3 py-2 text-sm font-bold text-altin md:flex"
                title="Admin paneli"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden lg:inline">Yönetim</span>
              </Link>
            ) : null}
            <span data-tur="zil" className="inline-flex"><BildirimZili /></span>
            <button
              onClick={() => void cikis()}
              title="Çıkış yap"
              aria-label="Çıkış yap"
              className="ui-control grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <span title={ad} className="hidden h-9 min-w-9 place-items-center rounded-xl bg-primary px-2 text-xs font-extrabold text-primary-foreground lg:grid">
              {basHarf}
            </span>
          </div>
        </div>
      </header>
      {!hazir ? (
        <div className="mx-auto mt-2 flex max-w-[76rem] items-center justify-center gap-2 rounded-xl bg-accent/70 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Hesabındaki veriler yükleniyor…
        </div>
      ) : null}
      {eksik ? <ProfilTamamla /> : null}
      {uyariGoster ? <Bilgilendirme /> : null}
      {turGoster ? <Tanitim /> : null}
      <DuyuruBandi />

      <main className="app-content mx-auto px-3 py-4 md:px-4 md:py-6">
        <section className="page-intro">
          <p className="page-intro__eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-pratik" /> İTF Takvim</p>
          <h2 className="page-intro__title">{baslik}</h2>
          {aciklama ? <p className="page-intro__description">{aciklama}</p> : null}
        </section>
        {children}
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/70 bg-surface/95 p-1.5 shadow-[0_12px_36px_oklch(0.2_0.04_250_/_0.18)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              data-tur={`nav-${to}`}
              activeOptions={{ exact: to === "/" }}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-muted-foreground data-[status=active]:bg-teorik-soft data-[status=active]:text-teorik"
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="truncate px-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ProfilTamamla() {
  const { profil, profilTamamla } = useAuth();
  const { ayarlar, guncelle } = useAyarlar();
  const [no, setNo] = useState(profil?.ogrenci_no ?? "");
  const [bekle, setBekle] = useState(false);
  const sorgu = useNumaraSorgu(no);
  void ayarlar;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!no.trim() || sorgu.sonuc?.kayitli) return;
          setBekle(true);
          guncelle({ ogrenciNo: no.trim() });
          const ad = profil?.ad_soyad || listedenOgrenciAdi(no.trim());
          await profilTamamla(ad, no.trim());
          setBekle(false);
        }}
        className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        <h2 className="text-base font-bold">Profilini tamamla</h2>
        <p className="text-xs text-muted-foreground">Devam etmek için öğrenci numaranı yaz. Dönemin, dilin ve adın öğrenci listelerinden otomatik bulunur.</p>
        <input required value={no} onChange={(e) => setNo(e.target.value)} placeholder="Öğrenci numarası" inputMode="numeric" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <NumaraBilgi sonuc={sorgu.sonuc} yukleniyor={sorgu.yukleniyor} />
        <button disabled={bekle || !no.trim() || !!sorgu.sonuc?.kayitli} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {bekle ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </div>
  );
}

const BILGILENDIRME_BEKLEME = 5;

const BILGILENDIRME_MADDELERI = [
  "Bu site İstanbul Üniversitesi'ne ait değildir; resmi bir uygulama değildir, gönüllü bir öğrenci projesidir.",
  "Takvimdeki bilgiler yüklenen program dosyalarından oluşturulur ve her zaman birebir doğru olmayabilir; kritik saat, derslik veya değişiklikler için resmi duyuruları takip et.",
  "İTF Takvim hâlâ geliştirme aşamasındadır. Problemlerini ve tavsiyelerini destek hattımıza iletebilirsin.",
];

function Bilgilendirme() {
  const { guncelle } = useAyarlar();
  const [kalan, setKalan] = useState(BILGILENDIRME_BEKLEME);
  useEffect(() => {
    if (kalan <= 0) return;
    const t = setTimeout(() => setKalan((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [kalan]);
  const acilabilir = kalan <= 0;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Info className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold">Hoş geldin!</h2>
        <ol className="list-decimal space-y-2 pl-5 text-left text-xs leading-relaxed text-muted-foreground">
          {BILGILENDIRME_MADDELERI.map((madde) => (
            <li key={madde}>{madde}</li>
          ))}
        </ol>
        <button
          disabled={!acilabilir}
          onClick={() => {
            if (acilabilir) guncelle({ bilgilendirmeGordu: true });
          }}
          className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {acilabilir ? "Anladım" : `Lütfen önce oku (${kalan})`}
        </button>
        <p className="text-[11px] text-muted-foreground">
          Bu pencere {BILGILENDIRME_BEKLEME} saniye boyunca kapatılamaz.
        </p>
      </div>
    </div>
  );
}
