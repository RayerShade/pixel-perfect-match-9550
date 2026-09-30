import { DersDuzenle } from "@/components/OzelDersler";
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

function AmfiSecici({
  olay,
  secenekler,
  onSec,
}: {
  olay: DersOlayi;
  secenekler: string[];
  onSec: (amfi: string) => void;
}) {
  const [acik, setAcik] = useState(false);
  const [ara, setAra] = useState("");
  useEffect(() => {
    setAcik(false);
    setAra("");
  }, [olay.key]);
  const secilemez = olay.amfi === "Seçmeliler sayfasından seç";
  const q = ara.toLocaleLowerCase("tr-TR");
  const liste = secenekler.filter((a) => a.toLocaleLowerCase("tr-TR").includes(q));
  return (
    <div className="border-b border-border/60 py-3">
      <button
        disabled={secilemez}
        onClick={() => setAcik((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Amfi / Sınıf{!secilemez ? " · değiştirmek için dokun" : ""}
          </p>
          <p
            className={`text-sm font-medium break-words ${
              olay.amfi === null ? "text-bekliyor" : ""
            }`}
          >
            {olay.amfi ?? "⚠️ Eşleşme bekliyor — seçmek için dokun"}
          </p>
        </div>
      </button>
      {acik ? (
        <div className="mt-2 rounded-xl border border-border bg-surface p-2">
          <input
            autoFocus
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Amfi ara…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            <span className="font-semibold text-altin">Altın renk</span>: bu dersin otomatik
            atanan amfisi
          </p>
          <div className="mt-1 max-h-56 overflow-y-auto">
            {liste.map((a) => {
              const oto = olay.kaynak === "haftalik" && a === olay.amfi;
              return (
                <button
                  key={a}
                  onClick={() => {
                    onSec(a);
                    setAcik(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${
                    oto ? "font-semibold text-altin" : ""
                  } ${a === olay.amfi ? "bg-accent font-bold" : ""}`}
                >
                  {a}
                </button>
              );
            })}
            {ara.trim() && !liste.includes(ara.trim()) ? (
              <button
                onClick={() => {
                  onSec(ara.trim());
                  setAcik(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-primary hover:bg-accent"
              >
                “{ara.trim()}” olarak kaydet
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
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
  const { veri } = useYuklenenVeri();
  const hafta = olay ? isoDate(startOfWeek(olay.date)) : "";
  const secenekler = olay ? amfiSecenekleri(veri, hafta) : [];

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
          <AmfiSecici
            olay={olay}
            secenekler={secenekler}
            onSec={(a) => onAmfiSec(olay.key, a)}
          />
          <Satir icon={Users} etiket="Grup" deger={olay.group} />
          <Satir icon={Tag} etiket="Dönem" deger={ders.semester} />
          <Satir icon={StickyNote} etiket="Notlar" deger={ders.notes || "—"} />
        </div>
        <DersDuzenle key={olay.key} olay={olay} onBitti={onClose} />

      </div>
    </div>
  );
}
