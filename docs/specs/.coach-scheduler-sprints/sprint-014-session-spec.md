---
sprint_id: Sprint014
sprint_name: Coach Dashboard "Visit Requests" Tab
asset: Gritty OS Web App - Coach Dashboard
version: MVP
priority: Important, Urgent
effort: Medium
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: docs/specs/.coach-scheduler-sprints
status: not_started
sprint_013_close_state:
  master_head: ccc1079
  squash_merge: 0e59f83
  pr_number: 5
  production_url: https://app.grittyfb.com/athletes
inheritance_from_sprint_013:
  shipped_tables:
    - visit_requests (Sprint 012, intake-log)
    - coach_submissions (Sprint 012, intake-log)
    - visit_request_players (Sprint 012, intake-log)
    - visit_request_deliveries (Sprint 013 D7, per-recipient delivery)
    - partner_high_schools.timezone column (Sprint 013 D7 ride-along)
  shipped_dispatch:
    - api/coach-scheduler-dispatch.ts (Sprint 013 D1, Node 22.x runtime family pin)
    - submit handler in CoachSchedulerSection.jsx wires to dispatch (Sprint 013 D9 + OQ6)
    - confirmation panel renders three D9 copy branches
  carry_forwards_inherited:
    - oq7_cross_client_ics_render: deferred to follow-up sprint; Sprint 014 D6 "Resend invite" placeholder applies same constraint
    - d11_fixture_pattern: prefer supabase.auth.admin.createUser() over raw SQL INSERT for any new test fixtures
    - f21_naming_hygiene: partner_high_schools and hs_programs are two BC High rows joined by name string; Sprint 014 reads route through whichever is canonical for the read shape
    - f22_visit_requests_fk_ondelete: still open; Sprint 014 status updates use UPDATE not DELETE so does not trigger the ambiguity
    - erd_update_discipline: Carry-Forward #8 — every Sprint 014 migration touching schema updates docs/specs/erd/erd-current-state.md in the same commit
phase_0_progress:
  d0_rls_school_scoping: pending
  d11_status_history_table: pending
  d12_visit_request_deliveries_rls_extension: pending
  oq1_auth_model:
    status: resolved
    note: hs_coach_schools provides coach_user_id ↔ hs_program_id linkage already; Sprint 014 D0 adds RLS policies that join through this table
  oq2_status_history_table:
    status: resolved
    decision: dedicated visit_request_status_history table
    rationale: Sprint 014 stays self-contained, not blocked by Sprint 015 audit_log repair; entity-specific history is queryable without filtering audit_log by entity_type; audit_log scope reserved for admin-viewer purposes per operator
  oq3_sprint_014_vs_015_sequencing:
    status: resolved
    decision: Sprint 014 ships before Sprint 015
    rationale: head coach surface higher operational value than admin debt cleanup; OQ2 resolution removes audit_log dependency
  oq4_reschedule_scope:
    status: locked_carry_forward
    decision: deferred to Sprint 016+
    rationale: full reschedule means regenerating ICS + resending to attendees; significantly more complex than other deliverables; Sprint 014 ships placeholder button only
---

# Sprint 014 Session Spec — Coach Dashboard "Visit Requests" Tab

> **Status: not_started.** Sprint 013 closed at master `ccc1079` (squash `0e59f83`). Sprint 014 surfaces the data Sprint 013 captures in a tab inside the existing authenticated Coach Dashboard. All open questions resolved at promotion (see frontmatter). Three Phase 0 deliverables (D0 RLS school-scoping, D11 status history table, D12 visit_request_deliveries RLS extension) precede the eight UI deliverables.

## Sprint Objective

Add a "Visit Requests" tab to the existing Coach Dashboard so the high school's head coach can see incoming visit requests from college coaches, view their detail, see per-recipient delivery status (from Sprint 013), and update request status (confirm / cancel / mark complete). This sprint does not generate new emails or modify the public scheduler — it surfaces existing data in the authenticated coach surface.

## Hard Constraints

