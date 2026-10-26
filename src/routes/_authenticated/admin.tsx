import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ChevronDown, Search, ShieldCheck, Trash2, UsersRound, UserRoundPlus, BookMarked } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { VeriYukleme } from "@/components/VeriYukleme";
import { ProgramYonetimi } from "@/components/ProgramYonetimi";
import { HesapDuzenle } from "@/components/HesapDuzenle";
import { supabase } from "@/integrations/supabase/client";
import { hesapOlustur, hesapSil } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";
import { useYuklenenVeri } from "@/lib/store";
import { SECMELILER, secmeliGruplari } from "@/lib/schedule-data";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin Paneli — Tıp Ders Programı" },
      { name: "description", content: "Ortak dosyaları yükle, hesapları incele ve yönet." },
      { property: "og:title", content: "Admin Paneli — Tıp Ders Programı" },
      { property: "og:description", content: "Ortak amfi ve seçmeli programı, hesap yönetimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const ORIJINAL_ADMIN_EMAIL = "cerandeniz435@gmail.com";
type AdminSekme = "genel" | "programlar" | "kullanicilar";

interface Hesap {
  id: string;
  email: string | null;
  ad_soyad: string;
  ogrenci_no: string;
  created_at: string;
  admin: boolean;
  secmeliler: string[];
  ayarlar: Record<string, unknown>;
  dosyalar: { yillik?: string | undefined; uygulama?: string | undefined; ogrenci?: string | undefined };
  guncelleme?: string | undefined;
}

function dosyaAdi(x: unknown): string | undefined {
  if (!x) return undefined;
  if (typeof x === "string") return x;
  if (typeof x === "object" && "ad" in x) return String((x as { ad: unknown }).ad);
  return undefined;
}

async function hesaplariGetir(): Promise<Hesap[]> {
  const [p, d, r] = await Promise.all([
    supabase.from("profiles").select("id, email, ad_soyad, ogrenci_no, created_at").order("created_at", { ascending: false }),
    supabase
      .from("user_data")
      .select("user_id, secmeliler, ayarlar, updated_at, yillik:veri->yillikDosya, uygulama:veri->uygulamaDosya, ogrenci:veri->ogrenciDosya"),
    supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
  ]);
  if (p.error) throw p.error;
  const veri = new Map((d.data ?? []).map((x) => [x.user_id, x]));
  const adminler = new Set((r.data ?? []).map((x) => x.user_id));
  return (p.data ?? []).map((h) => {
    const v = veri.get(h.id) as
      | { secmeliler: unknown; ayarlar: unknown; updated_at: string; yillik: unknown; uygulama: unknown; ogrenci: unknown }
      | undefined;
    return {
      ...h,
      admin: adminler.has(h.id),
      secmeliler: (v?.secmeliler as string[]) ?? [],
      ayarlar: (v?.ayarlar as Record<string, unknown>) ?? {},
      dosyalar: { yillik: dosyaAdi(v?.yillik), uygulama: dosyaAdi(v?.uygulama), ogrenci: dosyaAdi(v?.ogrenci) },
      guncelleme: v?.updated_at,
    };
  });
}

function Admin() {
  const { user } = useAuth();
  const { veri } = useYuklenenVeri();
  const qc = useQueryClient();
  const sil = useServerFn(hesapSil);
  const [ara, setAra] = useState("");
  const [acik, setAcik] = useState<string | null>(null);
  const [sekme, setSekme] = useState<AdminSekme>("genel");
  const { data: hesaplar = [], isLoading, error } = useQuery({ queryKey: ["admin-hesaplar"], queryFn: hesaplariGetir });

  const secmeliAdi = useMemo(() => {
    const m = new Map<string, { ad: string; grup?: number }>();
    SECMELILER.forEach((s) => m.set(s.id, { ad: s.electiveName }));
    secmeliGruplari(veri).forEach((s) => m.set(s.id, { ad: s.ad, grup: s.grup }));
    return m;
  }, [veri]);
  const secenekler = useMemo(() => [...secmeliAdi].map(([id, v]) => ({ id, ...v })), [secmeliAdi]);
  const { data: orijinal = false } = useQuery({
    queryKey: ["orijinal-admin"],
    queryFn: async () => (await supabase.rpc("orijinal_admin_mi")).data === true,
  });
  const yetki = async (h: Hesap) => {
    if (!confirm(h.admin ? `${h.ad_soyad || h.email} kişisinin admin yetkisi alınsın mı?` : `${h.ad_soyad || h.email} admin yapılsın mı?`)) return;
    const { error } = await supabase.rpc("admin_yetki_ayarla", { _user_id: h.id, _ver: !h.admin });
    if (error) { toast.error(error.message); return; }
    toast.success(h.admin ? "Admin yetkisi alındı." : "Admin yetkisi verildi.");
    await qc.invalidateQueries({ queryKey: ["admin-hesaplar"] });
  };

  const liste = hesaplar.filter((h) =>
    `${h.ad_soyad} ${h.ogrenci_no} ${h.email ?? ""}`.toLocaleLowerCase("tr").includes(ara.toLocaleLowerCase("tr")),
  );

  const secmeliSayim = useMemo(() => {
    const c = new Map<string, number>();
    hesaplar.forEach((h) => h.secmeliler.forEach((id) => c.set(id, (c.get(id) ?? 0) + 1)));
    return [...c].sort((a, b) => b[1] - a[1]);
  }, [hesaplar]);

  const hesabiSil = async (h: Hesap) => {
    if (!confirm(`${h.ad_soyad || h.email} hesabı ve tüm verileri kalıcı olarak silinsin mi?`)) return;
    try {
      await sil({ data: { userId: h.id } });
      toast.success("Hesap silindi.");
      await qc.invalidateQueries({ queryKey: ["admin-hesaplar"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Silinemedi.");
    }
  };

  const sekmeler: { id: AdminSekme; ad: string; aciklama: string; ikon: typeof ShieldCheck }[] = [
    { id: "genel", ad: "Genel bakış", aciklama: "Dosyalar ve seçmeli durumu", ikon: ShieldCheck },
    { id: "programlar", ad: "Programlar", aciklama: "Dönem ve ders verileri", ikon: BookMarked },
    { id: "kullanicilar", ad: "Kullanıcılar", aciklama: "Hesaplar ve yetkiler", ikon: UsersRound },
  ];

  return (
    <AppShell baslik="Admin Paneli" aciklama="Ortak verileri ve kullanıcıları yönet">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="ui-surface rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-muted-foreground"><UsersRound className="h-4 w-4 text-teorik" /><span className="text-xs font-semibold">Toplam hesap</span></div><p className="mt-2 text-3xl font-extrabold">{hesaplar.length}</p><p className="mt-1 text-[11px] text-muted-foreground">Kayıtlı öğrenci ve yönetici</p></div>
          <div className="ui-surface rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-altin" /><span className="text-xs font-semibold">Yönetici hesabı</span></div><p className="mt-2 text-3xl font-extrabold">{hesaplar.filter((h) => h.admin).length}</p><p className="mt-1 text-[11px] text-muted-foreground">Yetkili panel erişimi</p></div>
          <div className="ui-surface rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-muted-foreground"><BookMarked className="h-4 w-4 text-pratik" /><span className="text-xs font-semibold">Seçmeli tercihi</span></div><p className="mt-2 text-3xl font-extrabold">{hesaplar.reduce((toplam, h) => toplam + h.secmeliler.length, 0)}</p><p className="mt-1 text-[11px] text-muted-foreground">Tüm öğrencilerin seçimi</p></div>
        </section>

        <nav aria-label="Admin bölümleri" className="ui-surface flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5 no-scrollbar">
          {sekmeler.map(({ id, ad, aciklama, ikon: Ikon }) => <button key={id} onClick={() => setSekme(id)} className={`ui-control min-w-[10rem] flex-1 rounded-xl px-3 py-2.5 text-left ${sekme === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"}`}><span className="flex items-center gap-2 text-sm font-bold"><Ikon className="h-4 w-4" />{ad}</span><span className={`mt-0.5 block text-[10px] ${sekme === id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{aciklama}</span></button>)}
        </nav>

        {sekme === "genel" ? <div className="space-y-4">
          <section className="ui-surface rounded-3xl border border-border bg-surface p-4 md:p-5">
            <div className="mb-4"><h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-4 w-4 text-altin" /> Herkes için ortak dosyalar</h2><p className="mt-1 text-xs text-muted-foreground">Haftalık amfi ve genel seçmeli programı burada yüklersen tüm öğrencilerin takvimine yansır.</p></div>
            <VeriYukleme tur="genel" />
          </section>
          {secmeliSayim.length ? <section className="ui-surface rounded-3xl border border-border bg-surface p-4 md:p-5"><div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-base font-bold">Seçmeli tercihleri</h2><p className="mt-1 text-xs text-muted-foreground">En çok seçilen dersleri hızlıca gör.</p></div><span className="rounded-full bg-accent px-2 py-1 text-xs font-bold">{secmeliSayim.length} ders</span></div><div className="grid gap-2 sm:grid-cols-2">{secmeliSayim.map(([id, n]) => <div key={id} className="flex items-center justify-between gap-2 rounded-xl bg-accent/70 px-3 py-2 text-xs"><span className="truncate">{secmeliAdi.get(id)?.grup ? `${secmeliAdi.get(id)?.grup}. grup · ` : ""}{secmeliAdi.get(id)?.ad ?? id}</span><span className="shrink-0 font-bold">{n} öğrenci</span></div>)}</div></section> : null}
        </div> : null}

        {sekme === "programlar" ? <section className="ui-surface rounded-3xl border border-border bg-surface p-4 md:p-5"><div className="mb-4"><h2 className="text-base font-bold">Dönem programları</h2><p className="mt-1 text-xs text-muted-foreground">Türkçe ve İngilizce ders programı, uygulama tablosu ve öğrenci listesini dönem bazında yönet.</p></div><ProgramYonetimi /></section> : null}

        {sekme === "kullanicilar" ? <div className="space-y-4">
          <YeniHesap onOlustu={() => void qc.invalidateQueries({ queryKey: ["admin-hesaplar"] })} />
          <section className="ui-surface rounded-3xl border border-border bg-surface p-4 md:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold">Kullanıcı yönetimi</h2><p className="mt-1 text-xs text-muted-foreground">Hesapları açıp öğrenci bilgilerini, dosyalarını ve yetkilerini düzenle.</p></div><span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-muted-foreground">{liste.length} sonuç</span></div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2"><Search className="h-4 w-4 text-muted-foreground" /><input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ad, öğrenci no veya e-posta ara" className="w-full bg-transparent text-sm outline-none" /></div>
            {isLoading ? <p className="text-sm text-muted-foreground">Hesaplar yükleniyor…</p> : null}
            {error ? <p className="text-sm text-destructive">Hesaplar alınamadı.</p> : null}
            <div className="overflow-hidden rounded-2xl border border-border bg-background/35">
              {liste.map((h) => { const a = acik === h.id; return <div key={h.id} className="border-b border-border/70 last:border-0"><button onClick={() => setAcik(a ? null : h.id)} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/60"><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate text-sm font-semibold">{h.ad_soyad || "(adsız)"}{h.admin ? <span className="rounded bg-accent px-1.5 text-[10px] font-bold text-altin">{h.email?.toLowerCase() === ORIJINAL_ADMIN_EMAIL ? "SÜPER ADMİN" : "ADMİN"}</span> : null}</p><p className="truncate text-xs text-muted-foreground">{h.ogrenci_no || "no yok"} · {h.email}</p></div><span className="shrink-0 text-xs text-muted-foreground">{h.secmeliler.length} seçmeli</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${a ? "rotate-180" : ""}` /></button>{a ? <div className="space-y-3 bg-accent/30 px-3 pb-3 pt-1 text-xs"><NoDuzenle userId={h.id} no={h.ogrenci_no} onKaydedildi={() => void qc.invalidateQueries({ queryKey: ["admin-hesaplar"] })} /><Bilgi etiket="E-posta" deger={h.email ?? "—"} /><Bilgi etiket="Kayıt tarihi" deger={new Date(h.created_at).toLocaleString("tr-TR")} />{h.guncelleme ? <Bilgi etiket="Son güncelleme" deger={new Date(h.guncelleme).toLocaleString("tr-TR")} /> : null}<GrupDuzenle userId={h.id} ayarlar={h.ayarlar} onKaydedildi={() => void qc.invalidateQueries({ queryKey: ["admin-hesaplar"] })} /><div><p className="font-semibold text-muted-foreground">Seçtiği seçmeliler</p>{h.secmeliler.length ? <ul className="mt-1 list-inside list-disc">{h.secmeliler.map((id) => <li key={id}>{secmeliAdi.get(id)?.grup ? `${secmeliAdi.get(id)?.grup}. grup: ` : ""}{secmeliAdi.get(id)?.ad ?? id}</li>)}</ul> : <p className="mt-1">Seçim yok</p>}</div>{h.id !== user?.id ? <HesapDuzenle key={h.id + h.secmeliler.join()} userId={h.id} secili={h.secmeliler} dosyalar={h.dosyalar} secenekler={secenekler} onKaydedildi={() => void qc.invalidateQueries({ queryKey: ["admin-hesaplar"] })} /> : null}{h.id !== user?.id ? <div className="flex flex-wrap gap-2">{orijinal ? <button onClick={() => void yetki(h)} className="ui-control inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 font-semibold text-altin hover:bg-accent"><ShieldCheck className="h-3.5 w-3.5" /> {h.admin ? "Admin yetkisini al" : "Admin yap"}</button> : null}<button onClick={() => void hesabiSil(h)} className="ui-control inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-1.5 font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Hesabı sil</button></div> : null}</div> : null}</div>; })}
            </div>
          </section>
        </div> : null}
      </div>
    </AppShell>
  );
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <p>
      <span className="font-semibold text-muted-foreground">{etiket}: </span>
      {deger}
    </p>
  );
}

function NoDuzenle({ userId, no, onKaydedildi }: { userId: string; no: string; onKaydedildi: () => void }) {
  const [deger, setDeger] = useState(no);
  const kaydet = async () => {
    const yeni = deger.trim();
    const { error } = await supabase.from("profiles").update({ ogrenci_no: yeni, updated_at: new Date().toISOString() }).eq("id", userId);
    if (error) { toast.error("Numara kaydedilemedi."); return; }
    const { data } = await supabase.from("user_data").select("ayarlar").eq("user_id", userId).maybeSingle();
    if (data) {
      const ayarlar = { ...((data.ayarlar as Record<string, unknown>) ?? {}), ogrenciNo: yeni };
      await supabase.from("user_data").update({ ayarlar: ayarlar as never }).eq("user_id", userId);
    }
    toast.success("Öğrenci numarası güncellendi.");
    onKaydedildi();
  };
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-muted-foreground">Öğrenci no:</span>
      <input value={deger} onChange={(e) => setDeger(e.target.value)} className="w-36 rounded-lg border border-border bg-background px-2 py-1" />
      {deger.trim() !== no ? (
        <button onClick={() => void kaydet()} className="rounded-lg bg-primary px-2 py-1 font-semibold text-primary-foreground">Kaydet</button>
      ) : null}
    </div>
  );
}

function GrupDuzenle({ userId, ayarlar, onKaydedildi }: { userId: string; ayarlar: Record<string, unknown>; onKaydedildi: () => void }) {
  const elle = ayarlar["grupElle"] as { grup: string; altGrup: string } | null | undefined;
  const [grup, setGrup] = useState(elle?.grup ?? "");
  const [alt, setAlt] = useState(elle?.altGrup ?? "");
  const kaydet = async (sifirla = false) => {
    const g = sifirla ? "" : grup.trim().toLocaleUpperCase("tr-TR");
    const a = sifirla ? "" : alt.trim().toLocaleLowerCase("tr-TR");
    const yeni = { ...ayarlar, grupElle: g ? { grup: g, altGrup: a } : null, ...(g ? { grup: [g, a].filter(Boolean).join(" / ") } : {}) };
    const { error } = await supabase.from("user_data").update({ ayarlar: yeni as never, updated_at: new Date().toISOString() }).eq("user_id", userId);
    if (error) { toast.error("Grup kaydedilemedi."); return; }
    if (sifirla) { setGrup(""); setAlt(""); }
    toast.success(sifirla ? "Grup öğrenci listesine bırakıldı." : "Grup güncellendi.");
    onKaydedildi();
  };
  return (
    <div className="space-y-1">
      <p>
        <span className="font-semibold text-muted-foreground">Grup: </span>
        {String(ayarlar["grup"] ?? "—")}
        {elle?.grup ? <span className="ml-1 text-altin">(admin atadı)</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={grup} onChange={(e) => setGrup(e.target.value)} placeholder="Grup (A, İ1)" className="w-28 rounded-lg border border-border bg-background px-2 py-1" />
        <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt grup (a1, i2)" className="w-32 rounded-lg border border-border bg-background px-2 py-1" />
        <button onClick={() => void kaydet()} disabled={!grup.trim()} className="rounded-lg bg-primary px-2 py-1 font-semibold text-primary-foreground disabled:opacity-50">Grubu kaydet</button>
        {elle?.grup ? <button onClick={() => void kaydet(true)} className="rounded-lg border border-border px-2 py-1 font-semibold hover:bg-accent">Listeye bırak</button> : null}
      </div>
    </div>
  );
}

function YeniHesap({ onOlustu }: { onOlustu: () => void }) {
  const olustur = useServerFn(hesapOlustur);
  const [acik, setAcik] = useState(false);
  const [f, setF] = useState({ adSoyad: "", ogrenciNo: "", email: "", sifre: "" });
  const [bekle, setBekle] = useState(false);
  const girdi = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm";
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    try {
      await olustur({ data: f });
      toast.success(`${f.email} hesabı oluşturuldu.`);
      setF({ adSoyad: "", ogrenciNo: "", email: "", sifre: "" });
      setAcik(false);
      onOlustu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hesap oluşturulamadı.");
    } finally {
      setBekle(false);
    }
  };
  return (
    <section className="ui-surface rounded-3xl border border-border bg-surface p-4">
      <button onClick={() => setAcik((a) => !a)} className="flex w-full items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-2"><UserRoundPlus className="h-4 w-4 text-primary" />Yeni hesap oluştur</span> <ChevronDown className={`h-4 w-4 transition ${acik ? "rotate-180" : ""}`} />
      </button>
      {acik ? (
        <form onSubmit={gonder} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className={girdi} placeholder="Ad soyad" required value={f.adSoyad} onChange={(e) => setF({ ...f, adSoyad: e.target.value })} />
          <input className={girdi} placeholder="Öğrenci no" value={f.ogrenciNo} onChange={(e) => setF({ ...f, ogrenciNo: e.target.value })} />
          <input className={girdi} type="email" placeholder="E-posta" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className={girdi} type="password" autoComplete="new-password" placeholder="Şifre" required value={f.sifre} onChange={(e) => setF({ ...f, sifre: e.target.value })} />
          <button disabled={bekle} className="rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2">
            {bekle ? "Oluşturuluyor…" : "Hesabı oluştur"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
