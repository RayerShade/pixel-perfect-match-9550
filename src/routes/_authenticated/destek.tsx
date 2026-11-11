import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";
import { useState } from "react";
import { CircleHelp, MapPinned } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
      <div className="mx-auto max-w-3xl space-y-5 pb-28">
        {akim ? <YeniTalep tur={akim} onOlustu={() => setAkim(null)} vazgec={() => setAkim(null)} /> : <TalepTuruSecici sec={setAkim} />}
        <section className="workspace-panel grid gap-3 p-3 sm:grid-cols-2"><TanitimTusu /><KrokiTusu /></section>
      </div>
    </AppShell>
  );
}

function TanitimTusu() {
  const { guncelle } = useAyarlar();
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => { sessionStorage.removeItem("tur-adim"); guncelle({ turGordu: false }); void nav({ to: "/takvim" }); }} className="ui-surface ui-control flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left">
      <CircleHelp className="h-5 w-5 shrink-0 text-primary" />
      <span className="flex-1"><span className="block text-sm font-semibold">Site tanıtımını tekrar izle</span><span className="block text-xs text-muted-foreground">Özellikleri adım adım gösterir</span></span>
    </button>
  );
}

function KrokiTusu() {
  const [acik, setAcik] = useState(false);
  const [buyuk, setBuyuk] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setBuyuk(false); setAcik(true); }} className="ui-surface ui-control flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:border-primary">
        <MapPinned className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1"><span className="block text-sm font-semibold">Dersim nerede?</span><span className="block text-xs text-muted-foreground">Fakülte Krokisi</span></span>
      </button>
      <Dialog open={acik} onOpenChange={setAcik}>
        <DialogContent className="flex max-w-5xl flex-col overflow-hidden p-3 sm:p-4">
          <DialogTitle className="pr-8">İstanbul Tıp Fakültesi krokisi</DialogTitle>
          <DialogDescription>Amfi listesini okumak için haritayı büyütebilirsin.</DialogDescription>
          <button type="button" aria-pressed={buyuk} onClick={() => setBuyuk(!buyuk)} className="self-start rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-accent">{buyuk ? "Ekrana sığdır" : "Haritayı büyüt"}</button>
          <div tabIndex={0} role="region" aria-label="Kaydırılabilir fakülte krokisi" className="min-h-0 overflow-auto rounded-xl border border-border">
            <img src={krokiUrl} alt="İstanbul Tıp Fakültesi yerleşim krokisi ve binalara göre amfi listesi" className={buyuk ? "block h-auto min-w-[72rem] max-w-none" : "block h-auto w-full"} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
