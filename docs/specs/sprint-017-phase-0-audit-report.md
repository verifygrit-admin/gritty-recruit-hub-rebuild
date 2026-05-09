---
sprint: 017
artifact: phase-0-audit-report
status: draft
operator: Chris
audited: 2026-05-07
parent_spec: docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md
plan: docs/specs/sprint-017-phase-0-audit-plan.md
---

# Sprint 017 — Phase 0 Audit Report

## Audit Area 1: CSV Column-Shape Verification

### FINDINGS

**Row counts (vs. spec):**

- `Students.csv` — **3 rows**, not 5 (Ricky Copeland, Ky-Mani Monteiro, Ajani Kromah). Spec Section 4 says 5. Counselor CSV's per-student boolean columns confirm only 3 students (`is_counselor_copeland`, `is_counselor_monteiro`, `is_counselor_kromah`). The data shape is internally consistent at 3.
- `Coaches.csv` — 1 row (Frank Roche, head coach). Matches spec.
- `Counselor.csv` — 1 row (June Schmunk). Matches spec.

**Column mapping (Students.csv → target tables):** the Belmont Hill CSV uses display-style headers; the existing BC High `bulk_import_students.js` script expects snake_case headers. Drift summary:

| Belmont CSV header | Maps to | Target table | Notes |
|---|---|---|---|
| Full Name | full_name → `name` | profiles | rename |
| Email | email | profiles + auth.users + public.users | direct |
| High School | high_school constant | profiles | constant per row, value `'Belmont Hill School'` |
| Grad Year | grad_year | profiles | int parse |
| State | state | profiles | direct |
| Phone | phone | profiles | direct |
| Twitter | twitter | profiles | direct |
| Hudl | hudl_url | profiles | rename |
| Head Coach Email | coach_email → resolves to coach UUID for `hs_coach_students` | hs_coach_students | rename |
| Guidance Counselor Email | counselor_email → resolves for `hs_counselor_students` | hs_counselor_students | rename |
| GPA | gpa | profiles | direct |
| Position | position | profiles | direct |
| Height | height | profiles | int (CSV uses inches: 70, 73) |
| Weight | weight | profiles | int parse |
| 40 yd dash | speed_40 | profiles | rename |
| Expected starter | expected_starter | profiles | bool (CSV "TRUE"/"FALSE") |
| Team Captain | captain | profiles | rename + bool |
| All-Conference | all_conference | profiles | bool |
| All-State | all_state | profiles | bool |
| AGI | agi | profiles | int |
| Dependents | dependents | profiles | int |
| Parent Email | parent_guardian_email | profiles | rename |
| ID, Account Type, Head Coach (name), Guidance Counselor (name) | DROP | — | redundant or filter-only |

**Target columns with no CSV source (must be defaulted or seed-constant):**

- `profiles.sat` — null (CSV has none).
- `profiles.hs_lat`, `profiles.hs_lng` — Belmont Hill coords needed (Belmont, MA ≈ `42.3959, -71.1786`). The existing script defaults to **Boston coords (DEFAULT_HS_LAT=42.3097, DEFAULT_HS_LNG=-71.0527 — BC High)**. Wrong for Belmont.
- `public.users.user_type` — seed-constant per role (`student_athlete` / `hs_coach` / `hs_guidance_counselor`).
- `public.users.account_status='active'`, `email_verified=true` — seed constants per BC High pattern.
- `auth.users.password` — seed-constant default; see Area 7.
- `profiles.email`, `auth.users.email` — both populated from CSV email.

**Coaches CSV** has explicit `is_head_coach` column (`TRUE` for Frank Roche). The existing `seed_users.js` uses positional CSV order, not the column. Belmont seed should use the explicit column to be cleaner.

**Counselor CSV** has unusual per-student boolean columns (`is_counselor_copeland`, etc.). These are **redundant** with the Students CSV's `Guidance Counselor Email` column, which already names June Schmunk for all 3 students. **Recommend:** drive counselor↔student linking from the Students CSV (canonical, matches BC High pattern); use Counselor CSV only for the counselor identity row.

