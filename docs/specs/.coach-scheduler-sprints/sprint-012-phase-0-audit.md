---
sprint_id: Sprint012
phase: 0
phase_name: Pre-Sprint Audit
audit_date: 2026-05-01
status: draft
audit_branch: master
audit_head: 1dbac9c52755671613b80e2087d3de478b0899b8
---

# Sprint 012 Phase 0 — Pre-Sprint Audit

Read-only audit. No migrations created, no component code written, no Phase 1 entry.
Repo at `master` / `1dbac9c` (Sprint 011 retro filing on top of merge `22b523f`). Working tree clean except for the Sprint 012 spec itself (untracked).

---

## A. Schema Review

### A.1 Migration inventory

39 migrations on disk under `supabase/migrations/`. Numbering is contiguous from `0001_*` through `0038_*` plus `0000_bootstrap-migrations.sql`.

| Range | Topic |
|---|---|
| 0001–0011 | Core tables — hs programs, users, profiles, schools, short-list, file uploads, email tokens |
| 0012–0019 | RLS policies, document library |
| 0020–0028 | Grit-fit labels, profile additions, journey steps, college coaches scaffolding |
| 0029–0033 | college_coaches, recruiting_events, student_recruiting_events, coach_contacts |
| 0034–0037 | Schools admin policies, audit log, athletics_contact, journey relabel |
| 0038 | `0038_add_public_recruits_select.sql` — Sprint 011 anon-read RLS |

**Highest applied: `0038`. Next migration number: `0039`.** Confirmed.

### A.2 Existing schemas unchanged from Sprint 011 baseline

`profiles` (`0007`), `schools` (`0008`), `short_list_items` (`0009`), and the Sprint 011 RLS migration `0038` are all on disk in identical form. No migration introduced between Sprint 011 close and this audit.

### A.3 Convention conformance — proposed `visit_requests` and `coach_submissions`

Validated against actual repo precedent set in `0029_college_coaches.sql`, `0030_recruiting_events.sql`, `0031_student_recruiting_events.sql`, `0032_coach_contacts.sql`:

| Convention | Repo precedent | Sprint 012 spec | Verdict |
|---|---|---|---|
| UUID PK pattern | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (DEC-CFBRB-064) | `id (uuid, primary key)` for both new tables | ✓ Aligned |
| FK naming style | `<entity>_id` columns (`profile_id`, `coach_id`, `event_id`); FK to `schools` is named `unitid` (the PK column) | `coach_submission_id`, `school_id` | **⚠ school_id deviates — see A.4** |
| Enum vs text precedent | text + CHECK constraint (DEC-CFBRB-067). Repo has zero `CREATE TYPE ... AS ENUM` statements. | Spec uses the word "enum" for `time_window`, `status`, `source` | **⚠ language mismatch — code must be text + CHECK** |
| timestamptz default | `created_at timestamptz NOT NULL DEFAULT now()` | `created_at (timestamptz, default now())` | ✓ Aligned |
| RLS — anon write surface | No precedent; every existing table denies anon writes. `0038` only granted anon SELECT, never INSERT. | Implied (modal must INSERT under anon) | **⚠ new pattern — see B and Decisions Forced** |
| Unique constraint for upsert | `profiles.user_id UNIQUE`, `student_recruiting_events UNIQUE(profile_id, event_id)` | `coach_submissions.email UNIQUE` | ✓ Aligned (must be declared as a CONSTRAINT, not just `text unique` shorthand, to satisfy ON CONFLICT — Postgres `42P10` will fire otherwise; verified in B.5) |

### A.4 Critical FK type collision: `schools.unitid` is `integer`, not `uuid`

`supabase/migrations/0008_schools.sql:9-49` — `schools.unitid` is **INTEGER**, the table PK, with 662 rows seeded from a Google Sheet.

Sprint 012 spec D6 declares `visit_requests.school_id (uuid, FK to schools)`. **This cannot be created as written.** A foreign key to `schools(unitid)` must be `int`, not `uuid`.

Three options for resolution (operator decision before migration is written):
1. **Rename to `unitid` and type as `int`.** Matches every existing FK to `schools` in the repo (`college_coaches.unitid`, `recruiting_events.unitid`, `coach_contacts.unitid`). Strongest convention conformance.
2. **Keep `school_id` name, type as `int`.** Slight naming deviation from the rest of the repo but matches the spec's column name.
3. **Re-source from `RECRUIT_SCHOOLS` slug, no FK to schools at all.** `src/data/recruits-schools.js` defines partner schools by slug (`'bc-high'`, `'belmont-hill'`); BC High is **not** in `public.schools` (which is the NCAA institution table — colleges, not high schools). Visits are *to* the high school, not *to* a college. **This option is most likely correct on substance.** See E.1 below.

This deviation is a **forced decision** before Phase 1.

### A.5 Proposed migration filenames

If the spec migration ships as one file:
- `supabase/migrations/0039_coach_scheduler_tables.sql`

If split (recommended for review clarity, matches the 0029→0030→0031→0032 pattern):
- `supabase/migrations/0039_coach_submissions.sql`
- `supabase/migrations/0040_visit_requests.sql`

