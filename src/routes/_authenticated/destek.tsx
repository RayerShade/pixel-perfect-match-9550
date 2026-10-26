import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";
import { useState } from "react";
import { CircleHelp, MapPinned, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TalepTuruSecici, YeniTalep, type Talep } from "@/components/Destek";
import krokiUrl from "@/assets/WhatsApp Image 2026-10-17 at 03.22.17.jpeg";

export const Route = createFileRoute("/_authenticated/destek")({
  head: () => ({
    meta: [
      { title: "Şikâyet ve Öneri — Tıp Ders Programı" },
      { name: "description", content: "Şikâyetini veya önerini ekibe ilet." },
      { property: "og:title", content: "Şikâyet ve Öneri — Tıp Ders Programı" },
      { property: "og:description", content: "Şikâyetini veya önerini ilet." },
    ],
  }),
  component: DestekSayfasi,
});

function DestekSayfasi() {
  const [akim, setAkim] = useState<Talep["tur"] | null>(null);
  return (
    <AppShell baslik="Destek" aciklama="Şikâyet veya önerini ilet.">
      <div className="mx-auto max-w-3xl space-y-4 pb-28">
        {akim ? <YeniTalep tur={akim} onOlustu={() => setAkim(null)} vazgec={() => setAkim(null)} /> : <TalepTuruSecici sec={setAkim} />}
        <div className="grid gap-3 sm:grid-cols-2"><TanitimTusu /><KrokiTusu /></div>
      </div>
    </AppShell>
  );
}

function TanitimTusu() {
  const { guncelle } = useAyarlar();
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => { sessionStorage.removeItem("tur-adim"); guncelle({ turGordu: false }); void nav({ to: "/" }); }} className="ui-surface ui-control flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left">
      <CircleHelp className="h-5 w-5 shrink-0 text-primary" />
      <span className="flex-1"><span className="block text-sm font-semibold">Site tanıtımını tekrar izle</span><span className="block text-xs text-muted-foreground">Özellikleri adım adım gösterir</span></span>
    </button>
  );
}

function KrokiTusu() {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAcik(true)} className="ui-surface ui-control flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:border-primary">
        <MapPinned className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1"><span className="block text-sm font-semibold">Dersim nerede?</span><span className="block text-xs text-muted-foreground">Fakülte Krokisi</span></span>
      </button>
      {acik ? <div role="dialog" aria-modal="true" aria-label="Fakülte krokisi" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" onClick={() => setAcik(false)}>
        <div className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl border border-white/80 bg-background p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" /><h2 className="font-semibold">İstanbul Tıp Fakültesi krokisi</h2><button aria-label="Krokiyi kapat" onClick={() => setAcik(false)} className="ml-auto rounded-md p-2 hover:bg-accent"><X className="h-5 w-5" /></button></div>
          <p className="mb-3 text-xs text-muted-foreground">Amfi ve derslik isimleri krokideki amfi listesiyle birlikte gösterilir.</p>
          <img src={krokiUrl} alt="İstanbul Tıp Fakültesi kroki ve amfi listesi" className="h-auto w-full rounded-lg border border-border" />
        </div>
      </div> : null}
    </>
  );
}
