# Execution Plan — Coach Message Generator

**Feature folder:** `docs/specs/.cmg-sprints/` (sprint docs, retros, execution plan)
**Prototype:** `prototypes/cmg/coach-message-generator.html` (visual ground truth, locked)
**Status:** Active. Prototype locked. Sprint 025 pending kickoff.
**Owner:** Chris Conroy (operator). Patch + Scribe execute Sprint 025.
**Last updated:** 2026-05-12

This document is the strategic ground truth for the CMG feature workstream. It carries the forward plan across multiple sprints from prototype-locked-state to Phase 2 production. Reframings during execution amend this document in place; retros are appended at sprint close.

---

## 1. Feature thesis

The Coach Message Generator solves a specific student-athlete pain point: *"What do I actually say to a college coach in this situation?"* The Coach Communication Generator template docx already answers the question for eleven common scenarios; the CMG turns that document into a dynamic form that pre-fills profile data, lets the student fill the rest, and produces a copy-paste-ready message in plain text.

The strategic case for building it now:

- **It exercises the Student View as a tool, not a dashboard.** Most of the existing Student View pages are read-only lenses (Profile, Grit Fit, Shortlist, Grit Guides). The CMG is the first page that produces an artifact the student takes with them off the platform. Adding action-producing pages is the next step in maturing the Student View from "view your data" to "do work here."
- **It compounds with the recruiting journey tracker.** Once Phase 2 coach contact data lands, the CMG becomes the canonical place to initiate outreach. Subsequent product features (auto-log a journey step when a message is constructed, auto-suggest the next scenario based on relationship state) become tractable.
- **It's a low-risk feature with high perceived value.** No money flows, no irreversible actions, no third-party API dependencies, no data integrity risks. Failure modes are bounded: a bad template wording is a one-line PR.

The strategic case for the Phase 1 / Phase 2 split:

- Coach contact data isn't yet in the database. Blocking the CMG on that scrape would delay the feature by months.
- The CMG has real value without coach data: profile auto-fill alone removes 80% of the friction in composing these messages.
- Phasing the build lets the team ship value now and lets Phase 2 be a focused, well-scoped follow-on rather than a multi-month dependency chain.

---

## 2. Forward sprint arc

The feature ships in two sprints.

### Sprint 025 — CMG Phase 1 + Sandwich Nav Refactor (this sprint)

**Status:** Pending kickoff. Prototype locked.
**Scope:** Two coordinated deliverables shipped in one session, sequenced as gated phases:
1. **Sandwich nav refactor.** Replace the horizontal Student View nav with a sandwich (hamburger) drawer across all five existing pages. Centralized in `src/components/Layout.jsx`; nav entries continue to be sourced from `src/lib/navLinks.js` (E1 per DATA_INVENTORY.md Section 7). Adds the sixth nav entry for the CMG page as part of this step.
2. **CMG page build.** Phase-by-phase form, eleven scenario templates, channel toggle, recipient tabs, copy-to-clipboard, email-to-self via `mailto:`, JSONB message log on `public.profiles.cmg_message_log`. Consumes the existing Student View design-token system; does not define new themes.

The CMG component build is gated on the sandwich refactor passing its smoke test (the existing five pages continue to render correctly through the drawer).

**Constraints:** Student-filled coach data (no coach DB yet — `public.college_coaches` is 0 rows per DATA_INVENTORY.md). `mailto:` only (no SMTP backend). CMG inherits per-school theme from the Student View shell wrapper via `data-school-theme`.

**Blockers:**
- `public.profiles` schema validation — first step of the sprint. Confirms the eight auto-fill column names (`name`, `grad_year`, `position`, `high_school`, `state`, `gpa`, `hudl_url`, `twitter`) against the live schema per DATA_INVENTORY.md Section 3.

**Decisions on record:**
- DEC-CFBRB-XXX: Prototype locked as canonical for Sprint 025
- DEC-CFBRB-XXX: 11-scenario taxonomy locked (10 coach-targeted + 1 public X post)
- DEC-CFBRB-XXX: JSONB message-log storage on `public.profiles.cmg_message_log` (deliberately not `public.coach_contacts`; see DESIGN_NOTES D3.9)
- DEC-CFBRB-XXX: Phase 1 / Phase 2 split (coach picker deferred until `public.college_coaches` is populated)
- DEC-CFBRB-XXX: Design-token consumption (CMG consumes `var(--brand-primary)` etc. via `data-school-theme`; does not hardcode palette or define new themes)
- DEC-CFBRB-XXX: Sandwich nav refactor folded into Sprint 025 (see DESIGN_NOTES D3.5)

### Sprint NNN — CMG Phase 2 (sprint number TBD)

