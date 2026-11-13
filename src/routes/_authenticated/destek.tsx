import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAyarlar } from "@/lib/store";
import { useState } from "react";
import { CircleHelp, MapPinned } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { TalepTuruSecici, YeniTalep, TalepListesi, TalepSohbet, useTalepler, type Talep } from "@/components/Destek";
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
  const { user } = useAuth();
  const [akim, setAkim] = useState<Talep["tur"] | null>(null);
  return (
    <AppShell baslik="Destek ve Kampüs Rehberi" aciklama="Şikâyet veya önerini ilet.">
      <div className="st-support pb-12">
        {akim ? <YeniTalep tur={akim} onOlustu={() => setAkim(null)} vazgec={() => setAkim(null)} /> : <TalepTuruSecici sec={setAkim} />}
        {!akim && user && <Sikayetlerim key={user.id} userId={user.id} />}
        <section id="kampus" className="scroll-mt-24 workspace-panel st-campus grid content-start gap-3 p-5"><h2>Çapa Yerleşkesi Krokisi</h2><img alt="Çapa yerleşkesi" src={krokiUrl} className="h-44 w-full rounded-xl object-cover object-[50%_35%]" /><KrokiTusu /><TanitimTusu /></section>
        <section id="sorular" className="workspace-panel space-y-4 p-5"><h2 className="text-3xl font-bold tracking-tight">Sık sorulan sorular</h2>
          <div className="divide-y divide-border">{[
            ["İTF Takvim ücretli mi?", "Hayır. Uygulamanın tüm öğrenci özelliklerini ücretsiz kullanabilirsin. Projeye katkıda bulunmak tamamen isteğe bağlı."],
            ["Bu resmi fakülte takvimi mi?", "İTF Takvim öğrenciler tarafından geliştirilen bağımsız bir projedir. Saat veya derslik konusunda farklılık varsa fakültenin güncel duyurusunu esas al."],
            ["Seçmeli derslerimi nereden değiştiririm?", "Ayarlar sayfasındaki seçmeli ders seçimini aç. Aldığın dersleri seçerek kişisel takviminde hangilerinin görüneceğini belirleyebilirsin."],
            ["Telafiye katıldığımı nasıl işaretlerim?", "Dersler sekmesinde ilgili dilimi aç. Uygulamanın altındaki telafi satırını işaretlediğinde katılımın o uygulamanın hesabına yansır."],
            ["Amfiyi biliyorum ama binayı nasıl bulurum?", "Destek sekmesindeki Dersim nerede? düğmesini aç. Krokide binanın yerini, altındaki listede amfi ve derslikleri görebilirsin."],
            ["Programda hata görürsem ne yapmalıyım?", "Destek sekmesinden ders adını, tarihini ve düzeltilmesi gereken bilgiyi ilet. Gerekirse ekran görüntüsü ekleyebilirsin."],
            ["Neden arkadaşımın takvimi farklı?", "Dönem, program dili, uygulama grubu ve seçmeli ders tercihleri görünen dersleri belirler."],
            ["Sınıfımın tüm uygulamalarını görebilir miyim?", "Sınıfın için ayrı uygulama tablosu yayımlandıysa Dersler sayfasının altında tüm grupları içeren tabloyu açabilirsin."],
            ["Bir dersin amfisi neden henüz görünmüyor?", "Amfi programı ders programından ayrı güncellenir. Takvimdeki son güncelleme bilgilerini ve ders kartındaki eşleşme durumunu kontrol edebilirsin."],
          ].map(([soru, cevap]) => <details key={soru} className="py-3"><summary className="cursor-pointer py-2 font-semibold">{soru}</summary><p className="pb-2 text-sm leading-relaxed text-muted-foreground">{cevap}</p></details>)}</div>
        </section>
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

function Sikayetlerim({ userId }: { userId: string }) {
  const { liste, bekliyor, yenile } = useTalepler(userId);
  const [secili, sec] = useState<string | null>(null);
  const talep = liste.find((kayit) => kayit.id === secili);
  return <section className="workspace-panel space-y-4 p-5">
    <h2 className="text-lg font-bold">Şikâyetlerim</h2>
    {bekliyor ? <p>Yükleniyor…</p> : <TalepListesi liste={liste} secili={secili} sec={sec} />}
    {talep && <TalepSohbet key={talep.id} talep={talep} onDegisti={yenile} />}
  </section>;
}
