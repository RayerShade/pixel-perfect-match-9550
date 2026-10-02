import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BellOff, Bell, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ogrenciBul, type DersOlayi } from "@/lib/schedule-data";
import { useAyarlar, useManuelAmfiler, useSecmeliler, useYuklenenVeri } from "@/lib/store";
import { useKatilim } from "@/lib/katilim";
import { ONLINE_DILIM, SECMELI_DILIM, olayKategori, type OlayTuru } from "@/lib/dilim";
import { devamsizlikKaldi, devamsizlikUyari, gecti, kalanHak, tumOlaylar } from "@/lib/devam";

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
  for (const o of olaylar) {
    const k = olayKategori(o);
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

const kisaTarih = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });

/** Bir ders grubunun devamsızlık durumu: %30 üstü kalma, %20 üstü uyarı. */
type Tehlike = "kaldi" | "uyari" | "temiz";
function tehlikeHesapla(os: DersOlayi[], katilim: Record<string, true>): Tehlike {
  const yapilan = os.filter((o) => gecti(o));
  if (!yapilan.length) return "temiz";
  const kacan = yapilan.length - yapilan.filter((o) => katilim[o.key]).length;
  if (devamsizlikKaldi(kacan, os.length)) return "kaldi";
  return devamsizlikUyari(kacan, os.length) ? "uyari" : "temiz";
}
/** Dilimin tehlikesi: içindeki herhangi bir ana dal riskliyse işaret çıkar (dilimin kendi ortalaması değil). */
function dilimTehlike(dl: Dilim, katilim: Record<string, true>): Tehlike {
  let worst: Tehlike = "temiz";
  for (const d of dl.dallar.values()) {
    const t = tehlikeHesapla([...d.konular.values()].flat(), katilim);
    if (t === "kaldi") return "kaldi";
    if (t === "uyari") worst = "uyari";
  }
  return worst;
}

