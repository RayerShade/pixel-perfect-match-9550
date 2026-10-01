import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sheetsSimdiKontrol } from "@/lib/sheets-takip.functions";

const TUR: Record<string, string> = { yillik: "Yıllık program", uygulama: "Uygulama tablosu", ogrenci: "Öğrenci listesi", amfi: "Haftalık amfi", secmeli: "Genel seçmeli" };
const zaman = (t: string | null) => (t ? new Date(t).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—");

/** Otomatik takip edilen Google Sheets bağlantıları (admin). */
export function SheetsTakip({ anahtarlar }: { anahtarlar?: string[] }) {
  const qc = useQueryClient();
  const kontrol = useServerFn(sheetsSimdiKontrol);
  const [bekle, setBekle] = useState<string | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["sheets-kaynaklari", anahtarlar],
    queryFn: async () => {
      let q = supabase.from("sheets_kaynaklari").select("*").order("created_at");
      if (anahtarlar) q = q.in("anahtar", anahtarlar);
      return (await q).data ?? [];
    },
  });
  const yenile = () => qc.invalidateQueries({ queryKey: ["sheets-kaynaklari"] });
  if (!data.length) return null;
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-bold">Otomatik takip edilen Google Sheets tabloları</p>
      <p className="text-[11px] text-muted-foreground">Tablolar düzenli aralıklarla kontrol edilir; değişen dersler siteye yansır ve ilgili öğrencilere bildirim gider.</p>
      <ul className="mt-2 space-y-1.5">
        {data.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-accent/50 px-2.5 py-1.5 text-xs">
            <span className="font-semibold">{TUR[k.tur] ?? k.tur}</span>
            <span className="text-muted-foreground">son kontrol {zaman(k.son_kontrol)} · son değişiklik {zaman(k.son_degisim)}</span>
            {k.hata ? <span className="text-destructive">Hata: {k.hata}</span> : null}
            <span className="ml-auto flex items-center gap-1.5">
              <select
                aria-label="Kontrol aralığı"
                value={k.aralik_dk}
                onChange={async (e) => {
                  await supabase.from("sheets_kaynaklari").update({ aralik_dk: Number(e.target.value) }).eq("id", k.id);
                  void yenile();
                }}
                className="rounded-md border border-border bg-background px-1 py-0.5"
              >
                {[5, 10, 15, 30, 60, 120, 360, 720, 1440].map((m) => (
                  <option key={m} value={m}>{m < 60 ? `${m} dk` : `${m / 60} saat`}</option>
                ))}
              </select>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={k.aktif}
                  onChange={async (e) => {
                    await supabase.from("sheets_kaynaklari").update({ aktif: e.target.checked, hata: null }).eq("id", k.id);
                    void yenile();
                  }}
                />
                takip
              </label>
              <button
                disabled={bekle === k.id}
                onClick={async () => {
                  setBekle(k.id);
                  try {
                    const [s] = await kontrol({ data: { id: k.id } });
                    if (s?.hata) toast.error(s.hata);
                    else toast.success(s?.degisti ? `Güncellendi · ${s.bildirim} öğrenciye bildirim gitti.` : "Değişiklik yok.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Kontrol edilemedi.");
                  } finally {
                    setBekle(null);
                    void yenile();
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-semibold hover:bg-accent"
              >
                <RefreshCw className={`h-3 w-3 ${bekle === k.id ? "animate-spin" : ""}`} /> Şimdi kontrol et
              </button>
              <button
                aria-label="Takipten çıkar"
                onClick={async () => {
                  await supabase.from("sheets_kaynaklari").delete().eq("id", k.id);
                  void yenile();
                }}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
