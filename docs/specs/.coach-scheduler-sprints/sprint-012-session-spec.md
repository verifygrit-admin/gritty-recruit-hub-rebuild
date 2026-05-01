---
sprint_id: Sprint012
sprint_name: Schedule-a-Drop-In CTA + Modal (Date/Time + Coach Info)
asset: Gritty OS Web App - Public Surface
version: MVP
priority: Important, Urgent
effort: Medium-High
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: draft
---

# Sprint 012 Session Spec — Schedule-a-Drop-In CTA + Modal (Date/Time + Coach Info)

> **Status: working draft.** Open questions remain (especially around date filtering logic, schema decisions). Sprint 011 must complete first. Promote to `not_started` after open questions resolve and a pre-sprint schema review fires.

## Sprint Objective

Add a persistent "Schedule a Drop-In" CTA to the public `/recruits` page, and a 3-step modal that captures a college coach's preferred date, time window, and contact information. On submit, two new Supabase records are created: a `visit_requests` row (in `pending` status, no players linked yet) and a `coach_submissions` row (soft profile for the coach). Player selection and ICS generation are Sprint 013.

This sprint introduces two new tables to Supabase. It does not yet send any email.

## Hard Constraints

1. **Two new tables ship in this sprint:** `visit_requests` and `coach_submissions`. Schema must be reviewed before sprint opens.
2. **No email send.** Sprint 013 owns email. This sprint's submit confirms in-page only ("We've received your request, you'll hear from us shortly").
3. **Honeypot only, no captcha.** Anti-abuse is invisible honeypot field. Captcha is carry-forward if needed later.
4. **No authentication required to use the scheduler.** Coach submits with name + email + program; no account creation.
5. **Mobile pairing required.** Modal must be usable on phone-sized viewports — date cards stack appropriately, time list is tappable, form fields don't overflow.
6. **Sprint 011 deliverables remain unchanged.** Card grid, filters, school toggle all behave identically.

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions.

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, decisions on record |
| Prototype HTML | `docs/specs/.coach-scheduler-sprints/prototype/index.html` | Visual reference for CTA strip and 3-step modal |
| Sprint 011 retro | `docs/specs/sprint-011/retro.md` (assumed) | Public page state, route paths |

## Deliverables (Draft)

### D1 — Persistent Sticky CTA Strip

CTA strip pinned to the top of the page (under the main nav), visible while scrolling the entire `/recruits` page. Bright lime button "Coach? Schedule a Drop-In" with calendar icon. Clicking opens the modal.

### D2 — Modal Step 1: Date Selector

Visual day-card grid (e.g., 6 cards visible by default with "Show more dates" expansion). Each card shows day-of-week, day number, month abbreviation. Selected state visible. Continue button advances to Step 2.

**Open question — date filtering logic:** What dates are eligible? See open questions section.

### D3 — Modal Step 2: Time Window Selector

Vertical list of named time windows: Morning (8 AM – 12 PM), Midday (12 PM – 2 PM), Afternoon (2 PM – 5 PM), Evening (5 PM – 8 PM), Flexible (any time). Selected state visible. Continue advances.

### D4 — Modal Step 3: Coach Contact Form

Form fields:
- Coach name (required)
- Coach email (required, validated format)
- Program / college name (required)
- Optional notes (free text, character-limited)
- Honeypot field (invisible, automated submissions populate it and get rejected)

Submit button. On submit, both Supabase writes fire (D6).

### D5 — Confirmation Screen

After successful submit, modal contents replace with confirmation: "We've received your request, you'll hear from us shortly. [School Name] will be in touch with calendar details." Modal can be dismissed.

### D6 — Supabase Schema: Two New Tables

**`visit_requests` table:**
- `id` (uuid, primary key)
- `coach_submission_id` (uuid, FK to coach_submissions)
- `school_id` (uuid, FK to schools)
- `requested_date` (date)
- `time_window` (enum: morning, midday, afternoon, evening, flexible)
- `notes` (text, nullable)
- `status` (enum: pending, confirmed, completed, cancelled — default `pending`)
- `created_at` (timestamptz, default now())

**`coach_submissions` table:**
- `id` (uuid, primary key)
- `name` (text)
- `email` (text, unique)
- `program` (text)
- `source` (enum: scheduler, registration — default `scheduler` for Sprint 012)
- `verified` (boolean, default false)
- `created_at` (timestamptz)

**Behavior on duplicate email:** If a coach submits a second request with the same email, `coach_submissions` row is updated (most recent name/program); a new `visit_requests` row is still created.

### D7 — Mobile Modal Behavior

Modal renders full-screen on narrow viewports (iOS bottom-sheet style is acceptable). Date cards stack to 2-column on phone-sized screens. Time list and form fields adapt to viewport width.

### D8 — Honeypot Validation

Form contains an invisible field (CSS-hidden, label with `tabindex="-1"`). If submission populates that field, server rejects the submission silently with no Supabase write.

## Open Questions to Resolve Before Promoting This Spec

- **Date filtering logic.** Three reasonable options for which dates the picker shows:
  1. Any future weekday (Mon–Fri)
  2. Any future date (including weekends)
  3. Per-school "open visit days" configurable via admin panel
  Decision needs to land before sprint opens. Recommend option 1 for MVP unless schools have specific availability windows.
- **Sender email for the eventual confirmation invite (Sprint 013).** Not in scope for this sprint, but the sender identity decision affects the form's "you'll hear from us shortly" copy.
- **Schema review.** New tables need a quick design review against existing schema conventions (naming, FK patterns, enum vs. text). Pre-sprint diagnostic recommended.
- **`coach_submissions` email uniqueness collision.** If a college coach submits, then a separate person at the same college submits with the same email, the second update overwrites the first. Acceptable for MVP, but flag whether this is the intended behavior.

## Risk Register (Preliminary)

| Risk | Severity | Mitigation |
|---|---|---|
| New tables ship without proper RLS policies; public scheduler becomes data exfiltration vector | High | RLS policies for `visit_requests` and `coach_submissions`: anon role can INSERT only, no SELECT. Verify in pre-sprint schema review. |
| Honeypot insufficient against sophisticated spam | Medium | Acceptable for MVP. Carry-forward Cloudflare Turnstile if abuse appears. |
| Date picker shows dates the school can't actually host visits | Medium | Resolve via the date-filtering open question before sprint opens |
| Modal can't be closed if submission fails | Medium | Submit failure path: show error, leave form data intact, allow retry or cancel |
| Mobile modal scrolling traps user | Low | Use a known-working mobile modal pattern; test on real device |

## Definition of Done (Draft)

- All 8 deliverables ship desktop + mobile
- Coach completes flow on `/recruits`, two records land in Supabase
- Honeypot rejects automated submissions silently
- RLS policies block public read access to both new tables
- Vitest assertion count ≥ Sprint 011 floor + new assertions
- No regressions on the public page

## Notes for Promotion

When promoting from `draft` to `not_started`:
1. Resolve all open questions, especially date filtering logic
2. Run a pre-sprint schema review (diagnostic session) to validate table designs and RLS policies
3. Finalize Definition of Done with concrete acceptance numbers
4. Add Prompt 0
5. Confirm Sprint 011 retro is complete and `/recruits` is live

---
