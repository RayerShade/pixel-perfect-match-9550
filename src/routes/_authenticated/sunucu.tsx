import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Activity, History, LifeBuoy, CalendarRange, Clock, Database, FileSpreadsheet, HardDrive, Megaphone, RefreshCw, Server, Users, ShieldCheck, CheckCircle2, AlertTriangle, CalendarClock, Play, Plus, X, Timer, Crown } from "lucide-react";
import { IslemGecmisi, OgrenciDevam } from "@/components/SunucuEk";
import { supabase } from "@/integrations/supabase/client";
import { ProgramYonetimi } from "@/components/ProgramYonetimi";
import { AppShell } from "@/components/AppShell";
import { VeriYukleme } from "@/components/VeriYukleme";
import { useDonemler } from "@/components/DonemSecici";
import type { Hedef } from "@/lib/hedef";
import { TalepListesi, TalepSohbet, useTalepler } from "@/components/Destek";
import {
  TABLOLAR, dosyaIslem, dosyaListele, kullaniciDuzenle, kullaniciEkIslem, kullaniciIslem, kullaniciOlustur,
  satirKaydet, satirSil, sunucuKullanicilar, sunucuOzet, tabloOku, tamYedek, yedekGeriYukle,
} from "@/lib/sunucu.functions";
import { sheetsKaynakListele, sheetsKaynakPlanGuncelle, sheetsSimdiKontrol } from "@/lib/sheets-takip.functions";

