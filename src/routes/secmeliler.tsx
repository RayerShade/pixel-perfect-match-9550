import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DERSLER, SECMELILER, secmeliGruplari, secmeliSaatleri } from "@/lib/schedule-data";
import { GUN_UZUN } from "@/lib/date-utils";
import { useSecmeliler, useYuklenenVeri } from "@/lib/store";

export const Route = createFileRoute("/secmeliler")({
  head: () => ({
    meta: [
      { title: "Seçmeli Dersler — Tıp Ders Programı" },
      {
        name: "description",
        content: "Seçmeli derslerini bir kez seç, takvimine otomatik olarak eklensin.",
      },
      { property: "og:title", content: "Seçmeli Dersler — Tıp Ders Programı" },
      {
        property: "og:description",
        content: "Seçmeli ders kartlarından seçimini yap; her hafta tekrar seçmene gerek yok.",
      },
    ],
  }),
  component: Secmeliler,
});

function Secmeliler() {
  const { secili, toggle, grupSec } = useSecmeliler();
  const { veri } = useYuklenenVeri();
  const gruplar = veri.secmeliOlaylari?.length ? secmeliGruplari(veri) : null;

  if (gruplar) {
    const saatler = secmeliSaatleri(veri);
    return (
      <AppShell baslik="Seçmeli Dersler" aciklama="Her gruptan bir seçmeli seç">
        <p className="mb-4 text-sm text-muted-foreground">
          Liste haftalık amfi dosyasından alındı. Seçmeliler her hafta aynı saatte 3 grup halinde
          yapılır; her gruptan yalnızca bir ders seçebilirsin. Seçimin takvime otomatik eklenir.
        </p>
        <div className="space-y-6">
          {saatler.map((saat, i) => {
            const grup = i + 1;
            const dersler = gruplar.filter((g) => g.grup === grup);
            const ids = dersler.map((d) => d.id);
            const secilen = dersler.find((d) => secili.includes(d.id));
            return (
              <section key={saat}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-base font-bold">{grup}. Seçmeli · {saat}</h2>
                  <span className="truncate text-xs text-muted-foreground">
                    {secilen ? `Seçildi: ${secilen.ad}` : "Henüz seçilmedi"}
                  </span>
                </div>
                {dersler.length === 0 ? (
                  <p className="rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
                    Bu saatte seçmeli ders bulunamadı.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {dersler.map((d) => {
                      const aktif = secili.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          role="radio"
                          aria-checked={aktif}
                          onClick={() => grupSec(d.id, ids)}
                          className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                            aktif ? "border-secmeli/60 bg-secmeli-soft" : "border-border bg-surface hover:bg-accent/40"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full border ${
                              aktif ? "border-secmeli bg-secmeli text-primary-foreground" : "border-border"
                            }`}
                          >
                            {aktif ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{d.ad}</span>
                            <span className="block truncate text-xs text-muted-foreground">{d.amfi}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell baslik="Seçmeli Dersler" aciklama="Seçimini bir kez yap, takvime otomatik eklensin">
      <p className="mb-3 text-sm text-muted-foreground">
        Seçtiğin dersler haftalık takvimde otomatik olarak görünür. Her hafta yeniden
        seçmene gerek yoktur.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECMELILER.map((s) => {
          const aktif = secili.includes(s.id);
          const ders = DERSLER.find((d) => d.electiveId === s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                aktif
                  ? "border-secmeli/60 bg-secmeli-soft"
                  : "border-border bg-surface hover:bg-accent/40"
              }`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  aktif ? "border-secmeli bg-secmeli text-primary-foreground" : "border-border"
                }`}
              >
                {aktif ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{s.electiveName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.courseCode} · {s.instructor}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{s.description}</span>
                {ders ? (
                  <span className="mt-2 block text-xs font-medium">
                    {GUN_UZUN[ders.dayOfWeek - 1]} {ders.startTime}–{ders.endTime} ·{" "}
                    {ders.defaultClassroom}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Seçili ders sayısı: <span className="font-semibold">{secili.length}</span>
      </p>
    </AppShell>
  );
}
