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

## Architecture
- All data access goes through `src/services/*` (mock, localStorage-backed); pages use React Query hooks in `src/hooks/use-data.ts`. Why: swap services for an Express REST API later without touching UI.
- No managed backend (no Supabase/Firebase) — user requirement; auth in `authService` is a non-secure mock.
