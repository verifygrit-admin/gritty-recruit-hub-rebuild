---
sprint: 017
title: Belmont Hill School Onboarding — Account Seeding + Multi-Tenant Theming
status: not_started
mode: sprint
repo: gritty-recruit-hub-rebuild
feature_folder: docs/specs/ (recruit-hub-rebuild root)
session_spec_path: docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md
session_type: routine build (multi-phase, single-session target)
exchange_budget: 20
drafted: 2026-05-07
operator: Chris
---

# Sprint 017 — Belmont Hill School Onboarding

## 1. One-line summary

Onboard Belmont Hill School as the second partner high school: seed 7 user accounts (5 students, 1 head coach, 1 guidance counselor), generalize the BC-High-hardcoded anon SELECT predicate so future partner-school onboarding is a data action rather than a code change, and apply Belmont-Hill-branded theming via the existing design-token system driven dynamically off `hs_programs.school_name`.

## 2. What this sprint exists to ship

Belmont Hill School needs to be a live partner school in `app.grittyfb.com` such that:

- Belmont Hill students can sign in, run the GRIT FIT algorithm, and produce outcomes against their seeded profile data.
- The Belmont Hill head coach sees their 5 students in the coach dashboard.
- The Belmont Hill guidance counselor sees their 5 students in the counselor dashboard.
- All 7 new accounts plus all existing BC High and other accounts are discoverable from `app.grittyfb.com/admin-login`.
- When a Belmont Hill user is signed in, the app banner reads "Belmont Hill Recruit Hub" and the color palette is Deep Blue / Scarlet / White (from BC High's Maroon / Gold / White), with the Belmont Hill background underlay applied.

This is a **platform generalization sprint with Belmont Hill as the inaugurating use case**. The reusable infrastructure (broadened anon RLS predicate, school-conditional theming via tokens) is the deliverable; Belmont Hill is the proof.

## 3. Why this sprint, why now

Per the active EXECUTION_PLAN Decision D and ERD flag F-21, Belmont Hill onboarding has been on the roadmap for May 2026. BC High is the only partner school live today. The hardcoded `'Boston College High School'` string in migration `0038_add_public_recruits_select.sql` and the maroon/gold theme in the active design tokens are both BC-High-shaped artifacts that block multi-tenant onboarding without a code change. This sprint converts both into data-driven patterns.

**Out of scope (knowingly deferred):**

- Shortlist data seeding for Belmont Hill students. Profiles + auth shells only. Shortlist seeding lands in a later sprint per operator instruction.
- F-21 rename refactor (`partner_high_schools` ↔ `hs_programs` consolidation). Belmont Hill seeds into both tables, mirroring the BC High duplication pattern. F-21 urgency bumps in the retro for a follow-on refactor sprint.
- Mobile QA of the Belmont Hill theme. Desktop verification only this sprint; mobile carries forward.

## 4. Reference inputs

**Local CSV and asset files** (Chris's machine, read by Claude Code at execution time):

- `src/assets/Belmont Hill School Account Seeding - Students.csv` — 5 student rows
- `src/assets/Belmont Hill School Account Seeding - Coaches.csv` — 1 head coach row
- `src/assets/Belmont Hill School Account Seeding - Counselor.csv` — 1 guidance counselor row
- `src/assets/Belmont Hill Logo and Brand.png` — logo + brand reference
- `src/assets/Belmont Hill background.jpg` — background underlay asset

**Schema reference:** `docs/specs/erd-current-state.md` (canonical, do not duplicate). Tables this sprint touches: `auth.users` (Supabase-managed), `public.users`, `profiles`, `hs_programs`, `partner_high_schools`, `hs_coach_schools`, `hs_coach_students`, `hs_counselor_schools`, `hs_counselor_students`. Seven of these are already documented in `erd-current-state.md` Sections 2b and 2d — read those sections before any INSERT logic is written.

**Auth flow reference:** `UX_SPEC_AUTH_FLOWS.md` is helpful for journey context but is partially stale (references retired agent personas). Treat as informational, not authoritative.

**Migration sequence:** Next available migration number is `0043` per ERD Section 4.

## 5. Deliverables (in build order)

### D1. Phase 0 audit (recon, no code)

Surface in a Phase 0 audit report:
- Confirm CSV column shapes match `profiles` (Section 5d), `public.users` (Section 5d), and the coach/counselor link tables. Flag any column drift.
- Confirm the existing design-token system structure (location, naming convention, current BC High values). Identify the file(s) that hold the maroon/gold theme.
- Identify every code path that hardcodes `'Boston College High School'` or `'BC High'` or `'bc-high'`. Inventory all of them — the migration `0038` predicate is one; there are likely more in front-end banner copy, slug logic, and recruit-proxy config.
- Confirm the admin-login dashboard's user-list query is school-agnostic (it should be — admin RLS bypass — but verify, not assume).
- Confirm the `/recruits/<slug>/` proxy's school-resolution logic and where Belmont Hill needs to slot in.

**Output:** A Phase 0 audit report committed to the repo before any seed or schema code is written.

### D2. Migration 0043 — generalize anon SELECT predicate

Replace the hardcoded BC High string in `profiles_select_public_recruits` and the parallel `short_list_items` policy with a predicate that resolves dynamically against partner-school identity. Two candidate shapes (Phase 0 audit picks):

- **Option A (preferred):** Predicate joins `profiles.high_school` against `hs_programs.school_name` for any row in `hs_programs`. Adding a new partner school = `INSERT` into `hs_programs`; no further migration needed.
- **Option B (fallback if A has RLS-perf issues):** Add a `partner_active` boolean to `hs_programs`, predicate gates on that flag.

The migration must preserve current BC High visibility (no regression) and grant Belmont Hill visibility automatically once Belmont Hill exists in `hs_programs`.

### D3. Migration 0044 — Belmont Hill seed (school identity)

INSERT one row into `hs_programs` (Belmont Hill School, Belmont, MA) and one row into `partner_high_schools` (slug='belmont-hill', name='Belmont Hill School', timezone='America/New_York'). Capture both UUIDs in the migration's transaction-scoped variables; downstream seed steps depend on them.

This intentionally mirrors the BC High duplication pattern. F-21 is bumped in the retro, not resolved here.

### D4. Belmont Hill account seeding (script or migration, Phase 0 audit picks)

Seven accounts created in this order, each going through the full auth-shell pattern (auth.users → public.users → profile/role-link):

1. **5 students** — auth.users INSERT (with a generated default password the operator can communicate to BC High Admin / Belmont Hill Admin separately), public.users INSERT (`user_type='student_athlete'`, `account_status='active'`, `email_verified=true`), profiles INSERT with the CSV's column data and `high_school='Belmont Hill School'`. (No shortlist data — deferred.)
2. **1 head coach** — auth.users + public.users (`user_type='hs_coach'`, `account_status='active'`) + `hs_coach_schools` INSERT linking the coach to Belmont Hill's `hs_programs.id` with `is_head_coach=true` + 5 `hs_coach_students` rows linking the head coach to each of the 5 students.
3. **1 guidance counselor** — auth.users + public.users (`user_type='hs_guidance_counselor'`, `account_status='active'`) + `hs_counselor_schools` INSERT + 5 `hs_counselor_students` rows linking the counselor to each of the 5 students.

Idempotency: the seeding logic should be safely re-runnable (UPSERT or pre-flight existence checks). If Phase 0 finds the seed-script pattern already established in the repo (e.g., from BC High's original seeding), match that pattern.

### D5. Design-token generalization

Convert the existing maroon/gold token system into a school-conditional pattern driven by the authenticated user's `hs_programs.school_name` (or equivalent identifier exposed via session). The Belmont Hill values:

- **Primary (Deep Blue):** to be derived from the brand asset; Phase 0 captures exact hex values from the logo.
- **Secondary (Scarlet):** as derived.
- **Tertiary (White):** `#FFFFFF`.
- **Background underlay:** `Belmont Hill background.jpg` referenced via existing background-asset pattern.

The pattern must support: BC High user signed in → maroon/gold theme; Belmont Hill user signed in → deep blue/scarlet theme; future school N → row in `hs_programs` plus a token-config entry, no code-branch additions.

### D6. Banner text dynamism

The header banner currently reads "BC High Recruit Hub" (or similar — Phase 0 confirms exact copy). Replace with a dynamic resolution: `<School Name> Recruit Hub` derived from the same school identifier the theming uses. Belmont Hill users see "Belmont Hill Recruit Hub". Anonymous (signed-out) users fall back to a school-neutral default — Phase 0 audit proposes the fallback string for operator approval.

### D7. End-to-end verification (Claude in Chrome)

Manual verification per the End State Verification list in the operator's prompt:

1. Sign in as the Belmont Hill head coach → confirm all 5 Belmont Hill students appear on the coach dashboard.
2. Sign in as the Belmont Hill guidance counselor → confirm all 5 Belmont Hill students appear on the counselor dashboard.
3. Sign in as one Belmont Hill student → run GRIT FIT, confirm outcome generates against seeded profile.
4. Confirm theme + banner switch correctly between BC High account login and Belmont Hill account login.
5. Sign in to `app.grittyfb.com/admin-login` → confirm all 7 new accounts plus all existing accounts are discoverable.

Screenshots of each verification step land in the retro.

## 6. Acceptance criteria

The sprint is shipped when **all** of the following hold:

- [ ] Phase 0 audit report committed to repo.
- [ ] Migration 0043 applied; BC High public-recruit visibility regression-tested unchanged.
- [ ] Migration 0044 applied; Belmont Hill rows present in both `hs_programs` and `partner_high_schools`.
- [ ] All 7 Belmont Hill accounts present in `auth.users`, `public.users`, and the appropriate role-link tables; idempotency confirmed by re-running the seed.
- [ ] Belmont Hill head coach dashboard returns all 5 Belmont Hill students.
- [ ] Belmont Hill counselor dashboard returns all 5 Belmont Hill students.
- [ ] One Belmont Hill student successfully runs GRIT FIT and produces an outcome.
- [ ] Theme switches correctly between BC High and Belmont Hill on signed-in user change (manual screenshot pair in retro).
- [ ] Banner text reads "Belmont Hill Recruit Hub" for Belmont Hill users and "BC High Recruit Hub" for BC High users.
- [ ] Admin login dashboard returns all 7 new accounts alongside existing accounts.
- [ ] No regressions on BC High user flows (one BC High coach login + one BC High student login spot-check).
- [ ] Retro filed at `docs/specs/sprint-017-belmont-hill-onboarding-retro.md` per Sprint Mode Primer Section 6.
- [ ] F-21 urgency note added in retro carry-forward register, naming the next sprint as the candidate refactor venue.

## 7. Phase plan (mapped to exchange budget)

| Phase | Work | Target exchanges |
|---|---|---|
| Phase 0 | Audit (D1) | 2–3 |
| Phase 1 | Migrations 0043 + 0044 (D2 + D3), applied and verified | 3–4 |
| Phase 2 | Account seeding (D4) — script or migration based on Phase 0 finding | 3–4 |
| Phase 3 | Token generalization + banner dynamism (D5 + D6) | 4–5 |
| Phase 4 | Verification + retro (D7 + retro file) | 3–4 |
| **Total** | | **15–20** |

If Phase 0 surfaces complexity that would push the total over 20 exchanges (e.g., the design-token system is more entangled than expected, or admin-login uses a non-standard query path), declare a multi-session sprint at Phase 0 close — do not push through.

## 8. Decisions on record (entering the sprint)

- **DOR-1.** Migration 0038's hardcoded `'Boston College High School'` predicate is generalized in this sprint, not deferred. New partner schools should onboard as a data action only.
- **DOR-2.** Belmont Hill seeds into both `hs_programs` and `partner_high_schools` (mirrors BC High duplication). F-21 rename refactor is deferred; urgency bumps in retro.
- **DOR-3.** Theming is school-conditional via the existing design-token system, dynamically driven by the authenticated user's `hs_programs` identity. Per-school hardcoded branches are not acceptable.
- **DOR-4.** Shortlist seeding for Belmont Hill students is out of scope. Deferred to a later sprint.
- **DOR-5.** Mobile QA of Belmont Hill theme is out of scope. Desktop verification only; mobile carries forward.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| RLS performance regression on the broadened `profiles_select_public_recruits` predicate | Phase 0 audit picks the predicate shape (Option A vs B). Sprint 011's PII-render-boundary precedent suggests joins on small reference tables (`hs_programs` is currently 1 row, will be 2) are RLS-safe. Verify with `EXPLAIN ANALYZE` if Phase 0 surfaces concern. |
| Hardcoded BC High strings exist in places Phase 0 misses | Phase 0 audit explicitly inventories all instances. Anything missed surfaces as a banner-mismatch or theme-mismatch in Phase 4 verification and gets caught before retro. |
| Idempotency of seed script causes duplicate auth.users on re-run | Pre-flight `SELECT ... WHERE email = $1` check before each auth.users INSERT; existing-user case skips and logs. |
| Belmont Hill brand colors not extractable from the PNG without operator input | Phase 0 reads the logo, proposes hex values, operator approves before D5 starts. |
| Admin login query is not school-agnostic and surprise-filters by BC High | Phase 0 verifies. If broken, scope expands by ~1 exchange to fix; if it pushes over budget, declare multi-session at Phase 0 close. |
| The intake-log layer (coach_submissions, visit_requests) is touched accidentally | This sprint does not write to intake-log tables. If a deliverable surfaces a need to, treat as scope expansion and escalate to operator decision. |

## 10. Carry-forward already known (entering the sprint)

These are pre-staged backlog items that this sprint will explicitly *not* address but should reference in retro:

- **F-21 (urgency bump):** `partner_high_schools` ↔ `hs_programs` rename refactor. Now blocking second-school onboarding cleanliness. Next sprint candidate.
- **Belmont Hill shortlist seeding:** separate sprint, after this one ships.
- **Mobile QA of Belmont Hill theme:** carries forward to a mobile-QA sprint or absorbed into the next general mobile pass.
- **PII column-level RLS (F-06):** unchanged this sprint; ongoing concern from Sprint 011 carry-forward.

## 11. Out-of-band coordination

The 5 Belmont Hill student accounts will need their initial passwords communicated to Belmont Hill (or to the students directly via Belmont Hill admin) outside the app. Operator decision on whether seed-script generates a fixed pattern (e.g., emailed welcome-flow trigger), random passwords logged to a one-time CSV the operator handles manually, or Supabase magic-link invitations. Phase 0 surfaces the existing BC High pattern; sprint matches it unless there's a reason to diverge.

## 12. Session open prompt template

When this sprint opens in a coach-me session, the operator pastes:

1. This session spec.
2. The relevant section of the EXECUTION_PLAN (or note that this sprint lives in the recruit-hub-rebuild root and isn't governed by a feature-folder EXECUTION_PLAN).
3. A confirmation that the Sprint Mode Primer and Production-Optimized Sprints Primer are loaded.

The first prompt to Claude.ai is a recon prompt that produces a Phase 0 plan, not a Phase 0 execution. Phase 0 executes in the second prompt.

---

*Sprint 017 session spec, drafted 2026-05-07. Status: not_started. Promotes to in_progress when the Phase 0 prompt fires.*
