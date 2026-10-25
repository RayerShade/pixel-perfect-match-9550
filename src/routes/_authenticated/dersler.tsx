import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ogrenciBul, type DersOlayi } from "@/lib/schedule-data";
import { useAyarlar, useManuelAmfiler, useSecmeliler, useYuklenenVeri } from "@/lib/store";
import { useKatilim } from "@/lib/katilim";
import { ONLINE_DILIM, SECMELI_DILIM, kategoriHaritasi, type OlayTuru } from "@/lib/dilim";
import { devamHesapla, gecti, tumOlaylar, type DevamGrubu } from "@/lib/devam";

export const Route = createFileRoute("/_authenticated/dersler")({
  head: () => ({
    meta: [
      { title: "Dersler — Tıp Ders Programı" },
      { name: "description", content: "Dersler dilimlere ve anabilim dallarına göre; derse girdim işaretleme ve devam takibi." },
      { property: "og:title", content: "Dersler — Tıp Ders Programı" },
      { property: "og:description", content: "Dilim ve anabilim dalına göre dersler, uygulamalar ve devam durumu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dersler,
});

interface Dal {
  ad: string;
  tur: OlayTuru;
  konular: Map<string, DersOlayi[]>;
}
interface Dilim {
  ad: string;
  ilk: number;
  dallar: Map<string, Dal>;
}

function agacKur(olaylar: DersOlayi[]): Dilim[] {
  const m = new Map<string, Dilim>();
  const kat = kategoriHaritasi(olaylar);
  for (const o of olaylar) {
    const k = kat.get(o.key);
    if (!k) continue;
    const dl = m.get(k.dilim) ?? { ad: k.dilim, ilk: o.date.getTime(), dallar: new Map() };
    dl.ilk = Math.min(dl.ilk, o.date.getTime());
    m.set(k.dilim, dl);
    const id = `${k.tur}|${k.dal}`;
    const dal = dl.dallar.get(id) ?? { ad: k.dal, tur: k.tur, konular: new Map() };
    dl.dallar.set(id, dal);
    const konu = k.tur === "uygulama" ? k.dal : o.ders.courseName;
    dal.konular.set(konu, [...(dal.konular.get(konu) ?? []), o]);
  }
  const sira = (d: Dilim) => (d.ad === ONLINE_DILIM ? 1 : d.ad === SECMELI_DILIM ? 2 : 0);
  return [...m.values()].sort((a, b) => sira(a) - sira(b) || a.ilk - b.ilk);
}

const telafiDal = (d: { tur: OlayTuru; ad: string }) => d.tur === "uygulama" && /telafi/i.test(d.ad);
const bolumSira = (d: { tur: OlayTuru; ad: string }) => (d.tur === "ders" ? 0 : telafiDal(d) ? 2 : 1);

const kisaTarih = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });

/** Dilim başlığında yalnızca devam sayıları gösterilir; hak/kalma uyarısı yoktur. */
function DilimSatiri({ os, katilim, tur, devam }: { os: DersOlayi[]; katilim: Record<string, true>; tur: OlayTuru; devam?: DevamGrubu }) {
  if (!os.length) return null;
  const yapilan = os.filter((o) => gecti(o));
  const girilen = yapilan.filter((o) => katilim[o.key]).length;
  const ad = tur === "uygulama" ? "Uygulama" : "Teorik";
  const girdi = devam?.girilen ?? girilen;
  const kullanilan = devam ? devam.izinliDevamsizlik - devam.kalanHak : Math.max(0, yapilan.length - girilen);
  return <span className="block text-[11px] text-muted-foreground">{ad}: {girdi}/{yapilan.length} ({os.length}) girildi{devam?.toplam ? <span className="ml-1 font-semibold">· Yapılan devamsızlık: {kullanilan}</span> : null}</span>;
}
function dilimOlaylari(dl: Dilim, tur: OlayTuru) {
  return [...dl.dallar.values()].filter((d) => d.tur === tur).flatMap((d) => [...d.konular.values()].flat());
}
function Istatistik({ olaylar, katilim, devam }: { olaylar: DersOlayi[]; katilim: Record<string, true>; devam?: DevamGrubu }) {
  const yapilan = olaylar.filter((o) => gecti(o));
  const girilen = yapilan.filter((o) => katilim[o.key]).length;
  const girdi = devam?.girilen ?? girilen;
  const kullanilan = devam ? devam.izinliDevamsizlik - devam.kalanHak : Math.max(0, yapilan.length - girilen);
  return <span className="text-[11px] text-muted-foreground">{girdi}/{yapilan.length} ({olaylar.length}) girildi{devam?.toplam ? <span className="ml-1 font-semibold">· Devamsızlık {kullanilan}/{devam.izinliDevamsizlik}</span> : null}</span>;
}
function TopluTus({ olaylar, katilim, ayarla }: { olaylar: DersOlayi[]; katilim: Record<string, true>; ayarla: (k: string[], v: boolean) => void }) {
  const yapilan = olaylar.filter((o) => gecti(o));
  if (!yapilan.length) return null;
  const hepsi = yapilan.every((o) => katilim[o.key]);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        ayarla(yapilan.map((o) => o.key), !hepsi);
      }}
      className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold ${hepsi ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
    >
      {hepsi ? "✓ Tümüne girdim" : "Tümüne girdim"}
    </button>
  );
}

