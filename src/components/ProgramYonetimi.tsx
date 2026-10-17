import { SheetsTusu, type SheetsTur } from "@/components/SheetsTusu";
import { SheetsTakip } from "@/components/SheetsTakip";
import { ProgramTakvim } from "@/components/ProgramTakvim";
import { AiAsistan, UygulamaToplu, VeriKontrol } from "@/components/VeriKontrol";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, FlaskConical, Pencil, Plus, Save, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useDonemler } from "@/components/DonemSecici";
import { yillikProgramOku } from "@/lib/excel-import";
import { ogrenciListesiOku, uygulamaTablosuOku } from "@/lib/uygulama-import";
import { dosyaGuvenli } from "@/lib/dosya-bulut";
import { programiYenile } from "@/lib/bulut";
import {
  DIL_ETIKET,
  programAnahtari,
  donemSil,
  donemleriKaydet,
  programGetir,
  programKaydet,
  type Dil,
  type ProgramVerisi,
} from "@/lib/program";
import { programVerisiniTemizle, type Ders, type Ogrenci, type UygulamaOlayi } from "@/lib/schedule-data";

const girdi = "rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm";

interface Sutun<T> {
  ad: string;
  al: (r: T) => string;
  koy: (r: T, v: string) => T;
  gen?: string;
}