### DECISION DRIVEN

- **D4 implementation:** seed script needs (a) header-rename pre-process or a Belmont-specific CSV file, (b) Belmont-specific defaults for `hs_lat` / `hs_lng`, (c) school-name constant parameterized to `'Belmont Hill School'`, (d) counselor-link logic driven from Students CSV not Counselor CSV.
- **D7 verification step 1 (head coach sees 5 students):** **revise to 3 students**, pending operator clarification on row-count discrepancy.

### BLOCKER OR CLEAR

**BLOCKER (data-level).** Spec says 5 students; CSV has 3. Operator must clarify before D4 fires:
- Are 2 students missing from the CSV (provide additional rows)?
- Or is the spec wrong (acceptance criteria, D4, D7 step 1 update from 5 to 3)?

The audit cannot proceed past Area 1's row-count question without operator input. Everything else in Area 1 is otherwise clear.

---

## Audit Area 2: Design-Token System Inventory

### FINDINGS

**Token system structure:** CSS custom properties on `:root` in `src/index.css`. **Two palettes coexist** without collision:

1. **Legacy BC High palette** (`src/index.css:7-9`) — the active product theme:
   - `--brand-maroon: #8B3A3A`
   - `--brand-gold: #D4AF37`
   - `--brand-gold-dark: #A8871D`

2. **Sprint 010 GrittyFB palette** (`src/index.css:22-72`) — `--gf-*` tokens (forest/lime). Comment on line 14-18 explicitly states: *"These tokens are NOT yet applied to existing surfaces (Coach Dashboard, Student View, admin) — that work is carry-forward. Sprint 010 produces foundation only."*

The active theme that Belmont Hill needs to override is the `--brand-*` palette.

**Consumption sites for `--brand-maroon` / `--brand-gold`** (6 files):
- `src/index.css` (declaration)
- `src/components/RecruitingScoreboard.jsx`
- `src/components/OfferBadge.jsx`
- `src/components/ShortlistRow.jsx`
- `src/pages/LandingPage.jsx`
- `src/components/CollapsibleTitleStrip.jsx`

Plus one inline style hardcoded to `#8B3A3A` in `src/pages/AdminLoginPage.jsx:92` and `:232` (admin sign-in heading + button — not token-driven; small inline-style cleanup or scope decision).

**Seam for school-conditional theming:** the `--brand-*` declarations in `:root` of `src/index.css`. The cleanest pattern: keep `--brand-*` as the consumed tokens, swap the values via a body-level class (e.g., `body.school-belmont-hill { --brand-maroon: #1B3D8F; ... }`) driven by an auth-time provider that reads the user's `hs_programs.school_name` and toggles a class. **No per-component refactor required** for the 6 consumer files because they consume the variable name, not the literal hex. The inline hardcodes in `AdminLoginPage.jsx` are a small cleanup item — admin surfaces are not school-conditional and may stay maroon by design.

**Belmont Hill brand assets — proposed hex (from logo image read):**
- **Deep Blue (Primary):** approximately `#1B3D8F` — Belmont Hill royal/navy from the seal's outer band.
- **Scarlet (Secondary):** approximately `#B41F2E` — Belmont Hill red from the inner shield.
- **White (Tertiary):** `#FFFFFF`.
- **Background underlay:** `src/assets/Belmont Hill background.jpg` — pattern usage TBD per existing background-asset convention (need to grep `helmet.png` / team-photo background pattern at D5 implementation).

**Operator approval gate:** these hex values are visual estimates from logo inspection. The Belmont Hill brand may have authoritative hex values from a brand kit document. Confirm or override before D5 fires.

### DECISION DRIVEN

- **D5 implementation seam:** body-class-driven `--brand-*` value swap in `src/index.css`, plus an auth-time class-toggle hook. No new token names; no per-component refactor.
- **D5 hex values pending operator approval** of `#1B3D8F` / `#B41F2E` from the logo, or operator-supplied authoritative values.
- **AdminLoginPage inline hardcodes:** out of scope for D5 (admin is school-neutral). Note in retro as cleanup carry-forward if desired.

