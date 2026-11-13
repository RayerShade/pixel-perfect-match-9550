import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
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
  type DersTuru,
} from "@/lib/schedule-data";
import { addDays, isoDate, formatLong, sameDay, startOfWeek, weekLabel, toMinutes, AYLAR, GUN_KISA } from "@/lib/date-utils";
import { useAyarlar, useManuelAmfiler, useSecmeliler, useYuklenenVeri } from "@/lib/store";
import { useKatilim } from "@/lib/katilim";


export const Route = createFileRoute("/_authenticated/takvim")({
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
  const [bugun, setBugun] = useState(() => new Date());
  useEffect(() => {
    const yenile = () => setBugun(new Date());
    const timer = window.setInterval(yenile, 60_000);
    window.addEventListener("focus", yenile);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", yenile); };
  }, []);
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
  const [onemliAcik, setOnemliAcik] = useState(false);

  const { secili: secmeliler } = useSecmeliler();
  const { manuel, ata } = useManuelAmfiler();
  const { ayarlar } = useAyarlar();
  const monday = useMemo(() => startOfWeek(imlec), [imlec]);
  const gorunenGunler = useMemo(
    () => Array.from({ length: ayarlar.haftaSonuGoster ? 7 : 5 }, (_, i) => addDays(monday, i)),
    [monday, ayarlar.haftaSonuGoster],
  );
  const { veri } = useYuklenenVeri();
  const ogrenci = useMemo(() => ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle), [veri, ayarlar.ogrenciNo, ayarlar.grupElle]);
  const [tur, setTur] = useState<DersTuru | "hepsi">("hepsi");
  const tumOlaylar = useMemo(
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

  const olaylar = tur === "hepsi" ? tumOlaylar : tumOlaylar.filter(o => o.ders.courseType === tur);
  const bekleyen = olaylar.filter((o) => o.amfi === null).length;
  const { katilim, ayarla } = useKatilim();
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

  const kaydir = (yon: number) => {
    if (gorunum === "gun") {
      setImlec((d) => {
        let sonraki = addDays(d, yon);
        while (!ayarlar.haftaSonuGoster && (sonraki.getDay() === 0 || sonraki.getDay() === 6)) sonraki = addDays(sonraki, yon);
        return sonraki;
      });
    } else if (gorunum === "hafta") setImlec((d) => addDays(d, 7 * yon));
    else setImlec((d) => new Date(d.getFullYear(), d.getMonth() + yon, 1));
  };

  const baslik =
    gorunum === "gun"
      ? formatLong(imlec)
      : gorunum === "hafta"
        ? weekLabel(monday, ayarlar.haftaSonuGoster)
        : `${AYLAR[imlec.getMonth()]} ${imlec.getFullYear()}`;
  const guncellemeZamani = (zaman?: string) =>
    zaman ? new Date(zaman).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "Henüz güncellenmedi";
  const bugununOlaylari = useMemo(
    () => {
      const hafta = startOfWeek(bugun);
      return kisiselUygula(
        onlineFiltrele(
          haftaninOlaylari(hafta, secmeliler, manuel, veri, ogrenci, ayarlar.gizliSecmeliGruplari ?? [], ayarlar.telafiGoster ?? true),
          ayarlar.onlineGorunum ?? "goster", ayarlar.onlineDersAyarlari ?? {},
        ),
        hafta, addDays(hafta, 6), ayarlar,
      ).filter((o) => sameDay(o.date, bugun)).sort((a, b) => a.ders.startTime.localeCompare(b.ders.startTime));
    },
    [bugun, secmeliler, manuel, veri, ogrenci, ayarlar],
  );
  const saatSimdi = new Date().toLocaleTimeString("tr-TR", {hour:"2-digit",minute:"2-digit"});
  const siradaki = bugununOlaylari.find(o => o.ders.startTime >= saatSimdi);
  const sinavlar = useMemo(() => tumOlaylar.filter((o) => o.ders.courseType === "sinav").sort((a, b) => a.date.getTime() - b.date.getTime() || a.ders.startTime.localeCompare(b.ders.startTime)), [tumOlaylar]);

  return (
    <AppShell baslik={gorunum === "hafta" ? "Haftalık Program" : gorunum === "ay" ? "Aylık Program" : "Günlük Program"} basligiIcerikte>
      <div className="schedule-workspace">
        <section className="schedule-toolbar">
        <div className="schedule-toolbar-row">
          <div className="schedule-period"><h1>{gorunum === "hafta" ? "Haftalık Program" : gorunum === "ay" ? "Aylık Program" : "Günlük Program"}</h1><div className="date-stepper">
            <button
              onClick={() => kaydir(-1)}
              aria-label="Önceki"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border sm:h-8 sm:w-8 sm:rounded-lg border-border hover:bg-accent ui-control"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="ml-2 min-w-0 flex-1 truncate text-base font-bold">{baslik}</h2>
            <button
              onClick={() => kaydir(1)}
              aria-label="Sonraki"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border sm:h-8 sm:w-8 sm:rounded-lg border-border hover:bg-accent ui-control"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            </div>
            <button className="today-button" onClick={() => setImlec(new Date())}>Bugün</button>
          </div>

          <div className="flex flex-wrap items-center gap-2">

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
              <span className="hidden sm:inline">{pdfHazirlaniyor ? "Hazırlanıyor…" : "PDF indir"}</span>
            </button>

            <div className="flex flex-1 rounded-xl border border-border bg-accent/40 p-1 sm:flex-none">
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

        <div className="schedule-filter-row"><div className="course-filters" aria-label="Ders türüne göre filtrele"><span>Filtrele</span><button aria-pressed={tur === "hepsi"} onClick={() => setTur("hepsi")}>Tüm Dersler ({tumOlaylar.length})</button>{(Object.keys(DERS_TURU_ETIKET) as DersTuru[]).map(key => <button key={key} aria-pressed={tur === key} onClick={() => setTur(key)}><i className={TUR_NOKTA[key]} />{{teorik:"Teorik",pratik:"Uygulama",secmeli:"Seçmeli",sinav:"Sınav",pbl:"PDÖ"}[key]}</button>)}</div>
        <span className="sync-label" title={"Amfi bilgisi: " + guncellemeZamani(veri.guncellemeler?.amfi)}>Program güncellemesi · {guncellemeZamani(veri.guncellemeler?.program)}</span></div></section>

        {bekleyen > 0 ? (
          <p className="mt-3 rounded-xl bg-secmeli-soft px-3 py-2 text-xs font-medium text-bekliyor">
            ⚠️ Bu dönemde {bekleyen} ders için amfi eşleşmesi bekleniyor. Dersin detayından
            amfiyi kendin seçebilirsin.
          </p>
        ) : null}




        {gorunum === "gun" ? <div className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl bg-accent/50 p-1.5 no-scrollbar" aria-label="Gün seçici">
          {gorunenGunler.map((g) => {
            const sec = sameDay(g, imlec);
            const bu = sameDay(g, bugun);
            const gunIndex = (g.getDay() + 6) % 7;
            const sayi = olaylar.filter((o) => sameDay(o.date, g)).length;
            return <button key={isoDate(g)} onClick={() => setImlec(g)} className={`ui-control relative flex min-w-[3.3rem] flex-1 flex-col items-center rounded-xl px-2 py-2 text-xs ${sec ? "bg-primary text-primary-foreground shadow-sm" : bu ? "bg-teorik-soft text-teorik" : "text-muted-foreground hover:bg-surface"}`}><span className="font-semibold">{GUN_KISA[gunIndex]}</span><span className="mt-0.5 text-lg font-extrabold">{g.getDate()}</span><span className={`mt-1 h-1.5 w-1.5 rounded-full ${sayi ? sec ? "bg-primary-foreground" : "bg-pratik" : "bg-transparent"}`} /></button>;
          })}
        </div> : null}

        <div className="st-calendar">
          <div className="st-brief">
            <section className="st-next"><div className="next-heading">{siradaki && <small><Clock3 size={13}/> Derse {Math.max(0,toMinutes(siradaki.ders.startTime)-toMinutes(saatSimdi))} dk var</small>}<b>Sıradaki Ders</b></div>{siradaki ? <button onClick={() => setSecili(siradaki)}><strong>{siradaki.ders.courseName}</strong><div className="next-details"><span><Clock3/>{siradaki.ders.startTime} – {siradaki.ders.endTime}</span><span><MapPin/>{siradaki.amfi || "Amfi bekleniyor"}</span>{siradaki.ders.instructor && <span><UserRound/>{siradaki.ders.instructor}</span>}</div></button> : <strong>Bugün başka ders yok</strong>}</section>
          <aside className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-teorik-soft text-teorik"><CalendarDays className="h-4 w-4" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Bugünün Dersleri · {bugununOlaylari.length} ders</p><h3 className="text-sm font-bold">{formatLong(bugun)}</h3></div></div>
            {bugununOlaylari.length ? <ol className="mt-3 space-y-2">{bugununOlaylari.map((o) => <li key={o.key}><button onClick={() => setSecili(o)} className="flex w-full gap-2 rounded-xl p-2 text-left transition hover:bg-accent"><span className="w-10 shrink-0 pt-0.5 text-[10px] font-bold text-muted-foreground">{o.ders.startTime}</span><span className="min-w-0 flex-1 border-l-2 border-teorik pl-2"><span className="block truncate text-xs font-bold">{o.ders.courseName}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{o.amfi ?? "Amfi bekleniyor"}</span></span></button></li>)}</ol> : <div className="mt-4 rounded-xl bg-accent/60 p-3 text-center"><Clock3 className="mx-auto h-4 w-4 text-muted-foreground" /><p className="mt-2 text-xs font-semibold">Bugün ders yok</p><p className="mt-1 text-[10px] text-muted-foreground">Bugünün ders programı burada görünür.</p></div>}
          </aside>

          </div>
          <div
            className="min-w-0 rounded-2xl border border-border/70 bg-background/30 p-2 sm:p-3"
            onTouchStart={(e) => { const t = e.touches[0]; if (t) dokunma.current = { x: t.clientX, y: t.clientY }; }}
            onTouchEnd={(e) => {
              const b = dokunma.current; const t = e.changedTouches[0]; dokunma.current = null;
              if (!b || !t || gorunum === "hafta") return;
              const dx = t.clientX - b.x; const dy = t.clientY - b.y;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) kaydir(dx < 0 ? 1 : -1);
            }}
          >
            {gorunum === "hafta" ? <HaftaGorunumu monday={monday} olaylar={olaylar} onSec={setSecili} haftaSonu={ayarlar.haftaSonuGoster} baslangic={ayarlar.gunBaslangic} bitis={ayarlar.gunBitis} bugun={bugun} katilim={katilim} onGunIsaretle={gunIsaretle} /> : null}
            {gorunum === "gun" ? <GunGorunumu gun={imlec} olaylar={olaylar} onSec={setSecili} bugun={bugun} katilim={katilim} onGunIsaretle={gunIsaretle} /> : null}
            {gorunum === "ay" ? <AyGorunumu ay={imlec} olaylar={olaylar} bugun={bugun} onGunSec={(g) => { setImlec(g); setGorunum("gun"); }} /> : null}
            {gorunum === "hafta" && <p className="schedule-total"><b>Toplam yük</b> {Number((olaylar.filter(o => gorunenGunler.some(g => sameDay(g,o.date))).reduce((acc,o)=>acc+toMinutes(o.ders.endTime)-toMinutes(o.ders.startTime),0)/60).toFixed(1)).toLocaleString("tr-TR")} saat / hafta</p>}
          </div>




        </div>
        <div className="schedule-actions"><button data-tur="ekle" className="secondary-action" onClick={()=>setEkle(true)}><Plus size={15}/> Ders ekle</button><button onClick={() => setOnemliAcik(true)} className="ui-control flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent sm:py-1.5 sm:text-xs" title="Sınavlar ve önemli tarihler"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Önemli tarihler</span></button>        {gorunum === "hafta" ? (
          <div className="mt-3 flex justify-end">
            <button onClick={() => isaretle(olaylar)} className="ui-control rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              Görünen derslerin katılımını değiştir
            </button>
          </div>
        ) : null}</div>
      </div>

      {onemliAcik ? <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setOnemliAcik(false)}><section className="w-full max-w-lg max-h-[min(42rem,calc(100dvh-2rem))] overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-3 border-b border-border pb-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-teorik">Akademik ajanda</p><h2 className="mt-1 text-lg font-bold">Sınavlar ve önemli tarihler</h2><p className="mt-1 text-xs text-muted-foreground">Görüntülenen zaman aralığındaki sınav kayıtları.</p></div><button className="rounded-xl p-2 hover:bg-accent" onClick={() => setOnemliAcik(false)} aria-label="Kapat">×</button></div>{sinavlar.length ? <ol className="mt-4 space-y-2">{sinavlar.map((o) => <li key={o.key}><button onClick={() => { setSecili(o); setOnemliAcik(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left hover:bg-accent"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secmeli-soft text-xs font-extrabold text-altin">{o.date.getDate()}<small className="text-[9px]">{AYLAR[o.date.getMonth()]?.slice(0, 3)}</small></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{o.ders.courseName}</b><span className="mt-0.5 block text-xs text-muted-foreground">{o.ders.startTime}–{o.ders.endTime}{o.amfi ? ` · ${o.amfi}` : ""}</span></span></button></li>)}</ol> : <div className="mt-4 rounded-2xl bg-accent/60 p-5 text-center text-sm text-muted-foreground">Bu zaman aralığında sınav kaydı yok.</div>}</section></div> : null}


      {ekle ? <OzelDersFormu varsayilanTarih={isoDate(imlec)} onClose={() => setEkle(false)} /> : null}
      <DersDetay olay={secili} onClose={() => setSecili(null)} onAmfiSec={(k, a) => {
          ata(k, a);
          setSecili((s) => (s ? { ...s, amfi: a, kaynak: "manuel" } : s));
        }} />
    </AppShell>
  );
}
