import { useQuery } from "@tanstack/react-query";
import { DIL_ETIKET, donemleriGetir, type Dil } from "@/lib/program";

export function useDonemler() {
  return useQuery({ queryKey: ["donemler"], queryFn: donemleriGetir, staleTime: 60_000 });
}

/** Önce dönem, sonra Türkçe / İngilizce seçimi. */
export function DonemSecici({
  donemId,
  dil,
  onDegis,
}: {
  donemId: string;
  dil: Dil | "";
  onDegis: (donemId: string, dil: Dil | "") => void;
}) {
  const { data: donemler = [], isLoading } = useDonemler();
  const girdi = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="space-y-2">
      <select className={girdi} value={donemId} onChange={(e) => onDegis(e.target.value, dil)} required>
        <option value="">{isLoading ? "Dönemler yükleniyor…" : donemler.length ? "Dönemini seç" : "Henüz dönem eklenmedi"}</option>
        {donemler.map((d) => (
          <option key={d.id} value={d.id}>
            {d.ad}
          </option>
        ))}
      </select>
      {donemId ? (
        <div className="grid grid-cols-2 gap-2">
          {(["tr", "en"] as const).map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => onDegis(donemId, d)}
              className={`rounded-lg border py-2 text-sm font-semibold ${dil === d ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
            >
              {DIL_ETIKET[d]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
