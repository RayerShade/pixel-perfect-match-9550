import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Activity, LifeBuoy, CalendarRange, Database, FileSpreadsheet, HardDrive, Megaphone, RefreshCw, Server, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProgramYonetimi } from "@/components/ProgramYonetimi";
import { TalepListesi, TalepSohbet, useTalepler } from "@/components/Destek";
import {
  TABLOLAR, dosyaIslem, dosyaListele, kullaniciDuzenle, kullaniciEkIslem, kullaniciIslem, kullaniciOlustur,
  satirKaydet, satirSil, sunucuKullanicilar, sunucuOzet, tabloOku, tamYedek, yedekGeriYukle,
} from "@/lib/sunucu.functions";

export const Route = createFileRoute("/_authenticated/sunucu")({
  beforeLoad: async () => {
    const { data } = await supabase.rpc("orijinal_admin_mi");
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sunucu paneli" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Sunucu,
});

type Sekme = "ozet" | "kullanicilar" | "destek" | "donem" | "veri" | "dosyalar" | "duyuru" | "yedek";
const SEKMELER: { id: Sekme; ad: string; ikon: typeof Users }[] = [
  { id: "ozet", ad: "Özet", ikon: Activity },
  { id: "kullanicilar", ad: "Kullanıcılar", ikon: Users },
  { id: "destek", ad: "Destek", ikon: LifeBuoy },
  { id: "donem", ad: "Dönemler", ikon: CalendarRange },
  { id: "veri", ad: "Veritabanı", ikon: Database },
  { id: "dosyalar", ad: "Dosyalar", ikon: FileSpreadsheet },
  { id: "duyuru", ad: "Duyuru", ikon: Megaphone },
  { id: "yedek", ad: "Yedek", ikon: HardDrive },
];
const btn = "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50";
const ana = `${btn} border-primary bg-primary text-primary-foreground hover:bg-primary/90`;
const tehlike = `${btn} text-destructive hover:bg-destructive/10`;
const giris = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
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
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{baslik}</h2><div className="ml-auto flex flex-wrap gap-1">{sag}</div></div>
      {children}
    </section>
  );
}

