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
  useEffect(() => setKapali(localStorage.getItem("ders-takvim:duyuru-kapali")), []);
  const d = q.data;
  if (!d?.aktif || !d.metin || kapali === d.metin) return null;
  if (!hedefeUyar(d.hedef, user?.id, ayarlar.donemId, ayarlar.dil)) return null;
  return (
    <div className={`border-b px-4 py-2 text-sm ${d.tur === "uyari" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10"}`}>
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1 whitespace-pre-line">{d.metin}</p>
        <button aria-label="Kapat" onClick={() => { localStorage.setItem("ders-takvim:duyuru-kapali", d.metin); setKapali(d.metin); }}><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
