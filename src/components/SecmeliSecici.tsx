import { Check, Eye, EyeOff } from "lucide-react";
import { DERSLER, SECMELILER, secmeliGruplari, secmeliSaatleri, secmeliVeriVar } from "@/lib/schedule-data";
import { GUN_UZUN } from "@/lib/date-utils";
import { useAyarlar, useSecmeliler, useYuklenenVeri } from "@/lib/store";

export function SecmeliSecici() {
  const { secili, gizli, toggle, grupSec, gizle, goster } = useSecmeliler();
  const { veri } = useYuklenenVeri();
  const { ayarlar, guncelle } = useAyarlar();
  const gizliGruplar = ayarlar.gizliSecmeliGruplari ?? [];
  const grupGizleToggle = (grup: number) => guncelle({ gizliSecmeliGruplari: gizliGruplar.includes(grup) ? gizliGruplar.filter((g) => g !== grup) : [...gizliGruplar, grup] });
  const gruplar = secmeliVeriVar(veri) ? secmeliGruplari(veri) : null;

  if (gruplar) return <div className="space-y-5">
    {secmeliSaatleri(veri).map((saat, i) => {
      const grup = i + 1, hepsi = gruplar.filter((g) => g.grup === grup), ids = hepsi.map((d) => d.id);
      const secilen = hepsi.find((d) => secili.includes(d.id)), grupGizli = gizliGruplar.includes(grup);
      return <section key={saat} className={grupGizli ? "opacity-60" : undefined}>
        <div className="mb-2 flex items-center gap-2"><div className="min-w-0 flex-1"><h3 className="font-bold">{grup}. Seçmeli · {saat}</h3><p className="text-xs text-muted-foreground">{grupGizli ? "Takvimde gizli" : secilen ? "Seçildi: " + secilen.ad : "Henüz seçilmedi"}</p></div>
          <button onClick={() => grupGizleToggle(grup)} aria-label="Grubu takvimde göster veya gizle" className="rounded-lg border border-border p-2 hover:bg-accent">{grupGizli ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hepsi.map((d) => { const aktif = secili.includes(d.id); return <button key={d.id} onClick={() => grupSec(d.id, ids)} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-xl border p-4 text-left ${aktif ? "border-secmeli bg-secmeli-soft" : "border-border hover:bg-accent"}`}><span className={`grid h-5 w-5 place-items-center rounded-full border ${aktif ? "border-secmeli bg-secmeli text-primary-foreground" : "border-border"}`}>{aktif ? <Check className="h-3 w-3" /> : null}</span><span className="min-w-0"><b className="block truncate text-sm">{d.ad}</b><span className="block truncate text-xs text-muted-foreground">{d.amfi}</span></span></button>; })}</div>
      </section>;
    })}
  </div>;

  const gorunen = SECMELILER.filter((s) => !gizli.includes(s.id));
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gorunen.map((s) => { const aktif = secili.includes(s.id), ders = DERSLER.find((d) => d.electiveId === s.id); return <div key={s.id} className="relative"><button onClick={() => toggle(s.id)} className={`grid w-full grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-xl border p-3 pr-10 text-left ${aktif ? "border-secmeli bg-secmeli-soft" : "border-border hover:bg-accent"}`}><span className={`grid h-5 w-5 place-items-center rounded border ${aktif ? "border-secmeli bg-secmeli text-primary-foreground" : "border-border"}`}>{aktif ? <Check className="h-3 w-3" /> : null}</span><span className="min-w-0"><b className="block truncate text-sm">{s.electiveName}</b><span className="block truncate text-xs text-muted-foreground">{s.courseCode} · {s.instructor}</span>{ders ? <span className="mt-1 block text-xs">{GUN_UZUN[ders.dayOfWeek - 1]} {ders.startTime} · {ders.defaultClassroom}</span> : null}</span></button><button onClick={() => gizle(s.id)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 hover:bg-accent" aria-label="Seçmeliyi gizle"><EyeOff className="h-4 w-4" /></button></div>; })}<div className="sm:col-span-2 text-xs text-muted-foreground">Seçili ders sayısı: {secili.length}</div>{gizli.length ? <button className="sm:col-span-2 text-left text-xs text-primary hover:underline" onClick={() => gizli.forEach(goster)}>Gizlenen seçmelilerin tümünü geri getir</button> : null}</div>;
}