**Status:** Blocked on `public.college_coaches` being populated.
**Scope:** Replace student-filled coach last-name and Twitter-handle fields with dropdown pickers backed by `public.college_coaches` (currently 0 rows, reserved for Phase 2 per DATA_INVENTORY.md Section 3). Add Recruiting Coordinator as a recipient option alongside Position Coach and Recruiting Area Coach. Update the recipient tab UI to surface RC.
**Constraints:** Depends on `public.college_coaches` carrying role tags (position coach by position group, recruiting area coach by region, recruiting coordinator, head coach, special teams coordinator). The promotion path from `public.school_link_staging` to `public.college_coaches` runs via `scripts/import_ready_to_production.py` per DATA_INVENTORY.md.
**Blockers:**
- `public.college_coaches` population workstream (tracked separately, no current timeline lock).
- Coach role taxonomy lock (which roles are required for the picker? which are optional?).

**Decisions on record:** (TBD when Phase 2 is scoped)

---

## 3. Decisions on record (Phase 1)

This section is the durable record of decisions made during prototype development. Cross-references to `DESIGN_NOTES.md` for full rationale.

| # | Decision | Reference |
|---|---|---|
| 1 | Scenario picker is a card gallery, 3 columns, public-post separated above coach-messages | D1.1, D1.2 |
| 2 | Email-to-self uses `mailto:`, no backend SMTP in Phase 1 | D1.3 |
| 3 | Message log is JSONB on `public.profiles.cmg_message_log`, flat array structure | D1.4, D3.8 |
| 4 | Twitter output treated uniformly as DM, no character counter | D1.5 |
| 5 | CMG consumes Student View design tokens via `data-school-theme`; no hardcoded palette | D1.6 |
| 6 | Recipient handling uses tabs, not stacked or side-by-side previews | D2.2 |
| 7 | No Response Sequence renders as three independent cards, not a wizard | D2.3 |
| 8 | Coach Twitter handles are visible placeholders in Phase 1; no form field for them | D2.4 |
| 9 | Phase 1 ships with student-filled coach data; Phase 2 unlocks DB-backed picker | D2.5 |
| 10 | Auto-filled fields are visually distinguished but remain editable | D2.6, D3.2 |
| 11 | Sandwich nav refactor folded into Sprint 025 (single sprint, gated phases) | D3.5 |
| 12 | School picker defaults to shortlist with "Other school" option | D3.6 |
| 13 | Recruiting Coordinator fallback shown as unconditional callout in preview | D3.7 |
| 14 | CMG log is distinct from `public.coach_contacts` (drafts ≠ contact records) | D3.9 |

---

## 4. Reframings on record

This section captures mid-execution discoveries that forced changes to the plan. Empty at sprint kickoff; populated during execution.

**Sprint 025:**

1. **Scenario 1 coach handles are college coaches, not HS coaches.** Build-time clarification confirmed the two @-handle fields are at the target college, not on the student's high-school staff. This forced Scenario 1's Phase 2 to be student-entered `camp_name` plus two college coach handle fields, distinct from every other scenario's event-context Phase 2. Resolved in commit `039818c`.

2. **Phase 2 field set must self-derive from `scenario.required_form_fields`.** Phase 6A surfaced that a hardcoded `EVENT_FIELDS` list was incompatible with Scenario 1's shape. Refactored to a `PHASE_2_FIELDS` union derived per-scenario from the data module. Resolved in commit `039818c`.

3. **Docx Closing Questions defaults pre-empted student input.** The docx scenario bodies included default Closing Questions prompt sentences that conflicted with Phase 5's student-authored questions. The defaults had to be stripped from the substituted body to let the student's questions land. Caught in Hotfix Round 2 (`877b64c`).

4. **Twitter handle column stores bare handles, not URLs.** The `public.profiles.twitter` column stores `username`, not `https://x.com/username`. Required a normalizer (`src/lib/cmg/twitter.js`) to render the full URL in every surface (preview body, mailto body, Scenario 1 public post). Caught in Hotfix Round 3 (`8d20ab9`).

---

## 5. Carry-forward register

Items surfaced during prototype development that don't fit Sprint 025 scope but need to be tracked.

**Shipped in Sprint 025 (closed):**

| Item | Resolution |
|---|---|
| Toast notification primitive | Shipped inline in Phase 4 at `src/components/Toast.jsx` |
| Sandwich nav refactor | Shipped as Phase 3 (`6cf1ab7`) |
| JSONB message log + append RPC | Migration `0047` applied to live; column + RPC verified |

**Deferred (still carry-forward):**

