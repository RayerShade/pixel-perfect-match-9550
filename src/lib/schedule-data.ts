import { addDays, hashString, isoDate, startOfWeek } from "./date-utils";

export type DersTuru = "teorik" | "pratik" | "pbl" | "secmeli" | "sinav";

export const DERS_TURU_ETIKET: Record<DersTuru, string> = {
  teorik: "Teorik Ders",
  pratik: "Laboratuvar / Pratik",
  pbl: "PDÖ Oturumu",
  secmeli: "Seçmeli Ders",
  sinav: "Sınav",
};

/** Fixed yearly schedule entry (repeats weekly across the semester). */
export interface Ders {
  id: string;
  courseName: string;
  instructor: string;
  courseType: DersTuru;
  dayOfWeek: number; // 1 = Pazartesi ... 7 = Pazar
  date?: string | undefined; // Excel'de belirli tarih varsa (YYYY-MM-DD)
  startTime: string;
  endTime: string;
  defaultClassroom: string;
  group: string;
  semester: string;
  notes: string;
  electiveId?: string;
}

export interface Secmeli {
  id: string;
  electiveName: string;
  instructor: string;
  courseCode: string;
  description: string;
  semester: string;
  quota: number;
}

export interface HaftalikAmfiKaydi {
  id: string;
  week: string; // monday iso
  date: string;
  startTime: string;
  endTime: string;
  courseName: string;
  group: string;
  classroom: string;
  amphitheater: string;
  sourceFile: string;
  status: "eslesti" | "bekliyor";
  confidence: number;
  manuallyConfirmed: boolean;
}

export const SECMELILER: Secmeli[] = [
  {
    id: "sec-etik",
    electiveName: "Tıp Etiği",
    instructor: "Doç. Dr. Elif Korkmaz",
    courseCode: "TIP-S101",
    description: "Klinik karar süreçlerinde etik ilkeler, olgu tartışmaları.",
    semester: "2026 Güz",
    quota: 40,
  },
  {
    id: "sec-sosyoloji",
    electiveName: "Tıp Sosyolojisi",
    instructor: "Dr. Öğr. Üyesi Murat Aslan",
    courseCode: "TIP-S102",
    description: "Sağlık, hastalık ve toplum ilişkisine giriş.",
    semester: "2026 Güz",
    quota: 35,
  },
  {
    id: "sec-tarih",
    electiveName: "Tıp Tarihi",
    instructor: "Prof. Dr. Nihal Demir",
    courseCode: "TIP-S103",
    description: "Antik çağdan modern tıbba hekimliğin gelişimi.",
    semester: "2026 Güz",
    quota: 50,
  },
  {
    id: "sec-bilisim",
    electiveName: "Tıp Bilişimi",
    instructor: "Dr. Öğr. Üyesi Can Erdoğan",
    courseCode: "TIP-S104",
    description: "Elektronik sağlık kayıtları ve klinik veri okuryazarlığı.",
    semester: "2026 Güz",
    quota: 30,
  },
  {
    id: "sec-isaret",
    electiveName: "İşaret Dili",
    instructor: "Öğr. Gör. Selin Yalçın",
    courseCode: "TIP-S105",
    description: "Hasta iletişiminde temel işaret dili becerileri.",
    semester: "2026 Güz",
    quota: 25,
  },
];

