import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Microscope, Monitor, ChevronDown, Search } from "lucide-react";
import "@/styles/dersler.css";
import { SinifUygulamaTablosu } from "@/components/SinifUygulamaTablosu";
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
function DilimSatiri({ os, katilim, tur, devam }: { os: DersOlayi[]; katilim: Record<string, true>; tur: OlayTuru; devam?: DevamGrubu | undefined }) {
  if (!os.length) return null;
  const yapilan = os.filter((o) => gecti(o));
  const girilen = yapilan.filter((o) => katilim[o.key]).length;
  const ad = tur === "uygulama" ? "Uygulama" : "Teorik";
  const girdi = devam?.girilen ?? girilen;
  const kullanilan = devam ? devam.izinliDevamsizlik - devam.kalanHak : Math.max(0, yapilan.length - girilen);
  return <span className="st-stat">{ad}: {girdi}/{yapilan.length} ({os.length}) girildi{devam?.toplam ? <span className="ml-1 font-semibold">· Yapılan devamsızlık: {kullanilan}/{devam.izinliDevamsizlik}</span> : null}</span>;
}
function dilimOlaylari(dl: Dilim, tur: OlayTuru) {
  return [...dl.dallar.values()].filter((d) => d.tur === tur).flatMap((d) => [...d.konular.values()].flat());
}
function Istatistik({ olaylar, katilim, devam }: { olaylar: DersOlayi[]; katilim: Record<string, true>; devam?: DevamGrubu | undefined }) {
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
      className={`ui-control shrink-0 rounded-xl border px-2 py-1 text-[11px] font-semibold ${hepsi ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
    >
      {hepsi ? "✓ Tümüne girdim" : "Tümüne girdim"}
    </button>
  );
}

function aramaAnahtari(metin: string) {
  return metin.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
}

function Dersler() {
  const { veri } = useYuklenenVeri();
  const { ayarlar } = useAyarlar();
  const { secili } = useSecmeliler();
  const { manuel } = useManuelAmfiler();
  const { katilim, ayarla } = useKatilim();
  const [arama, setArama] = useState("");
  const [tercih, setAcik] = useState<Set<string> | null>(null);

  const ogrenci = useMemo(() => ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle), [veri, ayarlar.ogrenciNo, ayarlar.grupElle]);
  const olaylar = useMemo(() => tumOlaylar(veri, secili, manuel, ogrenci, ayarlar), [veri, secili, manuel, ogrenci, ayarlar]);
  const agac = useMemo(() => agacKur(olaylar), [olaylar]);
  const ilk = agac.find(dl => { const os = [...dl.dallar.values()].flatMap(d => [...d.konular.values()].flat()); return os.some(o => gecti(o)) && os.some(o => !gecti(o)); }) ?? agac[0];
  const acik = tercih ?? new Set([...(ilk ? [ilk.ad] : []), ONLINE_DILIM, SECMELI_DILIM]);
  const ac = (k: string) => { const next = new Set(acik); if (next.has(k)) next.delete(k); else next.add(k); setAcik(next); };
  const devam = useMemo(() => devamHesapla(olaylar, katilim), [olaylar, katilim]);
  const devamBul = (dilim: string, tur: OlayTuru, dal?: string) => devam.find((x) => x.dilim === dilim && x.tur === tur && (!dal || x.dal === dal));
  const q = aramaAnahtari(arama);
  const uyar = (s: string) => !q || aramaAnahtari(s).includes(q);
  const sonuclar = agac.map((dl) => {
    const dallar = [...dl.dallar.values()].filter((dal) => !telafiDal(dal)).map((dal) => {
      const liste = [...dal.konular.entries()].filter(([konu, oturumlar]) =>
        uyar(`${dl.ad} ${dal.ad} ${konu}`) || oturumlar.some((o) => uyar(o.ders.instructor || "")),
      );
      return { ...dal, liste };
    }).filter((dal) => dal.liste.length)
      .sort((a, b) => bolumSira(a) - bolumSira(b) || a.ad.localeCompare(b.ad, "tr"));
    return { dl, dallar };
  }).filter((sonuc) => sonuc.dallar.length);

  return (
    <AppShell baslik="Dersler ve Devam Takibi" aciklama={["İstanbul Tıp Fakültesi", ayarlar.donem, ayarlar.grup].filter(Boolean).join(" · ")}>
      <div className="curriculum-page">
        <div className="curriculum-search">
          <div className="curriculum-search-row"><label><Search size={17} aria-hidden="true" /><input type="search" aria-label="Derslerde ara" value={arama} onChange={e => setArama(e.target.value)} placeholder="Dilim, anabilim dalı, konu veya öğretim üyesi ara…" /></label><span>Toplam {agac.filter(d => d.ad !== ONLINE_DILIM && d.ad !== SECMELI_DILIM).length} dilim · {agac.filter(d => d.ad === ONLINE_DILIM || d.ad === SECMELI_DILIM).length} bağımsız alan</span></div>
          <p>Devamsızlık oranları kişisel takibin için sunulur. Başlamış oturumları işaretleyerek katılımını güncel tutabilirsin.</p>
        </div>
        {!agac.length ? (
          <p className="rounded-3xl border border-dashed border-border bg-surface/60 p-8 text-center text-sm text-muted-foreground">
            Döneminin yıllık programı yüklendiğinde dersler burada görünür.
          </p>
        ) : null}
        {q && <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-accent/50 px-4 py-2 text-sm">
          <span>{sonuclar.length ? `${sonuclar.length} ders grubu bulundu` : "Aramanla eşleşen ders bulunamadı."}</span>
          <button type="button" onClick={() => setArama("")} className="min-h-10 rounded-lg px-2 font-semibold hover:bg-accent">Aramayı temizle</button>
        </div>}
        {sonuclar.map(({ dl, dallar }) => {
          const tumu = dallar.flatMap((d) => d.liste.flatMap(([, os]) => os));
          const bagimsiz = dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM;
          const acikDl = acik.has(dl.ad) || Boolean(q);
          const tarihler = tumu.map(o => o.date.getTime());
          const tarihAraligi = `${kisaTarih(new Date(Math.min(...tarihler)))} – ${kisaTarih(new Date(Math.max(...tarihler)))}`;
          let sonTur: string | null = null;
          return (
            <section key={dl.ad} data-tur="dilim" className={`curriculum-module ${bagimsiz ? "curriculum-independent" : ""}`}>
              <div className="curriculum-module-header">
                <button aria-expanded={acikDl} onClick={() => ac(dl.ad)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  {bagimsiz ? <Monitor size={18} className="text-primary" /> : <ChevronDown className={`curriculum-chevron ${acikDl ? "rotate-180" : ""}`} />}
                  <div className="st-module-title min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                      <span>{dl.ad}</span>
                    </p>
                    <p className="curriculum-subtitle">{bagimsiz ? dl.ad === ONLINE_DILIM ? "Dilim dışı bağımsız uzaktan eğitim dersleri" : "Ayarlar’dan seçtiğin dönem seçmeli dersleri" : tarihAraligi}</p>
                  </div>
                </button>
                {!bagimsiz && <div className="curriculum-totals">
                    <DilimSatiri os={dilimOlaylari(dl, "ders").filter((o) => !/telafi|repeat|make[ -]?up/i.test(`${o.ders.courseName} ${o.ders.notes}`))} katilim={katilim} tur="ders" devam={dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM ? undefined : devamBul(dl.ad, "ders")} />
                    <DilimSatiri os={dilimOlaylari(dl, "uygulama").filter((o) => !/telafi|repeat|make[ -]?up/i.test(`${o.ders.courseName} ${o.ders.notes}`))} katilim={katilim} tur="uygulama" devam={dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM ? undefined : devamBul(dl.ad, "uygulama")} />

                </div>}
                {!bagimsiz && <TopluTus olaylar={tumu} katilim={katilim} ayarla={ayarla} />}
              </div>
              {acikDl ? (
                <div className="curriculum-module-body">
                  {dallar.map((d) => {
                    const dalKey = `${dl.ad}|${d.tur}|${d.ad}`;
                    const os = d.liste.flatMap(([, x]) => x);
                    const bolum = telafiDal(d) ? "telafi" : d.tur;
                    const baslikGoster = bolum !== sonTur;
                    sonTur = bolum;
                    return (
                      <div key={dalKey}>
                        {baslikGoster && !bagimsiz ? (
                          <p className={`curriculum-section-title ${d.tur === "uygulama" ? "is-practical" : ""}`}>
                            {d.tur === "uygulama" ? <Microscope size={18} /> : <BookOpen size={18} />}{d.tur === "uygulama" ? "Uygulama ve Laboratuvarlar" : "Teorik Dersler"}
                          </p>
                        ) : null}
                        <div className={`curriculum-department ${bagimsiz ? "is-independent" : ""}`}>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-sm font-semibold">{d.ad}</p>
                              {bagimsiz ? <Istatistik olaylar={os} katilim={katilim} devam={devamBul(dl.ad, d.tur, d.ad)} /> : null}
                            </div>
                            <TopluTus olaylar={os} katilim={katilim} ayarla={ayarla} />
                          </div>

                            <ul className="curriculum-topics">
                              {d.liste.map(([ad, konuOlaylari]) => (
                                <li key={ad} className="curriculum-topic">
                                  <div className="curriculum-topic-header">
                                    <button aria-expanded={Boolean(q) || (bagimsiz ? acik.has(`${dalKey}|${ad}`) : !acik.has(`${dalKey}|${ad}`))} onClick={() => ac(`${dalKey}|${ad}`)} className="min-w-0 flex-1 text-left">
                                      <p className="text-sm font-medium">{ad}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {[...new Set(konuOlaylari.map((o) => o.ders.instructor).filter(Boolean))].join(", ") || "—"}
                                        {(dl.ad === ONLINE_DILIM || dl.ad === SECMELI_DILIM) ? <> · {konuOlaylari.filter((o) => katilim[o.key]).length}/{konuOlaylari.filter((o) => gecti(o)).length} ({konuOlaylari.length}) girildi</> : null}
                                      </p>
                                    </button>
                                    <TopluTus olaylar={konuOlaylari} katilim={katilim} ayarla={ayarla} />
                                  </div>
                                  {(bagimsiz ? acik.has(`${dalKey}|${ad}`) : !acik.has(`${dalKey}|${ad}`)) || q ? (
                                    <div className="curriculum-sessions">
                                      {[...konuOlaylari].sort((a, b) => a.date.getTime() - b.date.getTime() || a.ders.startTime.localeCompare(b.ders.startTime)).map((o) => {
                                        const gecmis = gecti(o);
                                        return (
                                          <div key={o.key} className={`curriculum-session ${!gecmis ? "is-future" : ""}`}>
                                          <label
                                            className="curriculum-session-label"
                                          >
                                            <input
                                              type="checkbox"
                                              disabled={!gecmis}
                                              checked={Boolean(katilim[o.key])}
                                              onChange={(e) => ayarla([o.key], e.target.checked)}
                                              className="accent-primary"
                                            />
                                            <span className="curriculum-session-name">{o.ders.courseName}</span><span className="curriculum-session-meta">{kisaTarih(o.date)}, {o.ders.startTime} – {o.ders.endTime}{o.amfi ? ` · ${o.amfi}` : ""}</span><span className={`curriculum-status ${katilim[o.key] ? "is-attended" : ""}`}>{katilim[o.key] ? "Girildi" : gecmis ? "Girilmedi" : "İleri tarih"}</span>
                                          </label>
                                          {d.tur === "uygulama" ? <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${katilim[`telafi:${o.key}`] ? "border-primary bg-primary/10" : "border-border"}`}><input type="checkbox" checked={Boolean(katilim[`telafi:${o.key}`])} onChange={(e) => ayarla([`telafi:${o.key}`], e.target.checked)} className="accent-primary" />Telafi</label> : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
        <SinifUygulamaTablosu oturumlar={veri.uygulamalar} />
      </div>
    </AppShell>
  );
}



