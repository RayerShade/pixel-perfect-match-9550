import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAyarlar, useSecmeliler } from "@/lib/store";

export const Route = createFileRoute("/ayarlar")({
  head: () => ({
    meta: [
      { title: "Ayarlar — Tıp Ders Programı" },
      {
        name: "description",
        content: "Dönem, grup ve takvim görünüm tercihlerini düzenle.",
      },
      { property: "og:title", content: "Ayarlar — Tıp Ders Programı" },
      {
        property: "og:description",
        content: "Öğrenci bilgileri, hafta sonu görünümü ve takvim saat aralığı.",
      },
    ],
  }),
  component: Ayarlar,
});

function Ayarlar() {
  const { ayarlar, guncelle } = useAyarlar();
  const { secili } = useSecmeliler();

  return (
    <AppShell baslik="Ayarlar" aciklama="Uygulama tercihleri">
      <div className="space-y-3">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold">Öğrenci Bilgileri</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Ad</span>
              <input
                value={ayarlar.ogrenciAdi}
                onChange={(e) => guncelle({ ogrenciAdi: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Dönem</span>
              <input
                value={ayarlar.donem}
                onChange={(e) => guncelle({ donem: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Grup</span>
              <input
                value={ayarlar.grup}
                onChange={(e) => guncelle({ grup: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold">Takvim Görünümü</h2>
          <label className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm">Hafta sonunu göster</span>
            <input
              type="checkbox"
              checked={ayarlar.haftaSonuGoster}
              onChange={(e) => guncelle({ haftaSonuGoster: e.target.checked })}
              className="h-5 w-5 accent-[var(--teorik)]"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Başlangıç saati</span>
              <input
                type="number"
                min={6}
                max={12}
                value={ayarlar.gunBaslangic}
                onChange={(e) => guncelle({ gunBaslangic: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Bitiş saati</span>
              <input
                type="number"
                min={14}
                max={23}
                value={ayarlar.gunBitis}
                onChange={(e) => guncelle({ gunBitis: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold">Veri</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Seçili seçmeli ders sayısı: {secili.length}. Seçimlerin ve elle yaptığın amfi
            atamaları bu cihazda saklanır.
          </p>
          <button
            onClick={() => {
              window.localStorage.clear();
              window.location.reload();
            }}
            className="mt-3 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Tüm tercihleri sıfırla
          </button>
        </section>
      </div>
    </AppShell>
  );
}
