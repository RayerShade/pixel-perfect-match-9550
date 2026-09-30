import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DonemSecici } from "@/components/DonemSecici";
import type { Dil } from "@/lib/program";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Giriş Yap — Tıp Ders Programı" },
      { name: "description", content: "Ders programı hesabına giriş yap veya yeni hesap oluştur." },
      { property: "og:title", content: "Giriş Yap — Tıp Ders Programı" },
      { property: "og:description", content: "Kendi haftalık takvimine erişmek için giriş yap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthSayfasi,
});

type Mod = "giris" | "kayit" | "sifre";

function AuthSayfasi() {
  const navigate = useNavigate();
  const [hatirla, setHatirla] = useState(true);
  const hatirlamaAyarla = () => {
    localStorage.setItem("ders-takvim:hatirla", hatirla ? "1" : "0");
    sessionStorage.setItem("ders-takvim:oturum", "1");
  };
  const { user, hazir } = useAuth();
  const [mod, setMod] = useState<Mod>("giris");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [no, setNo] = useState("");
  const [donemId, setDonemId] = useState("");
  const [dil, setDil] = useState<Dil | "">("");
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (hazir && user) void navigate({ to: "/", replace: true });
  }, [hazir, user, navigate]);

  const gonder = async (e: FormEvent) => {
    e.preventDefault();
    setBekle(true);
    setMesaj(null);
    try {
      if (mod === "giris") {
        hatirlamaAyarla();
        const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-posta veya şifre hatalı." : error.message);
      } else if (mod === "kayit") {
        if (!no.trim()) throw new Error("Öğrenci numarası gerekli.");
        if (!donemId || !dil) throw new Error("Dönemini ve Türkçe / İngilizce seçimini yap.");
        const { error } = await supabase.auth.signUp({
          email,
          password: sifre,
          options: { emailRedirectTo: window.location.origin, data: { ogrenci_no: no.trim(), donem_id: donemId, dil } },
        });
        if (error) throw error;
        setMesaj({ ok: true, t: "Kayıt alındı! E-postana gelen onay bağlantısına tıkla, sonra giriş yap." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMesaj({ ok: true, t: "Şifre sıfırlama bağlantısı e-postana gönderildi." });
      }
    } catch (err) {
      setMesaj({ ok: false, t: err instanceof Error ? err.message : "Bir hata oluştu." });
    } finally {
      setBekle(false);
    }
  };

  const google = async () => {
    setMesaj(null);
    hatirlamaAyarla();
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMesaj({ ok: false, t: "Google ile giriş yapılamadı." });
  };

  const girdi = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Tıp Ders Programı</h1>
            <p className="text-xs text-muted-foreground">
              {mod === "giris" ? "Hesabına giriş yap" : mod === "kayit" ? "Yeni hesap oluştur" : "Şifreni sıfırla"}
            </p>
          </div>
        </div>

        {mod !== "sifre" ? (
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-accent p-1 text-sm font-semibold">
            {(["giris", "kayit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMod(m); setMesaj(null); }}
                className={`rounded-md py-1.5 ${mod === m ? "bg-surface shadow-sm" : "text-muted-foreground"}`}
              >
                {m === "giris" ? "Giriş" : "Kayıt ol"}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={gonder} className="space-y-3">
          {mod === "kayit" ? (
            <>
              <DonemSecici donemId={donemId} dil={dil} onDegis={(a, b) => { setDonemId(a); setDil(b); }} />
              <input className={girdi} placeholder="Öğrenci numarası" inputMode="numeric" value={no} onChange={(e) => setNo(e.target.value)} required />
              <p className="text-[11px] text-muted-foreground">Adın, öğrenci numarandan öğrenci listesinden otomatik alınır.</p>
            </>
          ) : null}
          <input className={girdi} type="email" placeholder="E-posta" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mod !== "sifre" ? (
            <input className={girdi} type="password" placeholder="Şifre" minLength={6} autoComplete={mod === "giris" ? "current-password" : "new-password"} value={sifre} onChange={(e) => setSifre(e.target.value)} required />
          ) : null}
          {mod === "giris" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hatirla} onChange={(e) => setHatirla(e.target.checked)} className="h-4 w-4 accent-primary" />
              Beni hatırla
            </label>
          ) : null}
          <button disabled={bekle} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {bekle ? "Bekle…" : mod === "giris" ? "Giriş yap" : mod === "kayit" ? "Kayıt ol" : "Bağlantı gönder"}
          </button>
        </form>

        {mesaj ? <p className={`mt-3 text-xs font-medium ${mesaj.ok ? "text-primary" : "text-destructive"}`}>{mesaj.t}</p> : null}

        {mod === "giris" ? (
          <button onClick={() => { setMod("sifre"); setMesaj(null); }} className="mt-3 text-xs text-muted-foreground hover:underline">
            Şifreni mi unuttun?
          </button>
        ) : mod === "sifre" ? (
          <button onClick={() => { setMod("giris"); setMesaj(null); }} className="mt-3 text-xs text-muted-foreground hover:underline">
            ← Girişe dön
          </button>
        ) : null}

        {mod !== "sifre" ? (
          <>
            <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> veya <span className="h-px flex-1 bg-border" />
            </div>
            <button onClick={google} className="w-full rounded-lg border border-border bg-background py-2 text-sm font-semibold hover:bg-accent">
              Google ile devam et
            </button>
            {mod === "kayit" ? (
              <p className="mt-2 text-[11px] text-muted-foreground">Google ile girersen öğrenci numaran ve dönemin ilk girişte sorulur.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
