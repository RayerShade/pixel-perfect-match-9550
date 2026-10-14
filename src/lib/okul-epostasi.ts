import { supabase } from "@/integrations/supabase/client";

// Kurum e-postası zorunluluğu: kontrol kodu hep durur, açılıp kapanması tek anahtara bağlıdır
// (panel_ayar.okul_epostasi_zorunlu). Anahtar /sunucu panelinden çevrilir.
export const OKUL_EPOSTASI_UZANTISI = "@ogr.iu.edu.tr";

export function okulEpostasiMi(email: string) {
  return email.trim().toLowerCase().endsWith(OKUL_EPOSTASI_UZANTISI);
}

// Anahtarı sunucudan okur. Anonim çağırılabilir (yalnızca true/false döner).
// Ulaşılamazsa false döner: asıl kapı sunucudaki hesap_hazirla(), burası yalnız erken uyarı.
export async function okulEpostasiZorunluMu(): Promise<boolean> {
  const { data, error } = await supabase.rpc("okul_epostasi_zorunlu_mu");
  return !error && data === true;
}
