import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { programPdfIndir } from "@/lib/pdf-indir";
import { AppShell } from "@/components/AppShell";
import { AyGorunumu, GunGorunumu, HaftaGorunumu } from "@/components/CalendarViews";
import { DersDetay } from "@/components/DersDetay";
import { OzelDersFormu, kisiselUygula } from "@/components/OzelDersler";
import { TUR_NOKTA } from "@/components/ders-stil";
import {
  DERS_TURU_ETIKET,
  ayinOlaylari,
  haftaninOlaylari,
  onlineFiltrele,
  ogrenciBul,
  type DersOlayi,
} from "@/lib/schedule-data";
import { addDays, isoDate, formatLong, sameDay, startOfWeek, weekLabel, AYLAR, GUN_KISA } from "@/lib/date-utils";
import { useAyarlar, useManuelAmfiler, useSecmeliler, useYuklenenVeri } from "@/lib/store";
import { useKatilim } from "@/lib/katilim";
import { devamHesapla, tumOlaylar } from "@/lib/devam";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Takvim — Tıp Ders Programı" },
      {
        name: "description",
        content:
          "Haftalık tıp fakültesi ders programını amfi bilgileriyle birlikte takip et.",
      },
      { property: "og:title", content: "Takvim — Tıp Ders Programı" },
      {
        property: "og:description",
        content: "Haftalık ders takvimi, seçmeli dersler ve güncel amfi bilgileri.",
      },
    ],
  }),
  component: Takvim,
});

type Gorunum = "gun" | "hafta" | "ay";

// Sayfalar arasında gezerken son bakılan tarih/görünüm korunur; uygulama yeniden açılınca bugüne döner.
const sonDurum: { imlec: Date | null; gorunum: Gorunum | null } = { imlec: null, gorunum: null };

