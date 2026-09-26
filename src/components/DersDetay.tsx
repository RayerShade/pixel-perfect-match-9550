import { X, Clock, User, MapPin, CalendarDays, Tag, StickyNote, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { DERS_TURU_ETIKET, amfiSecenekleri, type DersOlayi } from "@/lib/schedule-data";
import { useYuklenenVeri } from "@/lib/store";
import { GUN_UZUN, formatLong, isoDate, startOfWeek } from "@/lib/date-utils";
import { TUR_SINIFI } from "./ders-stil";


function Satir({
  icon: Icon,
  etiket,
  deger,
}: {
  icon: typeof Clock;
  etiket: string;
  deger: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{etiket}</p>
        <p className="text-sm font-medium break-words">{deger}</p>
      </div>
    </div>
  );
}

export function DersDetay({
  olay,
  onClose,
  onAmfiSec,
}: {
  olay: DersOlayi | null;
  onClose: () => void;
  onAmfiSec: (key: string, amfi: string) => void;
}) {
  const [secim, setSecim] = useState("");
  const { veri } = useYuklenenVeri();
  const secenekler = olay ? amfiSecenekleri(veri, isoDate(startOfWeek(olay.date))) : [];

  useEffect(() => {
    setSecim("");
  }, [olay?.key]);

  if (!olay) return null;
  const { ders } = olay;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        aria-label="Kapat"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-card sm:rounded-3xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${TUR_SINIFI[ders.courseType]}`}
            >
              {DERS_TURU_ETIKET[ders.courseType]}
            </span>
            <h2 className="mt-2 text-xl font-bold break-words">{ders.courseName}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <Satir icon={User} etiket="Öğretim Üyesi" deger={ders.instructor} />
          <Satir
            icon={CalendarDays}
            etiket="Tarih"
            deger={`${GUN_UZUN[ders.dayOfWeek - 1]}, ${formatLong(olay.date)}`}
          />
          <Satir
            icon={Clock}
            etiket="Ders Saati"
            deger={`${ders.startTime} – ${ders.endTime}`}
          />
          <Satir
            icon={MapPin}
            etiket="Amfi / Sınıf"
            deger={olay.amfi ?? "⚠️ Eşleşme bekliyor"}
          />
          <Satir icon={Users} etiket="Grup" deger={olay.group} />
          <Satir icon={Tag} etiket="Dönem" deger={ders.semester} />
          <Satir icon={StickyNote} etiket="Notlar" deger={ders.notes || "—"} />
        </div>

        {olay.amfi !== "Seçmeliler sayfasından seç" ? (
          <div
            className={`mt-4 rounded-2xl border p-4 ${olay.amfi === null ? "border-bekliyor/40 bg-secmeli-soft" : "border-border bg-accent/40"}`}
          >
            <p className={`text-sm font-semibold ${olay.amfi === null ? "text-bekliyor" : ""}`}>
              {olay.amfi === null ? "⚠️ Eşleşme bekliyor" : "Amfiyi değiştir"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {olay.amfi === null
                ? "Haftalık amfi programında bu ders güvenle eşleştirilemedi. Doğru amfiyi kendin seçebilirsin."
                : "Otomatik atanan amfi yanlışsa bu hafta için doğrusunu seçebilirsin."}
            </p>
            <div className="mt-3 flex gap-2">
              <select
                value={secim}
                onChange={(e) => setSecim(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Amfi seç…</option>
                {secenekler.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                disabled={!secim}
                onClick={() => {
                  onAmfiSec(olay.key, secim);
                  onClose();
                }}
                className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Kaydet
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