### BLOCKER OR CLEAR

**CLEAR.** Single seam, low entanglement. Hex-value approval is the only gate; cheap to confirm.

---

## Audit Area 3: Hardcoded BC High String Inventory

### FINDINGS

Categorized hits. Migration files are immutable artifacts (replaced by D2's behavior, not their content).

**Migration files (frozen — D2 supersedes behavior, not file):**
- `supabase/migrations/0038_add_public_recruits_select.sql:25, 38` — `'Boston College High School'` predicate. **D2 target.**

**Front-end behavioral hits:**
- `src/lib/schoolShortName.js:15` — `'Boston College High School': 'BC HIGH'` masthead lookup. **D6 seam.** Add `'Belmont Hill School': 'BELMONT HILL'`.
- `src/pages/ProfilePage.jsx:59-65, 136, 172, 477, 516` — **static BC High head coach + counselor data hardcoded into the profile form.** Comment line 172: *"Dynamic fetch useEffects removed — coach and counselor are now static BC High hardcodes."* Includes `hs_program_id: 'de54b9af-c03c-46b8-a312-b87585a06328'`. **This is a major unanticipated finding** — see Cross-Area Synthesis below.
- `src/components/NextStepsDashboard.jsx:393-397` — BC High S&C coaches Kiely + McClune hardcoded into compound-lifts tip text.
- `src/components/styleguide/PlayerCardReference.jsx:28` — `school: 'BC High'` (styleguide-only, low priority).
- `src/hooks/useRecruitsRoster.js:4` — comment reference only, not behavioral.
- `src/components/scheduler/CoachSchedulerSection.jsx:19` — comment reference only, not behavioral.
- `src/index.css:15` — comment reference only.

**Config / data files:**
- `src/data/recruits-schools.js:20-22` — `slug:'bc-high', filter:'Boston College High School'`, plus the inactive Belmont Hill row at lines 25-31 (already pre-staged with `slug:'belmont-hill', active:false, comingMonth:'May 2026'`). **D3 activates** this row.

**Scripts / seed (non-runtime, but Belmont seed will fork):**
- `scripts/seed_users.js:32-34` — `DEFAULT_PASSWORD='eagles2026'`, `BC_HIGH_NAME`, `BC_HIGH_STATE='MA'`.
- `scripts/bulk_import_students.js:55-61` — `PAUL_EMAIL_CANONICAL`, `PAUL_UUID_KNOWN`, `BC_HIGH_PROGRAM_ID`, `BC_HIGH_SCHOOL_NAME`, `DEFAULT_HS_LAT/LNG` (Boston).
- `scripts/import_paul_zukauskas.py`, `scripts/import_bc_high_counselors.py`, `scripts/import_jesse_bargar.py`, `scripts/import_shortlist_bc_high.py` — historical one-offs, not runtime.

**Documentation / specs / prototypes** — many hits across `docs/`, `prototypes/`, `_org/` mirrors. Informational, non-behavioral, no D2-D7 action.

### DECISION DRIVEN

- **D2 (migration 0043):** replace BC-High-specific predicate in `0038_add_public_recruits_select.sql` (Option A: join via `hs_programs.school_name`).
- **D6 (banner dynamism):** extend `src/lib/schoolShortName.js` map to include Belmont Hill. Lookup is already centralized — single-source change.
- **D3 (migration 0044):** Belmont Hill rows into `hs_programs` + `partner_high_schools`.
- **NEW SCOPE FINDING — see Cross-Area Synthesis:** `ProfilePage.jsx` static BC High coach + counselor hardcodes will block D7 verification step 3 unless absorbed into the sprint or explicitly carried forward.
- **NextStepsDashboard.jsx S&C tip:** Belmont Hill students will see BC-High-specific advice. Either carry forward or absorb into D6 with a school-conditional tip variant.

### BLOCKER OR CLEAR

**BLOCKER (scope-shape).** Two hardcoded surfaces are not in the spec's deliverable list but will produce visibly wrong behavior for Belmont Hill students:

1. `ProfilePage.jsx` static BC High coach + counselor — Belmont Hill students will see Paul Zukauskas as their head coach and BC High counselor options. Spec D7 step 3 (a Belmont Hill student running GRIT FIT) cannot pass cleanly without resolution.
2. `NextStepsDashboard.jsx` BC-High-specific S&C coach names in compound-lifts tip.

Operator decision needed: absorb both into the sprint (scope expansion ~1-2 exchanges), absorb only ProfilePage and carry forward NextSteps, or carry forward both with explicit acceptance that Belmont Hill students see BC-High-mismatched content until a follow-on sprint.

---

## Audit Area 4: Admin-Login Dashboard Query Verification

### FINDINGS

- Route: `/admin-login` defined in `src/App.jsx:29` → `src/pages/AdminLoginPage.jsx`.
- Auth flow: `supabase.auth.signInWithPassword`, then session check for `app_metadata.role === 'admin'` (Path B, no jwt-decode). Non-admin sessions are signed out immediately.
- User-list query lives downstream in `src/components/AdminUsersTab.jsx` (`/admin/users`). Six entity-type toggles (Accounts, Student Athletes, College Coaches, HS Coaches, Counselors, Parents). Column configs in `src/lib/adminUsersColumns.js`.
- The query is **school-agnostic**: it filters by `user_type` enum, not by school. No `high_school =`, no `hs_program_id =` join. Admin RLS bypass governs visibility (per migration `0034_schools_admin_update_policy.sql` + `0035_admin_audit_log.sql`).

### DECISION DRIVEN

- **D7 verification step 5** ("admin login dashboard returns all 7 new accounts plus existing accounts"): no code change needed. Admin tab will surface Belmont Hill accounts automatically once they are seeded.

### BLOCKER OR CLEAR

**CLEAR.** No D2.5 deliverable needed for admin-login.

---

## Audit Area 5: /recruits/<slug>/ Proxy School-Resolution Logic — All Platform Layers

### FINDINGS — seven-layer sweep

1. **React Router (App.jsx):** `/recruits/*` is **not** a React Router route. The public roster lives at `/athletes` (App.jsx:41). Comment at App.jsx:38-40 explicitly states: *"Path pivoted from /recruits to /athletes; the /recruits/<slug>/ namespace is reserved for the legacy password-gated proxy at api/recruits-auth.ts. See sprint-011-retro for context."*

2. **Middleware:** none (Vite/React SPA, no middleware layer).

3. **`vercel.json`:** four rewrites:
   - `/recruits/login` → `/recruits/login.html` (legacy login page)
   - `/recruits/auth` → `/api/recruits-auth` (legacy auth POST)
   - `/recruits/:path*` → `/api/recruits-auth` (legacy proxy catch-all)
   - `/(.*)` → `/index.html` (SPA fallback)
   
   The `/recruits/*` namespace is **fully owned by the legacy proxy.** No Belmont Hill collision concern at this layer because Belmont Hill onboarding uses `app.grittyfb.com` (the SPA), not `/recruits/*`.

4. **`public/`:** contains `public/recruits/login.html` (legacy proxy login page). Belmont Hill onboarding does not touch this layer.

5. **`api/`:** `api/recruits-auth.ts` is the legacy edge-function proxy. It reads `RECRUIT_PASSWORD_<SLUG>` and `RECRUIT_ORIGIN_<SLUG>` env vars per recruit slug (Gritty Guides infrastructure from Sprint 007 / "individual recruit guides"). Resolution is env-var-driven, slug-based; not coupled to partner-school identity.

6. **Edge functions (Supabase):** 11 functions in `supabase/functions/`. None resolve school context from a slug; admin-* functions rely on JWT role claim. School-agnostic.

7. **Build-time / SSG manifest:** Vite SPA, no SSG manifest, no per-school build-time entries.

**The `recruits-schools.js` config** at `src/data/recruits-schools.js` is the single source of truth for the public `/athletes` roster's school toggle. Belmont Hill is **already pre-staged** in the array (lines 25-31) with `slug:'belmont-hill'`, `active:false`, `filter:null`, `comingMonth:'May 2026'`. **Activation is a 3-line edit:** flip `active` to `true`, set `filter:'Belmont Hill School'`, drop `comingMonth`.

**Edge case noted:** Ricky Copeland (Belmont Hill student #1 in the seed CSV, email `copelandul@belmonthill.org`) appears to also be a Gritty Guide subject (per Sprint 007 retro reference and the env-var pattern). His Gritty Guide would live at `/recruits/copeland` (slug-based legacy proxy). This is a **different surface** from his Belmont Hill app account at `app.grittyfb.com`. No collision; flagged for awareness only.

### DECISION DRIVEN

- **No D2.5 needed.** The seven-layer sweep is clean.
- **D2 predicate shape: Option A (preferred)** is straightforward. Resolution is data-driven via `recruits-schools.js` config + the `hs_programs` table. Generalizing the migration 0038 predicate to `profiles.high_school IN (SELECT school_name FROM hs_programs)` (or the parametric equivalent) aligns with how the public `/athletes` roster already operates.
- **D3 migration 0044** plus a **3-line edit to `recruits-schools.js`** is sufficient to activate Belmont Hill on `/athletes`.

### BLOCKER OR CLEAR

**CLEAR.** Sprint 011 Pattern 5 explicitly checked. No late-Phase-3 surprise risk.

---

## Audit Area 6: Existing Seed-Script Pattern from BC High Onboarding

### FINDINGS

**Seed pattern is split across two scripts:**

1. **`scripts/seed_users.js`** — auth shells for coaches + counselors, plus `hs_coach_schools` / `hs_counselor_schools` link rows.
   - Source: `data/users.csv` (31 BC High accounts).
   - Pattern: `supabase.auth.admin.createUser({email, password, email_confirm:true})` → `public.users` INSERT (`user_type`, `account_status:'active'`, `email_verified:true`) → coach/counselor school-link INSERT.
   - Idempotency: **none in `seed_users.js`** (uses raw INSERT, not UPSERT; relies on script being run once).
   - Head coach designation: positional in CSV (first coach = head coach). **Brittle.**
   - Default password: `'eagles2026'` (hardcoded constant).

2. **`scripts/bulk_import_students.js`** — students: auth shells, `public.users`, `profiles`, `hs_coach_students`, `hs_counselor_students`.
   - Source: gws CLI sheet read OR `--csv <path>` fallback.
   - Pattern: 7-step pipeline with explicit preflight (asserts head coach `is_head_coach=true` before any writes).
   - Idempotency: **strong.** Catches "already registered" / 422 from createUser, resolves UUID via `/auth/v1/admin/users?email=` direct REST call, then `upsert({...}, {onConflict: 'user_id'})` for `public.users`, `profiles`, link tables.
   - Hardcoded BC-High constants: `PAUL_UUID_KNOWN`, `BC_HIGH_PROGRAM_ID`, `BC_HIGH_SCHOOL_NAME`, `DEFAULT_HS_LAT/LNG` (Boston), `VALID_COUNSELOR_EMAILS` set.
   - Authored by Patch 2026-03-27 (per file header).

**Email-resolution detail worth carrying forward:** the script discovered (and inline-documented) that GoTrue's `listUsers()` caps at 50 records regardless of `perPage`, which silently broke email lookups for users beyond row 50. The fix uses the REST endpoint directly with `?email=` query param. This pattern is reusable for Belmont Hill.

**Verbatim-match assessment for Belmont Hill:** **partial match, parameterization needed.**
- Cannot reuse `bulk_import_students.js` as-is — too many BC High constants.
- Cleanest path: parameterize via env vars or CLI args (`--school-name`, `--program-id`, `--coach-uuid`, `--default-lat`, `--default-lng`, `--valid-counselor-emails`, `--default-password`).
- Alternative path: fork to `bulk_import_students_belmont.js` with Belmont constants. Simpler but accumulates duplication; future schools compound the cost.
- Recommend **parameterization** — the per-school config object pattern matches `recruits-schools.js`'s philosophy and will support school N+1 onboarding cleanly.

**Header-rename pre-process required:** Belmont CSV uses display-style headers ("Full Name", "40 yd dash", etc.); the script expects snake_case. Either rename headers in a Belmont-specific CSV input file or add a header-normalization step.

### DECISION DRIVEN

- **D4 implementation shape:** parameterize `bulk_import_students.js` (or a sibling script `seed_school.js`) to accept Belmont Hill config; add header-normalization step or supply a normalized intermediate CSV; supply Belmont coords (`hs_lat=42.3959, hs_lng=-71.1786`) as defaults.
- **D4 idempotency:** match the existing UPSERT + duplicate-detection pattern verbatim. Re-runnable seed confirmed feasible.
- **D4 coach / counselor seeding:** parallel parameterization for `seed_users.js` (coach + counselor auth + school-link). Currently no idempotency in `seed_users.js`; **recommend adding pre-flight email lookup** (matching `bulk_import_students.js` pattern) before the Belmont run, since the operator may need to re-run.

### BLOCKER OR CLEAR

**CLEAR.** Pattern is well-documented in code; parameterization is a tractable +1 exchange of work in Phase 2 (D4).

---

## Audit Area 7: Initial-Password Communication Pattern from BC High Onboarding

### FINDINGS

- **BC High pattern: fixed password constant `'eagles2026'`.** Hardcoded in:
  - `scripts/seed_users.js:32` — `DEFAULT_PASSWORD = 'eagles2026'`
  - `scripts/bulk_import_students.js:325` — fallback if CSV row lacks `temp_password` column.
- No magic-link, no `inviteUserByEmail`, no welcome-email trigger flow, no random per-user generation.
- Communication mechanism: **out-of-band, operator-handled.** No in-app artifact (no welcome email, no one-time CSV generation in the script). The operator presumably communicated `'eagles2026'` to BC High admin verbally or via a separate channel.
- No documentation in retros, READMEs, or session logs of why `'eagles2026'` was chosen (likely a BC-High-themed phrase — "eagles" is the BC High mascot, "2026" is the active class year). Git log search for "password" and "seed" surfaced no governance trail.

### DECISION DRIVEN

- **Recommend Belmont Hill matches the BC High pattern**: a single fixed password constant communicated out-of-band by the operator to Belmont Hill admin.
- **Proposed Belmont default:** `'sextants2027'` (Belmont Hill team is the Sextants per the school seal's emblem; 2027 is the grad year of all 3 student rows in the CSV). Operator approval needed.
- **Alternative if operator prefers more security:** generate random 12-char passwords, write to a one-time `data/belmont_seeds_TEMP.csv` that the operator hand-delivers to Belmont admin and immediately gitignores/deletes. Slightly more work; significantly better security posture.

### BLOCKER OR CLEAR

**CLEAR (with operator decision input).** Spec Section 11 explicitly defers the password choice to operator. Audit recommends matching BC High's fixed-pattern approach with `'sextants2027'`; operator confirms or substitutes.

---

## CROSS-AREA SYNTHESIS

Three findings cross deliverables or surface unanticipated dependencies:

### 1. Static BC High coach + counselor in ProfilePage (Areas 3, 5, 7 cross)

**Impact:** `src/pages/ProfilePage.jsx:59-65, 136, 172, 477, 516` hardcodes BC High head coach (Paul Zukauskas, with UUID `9177ba55-eb83-4bce-b4cd-01ce3078d4a3` and `hs_program_id` `de54b9af-c03c-46b8-a312-b87585a06328`) and counselor data into the profile form's "Confirm Your Head Coach" + "Confirm Your Guidance Counselor" sections. The comment explicitly says the dynamic fetch was removed in favor of the static BC High data.

**Why this matters:** Belmont Hill students completing their profile will see Paul Zukauskas as their head coach and BC High counselors as their counselor options. Wrong on the face of it. **Spec D7 verification step 3 (a Belmont Hill student running GRIT FIT against seeded profile) cannot pass cleanly without resolution** because the profile form will surface BC High contacts.

**Operator decision required.** Three paths:
- (a) Absorb into D6 / new D6.5: re-introduce the dynamic fetch keyed on the user's `hs_program_id`, scoped to Belmont + BC High. ~1-2 exchanges.
- (b) Carry forward and accept that Belmont Hill students see BC High contacts until a follow-on sprint. Document explicitly in retro; flag visible mismatch in D7.
- (c) Add a Belmont-Hill-conditional static fallback for this sprint only (parallel hardcode), refactor to dynamic in next sprint.

**Recommend (a)** — the dynamic fetch was already there and got removed; reintroducing it under spec generalization fits the sprint's "platform generalization with Belmont Hill as inaugurating use case" framing per spec Section 2.

### 2. NextStepsDashboard BC High S&C tip (Area 3)

**Impact:** `src/components/NextStepsDashboard.jsx:393-397` injects BC-High-specific S&C coach names (Kiely + McClune) into a compound-lifts tip. Belmont Hill students will see BC-High-specific advice.

**Lower severity than #1** because it's a tip text, not a structural form. Recommend carry forward to a follow-on sprint with a school-conditional tip variant pattern. Document in retro.

### 3. CSV row-count discrepancy (Area 1)

**Impact:** Spec Section 4 says 5 students; CSVs only support 3. Acceptance criteria in spec Section 6 reference the 5-student count. **Spec amendment or CSV addition required** before D4 fires.

This is the most consequential blocker because it sits at the start of the D4 chain. If 2 students are missing, D7 step 1 (head coach sees 5 students) and step 2 (counselor sees 5 students) cannot pass.

---

## MULTI-SESSION DECLARATION CHECK

Against the four triggers from `sprint-017-phase-0-audit-plan.md`:

| Trigger | Status | Reason |
|---|---|---|
| Area 4 returns school-filtered admin query | CLEAR | Admin is school-agnostic via `app_metadata.role` JWT claim. |
| Area 5 returns multi-layer collision risk | CLEAR | Seven-layer sweep clean; `/recruits/*` is legacy-proxy-owned and separate from Belmont Hill onboarding flow. |
| Area 6 returns no documented seed pattern | CLEAR | Pattern is well-documented in `seed_users.js` + `bulk_import_students.js`; needs parameterization, not greenfield authorship. |
| Area 2 design-token entanglement deeper than single seam | CLEAR | Single seam in `src/index.css`; body-class swap covers all 6 consumer files. |

**However, two non-trigger blockers surfaced that materially shift Phase 1+ scope:**

- **CSV row-count discrepancy (Area 1):** spec amendment OR additional CSV rows needed before D4. Resolution by operator is fast (one decision).
- **Profile-form static BC High data (Cross-Area Synthesis #1):** absorbed = +1-2 exchanges; carry forward = D7 step 3 visibly mismatched.

**Audit recommendation:** **CLEAR for Phase 1 (D2 + D3) without multi-session declaration.** D2 and D3 are unaffected by either blocker. **Operator decisions on the two blockers should be taken before Phase 2 (D4) opens** — the row-count question must be resolved before seed data is structured, and the ProfilePage scope question affects whether D4 / D6 absorb additional work.

If both blockers resolve in favor of absorption inside this sprint (5-row CSV provided + ProfilePage dynamic fetch reintroduced), expect total budget at 18-20 exchanges — at the ceiling but inside it. If either pushes past, declare multi-session before Phase 2 opens.

**MULTI-SESSION DECLARATION: not required at Phase 0 close. Re-evaluate after operator resolves the two blockers, before Phase 2 opens.**

---

## PHASE 1 READINESS

**D2 — Migration 0043 (generalize anon SELECT predicate):**

Replace the BC-High-hardcoded predicate in `0038_add_public_recruits_select.sql` with a join against `hs_programs`. Concrete shape:

```
DROP POLICY profiles_select_public_recruits ON public.profiles;
CREATE POLICY profiles_select_public_recruits
  ON public.profiles FOR SELECT TO anon
  USING (high_school IN (SELECT school_name FROM public.hs_programs));

DROP POLICY short_list_items_select_public_recruits ON public.short_list_items;
CREATE POLICY short_list_items_select_public_recruits
  ON public.short_list_items FOR SELECT TO anon
  USING (
    user_id IN (
      SELECT user_id FROM public.profiles
      WHERE high_school IN (SELECT school_name FROM public.hs_programs)
    )
  );
```

Preserves BC High visibility (BC High row exists in `hs_programs`, BC High profiles match). Grants Belmont Hill visibility automatically once D3's `hs_programs` row is inserted. Per Sprint 011 PII-render-boundary precedent, joins on `hs_programs` (small reference table, currently 1 row → 2 rows after D3) are RLS-safe.

**D3 — Migration 0044 (Belmont Hill seed identity):**

Two INSERTs in a single transactional migration:

```
INSERT INTO public.hs_programs (school_name, address, city, state, zip)
  VALUES ('Belmont Hill School', '350 Prospect Street', 'Belmont', 'MA', '02478');

INSERT INTO public.partner_high_schools (slug, name, timezone)
  VALUES ('belmont-hill', 'Belmont Hill School', 'America/New_York');
```

(Address from public Belmont Hill School information — operator confirms; conference / division / state_athletic_association optional, leave null per BC High pattern unless operator supplies.)

**One-line follow-up edit to `src/data/recruits-schools.js` lines 25-31:** flip `active:false → true`, `filter:null → 'Belmont Hill School'`, drop `comingMonth`. This activates Belmont Hill on `/athletes`. Can land in same Phase 1 commit or as a Phase 3 (D5/D6) edit; recommend Phase 1 close so the public roster picks up Belmont Hill the moment D3 lands.

**Phase 1 acceptance check:** BC High rows still visible to anon on `/athletes`; Belmont Hill rows return zero (no Belmont profiles yet — D4 lands them in Phase 2).

**Operator authorization needed for Phase 1:** confirm Belmont Hill address/city for D3 INSERT, confirm migration number `0043` and `0044` are still next-available.

---

## END-OF-PHASE OUTPUT

**Phase:** Phase 0 — Belmont Hill Onboarding Audit
**Status:** COMPLETE
**Artifact:** `docs/specs/sprint-017-phase-0-audit-report.md` (this file, untracked)
**Cost:** ~1.0 exchange of audit work; well under 1.5-exchange ceiling.

**Outcomes — what we know now:**
- CSV shapes and column drift fully mapped; row-count blocker surfaced (3 vs. 5).
- Design-token system has a single seam; Belmont hex values proposed pending operator approval.
- BC High string inventory complete; two unanticipated front-end hardcodes surfaced (ProfilePage, NextStepsDashboard).
- Admin-login is school-agnostic; D7 step 5 is free.
- Seven-layer route sweep clean; no Sprint-011-style late-Phase-3 collision risk.
- Seed pattern documented and parameterizable; idempotency pattern strong.
- Password pattern: fixed-default; recommend `'sextants2027'` for Belmont.

**Operator decisions required before Phase 1 opens:**
1. Belmont Hill address / city for D3 INSERT (or confirm leaving city/zip null).
2. Confirm migration numbers `0043` (D2) and `0044` (D3) are next-available.

**Operator decisions required before Phase 2 (D4) opens:**
1. CSV row-count discrepancy: provide 2 additional student rows OR amend spec to 3 students.
2. ProfilePage static BC High data: absorb into sprint (recommend) or carry forward.
3. NextStepsDashboard BC High S&C tip: absorb (low cost) or carry forward.
4. Belmont Hill default password: `'sextants2027'` recommended, or operator-supplied.
5. Belmont Hill hex values: `#1B3D8F` Deep Blue / `#B41F2E` Scarlet from logo, or operator-authoritative override.

**Push state:** report file untracked. No commits.

**Next action:** Operator authorizes Phase 1 (D2 + D3 migrations) with the two Phase-1-prereq decisions, OR pauses to resolve the Phase-2 decisions first if the sprint wants single-session-target shape.
