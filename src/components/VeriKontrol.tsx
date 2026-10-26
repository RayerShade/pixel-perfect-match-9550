import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { aiVeriDuzelt } from "@/lib/ai-veri.functions";
import { DIGER, dilimDal, yazimFarklari } from "@/lib/dilim";
import { DERS_TURU_ETIKET, dersTuruDuzelt, uygulamaTuru, type Ders, type DersTuru, type UygulamaOlayi } from "@/lib/schedule-data";

const girdi = "rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs";
const tusS = "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-40";
const dakika = (s: string) => { const [h = NaN, m = NaN] = s.split(":").map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN; };

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
    // Amfi listesi haftalık gelir; yalnızca açık haftadaki yer eksiklerini/çakışmalarını uyar.
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const haftaBaslangic = new Date(bugun); haftaBaslangic.setDate(bugun.getDate() - ((bugun.getDay() + 6) % 7));
    const haftaBitis = new Date(haftaBaslangic); haftaBitis.setDate(haftaBaslangic.getDate() + 6);
    const buHafta = (tarih?: string) => {
      if (!tarih) return false;
      const gun = new Date(`${tarih}T12:00:00`);
      return gun >= haftaBaslangic && gun <= haftaBitis;
    };
    const eksikler = [
      ...dersler.filter((d) => d.date && !d.defaultClassroom.trim() && buHafta(d.date)).map((d) => ({ tur: "Bu hafta amfisi yok", ad: d.courseName, zaman: d.date! })),
      ...uygulamalar.filter((u) => !u.yer.trim()).map((u) => ({ tur: "Yeri yok", ad: u.ad, zaman: u.date })),
      ...uygulamalar.filter((u) => !u.gruplar.length).map((u) => ({ tur: "Grubu belirsiz", ad: u.ad, zaman: u.date })),
      ...dersler.filter((d) => !Number.isFinite(dakika(d.startTime)) || !Number.isFinite(dakika(d.endTime)) || dakika(d.startTime) >= dakika(d.endTime)).map((d) => ({ tur: "Saat geçersiz", ad: d.courseName, zaman: d.date ?? `Gün ${d.dayOfWeek}` })),
      ...uygulamalar.filter((u) => !Number.isFinite(dakika(u.startTime)) || !Number.isFinite(dakika(u.endTime)) || dakika(u.startTime) >= dakika(u.endTime)).map((u) => ({ tur: "Saat geçersiz", ad: u.ad, zaman: u.date })),
    ];
    const yerler = [
      ...dersler.filter((d) => d.defaultClassroom.trim() && buHafta(d.date)).map((d) => ({ ad: d.courseName, yer: d.defaultClassroom.trim().toLocaleLowerCase("tr"), tarih: d.date!, bas: dakika(d.startTime), bit: dakika(d.endTime) })),
      ...uygulamalar.filter((u) => u.yer.trim() && buHafta(u.date)).map((u) => ({ ad: u.ad, yer: u.yer.trim().toLocaleLowerCase("tr"), tarih: u.date, bas: dakika(u.startTime), bit: dakika(u.endTime) })),
    ];
    const cakismalar: { yer: string; tarih: string; dersler: string[] }[] = [];
    for (let i = 0; i < yerler.length; i++) for (let j = i + 1; j < yerler.length; j++) {
      const a = yerler[i], b = yerler[j];
      if (a && b && a.yer === b.yer && a.tarih === b.tarih && a.bas < b.bit && b.bas < a.bit) cakismalar.push({ yer: a.yer, tarih: a.tarih, dersler: [a.ad, b.ad] });
    }
    return { dilimFark: yazimFarklari(dilimler, true), dalFark: yazimFarklari(dallar, false), turDegisen, uygTur, dilimsiz, eksikler, cakismalar };
  }, [dersler, uygulamalar]);
  const sorun = rapor.dilimFark.length + rapor.dalFark.length + rapor.turDegisen.length + rapor.uygTur.length + rapor.eksikler.length + rapor.cakismalar.length;

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
            <p className="font-semibold">Derslik ve zaman uyarıları ({rapor.eksikler.length + rapor.cakismalar.length})</p>
            {!rapor.eksikler.length && !rapor.cakismalar.length ? <p className="text-muted-foreground">Eksik alan veya amfi çakışması yok.</p> : null}
            <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto">
              {rapor.eksikler.map((x, i) => <li key={`e-${i}`}><b className="text-destructive">{x.tur}</b> · {x.zaman} · {x.ad}</li>)}
              {rapor.cakismalar.map((x, i) => <li key={`c-${i}`}><b className="text-destructive">Amfi çakışması</b> · {x.tarih} · {x.yer}: {x.dersler.join(" / ")}</li>)}
            </ul>
            <p className="mt-1 text-muted-foreground">Bu bölüm yalnızca içinde bulunulan haftanın amfi kaynaklı sorunlarını listeler. Satırı aşağıdaki ders/uygulama ekranından düzenleyip Kaydet'e bas.</p>
          </section>
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

