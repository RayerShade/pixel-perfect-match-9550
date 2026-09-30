import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { buluttanYukle, yerelTemizle } from "./bulut";

export interface Profil {
  id: string;
  email: string | null;
  ad_soyad: string;
  ogrenci_no: string;
}

interface AuthDurumu {
  user: User | null;
  isAdmin: boolean;
  profil: Profil | null;
  hazir: boolean;
  profilTamamla: (ad: string, no: string) => Promise<void>;
  cikis: () => Promise<void>;
}

// Sayfa yeniden yüklenmeden kod güncellendiğinde aynı bağlam korunur (aksi halde "AuthProvider içinde" hatası).
const g = globalThis as unknown as { __authCtx?: React.Context<AuthDurumu | null> };
const Ctx = (g.__authCtx ??= createContext<AuthDurumu | null>(null));

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [hazir, setHazir] = useState(false);
  const yuklenen = useRef<string | null>(null);

  const hazirla = useCallback(async (u: User, ad = "", no = "") => {
    const m = u.user_metadata ?? {};
    const { data: admin } = await supabase.rpc("hesap_hazirla", {
      _ad_soyad: ad || m["ad_soyad"] || m["full_name"] || m["name"] || "",
      _ogrenci_no: no || m["ogrenci_no"] || "",
    });
    setIsAdmin(Boolean(admin));
    const { data: p } = await supabase.from("profiles").select("id, email, ad_soyad, ogrenci_no").eq("id", u.id).maybeSingle();
    setProfil(p);
    return p;
  }, []);

  useEffect(() => {
    // "Beni hatırla" kapalıysa tarayıcı kapatılıp açıldığında oturumu kapat.
    if (localStorage.getItem("ders-takvim:hatirla") === "0" && !sessionStorage.getItem("ders-takvim:oturum")) {
      void supabase.auth.signOut();
    }
    const kur = async (u: User | null) => {
      if (!u) {
        if (yuklenen.current) yerelTemizle();
        yuklenen.current = null;
        setUser(null);
        setIsAdmin(false);
        setProfil(null);
        setHazir(true);
        return;
      }
      setUser(u);
      if (yuklenen.current === u.id) return;
      if (yuklenen.current) yerelTemizle();
      yuklenen.current = u.id;
      setHazir(false);
      try {
        const p = await hazirla(u);
        await buluttanYukle(u.id, p?.ogrenci_no ?? "", u.user_metadata ?? {});
      } catch (e) {
        console.error(e);
      } finally {
        setHazir(true);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => void kur(session?.user ?? null), 0);
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [hazirla, router]);

  const profilTamamla = useCallback(
    async (ad: string, no: string) => {
      if (!user) return;
      await hazirla(user, ad, no);
      await buluttanYukle(user.id, no);
    },
    [user, hazirla],
  );

  const cikis = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    yerelTemizle();
    yuklenen.current = null;
    void router.navigate({ to: "/auth", replace: true });
  }, [queryClient, router]);

  return <Ctx.Provider value={{ user, isAdmin, profil, hazir, profilTamamla, cikis }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth AuthProvider içinde kullanılmalı");
  return c;
}