export const DERSLER: Ders[] = [
  {
    id: "d-anatomi-1",
    courseName: "Anatomi",
    instructor: "Prof. Dr. Ahmet Yılmaz",
    courseType: "teorik",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "09:50",
    defaultClassroom: "Amfi I",
    group: "A",
    semester: "2026 Güz",
    notes: "Üst ekstremite kemikleri. Atlas getirilmesi önerilir.",
  },
  {
    id: "d-anatomi-2",
    courseName: "Anatomi",
    instructor: "Prof. Dr. Ahmet Yılmaz",
    courseType: "teorik",
    dayOfWeek: 1,
    startTime: "10:10",
    endTime: "11:00",
    defaultClassroom: "Amfi I",
    group: "A",
    semester: "2026 Güz",
    notes: "Eklemler ve bağlar.",
  },
  {
    id: "d-tibba-merhaba",
    courseName: "Tıbba Merhaba",
    instructor: "Prof. Dr. Nihal Demir",
    courseType: "teorik",
    dayOfWeek: 1,
    startTime: "13:00",
    endTime: "13:50",
    defaultClassroom: "Amfi III",
    group: "A",
    semester: "2026 Güz",
    notes: "Hekimlik mesleğine giriş söyleşisi.",
  },
  {
    id: "d-histoloji-1",
    courseName: "Histoloji",
    instructor: "Doç. Dr. Zeynep Kaya",
    courseType: "teorik",
    dayOfWeek: 2,
    startTime: "09:00",
    endTime: "09:50",
    defaultClassroom: "Amfi III",
    group: "A",
    semester: "2026 Güz",
    notes: "Epitel doku sınıflandırması.",
  },
  {
    id: "d-histoloji-lab",
    courseName: "Histoloji Laboratuvarı",
    instructor: "Doç. Dr. Zeynep Kaya",
    courseType: "pratik",
    dayOfWeek: 2,
    startTime: "10:10",
    endTime: "12:00",
    defaultClassroom: "Histoloji Lab. 2",
    group: "A-1",
    semester: "2026 Güz",
    notes: "Önlük zorunludur. Preparat teslimi hafta sonunda.",
  },
  {
    id: "d-biyokimya-1",
    courseName: "Biyokimya",
    instructor: "Prof. Dr. Kemal Şahin",
    courseType: "teorik",
    dayOfWeek: 2,
    startTime: "14:00",
    endTime: "14:50",
    defaultClassroom: "Amfi II",
    group: "A",
    semester: "2026 Güz",
    notes: "Aminoasitler ve peptit bağı.",
  },
  {
    id: "d-fizyoloji-1",
    courseName: "Fizyoloji",
    instructor: "Prof. Dr. Ayşe Tunç",
    courseType: "teorik",
    dayOfWeek: 3,
    startTime: "09:00",
    endTime: "09:50",
    defaultClassroom: "Amfi II",
    group: "A",
    semester: "2026 Güz",
    notes: "Hücre zarı ve taşıma mekanizmaları.",
  },
  {
    id: "d-fizyoloji-2",
    courseName: "Fizyoloji",
    instructor: "Prof. Dr. Ayşe Tunç",
    courseType: "teorik",
    dayOfWeek: 3,
    startTime: "10:10",
    endTime: "11:00",
    defaultClassroom: "Amfi II",
    group: "A",
    semester: "2026 Güz",
    notes: "Membran potansiyeli.",
  },
  {
    id: "d-pdo",
    courseName: "PDÖ Oturumu",
    instructor: "Dr. Öğr. Üyesi Murat Aslan",
    courseType: "pbl",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "15:00",
    defaultClassroom: "PDÖ Odası 5",
    group: "A-3",
    semester: "2026 Güz",
    notes: "Senaryo 2, ikinci oturum. Ön hazırlık gerekli.",
  },
  {
    id: "d-anatomi-lab",
    courseName: "Anatomi Laboratuvarı",
    instructor: "Prof. Dr. Ahmet Yılmaz",
    courseType: "pratik",
    dayOfWeek: 4,
    startTime: "09:00",
    endTime: "11:00",
    defaultClassroom: "Anatomi Lab.",
    group: "A-1",
    semester: "2026 Güz",
    notes: "Diseksiyon salonu kuralları geçerlidir.",
  },
  {
    id: "d-biyokimya-2",
    courseName: "Biyokimya",
    instructor: "Prof. Dr. Kemal Şahin",
    courseType: "teorik",
    dayOfWeek: 4,
    startTime: "11:10",
    endTime: "12:00",
    defaultClassroom: "Amfi II",
    group: "A",
    semester: "2026 Güz",
    notes: "Protein yapıları.",
  },
  {
    id: "d-histoloji-2",
    courseName: "Histoloji",
    instructor: "Doç. Dr. Zeynep Kaya",
    courseType: "teorik",
    dayOfWeek: 4,
    startTime: "14:00",
    endTime: "14:50",
    defaultClassroom: "Amfi III",
    group: "A",
    semester: "2026 Güz",
    notes: "Bağ dokusu.",
  },
  {
    id: "d-fizyoloji-3",
    courseName: "Fizyoloji",
    instructor: "Prof. Dr. Ayşe Tunç",
    courseType: "teorik",
    dayOfWeek: 5,
    startTime: "09:00",
    endTime: "09:50",
    defaultClassroom: "Amfi I",
    group: "A",
    semester: "2026 Güz",
    notes: "Aksiyon potansiyeli.",
  },
  {
    id: "d-anatomi-3",
    courseName: "Anatomi",
    instructor: "Prof. Dr. Ahmet Yılmaz",
    courseType: "teorik",
    dayOfWeek: 5,
    startTime: "10:10",
    endTime: "11:00",
    defaultClassroom: "Amfi I",
    group: "A",
    semester: "2026 Güz",
    notes: "Alt ekstremite girişi.",
  },
  {
    id: "d-kurul-sinavi",
    courseName: "Kurul Değerlendirme Sınavı",
    instructor: "Dekanlık",
    courseType: "sinav",
    dayOfWeek: 5,
    startTime: "15:00",
    endTime: "16:30",
    defaultClassroom: "Amfi I",
    group: "A",
    semester: "2026 Güz",
    notes: "Optik form ve kimlik zorunludur.",
  },
  // Seçmeli dersler — yalnızca öğrenci seçtiyse takvimde görünür
  {
    id: "d-sec-etik",
    courseName: "Tıp Etiği",
    instructor: "Doç. Dr. Elif Korkmaz",
    courseType: "secmeli",
    dayOfWeek: 3,
    startTime: "16:00",
    endTime: "16:50",
    defaultClassroom: "Derslik 204",
    group: "Seçmeli",
    semester: "2026 Güz",
    notes: "Olgu tartışması, katılım notu var.",
    electiveId: "sec-etik",
  },
  {
    id: "d-sec-sosyoloji",
    courseName: "Tıp Sosyolojisi",
    instructor: "Dr. Öğr. Üyesi Murat Aslan",
    courseType: "secmeli",
    dayOfWeek: 2,
    startTime: "16:00",
    endTime: "16:50",
    defaultClassroom: "Derslik 108",
    group: "Seçmeli",
    semester: "2026 Güz",
    notes: "",
    electiveId: "sec-sosyoloji",
  },
  {
    id: "d-sec-tarih",
    courseName: "Tıp Tarihi",
    instructor: "Prof. Dr. Nihal Demir",
    courseType: "secmeli",
    dayOfWeek: 4,
    startTime: "16:00",
    endTime: "16:50",
    defaultClassroom: "Derslik 301",
    group: "Seçmeli",
    semester: "2026 Güz",
    notes: "",
    electiveId: "sec-tarih",
  },
  {
    id: "d-sec-bilisim",
    courseName: "Tıp Bilişimi",
    instructor: "Dr. Öğr. Üyesi Can Erdoğan",
    courseType: "secmeli",
    dayOfWeek: 1,
    startTime: "16:00",
    endTime: "16:50",
    defaultClassroom: "Bilgisayar Lab.",
    group: "Seçmeli",
    semester: "2026 Güz",
    notes: "",
    electiveId: "sec-bilisim",
  },
  {
    id: "d-sec-isaret",
    courseName: "İşaret Dili",
    instructor: "Öğr. Gör. Selin Yalçın",
    courseType: "secmeli",
    dayOfWeek: 5,
    startTime: "13:00",
    endTime: "13:50",
    defaultClassroom: "Derslik 112",
    group: "Seçmeli",
    semester: "2026 Güz",
    notes: "",
    electiveId: "sec-isaret",
  },
];

