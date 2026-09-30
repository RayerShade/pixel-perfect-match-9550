import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { DuyuruBandi } from "@/components/DuyuruBandi";
import { DonemSecici, useDonemler } from "@/components/DonemSecici";
import { useAyarlar } from "@/lib/store";
import type { Dil } from "@/lib/program";
import { CalendarDays, BookOpen, ListChecks, Settings, LifeBuoy, LogOut, ShieldCheck, Loader2, Info } from "lucide-react";

const NAV = [
  { to: "/", label: "Takvim", icon: CalendarDays },
  { to: "/dersler", label: "Dersler", icon: BookOpen },
  { to: "/secmeliler", label: "Seçmeliler", icon: ListChecks },
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
  const { data: donemler = [] } = useDonemler();
  // Dönem sorulması için admin en az bir dönem eklemiş olmalı
  const donemEksik = donemler.length > 0 && (!ayarlar.donemId || !donemler.some((d) => d.id === ayarlar.donemId) || !ayarlar.dil);
  const eksik = hazir && user && profil && (!profil.ad_soyad || !profil.ogrenci_no || donemEksik);
  const uyariGoster = hazir && user && profil && !eksik && !ayarlar.bilgilendirmeGordu;
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/90 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 md:flex md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CalendarDays className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold md:text-lg">{baslik}</h1>
              {aciklama ? (
                <p className="truncate text-xs text-muted-foreground">{aciklama}</p>
              ) : null}
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-teorik-soft data-[status=active]:text-teorik"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 md:ml-2">
            {isAdmin ? (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-altin hover:bg-accent data-[status=active]:bg-accent"
                title="Admin paneli"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden lg:inline">Admin</span>
              </Link>
            ) : null}
            <span className="hidden max-w-[10rem] truncate px-1 text-xs text-muted-foreground lg:inline">
              {profil?.ad_soyad || user?.email}
            </span>
            <button
              onClick={() => void cikis()}
              title="Çıkış yap"
              aria-label="Çıkış yap"
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      {!hazir ? (
        <div className="flex items-center justify-center gap-2 bg-accent py-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Hesabındaki veriler yükleniyor…
        </div>
      ) : null}
      {eksik ? <ProfilTamamla /> : null}
      {uyariGoster ? <Bilgilendirme /> : null}
      <DuyuruBandi />

      <main className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-teorik"
            >
              <Icon className="h-5 w-5" />
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
  const [donemId, setDonemId] = useState(ayarlar.donemId ?? "");
  const [dil, setDil] = useState<Dil | "">(ayarlar.dil ?? "");
  const [ad, setAd] = useState(profil?.ad_soyad ?? "");
  const [no, setNo] = useState(profil?.ogrenci_no ?? "");
  const [bekle, setBekle] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ad.trim() || !no.trim() || !donemId || !dil) return;
          setBekle(true);
          guncelle({ donemId, dil });
          if (!profil?.ad_soyad || !profil?.ogrenci_no) await profilTamamla(ad.trim(), no.trim());
          setBekle(false);
        }}
        className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        <h2 className="text-base font-bold">Profilini tamamla</h2>
        <p className="text-xs text-muted-foreground">Devam etmek için bilgilerini, dönemini ve Türkçe / İngilizce seçimini yap.</p>
        <input required value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad soyad" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input required value={no} onChange={(e) => setNo(e.target.value)} placeholder="Öğrenci numarası" inputMode="numeric" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <DonemSecici donemId={donemId} dil={dil} onDegis={(a, b) => { setDonemId(a); setDil(b); }} />
        <button disabled={bekle || !donemId || !dil} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {bekle ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </div>
  );
}

const BILGILENDIRME_METNI =
  "Bu site İstanbul Üniversitesi'ne ait değildir, resmi bir uygulama değildir; gönüllü bir öğrenci projesidir. Takvimdeki bilgiler yüklenen program dosyalarından oluşturulur ve her zaman birebir doğru olmayabilir; kritik saat, derslik veya değişiklikler için resmi duyuruları takip et.";

function Bilgilendirme() {
  const { guncelle } = useAyarlar();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Info className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold">Hoş geldin!</h2>
        <p className="text-left text-xs leading-relaxed text-muted-foreground">{BILGILENDIRME_METNI}</p>
        <button
          onClick={() => guncelle({ bilgilendirmeGordu: true })}
          className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Anladım
        </button>
      </div>
    </div>
  );
}
