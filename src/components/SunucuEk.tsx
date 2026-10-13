import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { islemGecmisi } from "@/lib/sunucu.functions";
import { ogrenciKatilimGetir, ogrenciKatilimKaydet } from "@/lib/admin.functions";

const btn = "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50";
const ana = `${btn} border-primary bg-primary text-primary-foreground hover:bg-primary/90`;
const giris = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
const hata = (e: unknown) => toast.error(e instanceof Error ? e.message : "Hata");

/** Süper admin: admin işlem geçmişi (en yeni önce, arama + sayfalama). */
export function IslemGecmisi() {
  const getir = useServerFn(islemGecmisi);
  const [ara, setAra] = useState("");
  const [aktif, setAktif] = useState("");
  const [sayfa, setSayfa] = useState(0);
  const boyut = 50;
  const q = useQuery({ queryKey: ["islem-gecmisi", aktif, sayfa], queryFn: () => getir({ data: { ara: aktif, sayfa, boyut } }) });
  const toplam = q.data?.toplam ?? 0;
  const sayfaSay = Math.max(1, Math.ceil(toplam / boyut));
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">İşlem Geçmişi ({toplam})</h2>
        <form className="ml-auto flex gap-1" onSubmit={(e) => { e.preventDefault(); setSayfa(0); setAktif(ara); }}>
          <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="İşlem veya detay ara" className={giris} />
          <button className={btn} type="submit">Ara</button>
          <button className={btn} type="button" onClick={() => void q.refetch()}><RefreshCw className="h-3 w-3" />yenile</button>
        </form>
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor…</p> : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="p-1.5">Zaman</th><th className="p-1.5">Kim</th><th className="p-1.5">İşlem</th><th className="p-1.5">Detay</th></tr></thead>
            <tbody>
              {(q.data?.kayitlar ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/50 align-top">
                  <td className="whitespace-nowrap p-1.5">{new Date(r.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-1.5">{r.ad || r.email || <span className="font-mono">{r.user_id.slice(0, 8)}</span>}{r.ad && r.email ? <span className="block text-muted-foreground">{r.email}</span> : null}</td>
                  <td className="p-1.5 font-medium">{r.islem}</td>
                  <td className="break-all p-1.5 text-muted-foreground">{r.detay || "—"}</td>
                </tr>
              ))}
              {!q.data?.kayitlar.length ? <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Kayıt yok.</td></tr> : null}
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button className={btn} disabled={sayfa === 0} onClick={() => setSayfa((s) => s - 1)}>Önceki</button>
            <span>{sayfa + 1} / {sayfaSay}</span>
            <button className={btn} disabled={sayfa + 1 >= sayfaSay} onClick={() => setSayfa((s) => s + 1)}>Sonraki</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Admin: bir öğrencinin "derse girdim" işaretlerini görme ve kaldırma. */
export function OgrenciDevam({ userId }: { userId: string }) {
  const getir = useServerFn(ogrenciKatilimGetir);
  const kaydet = useServerFn(ogrenciKatilimKaydet);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ogr-katilim", userId], queryFn: () => getir({ data: { userId } }) });
  const [kaldir, setKaldir] = useState<Set<string>>(new Set());
  const [ara, setAra] = useState("");
  const [kayit, setKayit] = useState(false);
  const liste = useMemo(() => {
    const a = ara.toLocaleLowerCase("tr-TR");
    return (q.data?.satirlar ?? []).filter((s) => !a || `${s.ders ?? ""} ${s.tarih ?? ""} ${s.anahtar}`.toLocaleLowerCase("tr-TR").includes(a));
  }, [q.data, ara]);
  const degis = (k: string) => setKaldir((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const uygula = async () => {
    if (!kaldir.size || !confirm(`${kaldir.size} işaret kaldırılsın mı? Öğrencinin diğer ayarları değişmez.`)) return;
    setKayit(true);
    try {
      await kaydet({ data: { userId, kaldir: [...kaldir], ekle: [] } });
      toast.success(`${kaldir.size} işaret kaldırıldı`);
      setKaldir(new Set());
      await qc.invalidateQueries({ queryKey: ["ogr-katilim", userId] });
    } catch (e) { hata(e); } finally { setKayit(false); }
  };
  if (q.isLoading) return <p className="text-xs text-muted-foreground">Devam kayıtları yükleniyor…</p>;
  if (q.error) return <p className="text-xs text-destructive">{(q.error as Error).message}</p>;
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-xs">Devam işaretleri ({q.data?.satirlar.length ?? 0} "girdim")</b>
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ders / tarih ara" className={`${giris} ml-auto text-xs`} />
        <button className={ana} disabled={!kaldir.size || kayit} onClick={() => void uygula()}>{kaldir.size ? `${kaldir.size} işareti kaldır` : "Seç ve kaldır"}</button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {liste.map((s) => (
          <label key={s.anahtar} className={`flex cursor-pointer items-start gap-2 border-b border-border/50 py-1 text-xs ${kaldir.has(s.anahtar) ? "text-muted-foreground line-through" : ""}`}>
            <input type="checkbox" checked={!kaldir.has(s.anahtar)} onChange={() => degis(s.anahtar)} aria-label="Girdi işareti" />
            {s.ders ? <span><b>{s.tarih ?? "?"}</b> {s.saat} · {s.ders}</span> : <span className="font-mono text-muted-foreground">{s.anahtar} (programda bulunamadı)</span>}
          </label>
        ))}
        {!liste.length ? <p className="py-2 text-xs text-muted-foreground">İşaret yok.</p> : null}
      </div>
      <p className="text-[11px] text-muted-foreground">İşareti kaldırılan ders öğrencide "girmedi" sayılır. Değişiklik işlem geçmişine kaydedilir.</p>
    </div>
  );
}
