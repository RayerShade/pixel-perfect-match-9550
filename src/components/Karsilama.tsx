import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarDays, MapPin, Clock3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

const hafta = [
  {
    gun: "Pazartesi",
    dersler: [
      ["09:00–10:00", "Anatomi", "Aziz Sancar Amfisi", "Teorik"],
      ["13:00–15:00", "Temel Yaşam Desteği", "Uygulama Salonu 2", "Uygulama"],
    ],
  },
  { gun: "Salı", dersler: [["10:00–11:00", "Histoloji", "Amfi B", "Teorik"]] },
  { gun: "Çarşamba", dersler: [["11:00–12:00", "Tıp Tarihi ve Etik", "Amfi C", "Teorik"]] },
  { gun: "Perşembe", dersler: [["09:00–10:00", "Biyokimya", "Amfi A", "Teorik"]] },
  { gun: "Cuma", dersler: [["14:00–15:30", "Tıbbi İletişim", "Derslik 3", "Seçmeli"]] },
];
export function Karsilama() {
  const { user } = useAuth();
  const [gun, setGun] = useState(0);
  return (
    <AppShell baslik="Ana sayfa" anaSayfa>
      <section className="welcome-heading">
        <div>
          <small>İstanbul Tıp Fakültesi</small>
          <h1>Kişisel ders takvimin</h1>
          <p>Dönemine, pratik grubuna ve seçmelilerine göre haftanı planla.</p>
        </div>
        <div>
          {user ? (
            <Link to="/takvim" className="primary-action">
              Takvimimi aç <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link className="secondary-action" to="/auth" search={{ ekran: "kayit" }}>
                Kayıt ol
              </Link>
              <Link className="primary-action" to="/auth" search={{ ekran: "giris" }}>
                Giriş yap <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="sample-week">
        <header>
          <CalendarDays />
          <h2>Haftalık program</h2>
          <small>Örnek hafta · 16–20 Kasım 2026</small>
        </header>
        <div className="sample-layout">
          <aside>
            <small>Günün dersleri</small>
            <h2>{hafta[gun]!.gun}</h2>
            {hafta[gun]!.dersler.map(([saat, ad, yer]) => (
              <article key={ad}>
                <b>{ad}</b>
                <span>
                  <Clock3 size={13} />
                  {saat}
                </span>
                <span>
                  <MapPin size={13} />
                  {yer}
                </span>
              </article>
            ))}
          </aside>
          <div className="sample-scroll">
            <div className="sample-grid">
              <div className="time-rail">
                <b>Saat</b>
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i}>{String(8 + i).padStart(2, "0")}:00</span>
                ))}
              </div>
              {hafta.map((g, i) => (
                <div key={g.gun} className="sample-day">
                  <button aria-pressed={gun === i} onClick={() => setGun(i)}>
                    {g.gun}
                    <strong>{16 + i} Kas</strong>
                  </button>
                  <div>
                    {g.dersler.map(([saat, ad, yer, tur]) => (
                      <button
                        key={ad}
                        data-kind={tur}
                        onClick={() => setGun(i)}
                        style={{
                          top: (Number(saat!.slice(0, 2)) - 8) * 44,
                          height: Math.max(
                            44,
                            (Number(saat!.slice(6, 8)) +
                              Number(saat!.slice(9)) / 60 -
                              Number(saat!.slice(0, 2))) *
                              44,
                          ),
                        }}
                      >
                        <b>{ad}</b>
                        <small>{yer}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <footer className="clinical-footer">
        <b>İTF Takvimi</b>
        <nav>
          <Link to="/gizlilik">Gizlilik</Link>
          <Link to="/kullanim-sartlari">Kullanım şartları</Link>
          <a href="https://wa.me/qr/WPUHSHXNHQXQC1" target="_blank" rel="noreferrer">
            İletişim
          </a>
        </nav>
      </footer>
    </AppShell>
  );
}
