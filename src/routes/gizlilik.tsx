import { createFileRoute, Link } from "@tanstack/react-router";
import { AnaSayfaLogosu } from "@/components/Marka";
export const Route = createFileRoute("/gizlilik")({ component: Sayfa });
function Sayfa() {
  return <main className="mx-auto max-w-2xl px-5 py-8"><div className="flex items-center gap-3"><AnaSayfaLogosu /><Link to="/">İTF Takvim · Ana sayfa</Link></div><h1 className="my-8 text-3xl font-bold">Gizlilik Politikası</h1>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Hangi bilgileri kullanıyoruz?</h2><p className="leading-relaxed text-muted-foreground">E-posta adresini hesabına giriş yapabilmen için kullanırız. Adın ve öğrenci numaran, öğrenci listelerindeki dönem, dil ve grup bilgileriyle eşleştirilerek kişisel programını oluşturur. Ders seçimlerin, katılım işaretlerin ve tercihlerinin kaydedilmesi takvimini tekrar kullanabilmeni sağlar.</p></section>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Veriler kimlerle paylaşılır?</h2><p className="leading-relaxed text-muted-foreground">Kişisel verilerini satmayız. Hesap ve veri saklama işlemlerinde barındırma ve kimlik doğrulama hizmetlerinden yararlanırız. Takvimini Google veya Apple ile bağlamayı seçersen kişisel program bilgilerin seçtiğin hizmete iletilir. Takvim abonelik bağlantını gizli tut.</p></section>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Geri bildirim ve iletişim</h2><p className="leading-relaxed text-muted-foreground">Gönderdiğin şikâyeti, öneriyi ve varsa ekini yetkili yöneticiler inceleyebilir. WhatsApp bağlantısını açtığında ilgili hizmetin gizlilik koşulları geçerlidir.</p></section>
    <section className="mb-6"><h2 className="mb-2 text-lg font-semibold">Bilgilerimi nasıl yönetirim?</h2><p className="leading-relaxed text-muted-foreground">Hesabını silmek için Ayarlar’daki Tehlike Bölgesi’ni kullanabilirsin. Bilgilerine erişmek, bir hatayı düzelttirmek veya verilerinle ilgili soru sormak için bize ulaşabilirsin.</p></section>
    <a className="underline" href="https://wa.me/qr/WPUHSHXNHQXQC1" rel="noopener noreferrer" target="_blank">WhatsApp üzerinden iletişime geç</a></main>;
}