type AiDegisiklik = {
  hedef: "ders" | "uygulama"; id: string; islem: "guncelle" | "sil"; neden: string;
  alanlar: { ad: string | null; tur: DersTuru | null; dilim: string | null; dal: string | null; derslik: string | null; tarih: string | null; baslangic: string | null; bitis: string | null };
};

/** Admin: yapay zekâ veriyi inceler ya da yazılan talimatı uygular; öneriler önce gösterilir, seçilenler uygulanır (Kaydet'e kadar yayınlanmaz). */
export function AiAsistan({
  dersler,
  uygulamalar,
  onDegis,
}: {
  dersler: Ders[];
  uygulamalar: UygulamaOlayi[];
  onDegis: (p: { dersler?: Ders[]; uygulamalar?: UygulamaOlayi[] }) => void;
}) {
  const calistir = useServerFn(aiVeriDuzelt);
  const [talimat, setTalimat] = useState("");
  const [saglayici, setSaglayici] = useState<"lovable" | "deepseek">("lovable");
  const [dsModel, setDsModel] = useState<"deepseek-chat" | "deepseek-reasoner">("deepseek-chat");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ ozet: string; liste: AiDegisiklik[] } | null>(null);
  const [secili, setSecili] = useState<Set<number>>(new Set());
  const dMap = useMemo(() => new Map(dersler.map((d) => [d.id, d])), [dersler]);
  const uMap = useMemo(() => new Map(uygulamalar.map((u) => [u.id, u])), [uygulamalar]);
  const kisa = (s: string, n: number) => (s ?? "").replace(/[|\n\r]+/g, " ").slice(0, n);

  const baslat = async () => {
    const satirlar = [
      ...dersler.map((d) => { const x = dilimDal(d); return `D|${d.id}|${d.date ?? `gün${d.dayOfWeek}`}|${d.startTime}-${d.endTime}|${kisa(d.courseName, 120)}|${d.courseType}|${x.dilim}|${x.dal}|${kisa(d.defaultClassroom, 40)}|${kisa(d.notes, 80)}`; }),
      ...uygulamalar.map((u) => `U|${u.id}|${u.date}|${u.startTime}-${u.endTime}|${kisa(u.ad, 120)}|${uygulamaTuru(u)}|${kisa(u.dilim, 60)}|${kisa(u.dal ?? "", 60)}|${kisa(u.yer, 40)}|${u.gruplar.join(",")}`),
    ].slice(0, 4000);
    if (!satirlar.length) { toast.error("Bu programda veri yok."); return; }
    setYukleniyor(true); setSonuc(null);
    try {
      const r = await calistir({ data: { satirlar, talimat: talimat.trim() || undefined, saglayici, dsModel } });
      if (!r.ok) { toast.error(r.mesaj); return; }
      const liste = r.degisiklikler.filter((c) => (c.hedef === "ders" ? dMap.has(c.id) : uMap.has(c.id)));
      setSonuc({ ozet: r.ozet, liste });
      setSecili(new Set(liste.map((_, i) => i)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yapay zekâ isteği başarısız.");
    } finally { setYukleniyor(false); }
  };

  const etiket = (c: AiDegisiklik) => {
    const a = c.alanlar; const p: string[] = [];
    if (c.hedef === "ders") {
      const d = dMap.get(c.id)!; const x = dilimDal(d);
      if (a.ad != null) p.push(`ad: ${d.courseName} → ${a.ad}`);
      if (a.tur) p.push(`tür: ${DERS_TURU_ETIKET[d.courseType]} → ${DERS_TURU_ETIKET[a.tur]}`);
      if (a.dilim != null) p.push(`dilim: ${x.dilim} → ${a.dilim}`);
      if (a.dal != null) p.push(`ana dal: ${x.dal} → ${a.dal}`);
      if (a.derslik != null) p.push(`derslik: ${d.defaultClassroom || "—"} → ${a.derslik}`);
      if (a.tarih) p.push(`tarih: ${d.date ?? "—"} → ${a.tarih}`);
      if (a.baslangic || a.bitis) p.push(`saat: ${d.startTime}-${d.endTime} → ${a.baslangic ?? d.startTime}-${a.bitis ?? d.endTime}`);
      return { baslik: `${d.date ?? ""} ${d.startTime} ${d.courseName}`, p };
    }
    const u = uMap.get(c.id)!;
    if (a.ad != null) p.push(`ad: ${u.ad || "—"} → ${a.ad}`);
    if (a.tur) p.push(`tür: ${DERS_TURU_ETIKET[uygulamaTuru(u)]} → ${DERS_TURU_ETIKET[a.tur]}`);
    if (a.dilim != null) p.push(`dilim: ${u.dilim || "—"} → ${a.dilim}`);
    if (a.dal != null) p.push(`ana dal: ${u.dal || "—"} → ${a.dal}`);
    if (a.derslik != null) p.push(`yer: ${u.yer || "—"} → ${a.derslik}`);
    if (a.tarih) p.push(`tarih: ${u.date} → ${a.tarih}`);
    if (a.baslangic || a.bitis) p.push(`saat: ${u.startTime}-${u.endTime} → ${a.baslangic ?? u.startTime}-${a.bitis ?? u.endTime}`);
    return { baslik: `${u.date} ${u.startTime} ${u.ad} (uygulama)`, p };
  };

  const uygula = () => {
    if (!sonuc) return;
    const sec = sonuc.liste.filter((_, i) => secili.has(i));
    const dS = new Map(sec.filter((c) => c.hedef === "ders").map((c) => [c.id, c]));
    const uS = new Map(sec.filter((c) => c.hedef === "uygulama").map((c) => [c.id, c]));
    const yeniD = dersler.flatMap((d) => {
      const c = dS.get(d.id); if (!c) return [d];
      if (c.islem === "sil") return [];
      const a = c.alanlar;
      return [{ ...d, ...(a.ad != null ? { courseName: a.ad } : {}), ...(a.tur ? { courseType: a.tur, turElle: true } : {}), ...(a.dilim != null ? { dilim: a.dilim } : {}), ...(a.dal != null ? { dal: a.dal } : {}), ...(a.derslik != null ? { defaultClassroom: a.derslik } : {}), ...(a.tarih ? { date: a.tarih } : {}), ...(a.baslangic ? { startTime: a.baslangic } : {}), ...(a.bitis ? { endTime: a.bitis } : {}) }];
    });
    const yeniU = uygulamalar.flatMap((u) => {
      const c = uS.get(u.id); if (!c) return [u];
      if (c.islem === "sil") return [];
      const a = c.alanlar;
      return [{ ...u, ...(a.ad != null ? { ad: a.ad } : {}), ...(a.tur ? { tur: a.tur, turElle: true } : {}), ...(a.dilim != null ? { dilim: a.dilim } : {}), ...(a.dal != null ? { dal: a.dal } : {}), ...(a.derslik != null ? { yer: a.derslik } : {}), ...(a.tarih ? { date: a.tarih } : {}), ...(a.baslangic ? { startTime: a.baslangic } : {}), ...(a.bitis ? { endTime: a.bitis } : {}) }];
    });
    onDegis({ dersler: yeniD, uygulamalar: yeniU });
    toast.success(`${sec.length} değişiklik uygulandı. Kontrol edip Kaydet'e bas.`);
    setSonuc(null);
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
      <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Yapay zekâ asistanı</p>
      <p className="text-muted-foreground">Boş bırakırsan bu programdaki hataları arar. Ya da ne düzeltmesini istediğini yaz (örn. "12 Ekim'deki mikroskop uygulamasının dilimini Hücre yap"). Değişiklikler önce sana gösterilir.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-muted-foreground">Yapay zekâ:</label>
        <select className={girdi} value={saglayici} onChange={(e) => setSaglayici(e.target.value as "lovable" | "deepseek")}>
          <option value="lovable">Lovable AI (kredi)</option>
          <option value="deepseek">DeepSeek (kendi bakiyen)</option>
        </select>
        {saglayici === "deepseek" ? (
          <select className={girdi} value={dsModel} onChange={(e) => setDsModel(e.target.value as "deepseek-chat" | "deepseek-reasoner")}>
            <option value="deepseek-chat">DeepSeek Chat (hızlı)</option>
            <option value="deepseek-reasoner">DeepSeek Reasoner (düşünerek)</option>
          </select>
        ) : null}
      </div>
      <textarea className={`${girdi} min-h-16 w-full`} placeholder="İsteğe bağlı talimat…" value={talimat} onChange={(e) => setTalimat(e.target.value)} />
      <button className={tusS} disabled={yukleniyor} onClick={baslat}>
        {yukleniyor ? <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Yapay zekâ inceliyor…</> : talimat.trim() ? "Talimatı uygula" : "Yapay zekâ ile incele"}
      </button>
      {sonuc ? (
        <div className="space-y-2 border-t border-border pt-2">
          <p>{sonuc.ozet}</p>
          {!sonuc.liste.length ? <p className="text-muted-foreground">Önerilen değişiklik yok.</p> : (
            <>
              <div className="flex gap-3 text-muted-foreground">
                <button className="underline" onClick={() => setSecili(new Set(sonuc.liste.map((_, i) => i)))}>Tümünü seç</button>
                <button className="underline" onClick={() => setSecili(new Set())}>Hiçbiri</button>
              </div>
              <ul className="max-h-80 space-y-1.5 overflow-auto">
                {sonuc.liste.map((c, i) => {
                  const e = etiket(c);
                  return (
                    <li key={i} className="flex gap-2 rounded-lg border border-border bg-background p-2">
                      <input type="checkbox" checked={secili.has(i)} onChange={() => { const s = new Set(secili); if (s.has(i)) s.delete(i); else s.add(i); setSecili(s); }} />
                      <div className="min-w-0">
                        <p className="font-semibold">{e.baslik}</p>
                        {c.islem === "sil" ? <p className="text-destructive">Silinecek</p> : e.p.map((t) => <p key={t}>{t}</p>)}
                        <p className="text-muted-foreground">{c.neden}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2">
                <button className={tusS} disabled={!secili.size} onClick={uygula}>Seçilenleri uygula ({secili.size})</button>
                <button className={tusS} onClick={() => setSonuc(null)}>Vazgeç</button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
