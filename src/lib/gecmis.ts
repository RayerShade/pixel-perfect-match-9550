import { supabase } from "@/integrations/supabase/client";

/** Admin işlem geçmişine kayıt düşer (hata olursa işlemi engellemez). */
export async function gecmisYaz(islem: string, detay = "") {
  try {
    await supabase.from("admin_gecmis").insert({ islem: islem.slice(0, 200), detay: detay.slice(0, 2000) });
  } catch (e) {
    console.error("Geçmiş yazılamadı", e);
  }
}
