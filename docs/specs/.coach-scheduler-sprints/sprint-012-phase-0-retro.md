---
sprint_id: Sprint012
phase: 0
phase_name: Pre-Sprint Audit
retro_date: 2026-05-01
status: closed
audit_branch: master
audit_head: 1dbac9c52755671613b80e2087d3de478b0899b8
---

# Sprint 012 Phase 0 Retro — Pre-Sprint Audit

## 1. Phase 0 Outcome

Phase 0 ran across two sessions: a first attempt that aborted after a process failure (the audit ran without EXECUTION_PLAN.md in its reference set and surfaced six "decisions forced" derived from spec content alone), and a successful restart that loaded the full reference set and reconciled the audit's findings against EXECUTION_PLAN. Across the two sessions, **all seven decisions forced by the audit were resolved** (DF-1 through DF-7). EXECUTION_PLAN advanced from v4 to v5.5 in six versioned increments. Sprint 012 spec D6 was substantially revised — a new `partner_high_schools` table was introduced, `coach_submissions.verified` (boolean) was replaced with `verification_state` (text + CHECK with four states), and the FK target on `visit_requests.school_id` was corrected from the misnamed NCAA `schools` table to the new partner table. Sprint 013 spec D4 simplified from a schema task to a data confirmation. One backlog item was filed (BL-S012-XX-naming-hygiene). Phase 0 is **green-light pending the four non-DF checklist items** captured in Section 4 below.

---

## 2. What Shipped

### 2a. DF Resolutions (seven items)

| ID | Decision | Resolution | Cascade |
|---|---|---|---|
| DF-1 | High-school identity column on `visit_requests` (FK target undefined; existing `schools` is NCAA institutions, BC High not in it) | Option 2 — introduce `partner_high_schools` table with uuid PK, slug UNIQUE, name, meeting_location, address; `visit_requests.school_id` FK to it | Collapses DF-6; simplifies Sprint 013 D4; adds `partner_high_schools` table to Sprint 012 spec D6; files BL-S012-XX-naming-hygiene for the eventual `schools` rename |
| DF-2 | Anon INSERT policy `WITH CHECK` shape on `coach_submissions` and `visit_requests` (first anon-writable surfaces in the schema) | Option B column-bounded INSERT, B1 FK-only binding; INSERT only, zero SELECT/UPDATE/DELETE for anon | Sprint 012 spec Risk Register row 1 updated; later cascade from DF-7 swapped `verified=false` to `verification_state='unverified'` |
| DF-3 | `coach_submissions.email` UNIQUE constraint declaration (spec said "unique" but Postgres `42P10` requires real UNIQUE for ON CONFLICT) | `email text NOT NULL UNIQUE` declared explicitly in `0039_*` migration | None beyond the migration discipline note |
| DF-4 | Date filtering logic for the picker (weekday-only vs. any future date vs. per-school configurable) | Any future date including weekends; default 60 days, expandable to 180; per-school config deferred | Sprint 012 spec D2 question removed; EXECUTION_PLAN Sprint 2 open-questions cleaned of DF-4 reference |
| DF-5 | Submit path: direct anon INSERT vs Edge Function | Option A direct supabase-js client (upsert `coach_submissions` + insert `visit_requests`); Sprint 013 owns server-side migration | Decision K extended with semi-staging-table vocabulary; surfaced DF-7; Sprint 013 spec gained Hard Constraint 7 (submit-path migration ownership) |
| DF-6 | Partner-high-school slug enumeration source (CHECK constraint vs config duplication) | Collapsed by DF-1 — `partner_high_schools` table replaces CHECK enumeration; future schools added via INSERT | Folded into DF-1 resolution; original DF-6 framing no longer applicable |
| DF-7 | `coach_submissions.verified` boolean cannot represent the multi-state pipeline (scraped, self-asserted, email-verified, form-returned, auth-bound) | Replace with `verification_state text NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified','email_verified','form_returned','auth_bound'))` | DF-2 `WITH CHECK` cascade (`verified=false` → `verification_state='unverified'`); Decision J supersession (two-tier model → multi-state); Sprint 012 spec D6 column shape; Sprint 012 spec Risk Register row 1 follow-up patch |

### 2b. EXECUTION_PLAN versions