function Istatistik({ olaylar, katilim, tur, vurgu }: { olaylar: DersOlayi[]; katilim: Record<string, true>; tur?: OlayTuru; vurgu?: Tehlike }) {
  const yapilan = olaylar.filter((o) => gecti(o));
  const girilen = yapilan.filter((o) => katilim[o.key]).length;
  if (!yapilan.length) return <span className="text-[11px] text-muted-foreground">{olaylar.length} oturum · henüz başlamadı</span>;
  const kacan = yapilan.length - girilen;
  const oran = kacan / olaylar.length;
  const kaldi = Boolean(tur) && devamsizlikKaldi(kacan, olaylar.length);
  const uyari = Boolean(tur) && devamsizlikUyari(kacan, olaylar.length);
  const hak = kalanHak(kacan, olaylar.length);
  const renk = kaldi || vurgu === "kaldi" ? "font-semibold text-destructive" : uyari || vurgu === "uyari" ? "font-semibold text-bekliyor" : "text-muted-foreground";
  return (
    <span className={`text-[11px] ${renk}`}>
      {girilen}/{yapilan.length} girildi · devamsızlık {kacan}/{olaylar.length} (%{Math.round(oran * 100)})
      {tur
        ? kaldi
          ? " · 🚫 %30 aşıldı, bu dersten kaldın"
          : uyari
            ? ` · ⚠️ %20 aşıldı · %30 sınırına ${Math.max(hak, 0)} oturum kaldı`
            : ` · ${Math.max(hak, 0)} hak kaldı`
        : ""}
    </span>
  );
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
  const { katilim, ayarla, kapali, uyariKapat } = useKatilim();
  const [arama, setArama] = useState("");
  const [acik, setAcik] = useState<Set<string>>(new Set());
  const ac = (k: string) => setAcik((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const ogrenci = useMemo(() => ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle), [veri, ayarlar.ogrenciNo, ayarlar.grupElle]);
  const olaylar = useMemo(() => tumOlaylar(veri, secili, manuel, ogrenci, ayarlar), [veri, secili, manuel, ogrenci, ayarlar]);
  const agac = useMemo(() => agacKur(olaylar), [olaylar]);
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
          Bir dersin (dilimdeki anabilim dalı) oturumlarının %30'undan fazlasını kaçırırsan o dersten kalırsın; yani en az %70'ine girmen gerekir. Kaçırmalar %20'yi geçince uyarı alırsın — amaç %30'a varmadan fark etmen. Oran o dersin bütün oturumlarına göre hesaplanır.
        </p>
        {!agac.length ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Döneminin yıllık programı yüklendiğinde dersler burada görünür.
          </p>
        ) : null}
        {agac.map((dl) => {
          const dallar = [...dl.dallar.values()]
            .map((d) => ({ ...d, liste: [...d.konular.entries()].filter(([ad, os]) => uyar(`${dl.ad} ${d.ad} ${ad} ${os[0]?.ders.instructor ?? ""}`)) }))
            .filter((d) => d.liste.length)
            .sort((a, b) => (a.tur === b.tur ? a.ad.localeCompare(b.ad, "tr") : a.tur === "ders" ? -1 : 1));
          if (!dallar.length) return null;
          const tumu = dallar.flatMap((d) => d.liste.flatMap(([, os]) => os));
          const tehlike = dilimTehlike(dl, katilim);
          const acikDl = acik.has(dl.ad) || Boolean(q);
          const uyariKapali = kapali.includes(dl.ad);
          let sonTur: OlayTuru | null = null;
          return (
            <section key={dl.ad} data-tur="dilim" className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center gap-2 p-4">
                <button onClick={() => ac(dl.ad)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${acikDl ? "rotate-180" : ""}`} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold">
                      <span className="truncate">{dl.ad}</span>
                      {tehlike !== "temiz" ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            tehlike === "kaldi" ? "bg-destructive/15 text-destructive" : "bg-bekliyor/15 text-bekliyor"
                          }`}
                        >
                          {tehlike === "kaldi" ? "🚫 devamsızlık" : "⚠️ devamsızlık"}
                        </span>
                      ) : null}
                    </p>
                    <Istatistik olaylar={tumu} katilim={katilim} vurgu={tehlike} />
                  </div>
                </button>
                <button
                  onClick={() => uyariKapat(dl.ad, !uyariKapali)}
                  title={uyariKapali ? "Bu dilimin devamsızlık uyarılarını aç" : "Bu dilimin devamsızlık uyarılarını kapat"}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
                >
                  {uyariKapali ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                </button>
                <TopluTus olaylar={tumu} katilim={katilim} ayarla={ayarla} />
              </div>
              {acikDl ? (
                <div className="space-y-2 border-t border-border px-3 pb-3 pt-3">
                  {dallar.map((d) => {
                    const dalKey = `${dl.ad}|${d.tur}|${d.ad}`;
                    const os = d.liste.flatMap(([, x]) => x);
                    const baslikGoster = d.tur !== sonTur;
                    sonTur = d.tur;
                    return (
                      <div key={dalKey}>
                        {baslikGoster ? (
                          <p className="mb-1.5 mt-1 px-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                            {d.tur === "uygulama" ? "Uygulamalar" : "Teorik dersler"}
                          </p>
                        ) : null}
                        <div className="rounded-xl bg-accent/40">
                          <div className="flex items-center gap-2 px-3 py-2">
                            <button onClick={() => ac(dalKey)} className="min-w-0 flex-1 text-left">
                              <p className="text-sm font-semibold">{d.ad}</p>
                              <Istatistik olaylar={os} katilim={katilim} tur={d.tur} />
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
                                        {[...new Set(konuOlaylari.map((o) => o.ders.instructor).filter(Boolean))].join(", ") || "—"} ·{" "}
                                        {konuOlaylari.filter((o) => katilim[o.key]).length}/{konuOlaylari.length} girildi
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