function Sunucu() {
  const [sekme, setSekme] = useState<Sekme>("ozet");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2">
          <Server className="h-5 w-5 text-primary" />
          <b className="mr-3">Sunucu paneli</b>
          <nav className="flex flex-wrap gap-1">
            {SEKMELER.map(({ id, ad, ikon: I }) => (
              <button key={id} onClick={() => setSekme(id)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${sekme === id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                <I className="h-4 w-4" />{ad}
              </button>
            ))}
          </nav>
          <a href="/" className={`${btn} ml-auto`}>Siteye dön</a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
        {sekme === "ozet" ? <Ozet git={setSekme} /> : sekme === "kullanicilar" ? <Kullanicilar /> : sekme === "destek" ? <DestekYonetim /> : sekme === "donem" ? <ProgramYonetimi /> : sekme === "veri" ? <Veri /> : sekme === "dosyalar" ? <Dosyalar /> : sekme === "duyuru" ? <Duyuru /> : <Yedek />}
      </main>
    </div>
  );
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

  const profMap = useMemo(() => new Map((prof.data ?? []).map((p) => [p.id, p])), [prof.data]);
  const ayarMap = useMemo(() => new Map((ud.data ?? []).map((x) => [x.user_id, x.ayarlar ?? {}])), [ud.data]);
  const adminler = useMemo(() => new Set((rol.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id)), [rol.data]);
  const yenile = () => { void qc.invalidateQueries({ queryKey: ["sunucu-kul"] }); void qc.invalidateQueries({ queryKey: ["sunucu-tablo"] }); void qc.invalidateQueries({ queryKey: ["sunucu-ozet"] }); };

  const yeniKaydet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await olustur({ data: { email: String(f.get("email") ?? ""), sifre: String(f.get("sifre") ?? ""), adSoyad: String(f.get("ad") ?? ""), ogrenciNo: String(f.get("no") ?? "") } });
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

  return (
    <Kart baslik={`Kullanıcılar (${liste.length}/${q.data?.length ?? 0})`} sag={<>
      <button className={ana} onClick={() => setYeni((v) => !v)}>{yeni ? "Kapat" : "+ Yeni kullanıcı"}</button>
      <button className={btn} onClick={csv}>CSV indir</button>
      <button className={btn} onClick={yenile}><RefreshCw className="h-3 w-3" />yenile</button>
    </>}>
      {yeni ? (
        <form onSubmit={(e) => void yeniKaydet(e)} className="mb-3 grid gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <input name="ad" placeholder="Ad soyad" className={giris} />
          <input name="no" placeholder="Öğrenci no" className={giris} />
          <input name="email" type="email" required placeholder="E-posta *" className={giris} />
          <input name="sifre" required minLength={6} placeholder="Şifre (en az 6) *" className={giris} />
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className={ana}>Hesabı oluştur</button>
            <span className="text-xs text-muted-foreground">E-posta otomatik onaylı açılır, öğrenci hemen girebilir.</span>
          </div>
        </form>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="ad, no, e-posta, id ara" className={`${giris} w-64`} />
        <select value={filtre} onChange={(e) => setFiltre(e.target.value as typeof filtre)} className={giris}>
          <option value="hepsi">Hepsi</option><option value="onaysiz">Onaysız</option><option value="yasakli">Yasaklı</option><option value="admin">Adminler</option><option value="hic">Hiç giriş yapmamış</option>
        </select>
        <select value={sira} onChange={(e) => setSira(e.target.value as typeof sira)} className={giris}>
          <option value="olusturma">Yeni kayıt önce</option><option value="sonGiris">Son giriş önce</option><option value="email">E-posta A-Z</option>
        </select>
      </div>
      {link ? (
        <div className="mb-3 rounded-lg border border-altin/50 bg-altin/10 p-3 text-sm">
          <p className="mb-1 font-medium">{link.ad}</p>
          <p className="mb-2 text-xs text-muted-foreground">Tek kullanımlık bağlantı. Giriş bağlantısını kendi tarayıcında açarsan o hesaba geçersin (önce kendi hesabından çıkış yapılır).</p>
          <div className="flex gap-1"><input readOnly value={link.url} className={`${giris} flex-1 font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <button className={btn} onClick={() => { void navigator.clipboard.writeText(link.url); toast.success("Kopyalandı"); }}>kopyala</button>
            <button className={btn} onClick={() => setLink(null)}>kapat</button></div>
        </div>
      ) : null}
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      {q.isLoading ? <p className="text-sm text-muted-foreground">yükleniyor…</p> : null}
      <div className="space-y-2">
        {liste.map((u) => {
          const p = profMap.get(u.id);
          const adm = adminler.has(u.id);
          return (
            <details key={u.id} className="group rounded-lg border border-border">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-sm">
                <span className="font-medium">{p?.ad_soyad || "(adsız)"}</span>
                <span className="text-muted-foreground">{u.email}</span>
                {p?.ogrenci_no ? <span className="font-mono text-xs">{p.ogrenci_no}</span> : null}
                <span className="ml-auto flex flex-wrap gap-1 text-[10px] font-semibold">
                  {adm ? <span className="rounded bg-altin/20 px-1.5 py-0.5 text-altin">ADMİN</span> : null}
                  {u.yasakli ? <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">YASAKLI</span> : u.onayli ? null : <span className="rounded bg-muted px-1.5 py-0.5">ONAYSIZ</span>}
                  <span className="rounded bg-muted px-1.5 py-0.5">{u.yontem || "?"}</span>
                  <span className="font-normal text-muted-foreground">{once(u.sonGiris)}</span>
                </span>
              </summary>
              <div className="space-y-2 border-t border-border p-3 text-xs">
                <div className="grid gap-1 sm:grid-cols-2">
                  <div><span className="text-muted-foreground">ID: </span><span className="font-mono">{u.id}</span></div>
                  <div><span className="text-muted-foreground">Kayıt: </span>{tarih(u.olusturma)}</div>
                  <div><span className="text-muted-foreground">Son giriş: </span>{tarih(u.sonGiris)}</div>
                  <div><span className="text-muted-foreground">Durum: </span>{u.yasakli ? "yasaklı" : u.onayli ? "onaylı" : "onaysız"}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button className={btn} onClick={() => setDuz(duz === u.id ? null : u.id)}>{duz === u.id ? "Düzenlemeyi kapat" : "Bilgileri düzenle"}</button>
                  {!u.onayli ? <button className={btn} onClick={() => void yap(u, "onayla", "onayla")}>E-postayı onayla</button> : null}
                  <button className={btn} onClick={() => void ekYap(u, "sifreLinki", "şifre sıfırlama bağlantısı")}>Şifre sıfırlama bağlantısı</button>
                  <button className={btn} onClick={() => void ekYap(u, "girisLinki", "giriş bağlantısı")}>Hesaba giriş bağlantısı</button>
                  <button className={btn} onClick={() => void yap(u, "cikisYaptir", "tüm cihazlardan çıkış")}>Tüm cihazlardan çıkar</button>
                  <button className={btn} onClick={() => void ekYap(u, adm ? "adminAl" : "adminVer", adm ? "admin yetkisini al" : "admin yap")}>{adm ? "Admin yetkisini al" : "Admin yap"}</button>
                  {u.yasakli ? <button className={btn} onClick={() => void yap(u, "yasakKaldir", "yasağı kaldır")}>Yasağı kaldır</button> : <button className={tehlike} onClick={() => void yap(u, "yasakla", "yasakla")}>Yasakla</button>}
                  <button className={tehlike} onClick={() => void ekYap(u, "sil", "sil")}>Hesabı sil</button>
                </div>
                {duz === u.id ? (
                  <form onSubmit={(e) => void duzKaydet(u, e)} className="grid gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 sm:grid-cols-3">
                    <label className="text-xs">Ad soyad<input name="ad" defaultValue={p?.ad_soyad ?? ""} className={`${giris} mt-0.5 w-full`} /></label>
                    <label className="text-xs">Öğrenci no<input name="no" defaultValue={p?.ogrenci_no ?? ""} className={`${giris} mt-0.5 w-full`} /></label>
                    <label className="text-xs">E-posta<input name="email" type="email" defaultValue={u.email} className={`${giris} mt-0.5 w-full`} /></label>
                    <label className="text-xs">Yeni şifre (boş = değişmez)<input name="sifre" minLength={6} placeholder="••••••" className={`${giris} mt-0.5 w-full`} /></label>
                    <label className="text-xs">Grup (boş = listeden otomatik)<input name="grup" defaultValue={String(((ayarMap.get(u.id) ?? {})["grupElle"] as { grup?: string } | null)?.grup ?? "")} className={`${giris} mt-0.5 w-full`} /></label>
                    <label className="text-xs">Alt grup<input name="altGrup" defaultValue={String(((ayarMap.get(u.id) ?? {})["grupElle"] as { altGrup?: string } | null)?.altGrup ?? "")} className={`${giris} mt-0.5 w-full`} /></label>
                    <div className="flex items-end sm:col-span-3"><button type="submit" className={ana}>Kaydet</button></div>
                  </form>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </Kart>
  );
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

type DuyuruVeri = { metin: string; tur: "bilgi" | "uyari"; aktif: boolean };
function Duyuru() {
  const q = useQuery({
    queryKey: ["duyuru"],
    queryFn: async () => ((await supabase.from("global_data").select("veri").eq("anahtar", "duyuru").maybeSingle()).data?.veri ?? null) as DuyuruVeri | null,
  });
  const qc = useQueryClient();
  const [d, setD] = useState<DuyuruVeri | null>(null);
  const v = d ?? q.data ?? { metin: "", tur: "bilgi", aktif: false };
  const kaydet = async (yeni: DuyuruVeri) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("global_data").upsert({ anahtar: "duyuru", veri: yeni, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    if (error) { hata(error); return; }
    toast.success(yeni.aktif ? "Duyuru yayında" : "Duyuru kapatıldı"); setD(null); void qc.invalidateQueries({ queryKey: ["duyuru"] });
  };
  return (
    <Kart baslik="Site geneli duyuru">
      <p className="mb-3 text-sm text-muted-foreground">Açık olduğunda tüm kullanıcılar sayfanın üstünde bu mesajı görür (kapatabilirler, yeni mesaj yazınca tekrar görünür).</p>
      <textarea value={v.metin} onChange={(e) => setD({ ...v, metin: e.target.value })} maxLength={500} placeholder="ör. Bu hafta amfi programı güncellendi." className={`${giris} h-24 w-full`} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={v.tur} onChange={(e) => setD({ ...v, tur: e.target.value as DuyuruVeri["tur"] })} className={giris}><option value="bilgi">Bilgi</option><option value="uyari">Uyarı</option></select>
        <button className={ana} disabled={!v.metin.trim()} onClick={() => void kaydet({ ...v, aktif: true })}>Yayınla</button>
        <button className={btn} onClick={() => void kaydet({ ...v, aktif: false })}>Kapat</button>
        <span className="text-xs text-muted-foreground">Şu an: {q.data?.aktif ? "yayında" : "kapalı"}</span>
      </div>
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

function DestekYonetim() {
  const { liste, yenile } = useTalepler();
  const [secili, setSecili] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"acik" | "kapali" | "hepsi">("acik");
  const { data: kisiler } = useQuery({
    queryKey: ["destek-kisiler"],
    queryFn: async () => (await supabase.from("profiles").select("id, ad_soyad, email")).data ?? [],
  });
  const ad = (id: string) => { const p = kisiler?.find((k) => k.id === id); return p ? p.ad_soyad || p.email || "" : ""; };
  const gorunen = liste.filter((t) => filtre === "hepsi" || t.durum === filtre);
  const talep = liste.find((t) => t.id === secili);
  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        <div className="flex gap-1">
          {(["acik", "kapali", "hepsi"] as const).map((f) => (
            <button key={f} onClick={() => setFiltre(f)} className={filtre === f ? ana : btn}>{f === "acik" ? "Açık" : f === "kapali" ? "Kapalı" : "Hepsi"}</button>
          ))}
          <button onClick={() => void yenile()} className={btn}><RefreshCw className="h-3 w-3" /></button>
        </div>
        <TalepListesi liste={gorunen} secili={secili} sec={setSecili} ekstra={(t) => ad(t.user_id)} />
      </div>
      {talep ? <TalepSohbet talep={talep} yonetici onDegisti={yenile} /> : <p className="text-sm text-muted-foreground">Bir talep seç.</p>}
    </div>
  );
}