export const Route = createFileRoute("/_authenticated/sunucu")({
  beforeLoad: () => { throw redirect({ to: "/admin" }); },
  head: () => ({ meta: [{ title: "Yönetim paneli" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SunucuKapi,
});

function SunucuKapi() {
  const q = useQuery({ queryKey: ["panel-yetki"], queryFn: async () => (await supabase.rpc("orijinal_admin_mi")).data === true });
  const [sifre, setSifre] = useState("");
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState("");
  if (q.isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">yükleniyor…</div>;
  if (q.data) return <SuperYonetim />;
  const gir = async (e: React.FormEvent) => {
    e.preventDefault(); setBekle(true); setMesaj("");
    const { data, error } = await supabase.rpc("panel_sifre_dene", { _sifre: sifre });
    setBekle(false);
    if (error) return setMesaj(error.message);
    if (!data) return setMesaj("Şifre hatalı.");
    await q.refetch();
  };
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={(e) => void gir(e)} className="w-full max-w-xs space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" /><b>Sunucu paneli</b></div>
        <input type="password" autoFocus value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="Panel şifresi" className={`${giris} w-full`} />
        {mesaj ? <p className="text-xs text-destructive">{mesaj}</p> : null}
        <button type="submit" disabled={bekle || !sifre} className={`${ana} w-full justify-center py-2 text-sm`}>Gir</button>
        <a href="/" className="block text-center text-xs text-muted-foreground hover:underline">Siteye dön</a>
      </form>
    </div>
  );
}

type Sekme = "ozet" | "kullanicilar" | "destek" | "ortak" | "donem" | "veri" | "dosyalar" | "kontrol" | "duyuru" | "yedek" | "gecmis";
const SEKMELER: { id: Sekme; ad: string; ikon: typeof Users }[] = [
  { id: "ozet", ad: "Özet", ikon: Activity },
  { id: "kullanicilar", ad: "Kullanıcılar", ikon: Users },
  { id: "destek", ad: "Destek", ikon: LifeBuoy },
  { id: "ortak", ad: "Ortak dosyalar", ikon: FileSpreadsheet },
  { id: "donem", ad: "Dönemler", ikon: CalendarRange },
  { id: "veri", ad: "Veritabanı", ikon: Database },
  { id: "dosyalar", ad: "Dosyalar", ikon: FileSpreadsheet },
  { id: "kontrol", ad: "Kontroller", ikon: Clock },
  { id: "duyuru", ad: "Duyuru", ikon: Megaphone },
  { id: "yedek", ad: "Yedek", ikon: HardDrive },
  { id: "gecmis", ad: "İşlem Geçmişi", ikon: History },
];
const SEKME_GRUPLARI: { baslik: string; ids: Sekme[] }[] = [
  { baslik: "Genel", ids: ["ozet", "kullanicilar"] },
  { baslik: "Akademik", ids: ["ortak", "donem"] },
  { baslik: "İletişim", ids: ["destek", "duyuru"] },
  { baslik: "Sistem", ids: ["kontrol", "dosyalar", "veri", "yedek", "gecmis"] },
];
const btn = "ui-control inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50";
const ana = `${btn} border-primary bg-primary text-primary-foreground hover:bg-primary/90`;
const tehlike = `${btn} text-destructive hover:bg-destructive/10`;
const giris = "rounded-xl border border-border bg-background px-3 py-2 text-sm";
const hata = (e: unknown) => toast.error(e instanceof Error ? e.message : "Hata");
const tarih = (s?: string | null) => (s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—");
const once = (s?: string | null) => {
  if (!s) return "hiç";
  const d = (Date.now() - new Date(s).getTime()) / 60000;
  return d < 60 ? `${Math.round(d)} dk önce` : d < 1440 ? `${Math.round(d / 60)} sa önce` : `${Math.round(d / 1440)} gün önce`;
};
const indirMetin = (ad: string, metin: string, tip = "application/json") => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([metin], { type: tip }));
  a.download = ad; a.click(); URL.revokeObjectURL(a.href);
};

function Kart({ baslik, children, sag }: { baslik: string; children: ReactNode; sag?: ReactNode }) {
  return (
    <section className="ui-surface rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{baslik}</h2><div className="ml-auto flex flex-wrap gap-1">{sag}</div></div>
      {children}
    </section>
  );
}

export function SuperYonetim({ adminGorunumuneDon }: { adminGorunumuneDon?: () => void }) {
  const [sekme, setSekme] = useState<Sekme>("ozet");
  const aktifSekme = SEKMELER.find((x) => x.id === sekme) ?? SEKMELER[0]!;
  const I = aktifSekme.ikon;
  const icerik = sekme === "ozet" ? <Ozet git={setSekme} /> : sekme === "kullanicilar" ? <Kullanicilar /> : sekme === "destek" ? <DestekYonetim /> : sekme === "ortak" ? <OrtakYonetim /> : sekme === "donem" ? <ProgramYonetimi /> : sekme === "veri" ? <Veri /> : sekme === "dosyalar" ? <Dosyalar /> : sekme === "kontrol" ? <SheetsKontroller /> : sekme === "duyuru" ? <Duyuru /> : sekme === "gecmis" ? <IslemGecmisi /> : <Yedek />;
  return (
    <AppShell baslik="Yönetim" aciklama="Sistem, akademik veri ve iletişim araçlarını yönet.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Crown className="h-4 w-4" /></span><div><p className="text-xs font-bold">Süper admin görünümü</p><p className="text-[11px] text-muted-foreground">Tüm yönetim araçları açık.</p></div></div>
        {adminGorunumuneDon ? <div role="group" aria-label="Yönetim görünümü" className="relative grid grid-cols-2 rounded-xl bg-accent p-1">
          <span aria-hidden="true" className="absolute inset-y-1 w-[calc(50%-0.25rem)] translate-x-[calc(100%+0.25rem)] rounded-lg bg-primary shadow-sm" />
          <button onClick={adminGorunumuneDon} className="relative z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Admin</button>
          <button aria-pressed="true" className="relative z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary-foreground"><Crown className="h-3.5 w-3.5" />Süper</button>
        </div> : null}
      </div>
      <nav aria-label="Süper admin bölümleri" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5 no-scrollbar md:hidden">
        {SEKMELER.map(({ id, ad, ikon: Ikon }) => <button key={id} onClick={() => setSekme(id)} className={`ui-control flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${sekme === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground"}`}><Ikon className="h-3.5 w-3.5" />{ad}</button>)}
      </nav>
      <div className="grid gap-4 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside className="ui-surface hidden h-fit rounded-3xl border border-border bg-surface p-2 md:block">
          <div className="px-2 py-2"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Bölümler</p></div>
          {SEKME_GRUPLARI.map((grup) => <div key={grup.baslik} className="mb-3 last:mb-0"><p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">{grup.baslik}</p><div className="space-y-0.5">{grup.ids.map((id) => { const item = SEKMELER.find((x) => x.id === id)!; const Ikon = item.ikon; return <button key={id} onClick={() => setSekme(id)} className={`ui-control flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold ${sekme === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Ikon className="h-4 w-4" />{item.ad}</button>; })}</div></div>)}
        </aside>
        <main className="min-w-0 space-y-4">
          <section className="ui-surface flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary"><I className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Süper admin</p><h2 className="text-lg font-bold">{aktifSekme.ad}</h2></div>
          </section>
          {icerik}
        </main>
      </div>
    </AppShell>
  );
}
function OrtakYonetim() {
  return <div className="space-y-4">
    <Kart baslik="Herkes için ortak dosyalar">
      <p className="mb-4 text-xs text-muted-foreground">Haftalık amfi programı ve genel seçmeli programını buradan yönet. Bu dosyalar tüm öğrencilerin takvimine yansır.</p>
      <VeriYukleme tur="genel" />
    </Kart>
  </div>;
}

function Ozet({ git }: { git: (s: Sekme) => void }) {
  const f = useServerFn(sunucuOzet);
  const q = useQuery({ queryKey: ["sunucu-ozet"], queryFn: () => f() });
  const d = q.data;
  const kutular: [string, number | undefined, Sekme][] = [
    ["Toplam hesap", d?.toplam, "kullanicilar"], ["Onaylı", d?.onayli, "kullanicilar"], ["Yasaklı", d?.yasakli, "kullanicilar"],
    ["Google ile", d?.google, "kullanicilar"], ["Son 24 saat aktif", d?.aktif24, "kullanicilar"], ["Son 7 gün aktif", d?.aktif7, "kullanicilar"],
    ["Admin", d?.admin, "kullanicilar"], ["Yıllık program yüklü", d?.yillikYuklu, "veri"], ["Öğrenci listesi yüklü", d?.ogrenciYuklu, "veri"],
    ["Seçmeli seçmiş", d?.secmeliSecen, "veri"],
  ];
  const enCok = Math.max(1, ...(d?.kayit14 ?? [0]));
  return (
    <>
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kutular.map(([ad, v, s]) => (
          <button key={ad} onClick={() => git(s)} className="rounded-xl border border-border bg-card p-3 text-left shadow-sm hover:border-primary">
            <div className="text-2xl font-bold tabular-nums">{q.isLoading ? "…" : v ?? 0}</div>
            <div className="text-xs text-muted-foreground">{ad}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Kart baslik="Son 14 günde yeni kayıtlar" sag={<button className={btn} onClick={() => void q.refetch()}><RefreshCw className="h-3 w-3" />yenile</button>}>
          <div className="flex h-32 items-end gap-1">
            {(d?.kayit14 ?? []).map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${13 - i} gün önce: ${n}`}>
                <span className="text-[10px] text-muted-foreground">{n || ""}</span>
                <div className="w-full rounded-t bg-primary" style={{ height: `${(n / enCok) * 100}%`, minHeight: 2 }} />
              </div>
            ))}
          </div>
        </Kart>
        <Kart baslik="Ortak dosyalar (son güncelleme)">
          {(d?.genel ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Kayıt yok.</p> : (
            <ul className="space-y-1 text-sm">{d!.genel.map((g) => <li key={g.anahtar} className="flex justify-between"><span className="font-mono">{g.anahtar}</span><span className="text-muted-foreground">{tarih(g.updated_at)}</span></li>)}</ul>
          )}
        </Kart>
      </div>
    </>
  );
}

type Kul = Awaited<ReturnType<typeof sunucuKullanicilar>>[number];

function Kullanicilar() {
  const getir = useServerFn(sunucuKullanicilar);
  const oku = useServerFn(tabloOku);
  const islem = useServerFn(kullaniciIslem);
  const ek = useServerFn(kullaniciEkIslem);
  const olustur = useServerFn(kullaniciOlustur);
  const duzenle = useServerFn(kullaniciDuzenle);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sunucu-kul"], queryFn: () => getir() });
  const prof = useQuery({ queryKey: ["sunucu-tablo", "profiles"], queryFn: async () => JSON.parse(await oku({ data: { tablo: "profiles" } })) as { id: string; ad_soyad: string; ogrenci_no: string }[] });
  const rol = useQuery({ queryKey: ["sunucu-tablo", "user_roles"], queryFn: async () => JSON.parse(await oku({ data: { tablo: "user_roles" } })) as { user_id: string; role: string }[] });
  const ud = useQuery({ queryKey: ["sunucu-tablo", "user_data"], queryFn: async () => JSON.parse(await oku({ data: { tablo: "user_data" } })) as { user_id: string; ayarlar: Record<string, unknown> }[] });
  const [ara, setAra] = useState("");
  const [filtre, setFiltre] = useState<"hepsi" | "onaysiz" | "yasakli" | "admin" | "hic">("hepsi");
  const [sira, setSira] = useState<"olusturma" | "sonGiris" | "email">("olusturma");
  const [link, setLink] = useState<{ ad: string; url: string } | null>(null);
  const [yeni, setYeni] = useState(false);
  const [duz, setDuz] = useState<string | null>(null);
  const [seciliId, setSeciliId] = useState<string | null>(null);

  const profMap = useMemo(() => new Map((prof.data ?? []).map((p) => [p.id, p])), [prof.data]);
  const ayarMap = useMemo(() => new Map((ud.data ?? []).map((x) => [x.user_id, x.ayarlar ?? {}])), [ud.data]);
  const adminler = useMemo(() => new Set((rol.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)), [rol.data]);
  const sup = useQuery({ queryKey: ["super-adminler"], queryFn: async () => (await supabase.from("super_adminler").select("user_id")).data ?? [] });
  const superler = useMemo(() => new Set((sup.data ?? []).map((r) => r.user_id)), [sup.data]);
  const okul = useQuery({ queryKey: ["okul-epostasi-zorunlu"], queryFn: async () => (await supabase.rpc("okul_epostasi_zorunlu_mu")).data === true });
  const yenile = () => { void qc.invalidateQueries({ queryKey: ["sunucu-kul"] }); void qc.invalidateQueries({ queryKey: ["sunucu-tablo"] }); void qc.invalidateQueries({ queryKey: ["sunucu-ozet"] }); };

  const yeniKaydet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await olustur({ data: { email: String(f.get("email") ?? ""), sifre: String(f.get("sifre") ?? ""), dil: String(f.get("dil") ?? "tr") as "tr" | "en", adSoyad: String(f.get("ad") ?? ""), ogrenciNo: String(f.get("no") ?? "") } });
      toast.success("Hesap oluşturuldu"); setYeni(false); yenile();
    } catch (err) { hata(err); }
  };
  const duzKaydet = async (u: Kul, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await duzFn(u, f);
      toast.success("Kaydedildi"); setDuz(null); yenile();
    } catch (err) { hata(err); }
  };
  const duzFn = (u: Kul, f: FormData) => {
    const p = profMap.get(u.id);
    const elle = (ayarMap.get(u.id) ?? {})["grupElle"] as { grup?: string; altGrup?: string } | null | undefined;
    const val = (k: string) => String(f.get(k) ?? "").trim();
    const grupDegisti = val("grup") !== String(elle?.grup ?? "") || val("altGrup") !== String(elle?.altGrup ?? "");
    return duzenle({
      data: {
        userId: u.id,
        email: val("email") && val("email") !== u.email ? val("email") : undefined,
        sifre: val("sifre") || undefined,
        dil: val("dil") as "tr" | "en",
        adSoyad: val("ad") !== (p?.ad_soyad ?? "") ? val("ad") : undefined,
        ogrenciNo: val("no") !== (p?.ogrenci_no ?? "") ? val("no") : undefined,
        grup: grupDegisti ? val("grup") : undefined,
        altGrup: grupDegisti ? val("altGrup") : undefined,
      },
    });
  };

  const yap = async (u: Kul, i: "onayla" | "yasakla" | "yasakKaldir" | "cikisYaptir", ad: string) => {
    if (!confirm(`${u.email}: ${ad}?`)) return;
    try { await islem({ data: { userId: u.id, islem: i } }); toast.success("Tamam"); yenile(); } catch (e) { hata(e); }
  };
  const ekYap = async (u: Kul, i: "sil" | "adminVer" | "adminAl" | "sifreLinki" | "girisLinki", ad: string) => {
    if (i === "sil" ? !confirm(`${u.email} ve TÜM verileri kalıcı olarak silinsin mi?`) : (i === "adminVer" || i === "adminAl") && !confirm(`${u.email}: ${ad}?`)) return;
    try {
      const r = await ek({ data: { userId: u.id, islem: i, origin: window.location.origin } });
      if (r.link) setLink({ ad: `${u.email} — ${ad}`, url: r.link }); else toast.success("Tamam");
      yenile();
    } catch (e) { hata(e); }
  };
  const superYap = async (u: Kul, ver: boolean) => {
    if (!confirm(`${u.email}: ${ver ? "super admin yap" : "super admin yetkisini al"}?`)) return;
    const { error } = await supabase.rpc("super_admin_ayarla", { _user_id: u.id, _ver: ver });
    if (error) { hata(new Error(error.message)); return; }
    toast.success("Tamam"); void sup.refetch(); yenile();
  };
  const okulAyarla = async () => {
    const hedef = !okul.data;
    if (!confirm(hedef
      ? "Yeni hesaplar yalnızca @ogr.iu.edu.tr uzantılı e-postayla açılsın mı? (super adminler her zaman açıktan)"
      : "Okul e-postası zorunluluğu kaldırılsın mı? Her e-posta ile hesap açılabilsin mi?")) return;
    const { error } = await supabase.rpc("okul_epostasi_ayarla", { _ver: hedef });
    if (error) { hata(new Error(error.message)); return; }
    toast.success(hedef ? "Artık yalnızca okul e-postasıyla hesap açılabilir" : "Artık her e-posta ile hesap açılabilir");
    void okul.refetch();
  };

  const liste = (q.data ?? [])
    .filter((u) => {
      const p = profMap.get(u.id);
      const m = `${u.email} ${u.id} ${p?.ad_soyad ?? ""} ${p?.ogrenci_no ?? ""}`.toLocaleLowerCase("tr-TR");
      if (!m.includes(ara.toLocaleLowerCase("tr-TR"))) return false;
      return filtre === "hepsi" || (filtre === "onaysiz" && !u.onayli) || (filtre === "yasakli" && u.yasakli) || (filtre === "admin" && adminler.has(u.id)) || (filtre === "hic" && !u.sonGiris);
    })
    .sort((a, b) => sira === "email" ? a.email.localeCompare(b.email) : String(b[sira] ?? "").localeCompare(String(a[sira] ?? "")));

  const csv = () => {
    const satir = [["email", "ad_soyad", "ogrenci_no", "yontem", "olusturma", "son_giris", "onayli", "yasakli", "admin"]];
    for (const u of liste) { const p = profMap.get(u.id); satir.push([u.email, p?.ad_soyad ?? "", p?.ogrenci_no ?? "", u.yontem, u.olusturma, u.sonGiris ?? "", String(u.onayli), String(u.yasakli), String(adminler.has(u.id))]); }
    indirMetin("kullanicilar.csv", "\uFEFF" + satir.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n"), "text/csv");
  };

  const secili = liste.find((u) => u.id === seciliId) ?? liste[0] ?? null;
  const sayilar = {
    toplam: q.data?.length ?? 0,
    onaysiz: (q.data ?? []).filter((u) => !u.onayli).length,
    yasakli: (q.data ?? []).filter((u) => u.yasakli).length,
    admin: (q.data ?? []).filter((u) => adminler.has(u.id)).length,
  };

  return (
    <div className="space-y-4">
      <section className="ui-surface overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-primary">Hesap merkezi</p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">Kullanıcıları tek yerden yönet</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Arama, yetki, erişim ve öğrenci bilgileri aynı çalışma alanında. Soldan bir kullanıcı seçerek ayrıntıları aç.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={ana} onClick={() => setYeni((v) => !v)}>{yeni ? "Yeni kullanıcıyı kapat" : "+ Yeni kullanıcı"}</button>
            <button className={btn} onClick={csv}>CSV indir</button>
            <button className={btn} onClick={yenile}><RefreshCw className="h-3.5 w-3.5" />Yenile</button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {[
            ["Toplam hesap", sayilar.toplam, "hepsi" as const],
            ["Onay bekleyen", sayilar.onaysiz, "onaysiz" as const],
            ["Admin", sayilar.admin, "admin" as const],
            ["Yasaklı", sayilar.yasakli, "yasakli" as const],
          ].map(([ad, sayi, id]) => <button key={ad} onClick={() => setFiltre(id)} className={"border-r border-t border-border p-3 text-left last:border-r-0 hover:bg-accent/60 " + (filtre === id ? "bg-primary/5" : "")}>
            <p className="text-xl font-bold tabular-nums">{sayi}</p><p className="text-xs text-muted-foreground">{ad}</p>
          </button>)}
        </div>
      </section>

      {yeni ? <section className="ui-surface rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-3 flex items-center justify-between"><div><h4 className="font-semibold">Yeni kullanıcı oluştur</h4><p className="text-xs text-muted-foreground">Hesap onaylı açılır; kullanıcı doğrudan giriş yapabilir.</p></div><button className={btn} onClick={() => setYeni(false)}>Kapat</button></div>
        <form onSubmit={(e) => void yeniKaydet(e)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input name="ad" placeholder="Ad soyad" className={giris} />
          <input name="no" placeholder="Öğrenci no" className={giris} />
          <input name="email" type="email" required placeholder="E-posta *" className={giris} />
          <input name="sifre" required placeholder="Geçici şifre *" className={giris} />
          <select name="dil" defaultValue="tr" className={giris}><option value="tr">Türkçe program</option><option value="en">İngilizce program</option></select>
          <div className="md:col-span-2 xl:col-span-5"><button type="submit" className={ana}>Hesabı oluştur</button></div>
        </form>
      </section> : null}

      <section className="ui-surface flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3">
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ad, öğrenci no veya e-posta ara…" className={giris + " min-w-[15rem] flex-1"} />
        <div className="flex flex-wrap gap-1">
          {([["hepsi","Tümü"],["onaysiz","Onaysız"],["admin","Admin"],["yasakli","Yasaklı"],["hic","Hiç giriş yok"]] as const).map(([id,ad]) => <button key={id} className={filtre === id ? ana : btn} onClick={() => setFiltre(id)}>{ad}</button>)}
        </div>
        <select value={sira} onChange={(e) => setSira(e.target.value as typeof sira)} className={giris}><option value="olusturma">Yeni kayıt önce</option><option value="sonGiris">Son giriş önce</option><option value="email">E-posta A–Z</option></select>
        <button className={okul.data ? ana : btn} onClick={() => void okulAyarla()} disabled={okul.isLoading}>Okul e-postası: {okul.isLoading ? "…" : okul.data ? "zorunlu" : "kapalı"}</button>
      </section>

      {link ? <section className="rounded-2xl border border-altin/50 bg-altin/10 p-4">
        <div className="mb-2 flex items-center justify-between gap-2"><div><p className="font-semibold">{link.ad}</p><p className="text-xs text-muted-foreground">Tek kullanımlık bağlantı; güvenli bir kanaldan paylaş.</p></div><button className={btn} onClick={() => setLink(null)}>Kapat</button></div>
        <div className="flex gap-2"><input readOnly value={link.url} className={giris + " min-w-0 flex-1 font-mono text-xs"} onFocus={(e) => e.target.select()} /><button className={btn} onClick={() => { void navigator.clipboard.writeText(link.url); toast.success("Kopyalandı"); }}>Kopyala</button></div>
      </section> : null}

      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      {q.isLoading ? <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">Kullanıcılar yükleniyor…</p> : null}
      {!q.isLoading ? <div className="grid gap-4 xl:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.45fr)]">
        <aside className="ui-surface overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="text-sm font-semibold">{liste.length} kullanıcı</p><span className="text-xs text-muted-foreground">Seçerek aç</span></div>
          <div className="max-h-[58vh] divide-y divide-border overflow-y-auto">
            {liste.length ? liste.map((u) => {
              const p = profMap.get(u.id); const adm = adminler.has(u.id); const aktif = secili?.id === u.id;
              return <button key={u.id} onClick={() => { setSeciliId(u.id); setDuz(null); }} className={"w-full px-4 py-3 text-left transition-colors hover:bg-accent/70 " + (aktif ? "bg-primary/10" : "")}>
                <div className="flex items-start gap-2"><span className={"mt-1 h-2 w-2 shrink-0 rounded-full " + (u.yasakli ? "bg-destructive" : !u.onayli ? "bg-altin" : "bg-emerald-500")} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p?.ad_soyad || "(Adsız kullanıcı)"}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p><div className="mt-1 flex flex-wrap gap-1">{adm ? <span className="rounded bg-altin/15 px-1.5 py-0.5 text-[10px] font-bold text-altin">ADMİN</span> : null}{superler.has(u.id) || u.email.toLowerCase() === "cerandeniz435@gmail.com" ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">SÜPER</span> : null}<span className="text-[10px] text-muted-foreground">{once(u.sonGiris)}</span></div></div></div>
              </button>;
            }) : <p className="p-6 text-center text-sm text-muted-foreground">Bu filtrede kullanıcı yok.</p>}
          </div>
        </aside>
        <section className="ui-surface min-w-0 rounded-2xl border border-border bg-surface">
          {!secili ? <div className="grid min-h-80 place-items-center p-8 text-center text-sm text-muted-foreground">Soldaki listeden bir kullanıcı seç.</div> : (() => {
            const u = secili; const p = profMap.get(u.id); const adm = adminler.has(u.id);
            return <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Seçili kullanıcı</p><h3 className="mt-1 text-xl font-bold">{p?.ad_soyad || "(Adsız kullanıcı)"}</h3><p className="mt-1 text-sm text-muted-foreground">{u.email}</p></div>
                <div className="flex flex-wrap gap-1">{superler.has(u.id) || u.email.toLowerCase() === "cerandeniz435@gmail.com" ? <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs font-bold text-primary">Süper admin</span> : null}{adm ? <span className="rounded-lg bg-altin/15 px-2 py-1 text-xs font-bold text-altin">Admin</span> : null}<span className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold">{u.yasakli ? "Yasaklı" : u.onayli ? "Onaylı" : "Onay bekliyor"}</span></div>
              </div>
              <div className="grid gap-3 py-4 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-accent/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Öğrenci no</p><p className="mt-1 font-medium">{p?.ogrenci_no || "Belirtilmemiş"}</p></div>
                <div className="rounded-xl bg-accent/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Son giriş</p><p className="mt-1 font-medium">{tarih(u.sonGiris)}</p></div>
                <div className="rounded-xl bg-accent/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Kayıt</p><p className="mt-1 font-medium">{tarih(u.olusturma)}</p></div>
                <div className="rounded-xl bg-accent/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Giriş yöntemi</p><p className="mt-1 font-medium">{u.yontem || "Bilinmiyor"}</p></div>
              </div>

              <div className="space-y-3">
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Hızlı işlemler</p><div className="flex flex-wrap gap-2">
                  <button className={btn} onClick={() => setDuz(duz === u.id ? null : u.id)}>{duz === u.id ? "Düzenlemeyi kapat" : "Bilgileri düzenle"}</button>
                  {!u.onayli ? <button className={btn} onClick={() => void yap(u, "onayla", "e-postayı onayla")}>E-postayı onayla</button> : null}
                  <button className={btn} onClick={() => void ekYap(u, "sifreLinki", "şifre sıfırlama bağlantısı")}>Şifre bağlantısı</button>
                  <button className={btn} onClick={() => void ekYap(u, "girisLinki", "giriş bağlantısı")}>Giriş bağlantısı</button>
                  <button className={btn} onClick={() => void yap(u, "cikisYaptir", "tüm cihazlardan çıkış")}>Tüm cihazlardan çıkar</button>
                </div></div>
                <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Yetki ve erişim</p><div className="flex flex-wrap gap-2">
                  <button className={btn} onClick={() => void ekYap(u, adm ? "adminAl" : "adminVer", adm ? "admin yetkisini al" : "admin yap")}>{adm ? "Admin yetkisini al" : "Admin yap"}</button>
                  {u.email.toLowerCase() !== "cerandeniz435@gmail.com" ? <button className={btn} onClick={() => void superYap(u, !superler.has(u.id))}>{superler.has(u.id) ? "Süper admin yetkisini al" : "Süper admin yap"}</button> : null}
                  {u.yasakli ? <button className={btn} onClick={() => void yap(u, "yasakKaldir", "yasağı kaldır")}>Yasağı kaldır</button> : <button className={tehlike} onClick={() => void yap(u, "yasakla", "yasakla")}>Erişimi yasakla</button>}
                  <button className={tehlike} onClick={() => void ekYap(u, "sil", "hesabı sil")}>Hesabı sil</button>
                </div></div>
              </div>

              {duz === u.id ? <form onSubmit={(e) => void duzKaydet(u, e)} className="mt-4 grid gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2">
                <label className="text-xs font-semibold">Ad soyad<input name="ad" defaultValue={p?.ad_soyad ?? ""} className={giris + " mt-1 w-full"} /></label>
                <label className="text-xs font-semibold">Öğrenci no<input name="no" defaultValue={p?.ogrenci_no ?? ""} className={giris + " mt-1 w-full"} /></label>
                <label className="text-xs font-semibold">E-posta<input name="email" type="email" defaultValue={u.email} className={giris + " mt-1 w-full"} /></label>
                <label className="text-xs font-semibold">Yeni şifre <span className="font-normal text-muted-foreground">(boş bırakılabilir)</span><input name="sifre" placeholder="••••••" className={giris + " mt-1 w-full"} /></label>
                <label className="text-xs font-semibold">Program dili<select name="dil" defaultValue={String((ayarMap.get(u.id) ?? {})["dil"] ?? "tr")} className={giris + " mt-1 w-full"}><option value="tr">Türkçe</option><option value="en">İngilizce</option></select></label>
                <label className="text-xs font-semibold">Grup <span className="font-normal text-muted-foreground">(boş = otomatik)</span><input name="grup" defaultValue={String(((ayarMap.get(u.id) ?? {})["grupElle"] as { grup?: string } | null)?.grup ?? "")} className={giris + " mt-1 w-full"} /></label>
                <label className="text-xs font-semibold">Alt grup<input name="altGrup" defaultValue={String(((ayarMap.get(u.id) ?? {})["grupElle"] as { altGrup?: string } | null)?.altGrup ?? "")} className={giris + " mt-1 w-full"} /></label>
                <div className="flex items-end sm:col-span-2"><button type="submit" className={ana}>Değişiklikleri kaydet</button></div>
              </form> : null}
              <details className="mt-4 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">Devamsızlık işaretlerini yönet</summary><div className="mt-3"><DevamAc userId={u.id} /></div></details>
            </div>;
          })()}
        </section>
      </div> : null}
    </div>
  );
}

type SheetsKaynak = {
  id: string; anahtar: string; tur: string; aktif: boolean; aralik_dk: number;
  kontrol_tipi?: "aralik" | "gunluk" | "haftalik" | null; saatler?: unknown; hafta_gunleri?: unknown;
  son_kontrol?: string | null; son_degisim?: string | null; hata?: string | null;
};

function SheetsKaynakKarti({
  kaynak, onKaydet, onHemen, bekliyor,
}: {
  kaynak: SheetsKaynak;
  onKaydet: (veri: { id: string; aktif: boolean; aralikDk: number; tip: "aralik" | "gunluk" | "haftalik"; saatler: string[]; haftaGunleri: number[] }) => Promise<void>;
  onHemen: (id: string) => void;
  bekliyor: boolean;
}) {
  const [aktif, setAktif] = useState(kaynak.aktif);
  const [tip, setTip] = useState<"aralik" | "gunluk" | "haftalik">(kaynak.kontrol_tipi ?? "aralik");
  const [aralik, setAralik] = useState(kaynak.aralik_dk || 60);
  const [saat, setSaat] = useState("08:00");
  const [saatler, setSaatler] = useState<string[]>(() => Array.isArray(kaynak.saatler) ? [...new Set(kaynak.saatler.filter((x): x is string => typeof x === "string"))].sort() : []);
  const [gunler, setGunler] = useState<number[]>(() => Array.isArray(kaynak.hafta_gunleri) ? kaynak.hafta_gunleri.filter((x): x is number => typeof x === "number").sort((a, b) => a - b) : []);
  const gunAdlari = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const planlar: { id: typeof tip; baslik: string; aciklama: string; ikon: typeof Timer }[] = [
    { id: "aralik", baslik: "Aralıklı", aciklama: "Belirli dakikada bir", ikon: Timer },
    { id: "gunluk", baslik: "Her gün", aciklama: "Seçtiğin saatlerde", ikon: Clock },
    { id: "haftalik", baslik: "Haftalık", aciklama: "Seçtiğin gün ve saatlerde", ikon: CalendarClock },
  ];
  const saatEkle = () => setSaatler((onceki) => onceki.includes(saat) ? onceki : [...onceki, saat].sort());
  const gunDegistir = (gun: number) => setGunler((onceki) => onceki.includes(gun) ? onceki.filter((x) => x !== gun) : [...onceki, gun].sort((a, b) => a - b));
  const kaydet = async () => {
    try {
      await onKaydet({ id: kaynak.id, aktif, aralikDk: aralik, tip, saatler, haftaGunleri: gunler });
      toast.success(`${kaynak.anahtar} planı kaydedildi.`);
    } catch (e) { hata(e); }
  };
  const durum = !aktif ? { metin: "Pasif", sinif: "bg-muted text-muted-foreground", ikon: Clock }
    : kaynak.hata ? { metin: "Kontrol gerekli", sinif: "bg-destructive/10 text-destructive", ikon: AlertTriangle }
    : { metin: "Çalışıyor", sinif: "bg-pratik-soft text-pratik", ikon: CheckCircle2 };
  const DurumIkon = durum.ikon;

  return <article className="rounded-2xl border border-border bg-background/45 p-4 shadow-sm">
    <div className="flex flex-wrap items-start gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-sm font-bold">{kaynak.anahtar}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{kaynak.tur}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${durum.sinif}`}><DurumIkon className="h-3 w-3" />{durum.metin}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Son kontrol: {tarih(kaynak.son_kontrol)} · Son değişim: {tarih(kaynak.son_degisim)}</p>
      </div>
      <button type="button" className={btn} disabled={bekliyor} onClick={() => onHemen(kaynak.id)}><Play className="h-3.5 w-3.5" />Şimdi kontrol et</button>
    </div>

    {kaynak.hata ? <p className="mt-3 rounded-xl bg-destructive/8 px-3 py-2 text-xs text-destructive"><b>Son hata:</b> {kaynak.hata}</p> : null}

    <div className="mt-4 flex items-center justify-between rounded-xl bg-accent/55 px-3 py-2">
      <div><p className="text-sm font-semibold">Otomatik kontrol</p><p className="text-[11px] text-muted-foreground">Bu kaynağın güncellemesini arka planda izle.</p></div>
      <button type="button" role="switch" aria-label="Otomatik kontrolü aç veya kapat" aria-checked={aktif} onClick={() => setAktif((x) => !x)} className={`relative h-7 w-12 rounded-full transition-colors ${aktif ? "bg-primary" : "bg-muted-foreground/35"}`}>
        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${aktif ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>

    {!aktif ? <p className="mt-4 rounded-xl border border-dashed border-border bg-accent/40 px-3 py-2 text-xs text-muted-foreground">Otomatik kontrol kapalı. Plan ayarlarını değiştirmek için önce otomatik kontrolü aç.</p> : null}
    <fieldset disabled={!aktif} className={aktif ? "" : "pointer-events-none opacity-45"}>
    <div className="mt-4 grid gap-2 md:grid-cols-3">
      {planlar.map(({ id, baslik, aciklama, ikon: Ikon }) => <button key={id} type="button" onClick={() => setTip(id)} className={`ui-control flex items-start gap-2 rounded-xl border p-3 text-left ${tip === id ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/20" : "border-border bg-surface hover:bg-accent"}`}>
        <Ikon className="mt-0.5 h-4 w-4 shrink-0" /><span><b className="block text-xs">{baslik}</b><span className="block text-[11px] text-muted-foreground">{aciklama}</span></span>
      </button>)}
    </div>

    {tip === "aralik" ? <div className="mt-4 rounded-xl border border-border bg-surface p-3">
      <label className="block text-xs font-semibold">Kontrol aralığı</label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[15, 30, 60, 120].map((dakika) => <button key={dakika} type="button" onClick={() => setAralik(dakika)} className={`ui-control rounded-lg border px-3 py-1.5 text-xs font-bold ${aralik === dakika ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>{dakika} dk</button>)}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">Özel <input type="number" min="5" max="10080" value={aralik} onChange={(e) => setAralik(Math.max(5, Number(e.target.value) || 5))} className={giris + " w-20"} /> dk</label>
      </div>
    </div> : <div className="mt-4 rounded-xl border border-border bg-surface p-3">
      <p className="text-xs font-semibold">Kontrol saatleri <span className="font-normal text-muted-foreground">(İstanbul saati)</span></p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input aria-label="Kontrol saati" type="time" value={saat} onChange={(e) => setSaat(e.target.value)} className={giris} />
        <button type="button" onClick={saatEkle} className={btn}><Plus className="h-3.5 w-3.5" />Saat ekle</button>
        {saatler.length ? saatler.map((s) => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-teorik-soft px-2 py-1 text-xs font-bold text-teorik">{s}<button type="button" aria-label={`${s} saatini kaldır`} onClick={() => setSaatler((x) => x.filter((v) => v !== s))}><X className="h-3 w-3" /></button></span>) : <span className="text-xs text-muted-foreground">Henüz saat seçilmedi.</span>}
      </div>
    </div>}

    {tip === "haftalik" ? <div className="mt-3 rounded-xl border border-border bg-surface p-3">
      <p className="text-xs font-semibold">Çalışacağı günler</p>
      <div className="mt-2 flex flex-wrap gap-2">{gunAdlari.map((ad, gun) => <button key={ad} type="button" onClick={() => gunDegistir(gun)} className={`ui-control rounded-lg border px-3 py-1.5 text-xs font-bold ${gunler.includes(gun) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>{ad}</button>)}</div>
    </div> : null}

    </fieldset>
    <div className="mt-4 flex justify-end border-t border-border pt-3"><button type="button" disabled={bekliyor || (aktif && tip !== "aralik" && !saatler.length) || (aktif && tip === "haftalik" && !gunler.length)} className={ana} onClick={() => void kaydet()}><CheckCircle2 className="h-3.5 w-3.5" />{aktif ? "Planı kaydet" : "Kapatmayı kaydet"}</button></div>
  </article>;
}

function SheetsKontroller() {
  const listele = useServerFn(sheetsKaynakListele);
  const planla = useServerFn(sheetsKaynakPlanGuncelle);
  const simdi = useServerFn(sheetsSimdiKontrol);
  const q = useQuery({ queryKey: ["sheets-kaynaklari"], queryFn: () => listele() });
  const [hemenBekle, setHemenBekle] = useState<string | null>(null);
  const planKaydet = async (veri: { id: string; aktif: boolean; aralikDk: number; tip: "aralik" | "gunluk" | "haftalik"; saatler: string[]; haftaGunleri: number[] }) => {
    await planla({ data: veri }); await q.refetch();
  };
  const hemen = async (id?: string) => {
    setHemenBekle(id ?? "hepsi");
    try { const r = await simdi({ data: id ? { id } : {} }); toast.success(`${String(r.length)} kaynak kontrol edildi.`); await q.refetch(); } catch (e) { hata(e); } finally { setHemenBekle(null); }
  };
  const kaynaklar = (q.data ?? []) as SheetsKaynak[];
  const calisan = kaynaklar.filter((k) => k.aktif && !k.hata).length;
  return <div className="space-y-4">
    <section className="ui-surface rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><CalendarClock className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-teorik">Otomasyon merkezi</p><h2 className="mt-1 text-lg font-bold">Google Sheets kontrolleri</h2><p className="mt-1 max-w-2xl text-xs text-muted-foreground">Her kaynak için ne zaman bakılacağını görsel olarak ayarla. Düzenli kontrol, ilgili dosya değiştiğinde programı güncel tutar.</p></div>
        <div className="flex flex-wrap gap-2"><button className={ana} disabled={hemenBekle !== null} onClick={() => void hemen()}><Play className="h-3.5 w-3.5" />Tümünü şimdi kontrol et</button><button className={btn} onClick={() => void q.refetch()}><RefreshCw className="h-3.5 w-3.5" />Yenile</button></div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-pratik-soft p-3"><p className="text-xs text-muted-foreground">Çalışan kaynak</p><p className="mt-1 text-2xl font-extrabold text-pratik">{calisan}</p></div>
        <div className="rounded-2xl bg-teorik-soft p-3"><p className="text-xs text-muted-foreground">Toplam kaynak</p><p className="mt-1 text-2xl font-extrabold text-teorik">{kaynaklar.length}</p></div>
        <div className="rounded-2xl bg-accent p-3"><p className="text-xs text-muted-foreground">Kontrol zaman dilimi</p><p className="mt-1 text-sm font-bold">Türkiye · UTC+3</p></div>
      </div>
    </section>
    {q.isLoading ? <p className="p-6 text-center text-sm text-muted-foreground">Kaynaklar yükleniyor…</p> : null}
    {q.error ? <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">Kaynaklar alınamadı. Sayfayı yenileyip tekrar dene.</p> : null}
    <div className="space-y-3">{kaynaklar.map((k) => <SheetsKaynakKarti key={k.id} kaynak={k} onKaydet={planKaydet} onHemen={(id) => void hemen(id)} bekliyor={hemenBekle !== null} />)}</div>
  </div>;
}

function Veri() {
  const [t, setT] = useState<keyof typeof TABLOLAR>("profiles");
  return (
    <>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(TABLOLAR) as (keyof typeof TABLOLAR)[]).map((x) => <button key={x} onClick={() => setT(x)} className={`${t === x ? ana : btn} font-mono`}>{x}</button>)}
      </div>
      <Tablo key={t} tablo={t} />
    </>
  );
}

function Tablo({ tablo }: { tablo: keyof typeof TABLOLAR }) {
  const oku = useServerFn(tabloOku);
  const kaydet = useServerFn(satirKaydet);
  const sil = useServerFn(satirSil);
  const q = useQuery({ queryKey: ["sunucu-tablo", tablo], queryFn: async () => JSON.parse(await oku({ data: { tablo } })) as Record<string, unknown>[] });
  const pk = TABLOLAR[tablo];
  const [ara, setAra] = useState("");
  const [duzenle, setDuzenle] = useState<{ metin: string } | null>(null);
  const liste = useMemo(() => (q.data ?? []).filter((r) => !ara || JSON.stringify(r).toLocaleLowerCase("tr-TR").includes(ara.toLocaleLowerCase("tr-TR"))), [q.data, ara]);
  const kolonlar = q.data?.[0] ? Object.keys(q.data[0]) : [];
  const ozet = (v: unknown) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s && s.length > 60 ? `${s.slice(0, 60)}… (${(s.length / 1024).toFixed(1)} KB)` : s; };
  const jsonGecerli = useMemo(() => { if (!duzenle) return true; try { JSON.parse(duzenle.metin); return true; } catch { return false; } }, [duzenle]);

  const kaydetYap = async () => {
    if (!duzenle) return;
    let satir: Record<string, unknown>;
    try { satir = JSON.parse(duzenle.metin); } catch { toast.error("Geçersiz JSON"); return; }
    try { await kaydet({ data: { tablo, satir } }); toast.success("Kaydedildi"); setDuzenle(null); void q.refetch(); } catch (e) { hata(e); }
  };
  const silYap = async (r: Record<string, unknown>) => {
    if (!confirm(`${tablo} / ${String(r[pk])} silinsin mi? Geri alınamaz.`)) return;
    try { await sil({ data: { tablo, anahtar: String(r[pk]) } }); toast.success("Silindi"); void q.refetch(); } catch (e) { hata(e); }
  };

  return (
    <Kart baslik={`${tablo} · ${liste.length} satır · anahtar: ${pk}`} sag={<>
      <button className={btn} onClick={() => indirMetin(`${tablo}.json`, JSON.stringify(q.data ?? [], null, 2))}>JSON indir</button>
      <button className={btn} onClick={() => setDuzenle({ metin: JSON.stringify(Object.fromEntries(kolonlar.map((k) => [k, null])), null, 2) })}>+ yeni satır</button>
      <button className={btn} onClick={() => void q.refetch()}><RefreshCw className="h-3 w-3" />yenile</button>
    </>}>
      <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="tüm alanlarda ara" className={`${giris} mb-3 w-64`} />
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      {duzenle ? (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-1 text-xs text-muted-foreground">JSON olarak düzenle — aynı {pk} varsa üzerine yazılır, yoksa eklenir. {jsonGecerli ? <span className="text-primary">✓ geçerli</span> : <span className="text-destructive">✗ geçersiz JSON</span>}</p>
          <textarea value={duzenle.metin} onChange={(e) => setDuzenle({ metin: e.target.value })} spellCheck={false} className="h-96 w-full rounded-md border border-border bg-background p-2 font-mono text-xs" />
          <div className="mt-2 flex gap-1">
            <button className={ana} disabled={!jsonGecerli} onClick={() => void kaydetYap()}>Kaydet</button>
            <button className={btn} onClick={() => { try { setDuzenle({ metin: JSON.stringify(JSON.parse(duzenle.metin), null, 2) }); } catch { /* */ } }}>Biçimlendir</button>
            <button className={btn} onClick={() => setDuzenle(null)}>Vazgeç</button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead><tr className="text-left text-muted-foreground">{[...kolonlar, ""].map((h) => <th key={h} className="border-b border-border p-1.5">{h}</th>)}</tr></thead>
          <tbody>
            {liste.map((r) => (
              <tr key={String(r[pk]) + String(r["role"] ?? "")} className="border-b border-border/50 align-top hover:bg-muted/30">
                {kolonlar.map((k) => <td key={k} className="max-w-xs break-all p-1.5">{ozet(r[k])}</td>)}
                <td className="space-x-1 whitespace-nowrap p-1.5">
                  <button className={btn} onClick={() => setDuzenle({ metin: JSON.stringify(r, null, 2) })}>düzenle</button>
                  <button className={tehlike} onClick={() => void silYap(r)}>sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Kart>
  );
}

function Dosyalar() {
  const listele = useServerFn(dosyaListele);
  const islem = useServerFn(dosyaIslem);
  const q = useQuery({ queryKey: ["sunucu-dosya"], queryFn: () => listele() });
  const [ara, setAra] = useState("");
  const yap = async (yol: string, i: "indir" | "sil") => {
    if (i === "sil" && !confirm(`${yol} silinsin mi?`)) return;
    try { const r = await islem({ data: { yol, islem: i } }); if (r.url) window.location.href = r.url; else { toast.success("Silindi"); void q.refetch(); } } catch (e) { hata(e); }
  };
  const liste = (q.data ?? []).filter((f) => f.yol.toLowerCase().includes(ara.toLowerCase())).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)));
  const toplam = (q.data ?? []).reduce((a, f) => a + f.boyut, 0);
  return (
    <Kart baslik={`${q.data?.length ?? 0} dosya · ${(toplam / 1024 / 1024).toFixed(2)} MB`} sag={<button className={btn} onClick={() => void q.refetch()}><RefreshCw className="h-3 w-3" />yenile</button>}>
      <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="dosya ya da kullanıcı id ara" className={`${giris} mb-3 w-64`} />
      {q.isLoading ? <p className="text-sm text-muted-foreground">yükleniyor…</p> : null}
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      <div className="divide-y divide-border">
        {liste.map((f) => {
          const [kul, tur, ...ad] = f.yol.split("/");
          return (
            <div key={f.yol} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{ad.join("/")}</span>
              <span className="rounded bg-muted px-1.5 text-[10px]">{tur}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{kul}</span>
              <span className="ml-auto text-xs text-muted-foreground">{(f.boyut / 1024).toFixed(1)} KB · {tarih(f.tarih)}</span>
              <button className={btn} onClick={() => void yap(f.yol, "indir")}>indir</button>
              <button className={tehlike} onClick={() => void yap(f.yol, "sil")}>sil</button>
            </div>
          );
        })}
      </div>
    </Kart>
  );
}

type DuyuruVeri = { metin: string; tur: "bilgi" | "uyari"; aktif: boolean; hedef?: Hedef };

function HedefSecici({ hedef, onDegis }: { hedef: Hedef; onDegis: (h: Hedef) => void }) {
  const { data: donemler = [] } = useDonemler();
  const { data: kisiler = [] } = useQuery({
    queryKey: ["hedef-kisiler"],
    queryFn: async () => ((await supabase.from("profiles").select("id, ad_soyad, ogrenci_no, email").order("ad_soyad")).data ?? []),
  });
  const [ara, setAra] = useState("");
  const secili = hedef.tip === "secili" ? hedef.kullanicilar : [];
  const filtre = kisiler.filter((k) => `${k.ad_soyad} ${k.ogrenci_no} ${k.email ?? ""}`.toLocaleLowerCase("tr").includes(ara.toLocaleLowerCase("tr")));
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold">Kime gidecek?</p>
      <div className="flex flex-wrap gap-1.5">
        {([["herkes", "Herkes"], ["donem", "Dönem / dil"], ["secili", "Seçili öğrenciler"]] as const).map(([t, ad]) => (
          <button key={t} type="button" className={hedef.tip === t ? ana : btn}
            onClick={() => onDegis(t === "herkes" ? { tip: "herkes" } : t === "donem" ? { tip: "donem", donemId: donemler[0]?.id ?? "", dil: "" } : { tip: "secili", kullanicilar: [] })}>{ad}</button>
        ))}
      </div>
      {hedef.tip === "donem" ? (
        <div className="flex flex-wrap gap-2">
          <select className={giris} value={hedef.donemId} onChange={(e) => onDegis({ ...hedef, donemId: e.target.value })}>
            <option value="">Tüm dönemler</option>
            {donemler.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
          <select className={giris} value={hedef.dil} onChange={(e) => onDegis({ ...hedef, dil: e.target.value as "tr" | "en" | "" })}>
            <option value="">Türkçe + İngilizce</option><option value="tr">Türkçe</option><option value="en">İngilizce</option>
          </select>
          <input className={giris} value={hedef.grup ?? ""} onChange={(e) => onDegis({ ...hedef, grup: e.target.value })} placeholder="Grup (isteğe bağlı)" />
        </div>
      ) : null}
      {hedef.tip === "secili" ? (
        <div>
          <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ad, numara veya e-posta ara…" className={`${giris} w-full`} />
          <p className="my-1 text-xs text-muted-foreground">{secili.length} öğrenci seçili</p>
          <div className="max-h-56 overflow-y-auto rounded-md border border-border">
            {filtre.map((k) => (
              <label key={k.id} className="flex cursor-pointer items-center gap-2 border-b border-border/60 px-2 py-1.5 text-sm last:border-0 hover:bg-accent">
                <input type="checkbox" checked={secili.includes(k.id)}
                  onChange={(e) => onDegis({ tip: "secili", kullanicilar: e.target.checked ? [...secili, k.id] : secili.filter((x) => x !== k.id) })} />
                <span className="flex-1 truncate">{k.ad_soyad || k.email}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{k.ogrenci_no}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type BantGecmis = { metin: string; tur: string; zaman: string };
type BildirimGecmis = { baslik: string; metin: string; zaman: string; alici: number; okuyan: number };

function DuyuruGecmisi({ mod }: { mod: "bant" | "bildirim" }) {
  const qc = useQueryClient();
  const bq = useQuery({
    queryKey: ["bildirim-gecmis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("duyuru_listesi" as never);
      if (error) throw error;
      return (data ?? []) as unknown as BildirimGecmis[];
    },
  });
  const gq = useQuery({
    queryKey: ["duyuru-gecmis"],
    queryFn: async () => {
      const v = (await supabase.from("global_data").select("veri").eq("anahtar", "duyuru_gecmis").maybeSingle()).data?.veri;
      return (Array.isArray(v) ? v : []) as BantGecmis[];
    },
  });
  const bildirimSil = async (b: BildirimGecmis) => {
    if (!confirm(`"${b.baslik}" bildirimi ${b.alici} kişinin zilinden silinsin mi?`)) return;
    const { data, error } = await supabase.rpc("duyuru_sil" as never, { _baslik: b.baslik, _metin: b.metin, _zaman: b.zaman } as never);
    if (error) { hata(error); return; }
    toast.success(`${data ?? 0} bildirim silindi`); void bq.refetch();
  };
  const bantGecmisSil = async (i: number) => {
    const liste = (gq.data ?? []).filter((_, j) => j !== i);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("global_data").upsert({ anahtar: "duyuru_gecmis", veri: liste as never, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    if (error) { hata(error); return; }
    void qc.invalidateQueries({ queryKey: ["duyuru-gecmis"] });
  };
  const tarih = (z: string) => new Date(z).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold">{mod === "bildirim" ? "Gönderilen bildirimler" : "Yayınlanan bant duyuruları"}</h3>
      {mod === "bildirim" ? (
        bq.isLoading ? <p className="text-xs text-muted-foreground">Yükleniyor…</p> : !bq.data?.length ? <p className="text-xs text-muted-foreground">Henüz bildirim gönderilmedi.</p> : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {bq.data.map((b) => (
              <li key={b.zaman + b.baslik} className="flex items-start gap-3 rounded-lg bg-accent p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{b.baslik}</p>
                  {b.metin ? <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{b.metin}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">{tarih(b.zaman)} · {b.alici} kişi · {b.okuyan} okudu</p>
                </div>
                <button className={btn} onClick={() => void bildirimSil(b)}>Sil</button>
              </li>
            ))}
          </ul>
        )
      ) : !gq.data?.length ? <p className="text-xs text-muted-foreground">Kayıtlı geçmiş yok.</p> : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {gq.data.map((g, i) => (
            <li key={g.zaman + i} className="flex items-start gap-3 rounded-lg bg-accent p-3">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{g.metin}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{tarih(g.zaman)} · {g.tur === "uyari" ? "Uyarı" : "Bilgi"}</p>
              </div>
              <button className={btn} onClick={() => void bantGecmisSil(i)}>Sil</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Duyuru() {
  const q = useQuery({
    queryKey: ["duyuru"],
    queryFn: async () => ((await supabase.from("global_data").select("veri").eq("anahtar", "duyuru").maybeSingle()).data?.veri ?? null) as DuyuruVeri | null,
  });
  const qc = useQueryClient();
  const [mod, setMod] = useState<"bant" | "bildirim">("bildirim");
  const [baslik, setBaslik] = useState("");
  const [d, setD] = useState<DuyuruVeri | null>(null);
  const [hedef, setHedef] = useState<Hedef | null>(null);
  const [bekle, setBekle] = useState(false);
  const [planli, setPlanli] = useState(false);
  const [yayinZamani, setYayinZamani] = useState("");
  const planlar = useQuery({
    queryKey: ["planli-duyurular"],
    queryFn: async () => (((await (supabase.from("duyuru_planlari" as never) as any).select("*").eq("durum", "bekliyor").order("yayin_zamani")).data ?? []) as { id: string; baslik: string; metin: string; yayin_zamani: string; hedef: Hedef }[]),
    enabled: mod === "bildirim",
  });
  const v = d ?? q.data ?? { metin: "", tur: "bilgi", aktif: false };
  const h: Hedef = hedef ?? v.hedef ?? { tip: "herkes" };
  const hedefGecersiz = h.tip === "secili" && h.kullanicilar.length === 0;
  const kaydet = async (yeni: DuyuruVeri) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("global_data").upsert({ anahtar: "duyuru", veri: { ...yeni, hedef: h }, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    if (error) { hata(error); return; }
    if (yeni.aktif) {
      const eski = ((await supabase.from("global_data").select("veri").eq("anahtar", "duyuru_gecmis").maybeSingle()).data?.veri ?? []) as BantGecmis[];
      const liste = [{ metin: yeni.metin, tur: yeni.tur, zaman: new Date().toISOString() }, ...(Array.isArray(eski) ? eski : [])].slice(0, 100);
      await supabase.from("global_data").upsert({ anahtar: "duyuru_gecmis", veri: liste as never, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    }
    toast.success(yeni.aktif ? "Duyuru yayında" : "Duyuru kapatıldı"); setD(null); void qc.invalidateQueries({ queryKey: ["duyuru"] }); void qc.invalidateQueries({ queryKey: ["duyuru-gecmis"] });
  };
  const bantSil = async () => {
    if (!confirm("Sayfa üstü duyuru herkesten kaldırılsın mı?")) return;
    const { error } = await supabase.from("global_data").delete().eq("anahtar", "duyuru");
    if (error) { hata(error); return; }
    toast.success("Duyuru silindi"); setD(null); void qc.invalidateQueries({ queryKey: ["duyuru"] });
  };
  const gonder = async () => {
    setBekle(true);
    const { data, error } = await supabase.rpc("bildirim_gonder", { _baslik: baslik.trim(), _metin: v.metin.trim(), _hedef: h as never });
    setBekle(false);
    if (error) { hata(error); return; }
    toast.success(`Bildirim ${data ?? 0} kişiye gönderildi`); setBaslik(""); setD({ ...v, metin: "" }); void qc.invalidateQueries({ queryKey: ["bildirim-gecmis"] });
  };
  const planla = async () => {
    const zaman = new Date(yayinZamani);
    if (!yayinZamani || Number.isNaN(zaman.getTime()) || zaman.getTime() <= Date.now()) { toast.error("Gelecekte bir yayın zamanı seç."); return; }
    setBekle(true);
    const { error } = await (supabase.from("duyuru_planlari" as never) as any).insert({ baslik: baslik.trim(), metin: v.metin.trim(), hedef: h, yayin_zamani: zaman.toISOString() });
    setBekle(false);
    if (error) { hata(error); return; }
    toast.success("Duyuru planlandı"); setBaslik(""); setD({ ...v, metin: "" }); setYayinZamani(""); setPlanli(false); void planlar.refetch();
  };
  const planIptal = async (id: string) => {
    const { error } = await (supabase.from("duyuru_planlari" as never) as any).update({ durum: "iptal" }).eq("id", id);
    if (error) { hata(error); return; }
    toast.success("Planlanan duyuru iptal edildi"); void planlar.refetch();
  };
  return (
    <Kart baslik="Duyuru ve bildirim">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button className={mod === "bildirim" ? ana : btn} onClick={() => setMod("bildirim")}>Bildirim olarak gönder</button>
        <button className={mod === "bant" ? ana : btn} onClick={() => setMod("bant")}>Sayfa üstü bant</button>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {mod === "bildirim"
          ? "Seçilen öğrencilerin sağ üstteki zil simgesine düşer; okunana kadar kırmızı rozet görünür."
          : "Seçilen öğrenciler sayfanın üstünde bu mesajı görür (kapatabilirler, yeni mesaj yazınca tekrar görünür)."}
      </p>
      <div className="space-y-2">
        {mod === "bildirim" ? <input value={baslik} onChange={(e) => setBaslik(e.target.value)} maxLength={200} placeholder="Başlık" className={`${giris} w-full`} /> : null}
        <textarea value={v.metin} onChange={(e) => setD({ ...v, metin: e.target.value })} maxLength={mod === "bant" ? 500 : 2000} placeholder="ör. Bu hafta amfi programı güncellendi." className={`${giris} h-24 w-full`} />
        <HedefSecici hedef={h} onDegis={setHedef} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mod === "bildirim" ? (
          <>
            <label className="inline-flex items-center gap-1.5 text-xs"><input type="checkbox" checked={planli} onChange={(e) => setPlanli(e.target.checked)} /> İleri bir tarihe planla</label>
            {planli ? <input type="datetime-local" value={yayinZamani} onChange={(e) => setYayinZamani(e.target.value)} className={giris} /> : null}
            <button className={ana} disabled={bekle || !baslik.trim() || hedefGecersiz || (planli && !yayinZamani)} onClick={() => void (planli ? planla() : gonder())}>{bekle ? "Kaydediliyor…" : planli ? "Planla" : "Gönder"}</button>
          </>
        ) : (
          <>
            <select value={v.tur} onChange={(e) => setD({ ...v, tur: e.target.value as DuyuruVeri["tur"] })} className={giris}><option value="bilgi">Bilgi</option><option value="uyari">Uyarı</option></select>
            <button className={ana} disabled={!v.metin.trim() || hedefGecersiz} onClick={() => void kaydet({ ...v, aktif: true })}>Yayınla</button>
            <button className={btn} onClick={() => void kaydet({ ...v, aktif: false })}>Kapat</button>
            <span className="text-xs text-muted-foreground">Şu an: {q.data?.aktif ? "yayında" : "kapalı"}</span>
            {q.data ? <button className={btn} onClick={() => void bantSil()}>Sil</button> : null}
          </>
        )}
      </div>
      {mod === "bildirim" && planlar.data?.length ? <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-semibold">Planlanan duyurular</h3>
        <ul className="space-y-2">{planlar.data.map((p) => <li key={p.id} className="flex items-start gap-3 rounded-lg bg-accent p-3">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.baslik}</p><p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.metin}</p><p className="mt-1 text-[11px] text-muted-foreground">{tarih(p.yayin_zamani)}</p></div>
          <button className={btn} onClick={() => void planIptal(p.id)}>İptal</button>
        </li>)}</ul>
      </div> : null}
      <DuyuruGecmisi mod={mod} />
    </Kart>
  );
}

function Yedek() {
  const al = useServerFn(tamYedek);
  const yukle = useServerFn(yedekGeriYukle);
  const [mesgul, setMesgul] = useState(false);
  const indir = async () => {
    setMesgul(true);
    try { indirMetin(`yedek-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`, await al()); toast.success("Yedek indirildi"); } catch (e) { hata(e); }
    setMesgul(false);
  };
  const geri = async (f: File) => {
    if (!confirm("Yedekteki satırlar mevcut verilerin üzerine yazılacak. Emin misin?")) return;
    setMesgul(true);
    try { const r = await yukle({ data: { metin: await f.text() } }); toast.success(`Geri yüklendi: ${Object.entries(r).map(([t, n]) => `${t} ${n}`).join(", ") || "boş"}`); } catch (e) { hata(e); }
    setMesgul(false);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Kart baslik="Tam yedek al">
        <p className="mb-3 text-sm text-muted-foreground">Profiller, öğrenci verileri, roller ve ortak dosyaların hepsi tek bir dosyaya iner. Yüklenen Excel asılları dahil değildir.</p>
        <button className={ana} disabled={mesgul} onClick={() => void indir()}>Yedeği indir</button>
      </Kart>
      <Kart baslik="Yedekten geri yükle">
        <p className="mb-3 text-sm text-muted-foreground">Aynı anahtara sahip satırların üzerine yazılır; yedekte olmayan satırlar silinmez. Hesabı silinmiş kullanıcıların satırları geri yüklenemez.</p>
        <input type="file" accept=".json,application/json" disabled={mesgul} onChange={(e) => { const f = e.target.files?.[0]; if (f) void geri(f); e.target.value = ""; }} className="text-sm" />
      </Kart>
    </div>
  );
}

export function DestekYonetim() {
  const { liste, yenile } = useTalepler();
  const [secili, setSecili] = useState<string | null>(null);
  const [tur, setTur] = useState<"destek" | "oneri" | "hepsi">("destek");
  const [filtre, setFiltre] = useState<"acik" | "kapali" | "hepsi">("acik");
  const { data: kisiler } = useQuery({
    queryKey: ["destek-kisiler"],
    queryFn: async () => (await supabase.from("profiles").select("id, ad_soyad, email")).data ?? [],
  });
  const ad = (id: string) => { const p = kisiler?.find((k) => k.id === id); return p ? p.ad_soyad || p.email || "" : ""; };
  const gorunen = liste.filter((t) => (tur === "hepsi" || t.tur === tur) && (tur === "oneri" || filtre === "hepsi" || t.durum === filtre));
  const talep = liste.find((t) => t.id === secili);
  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {([["destek", "Destek"], ["oneri", "Öneriler"], ["hepsi", "Tümü"]] as const).map(([id, ad]) => (
            <button key={id} onClick={() => { setTur(id); setSecili(null); }} className={tur === id ? ana : btn}>{ad}</button>
          ))}
        </div>
        {tur !== "oneri" ? <div className="flex gap-1">
          {(["acik", "kapali", "hepsi"] as const).map((f) => (
            <button key={f} onClick={() => setFiltre(f)} className={filtre === f ? ana : btn}>{f === "acik" ? "Açık" : f === "kapali" ? "Kapalı" : "Hepsi"}</button>
          ))}
          <button onClick={() => void yenile()} className={btn}><RefreshCw className="h-3 w-3" /></button>
        </div> : <p className="text-xs text-muted-foreground">Öneriler tek yönlüdür; öğrenci yanıt veya geçmiş görmez.</p>}
        <TalepListesi liste={gorunen} secili={secili} sec={setSecili} ekstra={(t) => ad(t.user_id)} />
      </div>
      {talep ? <TalepSohbet talep={talep} yonetici onDegisti={yenile} /> : <p className="text-sm text-muted-foreground">Bir kayıt seç.</p>}
    </div>
  );
}

function DevamAc({ userId }: { userId: string }) {
  const [ac, setAc] = useState(false);
  return ac ? <OgrenciDevam userId={userId} /> : <button className={btn} onClick={() => setAc(true)}>Devam kayıtlarını yükle</button>;
}
