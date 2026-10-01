import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, CalendarDays, CircleHelp, Settings, TicketCheck } from "lucide-react";
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
        <KullanimKilavuzu />
        <YeniTalep onOlustu={async (id) => { await yenile(); setSecili(id); }} />
        <h2 className="font-semibold">Taleplerim</h2>
        <TalepListesi liste={liste} secili={secili} sec={setSecili} />
        {talep && <TalepSohbet talep={talep} yonetici={false} onDegisti={yenile} />}
      </div>
    </AppShell>
  );
}

const KILAVUZ = [
  { baslik: "Takvimi kullanma", metin: "Gün, hafta veya ay görünümünü seç; oklarla tarihler arasında ilerle. Bir derse dokunarak saat, hoca ve amfi ayrıntılarını aç.", Ikon: CalendarDays },
  { baslik: "Ders ekleme ve düzenleme", metin: "Takvimdeki + düğmesiyle tek seferlik ya da tekrarlanan ders ekle. Mevcut bir derse dokunarak yalnız o haftayı veya tüm haftaları değiştir.", Ikon: BookOpen },
  { baslik: "Tercihler", metin: "Ayarlar'dan online dersleri, telafi uygulamalarını, hafta sonunu ve takvim saatlerini gösterip gizleyebilirsin.", Ikon: Settings },
  { baslik: "Destek talebi", metin: "Aşağıdan Destek, Öneri veya Şikayet türünü seçip talep aç. Cevap geldiğinde zilinde bildirim görür, buradan konuşmaya devam edebilirsin.", Ikon: TicketCheck },
] as const;

function KullanimKilavuzu() {
  const [acik, setAcik] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-surface">
      <button type="button" onClick={() => setAcik((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={acik}>
        <CircleHelp className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">Genel kullanım kılavuzu</span>
          <span className="block text-xs text-muted-foreground">Takvim, dersler, ayarlar ve destek</span>
        </span>
        <span className="text-xs font-semibold text-primary">{acik ? "Kapat" : "Aç"}</span>
      </button>
      {acik ? (
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          {KILAVUZ.map(({ baslik, metin, Ikon }) => (
            <div key={baslik} className="flex gap-3 rounded-lg bg-accent p-3">
              <Ikon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div><h3 className="text-sm font-semibold">{baslik}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metin}</p></div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
