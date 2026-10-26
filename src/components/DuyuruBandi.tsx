import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAyarlar } from "@/lib/store";
import { hedefeUyar, type Hedef } from "@/lib/hedef";

type D = { metin: string; tur: "bilgi" | "uyari"; aktif: boolean; hedef?: Hedef };

/** Sunucu panelinden yayınlanan duyuru bandı (hedef kitleye göre). */
export function DuyuruBandi() {
  const { user } = useAuth();
  const { ayarlar } = useAyarlar();
  const q = useQuery({
    queryKey: ["duyuru"],
    queryFn: async () => ((await supabase.from("global_data").select("veri").eq("anahtar", "duyuru").maybeSingle()).data?.veri ?? null) as D | null,
    staleTime: 5 * 60_000,
  });
  const [kapali, setKapali] = useState<string | null>(null);
  const [ayrinti, setAyrinti] = useState(false);
  useEffect(() => setKapali(localStorage.getItem("ders-takvim:duyuru-kapali")), []);
  const d = q.data;
  if (!d?.aktif || !d.metin || kapali === d.metin) return null;
  if (!hedefeUyar(d.hedef, user?.id, ayarlar.donemId, ayarlar.dil)) return null;
  const uzun = d.metin.length > 180 || d.metin.split("\n").length > 2;
  return (
    <>
      <div className={`border-b px-4 py-2 text-sm ${d.tur === "uyari" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10"}`}>
        <div className="mx-auto flex max-w-6xl items-start gap-2">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`whitespace-pre-line ${uzun ? "line-clamp-2" : ""}`}>{d.metin}</p>
            {uzun ? <button onClick={() => setAyrinti(true)} className="mt-1 text-xs font-bold underline underline-offset-2">Tüm duyuruyu oku</button> : null}
          </div>
          <button className="rounded-lg p-1 hover:bg-black/5" aria-label="Kapat" onClick={() => { localStorage.setItem("ders-takvim:duyuru-kapali", d.metin); setKapali(d.metin); }}><X className="h-4 w-4" /></button>
        </div>
      </div>
      {ayrinti ? <div role="dialog" aria-modal="true" aria-label="Duyuru ayrıntısı" onClick={() => setAyrinti(false)} className="fixed inset-0 z-50 grid place-items-center bg-foreground/45 p-4">
        <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/80 bg-surface p-5 shadow-2xl">
          <div className="flex items-start gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${d.tur === "uyari" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><Megaphone className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Duyuru</p><h2 className="mt-1 text-base font-bold">Güncel bilgilendirme</h2></div><button onClick={() => setAyrinti(false)} className="rounded-xl p-2 hover:bg-accent" aria-label="Kapat"><X className="h-5 w-5" /></button></div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-foreground">{d.metin}</p>
          <div className="mt-5 flex justify-end"><button onClick={() => setAyrinti(false)} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Tamam</button></div>
        </div>
      </div> : null}
    </>
  );
}
