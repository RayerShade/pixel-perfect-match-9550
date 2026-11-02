import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { uygulamaTelafiMi, type UygulamaOlayi } from "@/lib/schedule-data";

export function SinifUygulamaTablosu({ oturumlar }: { oturumlar?: UygulamaOlayi[] | null | undefined }) {
  const [acik, setAcik] = useState(false);
  const satirlar = useMemo(() => acik ? [...(oturumlar ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.ad.localeCompare(b.ad, "tr"),
  ) : [], [oturumlar, acik]);
  if (!oturumlar?.length) return null;

  return (
    <section className="workspace-panel overflow-hidden">
      <h2>
        <button type="button" aria-expanded={acik} onClick={() => setAcik(!acik)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-accent/40">
          <span>
            <span className="block font-bold">Sınıfımın uygulama tablosu</span>
            <span className="block text-xs font-normal text-muted-foreground">Tüm gruplar · {oturumlar.length} oturum</span>
          </span>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 ${acik ? "rotate-180" : ""}`} />
        </button>
      </h2>
      {acik && (
        <div role="region" aria-label="Sınıfın uygulama oturumları" tabIndex={0}
          className="max-h-[60vh] overflow-auto border-t border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Sınıfın tüm grupları için uygulama programı</caption>
            <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
              <tr>{["Tarih", "Saat", "Uygulama", "Grup", "Yer"].map((ad) =>
                <th key={ad} scope="col" className="px-3 py-2">{ad}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {satirlar.map((u) => (
                <tr key={u.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{u.date.split("-").reverse().join(".")}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{u.startTime}–{u.endTime}</td>
                  <td className="px-3 py-2"><strong>{u.ad}</strong><span className="block text-xs text-muted-foreground">{[u.dilim, u.hoca].filter(Boolean).join(" · ")}</span></td>
                  <td className="px-3 py-2">{uygulamaTelafiMi(u) ? "Tüm gruplar" : u.gruplar.join(", ") || "—"}</td>
                  <td className="px-3 py-2">{u.yer || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
