import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ArrowLeft, ImagePlus, Lightbulb, Megaphone, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Talep = { id: string; user_id: string; konu: string; aciklama: string; tur: "destek" | "oneri"; durum: string; created_at: string; updated_at: string };
export const TUR_ETIKET: Record<Talep["tur"], string> = { destek: "Şikâyet", oneri: "Öneri" };
const MAX_HAM_DOSYA = 8 * 1024 * 1024;
const MAX_GORSEL = 5 * 1024 * 1024;
const kabulEdilen = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  return new File([blob], "iletisim-eki.jpg", { type: "image/jpeg" });
}

async function ekYukle(dosya: File, talepId: string, userId: string) {
  const temiz = await temizGorsel(dosya);
  const yol = `${userId}/${talepId}/${crypto.randomUUID()}.jpg`;
  const yukle = await supabase.storage.from("destek-ekleri").upload(yol, temiz, { contentType: "image/jpeg", upsert: false });
  if (yukle.error) throw new Error("Görsel yüklenemedi.");
  const { error } = await supabase.from("destek_ekleri").insert({ talep_id: talepId, user_id: userId, yol, ad: dosya.name.slice(0, 180), boyut: temiz.size, content_type: "image/jpeg" });
  if (error) { await supabase.storage.from("destek-ekleri").remove([yol]); throw new Error("Görsel kaydedilemedi."); }
}

export function TalepTuruSecici({ sec }: { sec: (tur: Talep["tur"] | "ders") => void }) {
  return (
    <section className="support-choices">
      <p className="text-sm font-semibold text-primary">Görüşünü ilet</p>
      <h2 className="mt-1 text-xl font-bold">Ne göndermek istiyorsun?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Şikâyet ve öneriler değerlendirme ekibine iletilir. Şikâyetlerine gelen yanıtları burada takip edebilirsin. Öneriler tek yönlüdür.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <button onClick={() => sec("destek")} className="group rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5">
          <Megaphone className="h-6 w-6 text-primary" /><b className="mt-3 block">Hata bildir</b>
          <span className="mt-1 block text-xs text-muted-foreground">Bir sorun veya aksaklığı ekibe bildir.</span>
        </button>
        <button onClick={() => sec("oneri")} className="group rounded-xl border border-border p-4 text-left transition hover:border-amber-500 hover:bg-amber-500/5">
          <Lightbulb className="h-6 w-6 text-amber-500" /><b className="mt-3 block">Öneri gönder</b>
          <span className="mt-1 block text-xs text-muted-foreground">Geliştirme fikrini ekibe ilet.</span>
        </button>
        <button onClick={() => sec("ders")} className="group rounded-xl border border-border p-4 text-left hover:border-pratik hover:bg-pratik-soft"><CalendarClock className="h-6 w-6 text-pratik" /><b className="mt-3 block">Ders değişikliği bildir</b><span className="mt-1 block text-xs text-muted-foreground">Dersin değişen saatini, tarihini veya amfisini ilet.</span></button>
      </div>
    </section>
  );
}