const AMFILER = ["Amfi I", "Amfi II", "Amfi III", "Amfi IV", "Morfoloji Amfisi"];

/**
 * Sample "weekly amphitheater file" output. In the real app this comes from the
 * uploaded Excel file; here it is derived deterministically from the week key so
 * every week looks plausible and a few rows stay unmatched on purpose.
 */
export interface SecmeliOlay {
  ad: string;
  date: string;
  startTime: string;
  endTime: string;
  amfi: string;
}

export interface YuklenenVeri {
  dersler: Ders[] | null;
  amfi: HaftalikAmfiKaydi[] | null;
  secmeliOlaylari?: SecmeliOlay[] | null | undefined;
  /** Hafta (pazartesi iso) → o haftanın amfi programındaki amfi/derslik adları */
  amfiAdlari?: Record<string, string[]> | null | undefined;
}

const VARSAYILAN_AMFILER = ["Amfi I", "Amfi II", "Amfi III", "Amfi IV", "Morfoloji Amfisi"];

/** Eşleşme bekleyen dersler için amfi seçenekleri: önce o haftanın dosyası, yoksa tüm yüklenen haftalar. */
export function amfiSecenekleri(veri: YuklenenVeri | undefined, mondayIso: string): string[] {
  const adlar = veri?.amfiAdlari;
  if (adlar?.[mondayIso]?.length) return adlar[mondayIso]!;
  const hepsi = new Set<string>(Object.values(adlar ?? {}).flat());
  (veri?.amfi ?? []).forEach((k) => k.amphitheater && hepsi.add(k.amphitheater));
  return hepsi.size ? [...hepsi].sort((a, b) => a.localeCompare(b, "tr")) : VARSAYILAN_AMFILER;
}

