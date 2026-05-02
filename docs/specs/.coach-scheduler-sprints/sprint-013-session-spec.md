---
sprint_id: Sprint013
sprint_name: Player Selection + ICS Multi-Recipient Invite
asset: Gritty OS Web App - Public Surface + Email Infrastructure
version: MVP
priority: Important, Urgent
effort: High
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: draft
---

# Sprint 013 Session Spec — Player Selection + ICS Multi-Recipient Invite

> **Status: working draft.** This is the highest-risk sprint in the coach-scheduler series. Multiple open questions remain that should resolve through a diagnostic session before promotion. Sprint 012 must complete first.

## Sprint Objective

Add a player selection step to the scheduler modal between time-window and contact-info steps, and implement ICS calendar invite generation + multi-recipient email distribution on submit. The college coach, the high school's head coach, and the selected players all receive a single .ics attachment with all attendees visible.

This sprint introduces:
- One join table (`visit_request_players`)
- Schema confirmation that `users.head_coach` boolean exists and is populated
- A transactional email integration
- Server-side ICS generation logic

This sprint does NOT integrate with Google Calendar API — see DEC-record entry G in the execution plan. ICS file generation only.

## Hard Constraints

1. **No Google Calendar API integration.** Server-generated `.ics` only.
2. **Single .ics, full attendee visibility.** All attendees on one invite, all visible to each other (per decision H in execution plan).
3. **Per-recipient delivery status logged.** If email send fails for one recipient, others still succeed and the failure is recorded in Supabase, not silently dropped.
4. **No Sprint 012 functionality breaks.** Existing 3-step flow continues to work (now becomes 4-step with player picker inserted between time and contact info).
5. **Mobile pairing required.** Player picker is usable on phone-sized viewports.
6. **Player consent verified before player emails go out.** See open questions — this is a pre-sprint gate, not a sprint task.
7. **Submit path migration owned by this sprint.** Sprint 012 ships the modal with direct supabase-js calls (per DF-5 resolution 2026-05-01). Sprint 013 migrates the submit path to a server-side function (Vercel function at `api/coach-scheduler-submit.ts` or equivalent, or Supabase Edge Function — provider decision is part of this sprint's scope). The function executes the same two inserts as Sprint 012's client path (`coach_submissions` upsert, `visit_requests` insert) plus the email send work in D5/D6/D7. The "Phase 0" migration of the submit path is a precondition for D5 onward.

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions. **New external dependency:** transactional email provider (Resend recommended).

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, ICS attendee decision (H), email provider considerations |
| Prototype HTML | `docs/prototypes/coach-scheduler/index.html` | Visual reference for player picker step (Step 3 in the modal preview row) |
| Sprint 012 retro | `docs/specs/sprint-012/retro.md` (assumed) | `visit_requests` and `coach_submissions` schema as actually shipped |
| Pre-sprint diagnostic notes | TBD | Email provider selection, sender identity, player consent verification |

## Deliverables (Draft)

### D1 — Modal Step Insertion: Player Picker

New step between Sprint 012's Step 2 (time window) and Step 3 (contact form). Player picker shows the currently-selected school's roster with multi-select chip-style UX. Each picker row shows: small avatar, name, position, class year, selected checkbox. Selection count visible. Continue advances to contact form (now Step 4).

### D2 — `visit_request_players` Join Table

**Moved to Sprint 012 Phase 3 (2026-05-01).** The `visit_request_players` join table was originally scheduled for Sprint 013 but was pulled forward to Sprint 012 because the Phase 2 modal ships with a fully functional player picker. The `0040_visit_request_players.sql` migration in Sprint 012 introduces this table with a FK on `profiles(user_id)`. Sprint 013's scope reduces accordingly — D2 closes here. Subsequent deliverables D3–D10 are unaffected.

### D3 — `users.head_coach` Schema Confirmation

Verify the `users` table has a `head_coach` boolean column scoped by `school_id` (e.g., a user with `head_coach=true` and `school_id=<bc_high_id>` is BC High's head coach for routing purposes). Populate the value for at least BC High before the sprint opens. If the schema doesn't yet support this, add it via migration as Phase 0 of this sprint.

### D4 — `partner_high_schools.meeting_location` Confirmation

Confirm `partner_high_schools.meeting_location` is populated for the visit's school. The column was added to `partner_high_schools` in Sprint 012 per DF-1 resolution and seeded for BC High at that time. Sprint 013 verification: query `partner_high_schools.meeting_location` for the row referenced by `visit_requests.school_id`; if NULL, fall back to `partner_high_schools.address`.

### D5 — Server-Side ICS Generation

On submit, the migrated submit function (per Hard Constraint 7) generates a single `.ics` file with:
- ORGANIZER: high school head coach's email
- ATTENDEE entries (all visible): college coach, each selected player, head coach
- SUMMARY: "[College Program] visit at [School Name]"
- LOCATION: school's meeting_location
- DTSTART / DTEND: derived from requested_date + time_window
- DESCRIPTION: notes from coach submission, plus auto-generated meta ("X players will be present: [names]")

### D6 — Transactional Email Send

Integrate transactional email provider (Resend recommended). The migrated submit function (per Hard Constraint 7) executes:
1. Generate ICS per D5
2. Send email to ALL attendees with the .ics as both an attachment AND with `Content-Type: text/calendar; method=REQUEST` header so calendar clients auto-parse
3. Subject: "Calendar invite: [College Program] visit on [Date]"
4. Plain-text body summarizing the meeting

### D7 — Per-Recipient Delivery Status Tracking

Add a delivery status field per recipient. Options:
- New `visit_request_deliveries` table with rows for each recipient + status (sent, failed, bounced)
- Or a JSONB field on `visit_requests` with delivery status keyed by email

Sprint 014 (Coach Dashboard tab) reads this status to surface delivery problems.

### D8 — Failure Path: Save Even If Email Fails

If any email send fails:
- The Supabase records (visit_request, visit_request_players, deliveries) still save successfully
- The failed recipient's delivery status is logged
- The user-facing confirmation surfaces partial-success: "Invite sent to [N of M] recipients. We'll follow up with the remaining recipients shortly."

### D9 — Confirmation Screen Update

Sprint 012's confirmation screen updates to reference the calendar invite: "Invite sent to [N] recipients. Check your email for the calendar invite."

### D10 — Mobile Player Picker

Picker rows stack appropriately on narrow viewports. Selection state remains visible. Scroll within the picker container if roster exceeds modal height.

## Open Questions to Resolve Before Promoting This Spec

- **Transactional email provider selection.** Recommend Resend (simplest, good ICS support). Alternatives: Postmark, SendGrid. Decide before sprint opens.
- **Sender identity.** Two options: `noreply@grittyfb.com` (cleanest) or as the head coach with reply-to set (more personal). Affects deliverability and how invites read.
- **Player email consent.** Critical pre-sprint gate. Players already have emails in Supabase, but have students/parents consented to receiving college coach visit invites in their school inbox? May need:
  - Per-player opt-in flag on the players table
  - Per-school consent default
  - Or a one-time email blast to current players asking for opt-in
- **Head coach identification logic.** Confirm exactly one `head_coach=TRUE` user per school. If multi-head-coach is possible (offensive coordinator + defensive coordinator both flagged), define routing rule (e.g., primary head coach by created_at, or by an explicit `is_primary_head_coach` flag).
- **ICS format edge cases.** Some email clients (older Outlook, some Gmail configurations) handle multi-attendee ICS files inconsistently. Test on at least: Apple Mail / iCal, Gmail web + mobile, Outlook web + desktop.
- **Time window → time conversion.** "Morning (8 AM – 12 PM)" — does the .ics event span the full window, or pick a midpoint? Recommend: full window, with a note in the description that the exact time will be confirmed by the head coach.

## Risk Register (Preliminary)

| Risk | Severity | Mitigation |
|---|---|---|
| Player emails sent without proper consent | High | Resolve consent question before sprint opens. If consent isn't established, scope to send only to college coach + head coach in this sprint, defer player emails to a later sprint. |
| Transactional email provider has deliverability issues | Medium | Use a domain that's been warmed up (grittyfb.com or thinkwellspring.com); set up SPF/DKIM/DMARC; monitor bounce rates |
| ICS file rejected by major calendar clients | Medium | Test on Apple Mail, Gmail, Outlook before deploy; use a known-good ICS library, not hand-rolled string concatenation |
| Email service outage on submit creates inconsistent state | Medium | D8 covers this — Supabase records save first, email send is the secondary action with explicit failure logging |
| Edge Function cold start delay makes submit feel slow | Low | If observed, move to a warm endpoint or accept the delay as a one-time UX cost |
| Player email addresses in Supabase are stale (graduates, transferred students) | Medium | Cross-reference with current roster before sprint opens; mark inactive students if any |

## Definition of Done (Draft)

- All 10 deliverables ship desktop + mobile
- Coach completes full 4-step flow (date → time → players → contact info → submit)
- Single .ics file generated with correct LOCATION, DTSTART/DTEND, full attendee list
- All attendees receive the email; .ics auto-imports in major calendar clients
- Supabase has visit_request, visit_request_players, and per-recipient delivery status
- Failure mode: per-recipient failure logged, others still succeed, user sees partial-success confirmation
- Vitest assertion count ≥ Sprint 012 floor + new assertions
- No regressions on the public page or Sprint 012 functionality

## Notes for Promotion

When promoting from `draft` to `not_started`:
1. Resolve ALL open questions, especially player email consent (this is a hard gate)
2. Pre-sprint diagnostic session to validate ICS format on real calendar clients
3. Set up transactional email provider account, domain auth (SPF/DKIM/DMARC), test send
4. Confirm `users.head_coach` and `schools.meeting_location` are populated for BC High
5. Add Prompt 0
6. Confirm Sprint 012 retro is complete and the 3-step modal is shipping correctly

---
