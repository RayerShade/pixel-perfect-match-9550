import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { DIGER, dilimDal, yazimFarklari } from "@/lib/dilim";
import { DERS_TURU_ETIKET, dersTuruDuzelt, uygulamaTuru, type Ders, type DersTuru, type UygulamaOlayi } from "@/lib/schedule-data";

const girdi = "rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs";
const tusS = "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-40";

/** Admin: dosyadan gelen yazım farklarını, yanlış türleri ve dilimsiz dersleri gösterir; tek tuşla düzeltir. */
export function VeriKontrol({
  dersler,
  uygulamalar,
  onDegis,
}: {
  dersler: Ders[];
  uygulamalar: UygulamaOlayi[];
  onDegis: (p: { dersler?: Ders[]; uygulamalar?: UygulamaOlayi[] }) => void;
}) {
  const [acik, setAcik] = useState(false);
  const rapor = useMemo(() => {
    const dilimler = [...dersler.map((d) => dilimDal(d).dilim), ...uygulamalar.map((u) => dilimDal({ notes: "", dilim: u.dilim } as Ders).dilim)];
    const dallar = dersler.map((d) => dilimDal(d).dal);
    const turDegisen = dersler.filter((d) => dersTuruDuzelt(d.courseType, d.courseName, `${d.notes} ${d.defaultClassroom}`, d.turElle) !== d.courseType);
    const uygTur = uygulamalar.filter((u) => uygulamaTuru(u) !== (u.tur ?? "pratik"));
    const dilimsiz = dersler.filter((d) => dilimDal(d).dilim === DIGER && d.courseType !== "sinav" && d.courseType !== "secmeli");
    return { dilimFark: yazimFarklari(dilimler, true), dalFark: yazimFarklari(dallar, false), turDegisen, uygTur, dilimsiz };
  }, [dersler, uygulamalar]);
  const sorun = rapor.dilimFark.length + rapor.dalFark.length + rapor.turDegisen.length + rapor.uygTur.length;

  const dilimBirlestir = () => {
    const m = new Map<string, string>();
    for (const f of [...rapor.dilimFark]) for (const v of f.varyantlar) m.set(v, f.ortak);
    const dm = new Map<string, string>();
    for (const f of rapor.dalFark) for (const v of f.varyantlar) dm.set(v, f.ortak);
    let n = 0;
    const yeniD = dersler.map((d) => {
      const x = dilimDal(d);
      const dl = m.get(x.dilim), da = dm.get(x.dal);
      if (!dl && !da) return d;
      n++;
      return { ...d, ...(dl ? { dilim: dl } : {}), ...(da ? { dal: da } : {}) };
    });
    const yeniU = uygulamalar.map((u) => {
      const dl = m.get(dilimDal({ notes: "", dilim: u.dilim } as Ders).dilim);
      if (!dl) return u;
      n++;
      return { ...u, dilim: dl };
    });
    onDegis({ dersler: yeniD, uygulamalar: yeniU });
    toast.success(`${n} kayıt birleştirildi. Kontrol edip Kaydet'e bas.`);
  };
  const turleriDuzelt = () => {
    onDegis({
      dersler: dersler.map((d) => ({ ...d, courseType: dersTuruDuzelt(d.courseType, d.courseName, `${d.notes} ${d.defaultClassroom}`, d.turElle) })),
      uygulamalar: uygulamalar.map((u) => ({ ...u, tur: uygulamaTuru(u) })),
    });
    toast.success(`${rapor.turDegisen.length + rapor.uygTur.length} kaydın türü düzeltildi. Kaydet'e bas.`);
  };

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button onClick={() => setAcik(!acik)} className="flex w-full items-center gap-2 p-3 text-left">
        <ShieldCheck className={`h-4 w-4 ${sorun ? "text-destructive" : "text-primary"}`} />
        <span className="flex-1 text-sm font-semibold">Veri kontrolü</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sorun ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {sorun ? `${sorun} olası sorun` : "Temiz"}
        </span>
      </button>
      {acik ? (
        <div className="space-y-3 border-t border-border p-3 text-xs">
          <section>
            <p className="font-semibold">Aynı dilim / ana dalın farklı yazımları</p>
            {!rapor.dilimFark.length && !rapor.dalFark.length ? <p className="text-muted-foreground">Yok.</p> : null}
            <ul className="mt-1 space-y-0.5">
              {[...rapor.dilimFark, ...rapor.dalFark].map((f) => (
                <li key={f.ortak}><span className="text-muted-foreground">{f.varyantlar.join(", ")}</span> → <b>{f.ortak}</b></li>
              ))}
            </ul>
            <button className={`${tusS} mt-2`} disabled={!rapor.dilimFark.length && !rapor.dalFark.length} onClick={dilimBirlestir}>Yazımları birleştir</button>
          </section>
          <section>
            <p className="font-semibold">Türü yanlış görünen kayıtlar ({rapor.turDegisen.length + rapor.uygTur.length})</p>
            <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto">
              {rapor.turDegisen.slice(0, 60).map((d) => (
                <li key={d.id}>{d.courseName} <span className="text-muted-foreground">{DERS_TURU_ETIKET[d.courseType]} → {DERS_TURU_ETIKET[dersTuruDuzelt(d.courseType, d.courseName, `${d.notes} ${d.defaultClassroom}`, d.turElle)]}</span></li>
              ))}
              {rapor.uygTur.length ? <li className="text-muted-foreground">Uygulama tablosunda {rapor.uygTur.length} satır "uygulama" olarak düzeltilecek.</li> : null}
            </ul>
            <p className="mt-1 text-muted-foreground">Elle türünü değiştirdiğin dersler korunur. Öğrenci takvimi bu düzeltmeyi zaten otomatik uyguluyor; buton kalıcı kaydeder.</p>
            <button className={`${tusS} mt-2`} disabled={!rapor.turDegisen.length && !rapor.uygTur.length} onClick={turleriDuzelt}>Türleri düzelt</button>
          </section>
          <section>
            <p className="font-semibold">Dilimi okunamayan dersler ({rapor.dilimsiz.length})</p>
            <p className="text-muted-foreground">Öğrenci tarafında aynı gün/haftadaki dilime otomatik konur. Kalıcı atamak için aşağıdaki toplu düzenlemeyi ya da takvimdeki "Toplu düzenle"yi kullan.</p>
            <ul className="mt-1 max-h-32 overflow-auto text-muted-foreground">
              {rapor.dilimsiz.slice(0, 40).map((d) => <li key={d.id}>{d.date ?? ""} {d.courseName}</li>)}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

/** Admin: uygulama tablosunda arama ile eşleşen satırlara toplu dilim / ana dal / tür / yer ata ya da sil. */
export function UygulamaToplu({ uygulamalar, onDegis }: { uygulamalar: UygulamaOlayi[]; onDegis: (u: UygulamaOlayi[]) => void }) {
  const [q, setQ] = useState("");
  const [dilim, setDilim] = useState("");
  const [dal, setDal] = useState("");
  const [yer, setYer] = useState("");
  const [tur, setTur] = useState<DersTuru | "">("");
  const k = q.toLocaleLowerCase("tr-TR").trim();
  const eslesen = k ? uygulamalar.filter((u) => `${u.ad} ${u.dilim} ${u.dal ?? ""} ${u.gruplar.join(" ")} ${u.date}`.toLocaleLowerCase("tr-TR").includes(k)) : [];
  const ids = new Set(eslesen.map((u) => u.id));
  const dilimler = [...new Set(uygulamalar.map((u) => u.dilim).filter(Boolean))];
  return (
    <div className="space-y-2 rounded-xl border border-border bg-accent/30 p-3 text-xs">
      <p className="font-semibold">Uygulamaları toplu düzenle</p>
      <input className={`${girdi} w-full`} placeholder="Ad, dilim, grup ya da tarih ile ara (örn. Biyofizik)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-4">
        <input list="ut-dilim" className={girdi} placeholder="Yeni dilim" value={dilim} onChange={(e) => setDilim(e.target.value)} />
        <datalist id="ut-dilim">{dilimler.map((d) => <option key={d} value={d} />)}</datalist>
        <input className={girdi} placeholder="Yeni ana dal" value={dal} onChange={(e) => setDal(e.target.value)} />
        <input className={girdi} placeholder="Yeni yer" value={yer} onChange={(e) => setYer(e.target.value)} />
        <select className={girdi} value={tur} onChange={(e) => setTur(e.target.value as DersTuru | "")}>
          <option value="">Tür aynı kalsın</option>
          {(Object.keys(DERS_TURU_ETIKET) as DersTuru[]).map((t) => <option key={t} value={t}>{DERS_TURU_ETIKET[t]}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{k ? `${eslesen.length} satır eşleşti` : "Önce ara"}</span>
        <button
          className={tusS}
          disabled={!eslesen.length || (!dilim.trim() && !dal.trim() && !yer.trim() && !tur)}
          onClick={() => {
            if (!confirm(`${eslesen.length} uygulama satırı değişecek. Emin misin?`)) return;
            onDegis(uygulamalar.map((u) => (ids.has(u.id) ? { ...u, ...(dilim.trim() ? { dilim: dilim.trim() } : {}), ...(dal.trim() ? { dal: dal.trim() } : {}), ...(yer.trim() ? { yer: yer.trim() } : {}), ...(tur ? { tur, turElle: true } : {}) } : u)));
            toast.success("Uygulandı. Kaydet'e basmayı unutma.");
          }}
        >
          Eşleşenlere uygula
        </button>
        <button
          className={`${tusS} text-destructive`}
          disabled={!eslesen.length}
          onClick={() => {
            if (!confirm(`${eslesen.length} uygulama satırı silinecek. Emin misin?`)) return;
            onDegis(uygulamalar.filter((u) => !ids.has(u.id)));
            toast.success("Silindi. Kaydet'e basmayı unutma.");
          }}
        >
          Eşleşenleri sil
        </button>
      </div>
    </div>
  );
}