| Version | Change |
|---|---|
| v5 | Path correction (`/recruits` → `/athletes`, five call-sites). New "Architectural Carry-Forwards from Sprints 010–011" section (seven items). New "Open Decisions Forward of Sprint 012" section (six DF items). |
| v5.1 | DF-3 and DF-4 resolved. |
| v5.2 | DF-2 resolved. |
| v5.3 | DF-5 resolved. Decision K extended with semi-staging-table vocabulary. DF-7 surfaced as NEW. |
| v5.4 | DF-7 resolved. Decision J updated to multi-state model. DF-2 `WITH CHECK` cascade applied. |
| v5.5 | DF-1 resolved (Option 2 — `partner_high_schools` table). DF-6 collapsed by DF-1. New "Backlog — Architectural Carry-Forwards from Sprint 012" section with BL-S012-XX-naming-hygiene. |

### 2c. Sprint 012 spec changes

- **D6 revised:** new `partner_high_schools` table definition added; `coach_submissions.verified` (boolean) replaced with `verification_state` (text + CHECK, four states); `visit_requests.school_id` FK target corrected from `schools` to `partner_high_schools.id`. D6 heading expanded to enumerate all three new tables.
- **Risk Register row 1 mitigation cell:** updated to reflect the column-bounded RLS shape with the verification_state cascade (`coach_submissions`: `verification_state='unverified'`, `source='scheduler'`; `visit_requests`: `status='pending'`; FK-only binding between tables). Severity unchanged at **High** until the migration ships and is probed live.
- **Hard Constraints unchanged** (still six items).

### 2d. Sprint 013 spec changes

- **Hard Constraint 7 added:** submit-path migration ownership. Sprint 013 migrates the submit path to a server-side function (Vercel function or Supabase Edge Function — provider decision in scope) concurrent with email send + ICS work.
- **D4 simplified:** from "add `meeting_location` column to `schools` + populate" to "confirm `partner_high_schools.meeting_location` is populated" with NULL fallback to `partner_high_schools.address`. D4 heading renamed accordingly.
- **D5 and D6 framing tightened** to reference the migrated submit function (per Hard Constraint 7) rather than ad-hoc "the server."

### 2e. Backlog filed

- **BL-S012-XX-naming-hygiene** — rename `schools` (NCAA institutions table, 662 rows, `unitid integer` PK) to `ncaa_schools`, and rename `partner_high_schools` (introduced in Sprint 012) to `schools` or `high_schools`. Multi-file refactor across migrations, queries, RLS policies, hooks, components, types, and tests. Recommended scheduling: open whenever the next high-school-identity-touching feature lands (likely the coach verification follow-up sprint or the Belmont Hill data-onboarding sprint). Filed in EXECUTION_PLAN's new Backlog section.

---

## 3. Process Observations

### 3a. The prompt-construction failure that aborted the first session

Prompt 0 v1 named the spec, Sprint 011 retro, and prototype as Claude Code's reference set. **It did not name EXECUTION_PLAN.md.** The Sprint 012 spec's Reference Documentation table explicitly lists EXECUTION_PLAN as the strategic ground truth, but the prompt synthesized a reference set from spec memory rather than transcribing the spec's own table. Compounding factor: EXECUTION_PLAN.md had been removed from the working tree at some prior point and was restored by the operator from a Claude.ai download minutes before the session opened. Claude Code's Phase 0 audit ran technically rigorous but strategically blind, surfacing six "decisions forced" that were later partially reconciled against EXECUTION_PLAN in the restart session.

**Discipline item for forward sprints:** when a spec contains a Reference Documentation table, that table is the binding load order for Phase 0 prompts. Transcribe it verbatim into the prompt rather than re-deriving it from spec content.

### 3b. The folder-preservation rule

The `.coach-scheduler-sprints/` folder is canonical for the duration of the series. Every file in it (EXECUTION_PLAN, prototype, all session-specs, all retros, marketing-task) stays in the folder. Gitignore is fine; relocation, archival, deletion is not. This rule was added to Prompt 0 v2 and applies forward.

### 3c. The "all thoughts are operations" frame

Mid-session, the operator established that strategy work, governance work, and document revision would all be viewed through sprint-mode for the duration of the session, rather than declaring mode crossovers as the primer would suggest. This carried six DF resolutions and an EXECUTION_PLAN advancement through one continuous sprint-register flow. The frame held; output quality did not degrade.

