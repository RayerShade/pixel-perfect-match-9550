import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, MapPin, MessageCircle, Utensils } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AnaSayfaLogosu, NAV } from "@/components/Marka";
import kroki from "@/assets/WhatsApp Image 2026-10-17 at 03.22.17.jpeg";

const ornekGunler = [
  { gun: "Pazartesi", dersler: [["09:00", "Protein yapısı", "Teorik ders", "Aziz Sancar Amfisi"], ["13:30", "Temel biyofizik", "Uygulama", "Temel Tıp Bilimleri"]] },
  { gun: "Salı", dersler: [["10:30", "Dikiş düğüm uygulaması", "Uygulama", "Hulusi Behçet Kütüphanesi"], ["14:00", "Tıp ve sanat", "Seçmeli ders", "İngilizce Tıp Binası"]] },
];
const anaTus = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90";
const ikincil = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold hover:bg-accent";

export function Karsilama() {
  const { user } = useAuth();
  const [gun, setGun] = useState(0);
  const ornek = ornekGunler[gun]!;
  const hesap = user ? <Link to="/takvim" className={anaTus}>Takvimimi aç <ArrowRight size={16} /></Link> : <>
    <Link to="/auth" search={{ ekran: "giris" }} className={anaTus}>Giriş yap</Link>
    <Link to="/auth" search={{ ekran: "kayit" }} className={ikincil}>Kayıt ol</Link>
  </>;

  return (
    <div className="bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2"><AnaSayfaLogosu /><span className="font-bold">İTF Takvim</span></div>
          <nav aria-label="Ana gezinme" className="flex max-w-full flex-wrap items-center gap-1 rounded-2xl bg-accent/70 p-1">
            {NAV.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold hover:bg-surface sm:px-3 sm:text-sm"><Icon size={16} aria-hidden="true" />{label}</Link>)}
          </nav>
        </div>
      </header>
      <main id="baslangic" className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="grid items-center gap-9 py-12 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-semibold text-teorik">İstanbul Tıp Fakültesi</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Fakültedeki haftan bir bakışta.</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">Sıradaki ders hangi amfide? Uygulaman hangi gün? Dönemine, grubuna ve seçmelilerine göre hazırlanmış programını aç.</p>
            <div className="mt-7 flex flex-wrap gap-3">{hesap}</div>
          </div>
          <div className="rounded-3xl border border-border bg-accent/60 p-4 sm:p-6">
            <div className="flex items-center gap-2"><CalendarDays size={19} /><h2 className="font-semibold">Örnek ders programı</h2></div>
            <div className="my-4 flex flex-wrap gap-2">{ornekGunler.map((g, i) => <button type="button" key={g.gun} aria-pressed={i === gun} onClick={() => setGun(i)} className={i === gun ? anaTus : ikincil}>{g.gun}</button>)}</div>
            <ul aria-live="polite" className="space-y-2">{ornek.dersler.map(([saat, ad, tur, yer]) => <li key={saat} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
              <span className="text-sm font-semibold tabular-nums">{saat}</span><div><p className="text-xs text-muted-foreground">{tur}</p><strong>{ad}</strong><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13} />{yer}</p></div>
            </li>)}</ul>
          </div>
        </section>

        <section id="ozellikler" className="border-t border-border py-10 sm:py-14">
          <h2 className="mb-6 text-3xl font-bold tracking-tight">Ders gününde yanında</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="workspace-panel p-6"><BookOpen className="mb-4 text-teorik" /><h3 className="text-xl font-bold">Dilimden uygulamaya</h3><p className="mt-2 text-muted-foreground">Dilim, ana dal, konu veya hoca adına göre ara. Katıldığın dersleri işaretle, teorik ve uygulama devamsızlığını ayrı gör. Telafiye girdiğinde ilgili uygulamaya kaydet.</p></article>
            <article className="workspace-panel p-6"><CalendarDays className="mb-4 text-pratik" /><h3 className="text-xl font-bold">Takvim senin programına uysun</h3><p className="mt-2 text-muted-foreground">Seçmelilerini ayarlardan belirle. Online derslerin ve hafta sonunun görünümünü seç. Kendi çalışmanı veya tekrar eden bir dersi de takvimine ekle.</p></article>
            <article className="workspace-panel overflow-hidden md:row-span-2"><img loading="lazy" src={kroki} alt="İstanbul Tıp Fakültesi kampüs krokisinden görünüm" className="h-48 w-full object-cover object-[50%_32%]" /><div className="p-6"><h3 className="text-xl font-bold">Dersim nerede?</h3><p className="mt-2 text-muted-foreground">Ders kartından amfiyi kontrol et. Binayı arıyorsan Destek bölümündeki fakülte krokisini büyüterek derslik listesini incele.</p></div></article>
            <article className="workspace-panel p-6"><Utensils className="mb-3 text-primary" /><h3 className="text-xl font-bold">Yemekte ne var?</h3><p className="mt-2 text-muted-foreground">Kahvaltıyı, öğle ve akşam menülerini servis saatleriyle birlikte gör. Ay değiştirerek başka bir günün menüsüne de bak.</p></article>
            <article className="workspace-panel p-6"><h3 className="text-xl font-bold">Telefonunun takviminde de gör</h3><p className="mt-2 text-muted-foreground">Ayarlardan Google Calendar veya Apple Calendar bağlantısını aç. Kişisel programını kullandığın takvim uygulamasına taşı.</p></article>
          </div>
        </section>

        <section id="nasil" className="border-t border-border py-12"><h2 className="text-3xl font-bold tracking-tight">İlk haftanı hazırla</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">{[
            ["Hesabını aç", "Öğrenci numaran dönem ve grup bilgilerinle eşleşir. Girişten sonra Ayarlar’dan bilgilerini kontrol et."],
            ["Seçmelilerini belirle", "Ayarlar’daki seçmeli ders penceresinde derslerini seç. Seçimlerin kendi takvimine eklenir."],
            ["Dersini aç", "Gün veya hafta görünümünde ders kartına dokun. Saatini, hocasını ve varsa kesinleşmiş amfisini gör."],
          ].map(([ad, metin], i) => <li key={ad} className="border-t-2 border-primary/30 pt-4"><span className="text-sm text-muted-foreground">Adım {i + 1}</span><h3 className="mt-2 font-bold">{ad}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{metin}</p></li>)}</ol>
        </section>

        <section id="sorular" className="grid gap-5 border-t border-border py-12 md:grid-cols-[1fr_2fr]"><h2 className="text-3xl font-bold tracking-tight">Sık sorulan sorular</h2>
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
        <section id="destek" className="mb-10 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-border bg-accent p-6 sm:p-9">
          <div className="max-w-2xl"><h2 className="text-2xl font-bold">Bize destek ol</h2><p className="mt-2 text-muted-foreground">İTF Takvim tamamen ücretsiz bir öğrenci projesidir. Alan adı ve barındırma gibi masraflarımızı karşılamamıza destek olmak isterseniz WhatsApp üzerinden bizimle iletişime geçebilirsiniz.</p></div>
          <a href="https://wa.me/qr/WPUHSHXNHQXQC1" target="_blank" rel="noopener noreferrer" className={anaTus}><MessageCircle size={17} />WhatsApp’tan ulaş</a>
        </section>
      </main>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6"><span className="font-semibold">İTF Takvim</span><nav aria-label="Yasal bilgiler" className="flex gap-4 text-sm underline"><Link to="/gizlilik">Gizlilik Politikası</Link><Link to="/kullanim-sartlari">Kullanım Şartları</Link></nav><div className="flex gap-2">{hesap}</div></div></footer>
    </div>
  );
}
