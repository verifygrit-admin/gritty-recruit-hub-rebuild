# Sprint 023 — Account Password Reset + Coach/Counselor My Profile

Spec author: Claude (implementation)
Operator: Chris Conroy
Coach: Claude.ai (separate session)
Spec date: 2026-05-09
Status: Phase 1 — pending operator sign-off

---

## 1. Goals

1. **Student My Profile — Password field + reset modal.** Add a Password row in the Personal Info section of the existing student My Profile page (`src/pages/ProfilePage.jsx`). The row opens a modal that collects current password + new password + confirm new password, re-authenticates against Supabase, and updates the password via Supabase Auth.

2. **Coach + counselor My Profile page.** Build a new `/coach/profile` page (or equivalent route — see §6) for accounts with `user_type` `hs_coach` or `hs_guidance_counselor`. Personal Info section contains four fields: Name, High School, Email, Password.

3. **Coach/counselor password reset.** The same shared password reset modal from Goal 1 ships in the new coach/counselor page.

## 2. Done state

All three account types (student, coach, counselor) can change their account password via My Profile, immediately log back in with the new password, and experience zero data corruption, zero data loss, and zero CSS/HTML regression elsewhere in the app.

## 3. Mechanism lock (operator-decided)

Password reset = **in-app current-password flow**.

- Modal collects three inputs: `current_password`, `new_password`, `confirm_new_password`.
- Validate: `new_password === confirm_new_password`; both meet **Supabase Auth defaults only** — no codebase-introduced complexity rules. (Confirmed: no complexity rule code exists in `src/`.)
- Re-authenticate by calling `secondary.auth.signInWithPassword({ email, password: current_password })` on a **secondary Supabase client** (separate `createClient(url, anonKey, { auth: { persistSession: false, storageKey: 'pw-reauth-ephemeral' } })` instance). This avoids overwriting the active session's tokens in `localStorage`.
- On secondary re-auth success, call `supabase.auth.updateUser({ password: new_password })` on the active client. Then call `secondary.auth.signOut()` on the ephemeral instance to discard its tokens.
- On any failure (wrong current password, mismatched confirm, Supabase rejection): surface inline error in the modal. **Never log the user out.**

Out of scope: `resetPasswordForEmail`, `/forgot-password` route wiring (the link exists in `LoginPage.jsx` but has no backing route — leave as-is and treat in Sprint 024+ if requested).

## 4. Decision Point #1 status — **Option γ chosen**

Operator decision (2026-05-09): add a `full_name` column to `public.users`, write to it from the new coach/counselor My Profile page, fall back to `src/data/school-staff.js` for display elsewhere until Sprint 018 carry-forward C-9 lands the proper structural fix.

