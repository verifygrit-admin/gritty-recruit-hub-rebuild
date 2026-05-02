---
sprint_id: Sprint012
phase: 2-3
phase_name: Inline Scheduler Build, Intake-Log Reframe, Submit Wiring
retro_date: 2026-05-01
status: closed
branch: sprint-012-coach-scheduler
branch_head: 9ecea09
commits: ad11f86 (Phase 1 migration), 32fb5ae (Phase 1 retro), 6a62076 (Phase 2 build), 3d22e45 (Phase 2 hotfixes), 2bd90a1 (Phase 3 schema), 9ecea09 (Phase 3 wiring)
---

# Sprint 012 Phase 2 + Phase 3 Combined Retro — Inline Scheduler Build, Intake-Log Reframe, Submit Wiring

## 1. Combined Outcome

Phase 2 built the inline coach scheduler section on `/athletes` after a course-correction from an initial SlideOutShell modal scaffold. Phase 3 introduced the `visit_request_players` join table, then triggered an architectural reframe of `coach_submissions` and `visit_requests` as append-only intake records (intake-log architecture), then wired the section-level Submit button to three sequential plain-insert writes. Six commits on the branch, two migrations applied to production (`0040_visit_request_players`, `0041_coach_submissions_intake_log_reframe`), one major architectural decision recorded as Decision K extension and a new "Coach Identity Architecture" `EXECUTION_PLAN` section. End-to-end submit verified via four tests (operator manual + Claude in Chrome). Production schema and consumer code both ship the intake-log architecture; canonical coach identity work is deferred to a later sprint.

---

## 2. What Shipped

### 2a. Phase 2 build (commits `6a62076`, `3d22e45`)

- **Initial scaffold:** `CoachSchedulerModal.jsx` + `DateStep.jsx` + `TimeStep.jsx` + `ContactForm.jsx` (sequential `SlideOutShell` modal). Built against partial reading of the prototype.
- **Course correction:** prototype review confirmed the actual UX is an inline section embedded in `/athletes` — CTA scrolls to a dark band below the roster containing all four scheduler cards visible simultaneously plus a contact form and section-level submit. The four modal-era files were deleted (never committed), replaced with a single `CoachSchedulerSection.jsx`.
- **CTA component change:** `CoachSchedulerCTA.jsx` changed from modal-open `onClick` to imperative `window.scrollTo` with 72px offset matching the section's `scroll-margin-top` buffer.
- **Three Phase 2 hotfixes:** CTA scroll fix (sticky+`scrollIntoView` interaction quirk → imperative scroll), recruit card "EXPECTED STARTER" badge removed, page subtitle copy updated to reference the NCAA's Contact or Evaluation Period.
- **Sprint 011 frozen file** (`PlayerCardReference.jsx`) untouched throughout.
- **Vitest floor 772/1/773 maintained** throughout (one test update required when `expected_starter` dropped from `ACCOLADE_SLOTS`).

### 2b. Phase 3 schema work (commit `2bd90a1`)

- **`0040` migration:** `visit_request_players` join table with composite PK on (`visit_request_id`, `player_id`), FK to `visit_requests(id)` `ON DELETE CASCADE`, FK to `profiles(user_id)` `ON DELETE CASCADE`. Anon RLS: `INSERT` only, `WITH CHECK (true)`, FK on `visit_request_id` provides B1 binding integrity. Pulls Sprint 013 D2 scope forward into Sprint 012.
- **`0041` migration:** `coach_submissions` intake-log reframe. Drops `email UNIQUE` constraint (DF-3 reframed), drops `verification_state` text column with `CHECK` (DF-7 reframed), adds `submitter_verified boolean NOT NULL DEFAULT false`, recreates anon `INSERT` policy with new `WITH CHECK (submitter_verified = false AND source = 'scheduler')`.
- **Both migrations applied to production** via `npm run migrate`. Both verified with anon-key behavioral probes against production.
- **Doc cascades:** DF-3 reframed, DF-5 reframed, DF-5.1 superseded, DF-7 reframed. Decision J updated to reference canonical-layer verification. Decision K extended with intake-log vocabulary. New `EXECUTION_PLAN` section "Coach Identity Architecture (intake log + canonical)". Sprint 012 spec D6 updated. Sprint 013 spec D2 reduced to historical pointer.
- **`EXECUTION_PLAN` advanced** v5.5 → v5.6 (scope shift) → v5.7 (DF-5.1 amendment) → v5.8 (intake-log reframe).

### 2c. Phase 3 submit wiring (commit `9ecea09`)

