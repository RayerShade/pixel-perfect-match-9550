import type { DersOlayi } from "@/lib/schedule-data";
import { DERS_TURU_ETIKET } from "@/lib/schedule-data";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

async function fontBase64(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  let s = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function programPdfIndir(opts: {
  olaylar: DersOlayi[];
  baslik: string;
  ogrenci?: string;
  donem?: string;
  dosyaAdi: string;
}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const [n, k] = await Promise.all([fontBase64("/fonts/DejaVuSans.ttf"), fontBase64("/fonts/DejaVuSans-Bold.ttf")]);
  doc.addFileToVFS("DV.ttf", n);
  doc.addFont("DV.ttf", "DV", "normal");
  doc.addFileToVFS("DVB.ttf", k);
  doc.addFont("DVB.ttf", "DV", "bold");
  doc.setFont("DV", "bold");
  doc.setFontSize(15);
  doc.text(`Ders Programı — ${opts.baslik}`, 14, 15);
  doc.setFont("DV", "normal");
  doc.setFontSize(9);
  const alt = [opts.ogrenci, opts.donem].filter(Boolean).join(" · ");
  if (alt) doc.text(alt, 14, 21);

  const sirali = [...opts.olaylar].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.ders.startTime.localeCompare(b.ders.startTime),
  );
  const govde = sirali.map((o) => [
    `${o.date.toLocaleDateString("tr-TR")}\n${GUNLER[o.date.getDay()]}`,
    `${o.ders.startTime}–${o.ders.endTime}`,
    o.ders.courseName,
    DERS_TURU_ETIKET[o.ders.courseType] ?? "",
    o.amfi ?? o.ders.defaultClassroom ?? "",
    o.ders.instructor ?? "",
  ]);

  autoTable(doc, {
    startY: 25,
    head: [["Tarih", "Saat", "Ders", "Tür", "Amfi / Yer", "Öğretim Üyesi"]],
    body: govde.length ? govde : [["", "", "Bu aralıkta ders yok", "", "", ""]],
    styles: { font: "DV", fontSize: 8, cellPadding: 1.8, valign: "middle" },
    headStyles: { font: "DV", fontStyle: "bold", fillColor: [30, 64, 120] },
    alternateRowStyles: { fillColor: [244, 246, 250] },
    columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 24 }, 3: { cellWidth: 22 }, 4: { cellWidth: 40 }, 5: { cellWidth: 55 } },
    didDrawPage: () => {
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text("Resmi değildir — gönüllü proje. itftakvim.xyz", 14, doc.internal.pageSize.getHeight() - 6);
      doc.setTextColor(0);
    },
  });
  doc.save(opts.dosyaAdi);
}
