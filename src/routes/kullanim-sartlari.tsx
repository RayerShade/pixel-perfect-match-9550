import { KullanimMetni } from "@/components/YasalMetinler";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnaSayfaLogosu } from "@/components/Marka";
export const Route = createFileRoute("/kullanim-sartlari")({ component: Sayfa });
function Sayfa() {
  return <main className="mx-auto max-w-2xl px-5 py-8"><div className="flex items-center gap-3"><AnaSayfaLogosu /><Link to="/">İTF Takvim · Ana sayfa</Link></div><h1 className="my-8 text-3xl font-bold">Kullanım Şartları</h1>
    <KullanimMetni /></main>;
}
