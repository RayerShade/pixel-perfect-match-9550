import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { aktifDersler, type Ders } from "@/lib/schedule-data";
import { useYuklenenVeri } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/dersler")({
  head: () => ({
    meta: [
      { title: "Dersler — Tıp Ders Programı" },
      { name: "description", content: "Yıllık programdaki dersler anabilim dallarına ve dilimlerine göre gruplanmış halde." },
      { property: "og:title", content: "Dersler — Tıp Ders Programı" },
      { property: "og:description", content: "Anabilim dalı ve dilime göre ders konuları, hocalar ve tarihler." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dersler,
});

const baslik = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("tr-TR"))
    .trim();

interface Konu {
  ad: string;
  hocalar: Set<string>;
  tarihler: string[];
}
type Agac = Map<string, Map<string, Map<string, Konu>>>; // anabilim dalı → dilim → konu

function agacKur(dersler: Ders[]): Agac {
  const agac: Agac = new Map();
  for (const d of dersler) {
    const bolum = d.notes.split(" · ")[0] ?? "";
    const i = bolum.indexOf("/");
    if (i < 0 || !bolum.slice(0, i).toLocaleLowerCase("tr-TR").includes("dilim")) continue;
    const dilim = baslik(bolum.slice(0, i));
    const dal = baslik(bolum.slice(i + 1).replace(/\s*-\s*$/, "")) || "Diğer";
    const dilimler = agac.get(dal) ?? new Map();
    agac.set(dal, dilimler);
    const konular: Map<string, Konu> = dilimler.get(dilim) ?? new Map();
    dilimler.set(dilim, konular);
    const k = konular.get(d.courseName) ?? { ad: d.courseName, hocalar: new Set(), tarihler: [] };
    if (d.instructor) k.hocalar.add(d.instructor);
    if (d.date) k.tarihler.push(d.date);
    konular.set(d.courseName, k);
  }
  return agac;
}

const kisaTarih = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

function Dersler() {
  const { veri } = useYuklenenVeri();
  const [arama, setArama] = useState("");
  const [acik, setAcik] = useState<string | null>(null);
  const agac = useMemo(() => agacKur(aktifDersler(veri)), [veri]);
  const q = arama.toLocaleLowerCase("tr-TR");

  const dallar = [...agac.entries()]
    .map(([dal, dilimler]) => {
      const f = [...dilimler.entries()]
        .map(([dilim, konular]) => {
          const l = [...konular.values()].filter(
            (k) => !q || `${dal} ${dilim} ${k.ad} ${[...k.hocalar].join(" ")}`.toLocaleLowerCase("tr-TR").includes(q),
          );
          return [dilim, l] as const;
        })
        .filter(([, l]) => l.length);
      return [dal, f] as const;
    })
    .filter(([, f]) => f.length)
    .sort((a, b) => a[0].localeCompare(b[0], "tr"));

  return (
    <AppShell baslik="Dersler" aciklama="Anabilim dalı ve dilime göre">
      <div className="space-y-3">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Anabilim dalı, konu veya hoca ara…"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {dallar.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {agac.size ? "Sonuç bulunamadı." : "Döneminin yıllık programı yüklendiğinde dersler burada görünür; yüklenmesini beklemek için programı yayınlayınca takvimi kontrol et."}
          </p>
        ) : null}
        {dallar.map(([dal, dilimler]) => {
          const ac = acik === dal || Boolean(q);
          const toplam = dilimler.reduce((n, [, l]) => n + l.length, 0);
          return (
            <section key={dal} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <button
                onClick={() => setAcik(acik === dal ? null : dal)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{dal}</p>
                  <p className="text-xs text-muted-foreground">
                    {dilimler.length} dilim · {toplam} konu
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${ac ? "rotate-180" : ""}`} />
              </button>
              {ac ? (
                <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
                  {dilimler.map(([dilim, konular]) => (
                    <div key={dilim}>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary">{dilim}</p>
                      <ul className="space-y-1.5">
                        {konular.map((k) => (
                          <li key={k.ad} className="rounded-xl bg-accent/50 px-3 py-2">
                            <p className="text-sm font-medium">{k.ad}</p>
                            <p className="text-xs text-muted-foreground">
                              {[...k.hocalar].join(", ") || "—"}
                              {k.tarihler.length ? ` · ${[...new Set(k.tarihler)].sort().map(kisaTarih).join(", ")}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
