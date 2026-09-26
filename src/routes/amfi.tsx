import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { amfiSecenekleri, haftalikAmfiKayitlari } from "@/lib/schedule-data";
import { addDays, formatShort, isoDate, startOfWeek, weekLabel } from "@/lib/date-utils";
import { useManuelAmfiler, useYuklenenVeri } from "@/lib/store";
import { VeriYukleme } from "@/components/VeriYukleme";

export const Route = createFileRoute("/amfi")({
  head: () => ({
    meta: [
      { title: "Haftalık Amfi Programı — Tıp Ders Programı" },
      {
        name: "description",
        content:
          "Haftalık amfi dosyasından gelen sınıf ve amfi bilgilerini görüntüle, eşleşmeyen dersleri elle düzelt.",
      },
      { property: "og:title", content: "Haftalık Amfi Programı" },
      {
        property: "og:description",
        content: "Haftalık amfi listesi, eşleşme durumu ve manuel amfi atama.",
      },
    ],
  }),
  component: Amfi,
});


function Amfi() {
  const [imlec, setImlec] = useState(() => new Date());
  const monday = useMemo(() => startOfWeek(imlec), [imlec]);
  const mondayIso = isoDate(monday);
  const { manuel, ata } = useManuelAmfiler();
  const { veri } = useYuklenenVeri();

  const kayitlar = useMemo(() => haftalikAmfiKayitlari(mondayIso, veri), [mondayIso, veri]);
  const bekleyen = kayitlar.filter(
    (k) => k.status === "bekliyor" && !manuel[k.id],
  ).length;

  return (
    <AppShell baslik="Haftalık Amfi Programı" aciklama={weekLabel(monday)}>
      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface p-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              onClick={() => setImlec(addDays(monday, -7))}
              aria-label="Önceki hafta"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setImlec(addDays(monday, 7))}
              aria-label="Sonraki hafta"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="ml-2 truncate text-sm font-semibold">{weekLabel(monday)}</p>
          </div>
          <button
            onClick={() => setImlec(new Date())}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            Bu hafta
          </button>
        </div>

        <VeriYukleme />

        {bekleyen > 0 ? (
          <p className="rounded-xl bg-secmeli-soft px-3 py-2 text-xs font-medium text-bekliyor">
            ⚠️ Eşleşme bekliyor: {bekleyen} kayıt. Doğru amfiyi aşağıdan seçebilirsin.
          </p>
        ) : null}

        {kayitlar.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted-foreground">
            Bu hafta için yüklenmiş amfi kaydı yok.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {kayitlar.map((k) => {
            const manuelAmfi = manuel[k.id];
            const cozuldu = k.status === "eslesti" || Boolean(manuelAmfi);
            return (
              <div
                key={k.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 p-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{k.courseName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatShort(new Date(`${k.date}T00:00:00`))} · {k.startTime}{k.endTime ? `–${k.endTime}` : ""}
                    {k.group ? ` · Grup ${k.group}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {cozuldu ? (
                    <>
                      <p className="text-sm font-semibold">{manuelAmfi ?? k.amphitheater}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {manuelAmfi ? "Elle onaylandı" : `Eşleşti · %${Math.round(k.confidence * 100)}`}
                      </p>
                    </>
                  ) : (
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && ata(k.id, e.target.value)}
                      className="rounded-lg border border-bekliyor/50 bg-secmeli-soft px-2 py-1.5 text-xs font-semibold text-bekliyor"
                    >
                      <option value="">⚠️ Eşleşme bekliyor</option>
                      {amfiSecenekleri(veri, mondayIso).map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
