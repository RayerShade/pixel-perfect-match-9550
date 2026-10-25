import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaKurulum() {
  const [kurulumEtkinligi, setKurulumEtkinligi] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [kurulu, setKurulu] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setKurulu(standalone);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone);
    const yakala = (event: Event) => {
      event.preventDefault();
      setKurulumEtkinligi(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", yakala);
    return () => window.removeEventListener("beforeinstallprompt", yakala);
  }, []);

  const kur = async () => {
    if (!kurulumEtkinligi) return;
    await kurulumEtkinligi.prompt();
    const sonuc = await kurulumEtkinligi.userChoice;
    if (sonuc.outcome === "accepted") setKurulu(true);
    setKurulumEtkinligi(null);
  };

  if (kurulu) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary"><Download className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Uygulama olarak yükle</h2>
          <p className="mt-1 text-xs text-muted-foreground">Takvimi telefonunun ana ekranına ekleyip tarayıcı çubuğu olmadan uygulama gibi açabilirsin.</p>
          {kurulumEtkinligi ? (
            <button onClick={kur} className="mt-3 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Ana ekrana yükle</button>
          ) : ios ? (
            <p className="mt-3 text-[11px] text-muted-foreground">Safari'de Paylaş simgesine dokunup <strong>Ana Ekrana Ekle</strong> seçeneğini seç.</p>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">Tarayıcı menüsünden <strong>Uygulamayı yükle</strong> veya <strong>Ana ekrana ekle</strong> seçeneğini kullanabilirsin.</p>
          )}
        </div>
      </div>
    </section>
  );
}