**Recommendation:** when timetable pressure is high and the operator is confident in the collaboration shape, this frame is a viable operating mode. When time is less pressured or when the work touches new agents/contributors, declared mode crossovers are the safer default.

### 3d. Decision-cascade hygiene

Five of the seven DF resolutions cascaded into other documents:
- DF-2 → Sprint 012 risk register
- DF-5 → Decision K extension
- DF-7 → DF-2 `WITH CHECK` update + Decision J supersession + Sprint 012 spec D6 column shape
- DF-1 → DF-6 collapse + Sprint 013 spec D4 simplification + Sprint 012 spec D6 table addition

Cascades were caught reliably except in one case (DF-7 → Sprint 012 risk register row 1) which Claude Code surfaced as an explicit follow-up question. The pattern that worked: every resolution prompt enumerated all expected file touches up front, and Claude Code flagged when an enumerated touch couldn't be cleanly applied or when a non-enumerated touch was implied.

---

## 4. What's Left Before Phase 1 Opens

| # | Item | Status | Action |
|---|---|---|---|
| 4a | Vercel Standard Protection state | **Confirmed this session** | Preview-only protection on; Production public; bypass secret accounted for. No action. |
| 4b | Sprint 012 spec promotion | Pending | Frontmatter `status` field updates from `draft` to `not_started`. One-line edit, applied at branch-cut time. |
| 4c | Branch cut | Pending | `sprint-012-coach-scheduler` cut from `master` at `1dbac9c`. Single git command, applied at Phase 1 open. |
| 4d | Probe-script disposition | **Confirmed deleted** | Script deleted in the prior session. No action. |

Two of four are already discharged. The remaining two (spec promotion + branch cut) are mechanical and execute at the moment Phase 1 opens.

---

## 5. Carry-Forward to Sprint 012 Phase 1

The `0039` migration shape, derivable from the seven DF resolutions:

```sql
-- Partner high schools (DF-1 Option 2)
CREATE TABLE partner_high_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  meeting_location text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO partner_high_schools (slug, name, meeting_location, address) VALUES
  ('bc-high', 'Boston College High School',
   'BC High Football Office, 150 Morrissey Blvd., Dorchester, MA 02125',
   '150 Morrissey Blvd., Dorchester, MA 02125');

-- Coach submissions (DF-3 email UNIQUE, DF-7 verification_state)
CREATE TABLE coach_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  program text NOT NULL,
  source text NOT NULL DEFAULT 'scheduler'
    CHECK (source IN ('scheduler', 'registration')),
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified', 'email_verified', 'form_returned', 'auth_bound')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Visit requests (DF-1 FK target corrected to partner_high_schools)
CREATE TABLE visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_submission_id uuid NOT NULL REFERENCES coach_submissions(id),
  school_id uuid NOT NULL REFERENCES partner_high_schools(id),
  requested_date date NOT NULL,
  time_window text NOT NULL
    CHECK (time_window IN ('morning', 'midday', 'afternoon', 'evening', 'flexible')),
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (DF-2 column-bounded anon INSERT, DF-7 verification_state cascade)
ALTER TABLE partner_high_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read partner_high_schools"
  ON partner_high_schools FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon can insert coach_submissions"
  ON coach_submissions FOR INSERT TO anon
  WITH CHECK (verification_state = 'unverified' AND source = 'scheduler');

CREATE POLICY "anon can insert visit_requests"
  ON visit_requests FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- No SELECT, UPDATE, or DELETE policies for anon on coach_submissions or visit_requests.
-- Service role retains full access via the bypass-RLS path.
```

The migration is a single file. **Phase 1 opens by writing it.**

---

## 6. Audit Document Status

`docs/specs/.coach-scheduler-sprints/sprint-012-phase-0-audit.md`

- **Sections A–E** — original five-section audit from the first (aborted) session: schema review, live anon-key boundary probes, URL collision audit, existing-system inventory, six data questions.
- **Section F** — EXECUTION_PLAN staleness check (added in the restart session). Four-point check on path correction, ledger items, process notes, and architectural carry-forwards.
- **Section G** — DF reconciliation against EXECUTION_PLAN, with all seven DF entries now **RESOLVED**. Summary table updated; net assessment paragraph rewritten to reflect green-light status.

The audit will be committed as part of Phase 0 close. The probe script (`scripts/probe-sprint-012.mjs`) was deleted before commit; probe results in audit Section B remain valid as documentation.
