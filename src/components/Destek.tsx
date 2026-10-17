import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Lightbulb, LifeBuoy, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Talep = { id: string; user_id: string; konu: string; aciklama: string; tur: "destek" | "oneri"; durum: string; created_at: string; updated_at: string };
type Mesaj = { id: string; talep_id: string; user_id: string; yonetici: boolean; metin: string; created_at: string };
type Ek = { id: string; talep_id: string; yol: string; ad: string; boyut: number; content_type: string; created_at: string };

export const TUR_ETIKET: Record<Talep["tur"], string> = { destek: "Destek", oneri: "Öneri" };
const MAX_HAM_DOSYA = 8 * 1024 * 1024;
const MAX_GORSEL = 5 * 1024 * 1024;
const kabulEdilen = new Set(["image/jpeg", "image/png", "image/webp"]);
const tarih = (s: string) => new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

/** Görseli yeniden kodlayarak meta veri/ekli içerik bırakmadan JPEG olarak kaydeder. */
async function temizGorsel(dosya: File) {
  if (!kabulEdilen.has(dosya.type) || dosya.size > MAX_HAM_DOSYA) throw new Error("Yalnızca en fazla 8 MB PNG, JPG veya WebP görsel eklenebilir.");
  const bitmap = await createImageBitmap(dosya);
  if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width > 6000 || bitmap.height > 6000) throw new Error("Görsel boyutları desteklenmiyor.");
  const oran = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * oran));
  canvas.height = Math.max(1, Math.round(bitmap.height * oran));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob || blob.size > MAX_GORSEL) throw new Error("Görsel işlenemedi veya 5 MB sınırını aştı.");
  return new File([blob], "destek-eki.jpg", { type: "image/jpeg" });
}

async function ekYukle(dosya: File, talepId: string, userId: string) {
  const temiz = await temizGorsel(dosya);
  const yol = `${userId}/${talepId}/${crypto.randomUUID()}.jpg`;
  const yukle = await supabase.storage.from("destek-ekleri").upload(yol, temiz, { contentType: "image/jpeg", upsert: false });
  if (yukle.error) throw new Error("Görsel yüklenemedi.");
  const { error } = await supabase.from("destek_ekleri").insert({ talep_id: talepId, user_id: userId, yol, ad: dosya.name.slice(0, 180), boyut: temiz.size, content_type: "image/jpeg" });
  if (error) { await supabase.storage.from("destek-ekleri").remove([yol]); throw new Error("Görsel kaydedilemedi."); }
}

