import { useState } from "react";
import { Sheet } from "lucide-react";
import { toast } from "sonner";
import { sheetsIndir } from "@/lib/sheets.functions";
import { supabase } from "@/integrations/supabase/client";

export type SheetsTur = "yillik" | "uygulama" | "ogrenci" | "amfi" | "secmeli";

/** Google Sheets bağlantısından dosya alır ve File olarak verir. kaynak verilirse bağlantı otomatik takibe alınır. */
export function SheetsTusu({
  onDosya,
  className = "",
  kaynak,
}: {
  onDosya: (f: File) => Promise<unknown>;
  className?: string;
  kaynak?: { anahtar: string; tur: SheetsTur } | undefined;
}) {
  const [bekle, setBekle] = useState(false);
  const al = async () => {
    const url = window.prompt("Google Sheets bağlantısını yapıştır (bağlantıya sahip herkes görüntüleyebilmeli):");
    if (!url?.trim()) return;
    setBekle(true);
    try {
      const { b64, hata } = await sheetsIndir({ data: { url: url.trim() } });
      if (!b64) {
        toast.error(hata ?? "Sheets dosyası alınamadı.");
        return;
      }
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      await onDosya(new File([arr], "google-sheets.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      if (kaynak) {
        await supabase.from("sheets_kaynaklari").delete().eq("anahtar", kaynak.anahtar).eq("tur", kaynak.tur);
        const { error } = await supabase.from("sheets_kaynaklari").insert({ ...kaynak, url: url.trim() });
        if (!error) toast.success("Bağlantı otomatik takibe alındı; tablodaki değişiklikler siteye kendiliğinden yansıyacak.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sheets dosyası alınamadı.");
    } finally {
      setBekle(false);
    }
  };
  return (
    <button
      type="button"
      onClick={al}
      disabled={bekle}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-60 ${className}`}
    >
      <Sheet className="h-3.5 w-3.5" /> {bekle ? "Alınıyor…" : "Google Sheets"}
    </button>
  );
}
