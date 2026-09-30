import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TalepListesi, TalepSohbet, YeniTalep, useTalepler } from "@/components/Destek";

export const Route = createFileRoute("/_authenticated/destek")({
  head: () => ({
    meta: [
      { title: "Destek — Tıp Ders Programı" },
      { name: "description", content: "Sorun bildir, öneri veya şikayet talebi aç." },
      { property: "og:title", content: "Destek — Tıp Ders Programı" },
      { property: "og:description", content: "Destek, öneri ve şikayet talepleri." },
    ],
  }),
  component: DestekSayfasi,
});

function DestekSayfasi() {
  const { liste, yenile } = useTalepler();
  const [secili, setSecili] = useState<string | null>(null);
  const talep = liste.find((t) => t.id === secili);
  return (
    <AppShell baslik="Destek" aciklama="Sorun, öneri veya şikayet talebi aç.">
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
        <p className="text-sm text-muted-foreground">Yaşadığın sorunları, önerilerini veya şikayetlerini buradan ilet. Cevaplar bu sayfada görünür.</p>
        <YeniTalep onOlustu={async (id) => { await yenile(); setSecili(id); }} />
        <h2 className="font-semibold">Taleplerim</h2>
        <TalepListesi liste={liste} secili={secili} sec={setSecili} />
        {talep && <TalepSohbet talep={talep} yonetici={false} onDegisti={yenile} />}
      </div>
    </AppShell>
  );
}
