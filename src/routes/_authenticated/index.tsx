import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AyGorunumu, GunGorunumu, HaftaGorunumu } from "@/components/CalendarViews";
import { DersDetay } from "@/components/DersDetay";
import { TUR_NOKTA } from "@/components/ders-stil";
import {
  DERS_TURU_ETIKET,
  ayinOlaylari,
  haftaninOlaylari,
  onlineFiltrele,
  ogrenciBul,
  type DersOlayi,
} from "@/lib/schedule-data";
import { addDays, formatLong, startOfWeek, weekLabel, AYLAR } from "@/lib/date-utils";
import { useAyarlar, useManuelAmfiler, useSecmeliler, useYuklenenVeri } from "@/lib/store";

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
const sonDurum: { imlec: Date | null; gorunum: Gorunum } = { imlec: null, gorunum: "hafta" };

function Takvim() {
  const [bugun] = useState(() => new Date());
  const [imlec, setImlec] = useState(() => sonDurum.imlec ?? new Date());
  const [gorunum, setGorunum] = useState<Gorunum>(() => sonDurum.gorunum);
  useEffect(() => {
    sonDurum.imlec = imlec;
    sonDurum.gorunum = gorunum;
  }, [imlec, gorunum]);
  const [secili, setSecili] = useState<DersOlayi | null>(null);

  const { secili: secmeliler } = useSecmeliler();
  const { manuel, ata } = useManuelAmfiler();
  const { ayarlar } = useAyarlar();
  const { veri } = useYuklenenVeri();

  const monday = useMemo(() => startOfWeek(imlec), [imlec]);
  const ogrenci = useMemo(() => ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle), [veri, ayarlar.ogrenciNo, ayarlar.grupElle]);
  const olaylar = useMemo(
    () =>
      onlineFiltrele(
        gorunum === "ay"
          ? ayinOlaylari(imlec, secmeliler, manuel, veri, ogrenci, ayarlar.gizliSecmeliGruplari ?? [])
          : haftaninOlaylari(monday, secmeliler, manuel, veri, ogrenci, ayarlar.gizliSecmeliGruplari ?? []),
        ayarlar.onlineGorunum ?? "goster",
        ayarlar.onlineDersAyarlari ?? {},
      ),
    [gorunum, imlec, monday, secmeliler, manuel, veri, ogrenci, ayarlar.onlineGorunum, ayarlar.onlineDersAyarlari, ayarlar.gizliSecmeliGruplari],
  );

  const bekleyen = olaylar.filter((o) => o.amfi === null).length;

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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-1">
            <button
              onClick={() => kaydir(-1)}
              aria-label="Önceki"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => kaydir(1)}
              aria-label="Sonraki"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-2 truncate text-sm font-bold sm:text-base">{baslik}</h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setImlec(new Date())}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              {gorunum === "gun" ? "Bugün" : gorunum === "hafta" ? "Bu hafta" : "Bu ay"}
            </button>
            <div className="flex rounded-lg border border-border p-0.5">
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
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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

        <div className="mt-4">
          {gorunum === "hafta" ? (
            <HaftaGorunumu
              monday={monday}
              olaylar={olaylar}
              onSec={setSecili}
              haftaSonu={ayarlar.haftaSonuGoster}
              baslangic={ayarlar.gunBaslangic}
              bitis={ayarlar.gunBitis}
              bugun={bugun}
            />
          ) : null}
          {gorunum === "gun" ? (
            <GunGorunumu gun={imlec} olaylar={olaylar} onSec={setSecili} bugun={bugun} />
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

      <DersDetay olay={secili} onClose={() => setSecili(null)} onAmfiSec={(k, a) => {
          ata(k, a);
          setSecili((s) => (s ? { ...s, amfi: a, kaynak: "manuel" } : s));
        }} />
    </AppShell>
  );
}
