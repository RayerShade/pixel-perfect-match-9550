import { useEffect, useRef, useState } from "react";
import { DonemSecici } from "@/components/DonemSecici";
import type { Dil } from "@/lib/program";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { dosyaBulutaKaydet, dosyaBuluttanSil, dosyaGuvenli, dosyaIndir, type KisiselTur } from "@/lib/dosya-bulut";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { yillikProgramOku } from "@/lib/excel-import";
import { ogrenciListesiOku, uygulamaTablosuOku } from "@/lib/uygulama-import";
import { ogrenciBul } from "@/lib/schedule-data";
import { useServerFn } from "@tanstack/react-start";
import { hesapGuncelle } from "@/lib/admin.functions";

interface Secenek {
  id: string;
  ad: string;
  grup?: number | undefined;
}

/** Admin: başka bir hesabın seçmelilerini ve kişisel dosyalarını düzenler. */
export function HesapDuzenle({
  userId,
  secili,
  dosyalar,
  secenekler,
  onKaydedildi,
}: {
  userId: string;
  secili: string[];
  dosyalar: Partial<Record<KisiselTur, string | undefined>>;
  secenekler: Secenek[];
  onKaydedildi: () => void;
}) {
  const [secim, setSecim] = useState<string[]>(secili);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const guncelle = useServerFn(hesapGuncelle);
  const [yeniEmail, setYeniEmail] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const hesapKaydet = async (alan: "email" | "sifre") => {
    const deger = alan === "email" ? yeniEmail.trim() : yeniSifre;
    if (!deger) return;
    if (!confirm(alan === "email" ? `E-posta "${deger}" olarak değiştirilsin mi?` : "Şifre değiştirilsin mi?")) return;
    try {
      await guncelle({ data: { userId, [alan]: deger } });
      toast.success(alan === "email" ? "E-posta değiştirildi." : "Şifre değiştirildi.");
      alan === "email" ? setYeniEmail("") : setYeniSifre("");
      onKaydedildi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Değiştirilemedi.");
    }
  };
  const gruplar = [1, 2, 3].map((g) => ({ g, liste: secenekler.filter((s) => s.grup === g) })).filter((x) => x.liste.length);
  const grupsuz = secenekler.filter((s) => !s.grup);

  const grupSec = (g: number, id: string) => {
    const grubun = new Set(secenekler.filter((s) => s.grup === g).map((s) => s.id));
    setSecim((p) => [...p.filter((x) => !grubun.has(x)), ...(id ? [id] : [])]);
  };

  const secmeliKaydet = async () => {
    setKaydediliyor(true);
    const { error } = await supabase.from("user_data").update({ secmeliler: secim, updated_at: new Date().toISOString() }).eq("user_id", userId);
    setKaydediliyor(false);
    if (error) { toast.error("Seçmeliler kaydedilemedi."); return; }
    toast.success("Seçmeliler güncellendi.");
    onKaydedildi();
  };

  const dosyaYukle = async (tur: "yillik" | "uygulama" | "ogrenci", f: File) => {
    try {
      await dosyaGuvenli(f);
      let patch: Record<string, unknown>;
      let mesaj: string;
      if (tur === "yillik") {
        const dersler = await yillikProgramOku(f);
        if (!dersler.length) throw new Error("Ders bulunamadı.");
        patch = { dersler, yillikDosya: f.name };
        mesaj = `${dersler.length} ders yüklendi.`;
      } else if (tur === "uygulama") {
        const uygulamalar = await uygulamaTablosuOku(f);
        if (!uygulamalar.length) throw new Error("Uygulama bulunamadı.");
        patch = { uygulamalar, uygulamaDosya: f.name };
        mesaj = `${uygulamalar.length} uygulama yüklendi.`;
      } else {
        const ogrenciler = await ogrenciListesiOku(f);
        const n = Object.keys(ogrenciler).length;
        if (!n) throw new Error("Öğrenci bulunamadı.");
        patch = { ogrenciler, ogrenciDosya: f.name };
        mesaj = `${n} öğrenci yüklendi.`;
      }
      const { data, error: e1 } = await supabase.from("user_data").select("veri, ayarlar").eq("user_id", userId).maybeSingle();
      if (e1) throw e1;
      const veri = { ...((data?.veri as Record<string, unknown>) ?? {}), ...patch } as Json;
      // Öğrenci listesi yüklenince numaradan grubu/adı hemen ayarlara yaz.
      let ayarlar = (data?.ayarlar as Record<string, unknown>) ?? {};
      if (tur === "ogrenci") {
        const { data: prof } = await supabase.from("profiles").select("ogrenci_no").eq("id", userId).maybeSingle();
        const no = String(ayarlar["ogrenciNo"] || prof?.ogrenci_no || "");
        const o = ogrenciBul(veri as never, no);
        if (o) {
          ayarlar = { ...ayarlar, ogrenciNo: no, grup: [o.grup, o.altGrup].filter(Boolean).join(" / "), ogrenciAdi: `${o.ad} ${o.soyad}`.trim() };
          mesaj += ` Grup: ${ayarlar["grup"]}.`;
        } else if (no) {
          ayarlar = { ...ayarlar, grup: "" };
          mesaj += ` ${no} numarası bu listede yok, grubu elle atayabilirsin.`;
        }
      }
      const { error } = data
        ? await supabase.from("user_data").update({ veri, ayarlar: ayarlar as Json, updated_at: new Date().toISOString() }).eq("user_id", userId)
        : await supabase.from("user_data").insert({ user_id: userId, veri, ayarlar: ayarlar as Json });
      if (error) throw error;
      await dosyaBulutaKaydet(userId, tur, f);
      toast.success(mesaj);
      onKaydedildi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dosya yüklenemedi.");
    }
  };

  const dosyaSil = async (tur: KisiselTur, etiket: string) => {
    if (!confirm(`${etiket} bu hesaptan silinsin mi?`)) return;
    const alan = { yillik: ["dersler", "yillikDosya"], uygulama: ["uygulamalar", "uygulamaDosya"], ogrenci: ["ogrenciler", "ogrenciDosya"] }[tur];
    const { data } = await supabase.from("user_data").select("veri").eq("user_id", userId).maybeSingle();
    const veri = { ...((data?.veri as Record<string, unknown>) ?? {}) };
    for (const k of alan) delete veri[k];
    const { error } = await supabase.from("user_data").update({ veri: veri as Json, updated_at: new Date().toISOString() }).eq("user_id", userId);
    if (error) { toast.error("Silinemedi."); return; }
    await dosyaBuluttanSil(userId, tur);
    toast.success(`${etiket} silindi.`);
    onKaydedildi();
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <p className="font-semibold">Giriş bilgileri</p>
      <div className="flex gap-2">
        <input type="email" placeholder="Yeni e-posta" value={yeniEmail} onChange={(e) => setYeniEmail(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5" />
        <button onClick={() => void hesapKaydet("email")} className="rounded-lg border border-border px-3 py-1.5 font-semibold hover:bg-accent">E-postayı değiştir</button>
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Yeni şifre (en az 6 karakter)" minLength={6} value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5" />
        <button onClick={() => void hesapKaydet("sifre")} disabled={yeniSifre.length > 0 && yeniSifre.length < 6} className="rounded-lg border border-border px-3 py-1.5 font-semibold hover:bg-accent disabled:opacity-60">Şifreyi değiştir</button>
      </div>
      <p className="pt-2 font-semibold">Seçmelilerini düzenle</p>
      {secenekler.length === 0 ? <p className="text-muted-foreground">Seçmeli listesi yüklenmemiş.</p> : null}
      {gruplar.map(({ g, liste }) => (
        <label key={g} className="block">
          <span className="text-muted-foreground">{g}. grup</span>
          <select
            value={liste.find((s) => secim.includes(s.id))?.id ?? ""}
            onChange={(e) => grupSec(g, e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5"
          >
            <option value="">Seçim yok</option>
            {liste.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
              </option>
            ))}
          </select>
        </label>
      ))}
      {grupsuz.map((s) => (
        <label key={s.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={secim.includes(s.id)}
            onChange={(e) => setSecim((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))}
          />
          {s.ad}
        </label>
      ))}
      {secenekler.length ? (
        <button
          onClick={() => void secmeliKaydet()}
          disabled={kaydediliyor}
          className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {kaydediliyor ? "Kaydediliyor…" : "Seçmelileri kaydet"}
        </button>
      ) : null}

      <p className="pt-2 font-semibold">Dönem ve dil</p>
      <HesapDonemi userId={userId} onKaydedildi={onKaydedildi} />
    </div>
  );
}

function HesapDonemi({ userId, onKaydedildi }: { userId: string; onKaydedildi: () => void }) {
  const [d, setD] = useState<{ donemId: string; dil: Dil | "" } | null>(null);
  useEffect(() => {
    void supabase.from("user_data").select("ayarlar").eq("user_id", userId).maybeSingle().then(({ data }) => {
      const a = (data?.ayarlar ?? {}) as Record<string, unknown>;
      setD({ donemId: String(a["donemId"] ?? ""), dil: (a["dil"] as Dil) ?? "" });
    });
  }, [userId]);
  if (!d) return <p className="text-muted-foreground">Yükleniyor…</p>;
  return (
    <div className="space-y-2">
      <DonemSecici donemId={d.donemId} dil={d.dil} onDegis={(donemId, dil) => setD({ donemId, dil })} />
      <button
        disabled={!d.donemId || !d.dil}
        onClick={async () => {
          const { data } = await supabase.from("user_data").select("ayarlar").eq("user_id", userId).maybeSingle();
          const ayarlar = { ...((data?.ayarlar ?? {}) as Record<string, unknown>), donemId: d.donemId, dil: d.dil };
          const { error } = await supabase.from("user_data").upsert({ user_id: userId, ayarlar: ayarlar as Json });
          if (error) toast.error(error.message);
          else {
            toast.success("Dönem kaydedildi.");
            onKaydedildi();
          }
        }}
        className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-50"
      >
        Dönemi kaydet
      </button>
    </div>
  );
}

function DosyaDugmesi({ etiket, onDosya }: { etiket: string; onDosya: (f: File) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [yuk, setYuk] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setYuk(true);
          await onDosya(f);
          setYuk(false);
          if (ref.current) ref.current.value = "";
        }}
      />
      <button
        onClick={() => ref.current?.click()}
        disabled={yuk}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-semibold hover:bg-accent disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" /> {yuk ? "Yükleniyor…" : etiket}
      </button>
    </>
  );
}
