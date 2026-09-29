import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Yeni Şifre — Tıp Ders Programı" },
      { name: "description", content: "Ders programı hesabın için yeni şifre belirle." },
      { property: "og:title", content: "Yeni Şifre — Tıp Ders Programı" },
      { property: "og:description", content: "Hesabın için yeni bir şifre belirle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SifreYenile,
});

function SifreYenile() {
  const navigate = useNavigate();
  const [sifre, setSifre] = useState("");
  const [gecerli, setGecerli] = useState(false);
  const [mesaj, setMesaj] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setGecerli(true);
    const { data } = supabase.auth.onAuthStateChange((e) => e === "PASSWORD_RECOVERY" && setGecerli(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const gonder = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: sifre });
    if (error) return setMesaj({ ok: false, t: error.message });
    setMesaj({ ok: true, t: "Şifren güncellendi." });
    setTimeout(() => void navigate({ to: "/" }), 1000);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={gonder} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-lg font-bold">Yeni şifre belirle</h1>
        {gecerli ? (
          <>
            <input type="password" minLength={6} required placeholder="Yeni şifre" value={sifre} onChange={(e) => setSifre(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Kaydet</button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Bu sayfayı e-postana gelen şifre sıfırlama bağlantısıyla açmalısın.</p>
        )}
        {mesaj ? <p className={`text-xs font-medium ${mesaj.ok ? "text-primary" : "text-destructive"}`}>{mesaj.t}</p> : null}
      </form>
    </div>
  );
}
