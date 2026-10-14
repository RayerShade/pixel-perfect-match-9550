import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { DERS_TURU_ETIKET, derslikListesi, type Ders, type DersTuru } from "@/lib/schedule-data";
import { useYuklenenVeri } from "@/lib/store";
import { DIGER, dilimDal } from "@/lib/dilim";

const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const girdi = "w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm";
const SAAT_BAS = 8, SAAT_BIT = 19, PX = 56; // saat başına piksel

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pazartesi = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const dk = (s: string) => { const [h, m] = s.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };

/** Yıllık programı haftalık takvim üzerinde düzenleme. */
export function ProgramTakvim({ dersler, onDegis, yeni }: { dersler: Ders[]; onDegis: (d: Ders[]) => void; yeni: () => Ders }) {
  const ilk = useMemo(() => {
    const bugun = iso(new Date());
    const tarihler = dersler.map((d) => d.date).filter(Boolean).sort() as string[];
    const hedef = tarihler.find((t) => t >= bugun) ?? tarihler[0];
    return pazartesi(hedef ? new Date(hedef + "T00:00") : new Date());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [hafta, setHafta] = useState(ilk);
  const [duzen, setDuzen] = useState<Ders | null>(null);
  const [toplu, setToplu] = useState(false);
  const [yonet, setYonet] = useState(false);
  const [ekstra, setEkstra] = useState<{ dilimler: string[]; dallar: string[] }>({ dilimler: [], dallar: [] });
  const { veri: genelVeri } = useYuklenenVeri();
  const derslikler = useMemo(() => derslikListesi(genelVeri, dersler.map((d) => d.defaultClassroom)), [genelVeri, dersler]);
  const secenek = useMemo(() => {
    const dl = new Set<string>(ekstra.dilimler), da = new Set<string>(ekstra.dallar);
    for (const d of dersler) { const x = dilimDal(d); dl.add(x.dilim); da.add(x.dal); }
    return { dilimler: [...dl].sort((a, b) => a.localeCompare(b, "tr")), dallar: [...da].sort((a, b) => a.localeCompare(b, "tr")) };
  }, [dersler, ekstra]);

  const gunler = Array.from({ length: 7 }, (_, i) => { const d = new Date(hafta); d.setDate(d.getDate() + i); return d; });
  const tarihSet = gunler.map(iso);
  const haftaDersleri = dersler.filter((d) => (d.date ? tarihSet.includes(d.date) : true));
  const kaydir = (n: number) => { const d = new Date(hafta); d.setDate(d.getDate() + 7 * n); setHafta(d); };

  const kaydet = (d: Ders) => {
    const gun = d.date ? ((new Date(d.date + "T00:00").getDay() + 6) % 7) + 1 : d.dayOfWeek;
    const x = { ...d, dayOfWeek: gun };
    onDegis(dersler.some((r) => r.id === x.id) ? dersler.map((r) => (r.id === x.id ? x : r)) : [...dersler, x]);
    setDuzen(null);
  };
  const ekle = (gunIdx: number, saat: number) => {
    const s = `${String(saat).padStart(2, "0")}:30`;
    setDuzen({ ...yeni(), date: tarihSet[gunIdx], dayOfWeek: gunIdx + 1, startTime: s, endTime: `${String(saat + 1).padStart(2, "0")}:20` });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => kaydir(-1)} className="rounded-md border border-border p-1.5 hover:bg-accent" aria-label="Önceki hafta"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={() => kaydir(1)} className="rounded-md border border-border p-1.5 hover:bg-accent" aria-label="Sonraki hafta"><ChevronRight className="h-4 w-4" /></button>
        <button onClick={() => setHafta(pazartesi(new Date()))} className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent">Bu hafta</button>
        <input type="date" value={iso(hafta)} onChange={(e) => e.target.value && setHafta(pazartesi(new Date(e.target.value + "T00:00")))} className="rounded-md border border-input bg-background px-2 py-1 text-sm" />
        <span className="text-sm text-muted-foreground">{gunler[0]!.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} – {gunler[6]!.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} · {haftaDersleri.length} ders</span>
        <button onClick={() => setToplu((v) => !v)} className={`rounded-md border px-3 py-1 text-sm ${toplu ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>Toplu düzenle</button>
        <button onClick={() => setYonet((v) => !v)} className={`rounded-md border px-3 py-1 text-sm ${yonet ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>Dilim / ana dal</button>
        <span className="ml-auto text-xs text-muted-foreground">Boş alana tıkla: ders ekle · Derse tıkla: düzenle</span>
      </div>

      {yonet && <DilimYonetimi dersler={dersler} onDegis={onDegis} ekstra={ekstra} setEkstra={setEkstra} />}
      {toplu && <TopluDuzen dersler={dersler} onDegis={onDegis} secenek={secenek} />}
      <datalist id="pt-dilimler">{secenek.dilimler.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="pt-derslikler">{derslikler.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="pt-dallar">{secenek.dallar.map((x) => <option key={x} value={x} />)}</datalist>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="grid min-w-[900px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          <div />
          {gunler.map((g, i) => (
            <div key={i} className={`border-b border-l border-border px-2 py-1.5 text-center text-xs font-semibold ${iso(g) === iso(new Date()) ? "bg-primary/10 text-primary" : ""}`}>
              {GUNLER[i]} {g.getDate()}.{g.getMonth() + 1}
            </div>
          ))}
          <div className="relative" style={{ height: (SAAT_BIT - SAAT_BAS) * PX }}>
            {Array.from({ length: SAAT_BIT - SAAT_BAS }, (_, h) => (
              <div key={h} className="absolute right-1 text-[10px] text-muted-foreground" style={{ top: h * PX }}>{SAAT_BAS + h}:00</div>
            ))}
          </div>
          {gunler.map((_, gi) => (
            <div key={gi} className="relative border-l border-border" style={{ height: (SAAT_BIT - SAAT_BAS) * PX }}>
              {Array.from({ length: SAAT_BIT - SAAT_BAS }, (_, h) => (
                <button key={h} onClick={() => ekle(gi, SAAT_BAS + h)} className="absolute inset-x-0 border-t border-border/50 hover:bg-accent/50" style={{ top: h * PX, height: PX }} aria-label="Ders ekle" />
              ))}
              {(() => {
                const liste = haftaDersleri.filter((d) => (d.date ? d.date === tarihSet[gi] : d.dayOfWeek === gi + 1)).sort((a, b) => dk(a.startTime) - dk(b.startTime));
                return liste.map((d) => {
                  const cakisan = liste.filter((o) => dk(o.startTime) < dk(d.endTime) && dk(o.endTime) > dk(d.startTime));
                  const sira = cakisan.indexOf(d), n = cakisan.length;
                  const top = ((dk(d.startTime) - SAAT_BAS * 60) / 60) * PX;
                  const h = Math.max(18, ((dk(d.endTime) - dk(d.startTime)) / 60) * PX - 2);
                  return (
                    <button key={d.id} onClick={() => setDuzen(d)} title={`${d.courseName} ${d.startTime}-${d.endTime}`}
                      className={`absolute overflow-hidden rounded-md border px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm hover:ring-2 hover:ring-primary ${d.date ? "border-primary/30 bg-primary/10" : "border-border bg-muted"}`}
                      style={{ top, height: h, left: `calc(${(sira / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}>
                      <span className="block font-semibold">{d.courseName || "(adsız)"}</span>
                      <span className="block opacity-70">{d.startTime}–{d.endTime}{d.defaultClassroom ? ` · ${d.defaultClassroom}` : ""}</span>
                    </button>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      </div>

      {duzen && <DersFormu ders={duzen} yeniMi={!dersler.some((r) => r.id === duzen.id)} kapat={() => setDuzen(null)} kaydet={kaydet}
        sil={() => { onDegis(dersler.filter((r) => r.id !== duzen.id)); setDuzen(null); }}
        kopya={() => setDuzen({ ...duzen, id: crypto.randomUUID() })} />}
    </div>
  );
}

function DersFormu({ ders, yeniMi, kapat, kaydet, sil, kopya }: { ders: Ders; yeniMi: boolean; kapat: () => void; kaydet: (d: Ders) => void; sil: () => void; kopya: () => void }) {
  const [d, setD] = useState(ders);
  const k = <K extends keyof Ders>(a: K, v: Ders[K]) => setD({ ...d, [a]: v });
  const oto = dilimDal({ ...d, dilim: undefined, dal: undefined });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={kapat}>
      <div className="w-full max-w-md space-y-3 rounded-xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{yeniMi ? "Yeni ders" : "Dersi düzenle"}</h3>
          <button onClick={kapat} aria-label="Kapat"><X className="h-4 w-4" /></button>
        </div>
        <label className="block text-xs">Ders adı<input className={girdi} value={d.courseName} onChange={(e) => k("courseName", e.target.value)} autoFocus /></label>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Tarih<input type="date" className={girdi} value={d.date ?? ""} onChange={(e) => k("date", e.target.value || undefined)} /></label>
          <label className="text-xs">Başlangıç<input type="time" className={girdi} value={d.startTime} onChange={(e) => k("startTime", e.target.value)} /></label>
          <label className="text-xs">Bitiş<input type="time" className={girdi} value={d.endTime} onChange={(e) => k("endTime", e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">Derslik
            <input role="combobox" aria-autocomplete="list" aria-describedby="pt-derslik-ipucu" list="pt-derslikler" className={girdi} value={d.defaultClassroom}
              placeholder="Listeden seç ya da yaz" onChange={(e) => setD({ ...d, defaultClassroom: e.target.value, ...(e.target.value ? {} : { sinifKesin: undefined }) })} />
          </label>
          <label className="text-xs">Hoca<input className={girdi} value={d.instructor} onChange={(e) => k("instructor", e.target.value)} /></label>
        </div>
        <p id="pt-derslik-ipucu" className="-mt-2 text-[11px] text-muted-foreground">Listede yoksa istediğin dersliği yazabilirsin.</p>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!d.sinifKesin} disabled={!d.defaultClassroom.trim()} onChange={(e) => k("sinifKesin", e.target.checked || undefined)} />
          Yönetici derslik onayı
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Tür
            <select className={girdi} value={d.courseType} onChange={(e) => setD({ ...d, courseType: e.target.value as DersTuru, turElle: true })}>
              {(Object.keys(DERS_TURU_ETIKET) as DersTuru[]).map((t) => <option key={t} value={t}>{DERS_TURU_ETIKET[t]}</option>)}
            </select>
          </label>
          <label className="text-xs">Dilim<input list="pt-dilimler" className={girdi} value={d.dilim ?? ""} placeholder={oto.dilim} onChange={(e) => k("dilim", e.target.value || undefined)} /></label>
          <label className="text-xs">Ana dal<input list="pt-dallar" className={girdi} value={d.dal ?? ""} placeholder={oto.dal} onChange={(e) => k("dal", e.target.value || undefined)} /></label>
        </div>
        <p className="text-[11px] text-muted-foreground">Dilim / ana dal boş kalırsa dosyadan otomatik okunur (soluk yazan).</p>
        <label className="block text-xs">Not<input className={girdi} value={d.notes} onChange={(e) => k("notes", e.target.value)} /></label>
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={() => kaydet(d)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tamam</button>
          {!yeniMi && <button onClick={kopya} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm"><Plus className="h-3.5 w-3.5" />Kopyala</button>}
          {!yeniMi && <button onClick={sil} className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-destructive"><Trash2 className="h-3.5 w-3.5" />Sil</button>}
        </div>
        <p className="text-[11px] text-muted-foreground">Değişiklikler yukarıdaki "Kaydet" ile kaydedilir.</p>
      </div>
    </div>
  );
}

/** Aynı ada / dilime / ana dala sahip bütün derslerin türünü, dilimini veya ana dalını tek seferde değiştir. */
function TopluDuzen({ dersler, onDegis, secenek }: { dersler: Ders[]; onDegis: (d: Ders[]) => void; secenek: { dilimler: string[]; dallar: string[] } }) {
  const [alan, setAlan] = useState<"ad" | "dilim" | "dal">("ad");
  const [ara, setAra] = useState("");
  const [tur, setTur] = useState<DersTuru | "">("");
  const [dilim, setDilim] = useState("");
  const [dal, setDal] = useState("");
  const q = ara.toLocaleLowerCase("tr-TR").trim();
  const eslesen = q
    ? dersler.filter((d) => {
        const x = dilimDal(d);
        const v = alan === "ad" ? d.courseName : alan === "dilim" ? x.dilim : x.dal;
        return v.toLocaleLowerCase("tr-TR").includes(q);
      })
    : [];
  const uygula = () => {
    if (!eslesen.length || (!tur && !dilim.trim() && !dal.trim())) return;
    if (!confirm(`${eslesen.length} ders değişecek. Emin misin?`)) return;
    const ids = new Set(eslesen.map((d) => d.id));
    onDegis(dersler.map((d) => (ids.has(d.id) ? { ...d, ...(tur ? { courseType: tur, turElle: true } : {}), ...(dilim.trim() ? { dilim: dilim.trim() } : {}), ...(dal.trim() ? { dal: dal.trim() } : {}) } : d)));
    setAra(""); setTur(""); setDilim(""); setDal("");
  };
  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-sm font-semibold">Toplu düzenle</p>
      <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
        <select className={girdi} value={alan} onChange={(e) => setAlan(e.target.value as typeof alan)}>
          <option value="ad">Ders adı içeren</option>
          <option value="dilim">Dilimi</option>
          <option value="dal">Ana dalı</option>
        </select>
        <input className={girdi} value={ara} onChange={(e) => setAra(e.target.value)} list={alan === "dilim" ? "pt-dilimler" : alan === "dal" ? "pt-dallar" : undefined} placeholder="Ara…" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select className={girdi} value={tur} onChange={(e) => setTur(e.target.value as DersTuru | "")}>
          <option value="">Tür: değiştirme</option>
          {(Object.keys(DERS_TURU_ETIKET) as DersTuru[]).map((t) => <option key={t} value={t}>{DERS_TURU_ETIKET[t]}</option>)}
        </select>
        <input className={girdi} list="pt-dilimler" value={dilim} onChange={(e) => setDilim(e.target.value)} placeholder="Yeni dilim (boş = değiştirme)" />
        <input className={girdi} list="pt-dallar" value={dal} onChange={(e) => setDal(e.target.value)} placeholder="Yeni ana dal (boş = değiştirme)" />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={uygula} disabled={!eslesen.length} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Uygula</button>
        <span className="text-xs text-muted-foreground">{q ? `${eslesen.length} ders eşleşti` : "Önce ara"} · {secenek.dilimler.length} dilim, {secenek.dallar.length} ana dal var</span>
      </div>
      {eslesen.length ? (
        <p className="max-h-20 overflow-auto text-[11px] text-muted-foreground">{[...new Set(eslesen.map((d) => d.courseName))].slice(0, 30).join(" · ")}</p>
      ) : null}
    </div>
  );
}

/** Dilim ve ana dalları listele, yeniden adlandır, yeni ekle. */
function DilimYonetimi({ dersler, onDegis, ekstra, setEkstra }: {
  dersler: Ders[]; onDegis: (d: Ders[]) => void;
  ekstra: { dilimler: string[]; dallar: string[] }; setEkstra: (e: { dilimler: string[]; dallar: string[] }) => void;
}) {
  const [yeniDilim, setYeniDilim] = useState("");
  const [acik, setAcik] = useState<string | null>(null);
  const agac = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const d of dersler) {
      const x = dilimDal(d);
      const dl = m.get(x.dilim) ?? new Map<string, number>();
      dl.set(x.dal, (dl.get(x.dal) ?? 0) + 1);
      m.set(x.dilim, dl);
    }
    for (const e of ekstra.dilimler) if (!m.has(e)) m.set(e, new Map());
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));
  }, [dersler, ekstra]);
  const dilimAdlandir = (eski: string) => {
    const yeni = prompt(`"${eski}" diliminin yeni adı:`, eski)?.trim();
    if (!yeni || yeni === eski) return;
    onDegis(dersler.map((d) => (dilimDal(d).dilim === eski ? { ...d, dilim: yeni } : d)));
    setEkstra({ ...ekstra, dilimler: ekstra.dilimler.map((x) => (x === eski ? yeni : x)) });
  };
  const dalAdlandir = (dilim: string, eski: string) => {
    const yeni = prompt(`"${eski}" ana dalının yeni adı (${dilim} içinde):`, eski)?.trim();
    if (!yeni || yeni === eski) return;
    onDegis(dersler.map((d) => { const x = dilimDal(d); return x.dilim === dilim && x.dal === eski ? { ...d, dal: yeni } : d; }));
  };
  const dalTasi = (dilim: string, dal: string) => {
    const hedef = prompt(`"${dal}" ana dalını hangi dilime taşıyalım?`, dilim)?.trim();
    if (!hedef || hedef === dilim) return;
    onDegis(dersler.map((d) => { const x = dilimDal(d); return x.dilim === dilim && x.dal === dal ? { ...d, dilim: hedef, dal } : d; }));
  };
  const dilimSil = (dilim: string, n: number) => {
    if (!n) { setEkstra({ ...ekstra, dilimler: ekstra.dilimler.filter((x) => x !== dilim) }); return; }
    const secim = prompt(`"${dilim}" dilimini sil (${n} ders):\n1 = Sadece dilimi kaldır, dersler "${DIGER}" altına geçsin\n2 = Dilimi içindeki derslerle birlikte sil\nNumarayı yaz:`)?.trim();
    if (secim === "1") onDegis(dersler.map((d) => (dilimDal(d).dilim === dilim ? { ...d, dilim: DIGER } : d)));
    else if (secim === "2" && confirm(`${n} ders kalıcı olarak silinecek. Emin misin?`)) onDegis(dersler.filter((d) => dilimDal(d).dilim !== dilim));
  };
  const dalSil = (dilim: string, dal: string, n: number) => {
    const secim = prompt(`"${dal}" ana dalını sil (${n} ders):\n1 = Sadece ana dalı kaldır, dersler "Genel" altına geçsin\n2 = Ana dalı dersleriyle birlikte sil\nNumarayı yaz:`)?.trim();
    const eslesir = (d: Ders) => { const x = dilimDal(d); return x.dilim === dilim && x.dal === dal; };
    if (secim === "1") onDegis(dersler.map((d) => (eslesir(d) ? { ...d, dal: "Genel" } : d)));
    else if (secim === "2" && confirm(`${n} ders kalıcı olarak silinecek. Emin misin?`)) onDegis(dersler.filter((d) => !eslesir(d)));
  };
  const dalEkle = (dilim: string) => {
    const ad = prompt(`${dilim} için yeni ana dal adı:`)?.trim();
    if (ad) setEkstra({ ...ekstra, dallar: [...new Set([...ekstra.dallar, ad])] });
  };
  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-sm font-semibold">Dilimler ve ana dallar</p>
      <div className="flex gap-2">
        <input className={girdi} value={yeniDilim} onChange={(e) => setYeniDilim(e.target.value)} placeholder="Yeni dilim adı (örn. DOLAŞIM DİLİMİ)" />
        <button
          onClick={() => { const a = yeniDilim.trim().toLocaleUpperCase("tr-TR"); if (a) { setEkstra({ ...ekstra, dilimler: [...new Set([...ekstra.dilimler, a])] }); setYeniDilim(""); } }}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
        >Dilim ekle</button>
      </div>
      <p className="text-[11px] text-muted-foreground">Yeni eklenen dilim / ana dal, bir derse atanıp "Kaydet"e basılınca kalıcı olur. Ders atamak için derse tıkla ya da "Toplu düzenle"yi kullan. Yanlışlıkla silersen alttaki "Geri al" ile dönebilirsin.</p>
      <ul className="max-h-80 space-y-1 overflow-auto">
        {agac.map(([dilim, dallar]) => (
          <li key={dilim} className="rounded-lg bg-surface px-2 py-1.5">
            <div className="flex items-center gap-2">
              <button onClick={() => setAcik(acik === dilim ? null : dilim)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold">
                {dilim} <span className="text-xs font-normal text-muted-foreground">· {dallar.size} ana dal · {[...dallar.values()].reduce((a, b) => a + b, 0)} ders</span>
              </button>
              <button onClick={() => dilimAdlandir(dilim)} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent">Yeniden adlandır</button>
              <button onClick={() => dalEkle(dilim)} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent">+ Ana dal</button>
              <button onClick={() => dilimSil(dilim, [...dallar.values()].reduce((a, b) => a + b, 0))} className="rounded border border-destructive/40 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10">Sil</button>
            </div>
            {acik === dilim ? (
              <ul className="mt-1 space-y-0.5 pl-3">
                {[...dallar.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr")).map(([dal, n]) => (
                  <li key={dal} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{dal} <span className="text-muted-foreground">({n})</span></span>
                    <button onClick={() => dalAdlandir(dilim, dal)} className="rounded border border-border px-1.5 py-0.5 hover:bg-accent">Adlandır</button>
                    <button onClick={() => dalTasi(dilim, dal)} className="rounded border border-border px-1.5 py-0.5 hover:bg-accent">Başka dilime taşı</button>
                    <button onClick={() => dalSil(dilim, dal, n)} className="rounded border border-destructive/40 px-1.5 py-0.5 text-destructive hover:bg-destructive/10">Sil</button>
                  </li>
                ))}
                {!dallar.size ? <li className="text-xs text-muted-foreground">Henüz ders yok</li> : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
