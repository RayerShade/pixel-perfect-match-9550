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
- Data lives in Lovable Cloud; localStorage is only a per-session cache filled by `src/lib/bulut.ts` on sign-in — keeps existing hooks unchanged.
- Weekly amfi + genel seçmeli data are global (`global_data`, admin-only writes via RLS); yearly program, uygulama, öğrenci list, settings, choices are per-user (`user_data`).
- Admin role granted only by `hesap_hazirla()` for the verified admin email; roles in `user_roles`, checked with `has_role`.
- All app pages live under `src/routes/_authenticated/`; only `/auth` and `/reset-password` are public.