export interface SecmeliGrupDersi {
  id: string;
  ad: string;
  grup: number;
  amfi: string;
  saat: string;
}

const SECMELI_SLOT = /^se[çc]meli ders/i;
const trBaslik = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("tr-TR"));

/** Yıllık programdaki "Seçmeli Dersler - N" saatleri → grup saatleri (1., 2., 3. seçmeli). */
export function secmeliSaatleri(veri?: YuklenenVeri): string[] {
  const set = new Set(
    (veri?.dersler ?? []).filter((d) => SECMELI_SLOT.test(d.courseName)).map((d) => d.startTime),
  );
  const l = [...set].sort();
  return l.length ? l : ["13:30", "14:20", "15:10"];
}

export function secmeliGruplari(veri?: YuklenenVeri): SecmeliGrupDersi[] {
  const saatler = secmeliSaatleri(veri);
  const map = new Map<string, SecmeliGrupDersi>();
  const sirali = [...(veri?.secmeliOlaylari ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  for (const o of sirali) {
    const grup = saatler.indexOf(o.startTime) + 1;
    if (!grup) continue;
    const ad = trBaslik(o.ad);
    const id = `g${grup}-${ad.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]+/g, "-")}`;
    map.set(id, { id, ad, grup, amfi: o.amfi, saat: o.startTime });
  }
  return [...map.values()].sort((a, b) => a.grup - b.grup || a.ad.localeCompare(b.ad, "tr"));
}


const ONEMSIZ = new Set(["dönem", "türkçe", "ingilizce", "dilimi", "dilim", "oturum", "ders", "dersi", "grubu"]);
const kelimeler = (s: string) =>
  new Set(
    s
      .toLocaleLowerCase("tr-TR")
      .split(/[^a-zçğıöşü]+/)
      .filter((w) => w.length >= 4 && !ONEMSIZ.has(w)),
  );
const dk = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const kesisir = (d: Ders, k: HaftalikAmfiKaydi) =>
  dk(d.startTime) < dk(k.endTime || k.startTime) + (k.endTime ? 0 : 1) && dk(k.startTime) < dk(d.endTime);
/** Yıllık programdaki ders ile amfi kaydı arasındaki isim benzerliği (0..1). */
function benzerlik(d: Ders, k: HaftalikAmfiKaydi) {
  const a = kelimeler(`${d.courseName} ${d.notes} ${d.instructor}`);
  const b = kelimeler(k.courseName);
  if (!b.size) return 0;
  let ortak = 0;
  b.forEach((w) => {
    if ([...a].some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))) ortak++;
  });
  return ortak / b.size;
}
function enIyiKayit(d: Ders, tarih: string, kayitlar: HaftalikAmfiKaydi[]) {
  const aday = kayitlar.filter((k) => k.date === tarih && kesisir(d, k));
  let en: HaftalikAmfiKaydi | undefined;
  let skor = -1;
  for (const k of aday) {
    const s = benzerlik(d, k);
    if (s > skor) {
      skor = s;
      en = k;
    }
  }
  return en ? { kayit: en, skor } : undefined;
}

export function aktifDersler(veri?: YuklenenVeri): Ders[] {
  return veri?.dersler ?? DERSLER;
}

export function haftalikAmfiKayitlari(mondayIso: string, veri?: YuklenenVeri): HaftalikAmfiKaydi[] {
  if (veri?.amfi || veri?.dersler) {
    const dersler = aktifDersler(veri);
    return (veri.amfi ?? [])
      .filter((k) => k.week === mondayIso)
      .map((k) => {
        const dow = ((new Date(`${k.date}T00:00:00`).getDay() + 6) % 7) + 1;
        const ayni = dersler.filter(
          (d) => (d.date ? d.date === k.date : d.dayOfWeek === dow) && kesisir(d, k),
        );
        const skor = Math.max(0, ...ayni.map((d) => benzerlik(d, k)));
        const confidence = ayni.length ? 0.6 + 0.4 * skor : 0.3;
        return {
          ...k,
          confidence,
          status: k.amphitheater && ayni.length ? ("eslesti" as const) : ("bekliyor" as const),
        };
      })
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }
  return DERSLER.filter((d) => d.courseType !== "secmeli").map((d) => {
    const seed = hashString(`${mondayIso}-${d.id}`);
    const bekliyor = seed % 11 === 0;
    const amfi =
      d.courseType === "pratik" || d.courseType === "pbl"
        ? d.defaultClassroom
        : AMFILER[seed % AMFILER.length]!;
    const date = isoDate(addDays(new Date(`${mondayIso}T00:00:00`), d.dayOfWeek - 1));
    return {
      id: `${mondayIso}-${d.id}`,
      week: mondayIso,
      date,
      startTime: d.startTime,
      endTime: d.endTime,
      courseName: d.courseName,
      group: d.group,
      classroom: bekliyor ? "" : amfi,
      amphitheater: bekliyor ? "" : amfi,
      sourceFile: `haftalik_amfi_${mondayIso}.xlsx`,
      status: bekliyor ? "bekliyor" : "eslesti",
      confidence: bekliyor ? 0.41 : 0.93 + (seed % 7) / 100,
      manuallyConfirmed: false,
    };
  });
}

