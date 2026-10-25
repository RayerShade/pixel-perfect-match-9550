<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- New admin-created accounts use server-side bcrypt and the Auth admin password-hash import API after role verification; ordinary signup and all later password changes retain the global Auth password policies.
- Data lives in Lovable Cloud; localStorage is only a per-session cache filled by `src/lib/bulut.ts` on sign-in — keeps existing hooks unchanged.
- Weekly amfi + genel seçmeli are global (`global_data` keys `amfi`/`secmeli`); yearly program, uygulama, öğrenci list are per dönem+dil (`global_data` key `program:<donemId>:<tr|en>`, list in key `donemler`, anon may read only `donemler` for signup) — students never upload.
- Student personal data (settings incl. donemId/dil, own lessons `ozelDersler`, overrides `dersDuzenleri`, choices) lives in `user_data`; overrides are applied client-side by `kisiselUygula` after schedule generation.
- Admin role granted only by `hesap_hazirla()` for the verified admin email; roles in `user_roles`, checked with `has_role`.
- All app pages live under `src/routes/_authenticated/`; only `/auth` and `/reset-password` are public.
- Google Sheets sources are tracked in `sheets_kaynaklari`; `src/lib/sheets-takip.server.ts` re-downloads, diffs and notifies affected students, run hourly by pg_cron via `/api/public/sheets-kontrol` — keeps site in sync without admin re-uploads.
- Attendance (`Ayarlar.katilim`, keyed by calendar event key) and per-dilim warning mutes live in user_data.ayarlar; dilim/ana dal derived in `src/lib/dilim.ts`, thresholds in `src/lib/devam.ts`.
- Kurum e-postası zorunluluğu kalıcı bir koddur, `panel_ayar.okul_epostasi_zorunlu` anahtarıyla açılıp kapanır (`hesap_hazirla` anahtarı okur, `/sunucu` panelinden super admin çevirir, `src/lib/okul-epostasi.ts` aynı anahtarı kayıt ekranına taşır) — zorunluluk kaldırılırken kontrol kodu silinmez.
