import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useDonemler } from "@/components/DonemSecici";
import { DIL_ETIKET } from "@/lib/program";
import { useAyarlar, useSecmeliler, useYuklenenVeri, type Ayarlar } from "@/lib/store";
import { donemBilgisi, ogrenciBul, onlineDersAdlari } from "@/lib/schedule-data";
import { SecmeliSecici } from "@/components/SecmeliSecici";
import { PwaKurulum } from "@/components/PwaKurulum";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/ayarlar")({
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
  const { cikis } = useAuth();
  const { secili } = useSecmeliler();
  const { veri } = useYuklenenVeri();
  const onlineDersler = onlineDersAdlari(veri);
  const ogrenci = ogrenciBul(veri, ayarlar.ogrenciNo ?? "", ayarlar.grupElle);
  const dersAyar = ayarlar.onlineDersAyarlari ?? {};
  const ad = ogrenci ? `${ogrenci.ad} ${ogrenci.soyad}` : "";
  const grup = ogrenci ? [ogrenci.grup, ogrenci.altGrup].filter(Boolean).join(" / ") : "";
  const donem = donemBilgisi(veri);
  const { data: donemler = [] } = useDonemler();
  const donemAdi = donemler.find((d) => d.id === ayarlar.donemId)?.ad ?? "";
  const dilEtiket = ayarlar.dil ? DIL_ETIKET[ayarlar.dil] : "";
  const [secmeliAcik, setSecmeliAcik] = useState(false);

  // Ad, grup ve dönem yüklenen dosyalardan gelir; bulununca tercih olarak da kaydedilir.
  useEffect(() => {
    const patch: Partial<Ayarlar> = {};
    if (ad && ad !== ayarlar.ogrenciAdi) patch.ogrenciAdi = ad;
    if (grup && grup !== ayarlar.grup) patch.grup = grup;
    if (donem && donem !== ayarlar.donem) patch.donem = donem;
    if (Object.keys(patch).length) guncelle(patch);
  }, [ad, grup, donem]);
  const MODLAR = [
    ["goster", "Göster"],
    ["cakismayan", "Çakışmıyorsa"],
    ["gizle", "Gizle"],
  ] as const;

  return (
    <AppShell baslik="Ayarlar" aciklama="Uygulama tercihleri">
      <div className="space-y-3">        {secmeliAcik ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label="Seçmeli dersler"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl"><div className="mb-4 flex items-center gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg font-bold">Seçmeli dersler</h2><p className="text-xs text-muted-foreground">Her gruptan bir ders seçebilirsin; seçimin takvimine otomatik eklenir.</p></div><button onClick={() => setSecmeliAcik(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">Kapat</button></div><SecmeliSecici /></div></div> : null}
        <section data-tur="ogrenci-bilgi" className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold">Öğrenci Bilgileri</h2>
          <div className="mt-3 space-y-3">
            <div>
              <span className="text-xs text-muted-foreground">Dönem ve dil</span>
              <div className="mt-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium">
                {donemAdi ? `${donemAdi} · ${dilEtiket}` : "Numaran listelerde bulununca otomatik gelir"}
              </div>
              <span className="mt-1 block text-[11px] text-muted-foreground">Dönemin ve dilin öğrenci numarandan otomatik belirlenir; ders programı, uygulamalar ve öğrenci listesi buna göre gelir.</span>
            </div>

            <label className="block">
              <span className="text-xs text-muted-foreground">Öğrenci numarası (değiştirilemez)</span>
              <input
                readOnly
                value={ayarlar.ogrenciNo ?? ""}
                className="mt-1 w-full cursor-not-allowed rounded-xl border border-border bg-accent px-3 py-2 text-sm text-muted-foreground"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {!veri.ogrenciler
                  ? "Bu dönemin öğrenci listesi henüz eklenmedi."
                  : ogrenci
                    ? `✓ ${ogrenci.ad} ${ogrenci.soyad} · Grup ${ogrenci.grup} · Alt grup ${ogrenci.altGrup || "—"}`
                    : ayarlar.ogrenciNo
                      ? "Bu numara listede bulunamadı."
                      : "Numaranı yazınca bilgilerin ve uygulama grubun otomatik gelir."}
              </span>
            </label>
            <BilgiAlani
              etiket="Ad"
              deger={ad || ayarlar.ogrenciAdi}
              kaynak={ad ? "Öğrenci listesinden çekildi" : null}
              onDegistir={(v) => guncelle({ ogrenciAdi: v })}
            />
            <BilgiAlani
              etiket="Dönem"
              deger={donem || ayarlar.donem}
              kaynak={donem ? "Dönemin ders programından çekildi" : null}
              onDegistir={(v) => guncelle({ donem: v })}
            />
            <BilgiAlani
              etiket="Grup"
              deger={grup || ayarlar.grup}
              kaynak={grup ? "Öğrenci listesinden çekildi" : null}
              onDegistir={(v) => guncelle({ grup: v })}
            />
          </div>
        </section>

        <section data-tur="takvim-gorunum" className="rounded-2xl border border-border bg-surface p-4">
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
          <div className="mt-4">
            <span className="text-sm">Online dersler</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["goster", "Hepsini göster"],
                  ["cakismayan", "Çakışmıyorsa göster"],
                  ["gizle", "Hiç gösterme"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => guncelle({ onlineGorunum: v })}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    (ayarlar.onlineGorunum ?? "goster") === v
                      ? "border-teorik bg-teorik-soft text-teorik"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              "Çakışmıyorsa göster": aynı saatte yüz yüze bir ders varsa online ders gizlenir.
            </p>
            {onlineDersler.length ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Ders bazında (seçilmezse yukarıdaki genel ayar geçerli)
                </p>
                {onlineDersler.map((ad) => {
                  const mod = dersAyar[ad];
                  return (
                    <div
                      key={ad}
                      className="flex flex-col gap-2 rounded-xl border border-border p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0 truncate text-sm">{ad}</span>
                      <div className="flex shrink-0 rounded-lg border border-border p-0.5">
                        {MODLAR.map(([v, l]) => (
                          <button
                            key={v}
                            onClick={() => {
                              const next = { ...dersAyar };
                              if (mod === v) delete next[ad];
                              else next[ad] = v;
                              guncelle({ onlineDersAyarlari: next });
                            }}
                            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                              mod === v
                                ? "bg-teorik-soft text-teorik"
                                : "text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          <label className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <span>
              <span className="block text-sm">Telafi uygulamalarını göster</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Türkçe telafi uygulamaları ile İngilizce Laboratory Skills telafi derslerini takvimde gösterir.</span>
            </span>
            <input
              type="checkbox"
              checked={ayarlar.telafiGoster ?? true}
              onChange={(e) => guncelle({ telafiGoster: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-[var(--teorik)]"
            />
          </label>
          <button type="button" data-tur="secmeli-ayarlari" onClick={() => setSecmeliAcik(true)} className="mt-4 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-accent">Seçmeli derslerini seç</button>
        </section>

        <PwaKurulum />

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <h2 className="text-sm font-bold text-destructive">Tehlike Bölgesi</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Seçili seçmeli ders sayısı: {secili.length}. Seçimlerin ve elle yaptığın amfi
            atamaları bu cihazda saklanır.
          </p>
          <button
            onClick={() => {
              if (!window.confirm("Tüm yerel tercihlerin sıfırlanacak. Devam etmek istiyor musun?")) return;
              window.localStorage.clear();
              window.location.reload();
            }}
            className="mt-3 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Tüm tercihleri sıfırla
          </button>
          <button
            onClick={() => void (async () => {
              if (!window.confirm("Hesabın ve sana ait tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musun?")) return;
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) throw new Error("Oturum bulunamadı.");
                const yanit = await fetch("/api/hesabimi-sil", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
                if (!yanit.ok) throw new Error("Hesap silinemedi.");
                window.localStorage.clear();
                await cikis();
              } catch (e) { toast.error(e instanceof Error ? e.message : "Hesap silinemedi."); }
            })()}
            className="mt-3 ml-2 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
          >
            Hesabımı ve tüm verilerimi sil
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function BilgiAlani({
  etiket,
  deger,
  kaynak,
  onDegistir,
}: {
  etiket: string;
  deger: string;
  kaynak: string | null;
  onDegistir: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{etiket}</span>
      {kaynak ? (
        <div className="mt-1 rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-sm font-semibold break-words">{deger || "—"}</p>
          <p className="mt-0.5 text-[11px] font-medium text-teorik">✓ {kaynak}</p>
        </div>
      ) : (
        <>
          <input
            value={deger}
            onChange={(e) => onDegistir(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bu bilgiyi yüklediğin dosyalardan otomatik dolduruyoruz — henüz dosya yoksa elle
            yazabilirsin.
          </p>
        </>
      )}
    </label>
  );
}
