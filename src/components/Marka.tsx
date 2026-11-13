import { Link } from "@tanstack/react-router";
import { BriefcaseMedical, CalendarDays, BookOpen, UtensilsCrossed, LifeBuoy, Settings } from "lucide-react";

export const NAV = [

  { to: "/takvim", label: "Takvim", icon: CalendarDays },
  { to: "/dersler", label: "Dersler", icon: BookOpen },
  { to: "/yemek", label: "Yemek", icon: UtensilsCrossed },
  { to: "/destek", label: "Destek", icon: LifeBuoy },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

export function AnaSayfaLogosu() {
  return <Link to="/" aria-label="İTF Takvim ana sayfası" className="inline-flex shrink-0 items-center gap-2 rounded-xl font-bold focus-visible:outline-2">
    <span className="medical-mark"><BriefcaseMedical size={21} strokeWidth={2} aria-hidden="true" /></span>
    <span className="sr-only">İTF Takvim</span>
  </Link>;
}
