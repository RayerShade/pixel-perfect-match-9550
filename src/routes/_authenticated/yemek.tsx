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
  const getir = useServerFn(yemekListesiGetir);
  const yil = imlec.getFullYear(), ay = imlec.getMonth() + 1;
  const q = useQuery({ queryKey: ["yemek-listesi", yil, ay], queryFn: () => getir({ data: { yil, ay } }), staleTime: 20 * 60_000 });
  const liste = (q.data?.gunler ?? []).filter((gun) => satirlar(gun, ogun).length);
  const [bugun, setBugun] = useState("");
  useEffect(() => setBugun(isoDate(new Date())), []);
  const bugunKaydi = (q.data?.gunler ?? []).find((gun) => gun.tarih === bugun);
  const bugunSatirlar = bugunKaydi ? satirlar(bugunKaydi, ogun) : [];

  return (
    <AppShell baslik="Yemek Listesi" aciklama="İÜ SKS kaynağından güncel menü">
      <section className="rounded-3xl border border-border bg-surface p-4 shadow-card md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">{AYLAR[ay - 1]} {yil}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button aria-label="Önceki ay" onClick={() => setImlec(new Date(yil, ay - 2, 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setImlec(new Date())} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">Bu ay</button>
            <button aria-label="Sonraki ay" onClick={() => setImlec(new Date(yil, ay, 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-xl bg-accent p-1 text-xs font-semibold">
          {([
            ["kahvalti", "Kahvaltı", "07:30–09:00"],
            ["ogle", "Öğle", "11:00–14:00"],
            ["aksam", "Akşam", "16:00–18:00"],
          ] as const).map(([id, ad, saat]) => (
            <button key={id} onClick={() => setOgun(id)} className={`rounded-lg px-2 py-2 ${ogun === id ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <span className="block">{ad}</span><span className="mt-0.5 block text-[10px] font-normal opacity-75">{saat}</span>
            </button>
          ))}
        </div>
        {q.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Yemek listesi yükleniyor…</p> : null}
        {q.isError ? <p className="py-10 text-center text-sm text-destructive">SKS yemek listesi şu an alınamadı. Biraz sonra tekrar dene.</p> : null}
        {!q.isLoading && !q.isError && !liste.length ? <p className="py-10 text-center text-sm text-muted-foreground">Bu ay için yayınlanmış {ogun === "kahvalti" ? "kahvaltı" : "yemek"} listesi yok.</p> : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((gun) => (
            <article key={gun.tarih} className="rounded-xl border border-border p-3">
              <h3 className="text-sm font-bold capitalize">{gunAdi(gun.tarih)}</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{satirlar(gun, ogun).map((satir, i) => <li key={i}>• {satir}</li>)}</ul>
            </article>
          ))}
        </div>
        <a href="https://sks.istanbul.edu.tr/tr/yemek-listesi" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Resmi SKS sayfasını aç <ExternalLink className="h-3.5 w-3.5" /></a>
      </section>
    </AppShell>
  );
}
