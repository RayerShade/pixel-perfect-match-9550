import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TUR_SINIFI } from "@/components/ders-stil";
import { aktifDersler, DERS_TURU_ETIKET, type DersTuru } from "@/lib/schedule-data";
import { GUN_UZUN } from "@/lib/date-utils";
import { useSecmeliler } from "@/lib/store";

export const Route = createFileRoute("/dersler")({
  head: () => ({
    meta: [
      { title: "Dersler — Tıp Ders Programı" },
      {
        name: "description",
        content: "Dönem boyunca sabit kalan yıllık ders listesi, öğretim üyeleri ve saatleri.",
      },
      { property: "og:title", content: "Dersler — Tıp Ders Programı" },
      {
        property: "og:description",
        content: "Yıllık ders listesi: ders adı, öğretim üyesi, gün ve saat bilgisi.",
      },
    ],
  }),
  component: Dersler,
});

function Dersler() {
  const [filtre, setFiltre] = useState<DersTuru | "hepsi">("hepsi");
  const [arama, setArama] = useState("");
  const { secili } = useSecmeliler();

  const liste = useMemo(
    () =>
      aktifDersler(veri).filter((d) => !d.electiveId || secili.includes(d.electiveId))
        .filter((d) => filtre === "hepsi" || d.courseType === filtre)
        .filter(
          (d) =>
            d.courseName.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr")) ||
            d.instructor.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr")),
        )
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
    [filtre, arama, secili],
  );

  return (
    <AppShell baslik="Dersler" aciklama="Yıllık sabit ders programı">
      <div className="space-y-3">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Ders veya öğretim üyesi ara…"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(["hepsi", ...Object.keys(DERS_TURU_ETIKET)] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFiltre(k as DersTuru | "hepsi")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filtre === k
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:bg-accent"
              }`}
            >
              {k === "hepsi" ? "Tümü" : DERS_TURU_ETIKET[k as DersTuru]}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {liste.map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{d.courseName}</p>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TUR_SINIFI[d.courseType]}`}
                  >
                    {DERS_TURU_ETIKET[d.courseType]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {d.instructor} · Grup {d.group}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs">
                <p className="font-semibold">{GUN_UZUN[d.dayOfWeek - 1]}</p>
                <p className="text-muted-foreground">
                  {d.startTime} – {d.endTime}
                </p>
              </div>
            </div>
          ))}
          {liste.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Sonuç bulunamadı.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
