import { useState } from "react";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { addDays, isoDate } from "@/lib/date-utils";
import type { Ders, DersOlayi } from "@/lib/schedule-data";
import { useAyarlar, type Ayarlar, type DersDuzeni, type OzelDers, type Tekrar } from "@/lib/store";

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
        instructor: "",
        courseType: "teorik",
        dayOfWeek: gunNo(g),
        date: isoDate(g),
        startTime: oz.startTime,
        endTime: oz.endTime,
        defaultClassroom: oz.yer,
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
    },
  );
  const set = (p: Partial<OzelDers>) => setF((x) => ({ ...x, ...p }));
  const kaydet = () => {
    if (!f.ad.trim() || f.endTime <= f.startTime) return;
    const liste = (ayarlar.ozelDersler ?? []).filter((o) => o.id !== f.id);
    guncelle({ ozelDersler: [...liste, { ...f, ad: f.ad.trim(), bitis: f.tekrar === "yok" ? undefined : f.bitis || undefined }] });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center sm:p-4">
      <button aria-label="Kapat" className="absolute inset-0 cursor-default" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          kaydet();
        }}
        className="relative max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{mevcut ? "Dersi düzenle" : "Takvime ders ekle"}</h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-full border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input required className={girdi} placeholder="Ders / etkinlik adı" value={f.ad} onChange={(e) => set({ ad: e.target.value })} />
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
        {f.endTime <= f.startTime ? <p className="text-xs text-destructive">Bitiş saati başlangıçtan sonra olmalı.</p> : null}
        <div>
          <span className="text-xs text-muted-foreground">Tekrar</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(Object.keys(TEKRAR_ETIKET) as Tekrar[]).map((t) => (
              <button
                type="button"
                key={t}
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
            <input type="date" className={`${girdi} mt-1`} value={f.bitis ?? ""} onChange={(e) => set({ bitis: e.target.value })} />
          </label>
        ) : null}
        <input className={girdi} placeholder="Yer (isteğe bağlı)" value={f.yer} onChange={(e) => set({ yer: e.target.value })} />
        <input className={girdi} placeholder="Not (isteğe bağlı)" value={f.not} onChange={(e) => set({ not: e.target.value })} />
        <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Kaydet</button>
      </form>
    </div>
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

/** Ayarlar: öğrencinin eklediği dersler ve değişiklikleri. */
export function KisiselDegisiklikler() {
  const { ayarlar, guncelle } = useAyarlar();
  const [ekle, setEkle] = useState(false);
  const [duz, setDuz] = useState<OzelDers | null>(null);
  const ozel = ayarlar.ozelDersler ?? [];
  const duzen = Object.entries(ayarlar.dersDuzenleri ?? {});
  const etiket = (k: string, d: DersDuzeni) => {
    const [tur, rest = ""] = [k.slice(0, 3), k.slice(4)];
    const ad = tur === "hep" ? rest.split("|")[0] : rest.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const ne = d.sil ? "silindi" : `${d.startTime}–${d.endTime}`;
    return `${ad} · ${tur === "hep" ? "her hafta" : `${rest.slice(0, 10)} haftası`} · ${ne}`;
  };
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Kendi derslerim ve değişikliklerim</h2>
        <button onClick={() => setEkle(true)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Ders ekle
        </button>
      </div>
      {!ozel.length && !duzen.length ? (
        <p className="mt-2 text-xs text-muted-foreground">Takvimdeki bir derse dokunarak saatini değiştirebilir ya da silebilirsin.</p>
      ) : null}
      <ul className="mt-2 divide-y divide-border">
        {ozel.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <button onClick={() => setDuz(o)} className="min-w-0 text-left">
              <span className="block truncate font-medium">{o.ad}</span>
              <span className="block text-[11px] text-muted-foreground">
                {o.tarih} · {o.startTime}–{o.endTime} · {TEKRAR_ETIKET[o.tekrar]}
              </span>
            </button>
            <button
              aria-label="Sil"
              onClick={() => guncelle({ ozelDersler: ozel.filter((x) => x.id !== o.id) })}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {duzen.map(([k, d]) => (
          <li key={k} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="min-w-0 truncate text-xs">{etiket(k, d)}</span>
            <button
              aria-label="Geri al"
              title="Geri al"
              onClick={() => {
                const yeni = { ...(ayarlar.dersDuzenleri ?? {}) };
                delete yeni[k];
                guncelle({ dersDuzenleri: yeni });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {ekle ? <OzelDersFormu onClose={() => setEkle(false)} /> : null}
      {duz ? <OzelDersFormu mevcut={duz} onClose={() => setDuz(null)} /> : null}
    </section>
  );
}
