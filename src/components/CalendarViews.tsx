import type { DersOlayi } from "@/lib/schedule-data";
import {
  GUN_KISA,
  GUN_UZUN,
  addDays,
  isoDate,
  sameDay,
  startOfWeek,
  toMinutes,
  AYLAR,
} from "@/lib/date-utils";
import { TUR_NOKTA, TUR_SINIFI } from "./ders-stil";

const SAAT_YUKSEKLIGI = 62; // px per hour

/** Çakışan dersleri yan yana sütunlara yerleştirir (Google Takvim gibi). */
function yerlesim(olaylar: DersOlayi[]) {
  const sirali = [...olaylar].sort(
    (a, b) =>
      toMinutes(a.ders.startTime) - toMinutes(b.ders.startTime) ||
      toMinutes(b.ders.endTime) - toMinutes(a.ders.endTime),
  );
  const sonuc = new Map<string, { sutun: number; toplam: number }>();
  let kume: DersOlayi[] = [];
  let sutunSonlari: number[] = [];
  let kumeSonu = -1;
  const kapat = () => {
    kume.forEach((o) => (sonuc.get(o.key)!.toplam = sutunSonlari.length));
    kume = [];
    sutunSonlari = [];
  };
  for (const o of sirali) {
    const bas = toMinutes(o.ders.startTime);
    const son = toMinutes(o.ders.endTime);
    if (bas >= kumeSonu) kapat();
    let sutun = sutunSonlari.findIndex((e) => e <= bas);
    if (sutun === -1) {
      sutun = sutunSonlari.length;
      sutunSonlari.push(son);
    } else sutunSonlari[sutun] = son;
    sonuc.set(o.key, { sutun, toplam: 1 });
    kume.push(o);
    kumeSonu = Math.max(kumeSonu, son);
  }
  kapat();
  return sonuc;
}

function Blok({
  olay,
  onSec,
  kompakt,
  girdi,
}: {
  olay: DersOlayi;
  onSec: (o: DersOlayi) => void;
  kompakt?: boolean;
  girdi?: boolean;
}) {
  return (
    <button
      onClick={() => onSec(olay)}
      className={`flex h-full w-full flex-col overflow-hidden rounded-lg px-1.5 py-1 text-left transition-shadow hover:shadow-card ${TUR_SINIFI[olay.ders.courseType]}`}
    >
      <span className="truncate text-[11px] font-bold leading-tight sm:text-xs">
        {girdi ? "✓ " : ""}{olay.ders.courseName}
      </span>
      {!kompakt ? (
        <span className="truncate text-[10px] opacity-80">{olay.ders.instructor}</span>
      ) : null}
      <span className="truncate text-[10px] font-medium opacity-90">
        {olay.amfi ?? "⚠️ Eşleşme bekliyor"}
        {olay.kaynak === "yillik" && olay.amfi && !/online/i.test(olay.amfi) ? " · yıllık prog." : ""}
      </span>
      {!kompakt ? (
        <span className="mt-auto truncate text-[10px] opacity-70">
          {olay.ders.startTime} – {olay.ders.endTime}
        </span>
      ) : null}
    </button>
  );
}

