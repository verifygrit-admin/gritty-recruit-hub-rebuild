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
status: not_started
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
| Prototype HTML | `docs/prototypes/coach-scheduler/index.html` | Visual reference for CTA strip and 3-step modal |
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

### D6 — Supabase Schema: Four New Tables in Sprint 012 (`partner_high_schools`, `coach_submissions`, `visit_requests`, `visit_request_players`)

**Architectural framing (2026-05-01 intake-log reframe):** `coach_submissions` and `visit_requests` are **intake-log tables** — append-only records of intake events, not per-coach or per-visit staging rows. Each row records what was asserted at submission time. Canonical coach identity (current contact info, multi-state verification) lives at the canonical layer (`college_coaches`), populated by a later enrichment pipeline. See EXECUTION_PLAN "Coach Identity Architecture (intake log + canonical)" section for the two-layer model. Migration `0041` carries the schema cascade: drop email UNIQUE, drop `verification_state` column, add `submitter_verified` boolean. `0041` ships before Phase 3 build resumes.

**Phase 3 scope shift (2026-05-01):** `visit_request_players` was originally Sprint 013 D2. Pulled forward to Sprint 012 Phase 3 because the Phase 2 modal ships with a fully functional player picker — pulling D2 forward lets player selections persist immediately rather than waiting for Sprint 013 to add the schema. Migration `0040_visit_request_players.sql` introduces this fourth table. See EXECUTION_PLAN scope-shift entry for full rationale.

**`partner_high_schools` table** (new in this sprint per DF-1 resolution 2026-05-01):
- `id` (uuid, primary key)
- `slug` (text, NOT NULL, UNIQUE)
- `name` (text, NOT NULL)
- `meeting_location` (text, nullable)
- `address` (text, nullable)
- `created_at` (timestamptz, default now())

Seed: BC High row populated in the `0039_*` migration. Belmont Hill onboards in a later sprint via INSERT, not migration. RLS: anon SELECT only (school identity is public — modal needs it).

**`visit_requests` table:**
- `id` (uuid, primary key)
- `coach_submission_id` (uuid, FK to coach_submissions)
- `school_id` (uuid NOT NULL, FK to partner_high_schools.id)
- `requested_date` (date)
- `time_window` (enum: morning, midday, afternoon, evening, flexible)
- `notes` (text, nullable)
- `status` (enum: pending, confirmed, completed, cancelled — default `pending`)
- `created_at` (timestamptz, default now())

**Note on `school_id` FK target:** `visit_requests.school_id` references `partner_high_schools.id`, not the existing `schools` table (which holds NCAA institutions per audit Section A finding — `unitid integer` PK, BC High not in it). See DF-1 resolution.

**`coach_submissions` table** (intake-log table — append-only):
- `id` (uuid, primary key)
- `name` (text)
- `email` (text) — *not unique per DF-3 reframed 2026-05-01; intake-log tables don't enforce uniqueness on attribute columns. The `0041` migration drops the UNIQUE constraint that 0039 introduced.*
- `program` (text)
- `source` (enum: scheduler, registration — default `scheduler` for Sprint 012)
- `submitter_verified` (boolean NOT NULL DEFAULT false) — *replaces the prior `verification_state` text column per DF-7 reframed 2026-05-01. Per-row verification flag, not a state machine. Multi-state coach verification lives at the canonical layer (`college_coaches`), not on the intake log. The `0041` migration drops `verification_state` and adds `submitter_verified`.*
- `created_at` (timestamptz)

**Note on `submitter_verified` (post-0041 schema):** boolean default false. True only if the submitter's identity was verified at submission time (e.g., by a future server-side route checking the email against `college_coaches`). For Sprint 012, all anon submissions land with `submitter_verified = false`. Anon INSERT `WITH CHECK` requires `submitter_verified = false` per the DF-2 cascade (replacing the prior `verification_state = 'unverified'` clause). State transitions belong to the canonical layer (`college_coaches.verification_state`, to be designed when the enrichment pipeline is built). See EXECUTION_PLAN Open Decisions DF-7 (and the "Coach Identity Architecture" section) for the full two-layer model.

**Consumer-side pattern requirement (intake-log reframe, 2026-05-01):** anon writes use plain `supabase.from('...').insert(payload)` per the intake-log reframe (DF-5 reframed 2026-05-01). The prior `.insert().select()` finding (Phase 1) and `.upsert()` finding (Phase 3) no longer apply because the submit pattern is plain insert with no return-side reads. Both `coach_submissions` and `visit_requests` follow the same shape: `.insert(payload)`, no `.select()` chain, no `.upsert()` option bag. Each submit creates a new intake row. The two-call submit sequence (one row to `coach_submissions`, one row to `visit_requests` referencing it via FK) becomes:

```js
// 1. Append the coach intake event
const { data: cs, error: csErr } = await supabase
  .from('coach_submissions')
  .insert(coachPayload);
// 2. Append the visit request event (FK to coach_submissions.id)
const { error: vrErr } = await supabase
  .from('visit_requests')
  .insert(visitPayload);
```

Note: because anon has no SELECT policy on `coach_submissions`, the modal cannot read the inserted `id` back from the response. Phase 3 wiring must generate the `coach_submissions.id` client-side (via `crypto.randomUUID()`) and reuse it as `visit_requests.coach_submission_id`. The probe pattern from the 0040 apply (probes 3b.i + 3b.ii) demonstrated this approach.

**Behavior on duplicate email (intake-log reframe):** Each submission creates a new `coach_submissions` intake row regardless of whether the email matches a prior row. The new row carries the new submission's name and program values verbatim. The "current" name/program for a coach is determined by the enrichment pipeline at the canonical layer (later sprint), which reads intake rows most-recent-by-email and updates `college_coaches`. The original "last-write-wins via ON CONFLICT (email) DO UPDATE" framing (DF-3 + Sprint 012 spec) is superseded — the intake log preserves all submissions verbatim, the canonical layer determines current state.

**`visit_request_players` table** (added Phase 3 via scope-pull-forward from Sprint 013 D2):
- `visit_request_id` (uuid NOT NULL, FK to `visit_requests.id`, ON DELETE CASCADE)
- `player_id` (uuid NOT NULL, FK to `profiles.user_id`, ON DELETE CASCADE)
- `created_at` (timestamptz, default now())
- Composite PK on (`visit_request_id`, `player_id`)

Anon RLS: INSERT only with `WITH CHECK (true)` — integrity via FK on `visit_request_id` (B1 binding pattern from DF-2). No SELECT/UPDATE/DELETE for anon. Player FK references `profiles(user_id)`, the canonical identity column used by the Sprint 011 recruit roster (`profiles.user_id` carries a UNIQUE constraint that makes it a valid FK target). The composite PK prevents duplicate player selections per visit; ON DELETE CASCADE on both FKs cleans join rows when a parent record is removed.

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
| New tables ship without proper RLS policies; public scheduler becomes data exfiltration vector | High | Anon role: INSERT only with column-bounded `WITH CHECK` (`coach_submissions`: `submitter_verified=false`, `source='scheduler'`; `visit_requests`: `status='pending'`). No SELECT policy for anon. FK-only binding between tables (DF-2 resolved 2026-05-01, see EXECUTION_PLAN) (verification_state shape per DF-7 resolved 2026-05-01). |
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
