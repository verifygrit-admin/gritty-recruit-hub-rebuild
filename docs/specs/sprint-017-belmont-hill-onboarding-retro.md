---
sprint: 017
artifact: retro
status: MULTI-SESSION — SESSION 1 CLOSE
session_1_dates: 2026-05-07
session_2_status: pending operator
parent_spec: docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md
session_2_entry_brief: docs/specs/sprint-017-session-2-entry-brief.md
operator: Chris
---

# Sprint 017 — Belmont Hill Onboarding — Retro (Session 1 Close)

## 1. Sprint summary (Session 1 state)

Belmont Hill is fully seeded into the database — partner-school identity rows
present in both `hs_programs` and `partner_high_schools`, the anon SELECT
predicate generalized so future onboarding is a data action, and 5 accounts
seeded (3 students + 1 head coach + 1 counselor) with correct school-link and
junction-students rows. The public `/athletes` roster is configured to surface
Belmont Hill via `recruits-schools.js` activation. BC High visibility is
regression-clean (26 → 26 anon-visible profiles).

Belmont Hill is **not yet themed** (D5 + D6 — design-token generalization and
banner dynamism — Phase 3) and has **not been verified end-to-end** against a
signed-in user (Phase 4). Two front-end hardcodes (`ProfilePage.jsx` static
BC High coach + counselor; `NextStepsDashboard.jsx` BC High S&C tip) are
absorbed into Phase 3 scope per Phase 0 audit's cross-area synthesis.

Sprint 017 declared multi-session at Phase 2 close. Session 2 ships Phase 3 +
Phase 4 against the entry brief.

## 2. What shipped clean (Session 1)

### Phase 0 — Audit (ahead of plan)
- Seven-area structured audit of CSV shapes, design-token system, hardcoded
  BC High strings, admin-login query, `/recruits/<slug>/` proxy resolution,
  BC High seed pattern, and password pattern.
- Surfaced two scope absorptions for Phase 3: `ProfilePage.jsx` static
  BC High coach/counselor data and `NextStepsDashboard.jsx` BC-High-specific
  S&C tip text. Operator approved absorption.
- Surfaced DOR-amendment: spec said 5 students; CSV has 3.
- Cost: ~1.0 exchange of 2-3 budget. Under plan.

### Phase 1 — Migrations 0043 + 0044 + recruits-schools.js (ahead of plan)
- `0043_generalize_partner_school_select_predicate.sql` — replaces hardcoded
  `'Boston College High School'` predicate with join against `hs_programs`.
- `0044_seed_belmont_hill_school_identity.sql` — seeds Belmont Hill rows in
  both `hs_programs` and `partner_high_schools`.
- `src/data/recruits-schools.js` — Belmont Hill row activated for `/athletes`.
- BC High visibility regression-clean: 26 pre, 26 post.
- Commit `33bf480` on origin/master.
- Cost: ~0.8 exchange of 3-4 budget. Under plan.

### Phase 2 — Belmont Hill account seeding (at budget cap, on plan)
- Parameterized `scripts/seed_users.js` and `scripts/bulk_import_students.js`
  with `SCHOOL_CONFIGS` pattern, `--school` CLI flag, header normalization,
  and skip-flags for the deferred-coach-link path.
- Seeded 3 students + 1 head coach (Frank Roche) + 1 counselor (June Schmunk).
- All 9 verification queries CLEAR (Q1 BC High regression check + Q4-Q11
  Belmont state checks + Q11 Belmont coords propagation).
- Idempotency validated: command 2 ran cleanly with `--coach-uuid` flag,
  re-using prior-created Frank without duplicate-creation attempts.
- Commits: `5c8a390` (seed_users.js — Path G close) and `09780fd`
  (bulk_import_students.js — orphan parameterization commit, Session 1 close).
- Cost: ~4.0 exchange of 3-4 budget. At cap, on plan despite the platform fault.

## 3. What we ran into

### The GoTrue admin API platform fault (Phase 2)

Mid-Phase-2, the seed scripts hit a Supabase platform-level breakage that
turned a routine email-to-UUID resolution into a recursive debugging cycle.
Every admin-API surface that wraps the broken handler returned HTTP 500
"unexpected_failure":

- `/auth/v1/admin/users?email=` REST filter
- `supabase.auth.admin.listUsers()` (paginated and unfiltered)

Direct SQL queries against `auth.users` returned the rows cleanly (data is
healthy and findable via Postgres). The fault is in GoTrue's admin handler,
not the data layer. Filed as **ERD F-23**.

The hypothesis-investigation pause that the operator triggered after the
fourth failed resolution path (PIDs / dual-ID / agent-memory pattern search)
was the highest-leverage move of Session 1 — it ruled out two structural
hypotheses with negative evidence and confirmed the problem was novel. That
saved an unknown number of failed-patch exchanges.

### The DOR-amendment (Phase 0)

Spec Section 4 named 5 students. The CSV has 3 (Ricky Copeland, Ky-Mani
Monteiro, Ajani Kromah). Operator amended in-session: 3 students binding for
the rest of the sprint. Acceptance criteria D7 step 1 + step 2 (head coach
sees N students, counselor sees N students) read as 3 not 5. Belmont Hill
Counselor.csv's per-student boolean columns (`is_counselor_copeland`,
`is_counselor_monteiro`, `is_counselor_kromah`) confirm the 3-student shape
is internally consistent.

## 4. The five resolution paths

