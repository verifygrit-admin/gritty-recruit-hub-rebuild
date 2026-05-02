---
sprint_id: Sprint013
sprint_name: ICS Multi-Recipient Calendar Invite + Email Delivery
asset: Gritty OS Web App - Public Surface + Email Infrastructure
version: MVP
priority: Important, Urgent
effort: High
mode: sprint-mode
skill_invoked: /coach-me
date_start: 2026-05-02
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: not_started
sprint_012_close_state:
  master_head: 413a680
  sprint_close_commit: 640f3ed
  sprint_squash_merge: debd2ed
  hotfix_squash_merge: 413a680
  production_url: https://app.grittyfb.com/athletes
phase_0_progress:
  d0_erd_reconciliation:
    status: complete
    commit: a951ec9
    closed: 2026-05-02
  d11_test_fixture_seeding:
    status: complete
    closed: 2026-05-02
    note: Fixtures 1+2 seeded (test student + test head coach); Fixture 3 (test college coach) documented for Phase 4 form-submit verification
  d12_test_inbox_provisioning:
    status: complete
    closed: 2026-05-02
    note: plus-addressing on chris@grittyfb.com verified working
  oq1_email_provider:
    status: complete
    closed: 2026-05-02
    note: Resend domain noreply.grittyfb.com verified (DKIM, SPF, DMARC all green)
  oq2_sender_identity:
    status: locked
    closed: 2026-05-02
    value: scheduler@noreply.grittyfb.com with reply-to dynamic to head coach
  oq3_player_consent:
    status: resolved
    note: signed contact waiver established 2026-05-02
  oq4_head_coach_routing:
    status: resolved
    closed_by: d0
    closed: 2026-05-02
  oq5_function_provider:
    status: locked
    closed: 2026-05-02
    locks:
      runtime: nodejs22.x (function-level pin)
      env_var_naming: non-prefixed (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_ADDRESS)
      mixed_runtime_accepted: true (api/recruits-auth.ts remains Edge; api/coach-scheduler-dispatch.ts will be Node)
  oq6_function_trigger:
    status: locked
    closed: 2026-05-02
    value: client-invoked synchronous (per spec recommendation)
  oq7_ics_format_edge_cases:
    status: deferred_to_phase_1_close
    note: cross-client testing requires D1/D5/D6 ship first; runs against D11/D12 fixture inboxes after Phase 1 build completes
  oq8_time_window_conversion:
    status: locked
    closed: 2026-05-02
    value: full-window mapping per spec table; partner_high_schools.timezone check folds into D1 prep
phase_0_complete: 2026-05-02
phase_1_carry_forward:
  head_coach_display_name:
    decision: backfill Paul Zukauskas raw_user_meta_data.display_name via one-time UPDATE during Phase 1
    fallback: D1 reads display_name with email-local-part fallback
    rationale: smallest path to correct ICS ORGANIZER CN; no Phase 1 migration count expansion
master_head_at_phase_0_open: 413a680
master_head_after_d0: a951ec9
master_head_after_phase_0_close: a951ec9 (D11 was data-only, no commit)
phase_1_progress:
  d7_visit_request_deliveries:
    status: complete
    commit: c6330ce
    closed: 2026-05-02
    note: includes ride-along ALTER for partner_high_schools.timezone (OQ8 prep) + Paul Zukauskas display_name backfill (D1 carry-forward)
  d1_dispatch_function:
    status: complete
    commits: [2a29159, 8671a82]
    closed: 2026-05-02
    note: 8671a82 corrects OQ5 runtime config syntax error (nodejs22.x → nodejs); spec lock language updated in retro section
  d9_oq6_submit_handler_wiring:
    status: complete
    commit: 6650d58
    closed: 2026-05-02
    note: deliverable id corrected — work is D9 + OQ6 (D10 mobile constraint applied), not D10
  d10_mobile_constraint:
    status: applied
    commit: 6650d58
    closed: 2026-05-02
    note: no CSS change required; existing .scheduler-success-panel @media (max-width 768px) handles new copy structurally
