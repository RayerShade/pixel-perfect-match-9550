import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DERSLER, SECMELILER, secmeliGruplari, secmeliSaatleri, secmeliVeriVar } from "@/lib/schedule-data";
import { GUN_UZUN } from "@/lib/date-utils";
import { useAyarlar, useSecmeliler, useYuklenenVeri } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/secmeliler")({
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

interface Gizlenen {
  id: string;
  ad: string;
  alt: string;
}

function Secmeliler() {
  const { secili, gizli, toggle, grupSec, gizle, goster } = useSecmeliler();
  const { veri } = useYuklenenVeri();
  const { ayarlar, guncelle } = useAyarlar();
  const gizliGruplar = ayarlar.gizliSecmeliGruplari ?? [];
  const grupGizleToggle = (grup: number) =>
    guncelle({
      gizliSecmeliGruplari: gizliGruplar.includes(grup)
        ? gizliGruplar.filter((g) => g !== grup)
        : [...gizliGruplar, grup],
    });
  const gruplar = secmeliVeriVar(veri) ? secmeliGruplari(veri) : null;

  if (gruplar) {
    const saatler = secmeliSaatleri(veri);
    return (
      <AppShell baslik="Seçmeli Dersler" aciklama="Her gruptan bir seçmeli seç">
        <p className="mb-4 text-sm text-muted-foreground">
          Liste genel seçmeli programından, eksikler haftalık amfi dosyalarından alındı. Seçmeliler her hafta aynı saatte 3 grup halinde
          yapılır; her gruptan yalnızca bir ders seçebilirsin. Seçimin takvime otomatik eklenir. Bu dönem seçmeli almayacağın bir grubu
          göz simgesiyle gizleyebilirsin; o grubun saati takviminde hiç görünmez.
        </p>
        <div className="space-y-6">
          {saatler.map((saat, i) => {
            const grup = i + 1;
            const hepsi = gruplar.filter((g) => g.grup === grup);
            const ids = hepsi.map((d) => d.id);
            const secilen = hepsi.find((d) => secili.includes(d.id));
            const grupGizli = gizliGruplar.includes(grup);
            return (
              <section key={saat} data-tur="secmeli-grup" className={grupGizli ? "opacity-60" : undefined}>
                <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-bold">{grup}. Seçmeli · {saat}</h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {grupGizli ? "Takvimde gizli" : secilen ? `Seçildi: ${secilen.ad}` : "Henüz seçilmedi"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={() => grupGizleToggle(grup)}
                      title={grupGizli ? "Bu grubu takvimde göster" : "Bu grubu takvimde gizle"}
                      aria-label={`${grup}. seçmeli grubunu takvimde ${grupGizli ? "göster" : "gizle"}`}
                      className={`rounded-lg border p-2.5 transition-colors sm:p-1.5 ${
                        grupGizli
                          ? "border-foreground/30 bg-accent text-foreground"
                          : "border-border/70 bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {grupGizli ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {hepsi.length === 0 ? (
                  <p className="rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
                    Bu saatte seçmeli ders bulunamadı.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {hepsi.map((d) => {
                      const aktif = secili.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          role="radio"
                          aria-checked={aktif}
                          onClick={() => grupSec(d.id, ids)}
                          className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
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

  const gorunenler = SECMELILER.filter((s) => !gizli.includes(s.id));
  const gizlenenler: Gizlenen[] = SECMELILER.filter((s) => gizli.includes(s.id)).map((s) => ({
    id: s.id,
    ad: s.electiveName,
    alt: `${s.courseCode} · ${s.instructor}`,
  }));

  return (
    <AppShell baslik="Seçmeli Dersler" aciklama="Seçimini bir kez yap, takvime otomatik eklensin">
      <p className="mb-3 text-sm text-muted-foreground">
        Seçtiğin dersler haftalık takvimde otomatik olarak görünür. Her hafta yeniden
        seçmene gerek yoktur. Almayı düşünmediğin bir dersi göz simgesiyle gizleyebilirsin.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {gorunenler.map((s) => {
          const aktif = secili.includes(s.id);
          const ders = DERSLER.find((d) => d.electiveId === s.id);
          return (
            <div key={s.id} className="relative">
              <button
                onClick={() => toggle(s.id)}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-4 pr-11 text-left transition-colors ${
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
              <GizleDugmesi ad={s.electiveName} onClick={() => gizle(s.id)} />
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Seçili ders sayısı: <span className="font-semibold">{secili.length}</span>
      </p>
      <div className="mt-4">
        <Gizlenenler gizlenenler={gizlenenler} goster={goster} />
      </div>
    </AppShell>
  );
}

function GizleDugmesi({ ad, onClick }: { ad: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Bu seçmeliyi gizle"
      aria-label={`${ad} seçmelisini gizle`}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-border/70 bg-surface p-1.5 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      <EyeOff className="h-3.5 w-3.5" />
    </button>
  );
}

function Gizlenenler({ gizlenenler, goster }: { gizlenenler: Gizlenen[]; goster: (id: string) => void }) {
  if (!gizlenenler.length) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-4">
      <h2 className="font-display text-sm font-bold">Gizlenen seçmeliler</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Bu dersler listede görünmez; istediğinde geri getirebilirsin.
      </p>
      <ul className="mt-3 space-y-2">
        {gizlenenler.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm">{d.ad}</span>
              <span className="block truncate text-xs text-muted-foreground">{d.alt}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => goster(d.id)}>
              <Eye className="h-3.5 w-3.5" /> Göster
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
