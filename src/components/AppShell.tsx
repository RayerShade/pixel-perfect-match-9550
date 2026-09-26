import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CalendarDays, ListChecks, Building2, Settings } from "lucide-react";

const NAV = [
  { to: "/", label: "Takvim", icon: CalendarDays },
  { to: "/secmeliler", label: "Seçmeliler", icon: ListChecks },
  { to: "/amfi", label: "Haftalık Amfi", icon: Building2 },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

export function AppShell({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/90 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 md:flex md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CalendarDays className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold md:text-lg">{baslik}</h1>
              {aciklama ? (
                <p className="truncate text-xs text-muted-foreground">{aciklama}</p>
              ) : null}
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-teorik-soft data-[status=active]:text-teorik"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-teorik"
            >
              <Icon className="h-5 w-5" />
              <span className="truncate px-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
