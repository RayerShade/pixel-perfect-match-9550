import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, MapPinned, MessageCircle, Utensils } from "lucide-react";

const ozellikler = [
  { ikon: CalendarDays, ad: "Kişisel takvim", metin: "Grubunun uygulamalarını ve seçtiğin dersleri günlük veya haftalık programında gör." },
  { ikon: BookOpen, ad: "Dersler ve katılım", metin: "Dilimleri incele, girdiğin dersleri ve uygulama telafilerini işaretle." },
  { ikon: MapPinned, ad: "Dersim nerede?", metin: "Amfi bilgisini kontrol et, fakülte krokisinden dersliğini bul." },
  { ikon: Utensils, ad: "Yemek listesi", metin: "Bugünün kahvaltısına, öğle ve akşam menülerine göz at." },
];

export function Karsilama() {
  const whatsapp = "https://wa.me/qr/WPUHSHXNHQXQC1";
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-6 text-foreground sm:px-8">
      <header className="flex items-center gap-2 border-b border-border pb-5 font-bold">
        <CalendarDays aria-hidden="true" className="h-6 w-6 text-primary" /> İTF Takvim
      </header>
      <section className="max-w-3xl py-12 sm:py-20">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">İstanbul Tıp Fakültesi</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Fakültedeki gününü planla.</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Ders saatlerini, uygulama grubunu ve amfini kişisel takviminde bir arada gör.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/auth" search={{ ekran: "giris" }} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Giriş yap</Link>
          <Link to="/auth" search={{ ekran: "kayit" }} className="rounded-xl border border-border bg-surface px-6 py-3 font-semibold hover:bg-accent">Kayıt ol</Link>
        </div>
      </section>
      <section aria-label="İTF Takvim özellikleri" className="grid gap-3 sm:grid-cols-2">
        {ozellikler.map(({ ikon: Ikon, ad, metin }) => (
          <article key={ad} className="workspace-panel p-5">
            <Ikon className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">{ad}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{metin}</p>
          </article>
        ))}
      </section>
      <section className="my-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-accent/50 p-5">
        <div><h2 className="font-semibold">Bize destek ol</h2><p className="mt-1 text-sm text-muted-foreground">İTF Takvim’e katkıda bulunmak için iletişime geç.</p></div>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" />WhatsApp’tan ulaş</a>
      </section>
    </main>
  );
}
