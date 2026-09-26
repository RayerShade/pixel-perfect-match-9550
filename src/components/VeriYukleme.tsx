import { useRef, useState } from "react";
import { CalendarRange, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { haftalikAmfiOku, yillikProgramOku } from "@/lib/excel-import";
import { useYuklenenVeri } from "@/lib/store";

function YuklemeKarti({
  baslik,
  aciklama,
  ikon,
  durum,
  onDosya,
  onSil,
}: {
  baslik: string;
  aciklama: string;
  ikon: React.ReactNode;
  durum: string | null;
  onDosya: (f: File) => Promise<string>;
  onSil: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [mesaj, setMesaj] = useState<{ ok: boolean; t: string } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const sec = async (f: File | undefined) => {
    if (!f) return;
    setYukleniyor(true);
    try {
      setMesaj({ ok: true, t: await onDosya(f) });
    } catch (e) {
      setMesaj({ ok: false, t: e instanceof Error ? e.message : "Dosya okunamadı." });
    } finally {
      setYukleniyor(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-primary">{ikon}</span>
        <p className="text-sm font-semibold">{baslik}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{aciklama}</p>
      {durum ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-accent px-2.5 py-1.5 text-xs">
          <span className="truncate font-medium">{durum}</span>
          <button onClick={onSil} aria-label="Kaldır" className="shrink-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {mesaj ? (
        <p className={`mt-2 text-xs font-medium ${mesaj.ok ? "text-primary" : "text-destructive"}`}>{mesaj.t}</p>
      ) : null}
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => sec(e.target.files?.[0])}
      />
      <button
        onClick={() => ref.current?.click()}
        disabled={yukleniyor}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" />
        {yukleniyor ? "Okunuyor…" : "Excel dosyası seç"}
      </button>
    </div>
  );
}

export function VeriYukleme() {
  const { veri, kaydet } = useYuklenenVeri();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <YuklemeKarti
        baslik="Yıllık ders programı"
        aciklama="Ders, saat (başlangıç–bitiş), gün veya tarih, öğretim üyesi sütunlarını otomatik tanır. Yüklenince örnek veriler yerine bu program kullanılır."
        ikon={<CalendarRange className="h-4 w-4" />}
        durum={veri.dersler ? `${veri.yillikDosya ?? "Yıllık program"} · ${veri.dersler.length} ders` : null}
        onDosya={async (f) => {
          const dersler = await yillikProgramOku(f);
          if (!dersler.length)
            throw new Error("Ders bulunamadı. Başlık satırında 'Ders' ve 'Saat' (veya Başlangıç/Bitiş) sütunları olmalı.");
          kaydet({ dersler, yillikDosya: f.name });
          return `${dersler.length} ders içe aktarıldı.`;
        }}
        onSil={() => kaydet({ dersler: null, yillikDosya: undefined })}
      />
      <YuklemeKarti
        baslik="Haftalık amfi programı"
        aciklama="Tarih, saat, ders ve amfi/derslik sütunlarını okur; sadece amfi bilgisini günceller. Her hafta yeni dosya ekleyebilirsin, eski haftalar korunur."
        ikon={<FileSpreadsheet className="h-4 w-4" />}
        durum={
          veri.amfi?.length
            ? `${veri.amfiDosyalari?.length ?? 1} dosya · ${veri.amfi.length} kayıt`
            : null
        }
        onDosya={async (f) => {
          const yeni = await haftalikAmfiOku(f);
          if (!yeni.length)
            throw new Error("Kayıt bulunamadı. Başlıkta 'Tarih', 'Saat' ve 'Amfi/Derslik' sütunları olmalı.");
          const haftalar = new Set(yeni.map((k) => k.week));
          const eski = (veri.amfi ?? []).filter((k) => !haftalar.has(k.week));
          kaydet({
            amfi: [...eski, ...yeni],
            amfiDosyalari: [...(veri.amfiDosyalari ?? []).filter((d) => d !== f.name), f.name],
          });
          return `${yeni.length} kayıt · ${haftalar.size} hafta güncellendi.`;
        }}
        onSil={() => kaydet({ amfi: null, amfiDosyalari: undefined })}
      />
    </div>
  );
}
