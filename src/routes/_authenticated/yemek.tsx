import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, ExternalLink, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { isoDate } from "@/lib/date-utils";
import { yemekListesiGetir, type YemekGunu } from "@/lib/yemek.functions";

export const Route = createFileRoute("/_authenticated/yemek")({
  head: () => ({ meta: [{ title: "Yemek Listesi — Tıp Ders Programı" }, { name: "description", content: "İstanbul Üniversitesi SKS kahvaltı ve yemek listesi." }] }),
  component: Yemek,
});

type Ogun = "kahvalti" | "ogle" | "aksam";
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const gunAdi = (tarih: string) => new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const satirlar = (gun: YemekGunu, ogun: Ogun) => (ogun === "kahvalti" ? gun.kahvalti : gun.ogle)?.split(/\n|,/).map((x) => x.trim()).filter(Boolean) ?? [];

function Yemek() {
  const [imlec, setImlec] = useState(() => new Date());
  const [ogun, setOgun] = useState<Ogun>("ogle");
  const [gecmisiGoster, setGecmisiGoster] = useState(false);
  const getir = useServerFn(yemekListesiGetir);
  const yil = imlec.getFullYear(), ay = imlec.getMonth() + 1;
  const q = useQuery({ queryKey: ["yemek-listesi", yil, ay], queryFn: () => getir({ data: { yil, ay } }), staleTime: 20 * 60_000 });
  // Seçili ay değişse bile "Bugün" kartı her zaman bugünün ayındaki resmi menüden okunur.
  const [bugununAyi] = useState(() => {
    const simdi = new Date();
    return { yil: simdi.getFullYear(), ay: simdi.getMonth() + 1 };
  });
  const bugunQ = useQuery({
    queryKey: ["yemek-listesi", bugununAyi.yil, bugununAyi.ay],
    queryFn: () => getir({ data: bugununAyi }),
    staleTime: 20 * 60_000,
  });
  const liste = (q.data?.gunler ?? []).filter((gun) => satirlar(gun, ogun).length);
  const [bugun, setBugun] = useState("");
  useEffect(() => setBugun(isoDate(new Date())), []);
  const buAy = yil === bugununAyi.yil && ay === bugununAyi.ay;
  const gecmisSayisi = buAy && bugun ? liste.filter((gun) => gun.tarih < bugun).length : 0;
  const gorunenGunler = gecmisSayisi && !gecmisiGoster ? liste.filter((gun) => gun.tarih >= bugun) : liste;
  const bugunKaydi = (bugunQ.data?.gunler ?? []).find((gun) => gun.tarih === bugun);


  return (
    <AppShell baslik="Yemekhane Menüsü" aciklama="İÜ SKS kaynağından güncel menü">
      <section className="meal-board workspace-panel p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">{AYLAR[ay - 1]} {yil}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button aria-label="Önceki ay" onClick={() => setImlec(new Date(yil, ay - 2, 1))} className="ui-control grid h-8 w-8 place-items-center rounded-xl border border-border hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setImlec(new Date())} className="ui-control rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Bu ay</button>
            <button aria-label="Sonraki ay" onClick={() => setImlec(new Date(yil, ay, 1))} className="ui-control grid h-8 w-8 place-items-center rounded-xl border border-border hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

      </section>
      <section className="st-meal-hero">
        <header><div><h2>Günün Menüsü</h2><p>{bugun && gunAdi(bugun)}</p></div><UtensilsCrossed aria-hidden="true" /></header>
        <div className="st-meals">{([["kahvalti","Kahvaltı","07:30–09:00"],["ogle","Öğle Yemeği","11:00–14:00"],["aksam","Akşam Yemeği","16:00–18:00"]] as const).map(([id,ad,saat]) => {
          const yemekler = bugunKaydi ? satirlar(bugunKaydi,id) : [];
          return <article key={id}><small>{saat}</small><h3>{ad}</h3>{yemekler.length ? <ul>{yemekler.map((x,i)=><li key={i}>{x}</li>)}</ul> : <p>{bugunQ.isLoading ? "Yükleniyor…" : bugunQ.isError ? "Menü alınamadı." : "Menü yayımlanmadı."}</p>}</article>;
        })}</div>
      </section>
      <section className="st-month"><h2>Aylık Menü Takvimi</h2>
        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-accent/70 p-1.5 text-xs font-semibold">
          {([
            ["kahvalti", "Kahvaltı", "07:30–09:00"],
            ["ogle", "Öğle", "11:00–14:00"],
            ["aksam", "Akşam", "16:00–18:00"],
          ] as const).map(([id, ad, saat]) => (
            <button key={id} aria-pressed={ogun === id} onClick={() => setOgun(id)} className={`rounded-lg px-2 py-2 ${ogun === id ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <span className="block">{ad}</span><span className="mt-0.5 block text-[10px] font-normal opacity-75">{saat}</span>
            </button>
          ))}
        </div>
        {q.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Yemek listesi yükleniyor…</p> : null}
        {q.isError ? <p className="py-10 text-center text-sm text-destructive">SKS yemek listesi şu an alınamadı. <button className="rounded-lg border border-border px-3 py-2 text-foreground" disabled={q.isFetching} onClick={() => void q.refetch()}>Tekrar dene</button></p> : null}
        {!q.isLoading && !q.isError && !liste.length ? <p className="py-10 text-center text-sm text-muted-foreground">Bu ay için yayınlanmış {ogun === "kahvalti" ? "kahvaltı" : "yemek"} listesi yok.</p> : null}
        {liste.length > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{buAy && !gecmisiGoster ? "Bugün ve sonrası" : "Ayın menüleri"}</h3>
          {gecmisSayisi > 0 && <button type="button" aria-pressed={gecmisiGoster} onClick={() => setGecmisiGoster(!gecmisiGoster)} className="min-h-10 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-accent">{gecmisiGoster ? "Geçmiş günleri gizle" : `Geçmiş günleri göster (${gecmisSayisi})`}</button>}
        </div>}
        {liste.length > 0 && !gorunenGunler.length && <p className="mt-2 text-sm text-muted-foreground">Bu ay için ileride yayınlanmış menü yok.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gorunenGunler.map((gun) => {
            const buGunMu = !!bugun && gun.tarih === bugun;
            const gecti = !!bugun && gun.tarih < bugun;
            return (
              <article key={gun.tarih} className={`workspace-row rounded-2xl border p-3 ${buGunMu ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border"} ${gecti ? "opacity-60" : ""}`}>
                <h3 className="flex items-center gap-2 text-sm font-bold capitalize">
                  {gunAdi(gun.tarih)}
                  {buGunMu ? <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Bugün</span> : null}
                  {gecti ? <span className="shrink-0 text-[10px] font-normal normal-case text-muted-foreground">geçti</span> : null}
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{satirlar(gun, ogun).map((satir, i) => <li key={i}>• {satir}</li>)}</ul>
              </article>
            );
          })}
        </div>
        <a href="https://sks.istanbul.edu.tr/tr/yemek-listesi" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Resmi SKS sayfasını aç <ExternalLink className="h-3.5 w-3.5" /></a>
      </section>
    </AppShell>
  );
}
