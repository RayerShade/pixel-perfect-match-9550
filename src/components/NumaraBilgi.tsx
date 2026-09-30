import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NumaraSonuc {
  bulundu: boolean;
  kayitli: boolean;
  ad?: string;
  soyad?: string;
  grup?: string;
  donem?: string;
  dil?: string;
}

/** Numara yazılırken listelerde arar; aynı numara başka hesapta kayıtlıysa bildirir. */
export function useNumaraSorgu(no: string) {
  const [sonuc, setSonuc] = useState<NumaraSonuc | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  useEffect(() => {
    const n = no.trim();
    if (n.replace(/\D/g, "").length < 3) { setSonuc(null); return; }
    setYukleniyor(true);
    let iptal = false;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("ogrenci_sorgula" as never, { _no: n } as never);
      if (!iptal) { setSonuc((data as NumaraSonuc | null) ?? null); setYukleniyor(false); }
    }, 400);
    return () => { iptal = true; clearTimeout(t); };
  }, [no]);
  return { sonuc, yukleniyor };
}

export function NumaraBilgi({ sonuc, yukleniyor }: { sonuc: NumaraSonuc | null; yukleniyor: boolean }) {
  if (yukleniyor) return <p className="text-[11px] text-muted-foreground">Aranıyor…</p>;
  if (!sonuc) return <p className="text-[11px] text-muted-foreground">Numaranı yazınca bilgilerin burada görünür.</p>;
  if (sonuc.kayitli)
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
        Bu numara zaten başka bir hesaba kayıtlı. Numara senin ise giriş yaptıktan sonra Destek'ten bize yaz ya da mevcut hesabınla giriş yap.
      </p>
    );
  if (!sonuc.bulundu)
    return <p className="text-[11px] text-muted-foreground">Bu numara öğrenci listelerinde bulunamadı. Doğru yazdığından emin ol.</p>;
  return (
    <div className="rounded-lg border border-border bg-accent px-3 py-2 text-xs">
      <p className="font-semibold">✓ {sonuc.ad} {sonuc.soyad}</p>
      <p className="text-muted-foreground">
        {[sonuc.donem, sonuc.dil === "en" ? "İngilizce" : sonuc.dil === "tr" ? "Türkçe" : "", sonuc.grup ? `Grup ${sonuc.grup}` : ""].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">Bu sen değilsen numaranı kontrol et. Kayıttan sonra numara değiştirilemez.</p>
    </div>
  );
}
