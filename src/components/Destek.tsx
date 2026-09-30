import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Talep = { id: string; user_id: string; konu: string; tur: string; durum: string; created_at: string; updated_at: string };
type Mesaj = { id: string; talep_id: string; user_id: string; yonetici: boolean; metin: string; created_at: string };

export const TUR_ETIKET: Record<string, string> = { destek: "Destek", oneri: "Öneri", sikayet: "Şikayet" };

const tarih = (s: string) => new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

/** Talep listesini getirir (RLS: öğrenci kendi, ana admin hepsi). */
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
    const kanal = supabase
      .channel(`talepler-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "destek_talepleri" }, () => void yenile())
      .subscribe();
    return () => { void supabase.removeChannel(kanal); };
  }, []);
  return { liste, yukleniyor, yenile };
}

export function YeniTalep({ onOlustu }: { onOlustu: (id: string) => void }) {
  const [konu, setKonu] = useState("");
  const [tur, setTur] = useState("destek");
  const [metin, setMetin] = useState("");
  const [bekle, setBekle] = useState(false);
  const gonder = async () => {
    if (!konu.trim() || !metin.trim()) { toast.error("Konu ve mesaj gerekli."); return; }
    setBekle(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("destek_talepleri").insert({ konu: konu.trim().slice(0, 200), tur, user_id: u.user!.id }).select("id").single();
    if (error || !data) { setBekle(false); toast.error("Talep açılamadı."); return; }
    await supabase.from("destek_mesajlari").insert({ talep_id: data.id, metin: metin.trim().slice(0, 4000), user_id: u.user!.id });
    setBekle(false); setKonu(""); setMetin("");
    toast.success("Talebin gönderildi.");
    onOlustu(data.id);
  };
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">Yeni talep</h2>
      <div className="flex gap-2">
        {Object.entries(TUR_ETIKET).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setTur(k)} className={`rounded-md border px-3 py-1 text-sm ${tur === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{v}</button>
        ))}
      </div>
      <input value={konu} onChange={(e) => setKonu(e.target.value)} maxLength={200} placeholder="Konu" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <textarea value={metin} onChange={(e) => setMetin(e.target.value)} maxLength={4000} rows={4} placeholder="Yaşadığın sorunu veya önerini yaz…" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <button onClick={gonder} disabled={bekle} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{bekle ? "Gönderiliyor…" : "Gönder"}</button>
    </div>
  );
}

/** Bir talebin mesajlaşması. yonetici=true ise ana admin olarak cevap yazar. */
export function TalepSohbet({ talep, yonetici, onDegisti }: { talep: Talep; yonetici: boolean; onDegisti: () => void }) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [metin, setMetin] = useState("");
  const yukle = async () => {
    const { data } = await supabase.from("destek_mesajlari").select("*").eq("talep_id", talep.id).order("created_at");
    setMesajlar((data ?? []) as Mesaj[]);
  };
  useEffect(() => {
    void yukle();
    const kanal = supabase
      .channel(`mesaj-${talep.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "destek_mesajlari", filter: `talep_id=eq.${talep.id}` }, () => void yukle())
      .subscribe();
    return () => { void supabase.removeChannel(kanal); };
  }, [talep.id]);
  const gonder = async () => {
    if (!metin.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("destek_mesajlari").insert({ talep_id: talep.id, metin: metin.trim().slice(0, 4000), yonetici, user_id: u.user!.id });
    if (error) { toast.error("Mesaj gönderilemedi."); return; }
    await supabase.from("destek_talepleri").update({ updated_at: new Date().toISOString(), ...(talep.durum === "kapali" && !yonetici ? { durum: "acik" } : {}) }).eq("id", talep.id);
    setMetin(""); await yukle(); onDegisti();
  };
  const durumDegis = async () => {
    await supabase.from("destek_talepleri").update({ durum: talep.durum === "acik" ? "kapali" : "acik" }).eq("id", talep.id);
    onDegisti();
  };
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{talep.konu}</h2>
          <p className="text-xs text-muted-foreground">{TUR_ETIKET[talep.tur]} · {talep.durum === "acik" ? "Açık" : "Kapalı"} · {tarih(talep.created_at)}</p>
        </div>
        {yonetici && <button onClick={durumDegis} className="rounded-md border border-border px-3 py-1 text-xs">{talep.durum === "acik" ? "Kapat" : "Yeniden aç"}</button>}
      </div>
      <div className="space-y-2">
        {mesajlar.map((m) => {
          const benim = m.yonetici === yonetici;
          return (
            <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${benim ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="text-[11px] opacity-75">{m.yonetici ? "Destek ekibi" : "Öğrenci"} · {tarih(m.created_at)}</p>
              <p className="whitespace-pre-wrap">{m.metin}</p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <textarea value={metin} onChange={(e) => setMetin(e.target.value)} rows={2} maxLength={4000} placeholder="Cevap yaz…" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={gonder} className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Gönder</button>
      </div>
    </div>
  );
}

export function TalepListesi({ liste, secili, sec, ekstra }: { liste: Talep[]; secili: string | null; sec: (id: string) => void; ekstra?: (t: Talep) => string }) {
  if (!liste.length) return <p className="text-sm text-muted-foreground">Henüz talep yok.</p>;
  return (
    <ul className="space-y-1">
      {liste.map((t) => (
        <li key={t.id}>
          <button onClick={() => sec(t.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${secili === t.id ? "border-primary bg-accent" : "border-border hover:bg-accent"}`}>
            <span className="font-medium">{t.konu}</span>
            <span className="block text-xs text-muted-foreground">{TUR_ETIKET[t.tur]} · {t.durum === "acik" ? "Açık" : "Kapalı"} · {tarih(t.updated_at)}{ekstra ? ` · ${ekstra(t)}` : ""}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