function Tablo<T>({
  satirlar,
  sutunlar,
  onDegis,
  yeni,
}: {
  satirlar: T[];
  sutunlar: Sutun<T>[];
  onDegis: (s: T[]) => void;
  yeni: () => T;
}) {
  const [ara, setAra] = useState("");
  const [limit, setLimit] = useState(50);
  const q = ara.toLocaleLowerCase("tr-TR");
  const liste = satirlar
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !q || sutunlar.some((s) => s.al(r).toLocaleLowerCase("tr-TR").includes(q)));
  const degis = (i: number, r: T) => onDegis(satirlar.map((x, j) => (j === i ? r : x)));
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className={`${girdi} flex-1`} placeholder="Ara…" value={ara} onChange={(e) => setAra(e.target.value)} />
        <button onClick={() => onDegis([yeni(), ...satirlar])} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> Satır ekle
        </button>
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-accent">
            <tr>
              {sutunlar.map((s) => (
                <th key={s.ad} className="px-1.5 py-1 text-left font-semibold">{s.ad}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.slice(0, limit).map(({ r, i }) => (
              <tr key={i} className="border-t border-border">
                {sutunlar.map((s) => (
                  <td key={s.ad} className="p-0.5">
                    <input
                      value={s.al(r)}
                      onChange={(e) => degis(i, s.koy(r, e.target.value))}
                      className="w-full min-w-0 rounded bg-transparent px-1.5 py-1 hover:bg-accent focus:bg-background"
                      style={{ minWidth: s.gen ?? "5rem" }}
                    />
                  </td>
                ))}
                <td className="p-0.5">
                  <button aria-label="Sil" onClick={() => onDegis(satirlar.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {liste.length} satır
        {liste.length > limit ? (
          <button onClick={() => setLimit((l) => l + 100)} className="ml-2 font-semibold text-primary hover:underline">
            daha fazla göster
          </button>
        ) : null}
      </p>
    </div>
  );
}

const DERS_SUTUN: Sutun<Ders>[] = [
  { ad: "Ders", al: (r) => r.courseName, koy: (r, v) => ({ ...r, courseName: v }), gen: "14rem" },
  { ad: "Tarih", al: (r) => r.date ?? "", koy: (r, v) => ({ ...r, date: v || undefined }), gen: "6.5rem" },
  {
    ad: "Gün (1-7)",
    al: (r) => String(r.dayOfWeek),
    koy: (r, v) => ({ ...r, dayOfWeek: Math.min(7, Math.max(1, Number(v) || 1)) }),
    gen: "3rem",
  },
  { ad: "Başlangıç", al: (r) => r.startTime, koy: (r, v) => ({ ...r, startTime: v }), gen: "4rem" },
  { ad: "Bitiş", al: (r) => r.endTime, koy: (r, v) => ({ ...r, endTime: v }), gen: "4rem" },
  { ad: "Yer", al: (r) => r.defaultClassroom, koy: (r, v) => ({ ...r, defaultClassroom: v }), gen: "8rem" },
  { ad: "Hoca", al: (r) => r.instructor, koy: (r, v) => ({ ...r, instructor: v }), gen: "8rem" },
];
const OGR_SUTUN: Sutun<Ogrenci>[] = [
  { ad: "No", al: (r) => r.no, koy: (r, v) => ({ ...r, no: v.replace(/\D/g, "") }), gen: "7rem" },
  { ad: "Ad", al: (r) => r.ad, koy: (r, v) => ({ ...r, ad: v }), gen: "8rem" },
  { ad: "Soyad", al: (r) => r.soyad, koy: (r, v) => ({ ...r, soyad: v }), gen: "8rem" },
  { ad: "Grup", al: (r) => r.grup, koy: (r, v) => ({ ...r, grup: v.toUpperCase() }), gen: "3rem" },
  { ad: "Alt grup", al: (r) => r.altGrup, koy: (r, v) => ({ ...r, altGrup: v }), gen: "3rem" },
];
const UYG_SUTUN: Sutun<UygulamaOlayi>[] = [
  { ad: "Uygulama", al: (r) => r.ad, koy: (r, v) => ({ ...r, ad: v }), gen: "12rem" },
  { ad: "Tarih", al: (r) => r.date, koy: (r, v) => ({ ...r, date: v }), gen: "6.5rem" },
  { ad: "Başlangıç", al: (r) => r.startTime, koy: (r, v) => ({ ...r, startTime: v }), gen: "4rem" },
  { ad: "Bitiş", al: (r) => r.endTime, koy: (r, v) => ({ ...r, endTime: v }), gen: "4rem" },
  {
    ad: "Gruplar",
    al: (r) => r.gruplar.join(", "),
    koy: (r, v) => ({ ...r, gruplar: v.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean) }),
    gen: "6rem",
  },
  { ad: "Yer", al: (r) => r.yer, koy: (r, v) => ({ ...r, yer: v }), gen: "8rem" },
  { ad: "Hoca", al: (r) => r.hoca, koy: (r, v) => ({ ...r, hoca: v }), gen: "8rem" },
  { ad: "Dilim", al: (r) => r.dilim, koy: (r, v) => ({ ...r, dilim: v }), gen: "10rem" },
  { ad: "Ana dal", al: (r) => r.dal ?? "", koy: (r, v) => ({ ...r, dal: v || undefined }), gen: "9rem" },
  {
    ad: "Tür (pratik/pbl/teorik/sinav)",
    al: (r) => r.tur ?? "",
    koy: (r, v) => {
      const t = v.trim().toLocaleLowerCase("tr-TR");
      const tur = (["teorik", "pratik", "pbl", "secmeli", "sinav"] as const).find((x) => x === t || (t.length >= 2 && x.startsWith(t)));
      return { ...r, tur: tur ?? (t ? r.tur : undefined), turElle: Boolean(tur) || undefined };
    },
    gen: "6rem",
  },
];

function DosyaTusu({ etiket, onDosya, kaynak }: { etiket: string; onDosya: (f: File) => Promise<void>; kaynak?: { anahtar: string; tur: SheetsTur } | undefined }) {
  const ref = useRef<HTMLInputElement>(null);
  const [bekle, setBekle] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBekle(true);
          try {
            await dosyaGuvenli(f);
            await onDosya(f);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Dosya okunamadı.");
          } finally {
            setBekle(false);
            e.target.value = "";
          }
        }}
      />
      <button
        onClick={() => ref.current?.click()}
        disabled={bekle}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" /> {bekle ? "Okunuyor…" : etiket}
      </button>
      <SheetsTusu onDosya={onDosya} kaynak={kaynak} />
    </>
  );
}

type Bolum = "dersler" | "uygulamalar" | "ogrenciler";

/** Dönem oluşturma/silme ve her dönem + dil için program dosyaları (admin). */
export function ProgramYonetimi() {
  const qc = useQueryClient();
  const { data: donemler = [] } = useDonemler();
  const [donemId, setDonemId] = useState("");
  const [dil, setDil] = useState<Dil>("tr");
  const [prog, setProg] = useState<ProgramVerisi | null>(null);
  const [kirli, setKirli] = useState(false);
  const [bolum, setBolum] = useState<Bolum>("dersler");
  const [yeniAd, setYeniAd] = useState("");
  const [gecmis, setGecmis] = useState<ProgramVerisi[]>([]);
  const [kopyaHedef, setKopyaHedef] = useState<{ donemId: string; dil: Dil } | null>(null);

  useEffect(() => {
    if (!donemId && donemler[0]) setDonemId(donemler[0].id);
  }, [donemler, donemId]);
  useEffect(() => {
    setProg(null);
    setKirli(false);
    setGecmis([]);
    if (donemId) void programGetir(donemId, dil).then(setProg);
  }, [donemId, dil]);

  const donemYenile = () => qc.invalidateQueries({ queryKey: ["donemler"] });
  const guncelle = (p: Partial<ProgramVerisi>) => {
    if (prog) setGecmis((g) => [...g.slice(-29), prog]);
    setProg((x) => ({ ...(x ?? {}), ...p }));
    setKirli(true);
  };
  const kaydet = async (v = prog) => {
    if (!v || !donemId) return;
    try {
      await programKaydet(donemId, dil, v);
      setKirli(false);
      toast.success("Program kaydedildi, öğrencilere yansıdı.");
      void programiYenile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi.");
    }
  };
  const dosyaKaydet = async (p: Partial<ProgramVerisi>) => {
    const v = { ...(prog ?? {}), ...p };
    setProg(v);
    await kaydet(v);
  };

  const ogrListe = useMemo(() => Object.values(prog?.ogrenciler ?? {}), [prog?.ogrenciler]);
  const donem = donemler.find((d) => d.id === donemId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-sm font-bold">Dönemler</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {donemler.map((d) => (
            <button
              key={d.id}
              onClick={() => setDonemId(d.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${d.id === donemId ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
            >
              {d.ad}
            </button>
          ))}
          {!donemler.length ? <p className="text-xs text-muted-foreground">Henüz dönem yok. Aşağıdan ekle.</p> : null}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ad = yeniAd.trim();
            if (!ad) return;
            const id = crypto.randomUUID().slice(0, 8);
            try {
              await donemleriKaydet([...donemler, { id, ad }]);
              setYeniAd("");
              setDonemId(id);
              await donemYenile();
              toast.success("Dönem eklendi.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Eklenemedi.");
            }
          }}
        >
          <input className={`${girdi} flex-1`} placeholder="Yeni dönem adı (örn. Dönem 1)" value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} />
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Ekle
          </button>
        </form>
        {donem ? (
          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => {
                const ad = prompt("Dönemin yeni adı", donem.ad)?.trim();
                if (!ad) return;
                await donemleriKaydet(donemler.map((d) => (d.id === donem.id ? { ...d, ad } : d)));
                await donemYenile();
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" /> Adını değiştir
            </button>
            <button
              onClick={async () => {
                if (!confirm(`"${donem.ad}" dönemi ve Türkçe/İngilizce tüm dosyaları silinsin mi?`)) return;
                await donemSil(donem.id, donemler);
                setDonemId("");
                await donemYenile();
                toast.success("Dönem silindi.");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Dönemi sil
            </button>
          </div>
        ) : null}
      </div>

      {donem ? (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">{donem.ad} programı</h3>
            <div className="flex rounded-lg border border-border p-0.5">
              {(["tr", "en"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    if (kirli && !confirm("Kaydedilmemiş değişiklikler kaybolacak. Devam?")) return;
                    setDil(d);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${dil === d ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {DIL_ETIKET[d]}
                </button>
              ))}
            </div>
          </div>

          {!prog ? (
            <p className="text-xs text-muted-foreground">Yükleniyor…</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["dersler", "Yıllık program", CalendarRange, prog.dersler?.length, prog.yillikDosya],
                    ["uygulamalar", "Uygulama tablosu", FlaskConical, prog.uygulamalar?.length, prog.uygulamaDosya],
                    ["ogrenciler", "Öğrenci listesi", Users, ogrListe.length || undefined, prog.ogrenciDosya],
                  ] as const
                ).map(([k, ad, Ikon, n, dosya]) => (
                  <div key={k} className={`rounded-xl border p-3 ${bolum === k ? "border-primary" : "border-border"}`}>
                    <button onClick={() => setBolum(k)} className="flex w-full items-center gap-2 text-left">
                      <Ikon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{ad}</span>
                    </button>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{n ? `${dosya ?? "—"} · ${n} kayıt` : "Yüklenmedi"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <DosyaTusu
                        etiket={n ? "Değiştir" : "Yükle"}
                        kaynak={{ anahtar: programAnahtari(donemId, dil), tur: k === "dersler" ? "yillik" : k === "uygulamalar" ? "uygulama" : "ogrenci" }}
                        onDosya={async (f) => {
                          if (k === "dersler") {
                            const dersler = await yillikProgramOku(f);
                            if (!dersler.length) throw new Error("Ders bulunamadı.");
                            await dosyaKaydet({ dersler, yillikDosya: f.name });
                          } else if (k === "uygulamalar") {
                            const uygulamalar = await uygulamaTablosuOku(f);
                            if (!uygulamalar.length) throw new Error("Uygulama bulunamadı.");
                            await dosyaKaydet({ uygulamalar, uygulamaDosya: f.name });
                          } else {
                            const ogrenciler = await ogrenciListesiOku(f);
                            if (!Object.keys(ogrenciler).length) throw new Error("Öğrenci bulunamadı.");
                            await dosyaKaydet({ ogrenciler, ogrenciDosya: f.name });
                          }
                          setBolum(k);
                        }}
                      />
                      {n ? (
                        <button
                          onClick={() => {
                            if (!confirm(`${ad} silinsin mi?`)) return;
                            void dosyaKaydet(
                              k === "dersler"
                                ? { dersler: null, yillikDosya: undefined }
                                : k === "uygulamalar"
                                  ? { uygulamalar: null, uygulamaDosya: undefined }
                                  : { ogrenciler: null, ogrenciDosya: undefined },
                            );
                          }}
                          className="rounded-lg border border-border px-2 text-xs text-muted-foreground hover:text-destructive"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <SheetsTakip anahtarlar={[programAnahtari(donemId, dil)]} />
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-accent/40 p-3 text-xs">
                <span>Excel yazım farklarını, ders türlerini, dilim/ana dal adlarını ve uygulama grup kodlarını otomatik temizle.</span>
                <button
                  onClick={() => {
                    if (!prog) return;
                    guncelle(programVerisiniTemizle(prog));
                    toast.success("Program temizlendi. Kontrol edip Kaydet'e bas.");
                  }}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold hover:bg-accent"
                >
                  Veriyi otomatik düzelt
                </button>
              </div>

              <VeriKontrol dersler={prog.dersler ?? []} uygulamalar={prog.uygulamalar ?? []} onDegis={(p) => guncelle(p)} />
              <AiAsistan dersler={prog.dersler ?? []} uygulamalar={prog.uygulamalar ?? []} onDegis={(p) => guncelle(p)} />

              {bolum === "dersler" ? (
                <ProgramTakvim
                  dersler={prog.dersler ?? []}
                  onDegis={(dersler) => guncelle({ dersler })}
                  yeni={() => ({
                    id: crypto.randomUUID(),
                    courseName: "",
                    instructor: "",
                    courseType: "teorik" as const,
                    dayOfWeek: 1,
                    startTime: "08:30",
                    endTime: "09:20",
                    defaultClassroom: "",
                    group: "",
                    semester: donem.ad,
                    notes: "",
                  })}
                />
              ) : bolum === "uygulamalar" ? (
                <div className="space-y-2">
                <UygulamaToplu uygulamalar={prog.uygulamalar ?? []} onDegis={(uygulamalar) => guncelle({ uygulamalar })} />
                <Tablo
                  satirlar={prog.uygulamalar ?? []}
                  sutunlar={UYG_SUTUN}
                  onDegis={(uygulamalar) => guncelle({ uygulamalar })}
                  yeni={() => ({ id: crypto.randomUUID(), date: "", startTime: "", endTime: "", ad: "", hoca: "", yer: "", dilim: "", gruplar: [] })}
                />
                </div>
              ) : (
                <Tablo
                  satirlar={ogrListe}
                  sutunlar={OGR_SUTUN}
                  onDegis={(l) =>
                    guncelle({ ogrenciler: Object.fromEntries(l.map((o) => [o.no.replace(/^0+/, "") || crypto.randomUUID().slice(0, 6), o])) })
                  }
                  yeni={() => ({ no: "", ad: "", soyad: "", grup: "", altGrup: "" })}
                />
              )}

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-xs">
                <span className="font-semibold">Bu programı kopyala:</span>
                <select
                  className={girdi}
                  value={kopyaHedef ? `${kopyaHedef.donemId}:${kopyaHedef.dil}` : ""}
                  onChange={(e) => { const [d, l] = e.target.value.split(":"); setKopyaHedef(d ? { donemId: d, dil: l as Dil } : null); }}
                >
                  <option value="">Hedef dönem / dil seç…</option>
                  {donemler.flatMap((d) => (["tr", "en"] as const).map((l) => (
                    <option key={`${d.id}:${l}`} value={`${d.id}:${l}`} disabled={d.id === donemId && l === dil}>{d.ad} · {DIL_ETIKET[l]}</option>
                  )))}
                </select>
                <button
                  disabled={!kopyaHedef}
                  onClick={async () => {
                    if (!kopyaHedef || !prog) return;
                    const ad = `${donemler.find((d) => d.id === kopyaHedef.donemId)?.ad ?? ""} · ${DIL_ETIKET[kopyaHedef.dil]}`;
                    if (!confirm(`"${ad}" programının üzerine yazılacak (yıllık program, uygulamalar, öğrenci listesi). Emin misin?`)) return;
                    try {
                      await programKaydet(kopyaHedef.donemId, kopyaHedef.dil, prog);
                      toast.success(`${ad} programına kopyalandı.`);
                      setKopyaHedef(null);
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Kopyalanamadı."); }
                  }}
                  className="rounded-lg border border-border px-2.5 py-1.5 font-semibold hover:bg-accent disabled:opacity-50"
                >Kopyala</button>
                <span className="text-muted-foreground">Kaydedilmemiş değişiklikler de kopyalanır.</span>
              </div>

              {gecmis.length ? (
                <button
                  onClick={() => { const son = gecmis[gecmis.length - 1]!; setGecmis((g) => g.slice(0, -1)); setProg(son); setKirli(true); }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-accent"
                >↶ Son değişikliği geri al ({gecmis.length})</button>
              ) : null}

              <button
                disabled={!kirli}
                onClick={() => void kaydet()}
                className="sticky bottom-20 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-50 md:bottom-4"
              >
                <Save className="h-4 w-4" /> {kirli ? "Değişiklikleri kaydet" : "Kaydedildi"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
