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
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: draft
---

# Sprint 014 Session Spec — Coach Dashboard "Visit Requests" Tab

> **Status: working draft.** Sprint 013 must complete first. This sprint surfaces the data Sprint 013 starts capturing, in a tab inside the existing authenticated Coach Dashboard. Open questions are minimal — this is a relatively contained UI sprint.

## Sprint Objective

Add a "Visit Requests" tab to the existing Coach Dashboard so the high school's head coach can see incoming visit requests from college coaches, view their detail, see per-recipient delivery status (from Sprint 013), and update request status (confirm / reschedule / cancel). This sprint does not generate new emails or modify the public scheduler — it surfaces existing data in the authenticated coach surface.

## Hard Constraints

1. **No new tables.** Reads from `visit_requests`, `visit_request_players`, `coach_submissions`, `players`, `schools`, and the per-recipient delivery status surface from Sprint 013.
2. **Auth-gated.** Tab is only visible inside the authenticated Coach Dashboard. No public access.
3. **Scoped to head coach's school.** Head coaches see only their own school's visit requests, not all schools' (per multi-school architecture readiness).
4. **No email generation in this sprint.** Status changes update Supabase only. Reschedule does not yet regenerate the .ics — that's a carry-forward.
5. **Mobile pairing required.** Tab and detail views work on phone-sized viewports.
6. **Existing Coach Dashboard tabs unchanged.** Students, Recruiting Intelligence, Calendar, Reports tabs continue to work as before.

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions.

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, Sprint 4 desired output |
| Existing Coach Dashboard tab structure | TBD (locate during Phase 1) | Reference for tab-add pattern |
| Sprint 013 retro | `docs/specs/sprint-013/retro.md` (assumed) | Schema as actually shipped, delivery status field shape |

## Deliverables (Draft)

### D1 — "Visit Requests" Tab in Coach Dashboard

New tab added to existing tab row (Students / Recruiting Intelligence / Calendar / Reports). Tab label: "Visit Requests" with optional badge showing count of pending requests.

### D2 — Visit Request List View

Table or card list showing all visit requests for the head coach's school. Each row displays:
- Coach name + program (joined from `coach_submissions`)
- Requested date + time window
- Players selected (count + names on hover/expand)
- Status (pending, confirmed, completed, cancelled)
- Delivery status indicator (all delivered / N delivered / failed)
- Created timestamp

Sortable by date (default: requested_date ascending — soonest first), status, or coach name.

### D3 — Filter Controls

Filter by status (pending/confirmed/completed/cancelled), date range (upcoming / past 30 days / all), and search by coach name or program.

### D4 — Detail View

Click into a request to see full detail:
- Coach contact information (name, email, program, optional notes)
- Date and time window
- Selected players (full list, with link to player profile inside Coach Dashboard if available)
- Delivery status per recipient (showing each attendee email + delivered/failed/bounced status)
- Status update controls (D5)
- Created timestamp + last status change timestamp

### D5 — Status Update Controls

Action buttons in the detail view:
- "Mark as Confirmed" (pending → confirmed)
- "Mark as Completed" (confirmed → completed; available after the requested_date passes)
- "Cancel Request" (any status → cancelled, with optional reason note)
- "Reschedule" — placeholder button that surfaces "Reschedule flow coming soon" (full reschedule is carry-forward)

Status changes write to `visit_requests.status` and append to a `visit_request_status_history` log table (or an existing audit log if Sprint 015's audit log work is upstream — check sequencing).

### D6 — Delivery Status Surface

In the detail view, the per-recipient delivery status from Sprint 013 is visible. Failed deliveries show a "Resend invite" action button (placeholder for now — implementation could be a Sprint 014 stretch goal or a carry-forward).

### D7 — Mobile Tab Behavior

Tab row scrolls horizontally on narrow viewports if needed. Detail view renders as a slide-out or full-screen overlay on phone.

### D8 — Empty States

If no visit requests exist yet, show a friendly empty state with copy like "No visit requests yet. Coaches will land here when they schedule drop-ins via your public roster page."

## Open Questions to Resolve Before Promoting This Spec

- **Auth model for "head coach sees their school only".** Verify the existing Coach Dashboard has a school-scoping mechanism (RLS on `users.school_id`?). If not, this sprint's scope expands to add it — flag during pre-sprint review.
- **Status history table.** Should status changes be logged in a dedicated `visit_request_status_history` table, or in the existing `audit_log` table (assuming Sprint 015 has fixed it)? Decision depends on whether Sprint 014 ships before or after Sprint 015's admin repair fixes the audit log.
- **Reschedule scope.** Full reschedule means regenerating the .ics and resending to all attendees. That's significantly more complex than other deliverables. Carry-forward is the right call for v1, but flag as a known deferred feature.
- **Notification on new request landing.** Should head coaches receive an email/Slack/in-product notification when a new visit request lands? Decision: out of scope for Sprint 014 (carry-forward).

## Risk Register (Preliminary)

| Risk | Severity | Mitigation |
|---|---|---|
| RLS not yet scoping by school; head coaches see all schools' requests | High | Verify school-scoping in pre-sprint check; if missing, add RLS as Phase 0 |
| Detail view becomes complex with delivery status + status history + player list | Medium | Iterate on layout; consider a tabbed detail view if information density gets heavy |
| Status update conflicts (two coaches updating same request simultaneously) | Low | Use optimistic locking or last-write-wins with a refresh prompt |
| Empty state never shown because of test data leftover from Sprint 013 | Low | Document test data cleanup as part of Phase 3 deploy |

## Definition of Done (Draft)

- All 8 deliverables ship desktop + mobile
- Head coach can log in, see all visit requests for their school, sort/filter
- Detail view shows full information including per-recipient delivery status
- Status updates persist (with whatever audit logging applies after Sprint 015)
- Auth-gated, no public exposure
- Vitest assertion count ≥ Sprint 013 floor + new assertions
- No regressions on existing Coach Dashboard tabs

## Notes for Promotion

When promoting from `draft` to `not_started`:
1. Resolve open questions (auth scoping, status history table, audit log dependency)
2. Confirm Sprint 013 retro is complete and visit requests are landing in production
3. Verify school-scoping RLS is in place
4. Add Prompt 0
5. Decide whether Sprint 014 ships before or after Sprint 015 (sequencing affects audit log dependency)

---