**Implications:**
- New migration adds `public.users.full_name text NULL`.
- New RLS UPDATE policy on `public.users` (currently has SELECT-own only — confirmed via `pg_policy` query 2026-05-09). Policy grants `UPDATE` to `authenticated` where `auth.uid() = user_id`, with a `WITH CHECK` that prevents privilege-relevant columns from changing (see §7).
- Backfill for existing 8 staff (4 BC High, 4 Belmont Hill) hardcoded in the migration using the UUIDs from `school-staff.js` — this guarantees the new page displays correct names on day 1 without requiring each staff member to log in and save.
- `src/data/school-staff.js` remains the display fallback in `ProfilePage.jsx` (student view's coach-confirm UI) and in any future component that resolves a staff display name from a `user_id`. C-9 inherits the consolidation work.
- DATA_INVENTORY.md `public.users` entry updated in §1 of the entry's Notes — adds `full_name` column documentation + cross-reference to `school-staff.js`.

## 5. Decision Point #2 status — **Single-HS display, no operator question**

Production query (2026-05-09 via Supabase MCP):
- `hs_coach_schools`: 4 coaches, all with `hs_count = 1`.
- `hs_counselor_schools`: 4 counselors, all with `hs_count = 1`.

100% of staff are linked to exactly one HS program. Single-school display rule applies. No multi-HS join semantics needed for Sprint 023. If a future onboarding produces a multi-HS staff row, the page will display the first row returned by `useSchoolIdentity` (matching the existing convention noted in `useSchoolIdentity.js:24`) and a follow-up sprint can revisit.

The new My Profile page reuses `useSchoolIdentity` to resolve the HS display name — this hook already does the `hs_coach_schools` / `hs_counselor_schools` → `hs_programs.school_name` join for both staff roles.

## 6. File-level work plan

| File | Action | One-line rationale |
|------|--------|-------------------|
| `supabase/migrations/0046_users_add_full_name.sql` | NEW | Add `full_name text` to `public.users`, UPDATE RLS policy, backfill 8 staff names. |
| `src/components/PasswordResetModal.jsx` | NEW | Shared modal (centered overlay) used by all three roles. Owns its own three-input form, validation, secondary-client re-auth, error surface. |
| `src/lib/secondarySupabaseClient.js` | NEW | Factory that returns an ephemeral Supabase client (`persistSession: false`, custom `storageKey`) for re-auth without touching the active session. Tiny module; isolates the rationale. |
| `src/pages/ProfilePage.jsx` | EDIT | (a) Insert one new Password row in the Personal Info section (after Email field). Row renders a labeled "Change Password" button that opens `PasswordResetModal`. Pixel-preserves all other Personal Info layout. (b) Add a one-line role guard at the top of the component: if `userType === 'hs_coach' || userType === 'hs_guidance_counselor'`, return `<Navigate to="/coach/profile" replace />`. Closes the sharp edge of staff users hitting the student profile route directly. |
| `src/pages/StaffProfilePage.jsx` | NEW | Coach + counselor My Profile page. Single component, role-aware via `useAuth().userType`. Shows four-field Personal Info section (Name editable / HS read-only / Email read-only / Password). Reuses `PasswordResetModal`. |
| `src/App.jsx` | EDIT | Add route `/coach/profile` → `<Layout><ProtectedRoute><StaffProfilePage /></ProtectedRoute></Layout>`. The page itself enforces role gating internally (matches `CoachDashboardPage` pattern). |
| `src/lib/navLinks.js` | EDIT | Add `{ to: '/coach/profile', label: 'MY PROFILE' }` to `COACH_NAV_LINKS`. Position: between DASHBOARD and GRIT GUIDES (mirrors student ordering of HOME → MY PROFILE → ...). |
| `docs/architecture/DATA_INVENTORY.md` | EDIT | `public.users` entry: add `full_name` to shape; add Sprint 023 write path (`StaffProfilePage.jsx`); update Notes to point at school-staff.js as the display fallback until C-9. |

**Justification for single `StaffProfilePage` over two thin wrappers** (Goal 2 brief option): coach and counselor share the exact same four-field Personal Info layout, the same data sources (`useSchoolIdentity` + `public.users.full_name` + `auth.users.email`), and the same write paths. The only role-specific divergence is the page heading copy (`"Coach Profile"` vs `"Counselor Profile"`) which is a one-line conditional. Two wrappers would duplicate the entire form for one string difference. One component, role-aware, keeps the diff under control.

## 7. Migration plan

**File:** `supabase/migrations/0046_users_add_full_name.sql`

**Columns added:** `public.users.full_name text NULL` (nullable — existing 32 non-staff rows stay null, students keep using `profiles.name`; only the 8 staff rows are backfilled).

**RLS impact — new UPDATE policy:**

```sql
CREATE POLICY users_update_own_full_name
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND user_type IS NOT DISTINCT FROM (SELECT user_type FROM public.users WHERE user_id = auth.uid())
    AND account_status IS NOT DISTINCT FROM (SELECT account_status FROM public.users WHERE user_id = auth.uid())
    AND email_verified IS NOT DISTINCT FROM (SELECT email_verified FROM public.users WHERE user_id = auth.uid())
    AND payment_status IS NOT DISTINCT FROM (SELECT payment_status FROM public.users WHERE user_id = auth.uid())
  );
```

The `WITH CHECK` clause prevents a malicious authenticated client from escalating their own role / account status / payment via a crafted UPDATE. The only column the user can mutate via this policy is `full_name`. (Anything else admin-controlled stays admin-controlled — admin writes go through service-role EFs and bypass RLS.)

**Backfill (in same migration, transactional):**

```sql
UPDATE public.users SET full_name = 'Paul Zukauskas'      WHERE user_id = '9177ba55-eb83-4bce-b4cd-01ce3078d4a3';
UPDATE public.users SET full_name = 'Devon Balfour'       WHERE user_id = '92dbdc93-18b6-4361-8925-2d0e1fbd68ad';
UPDATE public.users SET full_name = 'Caitlin O''Connell'  WHERE user_id = 'b80f1b4c-c5c3-4285-a88a-0cc39e650e02';
UPDATE public.users SET full_name = 'Kyle Swords'         WHERE user_id = 'e0c99343-e525-411a-b6a8-8691bdc31da7';
UPDATE public.users SET full_name = 'Frank Roche'         WHERE user_id = '4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb';
UPDATE public.users SET full_name = 'June Schmunk'        WHERE user_id = '4a48c09f-5f5c-411b-9d00-8aa7213e4eef';
-- Plus the two coach uuids surfaced in the production query that are not in school-staff.js yet
-- (fa8fa926…, 9169818d…) — to be confirmed before migration runs; if they have no display
-- name source, leave NULL (the page will fall back to email).
```

**Application path:** `npm run migrate -- supabase/migrations/0046_users_add_full_name.sql` (per repo memory + `scripts/migrate.js`). No local Supabase CLI involvement.

**Rollback path:**
```sql
-- Manual rollback (not auto-shipped):
DROP POLICY IF EXISTS users_update_own_full_name ON public.users;
ALTER TABLE public.users DROP COLUMN IF EXISTS full_name;
```
The backfill is idempotent on re-application — the migration uses `WHERE user_id = '…'` updates, not `INSERT`, so re-running matches no extra rows.

**Idempotency for the column add:** `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name text;` — safe to re-run.

## 8. Test plan

| # | Test | What proves done |
|---|------|------------------|
| 1 | Student logs in, opens `/profile`, clicks Change Password, enters correct current + new + confirm, submits | Modal closes with success toast; user is NOT logged out; `supabase.auth.signInWithPassword` with the new password succeeds in a new tab; `signInWithPassword` with the old password fails. |
| 2 | Coach logs in, navigates `/coach/profile`, repeats the password change flow | Same outcome as #1 for a `hs_coach` user. |
| 3 | Counselor logs in, navigates `/coach/profile`, repeats the password change flow | Same outcome as #1 for a `hs_guidance_counselor` user. |
| 4 | In modal, enter wrong current password | Inline error "Current password is incorrect" surfaced. User remains logged in. Password unchanged (verifiable by re-login with original). |
| 5 | In modal, enter mismatched new + confirm | Inline error "Passwords do not match" surfaced before any network call. No Supabase request fired. |
| 6 | In modal, click X / Esc / backdrop mid-flow with valid inputs but before submit | Modal closes. Supabase never called. Password unchanged. |
| 7 | Diff student `/profile` Personal Info section pre/post Sprint 023 | Only the new Password row appears. Name, HS autocomplete, Grad Year, State, Email, Phone, Twitter, Hudl rows are pixel-identical (visual diff). |
| 8 | Student visits `/coach/profile` directly | Page renders an "Access denied" / role-mismatch state OR redirects (decision: render in-page denial that matches the `CoachDashboardPage` "no access" branch, which already exists for `userType !== 'hs_coach' && userType !== 'hs_guidance_counselor'`). |
| 9 | Coach OR counselor (or any non-student `user_type`) visits `/profile` directly | `ProfilePage` short-circuits via a one-line role guard at the top of the component and `<Navigate to="/coach/profile" replace />`. Mirrors the role-gate pattern in `CoachDashboardPage`. Verifies cleanly via direct URL navigation in both staff sessions. |
| 10 | Coach updates Name field on `/coach/profile`, saves, reloads page | New name displayed. Verify `public.users.full_name` row updated via SQL. |
| 11 | Coach attempts to forge a request setting `user_type = 'student_athlete'` on their own row | RLS blocks the update via the `WITH CHECK` clause. (Manual verification with a crafted REST request.) |

Screenshots: capture before/after of `/profile` Personal Info section (test #7) using a logged-in student session. Store under `docs/specs/sprint-023/screenshots/` if any visual diff is detected — otherwise note "no visual diff" in the retro.

## 9. Carry-forward register

| Item | Origin | Why deferred |
|------|--------|--------------|
| Sprint 018 C-9 | Pre-existing | Proper staff-identity refactor (DB-backed staff identity table + RLS). Sprint 023 γ adds `public.users.full_name` as an interim step; C-9 should consolidate this column into the eventual identity table. |
| `/forgot-password` flow | Sprint 023 brief — explicitly out of scope | Email-link reset (`resetPasswordForEmail`) needs separate operator decision on UX, email template, rate-limiting. The dangling link in `LoginPage.jsx:194` should be left alone or hidden in a follow-up sprint. |
| Password complexity rules | No code exists today | Brief instructed: use Supabase defaults. Future tightening (length, symbols, breach lists via HIBP) is a separate decision. |
| Identify 2 unknown coach UUIDs | Production query found `fa8fa926-00f0-4325-b913-5e78be2b4c4a` and `9169818d-744f-411f-bf11-4bc13e13d0cb` in `hs_coach_schools` not in `school-staff.js` | Sprint 024 admin pass should run: `SELECT u.user_id, u.user_type, au.email FROM public.users u JOIN auth.users au ON au.id = u.user_id WHERE u.user_id IN ('fa8fa926-00f0-4325-b913-5e78be2b4c4a','9169818d-744f-411f-bf11-4bc13e13d0cb');` then update `school-staff.js` and `public.users.full_name` accordingly. Sprint 023 leaves both NULL; the new page falls back to email for these two until then. |
| Multi-HS staff display | DP#2 — not currently a real case | If a future onboarding links one staff member to multiple HS programs, the page will show only the first row. Worth revisiting then. |
| Backfill of 2 unknown coach UUIDs | Production query found 4 coach rows; `school-staff.js` lists 2 head coaches | Need to confirm identities of `fa8fa926-00f0-4325-b913-5e78be2b4c4a` and `9169818d-744f-411f-bf11-4bc13e13d0cb` before the migration runs. If they have no display name source, their `full_name` stays NULL and the page falls back to email. |

## 10. Retro

**Sprint close:** 2026-05-09

### What shipped
- Migration `0046_users_add_full_name.sql` — `public.users.full_name text NULL`, `users_update_own_full_name` UPDATE policy with WITH CHECK clause locking `user_type` / `account_status` / `email_verified` / `payment_status`, and a 6-row backfill (BC High + Belmont Hill staff from `school-staff.js`). Verified live via Supabase MCP after `npm run migrate`.
- `src/lib/secondarySupabaseClient.js` — ephemeral client factory (`persistSession:false`, custom `storageKey`).
- `src/components/PasswordResetModal.jsx` — shared centered modal: three-input flow, secondary-client re-auth, primary-client `updateUser`, secondary `signOut()` on every exit path. Inline errors only — never logs the user out on failure.
- `src/pages/ProfilePage.jsx` — Password row inserted in Personal Info; staff redirect via `<Navigate to="/coach/profile" replace />` after all hooks.
- `src/pages/StaffProfilePage.jsx` — role-aware coach/counselor My Profile (Name editable, HS/Email read-only, Password row).
- `src/App.jsx` — `/coach/profile` route. `src/lib/navLinks.js` — `MY PROFILE` entry between DASHBOARD and GRIT GUIDES.
- `docs/architecture/DATA_INVENTORY.md` — `public.users` updated (12 cols, migration + write/read paths, lookup precedence note).
- `tests/unit/student-nav.test.js` — backfilled to current state (also caught Sprint 022's `MY GRIT GUIDES` which had been missed).
- `tests/unit/password-reset-modal.test.jsx` — covers spec test #5 (mismatch short-circuit, zero network).

### What surprised me
- `tests/unit/student-nav.test.js` was already stale on master before Sprint 023 touched anything — it didn't reflect the Sprint 022 `MY GRIT GUIDES` addition. Tests that pin entire constant arrays decay silently; consider switching to `.toContain` checks for additive nav entries in future sprints.
- `EnterWorktree` does not provision a `.env` into the new worktree, but `npm run migrate` requires `SUPABASE_PAT`. Subagent A had to copy `.env` from the main repo. Worth adding to a future "worktree onboarding" runbook or post-create hook.
- The pre-existing `tests/unit/collapsible-title-strip.test.js` failure on master (asserts `#8B3A3A` literal but the component now renders `var(--brand-maroon)`) is unrelated but visible in every test run. Worth a one-line fix in Sprint 024.
- The code-review subagent caught a real pattern issue in `ProfilePage.jsx` — Subagent C used `useEffect+navigate` based on a misread of rules-of-hooks. `<Navigate>` placed AFTER all hooks is the cleaner single-render pattern; same correctness properties, better UX. Worth noting that subagent self-review can miss these — third-party review caught it.

### What carried forward (additions to §9)
- `EnterWorktree` `.env` provisioning gap (operator workflow item).
- `tests/unit/collapsible-title-strip.test.js` brand-token assertion drift (1-line fix).
- Auto-coverage gap on the high-risk auth surface — spec test rows #1–#4, #6, #10, #11 are not yet automated. The reviewer recommended a Playwright e2e for the live re-auth flow + a vitest+supabase-js integration test for the RLS forgery (#11). Sprint 024 candidate.

### Sprint 023 git footprint
8 commits on `worktree-sprint-023`:
- `15d0989` Phase 2B (modal + secondary client)
- `05c9467` Phase 2A (0046 migration)
- `9b8cb78` Phase 2C (student wiring + redirect — superseded in part by Phase 4 fix)
- `0d5efce` Phase 2D (StaffProfilePage + route + nav + DATA_INVENTORY)
- `b202289` Phase 1 (spec)
- `9d891da` Phase 3 (nav test backfill)
- `37d3037` Phase 4 (code-review fixes — Navigate component + role-neutral copy + PasswordResetModal unit test)

Files changed: 10. Lines: ~1,100 added.

---

## Appendix A — Operating reminders

- Worktree convention for Sprint 023: brief instructs to use a worktree even though prior sprints used feature branches. Will enter via `EnterWorktree` at start of Phase 2.
- Auth EF boundary: do NOT modify `auth.users` directly. All password mutations go through `supabase.auth.updateUser()` (active client). Re-auth check uses a secondary client to avoid clobbering active-session tokens.
- DATA_INVENTORY.md update is mandatory at sprint close (per Phase 5 brief), not optional, because Option γ added a column.