function Dersler() {
  const { veri } = useYuklenenVeri();
  const { ayarlar } = useAyarlar();
  const { secili } = useSecmeliler();
  const { manuel } = useManuelAmfiler();
  const { katilim, ayarla } = useKatilim();
  const [arama, setArama] = useState("");
  const [acik, setAcik] = useState<Set<string>>(new Set());
  const ac = (k: string) => setAcik((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const ogrenci = useMemo(() => ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle), [veri, ayarlar.ogrenciNo, ayarlar.grupElle]);
  const olaylar = useMemo(() => tumOlaylar(veri, secili, manuel, ogrenci, ayarlar), [veri, secili, manuel, ogrenci, ayarlar]);
  const agac = useMemo(() => agacKur(olaylar), [olaylar]);
  const devam = useMemo(() => devamHesapla(olaylar, katilim), [olaylar, katilim]);
  const devamBul = (dilim: string, tur: OlayTuru, dal?: string) => devam.find((x) => x.dilim === dilim && x.tur === tur && (!dal || x.dal === dal));
  const q = arama.toLocaleLowerCase("tr-TR").trim();
  const uyar = (s: string) => !q || s.toLocaleLowerCase("tr-TR").includes(q);

  return (
    <AppShell baslik="Dersler" aciklama="Dilim ve anabilim dalına göre · devam takibi">
      <div className="space-y-3">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Dilim, anabilim dalı, konu veya hoca ara…"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="px-1 text-[11px] text-muted-foreground">
          Geçmiş derslere katıldığını işaretleyebilir; dilim başlıklarında katılımını ve yapılan devamsızlık sayını görebilirsin.
        </p>
        {!agac.length ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Döneminin yıllık programı yüklendiğinde dersler burada görünür.
          </p>
        ) : null}
        {agac.map((dl) => {
          const dallar = [...dl.dallar.values()]
            .map((d) => ({ ...d, liste: [...d.konular.entries()].filter(([ad, os]) => uyar(`${dl.ad} ${d.ad} ${ad} ${os[0]?.ders.instructor ?? ""}`)) }))
            .filter((d) => d.liste.length && !telafiDal(d))
            .sort((a, b) => bolumSira(a) - bolumSira(b) || a.ad.localeCompare(b.ad, "tr"));
          if (!dallar.length) return null;
          const tumu = dallar.flatMap((d) => d.liste.flatMap(([, os]) => os));
          const acikDl = acik.has(dl.ad) || Boolean(q);
          let sonTur: string | null = null;
          return (
            <section key={dl.ad} data-tur="dilim" className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center gap-2 p-4">
                <button onClick={() => ac(dl.ad)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${acikDl ? "rotate-180" : ""}`} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                      <span className="truncate">{dl.ad}</span>
                    </p>
                    <DilimSatiri os={dilimOlaylari(dl, "ders").filter((o) => !/telafi|repeat|make[ -]?up/i.test(`${o.ders.courseName} ${o.ders.notes}`))} katilim={katilim} tur="ders" devam={dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM ? undefined : devamBul(dl.ad, "ders")} />
                    <DilimSatiri os={dilimOlaylari(dl, "uygulama").filter((o) => !/telafi|repeat|make[ -]?up/i.test(`${o.ders.courseName} ${o.ders.notes}`))} katilim={katilim} tur="uygulama" devam={dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM ? undefined : devamBul(dl.ad, "uygulama")} />
                  </div>
                </button>
                <TopluTus olaylar={tumu} katilim={katilim} ayarla={ayarla} />
              </div>
              {acikDl ? (
                <div className="space-y-2 border-t border-border px-3 pb-3 pt-3">
                  {dallar.map((d) => {
                    const dalKey = `${dl.ad}|${d.tur}|${d.ad}`;
                    const os = d.liste.flatMap(([, x]) => x);
                    const bolum = telafiDal(d) ? "telafi" : d.tur;
                    const baslikGoster = bolum !== sonTur;
                    sonTur = bolum;
                    return (
                      <div key={dalKey}>
                        {baslikGoster ? (
                          <p className="mb-1.5 mt-1 px-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                            {bolum === "telafi" ? "Telafi uygulamaları" : d.tur === "uygulama" ? "Uygulamalar" : "Teorik dersler"}
                          </p>
                        ) : null}
                        <div className="rounded-xl bg-accent/40">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <button onClick={() => ac(dalKey)} className="min-w-0 flex-1 text-left">
                              <p className="text-sm font-semibold">{d.ad}</p>
                              {(dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM) ? <Istatistik olaylar={os} katilim={katilim} devam={devamBul(dl.ad, d.tur, d.ad)} /> : null}
                            </button>
                            <TopluTus olaylar={os} katilim={katilim} ayarla={ayarla} />
                          </div>
                          {acik.has(dalKey) || q ? (
                            <ul className="space-y-1 px-2 pb-2">
                              {d.liste.map(([ad, konuOlaylari]) => (
                                <li key={ad} className="rounded-lg bg-surface px-3 py-2">
                                  <div className="flex items-start gap-2">
                                    <button onClick={() => ac(`${dalKey}|${ad}`)} className="min-w-0 flex-1 text-left">
                                      <p className="text-sm font-medium">{ad}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {[...new Set(konuOlaylari.map((o) => o.ders.instructor).filter(Boolean))].join(", ") || "—"}
                                        {(dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM) ? <> · {konuOlaylari.filter((o) => katilim[o.key]).length}/{konuOlaylari.filter((o) => gecti(o)).length} ({konuOlaylari.length}) girildi</> : null}
                                      </p>
                                    </button>
                                    <TopluTus olaylar={konuOlaylari} katilim={katilim} ayarla={ayarla} />
                                  </div>
                                  {acik.has(`${dalKey}|${ad}`) ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {[...konuOlaylari].sort((a, b) => a.date.getTime() - b.date.getTime() || a.ders.startTime.localeCompare(b.ders.startTime)).map((o) => {
                                        const gecmis = gecti(o);
                                        return (
                                          <label
                                            key={o.key}
                                            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${katilim[o.key] ? "border-primary bg-primary/10" : "border-border"} ${gecmis ? "cursor-pointer" : "opacity-50"}`}
                                          >
                                            <input
                                              type="checkbox"
                                              disabled={!gecmis}
                                              checked={Boolean(katilim[o.key])}
                                              onChange={(e) => ayarla([o.key], e.target.checked)}
                                              className="accent-primary"
                                            />
                                            {kisaTarih(o.date)} {o.ders.startTime}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
