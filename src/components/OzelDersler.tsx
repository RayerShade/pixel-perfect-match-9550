import { useState } from "react";
import { CalendarPlus, MapPin, RotateCcw } from "lucide-react";
import { addDays, isoDate } from "@/lib/date-utils";
import { DERS_TURU_ETIKET, derslikListesi, type Ders, type DersOlayi, type DersTuru } from "@/lib/schedule-data";
import { dilimDal } from "@/lib/dilim";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAyarlar, useYuklenenVeri, type Ayarlar, type DersDuzeni, type OzelDers, type Tekrar } from "@/lib/store";

export const TEKRAR_ETIKET: Record<Tekrar, string> = {
  yok: "Tek seferlik",
  hafta: "Her hafta",
  "2hafta": "2 haftada bir",
  ay: "Her ay",
};

const gunNo = (d: Date) => ((d.getDay() + 6) % 7) + 1;
const tarih = (s: string) => new Date(`${s}T00:00:00`);

function tekrarlar(o: OzelDers, bas: Date, bit: Date): Date[] {
  const sonuc: Date[] = [];
  const ilk = tarih(o.tarih);
  const son = o.bitis ? tarih(o.bitis) : addDays(ilk, 730);
  const ust = son < bit ? son : bit;
  if (o.tekrar === "yok") return ilk >= bas && ilk <= bit ? [ilk] : [];
  for (let i = 0; i < 400; i++) {
    const d =
      o.tekrar === "ay"
        ? new Date(ilk.getFullYear(), ilk.getMonth() + i, ilk.getDate())
        : addDays(ilk, i * (o.tekrar === "2hafta" ? 14 : 7));
    if (d > ust) break;
    if (o.tekrar === "ay" && d.getDate() !== ilk.getDate()) continue; // 31'i olmayan aylar
    if (d >= bas) sonuc.push(d);
  }
  return sonuc;
}

/** Öğrencinin kendi değişikliklerini (saat değişikliği, silme, eklenen dersler) takvime uygular. */
export function kisiselUygula(olaylar: DersOlayi[], bas: Date, bit: Date, ayarlar: Ayarlar): DersOlayi[] {
  const duzen = ayarlar.dersDuzenleri ?? {};
  const sonuc: DersOlayi[] = [];
  for (const o of olaylar) {
    const hep = `hep:${o.ders.courseName}|${o.ders.dayOfWeek}|${o.ders.startTime}`;
    const d: DersDuzeni | undefined = duzen[`bir:${o.key}`] ?? duzen[hep];
    if (d?.sil) continue;
    sonuc.push(
      d && (d.startTime || d.endTime)
        ? {
            ...o,
            hepAnahtar: hep,
            duzenlendi: true,
            ders: { ...o.ders, startTime: d.startTime || o.ders.startTime, endTime: d.endTime || o.ders.endTime },
          }
        : { ...o, hepAnahtar: hep },
    );
  }
  for (const oz of ayarlar.ozelDersler ?? []) {
    for (const g of tekrarlar(oz, bas, bit)) {
      const ders: Ders = {
        id: oz.id,
        courseName: oz.ad,
        instructor: oz.instructor ?? "",
        courseType: oz.courseType ?? "teorik",
        dayOfWeek: gunNo(g),
        date: isoDate(g),
        startTime: oz.startTime,
        endTime: oz.endTime,
        defaultClassroom: oz.yer,
        dilim: oz.dilim,
        dal: oz.dal,
        group: "Kişisel",
        semester: "",
        notes: [TEKRAR_ETIKET[oz.tekrar], oz.not].filter(Boolean).join(" · "),
      };
      sonuc.push({ key: `ozel-${oz.id}-${isoDate(g)}`, ders, date: g, amfi: oz.yer || "—", group: "Kişisel", ozelId: oz.id });
    }
  }
  return sonuc;
}

const girdi = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

