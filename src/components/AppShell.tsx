import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { listedenOgrenciAdi } from "@/lib/bulut";
import { DuyuruBandi } from "@/components/DuyuruBandi";
import { BildirimZili } from "@/components/Bildirimler";
import { Tanitim } from "@/components/Tanitim";
import { NumaraBilgi, useNumaraSorgu } from "@/components/NumaraBilgi";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { useAyarlar } from "@/lib/store";
import { LogOut, ShieldCheck, Loader2, Info, Search } from "lucide-react";

import { AnaSayfaLogosu, NAV } from "@/components/Marka";

export function AppShell({
  baslik,
  aciklama,
  children,
  anaSayfa = false,
}: {
  baslik: string;
  aciklama?: string;
  children: ReactNode;
  anaSayfa?: boolean;
}) {
  const { user, isAdmin, profil, hazir, cikis } = useAuth();
  const { ayarlar } = useAyarlar();
  const eksik = hazir && user && profil && !profil.ogrenci_no;
  const uyariGoster = hazir && user && profil && !eksik && !ayarlar.bilgilendirmeGordu;
  const turGoster = hazir && user && profil && !eksik && ayarlar.bilgilendirmeGordu && !ayarlar.turGordu;
  const ad = profil?.ad_soyad?.trim() || user?.email || "Öğrenci";
  const basHarf = ad.charAt(0).toLocaleUpperCase("tr-TR");
  useEffect(() => {
    const tema = localStorage.getItem("itf-gorunum");
    if (tema) {
      document.documentElement.dataset.gorunum = tema;
      document.documentElement.classList.toggle("dark", tema === "night");
    }
  }, []);
  const navigate = useNavigate();
  const [hizliAcik, setHizliAcik] = useState(false);
  useEffect(() => {
    const kisayol = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHizliAcik((acik) => !acik);
      }
    };
    window.addEventListener("keydown", kisayol);
    return () => window.removeEventListener("keydown", kisayol);
  }, []);
  const git = (to: (typeof NAV)[number]["to"] | "/admin") => {
    setHizliAcik(false);
    void navigate({ to });
  };

  return (
    <div className="app-frame bg-background pb-24 xl:pb-0">
      <a href="#ana-icerik" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">İçeriğe geç</a>
      <header className="clinical-header sticky top-0 z-30">
        <div className="clinical-nav mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 xl:grid xl:grid-cols-[1fr_auto_1fr] md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AnaSayfaLogosu />
            <div className="min-w-0">
              <span className="brand-name">İTF Takvim</span>
            </div>
          </div>

          <nav className="student-tabs hidden items-center gap-1 xl:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                data-tur={`nav-${to}`}
                activeOptions={{ exact: true }}
                className="ui-control flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=active]:shadow-sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1.5">
            <button onClick={() => setHizliAcik(true)} aria-label="Hızlı gezinme" title="Hızlı gezinme (Ctrl / ⌘ K)" className="ui-control grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"><Search className="h-4 w-4" /></button>
            {isAdmin ? (
              <Link
                to="/admin"
                className="ui-control inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-secmeli-soft px-3 py-2 text-sm font-bold text-altin"
                aria-label="Yönetim panelini aç"
                title="Admin paneli"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden lg:inline">Yönetim</span>
              </Link>
            ) : null}
            {user && <><span data-tur="zil" className="inline-flex"><BildirimZili /></span>
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
            </span></>}
          </div>
        </div>
      </header>
      {!hazir ? (
        <div className="mx-auto mt-2 flex max-w-[76rem] items-center justify-center gap-2 rounded-xl bg-accent/70 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Hesabındaki veriler yükleniyor…
        </div>
      ) : null}
      {!anaSayfa && eksik ? <ProfilTamamla /> : null}
      {!anaSayfa && uyariGoster ? <Bilgilendirme /> : null}
      {!anaSayfa && turGoster ? <Tanitim /> : null}
      {user && <DuyuruBandi />}

      <main id="ana-icerik" tabIndex={-1} className="app-content mx-auto px-3 py-4 md:px-4 md:py-6">
        {!anaSayfa && <section className="page-intro">
          <h2 className="page-intro__title">{baslik}</h2>
          {aciklama ? <p className="page-intro__description">{aciklama}</p> : null}
        </section>}
        {children}
      </main>
      <CommandDialog open={hizliAcik} onOpenChange={setHizliAcik}>
        <DialogTitle className="sr-only">Hızlı gezinme</DialogTitle>
        <DialogDescription className="sr-only">Bir sayfa ara. Ok tuşlarıyla seç ve Enter ile aç.</DialogDescription>
        <CommandInput placeholder="Nereye gitmek istersin?" />
        <CommandList>
          <CommandEmpty>Bu isimde bir sayfa yok.</CommandEmpty>
          <CommandGroup heading="Sayfalar">
            {NAV.map(({ to, label, icon: Icon }) => <CommandItem key={to} value={label} onSelect={() => git(to)}><Icon className="mr-3 h-4 w-4" /><span>{label}</span></CommandItem>)}
          </CommandGroup>
          {isAdmin ? <CommandGroup heading="Yönetim"><CommandItem value="Admin yönetim paneli" onSelect={() => git("/admin")}><ShieldCheck className="mr-3 h-4 w-4" />Yönetim paneli</CommandItem></CommandGroup> : null}
        </CommandList>
      </CommandDialog>

      <nav aria-label="Ana gezinme" style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }} className="fixed inset-x-3 z-30 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-[0_12px_36px_oklch(0.2_0.04_250_/_0.18)] backdrop-blur-xl xl:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              data-tur={`nav-${to}`}
              activeOptions={{ exact: true }}
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
