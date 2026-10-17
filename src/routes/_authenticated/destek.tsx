import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";
import { useState } from "react";
import { CircleHelp, MapPinned, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TalepListesi, TalepSohbet, TalepTuruSecici, YeniTalep, useTalepler, type Talep } from "@/components/Destek";

export const Route = createFileRoute("/_authenticated/destek")({
  head: () => ({
    meta: [
      { title: "Destek — Tıp Ders Programı" },
      { name: "description", content: "Sorun bildir, öneri veya şikayet talebi aç." },
      { property: "og:title", content: "Destek — Tıp Ders Programı" },
      { property: "og:description", content: "Destek al veya önerini ilet." },
    ],
  }),
  component: DestekSayfasi,
});

function DestekSayfasi() {
  const { liste, yenile } = useTalepler();
  const [secili, setSecili] = useState<string | null>(null);
  const [akim, setAkim] = useState<Talep["tur"] | null>(null);
  const destekler = liste.filter((t) => t.tur === "destek");
  const talep = destekler.find((t) => t.id === secili);
  const olustu = async (id: string) => {
    await yenile();
    if (akim === "destek") setSecili(id);
    setAkim(null);
  };
  return (
    <AppShell baslik="Destek" aciklama="Destek al veya önerini ilet.">
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
        {akim ? <YeniTalep tur={akim} onOlustu={olustu} vazgec={() => setAkim(null)} /> : <TalepTuruSecici sec={setAkim} />}
        <div className="grid gap-3 sm:grid-cols-2"><TanitimTusu /><KrokiTusu /></div>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Destek taleplerim</h2><button onClick={() => setAkim("destek")} className="text-xs font-semibold text-primary hover:underline">Yeni destek talebi</button></div>
        <TalepListesi liste={destekler} secili={secili} sec={setSecili} />
        {talep && <TalepSohbet talep={talep} yonetici={false} onDegisti={yenile} />}
      </div>
    </AppShell>
  );
}

function TanitimTusu() {
  const { guncelle } = useAyarlar();
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => { sessionStorage.removeItem("tur-adim"); guncelle({ turGordu: false }); void nav({ to: "/" }); }} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left">
      <CircleHelp className="h-5 w-5 shrink-0 text-primary" />
      <span className="flex-1"><span className="block text-sm font-semibold">Site tanıtımını tekrar izle</span><span className="block text-xs text-muted-foreground">Özellikleri adım adım gösterir</span></span>
    </button>
  );
}


function KrokiTusu() {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAcik(true)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-primary">
        <MapPinned className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1"><span className="block text-sm font-semibold">Dersim nerede?</span><span className="block text-xs text-muted-foreground">Fakülte krokisini ve amfi listesini aç</span></span>
      </button>
      {acik ? <div role="dialog" aria-modal="true" aria-label="Fakülte krokisi" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" onClick={() => setAcik(false)}>
        <div className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl bg-background p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" /><h2 className="font-semibold">İstanbul Tıp Fakültesi krokisi</h2><button aria-label="Krokiyi kapat" onClick={() => setAcik(false)} className="ml-auto rounded-md p-2 hover:bg-accent"><X className="h-5 w-5" /></button></div>
          <p className="mb-3 text-xs text-muted-foreground">Amfi ve derslik isimleri krokideki amfi listesiyle birlikte gösterilir.</p>
          <img src="https://raw.githubusercontent.com/RayerShade/pixel-perfect-match-9550/main/src/assets/WhatsApp%20Image%202026-10-17%20at%2003.22.17.jpeg" alt="İstanbul Tıp Fakültesi kroki ve amfi listesi" className="h-auto w-full rounded-lg border border-border" />
        </div>
      </div> : null}
    </>
  );
}