1. **Three new schema artifacts only.** Phase 0 introduces (a) RLS policies scoping intake-log + delivery tables to the authenticated head coach's school, (b) `visit_request_status_history` audit table, (c) RLS extension on `visit_request_deliveries` for authenticated head-coach SELECT. Phase 1+ deliverables are read/render/update against existing tables — no new tables in Phase 1.
2. **Reads from canonical schema only.** `visit_requests`, `visit_request_players`, `coach_submissions`, `profiles` (player names/emails — student athletes live in `public.profiles`, not `players`), `partner_high_schools` (school display + meeting_location + timezone), `hs_programs` (head coach routing per F-21 naming-hygiene), `hs_coach_schools` (auth-coach-school linkage), `visit_request_deliveries` (Sprint 013 D7 table).
3. **Auth-gated.** Tab is only visible inside the authenticated Coach Dashboard. No public access.
4. **Scoped to head coach's school via RLS.** Head coaches see only visit requests for schools where they have an `hs_coach_schools` row with `is_head_coach = true`. Multi-school architecture readiness honored: a coach with rows at multiple schools sees data from all those schools (UNION across their hs_program_ids).
5. **No email generation in this sprint.** Status changes update Supabase only. Reschedule is a placeholder; "Resend invite" is a placeholder pending OQ7 cross-client testing close.
6. **Mobile pairing required.** Tab and detail views work on phone-sized viewports. Detail view renders as slide-out or full-screen overlay on phone.
7. **Existing Coach Dashboard tabs unchanged.** Students, Recruiting Intelligence, Calendar, Reports tabs continue to work as before — frozen surface from prior sprints.
8. **ERD update discipline (Carry-Forward #8).** Every Phase 0 migration updates `docs/specs/erd/erd-current-state.md` in the same commit as the migration file.

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions.

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, Sprint 4 desired output |
| Canonical schema (binding) | `docs/specs/erd/erd-current-state.md` | Authoritative table inventory + RLS posture; updated by every schema-touching migration per Carry-Forward #8 |
| Sprint 013 spec + retro | `docs/specs/.coach-scheduler-sprints/sprint-013-session-spec.md` | "Sprint 013 Retro — Phase 1 + Phase 4 Findings" section captures D11 fixture seeding pattern recommendation, OQ5 lock language correction, Phase 4 routing pivot lesson, OQ7 deferral |
| Sprint 011 frozen surfaces | (referenced in EP Architectural Carry-Forwards #1–#7) | Sprint 011 UI primitives Sprint 014 inherits without modification |

## Phase 0 Deliverables

### D0 — RLS School-Scoping Verification + Build

Phase 0a (read-only audit):
- Read existing RLS policies on `visit_requests`, `coach_submissions`, `visit_request_players`, `visit_request_deliveries`
- ERD line 56/77/95/124 confirms current state: anon-INSERT-only with **no authenticated SELECT**. Sprint 014 D0 must add authenticated SELECT policies to all four tables.
- Verify `hs_coach_schools` is the binding table for coach-school linkage (ERD lines 159–182). Already verified: it is.

Phase 0b (migration):
- Single migration `0043_coach_dashboard_authenticated_rls.sql` adding four authenticated SELECT policies:
  1. `coach_submissions` — authenticated SELECT where `id IN (SELECT coach_submission_id FROM visit_requests WHERE school_id IN (...))`. Scoped via the same school filter as visit_requests.
  2. `visit_requests` — authenticated SELECT where `school_id IN (SELECT pp.id FROM partner_high_schools pp JOIN hs_programs hp ON pp.name = hp.school_name JOIN hs_coach_schools hcs ON hcs.hs_program_id = hp.id WHERE hcs.coach_user_id = auth.uid() AND hcs.is_head_coach = true)`. F-21 naming-hygiene join hop documented inline.
  3. `visit_request_players` — authenticated SELECT where `visit_request_id IN (SELECT id FROM visit_requests WHERE [same school scope as above])`.
  4. `visit_request_deliveries` — authenticated SELECT where `visit_request_id IN (SELECT id FROM visit_requests WHERE [same school scope as above])`. Closes the ERD line 124 forward-reference.

- ERD updated in same commit per Carry-Forward #8.
- Migration file is wholly additive. No existing policies modified.

**Acceptance test for D0:**
- Authenticated head coach (with `hs_coach_schools.is_head_coach = true` for BC High) can SELECT all `visit_requests` rows where `school_id` matches BC High via the F-21 join hop
- Same coach can SELECT joined `coach_submissions`, `visit_request_players`, `visit_request_deliveries`
- Authenticated non-head-coach (`is_head_coach = false`) gets empty result set
- Authenticated student gets empty result set (RLS doesn't apply student-row exposure to scheduler tables)
- Anon access to SELECT remains denied

### D11 — visit_request_status_history Table

New table introduced via `0044_visit_request_status_history.sql`:

```
CREATE TABLE public.visit_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_request_id uuid NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE NO ACTION,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reason_note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visit_request_status_history_visit_request_id_idx
  ON public.visit_request_status_history(visit_request_id);

ALTER TABLE public.visit_request_status_history ENABLE ROW LEVEL SECURITY;
```

**RLS posture:**
- Authenticated head-coach SELECT scoped through `visit_request_id` → same F-21 school-scope chain as D0
- INSERT service-role only (status update flows through dispatch-style function or direct service-role client; not anon)
- UPDATE / DELETE service-role only (history is append-only)

**Why dedicated table** (not audit_log): operator-decided. Audit_log is reserved for admin-viewer purposes; visit-request-specific history is a head-coach-visible operational artifact, not admin observability. Self-contained design avoids Sprint 015 audit_log repair dependency.

**ERD update in same commit** per Carry-Forward #8.

### D12 — visit_request_deliveries RLS Extension

Folded into D0's `0043` migration (single-policy item #4 in D0 above). No separate deliverable; the existing ERD comment at line 124 is closed by D0.

## Phase 1 Deliverables (UI build, opens after Phase 0 + branch cut)

### D1 — "Visit Requests" Tab in Coach Dashboard

New tab added to existing tab row (Students / Recruiting Intelligence / Calendar / Reports). Tab label: "Visit Requests" with optional badge showing count of pending requests for the head coach's school(s).

Tab visibility: only rendered if the authenticated user has at least one `hs_coach_schools` row with `is_head_coach = true`. Non-head-coach authenticated users (assistants, counselors) do not see the tab. Frontend gate is convenience; RLS is the security boundary.

### D2 — Visit Request List View

Table or card list showing all visit requests for the head coach's school(s). Each row displays:
- Coach name + program (from `coach_submissions.name` / `coach_submissions.program`)
- Requested date + time window (mapped via OQ8 lock from Sprint 013)
- Players selected (count, with names on hover/expand from `profiles.name` joined via `visit_request_players.player_id → profiles.user_id`)
- Status (`visit_requests.status`: `pending`, `confirmed`, `completed`, `cancelled`)
- Delivery status indicator (aggregated from `visit_request_deliveries`: all delivered / N of M delivered / failed)
- Created timestamp (`visit_requests.created_at`)

Sortable by date (default: requested_date ascending — soonest first), status, or coach name. Sort state persists in URL query string for shareable views.

### D3 — Filter Controls

Filter by:
- Status: `pending` / `confirmed` / `completed` / `cancelled` (multi-select)
- Date range: `upcoming` (requested_date ≥ today) / `past 30 days` (requested_date in last 30 days) / `all`
- Search: text match against `coach_submissions.name` or `coach_submissions.program`

Filter state persists in URL query string.

### D4 — Detail View

Click into a request to see full detail. Renders as side panel on desktop (≥768px), full-screen overlay on mobile (D7 mobile pairing).

Sections:
- **Coach contact** — `coach_submissions.name`, `email`, `program`, optional `notes`
- **Visit details** — `requested_date`, `time_window` (mapped to OQ8 hours + school timezone from `partner_high_schools.timezone`), `meeting_location` from `partner_high_schools`
- **Selected players** — full list from `visit_request_players` joined to `profiles.name` + `profiles.position` + `profiles.grad_year`. Click a player name to navigate to their profile inside Coach Dashboard if available (or surface as read-only).
- **Per-recipient delivery status** (D6 surface) — table of `visit_request_deliveries` rows: recipient_email, recipient_role, send_status, attempted_at, delivered_at, error_message if failed
- **Status update controls** (D5)
- **Status history** (from D11 table) — chronological list of status changes with actor, previous_status, new_status, reason_note (if any), changed_at
- **Created timestamp + last status change timestamp**

### D5 — Status Update Controls

Action buttons in the detail view, gated by current status:

| Current Status | Available Actions |
|---|---|
| `pending` | Mark as Confirmed, Cancel Request, Reschedule (placeholder) |
| `confirmed` | Mark as Completed (only if `requested_date` passed), Cancel Request, Reschedule (placeholder) |
| `completed` | (no actions; terminal state) |
| `cancelled` | (no actions; terminal state) |

Each status change:
1. Updates `visit_requests.status` to new value (UPDATE — preserves F-22 visit_requests FK ON DELETE NO ACTION; no DELETE involved)
2. INSERT row into `visit_request_status_history` with `actor_user_id = auth.uid()`, `previous_status`, `new_status`, optional `reason_note`
3. Refreshes detail view to show new status + appended history row
4. UI shows confirmation toast

"Cancel Request" includes a small modal asking for optional reason note (free text, ≤500 chars).

"Reschedule" placeholder button shows tooltip "Reschedule flow coming Sprint 016+. To reschedule, cancel this request and ask the coach to submit a new one."

### D6 — Delivery Status Surface

Per-recipient delivery status from `visit_request_deliveries` displayed inline in detail view (already covered in D4 sections).

For failed deliveries, "Resend invite" action button is **placeholder only** (tooltip: "Resend coming after OQ7 cross-client ICS testing closes"). OQ7 carry-forward dependency.

### D7 — Mobile Tab Behavior

Tab row scrolls horizontally on narrow viewports if needed (existing Coach Dashboard mobile pattern — verify in Phase 1).

Detail view renders as full-screen overlay on phone (≤768px). Slide-out side panel on tablet+ (≥768px and <1024px) and desktop (≥1024px).

Mobile-specific behaviors:
- Touch-friendly tap targets (≥44pt) on action buttons
- Swipe-down or back-button-style close on full-screen overlay
- List view condenses to card layout on mobile (rows become stacked cards)

### D8 — Empty States

Three empty states:

1. **No visit requests yet** (head coach is logged in, no rows for their school). Copy: "No visit requests yet. Coaches will land here when they schedule drop-ins via your public roster page."
2. **All requests filtered out** (rows exist but current filter excludes all). Copy: "No requests match these filters. Adjust filters or clear them to see all."
3. **No deliveries yet** (request is pending and dispatch hasn't fired or all failed). Copy: "No delivery records yet. Dispatch may still be processing."

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| F-21 join hop (`partner_high_schools` ↔ `hs_programs` via name string) brittle for D0 RLS policy | Medium | Document the join inline in migration SQL with explanatory comment. Backlog item `BL-S012-XX-naming-hygiene` exists for the rename refactor; not Sprint 014 scope. |
| Authenticated SELECT policies have performance impact on `visit_requests` SELECT-by-coach reads | Low | Index `hs_coach_schools(coach_user_id, is_head_coach)` already exists per UNIQUE constraint; should be sufficient for the auth.uid() lookup. Verify in Phase 0b acceptance test. |
| Status update conflicts (two coaches at same school updating same request simultaneously) | Low | Last-write-wins with refresh prompt. Status history table captures all changes so no data loss; UI shows latest state on refresh. |
| Detail view becomes too dense (delivery + history + players + status controls) | Medium | Use collapsible sections; consider tabbed detail view if information density gets unmanageable. Iterate during Phase 1 build. |
| D5 status state machine drift (confirmed → completed vs cancelled order matters) | Low | State machine documented in D5 table; enforce client-side gate on available actions; service-role function validates transition on UPDATE. |
| Empty state #1 never shows because BC High will have real visit_requests soon | Low | Acceptable — empty state is for newly-onboarded schools. Document that Sprint 015 onboarding work or BC High pre-seed is the trigger for the empty state to be replaced. |

## Definition of Done

- All Phase 0 deliverables (D0 RLS school-scoping, D11 status history table, D12 closed by D0) shipped on master in sequenced commits, ERD updated in each
- Phase 1 deliverables D1-D8 ship desktop + mobile
- Head coach can log in, see all visit requests for their school, sort/filter, view detail
- Detail view shows full information including per-recipient delivery status, status history
- Status updates persist via dedicated `visit_request_status_history` table
- Auth-gated, no public exposure (anon SELECT denied, non-head-coach authenticated SELECT empty)
- Vitest assertion count ≥ Sprint 013 close floor (762/1/763 verified at sprint close) + new Sprint 014 assertions
- No regressions on existing Coach Dashboard tabs (Students, Recruiting Intelligence, Calendar, Reports)
- All migrations conform to Carry-Forward #8 (ERD updated in same commit)

## Notes for Phase 1 Branch Cut

Phase 0 work lands on master per the canonical operating pattern's allowance for sprint-artifact + foundational schema work. Phase 1 (UI build) opens on a new sprint branch.

1. **D0 (RLS school-scoping migration)** complete on master. Migration `0043_coach_dashboard_authenticated_rls.sql` shipped + ERD updated.
2. **D11 (status history table migration)** complete on master. Migration `0044_visit_request_status_history.sql` shipped + ERD updated.
3. **Pre-sprint diagnostic verification** of head-coach RLS (Phase 0 acceptance test) — verify with the existing Sprint 013 D11 fixture or a freshly-created authenticated test user.
4. **Confirm production state** of `visit_requests` rows for BC High (operator should see at least the test row from Sprint 013 Phase 4 verification).
5. **Cut sprint branch** `sprint-014-coach-dashboard-visit-requests` from master once Phase 0 deliverables clear. Phase 1 opens on the new branch.

## Sprint 014 → 015 Sequencing

Sprint 014 ships before Sprint 015 (per OQ3 resolution). Sprint 015's audit_log repair work is decoupled from Sprint 014 because OQ2 chose a dedicated `visit_request_status_history` table. Sprint 015 may surface additional admin-panel-related issues that Sprint 014's UI didn't, but those are independent.

## Carry-Forwards from Sprint 013

The following Sprint 013 retro material applies to Sprint 014:

- **OQ7 cross-client ICS render issues** still deferred. Sprint 014's "Resend invite" placeholder button does not fire dispatch — when OQ7 closes (likely Sprint 016 or follow-up), Sprint 014's placeholder gets wired to a re-dispatch endpoint.
- **D11 fixture pattern recommendation** — if Sprint 014 needs new test fixtures (likely for testing authenticated-coach-SELECT acceptance), use `supabase.auth.admin.createUser()` instead of raw SQL INSERT into auth.users.
- **F-21 naming-hygiene join hop** is core to Sprint 014's RLS policies. Document inline in migration SQL.
- **F-22 visit_requests FK ON DELETE NO ACTION** still open. Sprint 014 status updates use UPDATE (not DELETE) so the ambiguity does not trigger; cancellation is a status transition, not a row deletion.
- **ERD update discipline (Carry-Forward #8)** — every Sprint 014 migration touching schema updates the ERD in the same commit.
- **Test floor floor:** 762/1/763 baseline at Sprint 013 close. Sprint 014 must preserve or grow this.
- **Frozen surfaces** (do not modify):
  - `api/recruits-auth.ts` (Sprint 011 Carry-Forward #5, Edge runtime)
  - `api/coach-scheduler-dispatch.ts` (Sprint 013 D1 frozen surface, Node 22.x family)
  - Sprint 011 UI primitives (`SlideOutShell.jsx`, `useRecruitsRoster.js`, `RecruitCard.jsx`, `PlayerCardReference.jsx`)
  - Sprint 012 ship surfaces beyond what Sprint 014 strictly requires (`CoachSchedulerSection.jsx`, `CoachSchedulerCTA.jsx`, `RecruitsTopNav.jsx`)

---