| Item | Category | Target |
|---|---|---|
| Phase 2 coach contact picker (blocked on `public.college_coaches` population) | Feature | Phase 2 sprint |
| "Emailed to Self" badge column on the history table (data recorded but not surfaced) | Polish | v2 |
| Mobile-specific layout polish beyond responsive collapse | Polish | v2, contingent on mobile usage share |
| Inline editing of past messages in history table | Feature | v2 or v3 |
| Bulk message generation across multiple shortlisted schools | Feature | v2+ (needs UX safeguards) |
| Localization / Spanish templates | Feature | Separate workstream, not yet scoped |
| `short_list_items.unitid → schools.unitid` FK migration | Schema | Surfaced as root cause of Sprint 025 Hotfix Round 1 (`dd0522f`); requires migration + `ON DELETE` decision; right sprint TBD |
| Backend SMTP email-to-self path | Feature | v2 or later, contingent on usage data |
| Auto-add "Other school" to shortlist | Feature | v2 |
| Twitter character counter for Scenario 1 | Feature | Only if real usage shows trimming |
| Coach role taxonomy lock for Phase 2 picker | Schema | Phase 2 prerequisite |
| Partner-school theme coverage audit | Design tokens | Add to new-school onboarding checklist |
| `public.coach_contacts` consumer (the relationship-state ledger) | Product | Separate product decision, not CMG scope |

**New from Sprint 025:**

| Item | Category | Target |
|---|---|---|
| Live Playwright auth-gated test execution (suite at `tests/cmg.spec.js` is structurally valid but un-runnable without `TEST_STUDENT_EMAIL` credentials) | Infra | Operator post-deploy verification step in an authenticated environment |

---

## 6. Open questions

These are questions that don't block Sprint 025 kickoff but need answers at some point.

- **When does `public.college_coaches` get populated?** Phase 2 sprint timing depends on this. The promotion path runs via `scripts/import_ready_to_production.py` per DATA_INVENTORY.md; current row count is 0.
- **What's the right cadence for template wording iteration?** Coaches may give feedback that the templated messages read templated. The templates are a data module; updating is a one-line PR — but who owns the feedback loop?
- **How do we surface Phase 1 to students?** The "we don't have coach contact data yet" framing needs careful messaging. Default approach: a small banner in the prototype already references `public.college_coaches` and the Phase 2 unlock. May need product copywriting polish before launch.
- **Does the CMG log inform any other feature?** It's currently fire-and-forget; `public.short_list_items.recruiting_journey_steps` remains the source of truth for relationship state. If a future product surface needs to derive insights from `cmg_message_log`, the derivation lives in that surface — but we should know what those surfaces might be before they need it.
- **Does `public.coach_contacts` eventually get a CMG-aware consumer?** Today the table is 0 rows and unwired. If a future product surface wants to log "the student actually sent this message" (as opposed to "the student drafted it"), that surface might write `coach_contacts` rows when the student confirms send. Out of scope for Sprint 025; flagged for future product thinking.

---

## 7. Reference artifacts

- `coach-message-generator.html` — visual ground truth, locked
- `README.md` — sprint orientation
- `DESIGN_NOTES.md` — locked decisions and rationale
- `SPEC_FOR_CODE.md` — build-time spec
- `SPRINT_025_SESSION_SPEC.md` — Sprint 025 session spec
- Coach Communication Generator template docx — original wording source, archived to this folder at sprint kickoff
- **DATA_INVENTORY.md** — canonical schema map; required reading for Patch before Step 1 schema validation
- Sprint Mode Primer — `_org/primers/sprint-mode-primer.md`

---

## 8. Revision history

| Date | Note |
|---|---|
| 2026-05-12 | Initial draft. Prototype locked. Sprint 025 not yet kicked off. |
| 2026-05-12 | Revision pass against operator notes: (a) refactored CMG to consume Student View design tokens via `data-school-theme` (D1.6 added); (b) corrected schema references throughout to match DATA_INVENTORY.md (`public.profiles` not `student_profile`; `name` not `full_name`; `gpa` not `cgpa`; `twitter` not `twitter_url`; `high_school` not `hs_name`); (c) added D3.9 explicitly distinguishing the CMG log from `public.coach_contacts`; (d) added Decision 5 (design tokens) and Decision 14 (coach_contacts non-collision) to the on-record table. |
| 2026-05-12 | Scope revision: sandwich nav refactor folded into Sprint 025 rather than decoupled as a separate prep sprint. D3.5 rewritten (rationale reversed); EXECUTION_PLAN forward arc collapsed from three sprints to two; sandwich refactor removed from carry-forward register; all "Sprint 024 = sandwich nav" references removed (Sprint 024 has already shipped other work in `gritty-recruit-hub-rebuild`). Sandwich refactor now appears as Phase 3 in the Sprint 025 session spec, gating the CMG component build. |
| 2026-05-12 | Sprint 025 CLOSED. CMG Phase 1 + Sandwich Nav Refactor shipped. See SPRINT_025_RETRO.md for full close report. Final commit: 1a0c9c9. 883 unit tests passing. |