phase_4_progress:
  verification:
    status: complete
    closed: 2026-05-02
    result: 3 emails delivered end-to-end to chris@grittyfb.com via routing pivot
    notes: |
      Three blockers surfaced and resolved during verification:
      1. Vercel Deployment Protection (Standard) gated /api/* on Preview, blocking client fetch.
         Resolved by toggling Vercel Authentication off for verification window; re-enabled after Phase 4.
      2. D11 fixture head coach missing auth.identities row (D11 raw-SQL pattern skipped this).
         Resolved with mirror INSERT for both fixture users (head coach + student).
      3. D11 fixture auth.users had NULL token columns (confirmation_token, recovery_token,
         email_change_token_new, email_change) where GoTrue requires empty string. Resolved by
         pivoting verification path away from fixture entirely — chris@grittyfb.com (real auth user)
         temporarily inserted as BC High head coach for verification, then removed post-verification.
      ICS attachment present and parseable. Gmail web "Add to Calendar" has rendering issues
      (floating local time interpretation) — deferred to OQ7 cross-client follow-up.
oq7_status: deferred_to_follow_up
master_head_after_phase_1_close: TBD on squash merge to master
---

# Sprint 013 Session Spec — ICS Multi-Recipient Calendar Invite + Email Delivery

> **Status: not_started. Phase 0 COMPLETE 2026-05-02.** Sprint 013 became the active sprint 2026-05-02. Phase 0 closed in single coaching session: D0 (ERD Reconciliation) shipped at master `a951ec9`; D11 (Test Fixture Seeding) seeded two production fixtures (test student + test head coach) with third documented for Phase 4; D12 (plus-addressing on `chris@grittyfb.com`) verified; OQ1/OQ2/OQ5/OQ6/OQ8 locked; OQ3 resolved by waiver; OQ4 resolved by D0; OQ7 deferred to Phase 1 close. **Next move: cut `sprint-013-coach-scheduler` branch from master, Phase 1 (build) opens.** Inheritance from Sprint 012, Hard Constraints, and remaining D-deliverable specs (D1, D3–D10) hold as written.

---

## Sprint Objective

Add server-side ICS calendar invite generation and transactional email distribution to the existing coach drop-in scheduler. When a coach submits the four-card scheduler form on `/athletes`, a server-side function reads the intake-log rows that Sprint 012's submit handler wrote, generates a single `.ics` file with all attendees visible, and emails it to the college coach, the high school's head coach, and the selected players (subject to the player consent gate — see Hard Constraints).

Sprint 012 already shipped the full client-side submit path that writes intake rows to `coach_submissions`, `visit_requests`, and `visit_request_players`. Sprint 013 builds the email-send layer on top of that intake-log foundation.

This sprint introduces:
- A server-side function (Vercel function or Supabase Edge Function — provider decision in scope) that reads intake rows and dispatches calendar invites
- A new `visit_request_deliveries` table tracking per-recipient send status
- A transactional email integration (Resend recommended)
- Server-generated ICS file conforming to RFC 5545 with full attendee visibility

This sprint does NOT integrate with Google Calendar API (decision recorded in EXECUTION_PLAN). ICS file generation only.

---

## Inheritance from Sprint 012

Sprint 012 substantially reduced Sprint 013's scope:

| Sprint 012 outcome | Sprint 013 implication |
|---|---|
| `visit_request_players` shipped via 0040 migration with composite PK on (`visit_request_id`, `player_id`), FK cascade to `visit_requests` and `profiles(user_id)` | Sprint 013 D2 reduced to historical pointer. Player selection persistence already works. |
| `coach_submissions` and `visit_requests` are append-only intake-log tables (DF-3, DF-5, DF-7 reframed; intake-log architecture documented in EXECUTION_PLAN v5.8) | Sprint 013's email-send work reads intake rows. No mutation of intake tables. Server function uses service-role, not anon. |
| Inline scheduler section on `/athletes` (not a modal) ships the four-card flow including player picker | Sprint 013 inherits a working four-card flow. No client-side UI build required for the scheduler itself. |
| Submit handler uses plain `.insert()` per intake row, no `.upsert()`, no `.select()` chains (DF-5 reframed) | Sprint 013's server function follows the same pattern when writing to `visit_request_deliveries` (anon-write surfaces use plain inserts). |
| BC High seed in `partner_high_schools` includes `meeting_location` populated | Sprint 013 D4 reduced to confirmation note. |
| DF-5's "Sprint 013 reopener for server-side route" is now optional architecturally (intake-log eliminates the upsert problem) but remains required functionally for sender credentials | Sprint 013's server function exists to send email with credentials, not to fix an architectural problem. |

Sprint 012 final state at master `413a680`. Production at `https://app.grittyfb.com/athletes` is live with the scheduler.

---

## Hard Constraints

1. **No Google Calendar API integration.** Server-generated `.ics` only.

2. **Single .ics, full attendee visibility.** All attendees on one invite, all visible to each other (per Decision H in EXECUTION_PLAN).

3. **Per-recipient delivery status logged.** If email send fails for one recipient, others still succeed and the failure is recorded in `visit_request_deliveries`, not silently dropped.

4. **No Sprint 012 functionality breaks.** The inline scheduler section on `/athletes` continues to work end-to-end. The submit path continues to produce intake-log rows. Sprint 013's email send is a downstream consumer of intake rows; it does not modify the submit path's behavior.

5. **Mobile-friendly confirmation copy.** The post-submit confirmation panel is updated to reference the calendar invite. No new mobile UI surface — the scheduler section's mobile rendering ships unchanged.

6. **Player consent verified before player emails go out.** Pre-sprint gate, not a sprint task. See Open Questions below. Without consent established, scope reduces to college-coach + head-coach delivery only.

7. **Server-side function uses service-role.** The function reads intake rows by id, generates ICS, sends email, writes delivery rows. Service-role bypasses RLS; the function is the only legitimate writer to `visit_request_deliveries` outside of the function itself. Anon never touches `visit_request_deliveries`.

8. **Function trigger pattern is a sprint decision.** Two candidate patterns: (a) client invokes the function after submit succeeds, passing the `visit_request_id`; (b) database trigger or scheduled job picks up new intake rows. Decide in Open Questions.

---

## Asset Infrastructure

**Skills available:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions.

**New external dependency:** transactional email provider (Resend recommended).

**Existing CLI/MCP available:** `vercel`, `supabase`, `gh`, Supabase MCP, Context7 MCP, Claude in Chrome MCP.

**Operating mantra:** "All thoughts are operations." Strategy work, governance work, and tactical execution stay in sprint-mode register for the duration of the sprint. Mode declarations are not used. The execution plan is the strategic ground truth; retros capture mid-sprint reframings. See Sprint Mode Primer v0.2 Section 9.5 for the canonical operating pattern.

---

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| EXECUTION_PLAN | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` (v5.10+) | Strategic ground truth. Decisions on Record (Decision H ICS attendee visibility, Decision K extended with intake-log vocabulary, Decision J canonical-layer verification). Resolved Decisions from Sprint 012 (DF-1 through DF-7, no open items). "Coach Identity Architecture (intake log + canonical)" section. |
| ERD docs (current pair, pre-D0 reconciliation) | `docs/superpowers/specs/erd-current-state.md`, `erd-after-state.md`, `erd-flags.md` | Pre-Sprint-010 schema documentation, last updated 2026-03-31. **Stale** as of master `413a680` — does not reflect migrations 0033–0041, including Sprint 012's four production tables. Reconciled and replaced by D0 in Phase 0a/0b. |
| ERD canonical (post-D0) | `docs/specs/erd/erd-current-state.md` *(recommended path; operator confirms before Phase 0a fires)* | Single source-of-truth schema document produced by D0. Updated with every future migration per the update discipline established in its header. |
| Sprint 012 Phase 0 audit | `docs/specs/.coach-scheduler-sprints/sprint-012-phase-0-audit.md` | Schema audit Section A. Note: D3's reference to `users.head_coach` is incorrect — the head coach designation lives on the HS coaches table (boolean column on that table, not on `users`). D0 surfaces the actual table name and column shape. |
| Sprint 012 Phase 1 retro | `docs/specs/.coach-scheduler-sprints/sprint-012-phase-1-retro.md` | `.insert().select()` finding for anon writes — informs Sprint 013's server-side pattern (service-role bypasses this entirely). |
| Sprint 012 Phase 2+3 retro + close addendum | `docs/specs/.coach-scheduler-sprints/sprint-012-phase-2-3-retro.md` | Intake-log reframe origin and reasoning (Section 3c); honeypot defense-in-depth pattern (Section 3f); canonical operating pattern discovery (Section 7b). |
| Prototype HTML | `docs/specs/.coach-scheduler-sprints/index.html` | Storyboard reference. Sprint 013 doesn't add client UI beyond confirmation copy update. |
| Sprint Mode Primer v0.2 | `_org/primers/sprint-mode-primer.md` (separate repo) | Canonical operating pattern (Section 9.5), feature-folder-as-unit-of-development, four-mode taxonomy applicability. |

---

## Deliverables

### D0 — ERD Reconciliation (Phase 0 foundational deliverable)

> **CLOSED 2026-05-02 at master `a951ec9`.** Phase 0a (read + spot-check + write v2) and Phase 0b (corrections + rename + delete + commit) completed in single session. Canonical ERD lives at `docs/specs/erd/erd-current-state.md` (1,083 lines) with update discipline in header. Old ERD trio at `docs/superpowers/specs/` deleted in same commit. Flag register reconciled with full preservation: F-09/F-10/F-11/F-15/F-17 closed by shipped migrations, F-19/F-20/F-21/F-22 newly surfaced, six restorations applied during preservation-fidelity review (F-01/F-04/F-09/F-14/F-15/F-16). OQ4 resolved as side effect: HS coaches table is `hs_coach_schools`, head_coach column is `is_head_coach`, BC High has 1 head_coach=true row (Paul Zukauskas, pzukauskas@bchigh.edu, hs_program_id `de54b9af-c03c-46b8-a312-b87585a06328`). Migration 0042 confirmed available for D7. Architectural Carry-Forward #8 (ERD update discipline) operationalized — every future migration touching schema updates the canonical ERD doc in the same commit as the migration file.

**Original deliverable specification preserved below for sprint history.**

---

**Status:** Phase 0a + 0b. Runs before any other Phase 0 OQ resolution and before D1–D10 build phases open. Produces canonical schema documentation that downstream deliverables depend on.

**Problem statement.** The existing ERD documentation lives in three files at `docs/superpowers/specs/`: `erd-current-state.md`, `erd-after-state.md`, `erd-flags.md`. All three were last updated 2026-03-31 (pre-Sprint-010) and predate every coach-scheduler migration (0033–0041). The "current state" / "after state" pair was a useful pattern when designing migrations 0028–0032; it is no longer useful because (a) those migrations have shipped, (b) eight subsequent migrations have shipped without ERD updates, and (c) Sprint 012's intake-log architecture introduced a two-layer data model (intake log + canonical) that the existing ERD has no vocabulary for.

EXECUTION_PLAN v5.9's "Coach Identity Architecture (intake log + canonical)" section is currently the closest thing the project has to a canonical schema document. That is the wrong location — EXECUTION_PLAN is sprint strategy, not schema reference.

**Deliverable.** A single canonical ERD document (`docs/specs/erd/erd-current-state.md`, recommended path; operator confirms before Phase 0a fires) reflecting actual production schema as of master `413a680`. The document includes:

- Full table inventory with columns, types, constraints, FKs, and RLS posture
- Mermaid full-schema diagram regenerated from current state
- Two-layer architecture section (intake log layer: `coach_submissions`, `visit_requests`, `visit_request_players`; canonical layer: `college_coaches`, `partner_high_schools`, `profiles`, `users`, etc.) with cross-reference to EXECUTION_PLAN Decision K
- Update discipline clause in document header: subsequent migrations update this ERD in the same commit as the migration file
- Flag register reconciled from current state (close all flags resolved by shipped migrations; preserve open flags; add new flags surfaced during reconciliation)

**Two-commit pattern (master, no sprint branch — documentation update under canonical operating pattern allowance).**

**Phase 0a — Read, diff, write v2 (additive, no deletes).**

1. Read all migration files in `supabase/migrations/` chronologically (0001 through latest). Migrations are canonical for this project per Phase 1 retro (no local Supabase instance; production-only apply path).
2. Spot-check live Supabase state for high-stakes tables: Sprint 012's four tables (`partner_high_schools`, `coach_submissions`, `visit_requests`, `visit_request_players`), the HS coaches table (column name and shape currently unverified — see OQ4), any unitid-bearing table relevant to F-16 currency. Use Supabase MCP or service-role query.
3. Read existing ERD docs at `docs/superpowers/specs/`: `erd-current-state.md`, `erd-after-state.md`, `erd-flags.md`.
4. Produce new file at recommended path `docs/specs/erd/erd-current-state-v2.md` reflecting current production state. Old files untouched.
5. Surface diffs in commit message: which tables are new, which columns changed, which flags closed, which flags newly opened.
6. Operator reviews v2.

**Phase 0b — Rename, delete, finalize (after operator review).**

1. Rename `erd-current-state-v2.md` → `erd-current-state.md` at the recommended path.
2. Delete `docs/superpowers/specs/erd-current-state.md`.
3. Delete `docs/superpowers/specs/erd-after-state.md`.
4. Update `docs/superpowers/specs/erd-flags.md` to reflect closed/open flag state as of new ground truth — or migrate it into the new ERD doc as an integrated flag register section. Operator decides during review of v2.
5. Single commit on master.

**Side effects (informational — these are not D0's deliverables but they fall out as byproducts).**

- **OQ4 closes implicitly.** The HS coaches table shape is verified during Phase 0a's high-stakes spot-check. D3 reframes from "verify `users.head_coach`" to "verify `<actual_table>.<actual_column>`" once the table is named.
- **Migration 0042 numbering confirmed.** The chronological migration read confirms whether 0042 is taken or available for `visit_request_deliveries` (D7).
- **D3 wording correction.** Spec D3 currently says "Verify the `users` table has a `head_coach` boolean column scoped by `school_id`." This is incorrect — head coach designation lives on the HS coaches table per operator clarification 2026-05-02. D3 will be reframed during Phase 0 close to point at the actual table.

**Acceptance for D0:**
- New ERD doc exists at the operator-confirmed path
- Document reflects current schema verifiable against migration files and live Supabase
- Update discipline clause in header is unambiguous and actionable
- Old ERD docs deleted; flag register reconciled
- Two commits on master, both well-described
- Closes OQ4 (with reframed D3)

---

### D1 — Server-Side Function: Read intake row, dispatch invite

> **Phase 1 carry-forward locked 2026-05-02 (D11 surfaced):** Head coach display name source for ICS ORGANIZER CN. Live state: neither real coach Paul (`raw_user_meta_data = {"email_verified":true}`) nor `public.users` carries a queryable display name; only the D11 fixture has `raw_user_meta_data.display_name`. **Decision: Path (a) — backfill Paul Zukauskas's `raw_user_meta_data.display_name` via one-time UPDATE during Phase 1 prompt construction, alongside the D7 migration commit.** D1 reads `display_name` with email-local-part fallback. Cheapest path to correct ICS output; no Phase 1 migration count expansion.
>
> **Phase 1 carry-forward locked 2026-05-02 (OQ5):** Runtime `nodejs22.x` pinned at function level. Env vars non-prefixed: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`. Mixed-runtime project accepted (existing `api/recruits-auth.ts` remains Edge; `api/coach-scheduler-dispatch.ts` will be Node).

Create a server-side function (Vercel function at `api/coach-scheduler-dispatch.ts` recommended; Supabase Edge Function as alternative — provider decision finalizes in Open Questions).

Function signature:
```
POST /api/coach-scheduler-dispatch
Body: { visit_request_id: string }
Response: { delivered_count: number, failed_count: number, errors: [{ recipient, error_code, message }] }
```

Function reads:
- `visit_requests` row by id (joined with `coach_submissions` for college coach contact info, joined with `partner_high_schools` for school name + meeting_location)
- `visit_request_players` rows for the visit (joined with `profiles` for player name + email)
- HS coaches table row(s) where the head_coach boolean is true AND the school FK matches the visit's school — exact table name, column name, and FK shape confirmed by D0. Likely `hs_coach_schools` (per Sprint 011 baseline) with `is_head_coach=true AND hs_program_id=<visit's hs_program_id>`. Routing rule applies if multiple rows match (D3).

Function uses service-role key (not anon). RLS bypassed by design.

### D2 — `visit_request_players` Join Table

**Closed by Sprint 012 Phase 3 (commit 2bd90a1, 2026-05-01).** The `visit_request_players` join table was originally scheduled for Sprint 013 but was pulled forward to Sprint 012 because the Phase 2 modal ships with a fully functional player picker. The `0040_visit_request_players.sql` migration in Sprint 012 introduced this table with composite PK on (`visit_request_id`, `player_id`), FK on `visit_request_id` REFERENCES `visit_requests(id)` ON DELETE CASCADE, FK on `player_id` REFERENCES `profiles(user_id)` ON DELETE CASCADE. Anon RLS: INSERT only with `WITH CHECK (true)`, integrity via FK on `visit_request_id`. Sprint 013's scope reduces accordingly — D2 closes here. D3–D10 unaffected.

### D3 — HS Coaches Table: Head Coach Identification (VERIFIED 2026-05-02 by D0)

> **VERIFIED 2026-05-02 at master `a951ec9`.** D0 spot-check confirmed: HS coaches table is `hs_coach_schools` (matches Sprint 011 baseline). Head_coach column is `is_head_coach` (boolean NOT NULL DEFAULT false). School FK shape is `hs_program_id uuid → hs_programs(id) ON DELETE CASCADE`. No UNIQUE constraint on `is_head_coach` — only UNIQUE is on `(coach_user_id, hs_program_id)`. Multi-school architecture verified: design supports many head_coach=true rows across many different `hs_program_id` values; current production data contains BC High only because it is the only onboarded school. BC High `hs_program_id` is `de54b9af-c03c-46b8-a312-b87585a06328`; one head_coach=true row: Paul Zukauskas, `pzukauskas@bchigh.edu`, linked 2026-03-26.

D3 originally scoped a verification-or-migration choice. D0's verification confirmed the column exists and is populated for BC High; no migration needed. Sprint 013 reads `hs_coach_schools` in D1's dispatch function with the join logic specified below. The original D3 specification is preserved for sprint history.

> **Reframed 2026-05-02.** The prior version of D3 referenced `users.head_coach` based on the Sprint 012 Phase 0 audit's topology-diagram inference. Operator clarified during Phase 0 sequencing that head coach designation lives on the HS coaches table, not on `users` — a coach user's `is_head_coach` (or equivalent) status is tracked on the coaching-staff junction table, allowing per-row turnover without reshaping user types. D0's Phase 0a high-stakes spot-check verified the actual table name and column shape; D3 finalizes once D0 closes.

Verify the HS coaches table (exact name to be confirmed by D0 — likely `hs_coach_schools` or similar per Sprint 011 carry-forward conventions) has a head-coach boolean column scoped by school. D0 surfaces:

- The actual table name
- The actual column name (`is_head_coach`, `head_coach`, or other)
- The shape of the school FK (likely `hs_program_id` per Sprint 011 baseline, or `school_id` if normalized differently)
- Current row state for BC High: how many rows are flagged head_coach today

Two outcomes from D0:

(a) **Column exists and is populated for BC High** — D3 reduces to a verification note. Sprint 013 reads this column in the dispatch function (D1) to identify the head coach recipient.

(b) **Column does not exist or is not populated** — Sprint 013 ships a `0042` migration adding/seeding the column. Migration numbering may shift to `0043` if D7's `visit_request_deliveries` claims `0042` first; D0's chronological migration read settles the available number.

**Routing rule for multiple head_coach rows.** Operator confirmed 2026-05-02 that the head_coach boolean is **not unique-constrained** — multiple rows can flag head_coach simultaneously. This is intentional: it allows test fixtures (D11) to coexist with the real head coach during Phase 4 verification without schema gymnastics. The dispatch function (D1) must therefore implement an explicit routing rule:

- Default: primary by `created_at ASC` (oldest row wins, treating the real head coach as the long-standing record)
- Alternative: add an `is_primary_head_coach` flag (column add to existing migration if D0 reveals one is needed)
- Test-fixture exclusion: dispatch function may filter by a fixture-tagging convention (e.g., email matching `chris+sprint013-*@grittyfb.com` per D11/D12, or a `is_test_fixture` boolean if added later)

Routing rule finalized after D0 surfaces actual schema.

### D4 — `partner_high_schools.meeting_location` Confirmation

**Confirmed populated for BC High** during Sprint 012 Phase 1 apply. Sprint 013 verification: query `partner_high_schools.meeting_location` for the row referenced by `visit_requests.school_id`; if NULL for any school, fall back to `partner_high_schools.address`. This deliverable is one query against production schema, not a build operation.

### D5 — Server-Side ICS Generation

The function from D1 generates a single `.ics` file conforming to RFC 5545:

- `ORGANIZER`: high school head coach's email (CN: head coach's full name)
- `ATTENDEE` entries (all visible, one per attendee):
  - College coach (CN: name from `coach_submissions`, ROLE: `REQ-PARTICIPANT`)
  - Each selected player (CN: name from `profiles`, ROLE: `REQ-PARTICIPANT`)
  - Head coach as both organizer and attendee (some clients require this for their own calendar to render the invite correctly)
- `SUMMARY`: `[College Program] visit at [School Name]`
- `LOCATION`: school's `meeting_location` (or `address` fallback per D4)
- `DTSTART` / `DTEND`: derived from `requested_date` + `time_window` mapping (full window per Open Questions)
- `DESCRIPTION`: `notes` from coach submission, plus auto-generated meta:
  ```
  Players present: [comma-separated list of selected player names]
  Submitted via: GrittyFB Coach Scheduler at app.grittyfb.com/athletes
  ```
- `UID`: deterministic — `<visit_request_id>@grittyfb.com` (allows future updates/cancellations to reference the same calendar event)
- `DTSTAMP`: function execution time
- `STATUS`: `CONFIRMED`

Use a known-good ICS library (e.g., `ics` npm package), not hand-rolled string concatenation.

### D6 — Transactional Email Send

The function from D1 sends email via Resend (recommended) or alternative provider chosen in Open Questions:

1. Generate ICS per D5
2. For each recipient, send email with:
   - `To`: recipient email
   - `From`: sender identity per Open Questions decision (`scheduler@grittyfb.com` or head coach with reply-to)
   - `Subject`: `Calendar invite: [College Program] visit on [Date]`
   - Plain-text body summarizing the meeting (date, time window, location, attendees)
   - Attachment: the `.ics` file with `Content-Type: text/calendar; method=REQUEST` so calendar clients auto-parse and offer "Add to calendar"
3. Capture per-send response (provider message id, delivery status, error if any) for D7

### D7 — Per-Recipient Delivery Tracking

> **Migration numbering confirmed 2026-05-02 by D0.** D7 ships as `supabase/migrations/0042_visit_request_deliveries.sql`. The "0042 or 0043" hedge in earlier drafts is closed.

New `visit_request_deliveries` table introduced via `0042_visit_request_deliveries.sql`:

```sql
CREATE TABLE visit_request_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_request_id uuid NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_role text NOT NULL CHECK (recipient_role IN ('college_coach', 'head_coach', 'player')),
  recipient_name text,
  send_status text NOT NULL CHECK (send_status IN ('sent', 'failed', 'bounced', 'pending')),
  provider_message_id text,
  error_code text,
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

ALTER TABLE visit_request_deliveries ENABLE ROW LEVEL SECURITY;
-- No anon policies. Service role only (writes happen via the dispatch function).
```

The function from D1 inserts one row per recipient after each send attempt. Sprint 014 (Coach Dashboard tab — future sprint) reads this table to surface delivery problems.

### D8 — Failure Path: Save Records Even If Email Fails

Per Hard Constraint 3:
- The intake-log rows (`coach_submissions`, `visit_requests`, `visit_request_players`) are already saved by Sprint 012's client-side submit before D1's function fires
- For each recipient, if email send fails: insert `visit_request_deliveries` row with `send_status='failed'` and capture `error_code` + `error_message`
- The function returns aggregate counts (`delivered_count`, `failed_count`) plus individual error array
- Client receives the response and surfaces partial-success: "Invite sent to [N of M] recipients. We'll follow up with the remaining recipients shortly."

If the entire dispatch function fails (network, provider outage, function crash), the intake rows are still in place. A retry mechanism (admin-triggered or scheduled re-dispatch) is deferred to a later sprint — Sprint 013 ships the per-recipient failure handling but not the bulk-retry flow.

### D9 — Confirmation Screen Update

Sprint 012's confirmation panel currently reads: "Thanks, [name]! Your drop-in request has been received. The [school] coaching staff will follow up at [email] to confirm the date and time."

Sprint 013 updates the copy after Sprint 012's submit succeeds and the dispatch function returns. New copy options:

- **Full success** (all recipients delivered): "Thanks, [name]! Your drop-in request has been sent to [N] recipients. Check your email for the calendar invite."
- **Partial success** (some failures): "Thanks, [name]! Your drop-in request has been received and sent to [N of M] recipients. We'll follow up with the remaining recipients shortly."
- **Dispatch function unavailable** (network/timeout): Sprint 012's existing confirmation copy still applies; the visit was logged. A backend retry will pick it up. (Requires Sprint 013 D8's retry mechanism if implemented; otherwise the operator manually triggers from the Coach Dashboard in Sprint 014.)

### D10 — Scheduler Section Mobile Compatibility

Hard Constraint 5: no new mobile UI surface. The scheduler section's mobile rendering from Sprint 012 ships unchanged in Sprint 013. The confirmation copy update from D9 must render correctly on mobile breakpoints (existing `@media (max-width: 768px)` rule from Sprint 012).

### D11 — Test Fixture Seeding (Phase 0 close artifact, not production code)

> **CLOSED 2026-05-02.** Two fixtures seeded in production via direct SQL INSERT (Option A — fixtures are FK targets only, no login). **Fixture 1 (test student):** auth.users `2328961a-0e5a-4f3a-a3a1-97bfbddd6c80`, profile "Test Athlete (Sprint 013 Fixture)" at `chris+sprint013-student@grittyfb.com`, BC High roster (high_school string match + hs_coach_students link to Paul Zukauskas), grad_year 2027, position WR. **Fixture 2 (test head coach):** auth.users `9169818d-744f-411f-bf11-4bc13e13d0cb`, name "Test Head Coach (Sprint 013 Fixture)" at `chris+sprint013-headcoach@grittyfb.com`, hs_coach_schools row id 4 with is_head_coach=true at BC High `hs_program_id de54b9af-c03c-46b8-a312-b87585a06328`. **Routing rule verified live:** Paul (linked 2026-03-26) wins by `created_at ASC` over fixture (linked 2026-05-02); F-21 design intent confirmed. **Triple-tagging applied:** plus-aliased emails + name suffix + `raw_user_meta_data.fixture: "sprint-013"` marker. **Fixture 3 (test college coach):** documented payload only — no D11 insert; operator submits via `/athletes` form during Phase 4 verification, which produces three intake-log rows via the existing anon submit path. D11 is data-only; no commit, no ERD update required.

**Original deliverable specification preserved below for sprint history.**

---

**Status:** Phase 0 close artifact. Lands before Phase 4 end-to-end verification; not a build deliverable in the conventional sense (no application code). Operator confirmed 2026-05-02 that consent for player communications exists via signed contact waiver, so the scope of D11 is **avoiding test ICS invites being sent to real students** during Phase 4 verification, not establishing consent.

**What D11 produces.** Three test fixture rows in production tables, clearly tagged as test data, exercising the full multi-recipient dispatch path:

1. **Test student athlete profile** — row in `profiles` with a name like "Test Athlete (Sprint 013 Fixture)" and email `chris+sprint013-student@grittyfb.com` (resolves to operator inbox via plus-addressing — see D12). Row in `users` (or auth.users equivalent) with matching user_id. Linked to BC High via the appropriate roster mechanism (Sprint 011 carry-forward — likely `hs_coach_students` or similar; D0 surfaces the exact path).

2. **Test head coach** — row in the HS coaches table (table name confirmed by D0) with head_coach=true, school FK pointing at BC High, name "Test Head Coach (Sprint 013 Fixture)", email `chris+sprint013-headcoach@grittyfb.com`. Coexists with the real BC High head coach row; routing rule from D3 determines which the dispatch function selects during Phase 4 (likely `created_at ASC` selects the real coach; the fixture is exercised by submitting a visit specifically targeting it via direct row reference if needed).

3. **Test college coach submission** — when Phase 4 verification runs, the operator submits a visit through the `/athletes` form using a fixture college coach name and email `chris+sprint013-collegecoach@grittyfb.com`. This produces real intake-log rows but in a fixture context.

**Tagging convention.** Two patterns combined:

- **(a) Email plus-alias convention** — all fixture emails follow `chris+sprint013-<role>@grittyfb.com`. This handles dispatch-function filtering (the email-prefix-and-tag pattern is grep-able) and produces inbox-side visibility (Gmail preserves the alias in the `To:` header for filter rules).
- **(b) Name suffix convention** — fixture names end in `(Sprint 013 Fixture)` so they're visually distinguishable in admin views and queries.
- **(c) Boolean flag column** *(deferred — not implemented in D11)* — `is_test_fixture boolean default false` could be added to relevant tables if (a) and (b) prove insufficient over time. Heaviest option, schema impact, deferred unless needed.

**Recommendation:** combine (a) and (b). Email plus-alias handles routing + filtering; name suffix handles human-readable identification.

**Cleanup discipline.** Test fixtures persist in production after Sprint 013 closes — they are useful for Sprint 014 (Coach Dashboard tab) and Sprint 5 (Admin Panel Repair) verification too. They are **not** deleted at sprint close. A separate operator task (or future migration) removes them when fixture infrastructure moves elsewhere (e.g., a dedicated staging environment).

**Acceptance for D11:**
- Test student profile + user + roster link exist for BC High, fixture-tagged
- Test head coach row exists in HS coaches table with head_coach=true, fixture-tagged
- Operator can submit a visit via `/athletes` using a fixture college coach payload
- Dispatch function (D1) successfully reads all four recipients (college coach, head coach, real or fixture; player) without sending to any real student inbox
- Phase 4 verification can run end-to-end against fixtures only

**Closes:** OQ3 implicit (consent established by waiver, fixture pattern handles test isolation). Partial input to OQ7 (fixture inboxes are the test recipients for cross-client ICS rendering).

### D12 — Email Test Inbox Provisioning (Phase 0 operator task, no Claude Code)

> **CLOSED 2026-05-02.** Plus-addressing on `chris@grittyfb.com` verified — Google Workspace honors `chris+sprint013-<role>@grittyfb.com` aliases, all three fixture addresses (`chris+sprint013-student@`, `chris+sprint013-headcoach@`, `chris+sprint013-collegecoach@`) resolve to the operator inbox with the alias preserved in the To: header. No DNS work needed. OQ7 cross-client testing inboxes are pre-staged for Phase 1 close.

**Original deliverable specification preserved below for sprint history.**

---

**Status:** Phase 0 operator task. Runs in parallel with D11 (independent of schema knowledge). Lands before Phase 4 verification can run end-to-end. **Pure operator work** — verify plus-addressing reachability — no Claude Code involvement, no DNS work required.

**Why this is separate from D11.** D11 produces fixture rows in Supabase (database work, Claude Code-suitable with operator review). D12 confirms inbox reachability for those fixture addresses (operator-only verification). Separating them lets D11 fire as soon as D0 closes; D12 runs in parallel with a ~5-minute time cost.

**Approach: plus-addressing on `chris@grittyfb.com` (operator-confirmed 2026-05-02).**

All test fixture emails resolve to a single operator-controlled inbox via plus-addressing:

| Recipient role | Fixture email | Routing |
|---|---|---|
| Test student athlete | `chris+sprint013-student@grittyfb.com` | → `chris@grittyfb.com` |
| Test head coach | `chris+sprint013-headcoach@grittyfb.com` | → `chris@grittyfb.com` |
| Test college coach | `chris+sprint013-collegecoach@grittyfb.com` | → `chris@grittyfb.com` |

The dispatch function (D1) sees three distinct recipient addresses and calls Resend three times, writing three `visit_request_deliveries` rows — the multi-recipient path is exercised correctly. All three emails land in `chris@grittyfb.com` with the plus-alias visible in the `To:` header, so the operator can distinguish them.

**Why this works (and the gotcha to verify).** Google Workspace honors plus-addressing by default (mail to `user+anything@domain` routes to `user@domain`), but Workspace admins can disable it. The first thing D12 does is verify plus-addressing is actually working on `chris@grittyfb.com`. If disabled, D12 falls back to one of the alternate paths below.

**Acceptance for D12 (in order):**

1. **Verify plus-addressing reachability.** Send a test plain-text email from any external address to `chris+sprint013-test@grittyfb.com`. Confirm it arrives at `chris@grittyfb.com` within 60 seconds with the plus-alias preserved in the `To:` header. If it bounces or doesn't arrive, plus-addressing is disabled — fall back to alternate path before proceeding.
2. Confirm each of the three fixture addresses (`chris+sprint013-student@`, `chris+sprint013-headcoach@`, `chris+sprint013-collegecoach@`) resolves to `chris@grittyfb.com`. One test send per address; all three land in inbox.
3. Configure a Gmail filter (optional but recommended) labeling `to:(chris+sprint013-*)` mail with a "Sprint 013 Fixtures" label, so test mail is visually grouped during Phase 4 verification.
4. Document the inbox-to-role mapping in a short note at `docs/specs/.coach-scheduler-sprints/sprint-013-test-inboxes.md` (one paragraph plus the table above).

**Fallback paths (used only if plus-addressing fails verification):**

- **Fallback A — DNS subdomain `@test.grittyfb.com`.** Add MX records for `test.grittyfb.com` pointing at a forwarding service (ImprovMX free tier). Configure forwarding rules per role. Adds DNS propagation lead time (5min–48hr depending on TTL). Heavier setup.
- **Fallback B — Throwaway Gmail accounts.** Create three free Gmail accounts (`grittyfb.test.student@gmail.com`, etc.) and check each manually. No DNS work but multi-inbox checking during OQ7.

**OQ7 cross-client implication.** With all test mail routing to `chris@grittyfb.com`, OQ7's cross-client testing is bounded to clients where `chris@grittyfb.com` is configured. To exercise the full Apple Mail / Gmail web + mobile / Outlook web + desktop matrix:
- Gmail web + Gmail mobile (iOS/Android): native — `chris@grittyfb.com` likely already accessible
- Apple Mail / iCal: add `chris@grittyfb.com` as an account in Apple Mail on a Mac/iPhone, or forward a sample test ICS to a personal iCloud address during OQ7 prep
- Outlook web + Outlook desktop: same pattern — add `chris@grittyfb.com` as an account, or forward a sample to a Microsoft account during OQ7 prep

OQ7 prep instructions (when that step runs) call this out explicitly so the operator isn't surprised by per-client setup overhead at testing time.

**Cleanup discipline.** Plus-aliasing requires no cleanup — addresses don't "exist" in any persistent sense, they're just routing patterns. Gmail filter labels persist after sprint close (useful for Sprint 014 verification too).

**Closes:** OQ7 prep (reachable inboxes available for cross-client ICS rendering test). Operator-side D6 readiness (sender identity has reachable test recipients before going to production sends).

---

## Open Questions to Resolve Before Promoting This Spec

These questions are diagnostic-mode work that resolves during Phase 0 of the active sprint, before Phase 1 (build) opens. The canonical operating pattern says strategy and governance compress into the prototype phase; for Sprint 013, that translates to resolving these questions in a focused diagnostic session at sprint open.

### OQ1 — Transactional email provider selection (CLOSED 2026-05-02)

**Status: CLOSED.** Resend selected. Domain `noreply.grittyfb.com` added and verified — DKIM, SPF (MX + TXT), DMARC all green in Resend dashboard. DNS records added in Squarespace Custom Records panel. Existing `_dmarc.replies` record from prior Resend setup is residue (separate from this sprint's scope; orphan cleanup deferred to housekeeping).

**Original draft preserved for sprint history:**

> ~~**Recommendation: Resend.** Simplest API, good ICS attachment support, generous free tier, well-documented. Alternatives: Postmark (similar shape, mature deliverability), SendGrid (heavier API, more features). Resolve before sprint opens: provider choice, account creation, domain auth (SPF/DKIM/DMARC for `grittyfb.com`), test send confirmation.~~

### OQ2 — Sender identity (LOCKED 2026-05-02)

**Status: LOCKED.** Sending identity `scheduler@noreply.grittyfb.com` with reply-to dynamic to head coach (per-send, populated by D1 dispatch function from the head coach row in `hs_coach_schools`). Subdomain pattern (`noreply.grittyfb.com`) chosen over apex to avoid interaction with Google Workspace mail receipt at `chris@grittyfb.com`. Recipient sees clean machine-sender identity; head coach captures any reply traffic.

**Original draft preserved for sprint history:**

> ~~Two candidates: `scheduler@grittyfb.com` with reply-to set to head coach (cleanest, machine-sender pattern); `[head_coach_name]@grittyfb.com` or impersonating head coach's actual email (more personal, harder to authenticate, deliverability risk). **Recommendation: `scheduler@grittyfb.com` with reply-to head coach.** Cleanest deliverability, clear sender identity for recipients, head coach still gets reply traffic for any follow-up.~~

### OQ3 — Player email consent (RESOLVED 2026-05-02)

**Status: RESOLVED.** Operator confirmed 2026-05-02 that players and parents have signed a contact waiver permitting school-mediated communications, including college coach visit invites. This effectively places consent at the per-school partnership layer (path (b) in the prior version), not per-player opt-in.

**Implication for Sprint 013 scope.** Player emails ship in scope. The dispatch function (D1) sends the ICS invite to college coach + head coach + selected players. The ICS attendee list includes all parties.

**New gate (handled by D11, not OQ3).** Real student inboxes must not receive test ICS invites during Phase 4 verification. The test-fixture seeding deliverable (D11) handles this by introducing a tagged fixture student profile and exercising the full dispatch path against fixture inboxes the operator controls.

**Prior version preserved for sprint history:**

> ~~**Critical pre-sprint gate.** Players' emails are in `profiles` (Sprint 011 baseline) but consent for receiving college coach visit invites at their school inbox has not been explicitly established. Three paths: (a) opt-in email blast; (b) per-school partnership consent; (c) defer player emails to a later sprint. Recommendation pending operator decision: path (c) for Sprint 013 (lowest risk, fastest ship).~~

The signed waiver supersedes this analysis.

### OQ4 — Head coach identification and routing (RESOLVED 2026-05-02 by D0)

**Status: RESOLVED.** D0 verified the HS coaches table shape and BC High head coach row state at master `a951ec9`:

- Table: `hs_coach_schools` (matches Sprint 011 baseline)
- Head_coach column: `is_head_coach` (boolean NOT NULL DEFAULT false)
- FK: `hs_program_id uuid → hs_programs(id) ON DELETE CASCADE`
- Unique constraint: `(coach_user_id, hs_program_id)` only — `is_head_coach` itself is NOT unique-constrained, supporting multi-row head_coach state across schools and supporting test fixture coexistence per D11
- BC High row: 1 row matches `is_head_coach=true AND hs_program_id='de54b9af-c03c-46b8-a312-b87585a06328'` (Paul Zukauskas, pzukauskas@bchigh.edu, linked 2026-03-26)

D1's dispatch function reads `hs_coach_schools WHERE is_head_coach=true AND hs_program_id=<visit's hs_program_id>` (where `hs_program_id` is derived from the visit's school relationship per F-21 naming-hygiene flag). Routing rule for multiple matches: default `created_at ASC` (oldest row wins).

**Original draft preserved for sprint history:**

> ~~**Reframe.** The prior version of OQ4 assumed head coach designation lives on `users.head_coach`. Operator clarified 2026-05-02 that the head_coach boolean lives on the **HS coaches table** (likely `hs_coach_schools` per Sprint 011 baseline; D0 confirms). The boolean is **not unique-constrained** — multiple rows can flag head_coach simultaneously. This is intentional and supports test fixture coexistence with real coaches.~~
>
> ~~**Closes after D0.** D0's high-stakes spot-check verifies the actual table name, column name, and BC High row state. Once D0 produces the new ERD, OQ4 closes with: confirmed table name (e.g., `hs_coach_schools`); confirmed column name (e.g., `is_head_coach`); confirmed BC High head coach row(s) with name and email populated; routing rule for multiple head_coach rows: default `created_at ASC` per D3, refined by D0 findings if a different rule fits better.~~
>
> ~~**Dependency for Sprint 013 build phases.** D1's join logic (HS coaches table read) is finalized once OQ4 closes. Phase 1 cannot open until OQ4 resolves.~~

D0's verification superseded these gates.

### OQ5 — Function provider: Vercel function vs Supabase Edge Function (LOCKED 2026-05-02)

**Status: LOCKED.** Vercel function selected. Three sub-locks recorded:

1. **Runtime: Node 22.x** with function-level pin (`export const config = { runtime: 'nodejs22.x' }`). D1's `api/coach-scheduler-dispatch.ts` will be Node despite the existing `api/recruits-auth.ts` running Edge — D1 is Node-shaped (Resend SDK + ics package both target Node natively; multi-step transactional flow). Mixed-runtime project accepted; small maintenance footnote, not a problem.
2. **Env var naming: non-prefixed.** Server-side function consumes `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`. The `VITE_*` prefix is reserved for client-bundled vars; explicit non-prefixed names enforce server/client boundary at the env-var layer.
3. **Vercel scaffold readiness verified live (OQ5 spot-check 2026-05-02):** `api/` directory exists at repo root with one Edge function; `vercel.json` is rewrites-only (no functions block, no env block) — no edits required to add D1; auto-detection from `api/` directory mounts the new function at `/api/coach-scheduler-dispatch`. No `@vercel/node` in current dependencies; Phase 1 add list: `@vercel/node`, `@types/node`, `resend` SDK, `ics` library.

**Original draft preserved for sprint history:**

> ~~| Factor | Vercel Function | Supabase Edge Function | ... | **Recommendation: Vercel function.** Lower friction (existing deploy pipeline, familiar Node runtime, code lives with the frontend repo). Cold start delay is acceptable for this UX (post-submit, not interactive).~~

### OQ6 — Function trigger pattern (LOCKED 2026-05-02)

**Status: LOCKED.** Client-invoked synchronous. Sprint 012's submit handler calls D1's dispatch function after the three intake inserts succeed, passing `visit_request_id`. Function executes synchronously; client awaits response and updates confirmation panel based on result (full success / partial success / dispatch unavailable per D9).

**Original draft preserved for sprint history:**

> ~~Two candidates: client-invoked vs database-triggered. **Recommendation: client-invoked.** Synchronous feedback loop is cleaner UX (user sees actual delivery status, not a generic "we'll send it" promise). Cost: client must wait ~2-5 seconds for function execution. Acceptable given the user just completed a multi-step form and is in "waiting for confirmation" mode anyway.~~

### OQ7 — ICS format edge cases

Some email clients (older Outlook, some Gmail configurations) handle multi-attendee ICS files inconsistently. Pre-sprint: test on at least:
- Apple Mail / iCal
- Gmail web + Gmail mobile (iOS + Android)
- Outlook web + Outlook desktop (Mac + Windows)

**Depends on D12 (Email Test Inbox Provisioning).** Cross-client testing requires reachable inboxes on each target client. Per D12, all test mail routes to `chris@grittyfb.com` via plus-addressing — which means OQ7 testing has a per-client setup overhead the operator handles at testing time:

- **Gmail web + Gmail mobile:** native — `chris@grittyfb.com` is already accessible.
- **Apple Mail / iCal:** add `chris@grittyfb.com` as an account in Apple Mail on a Mac/iPhone, *or* manually forward a sample test ICS to a personal iCloud address during OQ7 prep.
- **Outlook web + Outlook desktop:** same pattern — add `chris@grittyfb.com` as an account, *or* forward a sample to a Microsoft account during OQ7 prep.

The operator sends a sample ICS to the D12 fixture inboxes from this Phase 0 testing surface, verifies "Add to calendar" appears and the event imports with correct attendees on each client. Findings documented in a pre-sprint diagnostic note.

### OQ8 — Time window → time conversion (LOCKED 2026-05-02)

**Status: LOCKED.** Full-window ICS event with DESCRIPTION clarifying that exact start time will be confirmed by head coach. Mapping table holds as written. Timezone derivation: `partner_high_schools.timezone` column existence check folds into D1's Phase 1 prep — if absent, add as ride-along to D7's `0042` migration commit (one ALTER TABLE + populate `America/New_York` for BC High).

| Window | DTSTART | DTEND |
|---|---|---|
| morning | 08:00 | 12:00 |
| midday | 11:00 | 14:00 |
| afternoon | 13:00 | 17:00 |
| evening | 17:00 | 20:00 |
| flexible | 09:00 | 17:00 (full day) |

All times in school's local timezone (`America/New_York` for BC High).

---

## Risk Register (Preliminary)

| Risk | Severity | Mitigation |
|---|---|---|
| ~~Stale ERD documentation causes architectural confusion (precedent: Sprint 012 data architecture confusion incident)~~ **CLOSED 2026-05-02 by D0** | — | D0 reconciled existing ERD docs into single canonical document with update discipline established in header at `docs/specs/erd/erd-current-state.md`. Commit `a951ec9`. |
| **Test ICS invites sent to real student inboxes during Phase 4 verification** | **High** | **D11 seeds tagged test fixtures (test student profile, test head coach, fixture college coach payload) at fixture-controlled email addresses. Phase 4 exercises dispatch path against fixtures only. Real students never receive test invites.** |
| ~~Player emails sent without proper consent (OQ3)~~ RESOLVED 2026-05-02 | — | Signed contact waiver establishes per-school consent. D11 handles test isolation. |
| Transactional email provider has deliverability issues | Medium | Use grittyfb.com (warmed up domain); set up SPF/DKIM/DMARC; monitor bounce rates. Test send before sprint opens. |
| ICS file rejected or rendered incorrectly by major calendar clients | Medium | Test on Apple Mail, Gmail web + mobile, Outlook web + desktop before deploy using D11 fixture inboxes. Use a known-good ICS library (`ics` npm package). |
| Dispatch function failure leaves intake rows without delivery tracking | Medium | D8 covers per-recipient failure. Function-level failure (function never executed) covered by future sprint's bulk-retry mechanism; intake rows are intact regardless. |
| Vercel function cold start makes submit→confirmation feel slow | Low | If observed >5 seconds: switch to provisioned/warm endpoint or accept the delay. Sprint 013's confirmation panel can render an interim "sending invites…" state during the wait. |
| Head coach routing ambiguity (multiple head_coach=true rows on HS coaches table) | **Verified Low — current production state has exactly 1 head_coach=true row for BC High** | D0 spot-check 2026-05-02 confirmed BC High has 1 row. Defined routing rule in D3 (default `created_at ASC`) handles future multi-row case. D11 fixture coexists with real head coach intentionally; routing rule selects the real coach (older `created_at`) for production paths. |
| Player email addresses in `profiles` are stale (graduated, transferred students) | Medium | Cross-reference with current roster before sprint opens. D0 surfaces profile staleness if any. Affects production sends only; D11 fixtures are fresh. |
| Email-send service outage on submit creates inconsistent state | Low | D8 covers this — Supabase intake records save first; email send is the secondary action with explicit failure logging. |
| Function provider lock-in (Vercel-specific code patterns) | Low | Function logic kept thin: read intake → generate ICS → send email → write deliveries. Provider switch (Vercel → Supabase Edge Function) is mostly an import-style change, not a logic rewrite. |

---

## Definition of Done

- ~~**D0 (ERD Reconciliation) shipped on master in two commits.** New canonical ERD lives at operator-confirmed path with update discipline header.~~ **DONE 2026-05-02 at `a951ec9`** (single commit; corrections + rename + delete + commit consolidated after preservation-fidelity review caught Section 6 thinning during verbatim-print discipline check).
- ~~**D11 (Test Fixture Rows) seeded** in Supabase with email-domain + name-suffix tagging.~~ **DONE 2026-05-02.** Two fixtures (test student, test head coach) seeded with triple-tagging (plus-aliased emails, name suffix, `raw_user_meta_data.fixture` marker). Fixture 3 (test college coach) documented for Phase 4 form-submit.
- ~~**D12 (Test Inbox Provisioning) complete** — plus-addressing on `chris@grittyfb.com` verified; three fixture addresses (`chris+sprint013-student@`, `chris+sprint013-headcoach@`, `chris+sprint013-collegecoach@`) all reachable; inbox-to-role mapping documented.~~ **DONE 2026-05-02.** Plus-addressing verified working via Google Workspace.
- All other deliverables ship on production (D2 already shipped via Sprint 012)
- Coach completes full four-card scheduler flow (date → time → players → contact info → submit) — already functional from Sprint 012
- Single .ics file generated per submit with correct LOCATION, DTSTART/DTEND, full attendee list per Hard Constraint 2
- College coach + head coach + selected players receive the email; ICS auto-imports in major calendar clients tested in OQ7 against D12-provisioned inboxes
- Supabase has intake-log rows (Sprint 012) plus per-recipient `visit_request_deliveries` rows (Sprint 013)
- Failure mode: per-recipient failure logged, others still succeed, user sees partial-success confirmation
- Vitest assertion count ≥ Sprint 012 floor (772/1/773) + new assertions for any client-side touches
- No regressions on the public `/athletes` page or Sprint 012 submit functionality
- Production verification: real submit via `/athletes` (using D11 fixtures + D12 inboxes only) produces ICS in fixture inboxes, calendar import works, Supabase rows correct
- EXECUTION_PLAN advances to v5.10+ with Sprint 013 outcomes recorded
- Phase retro filed at sprint close
- ERD canonical doc updated by D7 migration (`visit_request_deliveries`) in the same commit as the migration itself, validating the update discipline established by D0

---

## Sprint 013 Retro — Phase 1 + Phase 4 Findings

### Carry-forward notes for future fixture seeding (D11 gaps)

D11 raw-SQL fixture seeding produced two GoTrue compatibility gaps surfaced by D1 dispatch in Phase 4:

1. **Missing auth.identities row.** Raw INSERT INTO auth.users does not auto-create the corresponding auth.identities row. GoTrue's auth.admin.getUserById() internally joins users ⨝ identities; missing identity row throws AuthApiError "Database error loading user" (code: unexpected_failure). Fixed during Phase 4 prep with mirror INSERT for both fixture users.

2. **NULL values in four auth.users token columns.** confirmation_token, recovery_token, email_change_token_new, email_change have no schema default; raw INSERT without explicit values left them NULL; GoTrue's Go struct cannot deserialize NULL into non-pointer string and surfaces same generic "Database error loading user". Documented but not fixed — fixture path retired in favor of real-user pivot for Phase 4.

**Pattern recommendation for future fixtures:** use supabase.auth.admin.createUser() instead of raw INSERT INTO auth.users. The admin API auto-populates all internal token columns AND inserts the corresponding auth.identities row. Raw SQL is sufficient only for FK-target shells where no auth-mediated read will ever happen — and even then, every auth admin endpoint is a future trap. Default to admin.createUser; reserve raw SQL for cases with explicit operator awareness of the schema invariants.

**Schema observation:** auth.identities.email is a generated column (computed from identity_data->>'email'); information_schema does not surface this attribute (lives in pg_attribute.attgenerated). Inconsistent default state of auth.users token columns is a Supabase migration artifact. Documenting for future migration drafting.

### OQ5 lock language correction

Original OQ5 lock specified `runtime: 'nodejs22.x'` as the function-level pin. This syntax is invalid per Vercel's runtime API. Vercel's `config.runtime` accepts only the runtime family (`'edge'`, `'experimental-edge'`, `'nodejs'`), not versioned strings. Node version pinning happens via `package.json` engines, not via the function config.runtime field.

**Corrected OQ5 lock language:**
- Function-level: `export const config = { runtime: 'nodejs' }` (runtime family only)
- Project-level (optional): `package.json` `engines.node` field if explicit version control needed
- Sprint 013 D1 uses runtime family pin only; runs on Vercel default (currently Node 24 LTS); function uses no Node-22-specific APIs

Fixed in commit 8671a82.

### Test floor correction

Phase 0/Phase 1 prompts stated test floor as 772/1/773. Actual floor at branch cut (master `15b0a23`): **762/1/763**. Discrepancy was a stale figure inherited from an earlier reference; never invalidated work but caused floor verification confusion in CC reports. Both pre-existing failures (schema.test.js > short_list_items.recruiting_journey_steps default, and load-failure of recruits-top-nav.test.jsx) verified pre-existing during D1 stash-and-rerun; not introduced by Sprint 013.

### Phase 4 routing pivot — design lesson

D11's fixture-head-coach approach was designed before D1 existed. D1's auth.admin.getUserById() requirement made the fixture pattern unworkable. Resolution: pivoted verification to use chris@grittyfb.com (real auth user, complete GoTrue state) as temporary BC High head coach for verification window, then restored production routing.

**Lesson:** fixture data shape must be validated against actual consumer code paths, not designed in isolation. When D11 was authored, the dispatch function's auth lookup pattern wasn't yet defined; fixture seeding pattern wasn't tested against it. Future fixtures should be designed AFTER (or jointly with) the consumer code, OR use admin.createUser to guarantee GoTrue compatibility regardless of consumer pattern.

### OQ7 ICS render issues — deferred to follow-up

Gmail web preview of the ICS attachment showed "Add to Calendar" button but click did not import event reliably. Email body times rendered correctly (afternoon = 13:00–17:00 America/New_York per OQ8). Likely cause: floating local time emission (OQ8 lock A3 — `startInputType: 'local', startOutputType: 'local'`) interacts with Gmail's calendar import differently than UTC-emitted ICS files do.

**Deferred to OQ7 cross-client follow-up sprint** (likely Sprint 014 or later). Documenting candidate paths:
- Option A: Add VTIMEZONE block manually to ics-emitted file
- Option B: Convert local → UTC at emission time using a TZ library (date-fns-tz or luxon — adds dependency)
- Option C: Accept floating-local for now; document that recipients must verify time manually
- Phase 4 verified delivery end-to-end; ICS render quality is a UX refinement, not a correctness blocker

---

## Notes for Phase 1 Branch Cut

**Phase 0 COMPLETE 2026-05-02.** All gates cleared. Branch cut authorized.

1. ~~**D0 (ERD Reconciliation) complete on master.**~~ **DONE 2026-05-02 at `a951ec9`.**
2. ~~**Resolve remaining open questions.**~~ **DONE 2026-05-02.** OQ1 closed (Resend verified), OQ2 locked (`scheduler@noreply.grittyfb.com`), OQ5 locked (Node 22.x, non-prefixed env vars, mixed runtime), OQ6 locked (client-invoked synchronous), OQ8 locked (full-window mapping). OQ3 RESOLVED (waiver). OQ4 RESOLVED by D0. OQ7 deferred to Phase 1 close.
3. ~~**Pre-sprint diagnostic verification of ICS format**~~ **DEFERRED to Phase 1 close.** Cross-client testing requires D1/D5/D6 ship first; runs against D11/D12 fixtures after Phase 1 build.
4. ~~**Set up transactional email provider account**~~ **DONE 2026-05-02.** Resend domain `noreply.grittyfb.com` verified (DKIM, SPF, DMARC all green).
5. ~~**Confirm `partner_high_schools.meeting_location`**~~ **DONE by D0.**
6. ~~**Confirm BC High head coach assignment**~~ **DONE by D0.** Paul Zukauskas (1 row).
7. ~~**Test fixtures seeded (D11)**~~ **DONE 2026-05-02.** Fixtures 1+2 seeded; Fixture 3 documented for Phase 4.
8. ~~**Test inboxes provisioned (D12)**~~ **DONE 2026-05-02.** Plus-addressing on `chris@grittyfb.com` verified.
9. ~~**Confirm Sprint 012 retro is complete**~~ **DONE.** Verified at master `413a680`. ✓
10. **Cut sprint branch** `sprint-013-coach-scheduler` from master at `a951ec9`. **NEXT MOVE.**

**Phase 1 carry-forwards locked at Phase 0 close:**
- D1 runtime: Node 22.x, function-level pin (OQ5)
- D1 env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` (OQ5)
- D1 head coach display name: backfill Paul's `raw_user_meta_data.display_name` via one-time UPDATE in D7 commit; D1 reads `display_name` with email-local-part fallback (D11 surfaced)
- D7 migration: `0042_visit_request_deliveries.sql`; possibly add `partner_high_schools.timezone` ride-along ALTER if column absent (OQ8 prep)
- D1 mixed runtime accepted: existing `api/recruits-auth.ts` stays Edge; `api/coach-scheduler-dispatch.ts` is Node (OQ5)

---

## Sprint 014+ Carry-Forward Hints

Sprint 013 work surfaces several follow-up candidates worth flagging before they're forgotten:

- **Bulk re-dispatch / admin retry mechanism** for cases where the function failed entirely (vs per-recipient failure within the function). Sprint 014 candidate.
- **Coach Dashboard tab reading `visit_request_deliveries`** to surface delivery problems and provide manual retry. Already named as Sprint 014 in earlier docs.
- **Player consent infrastructure** if OQ3 path (a) or (b) is chosen post-Sprint 013. Could be its own feature folder (`docs/specs/.player-consent-sprints/` or similar).
- **Multi-head-coach routing** if OQ4 surfaces real ambiguity in production.
- **Timezone column on `partner_high_schools`** if OQ8 implementation reveals it's missing.
- **Calendar invite cancellation/update flow** — current spec ships invite-creation only. If a coach reschedules or cancels, the system has no way to send a cancellation/update ICS. Future sprint candidate.