export interface DersOlayi {
  key: string;
  ders: Ders;
  date: Date;
  amfi: string | null; // null => eşleşme bekliyor
  group: string;
}

export function haftaninOlaylari(
  monday: Date,
  seciliSecmeliler: string[],
  manuelAmfiler: Record<string, string>,
  veri?: YuklenenVeri,
): DersOlayi[] {
  const mondayIso = isoDate(monday);
  const pazar = isoDate(addDays(monday, 6));
  const kayitlar = haftalikAmfiKayitlari(mondayIso, veri);
  const tarihOf = (d: Ders) => d.date ?? isoDate(addDays(monday, d.dayOfWeek - 1));
  const bul = (d: Ders) => enIyiKayit(d, tarihOf(d), kayitlar)?.kayit;
  const gruplar = veri?.secmeliOlaylari?.length ? secmeliGruplari(veri) : null;
  const saatler = gruplar ? secmeliSaatleri(veri) : [];

  return aktifDersler(veri).filter(
    (d) =>
      (!d.electiveId || seciliSecmeliler.includes(d.electiveId)) &&
      (!d.date || (d.date >= mondayIso && d.date <= pazar)),
  ).map((d) => {
    const key = `${mondayIso}-${d.id}`;
    if (gruplar && SECMELI_SLOT.test(d.courseName)) {
      const grup = saatler.indexOf(d.startTime) + 1;
      const sec = gruplar.find((g) => g.grup === grup && seciliSecmeliler.includes(g.id));
      const t = tarihOf(d);
      const buHafta = sec
        ? veri?.secmeliOlaylari?.find((o) => o.date === t && trBaslik(o.ad) === sec.ad)
        : undefined;
      const haftaVerisiVar = veri?.secmeliOlaylari?.some((o) => o.date === t);
      // Seçilen dersin bu hafta dersi yoksa takvime ekleme
      if (sec && haftaVerisiVar && !buHafta) return null;
      return {
        key,
        ders: {
          ...d,
          courseName: sec ? sec.ad : `${grup}. Seçmeli (seçilmedi)`,
          defaultClassroom: sec ? sec.amfi : "Seçmeliler sayfasından seç",
          notes: `${grup}. seçmeli grubu${d.notes ? ` · ${d.notes}` : ""}`,
        },
        date: new Date(`${t}T00:00:00`),
        amfi: manuelAmfiler[key] ?? (sec ? (buHafta?.amfi ?? null) : "Seçmeliler sayfasından seç"),
        group: d.group,
      };
    }
    const kayit = bul(d);
    const manuel = manuelAmfiler[key];
    let amfi: string | null;
    if (manuel) amfi = manuel;
    else if (d.courseType === "secmeli" && d.electiveId) amfi = d.defaultClassroom || null;
    else if (kayit) amfi = kayit.status === "eslesti" ? kayit.amphitheater : null;
    else amfi = d.defaultClassroom || null;

    return {
      key,
      ders: d,
      date: new Date(`${tarihOf(d)}T00:00:00`),
      amfi,
      group: d.group,
    };
  });
}

export function ayinOlaylari(
  ayIcindeBirGun: Date,
  seciliSecmeliler: string[],
  manuelAmfiler: Record<string, string>,
  veri?: YuklenenVeri,
): DersOlayi[] {
  const ilk = new Date(ayIcindeBirGun.getFullYear(), ayIcindeBirGun.getMonth(), 1);
  const son = new Date(ayIcindeBirGun.getFullYear(), ayIcindeBirGun.getMonth() + 1, 0);
  const olaylar: DersOlayi[] = [];
  let hafta = startOfWeek(ilk);
  while (hafta <= son) {
    olaylar.push(...haftaninOlaylari(hafta, seciliSecmeliler, manuelAmfiler, veri));
    hafta = addDays(hafta, 7);
  }
  return olaylar;
}
