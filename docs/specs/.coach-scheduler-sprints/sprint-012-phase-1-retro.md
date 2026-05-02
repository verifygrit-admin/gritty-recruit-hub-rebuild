---
sprint_id: Sprint012
phase: 1
phase_name: Schema Migration
retro_date: 2026-05-01
status: closed
branch: sprint-012-coach-scheduler
branch_head: ad11f86
---

# Sprint 012 Phase 1 Retro — Schema Migration

## 1. Phase 1 Outcome

Phase 1 produced a single migration (`0039_coach_scheduler_tables.sql`) that introduced three tables (`partner_high_schools`, `coach_submissions`, `visit_requests`), three anon RLS policies, and the BC High seed row. Migration applied to production via `npm run migrate` (Supabase Management API). Behavioral verification via six anon-key probes confirmed: SELECT works on `partner_high_schools`, SELECT denies on locked tables, INSERT succeeds with column-bounded payloads, INSERT fails with 42501 on disallowed `verification_state`, INSERT succeeds on `visit_requests` with FK to `coach_submissions`. One consumer-side pattern requirement surfaced during apply and was captured in the Sprint 012 spec. Single commit on `sprint-012-coach-scheduler` at `ad11f86`, local only.

---

## 2. What Shipped

### 2a. Migration

`supabase/migrations/0039_coach_scheduler_tables.sql`

- 3 `CREATE TABLE` statements (`partner_high_schools`, `coach_submissions`, `visit_requests`)
- 1 `INSERT` (BC High seed: slug `bc-high`, name `Boston College High School`, meeting_location and address both `150 Morrissey Blvd., Dorchester, MA 02125` with appropriate prefix)
- 3 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements
- 3 `CREATE POLICY` statements:
  - `partner_high_schools_select_anon` — SELECT, anon, `USING (true)`
  - `coach_submissions_insert_anon` — INSERT, anon, `WITH CHECK (verification_state = 'unverified' AND source = 'scheduler')`
  - `visit_requests_insert_anon` — INSERT, anon, `WITH CHECK (status = 'pending')`
- Header conformance: matches 0038 style (filename comment, sprint identifier, multi-paragraph context block, authorization line) with one stylistic addition (banner dividers `-- =====` between table sections for legibility across three tables)

### 2b. Spec update

Sprint 012 spec D6 received the consumer-side pattern requirement bullet capturing the `.insert().select()` finding. The bullet sits between the `verification_state` note and the duplicate-email paragraph in D6.

### 2c. Commit

`sprint-012-coach-scheduler` @ `ad11f86` — "Sprint 012 Phase 1 — apply 0039 coach_scheduler_tables migration"

Two paths: the migration file (new) and `sprint-012-session-spec.md` (modified). 138 insertions, 0 deletions.

Branch local; not pushed to origin.

---

## 3. Process Observations

### 3a. The `.insert().select()` finding

During the first run of probe 4 (anon INSERT `coach_submissions` with valid payload), the call returned 42501 RLS denial despite the WITH CHECK clause being satisfied. Root cause: PostgREST's default `Prefer` header is `return=representation`, which triggers a SELECT-side RLS check on the just-inserted row. Anon has no SELECT policy on `coach_submissions`, so the SELECT side denied even though the INSERT side succeeded; the entire statement rolled back atomically. Removing the `.select()` chain (sending `Prefer: return=minimal` instead) made the INSERT succeed cleanly.

This is not a migration bug — the migration is correct. It is a consumer-side pattern requirement that affects every Phase 2 modal-build prompt: anon writes against `coach_submissions` and `visit_requests` must omit `.select()` chains. The DF-5 spec'd upsert pattern — `supabase.from('coach_submissions').upsert(payload, { onConflict: 'email' })` — works as long as `.select()` is not appended. Documented in Sprint 012 spec D6.

### 3b. Production-only apply path

The project has no local Supabase instance. `supabase/config.toml` does not exist. The canonical apply command is `npm run migrate -- <path>`, which routes through `scripts/migrate.js` and the Supabase Management API directly to the production project (`xyudnajzhuwdauwkwsbh`). All Phase 1 verification ran against production.

This is not a problem given the migration is forward-only with no destructive operations and the probe outputs match expected behavior, but it changes the rollback calculus for future phases: any rollback is a `0040` corrective migration, not a local-only revert. Worth flagging for Phase 2 build prompts that involve any further schema work.

### 3c. Acceptance-check wording correction

The apply prompt's acceptance check named "exactly four policies" — the migration creates three explicit `CREATE POLICY` statements and `pg_policies` returns three rows. The "four" framing came from counting the absence-of-SELECT/UPDATE/DELETE for anon as additional restrictive policies, which it is not (RLS denies absent-policy operations by default; no explicit deny policy is needed or written). Claude Code flagged the wording inconsistency during apply and reported the correct three-policy count.

Forward discipline: prompt acceptance checks should match the actual SQL surface (count of `CREATE POLICY` statements and rows in `pg_policies`), not a conceptual model of the surface (count of "things anon can or cannot do").

### 3d. The migration review surface

The migration was reviewed line-by-line by the strategic operator (Claude.ai instance) via verbatim file print before apply. Review caught no findings — column shapes, CHECK clauses, FK declarations, RLS policy clauses, BC High address spelling, and 0038 convention conformance all matched the retro Section 5 spec exactly. The review was load-bearing: it took 60 seconds and confirmed the migration matched the locked Phase 0 decisions before any production write.

This pattern — verbatim print before apply, line-by-line review against the locked spec, only then apply — is the right default for any future migration in this sprint or downstream sprints.

---

## 4. Carry-Forward to Sprint 012 Phase 2

Phase 2 builds the modal scaffolding on the public `/athletes` page. Inputs:

- Three tables with verified RLS behavior (SELECT on `partner_high_schools` works for anon; INSERT on `coach_submissions` and `visit_requests` works for anon with column-bounded payloads only)
- DF-5 locked submit pattern: direct `supabase-js` client, two sequential calls (`upsert coach_submissions`, `insert visit_requests`), no `.select()` chains on either
- Existing data-hook carry-forward pattern from Sprint 011 (`useRecruitsRoster.js` as reference)
- `SlideOutShell.jsx` as the modal primitive (extend with multi-step state wrapper, do not rebuild)
- `<style>` block + className pattern for media queries and hover states
- Visual prototype at `docs/specs/.coach-scheduler-sprints/index.html` for CTA strip and 3-step modal layout

First Phase 2 deliverable will likely be the CTA strip + slide-out shell extension; the modal's three-step internal flow (date / time / contact) follows.

---

## 5. Branch State

`sprint-012-coach-scheduler` is local at `ad11f86`. Single commit. Not pushed.

Push deferred until Phase 2 has additional commits worth pushing as a unit, or until end-of-sprint when the branch is ready for PR.
