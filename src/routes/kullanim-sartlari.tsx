import { createFileRoute, Link } from "@tanstack/react-router";
import { AnaSayfaLogosu } from "@/components/Marka";
export const Route = createFileRoute("/kullanim-sartlari")({ component: Sayfa });
function Sayfa() {
  return <main className="mx-auto max-w-2xl px-5 py-8"><div className="flex items-center gap-3"><AnaSayfaLogosu /><Link to="/">İTF Takvim · Ana sayfa</Link></div><h1 className="my-8 text-3xl font-bold">Kullanım Şartları</h1>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Proje hakkında</h2><p className="leading-relaxed text-muted-foreground">İTF Takvim, öğrencilerin ders programını takip etmesine yardımcı olan ücretsiz ve bağımsız bir öğrenci projesidir. İstanbul Üniversitesinin resmi hizmeti değildir.</p></section>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Ders programı ve katılım</h2><p className="leading-relaxed text-muted-foreground">Ders saatleri ve amfi bilgileri değişebilir. Sınav, derslik ve program değişikliklerinde fakültenin güncel duyurularını esas al. İşaretlediğin katılım bilgileri kişisel takip içindir; resmi yoklama kaydı yerine geçmez.</p></section>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Hesap ve paylaşımlar</h2><p className="leading-relaxed text-muted-foreground">Kendi hesabını kullan ve giriş bilgilerini koru. Geri bildirim gönderirken başkalarının kişisel bilgilerini izinsiz paylaşma. Projeye maddi destek gönüllüdür.</p></section>
    <a className="underline" href="https://wa.me/qr/WPUHSHXNHQXQC1" rel="noopener noreferrer" target="_blank">WhatsApp üzerinden iletişime geç</a></main>;
}