- **Single file modified:** `CoachSchedulerSection.jsx` (+274 / -67).
- **Submit handler:** client-side `crypto.randomUUID()` for both id chains, three sequential plain `.insert()` calls (`coach_submissions` → `visit_requests` → `visit_request_players` bulk), no `.upsert()`, no `.select()` chains.
- **`partner_high_schools.id` resolution:** `useEffect` on `selectedSchool`, `SELECT` by `slug`, cleanup via cancellation flag. Submit gated until `partnerSchoolId` resolves.
- **UI state machine:** `idle` / `submitting` / `success` / `error`. Success replaces cards with confirmation panel. Error preserves form data, allows retry. Submitting disables form and mutes cards visually.
- **Honeypot:** populated honeypot fires zero Supabase calls and toggles to fake success UI. Defense-in-depth: Submit button also rendered disabled when honeypot non-empty.
- **End-to-end verification (operator + Claude in Chrome):**
  - **Test 1 — happy path:** three rows landed in production tables with correct FKs and player join data
  - **Test 2 — honeypot:** zero Supabase calls, fake success UI rendered
  - **Test 3 — error path:** error banner + form preservation + successful retry
  - **Test 4 — repeat email:** same email submitted twice produced two distinct `coach_submissions` rows, both 201, no 409 conflict — intake-log architecture verified end-to-end

---

## 3. Process Observations

### 3a. The Phase 2 prototype-misreading and course correction

Phase 2's first scaffold (`SlideOutShell` modal with sequential step routing) was wrong. The prototype's scheduler is an inline static-marketing-mockup section embedded in `/athletes`, not a modal overlay. The misreading happened because the prompt-construction pass synthesized the build target from a partial reading of the prototype's CSS (which mentioned `modal-*` class names) without inspecting the prototype's DOM placement and JS interactivity. Recovery: Claude in Chrome inspection of the prototype (storyboard cards, no JS interactivity, scroll-into-view from CTA) clarified the actual user flow. Four modal-era files were deleted before any commit; `CoachSchedulerSection.jsx` replaced them as a single inline section.

**Discipline item for forward sprints:** when a prompt names a UI build target that involves an existing prototype, transcribe the prototype's DOM placement and interactivity model into the prompt verbatim, not just its visual styling. The prototype's CSS is necessary but not sufficient context.

### 3b. The `.upsert()`-under-anon discovery and cascade

The `0040` apply probe Probe 3b.i surfaced that supabase-js v2 `.upsert()` defaults `Prefer: return=representation` internally regardless of whether `.select()` is chained. This triggered 42501 RLS denial under anon on `coach_submissions` even with `WITH CHECK` satisfied. The DF-5 locked pattern (`supabase.from('coach_submissions').upsert(payload, { onConflict: 'email' })`) did not work as written. Initial response: amend with `ignoreDuplicates: true` (recorded as DF-5.1) which sets `Prefer: resolution=ignore-duplicates,return=minimal`. Operator review of the compromise (no name/program updates on repeat submissions) led to a deeper architectural reframe: `coach_submissions` and `visit_requests` treated as append-only intake records rather than staging rows. Plain `.insert()` per submit dissolves the upsert problem entirely.

**Pattern observation:** the upsert finding is the second instance of supabase-js v2 / PostgREST default-`Prefer`-header behavior interacting with anon RLS in unexpected ways (the first was the `.insert().select()` finding from Phase 1). Both cases: the library's implicit `Prefer` header triggers SELECT-side RLS that anon does not satisfy, the INSERT side actually fired but the client sees an error.

**Forward discipline:** when designing anon-write surfaces, verify the consumer-side library defaults match the policy posture. Document the verification in the migration's threat model section.

### 3c. The intake-log reframe as architectural progress

