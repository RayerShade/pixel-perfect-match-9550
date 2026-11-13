import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AnaSayfaLogosu } from "@/components/Marka";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { NumaraBilgi, useNumaraSorgu } from "@/components/NumaraBilgi";
import { okulEpostasiMi, okulEpostasiZorunluMu } from "@/lib/okul-epostasi";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ekran?: "giris" | "kayit" | "sifre" } => {
    const ekran = search["ekran"];
    return ekran === "giris" || ekran === "kayit" || ekran === "sifre" ? { ekran } : {};
  },
  head: () => ({
    meta: [
      { title: "İTF Takvim — İstanbul Tıp Fakültesi" },
      { name: "description", content: "Ders programı hesabına giriş yap veya yeni hesap oluştur." },
      { property: "og:title", content: "İTF Takvim — İstanbul Tıp Fakültesi" },
      { property: "og:description", content: "Kendi haftalık takvimine erişmek için giriş yap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthSayfasi,
});

type Mod = "giris" | "kayit" | "sifre";

// Zorunluluk artık sunucudaki anahtardan okunur (/sunucu panelinde çevrilir).
// Bu sabit yalnızca anahtara ulaşılamazsa kullanılan güvenli varsayılan: false = herkese açık.
const OKUL_EPOSTASI_ZORUNLU = false;

function AuthSayfasi() {
  const navigate = useNavigate();
  const [hatirla, setHatirla] = useState(true);
  const hatirlamaAyarla = () => {
    localStorage.setItem("ders-takvim:hatirla", hatirla ? "1" : "0");
    sessionStorage.setItem("ders-takvim:oturum", "1");
  };
  const { user, hazir } = useAuth();
  const { ekran } = Route.useSearch();
  const mod = ekran ?? "giris";
  const setMod = (ekran: Mod) => { void navigate({ to: "/auth", search: { ekran } }); };
  const [okulZorunlu, setOkulZorunlu] = useState(OKUL_EPOSTASI_ZORUNLU);
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [goster, setGoster] = useState(false);
  const [no, setNo] = useState("");
  const sorgu = useNumaraSorgu(no);
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (hazir && user) void navigate({ to: "/takvim", replace: true });
  }, [hazir, user, navigate]);

  useEffect(() => {
    const h = sessionStorage.getItem("ders-takvim:giris-hata");
    if (h && hazir && !user) { setMesaj({ ok: false, t: h }); sessionStorage.removeItem("ders-takvim:giris-hata"); }
  }, [hazir, user]);

  // Okul e-postası zorunluluğu sunucudaki anahtardan okunur (kapatılıp geri açılabilir).
  useEffect(() => {
    let iptal = false;
    void okulEpostasiZorunluMu().then((v) => { if (!iptal) setOkulZorunlu(v); });
    return () => { iptal = true; };
  }, []);

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
        if (sifre !== tekrar) throw new Error("Şifreler eşleşmiyor.");
        if (okulZorunlu && !okulEpostasiMi(email)) throw new Error("Sadece @ogr.iu.edu.tr uzantılı İÜ öğrenci e-postasıyla kayıt olunabilir.");
        if (!no.trim()) throw new Error("Öğrenci numarası gerekli.");
        if (sorgu.sonuc?.kayitli) throw new Error("Bu numara zaten başka bir hesaba kayıtlı.");
        const { error } = await supabase.auth.signUp({
          email,
          password: sifre,
          options: { emailRedirectTo: `${window.location.origin}/auth?ekran=giris`, data: { ogrenci_no: no.trim() } },
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
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth?ekran=giris` });
    if (r.error) setMesaj({ ok: false, t: "Google ile giriş yapılamadı." });
  };



  const girdi = "mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="auth-page"><header><AnaSayfaLogosu /><b>İTF Takvim</b><small className="platform-label">Bağımsız Öğrenci Platformu</small><Link to="/" className="auth-back"><ArrowLeft size={15}/> Ana sayfaya dön</Link></header><main className="auth-stage">
      <div className={mod === "kayit" ? "auth-sheet auth-register" : "auth-sheet"}>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AnaSayfaLogosu />
          <div>
            {mod === "kayit" && <small className="registration-label">Yeni öğrenci kaydı</small>}
            <h1 className="text-2xl font-bold tracking-tight">{mod === "kayit" ? "Hesabını Oluştur, Takvimini Cebine Al" : mod === "giris" ? "İTF Takvim’e Giriş Yap" : "Şifreni sıfırla"}</h1>
            <p className="text-xs text-muted-foreground">
              {mod === "giris" ? "Dönemine, grubuna ve seçmelilerine göre hazırlanmış kişisel ders programına eriş." : mod === "kayit" ? "Öğrenci numaranla dönem ve pratik grubuna uygun takvimini oluştur." : "Şifreni sıfırla"}
            </p>
          </div>
        </div>

        {mod !== "sifre" ? (
          <>

            <button onClick={google} className="min-h-11 w-full rounded-xl border border-border bg-background py-2 text-sm font-semibold hover:bg-accent">
              Google ile devam et
            </button>
            <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> veya e-posta ile <span className="h-px flex-1 bg-border" />
            </div>
            {mod === "kayit" ? (
              <p className="mt-2 text-[11px] text-muted-foreground">Google ile girersen öğrenci numaran ilk girişte sorulur.</p>
            ) : null}
          </>
        ) : null}
        <form onSubmit={gonder} className="space-y-3">
          {mod === "kayit" ? (
            <>
              <label className="block text-sm font-medium">Öğrenci numarası<input className={girdi} placeholder="Öğrenci numarası" inputMode="numeric" value={no} onChange={(e) => setNo(e.target.value)} required /></label>
              <NumaraBilgi sonuc={sorgu.sonuc} yukleniyor={sorgu.yukleniyor} />
            </>
          ) : null}
          <label className="block text-sm font-medium">E-posta<input className={girdi} type="email" placeholder="E-posta" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {mod !== "sifre" ? (
            <div className="password-field"><label className="block text-sm font-medium">Şifre<input className={girdi} type={goster ? "text" : "password"} placeholder="Şifre" minLength={mod === "kayit" ? 6 : undefined} autoComplete={mod === "giris" ? "current-password" : "new-password"} value={sifre} onChange={(e) => setSifre(e.target.value)} required /></label><button type="button" aria-label={goster ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setGoster(!goster)}>{goster ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
          ) : null}
          {mod === "giris" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hatirla} onChange={(e) => setHatirla(e.target.checked)} className="h-4 w-4 accent-primary" />
              Beni hatırla
            </label>
          ) : null}
          {mod === "kayit" && <label className="block text-sm font-medium">Şifre tekrarı<input className={girdi} type={goster ? "text" : "password"} autoComplete="new-password" value={tekrar} onChange={e => setTekrar(e.target.value)} required /></label>}
          <button disabled={bekle} className="min-h-11 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {bekle ? "Bekle…" : mod === "giris" ? "Giriş yap" : mod === "kayit" ? "Kayıt ol" : "Bağlantı gönder"}
          </button>
        </form>

        {mesaj ? <p role={mesaj.ok ? "status" : "alert"} className={`mt-3 text-xs font-medium ${mesaj.ok ? "text-primary" : "text-destructive"}`}>{mesaj.t}</p> : null}

        {mod === "giris" ? (
          <button onClick={() => { setMod("sifre"); setMesaj(null); }} className="mt-3 text-xs text-muted-foreground hover:underline">
            Şifreni mi unuttun?
          </button>
        ) : mod === "sifre" ? (
          <button onClick={() => { setMod("giris"); setMesaj(null); }} className="mt-3 text-xs text-muted-foreground hover:underline">
            ← Girişe dön
          </button>
        ) : null}


        {mod === "giris" && <aside className="auth-note"><ShieldCheck size={20}/><div><b>İÜ OBS şifren gerekmez</b><p>İTF Takvimi bağımsız bir öğrenci projesidir. Bu platform için oluşturduğun şifreyi kullan.</p></div></aside>}
        {mod !== "sifre" && <footer>{mod === "kayit" ? "Zaten hesabın var mı?" : "Hesabın yok mu?"} <button onClick={() => {setMod(mod === "kayit" ? "giris" : "kayit");setMesaj(null);}}>{mod === "kayit" ? "Giriş yap" : "Hesap oluştur"}</button></footer>}
      </div></main></div>
  );
}
