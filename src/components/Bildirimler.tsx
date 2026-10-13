import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, LifeBuoy, Megaphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Bildirim = { id: string; baslik: string; metin: string; tur: string; link: string | null; okundu: boolean; created_at: string };

function zaman(s: string) {
  const dk = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk} dk önce`;
  if (dk < 1440) return `${Math.round(dk / 60)} sa önce`;
  return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/** Sağ üstteki zil: tıklayınca açılır bildirim paneli, okunmamış varsa kırmızı rozet. */
export function BildirimZili() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [acik, setAcik] = useState(false);
  const [seciliBildirim, setSeciliBildirim] = useState<Bildirim | null>(null);
  const kutu = useRef<HTMLDivElement>(null);
  const key = ["bildirimler", user?.id];
  const { data: liste = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () =>
      ((await supabase.from("bildirimler").select("*").order("created_at", { ascending: false }).limit(50)).data ?? []) as Bildirim[],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`bildirim-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bildirimler", filter: `user_id=eq.${user.id}` }, () =>
        void qc.invalidateQueries({ queryKey: ["bildirimler", user.id] }),
      )
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [user, qc]);

  useEffect(() => {
    if (!acik) return;
    const f = (e: MouseEvent) => { if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [acik]);

  const okunmamis = liste.filter((b) => !b.okundu).length;
  const yenile = () => void qc.invalidateQueries({ queryKey: key });
  const tumunuOku = async () => {
    if (!user) return;
    await supabase.from("bildirimler").update({ okundu: true }).eq("user_id", user.id).eq("okundu", false);
    yenile();
  };
  const bildirimiAc = async (b: Bildirim) => {
    if (!b.okundu) { await supabase.from("bildirimler").update({ okundu: true }).eq("id", b.id); yenile(); }
    setSeciliBildirim(b);
  };
  const sil = async (id: string) => { await supabase.from("bildirimler").delete().eq("id", id); yenile(); };

  if (!user) return null;
  return (
    <div ref={kutu} className="relative">
      <button
        onClick={() => setAcik((a) => !a)}
        aria-label="Bildirimler"
        title="Bildirimler"
        className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {okunmamis > 0 ? (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {okunmamis > 9 ? "9+" : okunmamis}
          </span>
        ) : null}
      </button>
      {acik ? (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-bold">Bildirimler</span>
            {okunmamis > 0 ? (
              <button onClick={() => void tumunuOku()} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Tümünü okundu yap
              </button>
            ) : null}
          </div>
          <div className="max-h-[calc(70vh-44px)] overflow-y-auto">
            {liste.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz bildirimin yok.</p>
            ) : (
              liste.map((b) => {
                const Ikon = b.tur === "destek" ? LifeBuoy : Megaphone;
                return (
                  <div key={b.id} className={`group flex gap-3 border-b border-border/60 px-4 py-3 last:border-0 ${b.okundu ? "" : "bg-accent/60"}`}>
                    <Ikon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <button onClick={() => void bildirimiAc(b)} className="min-w-0 flex-1 text-left">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {!b.okundu ? <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" /> : null}
                        <span className="truncate">{b.baslik}</span>
                      </p>
                      {b.metin ? <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{b.metin}</p> : null}
                      <p className="mt-1 text-[10px] text-muted-foreground">{zaman(b.created_at)}</p>
                    </button>
                    <button onClick={() => void sil(b.id)} aria-label="Sil" className="self-start rounded p-1 text-muted-foreground opacity-60 hover:bg-accent hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
      {seciliBildirim ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-foreground/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bildirim-baslik"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSeciliBildirim(null); }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p id="bildirim-baslik" className="text-base font-bold">{seciliBildirim.baslik}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(seciliBildirim.created_at).toLocaleString("tr-TR")}</p>
              </div>
              <button onClick={() => setSeciliBildirim(null)} className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                Kapat
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{seciliBildirim.metin || "Bu bildirim için ek açıklama yok."}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              {seciliBildirim.link ? (
                <button
                  onClick={() => { setSeciliBildirim(null); setAcik(false); void nav({ to: seciliBildirim.link! }); }}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  İlgili sayfaya git
                </button>
              ) : null}
              <button onClick={() => setSeciliBildirim(null)} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent">
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
