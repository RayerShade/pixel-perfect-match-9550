import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { haftaninOlaylari, onlineFiltrele, ogrenciBul } from "@/lib/schedule-data";
import { startOfWeek } from "@/lib/date-utils";

type Json = Record<string, any>;
const addDays=(d:string,n:number)=>{const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const day=(d:string)=>{const n=new Date(d+"T12:00:00Z").getUTCDay();return n||7};
const groupMatch=(groups:string[]=[],group="",sub="")=>{const clean=(v:string)=>v.replace(/\s/g,"").toUpperCase();const g=clean(group),s=clean(sub),f=s&&!s.startsWith(g)?g+s:s||g;return groups.some(x=>{const v=clean(String(x));return v===g||v===s||v===f||(v.length===1&&g.startsWith(v))})};
const event=(summary:string,date:string,start:string,end:string,location="",description="")=>({summary,start:{dateTime:`${date}T${start}:00`,timeZone:"Europe/Istanbul"},end:{dateTime:`${date}T${end}:00`,timeZone:"Europe/Istanbul"},location,description,extendedProperties:{private:{source:"itf-takvim"}}});

async function accessToken(conn:Json){
  const id=process.env["GOOGLE_CALENDAR_CLIENT_ID"],secret=process.env["GOOGLE_CALENDAR_CLIENT_SECRET"];
  if(!id||!secret) throw new Error("Google Calendar ayarları eksik.");
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:conn.refresh_token,grant_type:"refresh_token"})});
  const data=await res.json() as {access_token?:string};if(!res.ok||!data.access_token) throw new Error("Google Calendar yetkisi yenilenemedi.");return data.access_token;
}
export async function googleTakvimEsitle(userId:string){
  const db:any=supabaseAdmin;
  const {data:conn}=await db.from("google_calendar_connections").select("*").eq("user_id",userId).maybeSingle();
  if(!conn) throw new Error("Google Calendar bağlı değil.");
  const token=await accessToken(conn);
  const {data:personal}=await db.from("user_data").select("ayarlar,secmeliler,manuel_amfi").eq("user_id",userId).maybeSingle();
  const ayar=(personal?.ayarlar??{}) as Json;const key=ayar.donemId&&ayar.dil?`program:${ayar.donemId}:${ayar.dil}`:"";
  const {data:program}=key?await db.from("global_data").select("veri").eq("anahtar",key).maybeSingle():{data:null};
  const v=(program?.veri??{}) as Json;
  const secmeliler=(personal?.secmeliler??[]) as string[];
  const gizli=(ayar["__gizli"]??ayar.gizliSecmeliGruplari??[]) as string[];
  const manuel=(personal?.manuel_amfi??{}) as Record<string,string>;
  const ogrenci=ogrenciBul(v, String(ayar.ogrenciNo??""), ayar.grupElle);
  const today=new Date(); const es:any[]=[]; const seen=new Set<string>();
  for(let n=0;n<182;n+=7){
    const week=startOfWeek(new Date(today.getFullYear(),today.getMonth(),today.getDate()+n));
    const olaylar=onlineFiltrele(haftaninOlaylari(week,secmeliler,manuel,v,ogrenci,gizli,ayar.telafiGoster??true),ayar.onlineGorunum??"goster",ayar.onlineDersAyarlari??{});
    for(const o of olaylar){const date=o.date.toISOString().slice(0,10);const k=o.key||date+o.ders.startTime+o.ders.courseName;if(seen.has(k))continue;seen.add(k);es.push(event(o.ders.courseName,date,o.ders.startTime,o.ders.endTime,o.amfi??o.ders.defaultClassroom,o.ders.instructor));}
  }
  for(const o of ayar.ozelDersler??[])if(o.tarih>=today.toISOString().slice(0,10))es.push(event(o.ad,o.tarih,o.startTime,o.endTime,o.yer,o.not));
  const base="https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(conn.calendar_id)+"/events";
  let page="";do{const r=await fetch(base+"?privateExtendedProperty=source%3Ditf-takvim&maxResults=250"+(page?"&pageToken="+encodeURIComponent(page):""),{headers:{authorization:"Bearer "+token}});const old=await r.json() as any;for(const x of old.items??[])await fetch(base+"/"+encodeURIComponent(x.id),{method:"DELETE",headers:{authorization:"Bearer "+token}});page=old.nextPageToken??""}while(page);
  for(const e of es){const r=await fetch(base,{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify(e)});if(!r.ok)throw new Error("Google Calendar etkinlikleri kaydedilemedi.");}
  await db.from("google_calendar_connections").update({updated_at:new Date().toISOString()}).eq("user_id",userId);
  return es.length;
}