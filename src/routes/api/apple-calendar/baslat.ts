import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const Route = createFileRoute("/api/apple-calendar/baslat")({ server: { handlers: { POST: async ({ request }) => {
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return Response.json({error:"Oturum gerekli."},{status:401});
  const {data,error}=await supabaseAdmin.auth.getUser(token);if(error||!data.user)return Response.json({error:"Geçersiz oturum."},{status:401});
  const db:any=supabaseAdmin;const {data:old}=await db.from("user_data").select("ayarlar").eq("user_id",data.user.id).maybeSingle();
  const yenile=new URL(request.url).searchParams.get("yenile")==="1";const t=(!yenile&&typeof old?.ayarlar?.takvimAbonelikToken==="string"&&old.ayarlar.takvimAbonelikToken)||crypto.randomUUID().replace(/-/g,"");await db.from("user_data").upsert({user_id:data.user.id,ayarlar:{...(old?.ayarlar??{}),takvimAbonelikToken:t},updated_at:new Date().toISOString()});
  const origin=new URL(request.url).origin;return Response.json({url:`webcal://${new URL(origin).host}/api/takvim.ics?t=${t}`,token:t});
}}}});