export function useTalepler() {
  const [liste, setListe] = useState<Talep[]>([]);
  const [yukleniyor, setY] = useState(true);
  const yenile = async () => {
    const { data, error } = await supabase.from("destek_talepleri").select("*").order("updated_at", { ascending: false });
    if (error) toast.error("Talepler alınamadı.");
    setListe((data ?? []) as Talep[]);
    setY(false);
  };
  useEffect(() => {
    void yenile();
    const kanal = supabase.channel(`talepler-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "destek_talepleri" }, () => void yenile()).subscribe();
    return () => { void supabase.removeChannel(kanal); };
  }, []);
  return { liste, yukleniyor, yenile };
}

export function TalepTuruSecici({ sec }: { sec: (tur: Talep["tur"]) => void }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="text-sm font-semibold text-primary">Nasıl yardımcı olabiliriz?</p>
      <h2 className="mt-1 text-xl font-bold">Talep türünü seç</h2>
      <p className="mt-1 text-sm text-muted-foreground">Destek taleplerine destek ekibi cevap verir. Öneriler ise değerlendirmeye alınır ve gönderildikten sonra geçmişte görünmez.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button onClick={() => sec("destek")} className="group rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5">
          <LifeBuoy className="h-6 w-6 text-primary" /><b className="mt-3 block">Destek al</b>
          <span className="mt-1 block text-xs text-muted-foreground">Bir sorun bildir, görsel ekle ve yanıtlarını bu sayfadan takip et.</span>
        </button>
        <button onClick={() => sec("oneri")} className="group rounded-xl border border-border p-4 text-left transition hover:border-amber-500 hover:bg-amber-500/5">
          <Lightbulb className="h-6 w-6 text-amber-500" /><b className="mt-3 block">Öneri gönder</b>
          <span className="mt-1 block text-xs text-muted-foreground">Fikrini ekibe ilet. Öneriler tek seferliktir; sonradan görüntülenmez ve yanıtlanmaz.</span>
        </button>
      </div>
    </section>
  );
}

export function YeniTalep({ tur, onOlustu, vazgec }: { tur: Talep["tur"]; onOlustu: (id: string) => void; vazgec: () => void }) {
  const [konu, setKonu] = useState("");
  const [metin, setMetin] = useState("");
  const [ek, setEk] = useState<File | null>(null);
  const [bekle, setBekle] = useState(false);
  const gonder = async () => {
    if (!konu.trim() || !metin.trim()) { toast.error("Başlık ve detay gerekli."); return; }
    setBekle(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Oturum bulunamadı.");
      const id = crypto.randomUUID();
      const { error } = await supabase.from("destek_talepleri").insert({ id, konu: konu.trim().slice(0, 200), aciklama: metin.trim().slice(0, 4000), tur, user_id: u.user.id });
      if (error) throw error;
      if (tur === "destek") {
        const mesaj = await supabase.from("destek_mesajlari").insert({ talep_id: id, metin: metin.trim().slice(0, 4000), user_id: u.user.id });
        if (mesaj.error) throw mesaj.error;
      }
      if (ek) await ekYukle(ek, id, u.user.id);
      toast.success(tur === "destek" ? "Destek talebin gönderildi." : "Önerin değerlendirilecek ekibe iletildi.");
      onOlustu(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gönderim sırasında hata oluştu.");
    } finally { setBekle(false); }
  };
  const ekSec = (f?: File) => {
    if (!f) return;
    if (!kabulEdilen.has(f.type) || f.size > MAX_HAM_DOSYA) { toast.error("Yalnızca en fazla 8 MB PNG, JPG veya WebP görsel eklenebilir."); return; }
    setEk(f);
  };
  const baslik = tur === "destek" ? "Destek talebi oluştur" : "Önerini gönder";
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <button type="button" onClick={vazgec} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Tür seçimine dön</button>
      <div><p className="text-xs font-semibold text-primary">{TUR_ETIKET[tur]}</p><h2 className="text-lg font-bold">{baslik}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{tur === "destek" ? "Yanıt geldiğinde bildirim alırsın; talebini aşağıdaki listeden takip edebilirsin." : "Bu öneri tek seferlik olarak ekibe gönderilir. Gönderimden sonra öğrenci hesabında görünmez ve yanıtlanmaz."}</p></div>
      <input value={konu} onChange={(e) => setKonu(e.target.value)} maxLength={200} placeholder="Başlık" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <textarea value={metin} onChange={(e) => setMetin(e.target.value)} maxLength={4000} rows={5} placeholder={tur === "destek" ? "Yaşadığın sorunu ayrıntısıyla yaz…" : "Önerini ayrıntısıyla yaz…"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"><ImagePlus className="h-4 w-4" />Görsel ekle
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { ekSec(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        </label>
        {ek ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{ek.name} <button onClick={() => setEk(null)} aria-label="Eki kaldır"><X className="h-3.5 w-3.5" /></button></span> : <span className="text-xs text-muted-foreground">PNG, JPG veya WebP · en fazla 8 MB</span>}
        <p className="basis-full text-[11px] text-muted-foreground">Görseller yayınlanmadan önce yeniden işlenir; dosyanın özgün meta verileri saklanmaz.</p>
      </div>
      <button onClick={() => void gonder()} disabled={bekle} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{bekle ? "Gönderiliyor…" : tur === "destek" ? "Destek talebini gönder" : "Öneriyi gönder"}</button>
    </section>
  );
}

function Ekler({ talepId }: { talepId: string }) {
  const [ekler, setEkler] = useState<Ek[]>([]);
  useEffect(() => { void supabase.from("destek_ekleri").select("*").eq("talep_id", talepId).order("created_at").then(({ data }) => setEkler((data ?? []) as Ek[])); }, [talepId]);
  const ac = async (ek: Ek) => {
    const { data, error } = await supabase.storage.from("destek-ekleri").createSignedUrl(ek.yol, 60);
    if (error || !data?.signedUrl) { toast.error("Ek açılamadı."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  if (!ekler.length) return null;
  return <div className="flex flex-wrap gap-2">{ekler.map((ek) => <button key={ek.id} onClick={() => void ac(ek)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"><ImagePlus className="mr-1 inline h-3.5 w-3.5" />{ek.ad}</button>)}</div>;
}

export function TalepSohbet({ talep, yonetici, onDegisti }: { talep: Talep; yonetici: boolean; onDegisti: () => void }) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [metin, setMetin] = useState("");
  const oneri = talep.tur === "oneri";
  const yukle = async () => {
    if (oneri) { setMesajlar([]); return; }
    const { data } = await supabase.from("destek_mesajlari").select("*").eq("talep_id", talep.id).order("created_at");
    setMesajlar((data ?? []) as Mesaj[]);
  };
  useEffect(() => {
    void yukle();
    if (oneri) return;
    const kanal = supabase.channel(`mesaj-${talep.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "destek_mesajlari", filter: `talep_id=eq.${talep.id}` }, () => void yukle()).subscribe();
    return () => { void supabase.removeChannel(kanal); };
  }, [talep.id, oneri]);
  const gonder = async () => {
    if (!metin.trim() || oneri) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("destek_mesajlari").insert({ talep_id: talep.id, metin: metin.trim().slice(0, 4000), yonetici, user_id: u.user!.id });
    if (error) { toast.error("Mesaj gönderilemedi."); return; }
    setMetin(""); await yukle(); onDegisti();
  };
  const durumDegis = async () => {
    const { error } = await supabase.from("destek_talepleri").update({ durum: talep.durum === "acik" ? "kapali" : "acik" }).eq("id", talep.id);
    if (error) toast.error("Durum değiştirilemedi."); else onDegisti();
  };
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2"><div><h2 className="font-semibold">{talep.konu}</h2><p className="text-xs text-muted-foreground">{TUR_ETIKET[talep.tur]} · {oneri ? "Tek yönlü" : talep.durum === "acik" ? "Açık" : "Kapalı"} · {tarih(talep.created_at)}</p></div>
        {yonetici && <button onClick={() => void durumDegis()} className="rounded-md border border-border px-3 py-1 text-xs">{talep.durum === "acik" ? "Kapat" : "Yeniden aç"}</button>}</div>
      {oneri ? <div className="rounded-lg bg-amber-500/10 p-3 text-sm"><p className="whitespace-pre-wrap">{talep.aciklama}</p><p className="mt-2 text-xs text-muted-foreground">Öneriler yanıtlanmaz; öğrenci gönderimden sonra bu kaydı görmez.</p></div> : <>
        <div className="space-y-2">{mesajlar.map((m) => { const benim = m.yonetici === yonetici; return <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${benim ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}><p className="text-[11px] opacity-75">{m.yonetici ? "Destek ekibi" : "Öğrenci"} · {tarih(m.created_at)}</p><p className="whitespace-pre-wrap">{m.metin}</p></div>; })}</div>
        <div className="flex gap-2"><textarea value={metin} onChange={(e) => setMetin(e.target.value)} rows={2} maxLength={4000} placeholder="Cevap yaz…" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" /><button onClick={() => void gonder()} className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Gönder</button></div>
      </>}
      <Ekler talepId={talep.id} />
    </section>
  );
}

export function TalepListesi({ liste, secili, sec, ekstra }: { liste: Talep[]; secili: string | null; sec: (id: string) => void; ekstra?: (t: Talep) => string }) {
  if (!liste.length) return <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>;
  return <ul className="space-y-1">{liste.map((t) => <li key={t.id}><button onClick={() => sec(t.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${secili === t.id ? "border-primary bg-accent" : "border-border hover:bg-accent"}`}><span className="font-medium">{t.konu}</span><span className="block text-xs text-muted-foreground">{TUR_ETIKET[t.tur]} · {t.tur === "oneri" ? "Tek yönlü" : t.durum === "acik" ? "Açık" : "Kapalı"} · {tarih(t.updated_at)}{ekstra ? ` · ${ekstra(t)}` : ""}</span></button></li>)}</ul>;
}
