import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { googleTakvimEsitle } from "@/lib/google-calendar.server";
export const Route = createFileRoute("/api/google-calendar/esitle")({ server: { handlers: { POST: async ({ request }) => {
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,""); if(!token)return Response.json({error:"Oturum gerekli."},{status:401});
  const {data,error}=await supabaseAdmin.auth.getUser(token);if(error||!data.user)return Response.json({error:"Geçersiz oturum."},{status:401});
  try{return Response.json({adet:await googleTakvimEsitle(data.user.id)})}catch(e){return Response.json({error:e instanceof Error?e.message:"Eşitleme başarısız."},{status:400})}
}}}});