Both files would include: table DDL + indexes + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + the anon INSERT policy + a service-role-only SELECT policy (or no SELECT policy, which under RLS denies all reads — which is what the spec wants; spec D6 is silent on whether the operator-facing admin needs SELECT, that's a sub-question).

**Do not create these yet.** Phase 0 documents only.

---

## B. Live Anon-Key Boundary Probe

Probe runner: `scripts/probe-sprint-012.mjs` (created this audit; can be deleted post-Phase-0 or retained as Phase 0 tooling).
Run with: `node scripts/probe-sprint-012.mjs`. Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`.
Project: `xyudnajzhuwdauwkwsbh.supabase.co` (production, anon role).

### Probe 1 — Control: anon SELECT against `profiles` for BC High should succeed

```js
sb.from('profiles').select('user_id, name, high_school', { count: 'exact' })
  .eq('high_school', 'Boston College High School').limit(1)
```

Result: `rowCount: 26`, sample row `{ user_id: '4effa4d5-...', name: 'Ayden Watkins', high_school: 'Boston College High School' }`, no error.
**Pass.** `0038` policy is live in production. Anon key works. RLS row-scoping by `high_school` matches Sprint 011 retro Section 2 D9.

### Probe 2 — Control: anon SELECT against `coach_contacts` should be RLS-denied

```js
sb.from('coach_contacts').select('id').limit(1)
```

Result: `rows: 0`, no error.
**Pass.** `0032_coach_contacts.sql` scopes SELECT to `auth.uid()`-derived rows. Anon has no `auth.uid()`, so the policy returns zero rows silently — Postgres RLS standard behavior for SELECT denials. No error is correct (PostgREST does not surface "denied" on SELECT; it surfaces an empty result set).

### Probe 3 — Simulated `visit_requests` SELECT against current schema

```js
sb.from('visit_requests').select('id').limit(1)
```

Result: `error: "Could not find the table 'public.visit_requests' in the schema cache"`, code `PGRST205`.
**Pass.** Table does not exist. Schema is clean for the new table — no name collision in the production schema cache.

### Probe 4 — Simulated `coach_submissions` SELECT against current schema

```js
sb.from('coach_submissions').select('id').limit(1)
```

Result: `error: "Could not find the table 'public.coach_submissions' in the schema cache"`, code `PGRST205`.
**Pass.** Same as probe 3.

### Probe 5a — Anon plain INSERT into `profiles` should be RLS-denied

```js
sb.from('profiles').insert({ user_id: '00000000-...', name: 'probe-test', email: 'probe-5a@example.invalid' })
```

Result: `error: "new row violates row-level security policy for table \"profiles\""`, code `42501`.
**Pass.** Establishes the baseline: anon writes are universally denied across the schema today. Sprint 012's `coach_submissions` and `visit_requests` will be the first tables in this repo with an anon INSERT policy. Risk profile is real and must be tightly scoped (no SELECT for anon, no UPDATE for anon, INSERT only with WITH CHECK column-bounded if possible).

### Probe 5b — Anon UPSERT pattern with ON CONFLICT against unique column

```js
sb.from('profiles').upsert({ user_id: '00000000-...', name: 'probe-test', email: 'probe-5b@example.invalid' },
                           { onConflict: 'user_id' })
```

Result: `error: "new row violates row-level security policy for table \"profiles\""`, code `42501`.
**Pass.** Confirms the `supabase-js` upsert call shape that Sprint 012's modal will use is well-formed at the wire layer (the request reached the engine, ON CONFLICT was parsed against a real unique constraint, RLS denied as expected). When the new INSERT policy on `coach_submissions` is in place AND `email` is declared as a real `UNIQUE` constraint (not just shorthand), this upsert pattern will write/update cleanly.

**Important sub-finding:** an earlier probe attempted upsert with `onConflict: 'email'` against `profiles` — Postgres returned `42P10` ("no unique or exclusion constraint matching the ON CONFLICT specification") because `profiles.email` is **not** declared UNIQUE. Sprint 012 DDL must declare `coach_submissions.email` with an explicit `UNIQUE` constraint at the column or table level for the spec's "duplicate email update" behavior to function.

### Section B verdict

The auth boundary holds as expected. The new tables don't collide with the schema. The upsert pattern works at the wire layer. **Two write-path requirements emerged and must be satisfied at migration time:**
1. New explicit anon INSERT policies on `coach_submissions` and `visit_requests` with column-bounded `WITH CHECK` (e.g., reject any `verified=true` submission from anon).
2. `coach_submissions.email` must be declared as a Postgres unique constraint, not just a typed-text column with the word "unique" in the spec.

---

## C. URL Collision Audit

### C.1 React Router

`src/App.jsx:23-50` — registered routes:

| Path | Component | Auth | Sprint 012 collision |
|---|---|---|---|
| `/login`, `/register` | LoginPage, RegisterPage | none | — |
| `/admin-login`, `/admin/*` | AdminLoginPage, AdminPage | AdminRoute | — |
| `/styleguide` | StyleguidePage | none | — |
| `/athletes` | AthletesPage | none | **target page** |
| `/coach-login-placeholder` | CoachLoginPlaceholderPage | none | — |
| `/`, `/profile`, `/gritfit`, `/shortlist`, `/coach` | various | varies | — |
| `*` | redirect to `/` | none | — |

Sprint 012 adds CTA + modal on `/athletes` only — no new route required.

### C.2 `vercel.json` rewrites

```json
{
  "rewrites": [
    { "source": "/recruits/login", "destination": "/recruits/login.html" },
    { "source": "/recruits/auth", "destination": "/api/recruits-auth" },
    { "source": "/recruits/:path*", "destination": "/api/recruits-auth" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `/recruits/*` trio routes anything under `/recruits/` to the legacy proxy. Sprint 012 does **not** touch `/recruits/*`. The catch-all `/(.*) → /index.html` handles all other paths via React Router and intercepts before any Edge Function is hit, **unless the request is routed to `/api/...` first** — Vercel routes `/api/*` to the `api/` directory implicitly before the rewrite rules apply.

If Sprint 012's submit goes through a new Edge Function at, say, `api/visit-request.ts`, the URL `/api/visit-request` does not collide with anything in the rewrite list and reaches the function cleanly. **No collision.**

If the modal submits directly via `supabase-js` (anon INSERT), no Edge Function path is needed at all. This is the simpler and recommended Sprint 012 architecture (also matches `useRecruitsRoster.js` precedent — Sprint 011 used the anon client directly with no API layer).

### C.3 `public/` static asset paths

```
public/grittyfb-logo.png
public/helmet.png
public/recruits/login.html         ← legacy proxy login page
public/tour/*.png                  ← onboarding tour assets
```

No path under `public/` collides with any plausible Sprint 012 surface. The only `public/recruits/` entry is the static login page for the legacy proxy — Sprint 012 does not touch it.

### C.4 `api/` Edge Functions

```
api/recruits-auth.ts               ← legacy proxy ONLY
```

One file. Sprint 012 must not modify it. Adding `api/visit-request.ts` (if needed) would not collide.

### C.5 Legacy proxy untouched

Confirmed `api/recruits-auth.ts` is the only file in `api/`. It is the legacy `/recruits/<slug>/...` password-gated reverse proxy. Sprint 012 does not enter that namespace and does not modify the file. Per Sprint 011 retro Section 7C and BL-S011-08, this system has live `RECRUIT_*` env vars in production and zero project-side governance — Sprint 012 inherits that constraint and leaves the proxy alone.

---

## D. Existing-System Inventory

### D.1 Code grep — `coach_*`, `visits`, `visit_*`, `request*`, `scheduler`, `drop_in`, `dropin`

Patterns: `visit_request|visit_requests|visits_|coach_submission|coach_submissions|drop_in|dropin|scheduler`.

9 files matched. Breakdown:

| Match location | Type |
|---|---|
| `docs/specs/.coach-scheduler-sprints/sprint-012-session-spec.md` | Spec being audited |
| `docs/specs/.coach-scheduler-sprints/sprint-011-retro.md` | Sprint 011 retro |
| `docs/specs/.coach-scheduler-sprints/sprint-011-session-spec.md` | Sprint 011 spec |
| `docs/specs/.coach-scheduler-sprints/index.html` | Visual prototype |
| `src/index.css:13` | Doc-path comment |
| `src/components/recruits/RecruitCard.jsx:17` | Doc-path comment |
| `src/components/styleguide/PlayerCardReference.jsx:6` | Doc-path comment |
| `src/pages/AthletesPage.jsx:5` | "no scheduler" disclaimer in comment |
| `package-lock.json` | Transitive package metadata, irrelevant |

**No live code, no functions, no exports, no types, no tests reference any pre-existing coach-scheduler / visit-request / drop-in system.** Clean greenfield.

### D.2 Loose `visit` matches — recruiting_events, NOT scheduler

A broader grep on `visit|Visit` surfaces matches in recruiting domain code: `AdminRecruitingEventsTab.jsx` uses event_type values `'official_visit'` and `'unofficial_visit'`; `RecruitingScoreboard.jsx` uses a `tour_visit` step key; `RecruitsHero.jsx` uses the marketing phrase "One visit away."

These are **logically unrelated** to Sprint 012's `visit_requests` (which is coach-initiated drop-in scheduling, captured into a new table). They share a noun, not a system.

**Naming concern (not a hard collision):** `visit_requests` and `recruiting_events.event_type='official_visit'` could be confused at the data-modeling layer as the spec evolves. Worth a one-sentence header comment on `0039_*` clarifying that `visit_requests` is the *coach-asks-to-come-by* surface, distinct from `recruiting_events` which is the *student-attends-a-school-event* surface.

### D.3 Env var grep — `COACH_*`, `VISIT_*`, `SCHEDULER_*`, `DROPIN_*`

Pattern: `COACH_|VISIT_|SCHEDULER_|DROPIN_`.

12 files matched. All matches are unrelated:
- `student-read-recruiting-contacts.test.js`, `coach-dashboard-tabs.spec.js`, etc. — use the words `COACH`/`VISIT` as plain English, not env var prefixes
- `src/components/Layout.jsx`, `src/lib/navLinks.js` — coach role labels in nav copy
- `tests/regression.spec.js` — coach-domain test naming
- `.github/workflows/playwright.yml` — Playwright workflow, no env keys matching

**No env vars in `.env` matching `VISIT_*`, `SCHEDULER_*`, or `DROPIN_*`.** `COACH_*` env vars do not exist either; the only coach-adjacent env vars in `.env` are the standard Supabase keys.

`.env` contents (sensitive values truncated): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `SUPABASE_PAT`. Nothing scheduler-related.

### D.4 `api/` handler inventory

Single file: `api/recruits-auth.ts`. No coach-intake handler, no visit-scheduling handler, no submission handler. Greenfield.

### D.5 Section D verdict

Coach-scheduler is genuinely greenfield. **No undocumented production system surfaces here** — the kind of finding that triggered the path pivot in Sprint 011 (Section 7C / BL-S011-08) is absent for this sprint. The single naming consideration is the `visit_requests` ↔ `recruiting_events.event_type='official_visit'` semantic overlap, addressed by a header comment.

---

## E. Six Data Questions

### E.1 Canonical schools table for Sprint 012's `school_id`

`public.schools` (`0008_schools.sql`) holds **662 NCAA institutions** keyed by `unitid integer`. It is the college schools table, populated from `sync_schools.py` against a Google Sheet. **BC High is not in this table** — `schools` is colleges, not high schools.

The Sprint 012 modal captures *the high school the visiting coach wants to drop in on*. The high schools surface is `RECRUIT_SCHOOLS` in `src/data/recruits-schools.js` — currently a hardcoded JS array of two entries (BC High active, Belmont Hill disabled). There is no corresponding Postgres table for partner high schools.

This is the substantive force behind A.4. **Three resolutions:**
1. **`visit_requests.school_slug text NOT NULL`** — store the slug from `RECRUIT_SCHOOLS` directly (`'bc-high'`). No FK, application-layer integrity. Lowest-friction.
2. **Add a `partner_high_schools` table in `0039_*` first**, seed it with BC High and Belmont Hill, then `visit_requests.school_id uuid REFERENCES partner_high_schools(id)`. Highest-rigor, more ceremony for a 2-row table.
3. **Re-use the legacy `recruits-schools.js` JS array as source of truth**, store slug in DB, defer table introduction to a later sprint. Compromise.

**Recommended for MVP: Option 1 (`school_slug text`)**, with a CHECK constraint enumerating the active slugs. This matches the slug-in-config pattern Sprint 011 already established and avoids creating a 2-row table just to satisfy FK ceremony. Operator decides.

### E.2 Timezone convention

No timezone library is imported anywhere in `src/`. `Intl.DateTimeFormat` and `new Date()` are used directly in 17 components — all default to the browser's local timezone for display.

`timestamptz` columns in Postgres store as UTC and round-trip with offset preserved; the JS layer renders them in the browser's local zone. There is no app-wide timezone constant, no "all times in ET" convention enforced.

**For Sprint 012:** `visit_requests.requested_date` is declared as `date` (not `timestamptz`) in the spec, which sidesteps timezone entirely — a date is a date. The `time_window` column is a label (`morning`, `midday`, etc.), not a clock time, which also sidesteps timezone. **Spec is timezone-clean as drafted.** No decision needed if the date-only + label approach holds.

### E.3 Enum vs text precedent

**Repo convention is text + CHECK constraint, established in DEC-CFBRB-067.** Zero `CREATE TYPE ... AS ENUM` statements anywhere in `supabase/migrations/`. Examples:

- `coach_contacts.contact_type text CHECK (contact_type IN ('email','call','text','in_person','dm','camp'))` (`0032`)
- `recruiting_events.event_type text CHECK (event_type IN ('camp','junior_day','official_visit','unofficial_visit'))` (`0030`)
- `student_recruiting_events.status text CHECK (status IN ('recommended_by_coach','registered','on_calendar','attended'))` (`0031`)

Sprint 012 spec uses the word "enum" for `time_window`, `status`, `source`. **Implementation must be text + CHECK**, not `CREATE TYPE`. No spec change required — the word "enum" is loose; the migration just needs to spell it out as `CHECK (col IN (...))`.

### E.4 Vercel preview auth (Standard Protection)

`vercel.json` does not encode Standard Protection — it is a Vercel project setting, not a config file directive. Cannot be observed by reading `vercel.json`.

Sprint 011 retro Section 8 carry-forward states: **"Vercel Standard Protection re-toggled ON post-merge (operator-driven)."** Trusting that retro entry: Standard Protection is currently ON for previews. Operator-confirm before Phase 1 if uncertain.

`gh api` cannot query Vercel project settings (different platform). Operator can verify in 30 seconds at the Vercel dashboard.

### E.5 Modal pattern reuse

**`src/components/SlideOutShell.jsx` is a strong candidate to extend, not replace.** Sprint 005 / Sprint 007 established it as the repo's modal pattern. Properties relevant to Sprint 012:

- Already accepts `children` (content-agnostic per the JSDoc)
- Mobile behavior (≤768px) slides up from bottom as a 90vh bottom-sheet — exactly what Sprint 012 D7 calls for
- Desktop slides in from right (240ms ease-out) — works for the 3-step modal with a sticky close button
- Already includes Escape-to-close, focus trap, `aria-modal="true"`, body-scroll lock, `prefers-reduced-motion` handling
- Token-purity guard already passes for it

What Sprint 012 needs to add **on top of `SlideOutShell`**:
- A 3-step content composition (`<SchedulerStep1Date />`, `<SchedulerStep2Time />`, `<SchedulerStep3Coach />`)
- Step state (1 / 2 / 3) lifted to a parent (e.g., `SchedulerModal.jsx` wrapping `SlideOutShell`)
- A confirmation state (D5) that replaces the form

**Decision: extend, do not introduce a new modal primitive.** This matches Sprint 011's pattern of composing on top of stable components (RecruitsHero / RecruitsFilterBar / RecruitCard composed on `<style>`-block + className convention).

### E.6 Form validation utility

`package.json` has **no Zod, no Yup, no @hookform/resolvers, no validator.js**. Form validation in the repo today is custom-only.

Greppable patterns in existing forms (`LoginPage`, `RegisterPage`, `ProfilePage`, admin tabs) use ad-hoc `if (!email || !email.includes('@')) ...` style checks. There is no shared validation utility module.

**Two paths for Sprint 012 D4:**
1. **Stay custom.** Inline checks in `SchedulerStep3Coach.jsx`: required name, required email format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/` or similar), required program. Honeypot check is a one-liner. Matches existing repo convention. Lowest churn.
2. **Introduce Zod.** Adds `zod` as a dependency, establishes a shared schema utility for future sprints. Higher ceremony for a 4-field form.

**Recommended: Option 1 (custom inline)**, with the validation logic isolated in `src/lib/recruits/schedulerValidation.js` so future sprints (013+) can extract it. Defer Zod adoption to a dedicated infra sprint if the team agrees it's needed.

---

## Decisions Forced

These surface from the audit and **must be resolved by operator before Phase 1 opens**:

### DF-1 — High-school identity column on `visit_requests`

Spec says `school_id uuid FK to schools`. `schools` is the colleges table (662 NCAA rows), and BC High is not in it. Three options:
- **(a) `school_slug text NOT NULL CHECK (school_slug IN ('bc-high', 'belmont-hill', ...))`** — recommended; matches slug-in-config Sprint 011 convention.
- **(b) Introduce `partner_high_schools` table first**, FK to it.
- **(c) Free `text` field with no constraint.**

Pick before migration is written.

### DF-2 — Anon INSERT policy scope on `coach_submissions` and `visit_requests`

The two tables become the first anon-writable surface in the schema. Policy must be tightly bounded:
- INSERT only (no SELECT, no UPDATE for anon)
- `WITH CHECK` should pin `verified=false` on coach_submissions (anon cannot write `verified=true`)
- `WITH CHECK` should pin `status='pending'` on visit_requests (anon cannot create a pre-confirmed visit)
- `WITH CHECK` should constrain `source='scheduler'` on coach_submissions (other sources reserved for service role)

Confirm shape before migration is written.

### DF-3 — `coach_submissions.email` UNIQUE constraint declaration

Spec says "unique" inline. Postgres `42P10` will fire on ON CONFLICT unless the column is declared with `UNIQUE` at column or table level (e.g., `email text NOT NULL UNIQUE`). Confirmed in B.5.

### DF-4 — Date filtering logic (open question carried from spec)

Spec lists three options:
- (1) Any future weekday
- (2) Any future date
- (3) Per-school configurable visit days

Spec recommends (1) for MVP. Operator confirms.

### DF-5 — Submit path: direct supabase-js INSERT vs Edge Function

Two architectures viable:
- **(a) Direct anon INSERT via `supabase-js`** — matches Sprint 011 `useRecruitsRoster.js` pattern, no `api/` addition, simplest. RLS does the auth work.
- **(b) `api/visit-request.ts` Edge Function** — adds a server-side validation layer (re-check honeypot, normalize email, IP-based rate limiting later), but introduces a new module to maintain and another env-var surface to manage.

**Recommended (a) for MVP** unless the operator wants server-side rate limiting in v1.

### DF-6 — Partner-high-school enumeration source

The CHECK constraint in DF-1 (option a) needs the active slug list. Currently in `src/data/recruits-schools.js`. If the migration hardcodes the slugs, adding a third partner school later requires a new migration. Acceptable for a 2-school MVP; flag as carry-forward for the inevitable 3rd-school sprint.

---

## Phase 1 Green-Light Checklist

Phase 1 may begin **only when all of the following are true**:

- [ ] **DF-1 resolved.** High-school identity column shape locked (recommend: `school_slug text` with CHECK enumerating `bc-high`, `belmont-hill`).
- [ ] **DF-2 resolved.** Anon INSERT policy `WITH CHECK` shape locked for both tables.
- [ ] **DF-3 resolved.** `coach_submissions.email` declared with explicit `UNIQUE` constraint.
- [ ] **DF-4 resolved.** Date filtering logic chosen (recommend: future weekdays Mon–Fri).
- [ ] **DF-5 resolved.** Submit architecture chosen (recommend: direct anon INSERT, no Edge Function).
- [ ] **DF-6 acknowledged.** Slug-list maintenance carry-forward filed for next school addition.
- [ ] **Spec language amended** to swap "enum" for "text + CHECK" (cosmetic; the migration must be text + CHECK regardless).
- [ ] **Vercel Standard Protection state confirmed** by operator (audit trusts Sprint 011 retro that it's ON).
- [ ] **Sprint 012 spec promoted** from `draft` to `not_started` per its own promotion checklist.
- [ ] **Branch `sprint-012-coach-scheduler` cut** from `master` at `1dbac9c` (or whatever HEAD is at the moment Phase 1 opens).
- [ ] **`scripts/probe-sprint-012.mjs`** decision: keep as Phase 0 tooling (commit), or delete before Phase 1 commit.

When this checklist is complete and operator-accepted, Phase 1 may open.

---

## Audit Boundaries (what this audit did not do)

- Did not create migrations.
- Did not write component code.
- Did not modify any production schema.
- Did not modify `vercel.json`, `api/`, or `public/`.
- Did not stage, commit, or push.
- Did not promote the spec from `draft` to `not_started`.

The audit added two artifacts only:
1. This file: `docs/specs/.coach-scheduler-sprints/sprint-012-phase-0-audit.md`
2. The probe runner: `scripts/probe-sprint-012.mjs`

Both can be deleted, or both can be kept and committed under operator authorization. Phase 0 is read-only by contract; the probe script is the single boundary case (it created a file inside `scripts/` to execute the live probes).

---

## F. EXECUTION_PLAN Staleness Check

EXECUTION_PLAN.md (v4) was restored from a prior Claude.ai conversation download. Authored before Sprint 011 closed. Below is a four-point check on whether v4 reflects current ground truth.

### F.(a) `/recruits` → `/athletes` path pivot

**EXECUTION_PLAN currently reflects it: NO.** v4 names `/recruits` as the public route in five places:

- Line 60 (topology diagram): `│ /recruits  (public page)   │`
- Line 117 (Sprint 1 input state header): "**Sprint 1 — Gritty Recruits Public Page (Read-Only)**"
- Line 126 (Sprint 1 desired output state): `New route /recruits in recruit-hub-rebuild — non-auth, public`
- Line 135 (Sprint 1 acceptance test): `/recruits renders publicly without auth`
- Line 152 (Sprint 2 desired output state): `Persistent sticky CTA strip on /recruits ("Coach? Schedule a Drop-In")`
- Line 297 (Marketing Task): `https://[recruit-hub-host]/recruits`

**Where it should be updated:** all six call-sites above to read `/athletes` (or to acknowledge the pivot with a parenthetical). The Sprint 2 line is the load-bearing one for Sprint 012 — the CTA strip in deliverable D1 mounts on `/athletes`, not `/recruits`. The Marketing Task reference must also be updated, as the grittyfb.com hero CTA is meant to deep-link to the public roster.

**Materiality:** **Yes — affects Sprint 012 scope directly.** Sprint 012 D1 already correctly references `/recruits` only in the colloquial sense; Audit Section C.1 confirms `/athletes` is the actual mount point. The audit's findings are unaffected, but EXECUTION_PLAN as a strategic artifact is misleading on the surface name. Recommend a v5 revision pass before promoting Sprint 012 to `not_started`.

### F.(b) Sprint 011 final-state ledger (merge SHA, Vitest floor)

**EXECUTION_PLAN currently reflects it: NO — and should not.** v4 is a roadmap artifact; per its own structure it carries decisions, sprint scope, and acceptance criteria but does not track per-sprint completion ledger items (SHAs, test counts, PR numbers). Those live in the per-sprint retros (sprint-011-retro.md captures all three).

**Where it should be updated:** N/A — out of scope for EXECUTION_PLAN by design.

**Materiality:** **No.** No staleness; correct separation of concerns.

### F.(c) Sprint 011 retro Section 6 — six prompt-discipline items

**EXECUTION_PLAN currently reflects it: NO.** The six items (A: phase commits at phase close; B: smoke-test prompts reference canonical sources; C: git-state preconditions; D: `git add -A` discipline; E: tool routing) plus Section 7's three audit-thread items (live anon-key SELECT, multi-layer URL collision audit, existing-system inventory) are all process discipline. EXECUTION_PLAN does not carry process notes — these belong in an operator playbook, sprint preamble template, or per-sprint Phase 0 spec.

**Where it should be updated:** N/A in EXECUTION_PLAN. The forward-looking move is for the Sprint 012 session spec (or this audit's Phase 1 checklist) to incorporate Section 7's three audit-thread items as Phase 0 mandatory checks. Audit Sections B (live anon probes), C (multi-layer URL collision), and D (existing-system inventory) already operationalize all three.

**Materiality:** **No** — for EXECUTION_PLAN. **Yes** — operationally; this audit has already discharged all three forward-looking obligations from Sprint 011 retro Section 7.

### F.(d) Architectural carry-forward from Sprints 010 / 011 not captured in v4

**EXECUTION_PLAN currently reflects it: PARTIAL.** Sprint 010 (GrittyFB Design Token System) maps cleanly to v4 Sprint 0; coverage is intact. Sprint 011 carry-forwards (retro Section 8) are not captured in v4:

| Carry-forward | In EXECUTION_PLAN? | Sprint 012 impact |
|---|---|---|
| `useRecruitsRoster.js` data-hook pattern (anon SELECT, no API layer) | No | Material — informs DF-5 (direct supabase-js INSERT recommended) |
| PII whitelist + Twitter normalizer + accolade chip pattern | No | Not material to Sprint 012 (no PII surfaces) but should be retained as repo convention |
| `<style>` block + className pattern for media queries / hover | No | Material — the modal D7 mobile behavior will follow this pattern |
| RLS migration `0038_add_public_recruits_select` in production | No | Material — establishes the anon-RLS pattern Sprint 012 extends to writes (B verdict) |
| Slug-in-config via `src/data/recruits-schools.js` | No (Decision D mentions toggle but not slug source) | Material — informs DF-1 (`school_slug text` recommendation) and DF-6 |
| `SlideOutShell.jsx` as repo modal primitive (Sprints 005/007) | No | Material — informs Sprint 012 modal architecture (audit E.5) |
| Legacy `/recruits/<slug>/` proxy as undocumented production system (BL-S011-08) | No | Material — explains the path pivot and constrains Sprint 012 to leave `vercel.json` and `api/` untouched |

**Where it should be updated:** if v4 is revised, Decision row L should be joined by a Decision M ("Repo conventions established in Sprints 010/011: design tokens, RLS pattern, modal primitive, slug-in-config, anon-data-hook pattern"). Alternative: leave EXECUTION_PLAN as a roadmap and capture conventions in a separate `docs/specs/.coach-scheduler-sprints/CONVENTIONS.md` or equivalent.

**Materiality:** **Yes** — six of the seven uncaptured carry-forwards directly inform Sprint 012 architecture choices (DF-1, DF-5, modal pattern, mobile pattern, RLS pattern, governance constraint on `api/`). The audit has worked from the actual repo state rather than from v4, so audit findings are not contaminated by the staleness — but a Sprint 012 implementer reading v4 alone would lack this context.

### F. — Net assessment

EXECUTION_PLAN v4 is stale on the public-route name (point a, six call-sites) and silent on the Sprint 011 architectural carry-forwards (point d, seven items). Both are recoverable with a v5 revision pass. Points b and c are correctly out of scope for EXECUTION_PLAN.

The audit's findings (Sections A–E and the six DF items) are independent of v4 staleness — they were derived from the live repo and live anon-key probes, not from v4. **Recommend EXECUTION_PLAN v5 revision before Sprint 012 promotes to `not_started`** so a future implementer reading the strategy artifact in isolation gets accurate routing.

---

## G. Reconciliation of DF-1 through DF-6 against EXECUTION_PLAN

For each Decision Forced, this section quotes the audit finding, states whether EXECUTION_PLAN already settles it, and — if not or only partially — restates as an open decision.

### DF-1 — High-school identity column on `visit_requests`

**Quoted finding:** "Spec says `school_id uuid FK to schools`. `schools` is the colleges table (662 NCAA rows), and BC High is not in it." (audit Decisions Forced, DF-1)

**Settled by EXECUTION_PLAN: NO** (at v4 audit time; **RESOLVED** as of 2026-05-01 per locked decision). v4 Sprint 2 listed `school_id (FK)` in the minimum-fields enumeration but did not specify the FK target table or column type. Decision D (school toggle) and Decision K (`scheduler-created profiles vs. scraped contacts` separation) referenced partner schools but did not address the partner-school identity column shape on `visit_requests`. The topology diagram showed `users (head_coach flag)` and a generic `schools` reference but did not disambiguate NCAA institutions vs. partner high schools.

**RESOLVED — Option 2: introduce `partner_high_schools` table.** `visit_requests.school_id` becomes `uuid NOT NULL REFERENCES partner_high_schools(id)`.

**Migration shape (for `0039_*`; this resolution documents the shape, the migration is authored at Phase 1):**

```sql
CREATE TABLE partner_high_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  meeting_location text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: BC High only for Sprint 012. Belmont Hill onboards in a later sprint.
INSERT INTO partner_high_schools (slug, name, meeting_location, address) VALUES
  ('bc-high', 'Boston College High School',
   'BC High Football Office, 150 Morrissey Blvd., Dorchester, MA 02125',
   '150 Morrissey Blvd., Dorchester, MA 02125');

-- visit_requests FK column
ALTER TABLE visit_requests ADD COLUMN school_id uuid NOT NULL
  REFERENCES partner_high_schools(id);

-- RLS on partner_high_schools: anon SELECT only (school identity is intentionally public — modal needs it)
CREATE POLICY "anon can read partner_high_schools"
  ON partner_high_schools FOR SELECT TO anon
  USING (true);
```

**Rationale:**
- **Collapses DF-6.** The CHECK-constraint enumeration that motivated DF-6 is no longer the schema shape. Adding a third partner school becomes an INSERT, not a migration.
- **Simplifies Sprint 013 D4.** `meeting_location` lives natively on `partner_high_schools` (already seeded for BC High in `0039_*`); Sprint 013 D4 collapses from "add column to schools + populate" to "confirm `partner_high_schools.meeting_location` is populated."
- **FK target now exists.** `school_id uuid` cannot point at `public.schools` (NCAA institutions, `unitid integer` PK, BC High not in it — see audit Section A.4). `partner_high_schools` provides a real uuid FK target for the partner-school namespace.
- **Decision K alignment unchanged.** `partner_high_schools` is school identity, not coach identity. Decision K's semi-staging-table extension stays intact.

**Slug-in-config separation (explicit):** `src/data/recruits-schools.js` continues as the source of truth for which schools are **active in the UI** (school toggle, default selection, ordering). `partner_high_schools` becomes the source of truth for **school identity** (FK target, RLS scope, data integrity). The two stay loosely coupled — config drives UI behavior, table drives data model. The slug column on `partner_high_schools` is the join key when needed, but neither side depends on the other being authoritative for both concerns.

**Seed scope:** BC High only for Sprint 012 (single row, populated in `0039_*` migration body). Belmont Hill onboards in a later sprint via `INSERT INTO partner_high_schools`, not via migration.

**Rejected alternatives:**
- **Option 1 (`school_slug text` + CHECK)** — lighter migration, but doesn't collapse DF-6 (CHECK still hardcodes the slug list); forces `meeting_location` to live on the misnamed `schools` (NCAA) table or remain config-only; doesn't give Sprint 013 a clean home for school metadata.
- **Option 3 (rename refactor — `schools` → `ncaa_schools`, partner table → `schools` or `high_schools`)** — correct end-state for project namespace honesty, but multi-sprint blast radius across queries, RLS policies, hooks, components, types, and migrations. Deferred to backlog item BL-S012-XX-naming-hygiene (filed in EXECUTION_PLAN Backlog).

Mirrored into EXECUTION_PLAN v5.5 Open Decisions DF-1, DF-6 collapse documentation, Sprint 012 spec D6 (new `partner_high_schools` table definition + updated `visit_requests` FK), and Sprint 013 spec D4 (simplified to confirmation task).

### DF-2 — Anon INSERT policy scope on `coach_submissions` and `visit_requests`

**Quoted finding:** "The two tables become the first anon-writable surface in the schema. Policy must be tightly bounded: INSERT only (no SELECT, no UPDATE for anon); `WITH CHECK` should pin `verified=false` on coach_submissions...; `WITH CHECK` should pin `status='pending'` on visit_requests...; `WITH CHECK` should constrain `source='scheduler'` on coach_submissions." (audit Decisions Forced, DF-2)

**Settled by EXECUTION_PLAN: NO** (at v4 audit time; **RESOLVED** as of 2026-05-01 per locked decision). v4 did not address RLS at any sprint. Sprint 1 acceptance test stated the public page renders "without auth" but did not specify policy shape; the migration `0038` that satisfied Sprint 1's read path was authored mid-sprint, not anticipated in v4. Sprint 2 in v4 made no mention of write-side RLS at all.

**RESOLVED — Option B column-bounded INSERT with B1 FK-only binding.** Specific `WITH CHECK` shape for the `0039_*` migration:

- **`coach_submissions` anon INSERT policy `WITH CHECK`:**
  - `verification_state = 'unverified'` — anon cannot self-promote past unverified (updated 2026-05-01 per DF-7 cascade; replaces the original `verified = false` clause now that `verified` boolean is superseded by the four-state `verification_state` column)
  - `source = 'scheduler'` — anon cannot impersonate other intake paths (e.g., `'registration'`, reserved for service role)
- **`visit_requests` anon INSERT policy `WITH CHECK`:**
  - `status = 'pending'` — anon cannot self-confirm a visit
  - `coach_submission_id` binding: rely on FK enforcement only. No additional `WITH CHECK` constraint on the relationship.

Both tables: anon has INSERT only — zero SELECT, zero UPDATE, zero DELETE. SELECT denials surface as empty result sets per Postgres RLS standard (Probe 2 confirmed the pattern on `coach_contacts`).

**Threat model rationale:** Sprint 012's threat model is honeypot-passing spam, not sophisticated attackers running custom Supabase clients. FK gives real referential integrity at the data layer. The two inserts (one to `coach_submissions`, one to `visit_requests`) go through the same anon-permitted path; an attacker spamming `visit_requests` rows pointing at the same `coach_submission_id` is the residual risk, **accepted**. If Sprint 013 email-send work surfaces actual abuse, the upgrade path is RPC consolidation (Option B3) where rate-limiting becomes a function-level concern. The Edge Function decision in DF-5 can independently add request-layer rate-limiting without changing the RLS policy.

**Rejected alternatives:**
- Option A (wide-open INSERT) — exposes `verified` / `status` / `source` columns to client-side tampering.
- Option C (shape-validated INSERT) — duplicates app-layer validation in migration code that evolves slower than the app.
- B2 binding (time-bound) — half-measure; doesn't stop attackers who can run two inserts in 60 seconds, adds clock-aware function complexity for marginal gain.
- B3 binding (RPC consolidation) — correct future state for Sprint 013+, premature for Sprint 012's threat model.

Mirrored into EXECUTION_PLAN v5.2 Open Decisions DF-2 and Sprint 012 spec Risk Register row 1.

### DF-3 — `coach_submissions.email` UNIQUE constraint declaration (RESOLVED 2026-05-01, REFRAMED 2026-05-01)

**Quoted finding:** "Spec says 'unique' inline. Postgres `42P10` will fire on ON CONFLICT unless the column is declared with `UNIQUE` at column or table level (e.g., `email text NOT NULL UNIQUE`). Confirmed in B.5." (audit Decisions Forced, DF-3)

**Settled by EXECUTION_PLAN: PARTIAL** (at v4 audit time; **RESOLVED** as of 2026-05-01 per locked decision). v4 Sprint 2 line 167 read `Email unique within table` — the uniqueness intent was captured, but v4 did not specify it as a Postgres CONSTRAINT declaration. The audit Probe 5b sub-finding (line 142) is the load-bearing detail: shorthand `text unique` in a spec is not the same as a real `UNIQUE` constraint at DDL time, and the spec's "duplicate email update" behavior (D6 last paragraph) requires the real constraint for ON CONFLICT to function.

**RESOLVED — email column declared UNIQUE in 0039 migration. ON CONFLICT pattern operates at column level, not application layer.** Probe 5 surfaced the failure mode live (Postgres error `42P10` fires without the column-level constraint). Sprint 012 migration `0039_*` declares `email text NOT NULL UNIQUE` (or table-level `UNIQUE(email)`) so the spec's "duplicate email update" behavior — `INSERT ... ON CONFLICT (email) DO UPDATE` — operates against a real unique index. Mirrored into EXECUTION_PLAN v5.1 Open Decisions DF-3.

#### REFRAMED 2026-05-01 — UNIQUE constraint dropped per intake-log architecture pivot

**Reframed 2026-05-01 by the intake-log architecture pivot.** `coach_submissions` is an append-only intake record; multiple submissions from the same email are valid distinct rows. UNIQUE constraint dropped via `0041` migration. The email column remains; it is no longer unique. The original DF-3 framing assumed a single per-coach row (with ON CONFLICT to update). The intake-log behavior treats each submit as a new row of intake — a coach who submits twice creates two intake rows, both preserved verbatim. Canonical coach identity (one row per coach with current contact info) lives at the `college_coaches` layer, populated by a later enrichment pipeline that reads `coach_submissions` most-recent-by-email. The DF-3 problem (ensuring ON CONFLICT operates against a real index) becomes moot because there is no ON CONFLICT — every submit is a plain `.insert()` of a new row.

### DF-4 — Date filtering logic

**Quoted finding:** "Spec lists three options: (1) Any future weekday; (2) Any future date; (3) Per-school configurable visit days. Spec recommends (1) for MVP. Operator confirms." (audit Decisions Forced, DF-4)

**Settled by EXECUTION_PLAN: PARTIAL** (at v4 audit time; **RESOLVED** as of 2026-05-01 per locked decision). v4 Sprint 2 line 165 surfaced the same three options verbatim ("With 'Contact Period' framing gone, what dates should show? Any future weekday, any future date, configurable per school?") but did not lock a recommendation. The Sprint 012 spec (line 112-116) carried the question forward and added the MVP recommendation of option 1 (weekdays only). The audit echoed that recommendation.

**RESOLVED — any future date including weekends. Default 60 days, expandable to 180 days. Per-school config deferred.** Default view shows today + 60 days; "Show more dates" expansion extends to today + 180 days. Per-school open-visit-day configurability is deferred as a carry-forward candidate, not Sprint 012 scope. **Rationale:** option 1 (weekdays only) was rejected because college coaches travel weekends and a weekend drop-in is a realistic use case; option 3 (per-school config) was deferred because no admin panel exists to configure it and Sprint 012 is the wrong sprint to introduce one. Mirrored into EXECUTION_PLAN v5.1 Open Decisions DF-4.

### DF-5 — Submit path: direct supabase-js INSERT vs Edge Function (RESOLVED 2026-05-01, amended DF-5.1 2026-05-01, REFRAMED 2026-05-01)

**Quoted finding:** "Two architectures viable: (a) Direct anon INSERT via `supabase-js` — matches Sprint 011 `useRecruitsRoster.js` pattern, no `api/` addition, simplest. RLS does the auth work. (b) `api/visit-request.ts` Edge Function — adds a server-side validation layer..., but introduces a new module to maintain... Recommended (a) for MVP." (audit Decisions Forced, DF-5)

**Settled by EXECUTION_PLAN: NO** (at v4 audit time; **RESOLVED** as of 2026-05-01 per locked decision). v4 Sprint 2 line 154 said only "Submit creates two records" with no architecture specification. The topology diagram (line 54-87) showed a transactional email arrow from Supabase to Resend but no submit-path arrow from the modal — the architecture was undefined in v4. v4 did not establish a precedent for direct anon writes (because no anon writes existed pre-Sprint-012).

**RESOLVED — Option A direct supabase-js client from the modal.** Implementation shape: two sequential calls fired from the modal after client-side honeypot validation passes:

1. `supabase.from('coach_submissions').upsert(payload, { onConflict: 'email' })`
2. `supabase.from('visit_requests').insert(payload)`

RLS does the security work per DF-2's column-bounded `WITH CHECK`. No `api/` addition, no `vercel.json` change, no Edge Function in Sprint 012.

**Rationale:** DF-2's column-bounding already pays for the security work — anon cannot escalate `verified`, `status`, or `source`. The Sprint 012 spec marks `api/` and `vercel.json` as untouched (per Sprint 011 retro Section 7C governance constraint), so adding a Vercel function expands sprint scope. `coach_submissions` is a semi-staging table per Decision K (EXECUTION_PLAN Decisions on Record); a `coach_submissions` row without a paired `visit_requests` row is captured intake awaiting downstream pipeline events, not an orphan. Sprint 013 introduces email send, which requires server-side execution; that sprint is the natural home for the function migration.

**Sprint 013 reopener (upgrade path):** Sprint 013 owns the migration of the submit path to a server-side function (Vercel function or Supabase Edge Function — provider decision is part of Sprint 013's scope). The function executes the same two inserts as Sprint 012's client path plus the email send + ICS generation work. Mirrored as a new Hard Constraint in the Sprint 013 spec.

**Rejected alternatives:**
- Option B (Vercel function in Sprint 012) — premature; expands sprint scope before email send forces server-side execution.
- Option C (Supabase Edge Function in Sprint 012) — adds an unused tooling surface (no other Edge Functions exist in this repo's `supabase/functions/`); same scope-expansion problem as Option B.

Mirrored into EXECUTION_PLAN v5.3 Open Decisions DF-5 and the Sprint 013 spec Hard Constraints (new constraint 7).

#### REFRAMED 2026-05-01 — Submit path is now plain `.insert()` per intake-log architecture pivot

**Reframed 2026-05-01.** Submit path is now: `supabase.from('coach_submissions').insert(payload)` — plain insert, no upsert, no on-conflict. Each submit creates a new intake row. The DF-5.1 amendment (`ignoreDuplicates: true`) is superseded and no longer applies. The Sprint 013 reopener for server-side route migration remains valid for the email-send work but is no longer required to fix upsert semantics. The `visit_requests` insert (call 2 of the original two-call pattern) is unchanged — it was already a plain `.insert()`. Net effect on the modal submit code: the `.upsert(..., { onConflict: 'email', ignoreDuplicates: true })` call becomes `.insert(...)` and the option bag drops entirely. The intake-log pattern is consistent across both tables: every submit appends a new row to each.

#### DF-5.1 amendment 2026-05-01 — supabase-js v2 `.upsert()` requires `ignoreDuplicates: true` under anon (SUPERSEDED 2026-05-01)

**Surfaced during the 0040 migration apply (Sprint 012 Phase 3).** The five anon-key behavioral probes for `visit_request_players` required setting up parent rows in `coach_submissions` and `visit_requests`. The first probe-setup attempt used the DF-5-locked pattern verbatim — `supabase.from('coach_submissions').upsert(payload, { onConflict: 'email' })` — and returned `status=401, code=42501, message="new row violates row-level security policy for table 'coach_submissions'"` even though the WITH CHECK clause was satisfied (`verification_state = 'unverified'`, `source = 'scheduler'`).

**Root cause.** supabase-js v2's `.upsert()` defaults `Prefer: return=representation` internally, regardless of whether `.select()` is explicitly chained. PostgREST honors that header by issuing a SELECT-side RLS check on the just-inserted row. Anon has no SELECT policy on `coach_submissions`, so the SELECT side denies and the entire statement rolls back atomically. This is a more subtle variant of the Phase 1 retro 3a finding (which captured the explicit `.insert().select()` failure mode); the upsert defaults make the same denial fire without any visible `.select()` in the call.

**Amended pattern (locked 2026-05-01):**

```js
supabase
  .from('coach_submissions')
  .upsert(payload, { onConflict: 'email', ignoreDuplicates: true });
```

`ignoreDuplicates: true` sets `Prefer: resolution=ignore-duplicates,return=minimal`, which (a) bypasses the SELECT-side RLS check by suppressing the return-side read entirely, and (b) tells PostgREST to silently skip the row when an existing email row would conflict, rather than running an UPDATE.

**Documented compromise.** The original DF-3 framing assumed the second submission from the same email would update the `coach_submissions` row's `name` and `program` fields ("most recent wins"). With `ignoreDuplicates: true`, the conflict is ignored — no UPDATE fires, the existing row is preserved as-is, and the new submission's name/program values are silently dropped. The `visit_requests` row still inserts cleanly (FK to the existing `coach_submissions` row), so the visit request itself is captured; only the per-coach contact-info refresh is lost. Accepted as a known limitation for Sprint 012's anon-direct submit path.

**Sprint 013 reopener resolves it.** The DF-5 Sprint 013 reopener — migrating the submit path to a server-side function (Vercel function or Supabase Edge Function, provider TBD) concurrent with the email send + ICS generation work — gives the upsert path service-role authority. Service role bypasses RLS entirely, so the server-side path can use a real `.upsert(payload, { onConflict: 'email' })` with the merge-duplicates resolution restored. Last-write-wins on name/program returns at that point.

**Mirrored into EXECUTION_PLAN v5.7 Open Decisions DF-5 (heading and body) and into Sprint 012 spec D6's Consumer-side pattern requirement bullet.**

##### SUPERSEDED 2026-05-01 — superseded by intake-log reframe

**Superseded by the intake-log reframe of the same day.** The upsert-under-anon problem dissolves when `coach_submissions` is treated as an append-only intake record — there is no upsert, just plain insert. DF-5.1 is preserved in the record as historical context for why the reframe was adopted, not as an active resolution. The supabase-js v2 `.upsert()` defaults finding (PostgREST `Prefer: return=representation` triggers SELECT-side RLS denial under anon) remains a true technical observation; it just no longer applies because the submit pattern is no longer an upsert. The DF-5.1 compromise (no name/program updates on repeat submissions) is also moot — repeat submissions now create new intake rows with the new name/program values, and the enrichment pipeline at the canonical layer (later sprint) determines which row provides the "current" contact info for each coach.

### DF-6 — Partner-high-school enumeration source

**Quoted finding:** "The CHECK constraint in DF-1 (option a) needs the active slug list. Currently in `src/data/recruits-schools.js`. If the migration hardcodes the slugs, adding a third partner school later requires a new migration. Acceptable for a 2-school MVP; flag as carry-forward for the inevitable 3rd-school sprint." (audit Decisions Forced, DF-6)

**Settled by EXECUTION_PLAN: NO** (at v4 audit time; **RESOLVED 2026-05-01 by DF-1 collapse**). v4 Decision D acknowledged the partner-school list but did not address the source-of-truth pattern for the slug list or the migration-vs-config tradeoff. v4 was silent on what happens when a third partner school onboards.

**RESOLVED — collapsed by DF-1.** DF-1 Option 2 introduces the `partner_high_schools` table in the `0039_*` migration. The CHECK-constraint enumeration that motivated DF-6 is no longer the schema shape; school identity is now an FK to `partner_high_schools.id`. Adding a third partner school becomes an INSERT into `partner_high_schools`, not a migration. The original DF-6 framing of "CHECK-constraint enumeration source" no longer applies. DF-6 closes 2026-05-01.

### DF-7 — `coach_submissions` verification-state column shape (RESOLVED 2026-05-01, REFRAMED 2026-05-01)

**Surfaced 2026-05-01** from the DF-5 resolution context (added to EXECUTION_PLAN v5.3 Open Decisions as NEW). **Originating concern:** Sprint 012 spec D6 declared `coach_submissions.verified` as boolean (default false). Decision J names a two-tier coach identity model (soft profile vs. full profile). Decision K (extended in v5.3) frames `coach_submissions` as a semi-staging table with multiple intake paths and progressive verification. A boolean cannot represent the states the pipeline actually produces.

**Settled by EXECUTION_PLAN: NO** (at v4 audit time and at v5.3); **RESOLVED** as of 2026-05-01 per locked decision.

**RESOLVED — replace `coach_submissions.verified` (boolean) with `coach_submissions.verification_state` (text + CHECK).** Column shape:

```sql
verification_state text NOT NULL DEFAULT 'unverified'
  CHECK (verification_state IN ('unverified', 'email_verified', 'form_returned', 'auth_bound'))
```

**State semantics:**
- `unverified` — captured intake, no verification touch yet (anon insert from scheduler, scraped imports)
- `email_verified` — email sent and confirmed delivered/responded (set by Sprint 013 email send flow)
- `form_returned` — coach completed follow-up form, domain checked (set by future follow-up sprint)
- `auth_bound` — coach claimed account, auth provider linked (set by Sprint 6 College Coach Auth)

**Ordering is convention, not constraint.** CHECK enforces set membership only. Downstream code may enforce progression (e.g., disallow `auth_bound` → `unverified`); the schema does not. This matches the repo's text + CHECK enum convention (DEC-CFBRB-067) and avoids over-constraining future intake patterns.

**DF-2 cascade:** Anon INSERT into `coach_submissions` `WITH CHECK` clause updates from `verified = false` to `verification_state = 'unverified'` (in addition to the existing `source = 'scheduler'`). Anon cannot self-promote past unverified. The DF-2 entry above has been updated for this cascade.

**Decision J supersession:** Decision J's two-tier framing (soft profile vs. full profile) is superseded by this multi-state model. The "full profile" state of the prior two-tier model corresponds to `auth_bound`; Sprint 6 (College Coach Auth) still owns the `auth_bound` transition. Decision J's Value column is updated in EXECUTION_PLAN to reflect the multi-state model and cite DF-7. Decision K (semi-staging-table semantics from v5.3) is reinforced by DF-7 without modification.

Mirrored into EXECUTION_PLAN v5.4 Open Decisions DF-7 (promoted from NEW to RESOLVED), Decision J updated, DF-2 cascade applied, and Sprint 012 spec D6 column definition updated.

#### REFRAMED 2026-05-01 — verification_state replaced with submitter_verified boolean per intake-log pivot

**Reframed 2026-05-01 by the intake-log architecture pivot.** `verification_state` column dropped; `submitter_verified` boolean (default false) replaces it. Per-row verification flag, not a state machine. An intake row records what was asserted at submission time; it does not carry "current" coach state. Real coach verification state lives at the canonical layer (`college_coaches`), not on the intake log. Sprint 6 (College Coach Auth) inherits the multi-state design problem on `college_coaches`; `coach_submissions` ships with the simpler boolean.

`submitter_verified` is true only if the submitter's identity was verified at the time of submission (e.g., by a future server-side route that checks the email against `college_coaches`). For Sprint 012, all anon submissions land with `submitter_verified = false`. The DF-2 anon INSERT `WITH CHECK` clause is updated for the cascade: `submitter_verified = false` (replacing the prior `verification_state = 'unverified'`). The four-state pipeline (`unverified` / `email_verified` / `form_returned` / `auth_bound`) remains a valid design but lives at the canonical layer (`college_coaches.verification_state`), to be designed when the enrichment pipeline is built.

**Decision J supersession (round 2):** Decision J was previously updated (v5.4) to reference DF-7's four-state model. Updated again 2026-05-01 to reference the canonical-layer location: multi-state coach identity now lives at `college_coaches` per the intake-log reframe. `coach_submissions` per-row verification is a simple boolean. The `auth_bound` state still belongs to Sprint 6 work on `college_coaches`. Decision K is sharpened by the reframe (clarifying paragraph appended in EXECUTION_PLAN).

### G. — Net reconciliation

| DF | Settled by EXECUTION_PLAN | Action before Phase 1 |
|---|---|---|
| DF-1 | **Resolved (2026-05-01)** | Option 2 — introduce `partner_high_schools` table (uuid PK, slug UNIQUE, name, meeting_location, address); `visit_requests.school_id` FK to it; collapses DF-6 and simplifies Sprint 013 D4 |
| DF-2 | **Resolved (2026-05-01)** | Option B column-bounded INSERT, B1 FK-only binding; INSERT-only with pinned `verification_state='unverified'`/`source='scheduler'`/`status='pending'` (verified→verification_state per DF-7 cascade) |
| DF-3 | **Resolved (2026-05-01) → REFRAMED (2026-05-01)** | Originally: `email text NOT NULL UNIQUE` declared in `0039_*`. Reframed: UNIQUE constraint dropped via `0041` migration per intake-log architecture pivot — multiple submissions from same email are valid distinct rows. |
| DF-4 | **Resolved (2026-05-01)** | Any future date inc. weekends; default 60d, expand to 180d; per-school config deferred |
| DF-5 | **Resolved (2026-05-01) → amended DF-5.1 (2026-05-01) → REFRAMED (2026-05-01)** | Originally: Option A direct supabase-js client (upsert + insert). Amended: upsert requires `ignoreDuplicates: true` under anon. Reframed: submit is plain `.insert()` per intake-log pivot — no upsert, no on-conflict, DF-5.1 amendment moot. Sprint 013 server-side reopener still valid for email-send work. |
| DF-5.1 | **Amended (2026-05-01) → SUPERSEDED (2026-05-01)** | supabase-js v2 `.upsert()` requires `ignoreDuplicates: true` to operate under anon (PostgREST `Prefer: return=representation` default triggers SELECT-side RLS denial). Superseded by the intake-log reframe — submit pattern is no longer an upsert, so the workaround is moot. Preserved as historical context. |
| DF-6 | **Resolved (2026-05-01)** | Collapsed by DF-1 — `partner_high_schools` table replaces CHECK-constraint enumeration; future schools added via INSERT |
| DF-7 | **Resolved (2026-05-01) → REFRAMED (2026-05-01)** | Originally: replace `verified` boolean with `verification_state` text + CHECK (4 states). Reframed: `verification_state` column dropped; `submitter_verified` boolean (default false) replaces it per intake-log pivot — multi-state verification belongs at canonical layer (`college_coaches`), not on intake log. Decision J updated again to reference canonical-layer location. |

**All seven original DF items resolved; four (DF-3, DF-5, DF-5.1 amendment, DF-7) reframed 2026-05-01 by the intake-log architecture pivot.** `coach_submissions` and `visit_requests` are treated as append-only intake records; canonical coach identity deferred to `college_coaches` via a later enrichment pipeline. The 0041 migration carries the schema cascade: drop email UNIQUE, drop `verification_state` column, add `submitter_verified` boolean. Mirrored into EXECUTION_PLAN v5.8. **Sprint 012 Phase 3 is green-light** pending the 0041 migration apply (next prompt) and resumption of the Phase 3 build with the simplified intake-log submit semantics.