The reframe collapsed three locked decisions (DF-3 email UNIQUE, DF-5 upsert pattern, DF-7 `verification_state` multi-state) and one amendment (DF-5.1) into a coherent two-layer model: intake-log layer (Sprint 012 — append-only, no overwrites, RLS-gated) and canonical layer (deferred — `college_coaches` as identity source, enrichment pipeline reads intake rows and updates canonical tables). The reframe was triggered by a technical finding (`.upsert()` under anon) but produced architectural value beyond fixing the immediate problem. The four-state `verification_state` column on `coach_submissions` was conceptually muddled (an intake row doesn't have a verification state — the coach does); the reframe moved verification work to where it belongs. Decision K's "semi-staging table" framing was directionally correct and pointed at this architecture; the reframe sharpened the language.

**Discipline observation:** when a tactical fix (DF-5.1 `ignoreDuplicates`) carries a documented compromise that contradicts a related decision (DF-3 last-write-wins), pause and ask whether the decision is wrong rather than working around it. The compromise was a signal that the underlying model needed revision, not a hack to ship faster.

### 3d. The doc-state-vs-prompt-premise drift (DF-5.1 catch-up)

The intake-log reframe prompt assumed DF-5.1 already existed in the docs (the amendment was specified in a prior turn but never written to the branch — the operator review immediately produced the reframe rather than landing the amendment first). Claude Code surfaced the drift, paused, and required a catch-up DF-5.1 amendment land before the reframe could fire cleanly. Recovery cost: one additional prompt cycle.

**Discipline item for forward sprints:** when generating prompts that reference prior decisions or document states, verify the actual file state on the branch before relying on session memory. This is the same failure pattern that bit the `EXECUTION_PLAN` omission at session-open and the file-path drift at session-mid. Synthesizing prompt scope from session memory rather than transcribing canonical sources is a recurring discipline gap.

**Forward correction:** any prompt that references "the X amendment" or "the Y decision" or "the Z file at path P" should include a verification step at the top: "Before any operation, confirm the assumed pre-state by reading [file] and surfacing if [reference] is absent."

### 3e. Decision-cascade hygiene held throughout

Every reframe in Phase 3 (DF-3, DF-5, DF-5.1, DF-7) cascaded into multiple documents (audit Section G entries, `EXECUTION_PLAN` Open Decisions, `EXECUTION_PLAN` Decisions on Record where Decisions J and K were updated, Sprint 012 spec D6, Sprint 013 spec D2). All cascades were specified in prompts and applied without drift. Two cases where Claude Code added correct judgment improvements unprompted:

- (a) inline italicized "amended DF-5.1 — see below" flag in the DF-5 body
- (b) preserving original DF-5.1 body intact above the SUPERSEDED marker so historical context survives

These additive judgment calls compound trust.

### 3f. Honeypot defense-in-depth bonus

Phase 3 wiring implemented honeypot deception with a behavior the spec didn't require but that adds a layer of protection. When the honeypot is populated, the Submit button is rendered disabled in addition to the `onClick` handler short-circuiting to fake success. A naive bot that clicks the visible button gets blocked by the disabled state; a sophisticated bot that invokes the handler programmatically gets the fake success UI. Two layers of defense for one threat. Worth keeping as a forward pattern when designing anti-spam UX.

---

## 4. What's Left Before Sprint 012 Closes

### 4a. Push branch to origin

`git push -u origin sprint-012-coach-scheduler`. First push; remote branch does not yet exist.

### 4b. Cut PR

`gh pr create` from CLI, or via GitHub UI. PR title summarizes the sprint; body lists the four phases with their commit hashes.

### 4c. PR review and merge

Operator self-review (no other reviewer on this project), merge strategy per project convention (likely squash or merge-commit; verify against prior merged PRs in the repo).

### 4d. Post-merge cleanup

Delete the local branch after merge, pull master, verify production at `app.grittyfb.com/athletes` reflects the new scheduler after Vercel auto-deploys from master.

---

## 5. Carry-Forward to Sprint 013

Sprint 013 inherits a substantially simplified scope due to the work consolidation in Sprint 012:

- **`visit_request_players` already exists** (D2 closed by Sprint 012's `0040` migration). Sprint 013 D2 reduced to historical pointer.
- **`coach_submissions` and `visit_requests` are intake-log shape.** Sprint 013's email-send work reads intake rows; an enrichment pipeline (deferred beyond Sprint 013) eventually writes to canonical tables.
- **DF-5's Sprint 013 reopener** for server-side route migration is no longer architecturally required (intake-log eliminates the upsert problem) but remains valid for the email-send work, which categorically needs server-side execution.
- **Sprint 012 spec D6 consumer-side pattern bullet** captures the supabase-js v2 default-`Prefer`-header pitfalls; Sprint 013's server-side route avoids this surface entirely by using service-role.
- **Sprint 013 first build candidate:** server-side function (likely Vercel function at `api/coach-scheduler-submit.ts` or equivalent) that reads intake rows by id, generates ICS, sends email via Resend, logs per-recipient delivery status to a new `visit_request_deliveries` table. The intake-log architecture means the function is read-write on the new deliveries table only, not on `coach_submissions` or `visit_requests`.

---

## 6. Branch State + Production State

**Branch** `sprint-012-coach-scheduler` at `9ecea09`. Six commits ahead of master. Not pushed.

**Production schema:** four new tables (`partner_high_schools`, `coach_submissions` intake-log shape, `visit_requests`, `visit_request_players`) with four anon RLS policies. All four tables and four policies behaviorally verified against production via anon-key probes during apply turns plus end-to-end via `/athletes` manual submit testing.

**Production frontend:** still on master at `0236517` — does not yet reflect the scheduler. Push + PR + merge will trigger Vercel deploy and update production.

**Working tree:** clean except four sibling untracked drafts (`marketing-task-grittyfb-hero-link.md`, `sprint-014-session-spec.md`, `sprint-015-session-spec.md`, `sprint-016-session-spec.md`) which stay untracked through the PR per the folder-preservation rule. They become tracked when their respective sprints open.
