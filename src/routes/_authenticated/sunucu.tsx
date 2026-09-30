import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TABLOLAR, dosyaIslem, dosyaListele, kullaniciIslem, satirKaydet, satirSil, sunucuKullanicilar, tabloOku } from "@/lib/sunucu.functions";

export const Route = createFileRoute("/_authenticated/sunucu")({
  beforeLoad: async () => {
    const { data } = await supabase.rpc("orijinal_admin_mi");
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sunucu" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Sunucu,
});

type Sekme = "kullanicilar" | keyof typeof TABLOLAR | "dosyalar";
const btn = "rounded border border-border px-2 py-0.5 text-xs hover:bg-accent";

function Sunucu() {
  const [sekme, setSekme] = useState<Sekme>("kullanicilar");
  return (
    <div className="min-h-screen bg-background p-3 font-mono text-xs text-foreground">
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <b className="mr-2 text-sm">Sunucu paneli</b>
        {(["kullanicilar", "profiles", "user_data", "user_roles", "global_data", "dosyalar"] as Sekme[]).map((s) => (
          <button key={s} onClick={() => setSekme(s)} className={`${btn} ${sekme === s ? "bg-primary text-primary-foreground" : ""}`}>{s}</button>
        ))}
        <a href="/" className={`${btn} ml-auto`}>Siteye dön</a>
      </div>
      {sekme === "kullanicilar" ? <Kullanicilar /> : sekme === "dosyalar" ? <Dosyalar /> : <Tablo key={sekme} tablo={sekme} />}
    </div>
  );
}

function Kullanicilar() {
  const getir = useServerFn(sunucuKullanicilar);
  const islem = useServerFn(kullaniciIslem);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sunucu-kul"], queryFn: () => getir() });
  const [ara, setAra] = useState("");
  const yap = async (userId: string, i: "onayla" | "yasakla" | "yasakKaldir" | "cikisYaptir") => {
    if (!confirm(`${i}?`)) return;
    try { await islem({ data: { userId, islem: i } }); toast.success("Tamam"); void qc.invalidateQueries({ queryKey: ["sunucu-kul"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };
  const liste = (q.data ?? []).filter((u) => (u.email + u.id).toLowerCase().includes(ara.toLowerCase()));
  return (
    <div>
      <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="ara" className="mb-2 w-64 rounded border border-border bg-background px-2 py-1" />
      <span className="ml-2 text-muted-foreground">{q.isLoading ? "yükleniyor…" : `${liste.length} kullanıcı`}</span>
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-muted-foreground">{["email", "id", "yöntem", "oluşturma", "son giriş", "durum", ""].map((h) => <th key={h} className="border-b border-border p-1">{h}</th>)}</tr></thead>
          <tbody>
            {liste.map((u) => (
              <tr key={u.id} className="border-b border-border/50 align-top">
                <td className="p-1">{u.email}</td>
                <td className="p-1 text-muted-foreground">{u.id}</td>
                <td className="p-1">{u.yontem}</td>
                <td className="p-1">{u.olusturma?.slice(0, 16).replace("T", " ")}</td>
                <td className="p-1">{u.sonGiris?.slice(0, 16).replace("T", " ") ?? "-"}</td>
                <td className="p-1">{u.yasakli ? <span className="text-destructive">yasaklı</span> : u.onayli ? "onaylı" : "onaysız"}</td>
                <td className="space-x-1 whitespace-nowrap p-1">
                  {!u.onayli ? <button className={btn} onClick={() => void yap(u.id, "onayla")}>onayla</button> : null}
                  {u.yasakli ? <button className={btn} onClick={() => void yap(u.id, "yasakKaldir")}>yasağı kaldır</button> : <button className={btn} onClick={() => void yap(u.id, "yasakla")}>yasakla</button>}
                  <button className={btn} onClick={() => void yap(u.id, "cikisYaptir")}>oturumları kapat</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tablo({ tablo }: { tablo: keyof typeof TABLOLAR }) {
  const oku = useServerFn(tabloOku);
  const kaydet = useServerFn(satirKaydet);
  const sil = useServerFn(satirSil);
  const q = useQuery({ queryKey: ["sunucu-tablo", tablo], queryFn: async () => JSON.parse(await oku({ data: { tablo } })) as Record<string, unknown>[] });
  const pk = TABLOLAR[tablo];
  const [ara, setAra] = useState("");
  const [duzenle, setDuzenle] = useState<{ metin: string; yeni: boolean } | null>(null);
  const liste = useMemo(() => (q.data ?? []).filter((r) => !ara || JSON.stringify(r).toLowerCase().includes(ara.toLowerCase())), [q.data, ara]);
  const kolonlar = q.data?.[0] ? Object.keys(q.data[0]) : [];
  const ozet = (v: unknown) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s && s.length > 60 ? `${s.slice(0, 60)}… (${s.length})` : s; };

  const kaydetYap = async () => {
    if (!duzenle) return;
    let satir: Record<string, unknown>;
    try { satir = JSON.parse(duzenle.metin); } catch { toast.error("Geçersiz JSON"); return; }
    try { await kaydet({ data: { tablo, satir } }); toast.success("Kaydedildi"); setDuzenle(null); void q.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };
  const silYap = async (r: Record<string, unknown>) => {
    if (!confirm(`${tablo} / ${String(r[pk])} silinsin mi? Geri alınamaz.`)) return;
    try { await sil({ data: { tablo, anahtar: String(r[pk]) } }); toast.success("Silindi"); void q.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="ara (tüm alanlarda)" className="w-64 rounded border border-border bg-background px-2 py-1" />
        <button className={btn} onClick={() => void q.refetch()}>yenile</button>
        <button className={btn} onClick={() => setDuzenle({ metin: JSON.stringify(Object.fromEntries(kolonlar.map((k) => [k, null])), null, 2), yeni: true })}>+ yeni satır</button>
        <span className="text-muted-foreground">{q.isLoading ? "yükleniyor…" : `${liste.length} satır · anahtar: ${pk}`}</span>
      </div>
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      {duzenle ? (
        <div className="mb-3 rounded border border-border bg-surface p-2">
          <p className="mb-1 text-muted-foreground">JSON olarak düzenle (upsert, anahtar: {pk})</p>
          <textarea value={duzenle.metin} onChange={(e) => setDuzenle({ ...duzenle, metin: e.target.value })} spellCheck={false} className="h-96 w-full rounded border border-border bg-background p-2" />
          <div className="mt-1 space-x-1">
            <button className={`${btn} bg-primary text-primary-foreground`} onClick={() => void kaydetYap()}>kaydet</button>
            <button className={btn} onClick={() => setDuzenle(null)}>vazgeç</button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-muted-foreground">{[...kolonlar, ""].map((h) => <th key={h} className="border-b border-border p-1">{h}</th>)}</tr></thead>
          <tbody>
            {liste.map((r) => (
              <tr key={String(r[pk])} className="border-b border-border/50 align-top">
                {kolonlar.map((k) => <td key={k} className="max-w-xs break-all p-1">{ozet(r[k])}</td>)}
                <td className="space-x-1 whitespace-nowrap p-1">
                  <button className={btn} onClick={() => setDuzenle({ metin: JSON.stringify(r, null, 2), yeni: false })}>düzenle</button>
                  <button className={`${btn} text-destructive`} onClick={() => void silYap(r)}>sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dosyalar() {
  const listele = useServerFn(dosyaListele);
  const islem = useServerFn(dosyaIslem);
  const q = useQuery({ queryKey: ["sunucu-dosya"], queryFn: () => listele() });
  const yap = async (yol: string, i: "indir" | "sil") => {
    if (i === "sil" && !confirm(`${yol} silinsin mi?`)) return;
    try {
      const r = await islem({ data: { yol, islem: i } });
      if (r.url) window.location.href = r.url; else { toast.success("Silindi"); void q.refetch(); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };
  const toplam = (q.data ?? []).reduce((a, f) => a + f.boyut, 0);
  return (
    <div>
      <p className="mb-2 text-muted-foreground">{q.isLoading ? "yükleniyor…" : `${q.data?.length ?? 0} dosya · ${(toplam / 1024 / 1024).toFixed(2)} MB`}</p>
      {q.error ? <p className="text-destructive">{String(q.error)}</p> : null}
      <table className="w-full border-collapse">
        <tbody>
          {(q.data ?? []).map((f) => (
            <tr key={f.yol} className="border-b border-border/50">
              <td className="break-all p-1">{f.yol}</td>
              <td className="p-1">{(f.boyut / 1024).toFixed(1)} KB</td>
              <td className="p-1">{f.tarih?.slice(0, 16).replace("T", " ")}</td>
              <td className="space-x-1 whitespace-nowrap p-1">
                <button className={btn} onClick={() => void yap(f.yol, "indir")}>indir</button>
                <button className={`${btn} text-destructive`} onClick={() => void yap(f.yol, "sil")}>sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
