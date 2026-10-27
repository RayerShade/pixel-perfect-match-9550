import { startOfWeek } from "@/lib/date-utils";
import { haftaninOlaylari, onlineFiltrele, ogrenciBul } from "@/lib/schedule-data";

export type KisiselTakvimOlayi = {
  key: string;
  baslik: string;
  tarih: string;
  baslangic: string;
  bitis: string;
  yer: string;
  aciklama: string;
};

type Kayit = {
  ayarlar?: Record<string, any> | null;
  secmeliler?: string[] | null;
  manuel_amfi?: Record<string, string> | null;
};

export function kisiselTakvimOlaylari(
  program: Record<string, any> | undefined,
  kayit: Kayit | null | undefined,
  baslangic = new Date(),
  gunSayisi = 182,
): KisiselTakvimOlayi[] {
  const veri = program ?? {};
  const ayar = kayit?.ayarlar ?? {};
  const secmeliler = kayit?.secmeliler ?? [];
  const manuel = kayit?.manuel_amfi ?? {};
  const gizliGruplar = Array.isArray(ayar.gizliSecmeliGruplari)
    ? ayar.gizliSecmeliGruplari.filter((n: unknown): n is number => typeof n === "number")
    : [];
  const ogrenci = ogrenciBul(veri, String(ayar.ogrenciNo ?? ""), ayar.grupElle);
  const ilkTarih = baslangic.toISOString().slice(0, 10);
  const sonTarih = new Date(baslangic.getFullYear(), baslangic.getMonth(), baslangic.getDate() + gunSayisi)
    .toISOString()
    .slice(0, 10);
  const sonuc: KisiselTakvimOlayi[] = [];
  const gorulen = new Set<string>();

  for (let gun = 0; gun < gunSayisi; gun += 7) {
    const hafta = startOfWeek(new Date(baslangic.getFullYear(), baslangic.getMonth(), baslangic.getDate() + gun));
    const olaylar = onlineFiltrele(
      haftaninOlaylari(
        hafta,
        secmeliler,
        manuel,
        veri,
        ogrenci,
        gizliGruplar,
        ayar.telafiGoster ?? true,
      ),
      ayar.onlineGorunum ?? "goster",
      ayar.onlineDersAyarlari ?? {},
    );

    for (const olay of olaylar) {
      const tarih = olay.date.toISOString().slice(0, 10);
      if (tarih < ilkTarih || tarih >= sonTarih || gorulen.has(olay.key)) continue;
      gorulen.add(olay.key);
      sonuc.push({
        key: olay.key,
        baslik: olay.ders.courseName,
        tarih,
        baslangic: olay.ders.startTime,
        bitis: olay.ders.endTime,
        yer: olay.amfi ?? olay.ders.defaultClassroom ?? "",
        aciklama: olay.ders.instructor ?? "",
      });
    }
  }

  for (const ders of ayar.ozelDersler ?? []) {
    if (!ders?.tarih || ders.tarih < ilkTarih || ders.tarih >= sonTarih) continue;
    sonuc.push({
      key: `ozel-${ders.id ?? `${ders.tarih}-${ders.startTime}-${ders.ad}`}`,
      baslik: ders.ad ?? "Kişisel ders",
      tarih: ders.tarih,
      baslangic: ders.startTime ?? "09:00",
      bitis: ders.endTime ?? "10:00",
      yer: ders.yer ?? "",
      aciklama: ders.not ?? "",
    });
  }

  return sonuc.sort((a, b) => `${a.tarih}${a.baslangic}`.localeCompare(`${b.tarih}${b.baslangic}`));
}