function Izgara({
  gunler,
  olaylar,
  onSec,
  baslangic,
  bitis,
  bugun,
  katilim = {},
  onGunIsaretle,
}: {
  gunler: Date[];
  olaylar: DersOlayi[];
  onSec: (o: DersOlayi) => void;
  baslangic: number;
  bitis: number;
  bugun: Date;
  katilim?: Record<string, true>;
  onGunIsaretle?: (g: Date) => void;
}) {
  const saatler = Array.from({ length: bitis - baslangic }, (_, i) => baslangic + i);
  const yukseklik = saatler.length * SAAT_YUKSEKLIGI;

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="min-w-[640px]">
        <div
          className="grid border-b border-border/70"
          style={{ gridTemplateColumns: `48px repeat(${gunler.length}, minmax(0,1fr))` }}
        >
          <div />
          {gunler.map((g) => {
            const aktif = sameDay(g, bugun);
            return (
              <div key={isoDate(g)} className="px-1 pb-2 text-center">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {gunler.length > 3 ? GUN_KISA[(g.getDay() + 6) % 7] : GUN_UZUN[(g.getDay() + 6) % 7]}
                </p>
                <p
                  className={`mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${
                    aktif ? "bg-bugun text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {g.getDate()}
                </p>
                {onGunIsaretle && olaylar.some((o) => sameDay(o.date, g)) ? (
                  <button
                    onClick={() => onGunIsaretle(g)}
                    title="Bu günün tüm derslerine girdim olarak işaretle / kaldır"
                    className="mt-1 rounded-md px-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {olaylar.filter((o) => sameDay(o.date, g)).every((o) => katilim[o.key]) ? "✓ Girdim" : "Günü işaretle"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `48px repeat(${gunler.length}, minmax(0,1fr))`,
            height: yukseklik,
          }}
        >
          <div className="relative">
            {saatler.map((s, i) => (
              <div
                key={s}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                style={{ top: i * SAAT_YUKSEKLIGI }}
              >
                {String(s).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {gunler.map((g) => {
            const gunOlaylari = olaylar.filter((o) => sameDay(o.date, g));
            const yer = yerlesim(gunOlaylari);
            return (
              <div
                key={isoDate(g)}
                className={`relative border-l border-border/70 ${
                  sameDay(g, bugun) ? "bg-teorik-soft/35" : ""
                }`}
              >
                {saatler.map((s, i) => (
                  <div
                    key={s}
                    className="absolute inset-x-0 border-t border-border/50"
                    style={{ top: i * SAAT_YUKSEKLIGI }}
                  />
                ))}
                {gunOlaylari.map((o) => {
                  const top =
                    ((toMinutes(o.ders.startTime) - baslangic * 60) / 60) * SAAT_YUKSEKLIGI;
                  const h =
                    ((toMinutes(o.ders.endTime) - toMinutes(o.ders.startTime)) / 60) *
                    SAAT_YUKSEKLIGI;
                  const { sutun, toplam } = yer.get(o.key) ?? { sutun: 0, toplam: 1 };
                  return (
                    <div
                      key={o.key}
                      className="absolute px-0.5"
                      style={{
                        top,
                        height: Math.max(h - 2, 26),
                        left: `calc(${(sutun / toplam) * 100}% + 2px)`,
                        width: `calc(${100 / toplam}% - 4px)`,
                      }}
                    >
                      <Blok olay={o} onSec={onSec} kompakt={h < 56} girdi={Boolean(katilim[o.key])} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HaftaGorunumu({
  monday,
  olaylar,
  onSec,
  haftaSonu,
  baslangic,
  bitis,
  bugun,
  katilim,
  onGunIsaretle,
}: {
  monday: Date;
  olaylar: DersOlayi[];
  onSec: (o: DersOlayi) => void;
  haftaSonu: boolean;
  baslangic: number;
  bitis: number;
  bugun: Date;
  katilim?: Record<string, true>;
  onGunIsaretle?: (g: Date) => void;
}) {
  const gunSayisi = haftaSonu ? 7 : 5;
  const gunler = Array.from({ length: gunSayisi }, (_, i) => addDays(monday, i));
  return (
    <Izgara
      gunler={gunler}
      olaylar={olaylar}
      onSec={onSec}
      baslangic={baslangic}
      bitis={bitis}
      bugun={bugun}
      katilim={katilim}
      onGunIsaretle={onGunIsaretle}
    />
  );
}

export function GunGorunumu({
  gun,
  olaylar,
  onSec,
  bugun,
  katilim = {},
  onGunIsaretle,
}: {
  gun: Date;
  olaylar: DersOlayi[];
  onSec: (o: DersOlayi) => void;
  bugun: Date;
  katilim?: Record<string, true>;
  onGunIsaretle?: (g: Date) => void;
}) {
  const gunOlaylari = olaylar
    .filter((o) => sameDay(o.date, gun))
    .sort((a, b) => toMinutes(a.ders.startTime) - toMinutes(b.ders.startTime));

  if (gunOlaylari.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Bu gün için ders bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {GUN_UZUN[(gun.getDay() + 6) % 7]}
          {sameDay(gun, bugun) ? " · Bugün" : ""}
        </p>
        {onGunIsaretle ? (
          <button onClick={() => onGunIsaretle(gun)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent">
            {gunOlaylari.every((o) => katilim[o.key]) ? "✓ Tüm güne girdim" : "Tüm günü işaretle"}
          </button>
        ) : null}
      </div>
      {gunOlaylari.map((o) => (
        <button
          key={o.key}
          onClick={() => onSec(o)}
          className="grid w-full grid-cols-[56px_minmax(0,1fr)] items-stretch gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-card/50 transition-colors hover:bg-accent/40"
        >
          <div className="text-xs font-semibold text-muted-foreground">
            <p className="text-foreground">{o.ders.startTime}</p>
            <p>{o.ders.endTime}</p>
          </div>
          <div className={`min-w-0 rounded-xl px-3 py-2 ${TUR_SINIFI[o.ders.courseType]}`}>
            <p className="truncate text-sm font-bold">{katilim[o.key] ? "✓ " : ""}{o.ders.courseName}</p>
            <p className="truncate text-xs opacity-80">{o.ders.instructor}</p>
            <p className="truncate text-xs font-medium">
              {o.amfi ?? "⚠️ Eşleşme bekliyor"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function AyGorunumu({
  ay,
  olaylar,
  onGunSec,
  bugun,
}: {
  ay: Date;
  olaylar: DersOlayi[];
  onGunSec: (g: Date) => void;
  bugun: Date;
}) {
  const ilk = new Date(ay.getFullYear(), ay.getMonth(), 1);
  const basla = startOfWeek(ilk);
  const hucreler = Array.from({ length: 42 }, (_, i) => addDays(basla, i));

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">
        {AYLAR[ay.getMonth()]} {ay.getFullYear()}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {GUN_KISA.map((g) => (
          <div key={g} className="pb-1">
            {g}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {hucreler.map((g) => {
          const gunOlaylari = olaylar
            .filter((o) => sameDay(o.date, g))
            .sort((a, b) => toMinutes(a.ders.startTime) - toMinutes(b.ders.startTime));
          const buAy = g.getMonth() === ay.getMonth();
          return (
            <button
              key={isoDate(g)}
              onClick={() => onGunSec(g)}
              className={`min-h-16 rounded-xl border border-border/70 p-1 text-left transition-colors hover:bg-accent/40 ${
                buAy ? "bg-surface" : "bg-transparent opacity-45"
              }`}
            >
              <span
                className={`inline-grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
                  sameDay(g, bugun) ? "bg-bugun text-primary-foreground" : ""
                }`}
              >
                {g.getDate()}
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {gunOlaylari.slice(0, 4).map((o) => (
                  <span
                    key={o.key}
                    className={`h-1.5 w-1.5 rounded-full ${TUR_NOKTA[o.ders.courseType]}`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
