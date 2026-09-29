import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ChevronDown, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { VeriYukleme } from "@/components/VeriYukleme";
import { HesapDuzenle } from "@/components/HesapDuzenle";
import { supabase } from "@/integrations/supabase/client";
import { hesapSil } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";
import { useYuklenenVeri } from "@/lib/store";
import { SECMELILER, secmeliGruplari } from "@/lib/schedule-data";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin Paneli — Tıp Ders Programı" },
      { name: "description", content: "Ortak dosyaları yükle, hesapları incele ve yönet." },
      { property: "og:title", content: "Admin Paneli — Tıp Ders Programı" },
      { property: "og:description", content: "Ortak amfi ve seçmeli programı, hesap yönetimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

interface Hesap {
  id: string;
  email: string | null;
  ad_soyad: string;
  ogrenci_no: string;
  created_at: string;
  admin: boolean;
  secmeliler: string[];
  ayarlar: Record<string, unknown>;
  dosyalar: { yillik?: string | undefined; uygulama?: string | undefined; ogrenci?: string | undefined };
  guncelleme?: string | undefined;
}

async function hesaplariGetir(): Promise<Hesap[]> {
  const [p, d, r] = await Promise.all([
    supabase.from("profiles").select("id, email, ad_soyad, ogrenci_no, created_at").order("created_at", { ascending: false }),
    supabase
      .from("user_data")
      .select("user_id, secmeliler, ayarlar, updated_at, yillik:veri->>yillikDosya, uygulama:veri->>uygulamaDosya, ogrenci:veri->>ogrenciDosya"),
    supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
  ]);
  if (p.error) throw p.error;
  const veri = new Map((d.data ?? []).map((x) => [x.user_id, x]));
  const adminler = new Set((r.data ?? []).map((x) => x.user_id));
  return (p.data ?? []).map((h) => {
    const v = veri.get(h.id) as
      | { secmeliler: unknown; ayarlar: unknown; updated_at: string; yillik: string | null; uygulama: string | null; ogrenci: string | null }
      | undefined;
    return {
      ...h,
      admin: adminler.has(h.id),
      secmeliler: (v?.secmeliler as string[]) ?? [],
      ayarlar: (v?.ayarlar as Record<string, unknown>) ?? {},
      dosyalar: { yillik: v?.yillik ?? undefined, uygulama: v?.uygulama ?? undefined, ogrenci: v?.ogrenci ?? undefined },
      guncelleme: v?.updated_at,
    };
  });
}

function Admin() {
  const { user } = useAuth();
  const { veri } = useYuklenenVeri();
  const qc = useQueryClient();
  const sil = useServerFn(hesapSil);
  const [ara, setAra] = useState("");
  const [acik, setAcik] = useState<string | null>(null);
  const { data: hesaplar = [], isLoading, error } = useQuery({ queryKey: ["admin-hesaplar"], queryFn: hesaplariGetir });

  const secmeliAdi = useMemo(() => {
    const m = new Map<string, { ad: string; grup?: number }>();
    SECMELILER.forEach((s) => m.set(s.id, { ad: s.electiveName }));
    secmeliGruplari(veri).forEach((s) => m.set(s.id, { ad: s.ad, grup: s.grup }));
    return m;
  }, [veri]);
  const secenekler = useMemo(() => [...secmeliAdi].map(([id, v]) => ({ id, ...v })), [secmeliAdi]);
  const { data: orijinal = false } = useQuery({
    queryKey: ["orijinal-admin"],
    queryFn: async () => (await supabase.rpc("orijinal_admin_mi")).data === true,
  });
  const yetki = async (h: Hesap) => {
    if (!confirm(h.admin ? `${h.ad_soyad || h.email} kişisinin admin yetkisi alınsın mı?` : `${h.ad_soyad || h.email} admin yapılsın mı?`)) return;
    const { error } = await supabase.rpc("admin_yetki_ayarla", { _user_id: h.id, _ver: !h.admin });
    if (error) return toast.error(error.message);
    toast.success(h.admin ? "Admin yetkisi alındı." : "Admin yetkisi verildi.");
    await qc.invalidateQueries({ queryKey: ["admin-hesaplar"] });
  };

  const liste = hesaplar.filter((h) =>
    `${h.ad_soyad} ${h.ogrenci_no} ${h.email ?? ""}`.toLocaleLowerCase("tr").includes(ara.toLocaleLowerCase("tr")),
  );

  const secmeliSayim = useMemo(() => {
    const c = new Map<string, number>();
    hesaplar.forEach((h) => h.secmeliler.forEach((id) => c.set(id, (c.get(id) ?? 0) + 1)));
    return [...c].sort((a, b) => b[1] - a[1]);
  }, [hesaplar]);

  const hesabiSil = async (h: Hesap) => {
    if (!confirm(`${h.ad_soyad || h.email} hesabı ve tüm verileri kalıcı olarak silinsin mi?`)) return;
    try {
      await sil({ data: { userId: h.id } });
      toast.success("Hesap silindi.");
      await qc.invalidateQueries({ queryKey: ["admin-hesaplar"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Silinemedi.");
    }
  };

  return (
    <AppShell baslik="Admin Paneli" aciklama={`${hesaplar.length} hesap`}>
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-altin" /> Herkes için ortak dosyalar
          </h2>
          <p className="text-xs text-muted-foreground">
            Buraya yüklediğin haftalık amfi programları ve genel seçmeli programı tüm öğrencilerin takvimine yansır.
          </p>
          <VeriYukleme tur="genel" />
        </section>

        {secmeliSayim.length ? (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-2 text-sm font-bold">Seçmeli tercihleri</h2>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {secmeliSayim.map(([id, n]) => (
                <div key={id} className="flex items-center justify-between gap-2 rounded-lg bg-accent px-2.5 py-1.5 text-xs">
                  <span className="truncate">
                    {secmeliAdi.get(id)?.grup ? `${secmeliAdi.get(id)?.grup}. grup · ` : ""}
                    {secmeliAdi.get(id)?.ad ?? id}
                  </span>
                  <span className="shrink-0 font-bold">{n} öğrenci</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder="Ad, öğrenci no veya e-posta ara"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          {isLoading ? <p className="text-sm text-muted-foreground">Hesaplar yükleniyor…</p> : null}
          {error ? <p className="text-sm text-destructive">Hesaplar alınamadı.</p> : null}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {liste.map((h) => {
              const a = acik === h.id;
              return (
                <div key={h.id} className="border-b border-border/70 last:border-0">
                  <button onClick={() => setAcik(a ? null : h.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {h.ad_soyad || "(adsız)"}
                        {h.admin ? <span className="rounded bg-accent px-1.5 text-[10px] font-bold text-altin">ADMIN</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {h.ogrenci_no || "no yok"} · {h.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{h.secmeliler.length} seçmeli</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${a ? "rotate-180" : ""}`} />
                  </button>
                  {a ? (
                    <div className="space-y-3 bg-accent/30 px-3 pb-3 pt-1 text-xs">
                      <Bilgi etiket="Kayıt tarihi" deger={new Date(h.created_at).toLocaleString("tr-TR")} />
                      {h.guncelleme ? <Bilgi etiket="Son güncelleme" deger={new Date(h.guncelleme).toLocaleString("tr-TR")} /> : null}
                      <Bilgi etiket="Grup" deger={String(h.ayarlar["grup"] ?? "—")} />
                      <Bilgi etiket="Yıllık program" deger={h.dosyalar.yillik ?? "yüklenmedi"} />
                      <Bilgi etiket="Uygulama tablosu" deger={h.dosyalar.uygulama ?? "yüklenmedi"} />
                      <Bilgi etiket="Öğrenci listesi" deger={h.dosyalar.ogrenci ?? "yüklenmedi"} />
                      <div>
                        <p className="font-semibold text-muted-foreground">Seçtiği seçmeliler</p>
                        {h.secmeliler.length ? (
                          <ul className="mt-1 list-inside list-disc">
                            {h.secmeliler.map((id) => (
                              <li key={id}>
                                {secmeliAdi.get(id)?.grup ? `${secmeliAdi.get(id)?.grup}. grup: ` : ""}
                                {secmeliAdi.get(id)?.ad ?? id}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1">Seçim yok</p>
                        )}
                      </div>
                      {h.id !== user?.id ? (
                        <HesapDuzenle
                          key={h.id + h.secmeliler.join()}
                          userId={h.id}
                          secili={h.secmeliler}
                          secenekler={secenekler}
                          onKaydedildi={() => void qc.invalidateQueries({ queryKey: ["admin-hesaplar"] })}
                        />
                      ) : null}
                      {h.id !== user?.id ? (
                        <div className="flex flex-wrap gap-2">
                          {orijinal ? (
                            <button
                              onClick={() => void yetki(h)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-semibold text-altin hover:bg-accent"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> {h.admin ? "Admin yetkisini al" : "Admin yap"}
                            </button>
                          ) : null}
                          <button
                            onClick={() => void hesabiSil(h)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 font-semibold text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hesabı sil
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <p>
      <span className="font-semibold text-muted-foreground">{etiket}: </span>
      {deger}
    </p>
  );
}