export function YeniTalep({ tur, onOlustu, vazgec, ilkKonu = "" }: { ilkKonu?: string; tur: Talep["tur"]; onOlustu: () => void; vazgec: () => void }) {
  const [konu, setKonu] = useState(ilkKonu);
  const [metin, setMetin] = useState("");
  const [ek, setEk] = useState<File | null>(null);
  const [bekle, setBekle] = useState(false);
  const etiket = TUR_ETIKET[tur];
  const gonder = async () => {
    if (!konu.trim() || !metin.trim()) { toast.error("Başlık ve detay gerekli."); return; }
    setBekle(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Oturum bulunamadı.");
      const id = crypto.randomUUID();
      const { error } = await supabase.from("destek_talepleri").insert({ id, konu: konu.trim().slice(0, 200), aciklama: metin.trim().slice(0, 4000), tur, user_id: u.user.id });
      if (error) throw error;
      if (ek) await ekYukle(ek, id, u.user.id);
      toast.success(`${etiket}in ekibe iletildi.`);
      onOlustu();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gönderim sırasında hata oluştu.");
    } finally { setBekle(false); }
  };
  const ekSec = (f?: File) => {
    if (!f) return;
    if (!kabulEdilen.has(f.type) || f.size > MAX_HAM_DOSYA) { toast.error("Yalnızca en fazla 8 MB PNG, JPG veya WebP görsel eklenebilir."); return; }
    setEk(f);
  };
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <button type="button" onClick={vazgec} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Tür seçimine dön</button>
      <div><p className="text-xs font-semibold text-primary">{etiket}</p><h2 className="text-lg font-bold">{etiket} gönder</h2>
        <p className="mt-1 text-xs text-muted-foreground">{tur === "destek" ? "Ekip yanıt verdiğinde Şikâyetlerim bölümünden okuyabilirsin." : "Önerin ekibe iletilir ve gönderimden sonra hesabında görünmez."}</p></div>
      <input value={konu} onChange={(e) => setKonu(e.target.value)} maxLength={200} placeholder="Başlık" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <textarea value={metin} onChange={(e) => setMetin(e.target.value)} maxLength={4000} rows={5} placeholder={tur === "destek" ? "Şikâyetini ayrıntısıyla yaz…" : "Önerini ayrıntısıyla yaz…"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"><ImagePlus className="h-4 w-4" />Görsel ekle
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { ekSec(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        </label>
        {ek ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{ek.name} <button onClick={() => setEk(null)} aria-label="Eki kaldır"><X className="h-3.5 w-3.5" /></button></span> : <span className="text-xs text-muted-foreground">PNG, JPG veya WebP · en fazla 8 MB</span>}
        <p className="basis-full text-[11px] text-muted-foreground">Görseller yeniden işlenir; özgün dosyanın meta verileri saklanmaz.</p>
      </div>
      <button onClick={() => void gonder()} disabled={bekle} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{bekle ? "Gönderiliyor…" : `${etiket}i gönder`}</button>
    </section>
   );
}

export type TalepMesaji = { id: string; talep_id: string; user_id: string; metin: string; yonetici: boolean; created_at: string };
export type TalepEki = { id: string; talep_id: string; user_id: string; yol: string; ad: string; boyut: number; created_at: string };

const saat = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Talepleri çeker; yönetici tümünü, öğrenci yalnızca kendi şikâyetlerini görür. */
export function useTalepler(kendiSikayetleri?: string) {
  const [liste, setListe] = useState<Talep[]>([]);
  const [bekliyor, setBekliyor] = useState(true);
  const yenile = useCallback(async () => {
    let sorgu = supabase
      .from("destek_talepleri")
      .select("id, user_id, konu, aciklama, tur, durum, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (kendiSikayetleri) sorgu = sorgu.eq("user_id", kendiSikayetleri).eq("tur", "destek");
    const { data, error } = await sorgu;
    if (error) toast.error("Kayıtlar yüklenemedi.");
    if (!error && data) setListe(data as Talep[]);
    setBekliyor(false);
  }, [kendiSikayetleri]);
  useEffect(() => { void yenile(); }, [yenile]);
  return { liste, yenile, bekliyor };
}

export function TalepListesi({ liste, secili, sec, ekstra }: { liste: Talep[]; secili: string | null; sec: (id: string) => void; ekstra?: (t: Talep) => string }) {
  if (liste.length === 0) return <p className="text-sm text-muted-foreground">Kayıt yok.</p>;
  return (
    <ul className="space-y-2">
      {liste.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => sec(t.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${secili === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t.konu}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.durum === "kapali" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                {t.durum === "kapali" ? "Kapalı" : "Açık"}
              </span>
              <span className="text-[11px] text-muted-foreground">{TUR_ETIKET[t.tur]}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.aciklama}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{saat(t.updated_at)}{ekstra ? ` · ${ekstra(t)}` : ""}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TalepSohbet({ talep, yonetici, onDegisti }: { talep: Talep; yonetici?: boolean; onDegisti?: () => void }) {
  const [ben, setBen] = useState<string | null>(null);
  const [mesajlar, setMesajlar] = useState<TalepMesaji[]>([]);
  const [ekler, setEkler] = useState<TalepEki[]>([]);
  const [url, setUrl] = useState<Record<string, string>>({});
  const [metin, setMetin] = useState("");
  const [bekle, setBekle] = useState(false);

  const yukle = useCallback(async () => {
    const [{ data: ms, error: msH }, { data: eks, error: ekH }] = await Promise.all([
      supabase.from("destek_mesajlari").select("id, talep_id, user_id, metin, yonetici, created_at").eq("talep_id", talep.id).order("created_at"),
      supabase.from("destek_ekleri").select("id, talep_id, user_id, yol, ad, boyut, created_at").eq("talep_id", talep.id),
    ]);
    if (msH || ekH) { toast.error("Mesajlar yüklenemedi."); return; }
    setMesajlar((ms ?? []) as TalepMesaji[]);
    const ekListesi = (eks ?? []) as TalepEki[];
    setEkler(ekListesi);
    const imzalar: Record<string, string> = {};
    await Promise.all(ekListesi.map(async (ek) => {
      const { data } = await supabase.storage.from("destek-ekleri").createSignedUrl(ek.yol, 3600);
      if (data) imzalar[ek.id] = data.signedUrl;
    }));
    setUrl(imzalar);
  }, [talep.id]);

  useEffect(() => {
    supabase.auth.getUser().then((u) => setBen(u.data.user?.id ?? null));
    void yukle();
  }, [yukle]);

  const gonder = async () => {
    const metinTemiz = metin.trim();
    if (!metinTemiz) return;
    setBekle(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Oturum bulunamadı.");
      const { error } = await supabase.from("destek_mesajlari").insert({ talep_id: talep.id, metin: metinTemiz.slice(0, 4000), yonetici: !!yonetici });
      if (error) throw error;
      if (yonetici) await supabase.from("destek_talepleri").update({ updated_at: new Date().toISOString() }).eq("id", talep.id);
      setMetin("");
      await yukle();
      onDegisti?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mesaj gönderilemedi.");
    } finally { setBekle(false); }
  };

  const durumDegistir = async (durum: "acik" | "kapali") => {
    setBekle(true);
    try {
      const { error } = await supabase.from("destek_talepleri").update({ durum, updated_at: new Date().toISOString() }).eq("id", talep.id);
      if (error) throw error;
      await yukle();
      onDegisti?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Durum değiştirilemedi.");
    } finally { setBekle(false); }
  };

  return (
    <section className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{TUR_ETIKET[talep.tur]} · {saat(talep.created_at)}</p>
          <h3 className="text-base font-bold">{talep.konu}</h3>
        </div>
        {yonetici ? (
          talep.durum === "kapali"
            ? <button onClick={() => void durumDegistir("acik")} disabled={bekle} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Yeniden aç</button>
            : <button onClick={() => void durumDegistir("kapali")} disabled={bekle} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Kapat</button>
        ) : <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${talep.durum === "kapali" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>{talep.durum === "kapali" ? "Kapalı" : "Açık"}</span>}
      </div>
      <p className="whitespace-pre-wrap rounded-xl bg-accent/40 p-3 text-sm">{talep.aciklama}</p>
      {ekler.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {ekler.map((ek) => url[ek.id]
            ? <a key={ek.id} href={url[ek.id]} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-accent">{ek.ad}</a>
            : <span key={ek.id} className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground">{ek.ad}</span>)}
        </div>
      ) : null}
      {talep.tur === "destek" && <><div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {mesajlar.length === 0 ? <p className="text-xs text-muted-foreground">Henüz mesaj yok.</p> : mesajlar.map((m) => {
          const kendi = m.user_id === ben;
          return (
            <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${kendi ? "ml-auto bg-primary/10" : "mr-auto bg-accent/40"}`}>
              <p className="text-[11px] font-semibold text-muted-foreground">{m.yonetici ? "Ekip" : kendi ? "Sen" : "Öğrenci"} · {saat(m.created_at)}</p>
              <p className="whitespace-pre-wrap">{m.metin}</p>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Mesaj yaz…"
          className="min-w-0 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button onClick={() => void gonder()} disabled={bekle || !metin.trim()} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-60">
          <Send className="h-4 w-4" />
        </button>
        <button onClick={() => void yukle()} className="rounded-lg border border-border px-2 py-2 text-muted-foreground hover:bg-accent" aria-label="Yenile">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div></>}
    </section>
  );
}