/** Ders ekleme / düzenleme penceresi. */
export function OzelDersFormu({
  mevcut,
  varsayilanTarih,
  onClose,
}: {
  mevcut?: OzelDers | undefined;
  varsayilanTarih?: string | undefined;
  onClose: () => void;
}) {
  const { ayarlar, guncelle } = useAyarlar();
  const { veri } = useYuklenenVeri();
  const [f, setF] = useState<OzelDers>(
    mevcut ?? {
      id: crypto.randomUUID(),
      ad: "",
      yer: "",
      not: "",
      tarih: varsayilanTarih ?? isoDate(new Date()),
      startTime: "09:00",
      endTime: "10:00",
      tekrar: "yok",
      instructor: "",
      courseType: "teorik",
      dilim: "",
      dal: "",
    },
  );
  const derslikler = derslikListesi(veri, []);
  const programDersleri = veri.dersler ?? [];
  const dilimler = [...new Set(programDersleri.map((d) => dilimDal(d).dilim).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const dallar = [...new Set(programDersleri.filter((d) => !f.dilim || dilimDal(d).dilim === f.dilim).map((d) => dilimDal(d).dal).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const hocalar = [...new Set(programDersleri.filter((d) => (!f.dilim || dilimDal(d).dilim === f.dilim) && (!f.dal || dilimDal(d).dal === f.dal)).map((d) => d.instructor.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const set = (p: Partial<OzelDers>) => setF((x) => ({ ...x, ...p }));
  const saatHatasi = !f.startTime || !f.endTime || f.endTime <= f.startTime;
  const tarihHatasi = f.tekrar !== "yok" && !!f.bitis && f.bitis < f.tarih;
  const kaydet = () => {
    if (!f.ad.trim() || !f.tarih || saatHatasi || tarihHatasi) return;
    const liste = (ayarlar.ozelDersler ?? []).filter((o) => o.id !== f.id);
    guncelle({ ozelDersler: [...liste, { ...f, ad: f.ad.trim(), bitis: f.tekrar === "yok" ? undefined : f.bitis || undefined }] });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(acik) => { if (!acik) onClose(); }}>
      <DialogContent className="z-[60] max-w-xl p-0 sm:p-0 [&>button]:right-5 [&>button]:top-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          kaydet();
        }}
        className="space-y-4 p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="pr-6"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><CalendarPlus className="h-4 w-4" /></span><DialogTitle className="mt-3">{mevcut ? "Kişisel dersi düzenle" : "Takvime ders ekle"}</DialogTitle><DialogDescription className="mt-1">Bu kayıt yalnızca senin kişisel takvimine eklenir.</DialogDescription></div>
        </div>
        <label className="block text-xs font-semibold">Ders / etkinlik adı<input required className={`${girdi} mt-1`} placeholder="Örn. Çalışma grubu" value={f.ad} onChange={(e) => set({ ad: e.target.value })} /></label>
        <label className="block text-xs text-muted-foreground">
          {f.tekrar === "yok" ? "Tarih" : "İlk tarih"}
          <input type="date" required className={`${girdi} mt-1`} value={f.tarih} onChange={(e) => set({ tarih: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            Başlangıç
            <input type="time" required className={`${girdi} mt-1`} value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground">
            Bitiş
            <input type="time" required className={`${girdi} mt-1`} value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} />
          </label>
        </div>
        {saatHatasi ? <p role="status" className="text-xs text-destructive">Bitiş saati başlangıçtan sonra olmalı.</p> : null}
        <div>
          <span className="text-xs text-muted-foreground">Tekrar</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(Object.keys(TEKRAR_ETIKET) as Tekrar[]).map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={f.tekrar === t}
                onClick={() => set({ tekrar: t })}
                className={`rounded-lg border py-2 text-sm font-semibold ${f.tekrar === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
              >
                {TEKRAR_ETIKET[t]}
              </button>
            ))}
          </div>
        </div>
        {f.tekrar !== "yok" ? (
          <label className="block text-xs text-muted-foreground">
            Son tarih (boş bırakırsan devam eder)
            <input type="date" min={f.tarih} className={`${girdi} mt-1`} value={f.bitis ?? ""} onChange={(e) => set({ bitis: e.target.value })} />
          </label>
        ) : null}
        {tarihHatasi ? <p role="status" className="text-xs text-destructive">Son tarih ilk tarihten önce olamaz.</p> : null}
        <fieldset className="space-y-3 rounded-2xl border border-border p-4">
          <legend className="px-1 text-xs font-semibold">Ders bilgileri</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">Dilim<input list="ozel-dilimler" className={`${girdi} mt-1`} placeholder="Dilim seç veya yaz" value={f.dilim ?? ""} onChange={(e) => set({ dilim: e.target.value, dal: "", instructor: "" })} /></label>
            <label className="text-xs font-semibold">Ana dal<input list="ozel-dallar" className={`${girdi} mt-1`} placeholder="Ana dal seç veya yaz" value={f.dal ?? ""} onChange={(e) => set({ dal: e.target.value, instructor: "" })} /></label>
            <label className="text-xs font-semibold">Hoca<input list="ozel-hocalar" className={`${girdi} mt-1`} placeholder="Hoca seç veya yaz" value={f.instructor ?? ""} onChange={(e) => set({ instructor: e.target.value })} /><span className="mt-1 block font-normal text-muted-foreground">{hocalar.length} hoca · Seçtiğin dilim ve ana dala göre</span></label>
            <label className="text-xs font-semibold">Ders türü<select className={`${girdi} mt-1`} value={f.courseType ?? "teorik"} onChange={(e) => set({ courseType: e.target.value as DersTuru })}>{(Object.keys(DERS_TURU_ETIKET) as DersTuru[]).map((t) => <option key={t} value={t}>{DERS_TURU_ETIKET[t]}</option>)}</select></label>
          </div>
          <label className="block text-xs font-semibold"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Derslik</span><input list="ozel-derslikler" className={`${girdi} mt-1`} placeholder="Amfi veya derslik seç" value={f.yer} onChange={(e) => set({ yer: e.target.value })} /></label>
        </fieldset>
        <datalist id="ozel-derslikler">{derslikler.map((x) => <option key={x} value={x} />)}</datalist><datalist id="ozel-hocalar">{hocalar.map((x) => <option key={x} value={x} />)}</datalist><datalist id="ozel-dilimler">{dilimler.map((x) => <option key={x} value={x} />)}</datalist><datalist id="ozel-dallar">{dallar.map((x) => <option key={x} value={x} />)}</datalist>
        <label className="block text-xs font-semibold">Not<input className={`${girdi} mt-1`} placeholder="İsteğe bağlı not" value={f.not} onChange={(e) => set({ not: e.target.value })} /></label>
        <div className="sticky -bottom-5 flex items-center justify-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur-sm"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-accent">Vazgeç</button><button disabled={!f.ad.trim() || !f.tarih || saatHatasi || tarihHatasi} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">{mevcut ? "Değişiklikleri kaydet" : "Takvime ekle"}</button></div>
      </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ders detayında: saati değiştir / sil. */
export function DersDuzenle({ olay, onBitti }: { olay: DersOlayi; onBitti: () => void }) {
  const { ayarlar, guncelle } = useAyarlar();
  const [mod, setMod] = useState<"yok" | "saat" | "sil" | "ozel">("yok");
  const [bas, setBas] = useState(olay.ders.startTime);
  const [bit, setBit] = useState(olay.ders.endTime);
  const [kapsam, setKapsam] = useState<"bir" | "hep">("bir");

  if (olay.ozelId) {
    const oz = (ayarlar.ozelDersler ?? []).find((o) => o.id === olay.ozelId);
    return (
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
        <button onClick={() => setMod("ozel")} className="rounded-lg border border-border py-2 text-sm font-semibold hover:bg-accent">
          Düzenle
        </button>
        <button
          onClick={() => {
            if (!confirm("Bu dersi takviminden tamamen silmek istiyor musun?")) return;
            guncelle({ ozelDersler: (ayarlar.ozelDersler ?? []).filter((o) => o.id !== olay.ozelId) });
            onBitti();
          }}
          className="rounded-lg border border-destructive/40 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          Sil
        </button>
        {mod === "ozel" && oz ? <OzelDersFormu mevcut={oz} onClose={onBitti} /> : null}
      </div>
    );
  }

  const anahtar = kapsam === "bir" ? `bir:${olay.key}` : (olay.hepAnahtar ?? `bir:${olay.key}`);
  const uygula = (d: DersDuzeni | null) => {
    const yeni = { ...(ayarlar.dersDuzenleri ?? {}) };
    delete yeni[`bir:${olay.key}`];
    if (kapsam === "hep" && olay.hepAnahtar) delete yeni[olay.hepAnahtar];
    if (d) yeni[anahtar] = d;
    guncelle({ dersDuzenleri: yeni });
    onBitti();
  };
  const Kapsam = (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ["bir", "Sadece bu hafta"],
          ["hep", "Her hafta"],
        ] as const
      ).map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => setKapsam(k)}
          className={`rounded-lg border py-1.5 text-xs font-semibold ${kapsam === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMod(mod === "saat" ? "yok" : "saat")} className="rounded-lg border border-border py-2 text-sm font-semibold hover:bg-accent">
          Saati değiştir
        </button>
        <button
          onClick={() => setMod(mod === "sil" ? "yok" : "sil")}
          className="rounded-lg border border-destructive/40 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        >
          Takvimden sil
        </button>
      </div>
      {mod === "saat" ? (
        <div className="space-y-2 rounded-xl bg-accent p-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={bas} onChange={(e) => setBas(e.target.value)} className={girdi} />
            <input type="time" value={bit} onChange={(e) => setBit(e.target.value)} className={girdi} />
          </div>
          {Kapsam}
          <button
            disabled={bit <= bas}
            onClick={() => uygula({ startTime: bas, endTime: bit })}
            className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      ) : null}
      {mod === "sil" ? (
        <div className="space-y-2 rounded-xl bg-accent p-3">
          {Kapsam}
          <button onClick={() => uygula({ sil: true })} className="w-full rounded-lg bg-destructive py-2 text-sm font-semibold text-destructive-foreground">
            Sil
          </button>
        </div>
      ) : null}
      {olay.duzenlendi ? (
        <button
          onClick={() => {
            const yeni = { ...(ayarlar.dersDuzenleri ?? {}) };
            delete yeni[`bir:${olay.key}`];
            if (olay.hepAnahtar) delete yeni[olay.hepAnahtar];
            guncelle({ dersDuzenleri: yeni });
            onBitti();
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Orijinal saate döndür
        </button>
      ) : null}
    </div>
  );
}
