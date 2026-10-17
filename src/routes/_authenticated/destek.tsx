import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";
import { useState } from "react";
import { CircleHelp } from "lucide-react";
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
        <TanitimTusu />
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
