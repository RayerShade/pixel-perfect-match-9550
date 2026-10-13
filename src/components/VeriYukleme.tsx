import { SheetsTusu, type SheetsTur } from "@/components/SheetsTusu";
import { SheetsTakip } from "@/components/SheetsTakip";
import { useRef, useState } from "react";
import { BookMarked, CalendarRange, FileSpreadsheet, FlaskConical, Trash2, Upload, Users } from "lucide-react";
import { ogrenciListesiOku, uygulamaTablosuOku } from "@/lib/uygulama-import";
import { genelSecmeliOku } from "@/lib/secmeli-import";
import { haftalikAmfiOku, yillikProgramOku } from "@/lib/excel-import";
import { useYuklenenVeri } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { amfiArsivBirlestir, amfiArsivOzeti, type YuklenenVeri } from "@/lib/schedule-data";
import { useAuth } from "@/lib/auth";
import { dosyaBulutaKaydet, dosyaBuluttanSil, dosyaGuvenli } from "@/lib/dosya-bulut";

function YuklemeKarti({
  baslik,
  aciklama,
  ikon,
  durum,
  onDosya,
  onSil,
  kaynak,
}: {
  kaynak?: { anahtar: string; tur: SheetsTur } | undefined;
  baslik: string;
  aciklama: string;
  ikon: React.ReactNode;
  durum: string | null;
  onDosya: (f: File) => Promise<string>;
  onSil: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [mesaj, setMesaj] = useState<{ ok: boolean; t: string } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const sec = async (f: File | undefined) => {
    if (!f) return;
    setYukleniyor(true);
    try {
      await dosyaGuvenli(f);
      setMesaj({ ok: true, t: await onDosya(f) });
    } catch (e) {
      setMesaj({ ok: false, t: e instanceof Error ? e.message : "Dosya okunamadı." });
    } finally {
      setYukleniyor(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-primary">{ikon}</span>
        <p className="text-sm font-semibold">{baslik}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{aciklama}</p>
      {durum ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-accent px-2.5 py-1.5 text-xs">
          <span className="truncate font-medium">{durum}</span>
          <button onClick={onSil} aria-label="Kaldır" className="shrink-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {mesaj ? (
        <p className={`mt-2 text-xs font-medium ${mesaj.ok ? "text-primary" : "text-destructive"}`}>{mesaj.t}</p>
      ) : null}
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => sec(e.target.files?.[0])}
      />
      <button
        onClick={() => ref.current?.click()}
        disabled={yukleniyor}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" />
        {yukleniyor ? "Okunuyor…" : "Excel dosyası seç"}
      </button>
      <SheetsTusu className="mt-2" kaynak={kaynak} onDosya={async (f) => setMesaj({ ok: true, t: await onDosya(f) })} />
    </div>
  );
}

export function VeriYukleme({ tur = "kisisel" }: { tur?: "kisisel" | "genel" }) {
  const { veri, kaydet } = useYuklenenVeri();
  const { user } = useAuth();
  const bulut = (t: "yillik" | "uygulama" | "ogrenci", f?: File) => {
    if (!user) return;
    void (f ? dosyaBulutaKaydet(user.id, t, f) : dosyaBuluttanSil(user.id, t));
  };
  const k = tur === "kisisel";
  const g = tur === "genel";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {k ? (
      <YuklemeKarti
        baslik="Yıllık ders programı"
        aciklama="Ders, saat (başlangıç–bitiş), gün veya tarih, öğretim üyesi sütunlarını otomatik tanır. Yüklenince örnek veriler yerine bu program kullanılır."
        ikon={<CalendarRange className="h-4 w-4" />}
        durum={veri.dersler ? `${veri.yillikDosya ?? "Yıllık program"} · ${veri.dersler.length} ders` : null}
        onDosya={async (f) => {
          const dersler = await yillikProgramOku(f);
          if (!dersler.length)
            throw new Error("Ders bulunamadı. Başlık satırında 'Ders' ve 'Saat' (veya Başlangıç/Bitiş) sütunları olmalı.");
          kaydet({ dersler, yillikDosya: f.name });
          bulut("yillik", f);
          return `${dersler.length} ders içe aktarıldı.`;
        }}
        onSil={() => { kaydet({ dersler: null, yillikDosya: undefined }); bulut("yillik"); }}
      />
      ) : null}
      {g ? (
      <YuklemeKarti
        baslik="Haftalık amfi programı"
        kaynak={{ anahtar: "amfi", tur: "amfi" }}
        aciklama="Tarih, saat, ders ve amfi/derslik sütunlarını okur; yalnızca dosyadaki haftaların amfilerini günceller. Aynı Google Sheets bağlantısı her hafta değişse bile önceki haftalar arşivde saklanır ve takvimde görünmeye devam eder."
        ikon={<FileSpreadsheet className="h-4 w-4" />}
        durum={
          veri.amfi?.length
            ? `Arşiv: ${amfiArsivOzeti(veri.amfi).hafta} hafta · ${veri.amfi.length} kayıt (eski haftalar saklanır)`
            : null
        }
        onDosya={async (f) => {
          const { kayitlar: yeni, secmeliler, amfiAdlari } = await haftalikAmfiOku(f);
          if (!yeni.length && !secmeliler.length)
            throw new Error("Kayıt bulunamadı. Başlıkta 'Tarih', 'Saat' ve 'Amfi/Derslik' sütunları olmalı.");
          // Sunucudaki güncel arşivi baz al (otomatik Sheets kontrolü bu arada yeni hafta eklemiş olabilir).
          const { data: guncel } = await supabase.from("global_data").select("veri").eq("anahtar", "amfi").maybeSingle();
          const taban = (guncel?.veri as Partial<YuklenenVeri> | null) ?? veri;
          const birlesik = amfiArsivBirlestir(
            { amfi: taban.amfi ?? veri.amfi, secmeliOlaylari: taban.secmeliOlaylari ?? veri.secmeliOlaylari, amfiAdlari: taban.amfiAdlari ?? veri.amfiAdlari },
            { kayitlar: yeni, secmeliler, amfiAdlari },
          );
          const haftalar = new Set(yeni.map((k) => k.week));
          kaydet({
            ...birlesik,
            amfiDosyalari: [...(veri.amfiDosyalari ?? []).filter((d) => d !== f.name), f.name],
          });
          const oz = amfiArsivOzeti(birlesik.amfi);
          return `${yeni.length} kayıt · ${haftalar.size} hafta güncellendi · arşivde toplam ${oz.hafta} hafta / ${oz.kayit} kayıt.`;
        }}
        onSil={() => kaydet({ amfi: null, secmeliOlaylari: null, amfiAdlari: null, amfiDosyalari: undefined })}
      />
      ) : null}
      {k ? (
      <YuklemeKarti
        baslik="Uygulama tablosu"
        aciklama="Uygulama tarihleri, saatleri ve her uygulamaya giden grupları okur. Öğrenci numaran Ayarlar'da girildiyse sadece senin grubunun uygulamaları takvime eklenir."
        ikon={<FlaskConical className="h-4 w-4" />}
        durum={veri.uygulamalar?.length ? `${veri.uygulamaDosya ?? "Uygulama tablosu"} · ${veri.uygulamalar.length} uygulama` : null}
        onDosya={async (f) => {
          const uygulamalar = await uygulamaTablosuOku(f);
          if (!uygulamalar.length) throw new Error("Uygulama bulunamadı. 'Uygulama Tarihi' ve 'Saat' başlıklı tablolar olmalı.");
          kaydet({ uygulamalar, uygulamaDosya: f.name });
          bulut("uygulama", f);
          return `${uygulamalar.length} uygulama oturumu bulundu.`;
        }}
        onSil={() => { kaydet({ uygulamalar: null, uygulamaDosya: undefined }); bulut("uygulama"); }}
      />
      ) : null}
      {k ? (
      <YuklemeKarti
        baslik="Öğrenci listesi"
        aciklama="Grup, alt grup ve öğrenci numaralarını okur. Ayarlar'a numaranı yazınca adın ve grubun otomatik gelir."
        ikon={<Users className="h-4 w-4" />}
        durum={veri.ogrenciler ? `${veri.ogrenciDosya ?? "Öğrenci listesi"} · ${Object.keys(veri.ogrenciler).length} öğrenci` : null}
        onDosya={async (f) => {
          const ogrenciler = await ogrenciListesiOku(f);
          const n = Object.keys(ogrenciler).length;
          if (!n) throw new Error("Öğrenci bulunamadı. Sütunlar: Grup, Alt Grup, Öğrenci No, Ad, Soyad.");
          kaydet({ ogrenciler, ogrenciDosya: f.name });
          bulut("ogrenci", f);
          return `${n} öğrenci içe aktarıldı.`;
        }}
        onSil={() => { kaydet({ ogrenciler: null, ogrenciDosya: undefined }); bulut("ogrenci"); }}
      />
      ) : null}
      {g ? (
      <YuklemeKarti
        baslik="Genel seçmeli ders programı"
        kaynak={{ anahtar: "secmeli", tur: "secmeli" }}
        aciklama="Tüm seçmeli derslerin adı, hocası, saati ve amfisi önce buradan alınır; eksik bilgiler haftalık amfi programından tamamlanır."
        ikon={<BookMarked className="h-4 w-4" />}
        durum={veri.genelSecmeliler?.length ? `${veri.secmeliDosya ?? "Seçmeli programı"} · ${veri.genelSecmeliler.length} seçmeli` : null}
        onDosya={async (f) => {
          const genelSecmeliler = await genelSecmeliOku(f);
          if (!genelSecmeliler.length) throw new Error("Seçmeli bulunamadı. 'Dersin Adı', 'Saati' ve 'Amfisi' sütunları olmalı.");
          kaydet({ genelSecmeliler, secmeliDosya: f.name });
          return `${genelSecmeliler.length} seçmeli ders içe aktarıldı.`;
        }}
        onSil={() => kaydet({ genelSecmeliler: null, secmeliDosya: undefined })}
      />
      ) : null}
      {g ? <div className="sm:col-span-2"><SheetsTakip anahtarlar={["amfi", "secmeli"]} /></div> : null}
    </div>
  );
}