| Path | What | Outcome |
|---|---|---|
| A | Replace GoTrue REST resolver with `public.profiles` JS-client SELECT | **Partial.** Worked for student lookups (students have profile rows). Failed for coach/counselor (no profiles row). |
| D | Paginated `supabase.auth.admin.listUsers()` | **Failed.** Same HTTP 500 unexpected_failure as the REST email-filter — both endpoints route through the broken handler. |
| E | `supabase.schema('auth').from('users').select(...)` PostgREST direct | **Unavailable.** PostgREST exposes only `public` and `graphql_public`; `auth` schema not exposed. PGRST106. |
| F (rejected) | Hardcode UUIDs in script for one-shot use | Operator rejected as too brittle / not reusable for school N+1. |
| G | **`--coach-uuid` / `--counselor-uuid` CLI args + capture-from-createUser-response for fresh users** | **SHIPPED.** Bypasses the broken admin lookup entirely. Operator passes Frank's known UUID via flag; June's UUID captured directly from `createUser` response. Generic enough to support any future school onboarding where existing auth users need linking. |

Filed as ERD F-23 with full evidence chain.

## 5. Process observations (Session 1)

1. **The 20-exchange ceiling held against unexpected failure cascading.**
   Five failed paths, three Phase 2 BLOCKERs, plus a hypothesis-investigation
   detour, still closed Phase 2 clean at ~4.0 cumulative. The four-artifact
   configuration absorbed the platform shock without scope creep or
   improvisation outside operator authorization.

2. **The hypothesis-investigation pattern was the highest-leverage move of
   the sprint.** Operator paused after Path D failed and named three competing
   hypotheses (PID precedent, dual-ID oscillation, agent-memory pattern).
   Read-only investigation ruled out PID and dual-ID definitively before any
   more code work was authorized. This pattern belongs in the operating
   contract for any future debugging cycle that has produced 3+ failed
   resolution attempts.

3. **Diagnostic-before-patch (Phase 2 Exchange 12) saved a wasted Path D
   exchange.** Direct `auth.users` state inspection produced authoritative
   pinned UUIDs that survived the rest of the sprint, regardless of which
   resolver path eventually shipped. Should be the default move when an
   admin-API resolution path is suspect.

4. **Phase 0 audit's seven-area completeness held up.** No late-Phase-3-style
   surprises landed in Phase 1 or Phase 2. The Phase 2 platform fault was
   external — nothing the audit could have caught.

5. **Multi-session declared at Phase 2 close, not pushed.** When
   remaining-exchange math doesn't cover remaining-phase budget, declare
   early. Pushing through would have produced a degraded Phase 3.

## 6. Configuration Health Score (Session 1 actuals)

| Sub-score | State | Notes |
|---|---|---|
| **S_speed** | Moderate | Phase 0 + Phase 1 ahead of plan; Phase 2 at budget cap due to platform fault. Not a script or design failure — an external shock absorbed cleanly. |
| **S_spec** | Clean | Spec held; only adjustments were DOR-amendment for student count (5 → 3) and Phase 3 absorption of two strings. Both surfaced and absorbed at correct decision points. |
| **S_artifact_health** | Clean | 2 migration files + 3 script edits + 4 doc files committed and pushed by Session 1 close. All artifacts referenceable; no orphans. |
| **S_carry_forward** | Manageable | 8 items: 4 pre-known carry-forward + 3 newly surfaced (platform fault, hygiene migration, bulk-import resolver alignment) + 1 Session 2 entry. |

Composite read: **clean Session 1 close given the external platform shock.**
The configuration absorbed an unexpected fault without compromising spec
fidelity or shipping degraded artifacts. Multi-session declaration is the
right adjustment, not a failure.

## 7. Carry-forward register (final, 8 items)

| # | Category | Description | Owner / Sprint |
|---|---|---|---|
| C-1 | Architecture (existing) | F-21 — `partner_high_schools` ↔ `hs_programs` rename refactor. Belmont Hill seeded into both per DOR-2. Refactor candidate next sprint. | Sprint 018 candidate |
| C-2 | Data | Belmont Hill shortlist seeding (deferred per DOR-4). | Follow-on sprint |
| C-3 | QA | Mobile QA of Belmont Hill theme (deferred per DOR-5). | Mobile-QA sprint |
| C-4 | Architecture (existing) | F-06 PII column-level RLS — ongoing concern from Sprint 011. | Open |
| C-5 | **Platform health** | **F-23 — GoTrue admin API HTTP 500 across `?email=` filter and `listUsers`. Project-level fault. Escalate to Supabase support; route to Dexter for monitoring rotation.** | **External + Dexter** |
| C-6 | **Hygiene migration** | **Migration 0045 candidate — `public.get_user_id_by_email(email text) RETURNS uuid` SECURITY DEFINER function. Pattern matches migration 0027's cross-table SECURITY DEFINER helpers. Routes around F-23 for any future seed-script email lookup.** | **Sprint 018** |
| C-7 | **Resolver alignment** | **`bulk_import_students.js` still uses the broken GoTrue REST helper for one fallback path. Align to the Sprint 018 SECURITY DEFINER helper once C-6 lands.** | **Sprint 018** |
| C-8 | **Session 2 entry** | **Phase 3 + Phase 4 to ship.** Reference `docs/specs/sprint-017-session-2-entry-brief.md`. | **Sprint 017 Session 2** |

## 8. Status

**MULTI-SESSION, SESSION 1 CLOSED.** Session 2 opens against the entry brief
at `docs/specs/sprint-017-session-2-entry-brief.md`.

Five accounts seeded; partner-school identity present; predicate generalized;
public roster activated; BC High regression-clean. The infrastructure
foundation is in place. Session 2 ships theming, banner dynamism, two scope
absorptions, end-to-end verification, and the final retro update.