function Takvim() {
  const [bugun] = useState(() => new Date());
  const [imlec, setImlec] = useState(() => sonDurum.imlec ?? new Date());
  const [gorunum, setGorunum] = useState<Gorunum>(() => sonDurum.gorunum ?? "hafta");
  // Telefonda ilk açılışta tek gün görünümü (haftalık görünüm dar ekranda sığmıyor).
  useEffect(() => {
    if (!sonDurum.gorunum && window.matchMedia("(max-width: 639px)").matches) setGorunum("gun");
  }, []);
  const dokunma = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    sonDurum.imlec = imlec;
    sonDurum.gorunum = gorunum;
  }, [imlec, gorunum]);
  const [secili, setSecili] = useState<DersOlayi | null>(null);
  const [ekle, setEkle] = useState(false);
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);

  const { secili: secmeliler } = useSecmeliler();
  const { manuel, ata } = useManuelAmfiler();
  const { ayarlar } = useAyarlar();
  const { veri } = useYuklenenVeri();

  const monday = useMemo(() => startOfWeek(imlec), [imlec]);
  const ogrenci = useMemo(() => ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle), [veri, ayarlar.ogrenciNo, ayarlar.grupElle]);
  const olaylar = useMemo(
    () =>
      kisiselUygula(
        onlineFiltrele(
          gorunum === "ay"
            ? ayinOlaylari(imlec, secmeliler, manuel, veri, ogrenci, ayarlar.gizliSecmeliGruplari ?? [], ayarlar.telafiGoster ?? true)
            : haftaninOlaylari(monday, secmeliler, manuel, veri, ogrenci, ayarlar.gizliSecmeliGruplari ?? [], ayarlar.telafiGoster ?? true),
          ayarlar.onlineGorunum ?? "goster",
          ayarlar.onlineDersAyarlari ?? {},
        ),
        gorunum === "ay" ? startOfWeek(new Date(imlec.getFullYear(), imlec.getMonth(), 1)) : monday,
        gorunum === "ay" ? addDays(new Date(imlec.getFullYear(), imlec.getMonth() + 1, 0), 7) : addDays(monday, 6),
        ayarlar,
      ),
    [gorunum, imlec, monday, secmeliler, manuel, veri, ogrenci, ayarlar],
  );

  const bekleyen = olaylar.filter((o) => o.amfi === null).length;
  const { katilim, ayarla, kapali } = useKatilim();
  const isaretle = (liste: DersOlayi[]) => {
    const bugunSonu = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate(), 23, 59);
    const uygun = liste.filter((o) => !o.ozelId && o.date.getTime() <= bugunSonu.getTime());
    if (!uygun.length) {
      toast.info("Henüz yapılmamış dersler işaretlenemez.");
      return;
    }
    const hepsi = uygun.every((o) => katilim[o.key]);
    ayarla(uygun.map((o) => o.key), !hepsi);
  };
  const gunIsaretle = (g: Date) => isaretle(olaylar.filter((o) => sameDay(o.date, g)));
  const { kalanlar, uyarilar } = useMemo(() => {
    const tum = tumOlaylar(veri, secmeliler, manuel, ogrenci, ayarlar);
    const gs = devamHesapla(tum, ayarlar.katilim ?? {}).filter((g) => !kapali.includes(g.dilim));
    return { kalanlar: gs.filter((g) => g.kaldi), uyarilar: gs.filter((g) => g.uyari && !g.kaldi) };
  }, [veri, secmeliler, manuel, ogrenci, ayarlar, kapali]);

  const kaydir = (yon: number) => {
    if (gorunum === "gun") setImlec((d) => addDays(d, yon));
    else if (gorunum === "hafta") setImlec((d) => addDays(d, 7 * yon));
    else setImlec((d) => new Date(d.getFullYear(), d.getMonth() + yon, 1));
  };

  const baslik =
    gorunum === "gun"
      ? formatLong(imlec)
      : gorunum === "hafta"
        ? weekLabel(monday)
        : `${AYLAR[imlec.getMonth()]} ${imlec.getFullYear()}`;

  return (
    <AppShell baslik="Ders Takvimi" aciklama={ayarlar.donem}>
      <div className="rounded-3xl border border-border bg-surface p-3 shadow-card md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-1">
            <button
              onClick={() => kaydir(-1)}
              aria-label="Önceki"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border sm:h-8 sm:w-8 sm:rounded-lg border-border hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => kaydir(1)}
              aria-label="Sonraki"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border sm:h-8 sm:w-8 sm:rounded-lg border-border hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-2 min-w-0 flex-1 truncate text-base font-bold">{baslik}</h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              disabled={pdfHazirlaniyor}
              onClick={async () => {
                setPdfHazirlaniyor(true);
                try {
                  const liste =
                    gorunum === "gun"
                      ? olaylar.filter((o) => sameDay(o.date, imlec))
                      : gorunum === "ay"
                        ? olaylar.filter((o) => o.date.getMonth() === imlec.getMonth() && o.date.getFullYear() === imlec.getFullYear())
                        : olaylar;
                  await programPdfIndir({
                    olaylar: liste,
                    baslik,
                    ogrenci: [ayarlar.ogrenciAdi, ayarlar.ogrenciNo].filter(Boolean).join(" — "),
                    donem: ayarlar.donem,
                    dosyaAdi: `ders-programi-${isoDate(gorunum === "hafta" ? monday : imlec)}.pdf`,
                  });
                } catch {
                  toast.error("PDF oluşturulamadı, tekrar dene.");
                } finally {
                  setPdfHazirlaniyor(false);
                }
              }}
              aria-label="PDF indir" data-tur="pdf"
              title="Görüntülenen programı PDF olarak indir"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50 sm:py-1.5 sm:text-xs"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{pdfHazirlaniyor ? "Hazırlanıyor…" : "PDF"}</span>
            </button>
            <button
              onClick={() => setImlec(new Date())}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent sm:py-1.5 sm:text-xs"
            >
              {gorunum === "gun" ? "Bugün" : gorunum === "hafta" ? "Bu hafta" : "Bu ay"}
            </button>
            <div className="flex flex-1 rounded-lg border border-border p-0.5 sm:flex-none">
              {(
                [
                  ["gun", "Gün"],
                  ["hafta", "Hafta"],
                  ["ay", "Ay"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setGorunum(v)}
                  className={`flex-1 rounded-md px-2.5 py-1.5 text-sm font-semibold sm:flex-none sm:py-1 sm:text-xs transition-colors ${
                    gorunum === v
                      ? "bg-teorik-soft text-teorik"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {bekleyen > 0 ? (
          <p className="mt-3 rounded-xl bg-secmeli-soft px-3 py-2 text-xs font-medium text-bekliyor">
            ⚠️ Bu dönemde {bekleyen} ders için amfi eşleşmesi bekleniyor. Dersin detayından
            amfiyi kendin seçebilirsin.
          </p>
        ) : null}

        {kalanlar.length ? (
          <Link to="/dersler" className="mt-3 block rounded-xl bg-destructive/15 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20">
            🚫 Devamsızlıktan kaldığın dilimler: {kalanlar.slice(0, 3).map((g) => `${g.dilim} (${g.dal})`).join(", ")}
            {kalanlar.length > 3 ? ` ve ${kalanlar.length - 3} tane daha` : ""} — teoriklerin %70'ine / uygulamaların %80'ine girmen gerekiyordu. Ayrıntı için dokun.
          </Link>
        ) : null}

        {uyarilar.length ? (
          <Link to="/dersler" className="mt-3 block rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/15">
            ⚠️ Devamsızlık: {uyarilar.slice(0, 3).map((g) => `${g.dilim} (${g.dal})`).join(", ")}
            {uyarilar.length > 3 ? ` ve ${uyarilar.length - 3} tane daha` : ""} — kalma sınırına yaklaşıyorsun (teorik en az %70, uygulama en az %80). Ayrıntı için dokun.
          </Link>
        ) : null}

        {gorunum === "hafta" ? (
          <div className="mt-3 flex justify-end">
            <button onClick={() => isaretle(olaylar)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              Tüm haftaya girdim olarak işaretle / kaldır
            </button>
          </div>
        ) : null}

        {gorunum === "gun" ? (
          <div className="mt-3 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((g, i) => {
              const sec = sameDay(g, imlec);
              const bu = sameDay(g, bugun);
              return (
                <button
                  key={i}
                  onClick={() => setImlec(g)}
                  className={`flex flex-col items-center rounded-xl py-1.5 text-xs transition-colors ${
                    sec ? "bg-primary text-primary-foreground" : bu ? "bg-teorik-soft text-teorik" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="font-medium">{GUN_KISA[i]}</span>
                  <span className="text-base font-bold">{g.getDate()}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className="mt-4"
          onTouchStart={(e) => { const t = e.touches[0]; if (t) dokunma.current = { x: t.clientX, y: t.clientY }; }}
          onTouchEnd={(e) => {
            const b = dokunma.current; const t = e.changedTouches[0]; dokunma.current = null;
            if (!b || !t || gorunum === "hafta") return;
            const dx = t.clientX - b.x; const dy = t.clientY - b.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) kaydir(dx < 0 ? 1 : -1);
          }}
        >
          {gorunum === "hafta" ? (
            <HaftaGorunumu
              monday={monday}
              olaylar={olaylar}
              onSec={setSecili}
              haftaSonu={ayarlar.haftaSonuGoster}
              baslangic={ayarlar.gunBaslangic}
              bitis={ayarlar.gunBitis}
              bugun={bugun}
              katilim={katilim}
              onGunIsaretle={gunIsaretle}
            />
          ) : null}
          {gorunum === "gun" ? (
            <GunGorunumu gun={imlec} olaylar={olaylar} onSec={setSecili} bugun={bugun} katilim={katilim} onGunIsaretle={gunIsaretle} />
          ) : null}
          {gorunum === "ay" ? (
            <AyGorunumu
              ay={imlec}
              olaylar={olaylar}
              bugun={bugun}
              onGunSec={(g) => {
                setImlec(g);
                setGorunum("gun");
              }}
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/70 pt-3">
          {Object.entries(DERS_TURU_ETIKET).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${TUR_NOKTA[k as keyof typeof TUR_NOKTA]}`} />
              {v}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => setEkle(true)}
        aria-label="Ders ekle" data-tur="ekle"
        title="Kendi dersini ekle"
        className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 md:bottom-8 md:right-8"
      >
        <Plus className="h-7 w-7" />
      </button>
      {ekle ? <OzelDersFormu varsayilanTarih={isoDate(imlec)} onClose={() => setEkle(false)} /> : null}
      <DersDetay olay={secili} onClose={() => setSecili(null)} onAmfiSec={(k, a) => {
          ata(k, a);
          setSecili((s) => (s ? { ...s, amfi: a, kaynak: "manuel" } : s));
        }} />
    </AppShell>
  );
}
