# Sprint 024 — Carry-Forward Input

Seeded at Sprint 023 close (2026-05-09). Each item below was identified during Sprint 023 execution and intentionally deferred. Use this as the starting input when scoping Sprint 024.

---

## C-024-1 — Identify the 2 unknown coach UUIDs

**Origin:** Sprint 023 production query found 4 coach rows in `public.hs_coach_schools`; only 2 are present in `src/data/school-staff.js` (Paul Zukauskas, Frank Roche). The other two — `fa8fa926-00f0-4325-b913-5e78be2b4c4a` and `9169818d-744f-411f-bf11-4bc13e13d0cb` — have NULL `full_name` after the Sprint 023 backfill, so the new `/coach/profile` page falls back to email for them.

**Sprint 024 starter query:**
```sql
SELECT u.user_id, u.user_type, au.email, au.created_at
FROM public.users u
JOIN auth.users au ON au.id = u.user_id
WHERE u.user_id IN (
  'fa8fa926-00f0-4325-b913-5e78be2b4c4a',
  '9169818d-744f-411f-bf11-4bc13e13d0cb'
);
```

**Acceptance criterion:** Both UUIDs have a non-NULL `public.users.full_name` and corresponding entries in `src/data/school-staff.js` (or are confirmed orphaned and removed from `hs_coach_schools`).

---

## C-024-2 — Auto-coverage for the password-reset auth surface

**Origin:** Sprint 023 spec §8 has 11 test rows; only #5 (mismatch short-circuit) was auto-verified. The high-risk live re-auth + RLS forgery rows are uncovered.

**Recommended adds:**
- Playwright e2e (`tests/sprint-024-password-reset.spec.js`): login as student → open modal → submit valid current+new+confirm → verify the active session is intact (no logout, no token rotation visible) → log out and log back in with the new password. Repeat for `hs_coach` and `hs_guidance_counselor` fixtures. Covers spec rows #1, #2, #3, #10.
- Vitest + @supabase/supabase-js integration test against the local stack: log in as a coach, attempt to UPDATE own `public.users` row with `user_type = 'student_athlete'`, assert RLS rejects with policy-violation error. Covers spec row #11.
- Vitest unit test for the "wrong current password" branch using mocked secondary client. Covers spec row #4.

**Acceptance criterion:** All Sprint 023 spec test rows except #7 (visual diff, separate workstream) have an executable test in CI.

---

## C-024-3 — `EnterWorktree` `.env` provisioning

**Origin:** Sprint 023 Subagent A blocked on first `npm run migrate` because the worktree had no `.env` file (it's gitignored). Subagent A copied from the main repo root as a workaround.

**Recommended fix:** Add a post-create symlink or copy step. Two reasonable shapes:
1. Symlink: `ln -s ../../../.env .env` inside the worktree on creation. Single source; no drift risk.
2. Hook: extend `.claude/settings.json` with a worktree post-create hook that runs the symlink command.

**Acceptance criterion:** A new worktree created via `EnterWorktree` can run `npm run migrate` and `npm test` without manual `.env` intervention.

---

## C-024-4 — Fix `tests/unit/collapsible-title-strip.test.js` brand-token drift

**Origin:** Pre-existing failure on master, surfaced by Sprint 023's full unit run. The test asserts `style.backgroundColor === '#8B3A3A'` but the component now renders `var(--brand-maroon)`.

**Fix shape:** Either (a) update the assertion to `'var(--brand-maroon)'`, or (b) compute the resolved color via `getComputedStyle` in jsdom (probably brittle). Option (a) is the obvious choice; the brand-token swap was intentional per the codebase's CSS custom property migration.

**Acceptance criterion:** `npm run test:unit` reports zero failures on a clean checkout.

---

## C-024-5 — Decide and implement (or remove) `/forgot-password` flow

**Origin:** `src/pages/LoginPage.jsx:194` renders a "Forgot Password?" link to `/forgot-password`, but no route is defined in `src/App.jsx`. Clicking it triggers the catchall `<Route path="*" element={<Navigate to="/" replace />} />`, silently dropping the user on the landing page.

**Decision needed (operator):** ship an email-link reset (`supabase.auth.resetPasswordForEmail`), or remove the dangling link?

If shipping: scope a separate spec covering email template, rate-limiting, the `/forgot-password` page UI, and the `/reset-password?token=…` callback page.
If removing: one-line edit to `LoginPage.jsx`, plus an entry in DATA_INVENTORY or a note in the auth UX spec explaining why.

**Acceptance criterion:** Either `/forgot-password` resolves to a working flow, or the link is removed from `LoginPage.jsx`.

---

## C-024-6 — Sprint 018 C-9 — Staff identity consolidation

**Origin:** Pre-existing carry-forward from Sprint 018, partially serviced by Sprint 023's `public.users.full_name` addition. The proper structural fix is still pending: a dedicated staff-identity table that holds names + titles + emails + photos in one place, with appropriate RLS for student-side display lookups.

**Sprint 023 contribution:** added `full_name` to `public.users` as an interim — Sprint 024 (or later) should consolidate this column into the eventual identity table and update the lookup precedence rule documented in `DATA_INVENTORY.md` `public.users` Notes.

**Acceptance criterion:** Either C-9 is fully serviced (single source of truth for staff identity, `school-staff.js` deprecated and removed, `public.users.full_name` migrated into the new table or marked legacy), or the `school-staff.js` + `public.users.full_name` dual-source state is documented as the long-term shape with explicit rationale.

---

## Notes

- This document is the operator-facing handoff from Sprint 023. Sprint 024 planning should treat each item as a candidate scope element, not an obligation — the operator picks which ones land in the next sprint.
- All six items are tracked in `docs/specs/sprint-023-spec.md` §9 "Carry-forward register" with shorter blurbs; this file expands them with acceptance criteria.
- If any item is rejected (won't ever do), record the rejection here with date + reason rather than silently dropping it.
