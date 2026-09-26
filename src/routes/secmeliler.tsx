import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DERSLER, SECMELILER } from "@/lib/schedule-data";
import { GUN_UZUN } from "@/lib/date-utils";
import { useSecmeliler } from "@/lib/store";

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
  const { secili, toggle } = useSecmeliler();

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
