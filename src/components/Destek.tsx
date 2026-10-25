import { useState } from "react";
import { ArrowLeft, ImagePlus, Lightbulb, Megaphone, X } from "lucide-react";
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

export function TalepTuruSecici({ sec }: { sec: (tur: Talep["tur"]) => void }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="text-sm font-semibold text-primary">Görüşünü ilet</p>
      <h2 className="mt-1 text-xl font-bold">Ne göndermek istiyorsun?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Şikâyet ve öneriler değerlendirme ekibine iletilir. Gönderimler yanıtlanmaz ve daha sonra bu sayfada görünmez.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button onClick={() => sec("destek")} className="group rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5">
          <Megaphone className="h-6 w-6 text-primary" /><b className="mt-3 block">Şikâyet gönder</b>
          <span className="mt-1 block text-xs text-muted-foreground">Bir sorun veya aksaklığı ekibe bildir.</span>
        </button>
        <button onClick={() => sec("oneri")} className="group rounded-xl border border-border p-4 text-left transition hover:border-amber-500 hover:bg-amber-500/5">
          <Lightbulb className="h-6 w-6 text-amber-500" /><b className="mt-3 block">Öneri gönder</b>
          <span className="mt-1 block text-xs text-muted-foreground">Geliştirme fikrini ekibe ilet.</span>
        </button>
      </div>
    </section>
  );
}

export function YeniTalep({ tur, onOlustu, vazgec }: { tur: Talep["tur"]; onOlustu: () => void; vazgec: () => void }) {
  const [konu, setKonu] = useState("");
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
        <p className="mt-1 text-xs text-muted-foreground">Gönderimin değerlendirme ekibine iletilir; yanıtlanmaz ve sonradan hesabında görünmez.</p></div>
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
