# Sprint 025 Session Spec — Coach Message Generator Phase 1

**Status:** Not started.
**Repo:** `gritty-recruit-hub-rebuild` (`C:\Users\chris\dev\gritty-recruit-hub-rebuild`)
**Feature folder:** `docs/specs/.cmg-sprints/` (sprint docs, retros, execution plan)
**Prototype:** `prototypes/cmg/coach-message-generator.html` (visual ground truth, locked)
**Owner:** Chris Conroy (operator). Patch + Scribe execute.
**Mode:** Sprint — flat technical execution against the prototype as ground truth.
**Expected duration:** One Claude Code session, est. 120–150 minutes (includes the sandwich nav refactor as a gated phase preceding the CMG component build).

---

## 1. Sprint objective

Ship two coordinated deliverables in one session, gated:

1. **Sandwich nav refactor.** Replace the horizontal Student View nav with a sandwich (hamburger) drawer in `src/components/Layout.jsx`. Nav entries continue to source from `src/lib/navLinks.js`. The five existing Student View pages render correctly through the drawer.
2. **Coach Message Generator (Phase 1).** New sixth page in Student View, matching the prototype 1:1 at desktop widths. Wire profile auto-fill from `public.profiles`, school picker from `public.short_list_items`, eleven scenario templates from a new data module, channel toggle, recipient tabs, copy-to-clipboard, email-to-self via `mailto:`, JSONB message logging on `public.profiles.cmg_message_log`. Migration applied, RPC added, page reachable from the new sandwich drawer as the sixth entry.

The CMG component build is gated on the sandwich refactor passing its smoke test. See DESIGN_NOTES D3.5 for why these are folded into one sprint rather than decoupled.

This sprint does not include: Phase 2 coach picker, backend SMTP, visual redesign of the sandwich drawer beyond the prototype's reference, or any per-page content changes on the five existing Student View pages.

---

## 2. Pre-flight checklist

Before kicking off Claude Code, confirm:

- [ ] Prototype HTML is in `prototypes/cmg/` and committed.
- [ ] README, DESIGN_NOTES, SPEC_FOR_CODE, EXECUTION_PLAN, and this session spec are in `docs/specs/.cmg-sprints/` and committed.
- [ ] The six pre-kickoff DECs are filed (see DESIGN_NOTES and SPEC_FOR_CODE for the list — Decision 5 covers design-token consumption; Decision 6 covers the sandwich nav scope).
- [ ] Coach Communication Generator template docx is archived to the feature folder.
- [ ] DATA_INVENTORY.md has been read by Patch. Particular attention to: Section 3 entries on `public.profiles`, `public.short_list_items`, `public.schools`, `public.college_coaches`, `public.coach_contacts`; Section 7 entries on `recruits-schools.js`, `school-staff.js`, `navLinks.js`.
- [ ] Pre-sprint screenshot of the existing horizontal Student View nav captured for retro comparison.
- [ ] `src/components/Layout.jsx` reviewed for nav-rendering location — confirm the horizontal nav is centralized rather than distributed across per-page replicas. If distributed, surface to the operator before kickoff (changes the refactor scope).
- [ ] A test student (recommended: Thomas Girmay) has complete `public.profiles` data in staging for end-to-end testing. Confirm the eight auto-fill columns are populated (`name`, `grad_year`, `position`, `high_school`, `state`, `gpa`, `hudl_url`, `twitter`).
- [ ] `useSchoolIdentity()` resolves Thomas's slug to `bc-high` (or whichever slug is current). The CMG depends on this hook returning a valid slug to set `data-school-theme`.
- [ ] The `bc-high` theme block exists in the design-token module with all eight required tokens (`--brand-primary`, `--brand-primary-deep`, `--brand-primary-soft`, `--brand-primary-faded`, `--surface-base`, `--surface-warm`, `--surface-edge`, `--ink`, `--ink-soft`, `--ink-muted`).
- [ ] Patch has read-write access to staging Supabase for the migration step.

---

## 3. Sprint phases (gated)

### Phase 0 — Orientation (5 min)

Open the prototype HTML in browser. Skim README, DESIGN_NOTES, SPEC_FOR_CODE. Confirm shared mental model.

**Exit:** Patch and Scribe can each answer: what does the CMG do, what's in scope, what's out of scope.

---

### Phase 1 — Schema validation and migration (Patch leads, blocks Phase 2)

Validate `public.profiles` schema against the prototype's auto-fill field list. Apply migration to add `cmg_message_log` JSONB column and the `append_cmg_message_log` RPC. Confirm partner-school theme resolution works for the test student.

**Required outputs:**

1. **`public.profiles` column mapping confirmation** (per DATA_INVENTORY.md Section 3). For each of these columns, confirm the column exists with the expected name and type. These are the codebase's actual column names — NOT my earlier placeholder names:

   | Column | Type | Notes |
   |---|---|---|
   | `name` | text | NOT `full_name` |
   | `grad_year` | int | |
   | `position` | text | |
   | `high_school` | text | NOT `hs_name`. Filter value for `recruits-schools.js` |
   | `state` | text | 2-char |
   | `gpa` | numeric | NOT `cgpa` |
   | `hudl_url` | text | Added by migration `0016` |
   | `twitter` | text | NOT `twitter_url`. Stored as URL text |
   | `email` | text | |

   If any field is missing or named differently from this list, surface to the operator and pause for a working-group decision. Do not silently fall back on placeholders.

2. **Shortlist read path confirmation.** Confirm that for a given `user_id`, we can read `public.short_list_items` as a list of rows with `unitid`, `school_name`, `div`, and `match_tier`. Confirm we can join to `public.schools` to read `type` (the canonical 5-tier key: P4/G6/FCS/D2/D3 per DATA_INVENTORY.md Section 3 entry on `public.schools`).

3. **Design-token resolution confirmation.** Confirm `useSchoolIdentity()` resolves the test student's HS slug correctly (expected: `bc-high` for Thomas Girmay). Confirm the Student View shell sets `data-school-theme="<slug>"` on its wrapper. If the design-token system is missing the slug or its theme block, surface to the operator before proceeding.

4. **Migration applied.** On staging, create `supabase/migrations/0047_profiles_add_cmg_message_log.sql` with:
   ```sql
   -- 0047_profiles_add_cmg_message_log.sql

   ALTER TABLE public.profiles
     ADD COLUMN IF NOT EXISTS cmg_message_log jsonb NOT NULL DEFAULT '[]'::jsonb;

   CREATE INDEX IF NOT EXISTS idx_profiles_cmg_message_log_gin
     ON public.profiles USING gin (cmg_message_log);

   -- Atomic append RPC. SECURITY INVOKER so the existing public.profiles
   -- RLS policies (migrations 0012/0015/0025/0026/0027/0043 per
   -- DATA_INVENTORY.md) enforce that a student can only append to their own row.
   CREATE OR REPLACE FUNCTION public.append_cmg_message_log(
     p_user_id uuid,
     p_record jsonb
   ) RETURNS void
   LANGUAGE sql
   SECURITY INVOKER
   AS $$
     UPDATE public.profiles
        SET cmg_message_log = cmg_message_log || jsonb_build_array(p_record),
            updated_at = now()
      WHERE user_id = p_user_id;
   $$;

   -- Documentation: cmg_message_log is intentionally distinct from
   -- public.coach_contacts. The CMG log captures *drafts*; coach_contacts
   -- captures *actual contact events*. See DESIGN_NOTES D3.9.
   COMMENT ON COLUMN public.profiles.cmg_message_log IS
     'Coach Message Generator draft log. JSONB array of {id, unitid, school_name, scenario_number, scenario_title, channel, recipients, emailed_to_self, constructed_at}. NOT a relationship-state ledger; see public.coach_contacts for that.';
   ```

5. **Smoke test on the test student.** Confirm:
   - Read returns all profile auto-fill fields populated for Thomas Girmay's row.
   - Read returns Thomas's `short_list_items` rows with `unitid` and `school_name`.
   - Append RPC successfully writes a test record to `cmg_message_log` (calling user is Thomas; RPC runs under his identity).
   - Subsequent read shows the record in the array.
   - The `bc-high` theme block applies the expected color tokens to a test render.
   - Delete the test record before exit.

**Exit criterion:** All five outputs confirmed. Migration is reversible (a rollback script lives in `supabase/migrations/` alongside the forward migration, following the pattern of existing reverse migrations in the repo).

---

### Phase 2 — Scenario template data module (Scribe leads, parallel-safe with Phase 1)

Create a TypeScript module (or JSON, matching repo convention) holding all eleven scenario templates with the shape defined in SPEC_FOR_CODE Step 2. Wording sourced from the Coach Communication Generator docx.

**Required outputs:**

1. **`src/data/cmgScenarios.ts`** (or equivalent path matching repo convention) exporting an array of 11 `ScenarioTemplate` objects.

2. **Each template has:**
   - `scenario_number`, `title`, `situation`, `channel_pattern`, `is_public_post`
   - `email_subject_template` (null for scenarios 1 and 5)
   - `body_template` (with bracketed placeholders intact)
   - `email_signature_template`, `twitter_signature_template`
   - `required_form_fields` (form field keys, e.g., `["camp_name", "camp_location", "coach_last_name"]`)
   - `optional_closing_questions` (junior_day_question, camp_question)
   - `applies_to_recipients` (array of recipient role keys)

3. **Verification:** A unit test (or repl check) confirms substituting a fixture profile + form state into each scenario's body template produces the expected output text. Fixture data covers all eleven scenarios.

**Exit criterion:** All eleven templates parse, substitute correctly against fixtures, and match the docx wording exactly.

---

### Phase 3 — Sandwich nav refactor (Patch leads, blocks Phases 4 onward)

Refactor the Student View nav from horizontal strip to sandwich (hamburger) drawer. Verify all five existing Student View pages render correctly through the new drawer before any CMG-component work begins. See DESIGN_NOTES D3.5 for the decision to fold this into Sprint 025.

**Required outputs:**

1. **Pre-refactor screenshot captured.** A screenshot of the current horizontal nav rendering on each of the five Student View pages (Home, My Profile, My Grit Fit, My Shortlist, My Grit Guides). Saved to the feature folder for retro comparison. Captures the pre-state for any regression questions later.

2. **`src/components/Layout.jsx` refactored.** The horizontal nav strip is replaced with a sandwich (hamburger) icon that opens/closes a drawer. The drawer renders the same entries currently rendered by the horizontal nav, sourced from `src/lib/navLinks.js`. The drawer state (open/closed) is component-local; no global state or persistence in Phase 1.

3. **Drawer behavior matches the prototype.** Reference: `prototypes/cmg/coach-message-generator.html` lines 100–125 (the `.nav-drawer` styling). The prototype renders the drawer in its open state for visual reference; production renders the drawer closed by default with the sandwich icon at the top-left of the topbar.

4. **Drawer themes correctly under all live partner-school slugs.** The drawer consumes `var(--brand-primary-deep)` and `var(--parchment)` (or equivalent semantic tokens) — no hardcoded colors. Verify the drawer renders correctly under `data-school-theme="bc-high"` and `data-school-theme="belmont-hill"`.

5. **Five-page smoke test.** Visit each of the five existing Student View pages (Home, My Profile, My Grit Fit, My Shortlist, My Grit Guides) and confirm:
   - The sandwich icon renders at the top-left.
   - Clicking the icon opens the drawer with all five nav entries plus any other entries from `navLinks.js`.
   - Clicking a drawer entry navigates correctly.
   - The active page's entry is visually marked in the drawer.
   - The page content area below the topbar renders byte-identically to the pre-refactor screenshot.
   - No console errors on any of the five pages.

**Exit criterion:** All five outputs complete. The smoke test passes on all five pages. The horizontal nav is fully removed from `Layout.jsx`. The CMG component build cannot begin until this phase completes.

**Failure handling:** If the smoke test reveals that a Student View page has its own nav rendering (rather than consuming the centralized `Layout.jsx` nav), pause and escalate to the operator. The refactor scope was estimated assuming a centralized nav; per-page replicas would mean a bigger lift than budgeted for in this sprint. Options would be (a) extend the sandwich phase to also refactor per-page nav code, (b) ship the sandwich for the central case and accept per-page nav remnants as carry-forward, or (c) revert the refactor and re-scope as a separate sprint. Operator decides.

---

### Phase 4 — Component scaffolding and routing (Scribe leads, blocks on Phase 1 + Phase 2 + Phase 3)

Create the page-level component and the new route. Mount under the Student View nav.

**Required outputs:**

1. **New route added** to the Student View router at `/coach-messages` (or repo's URL convention for Student View pages).

2. **`<CoachMessageGeneratorPage>`** component scaffolded with:
   - Sub-components: `<ScenarioGallery>`, `<MessageBuilder>` (with `<FormPane>` and `<PreviewPane>`), `<MessageHistory>`.
   - Profile data fetched on mount from `public.profiles` for the authenticated student.
   - Shortlist data fetched on mount.
   - Initial render shows the gallery; builder is hidden until a scenario is selected.

3. **Nav entry added** to `src/lib/navLinks.js`: "Coach Message Generator," sixth in order after Grit Guides. Confirm it renders in the new sandwich drawer (built in Phase 3).

4. **Smoke test:** Navigate to the page from the sandwich drawer; gallery renders with all 11 scenario cards in the correct sections.

**Exit criterion:** Page is reachable, gallery renders, no console errors.

---

### Phase 5 — Form pane with phase-by-phase reveal (Scribe leads, blocks on Phase 4)

Build the form pane with the five phases and reveal animation.

**Required outputs:**

1. **`<FormPane>`** with five `<Phase>` sub-components:
   - Phase 1: Channel & School (channel toggle, school picker from shortlist)
   - Phase 2: Event Context (scenario-specific — only renders for scenarios that need event details: 2, 7, 8)
   - Phase 3: Coach Recipients (Position Coach last name, Recruiting Area Coach last name, optional Twitter handles)
   - Phase 4: Your Profile (auto-filled, editable)
   - Phase 5: Closing Questions (Junior Day, Camp checkboxes — only for scenarios that include them)

2. **Reveal logic:** Each phase animates in (opacity 0→1, translateY 10px→0, ~500ms) when the prior phase's `required_form_fields` are filled. Phases composed entirely of auto-filled fields reveal immediately.

3. **Field state management:** Form state is component-local. Auto-filled fields are pre-populated from profile but remain editable. Edits do not propagate back to the profile.

4. **Scenario-aware rendering:** When a scenario is selected, the form pane re-renders to show only the phases relevant to that scenario. (Scenario 1, the public post, has a much shorter form — no recipient phase, no subject, no signature fields.)

**Exit criterion:** Selecting a scenario card from the gallery mounts the builder; phases reveal correctly as the user fills them; auto-fill is visually distinguished.

---

### Phase 6 — Preview pane with channel/recipient toggles (Scribe leads, blocks on Phase 5)

Build the preview pane with live message rendering, channel toggle behavior, and recipient tabs.

**Required outputs:**

1. **`<PreviewPane>`** with:
   - Preview header (title + format badge)
   - Recipient tabs (Position Coach / Recruiting Area Coach for coach-targeted scenarios; absent for Scenario 1)
   - Recruiting Coordinator fallback callout (unconditional, per D3.7)
   - Email subject section (rendered only for Email channel + scenarios with a subject template)
   - Preview body (live-substituted)
   - Action row (Copy, Email-to-Self, Reset)

2. **Live substitution:** Preview re-renders on form state change (debounced ~100ms).

3. **Placeholder token styling in the preview:**
   - Unfilled placeholders wrapped in `<span class="placeholder-token">` with burnt-orange treatment.
   - Auto-filled tokens wrapped in `<span class="placeholder-token autofilled">` with sand-tinted treatment.
   - Student-entered text is plain text.

4. **Channel toggle behavior:** Toggle button swaps preview between Email and Twitter formats. Email shows subject + body + email signature; Twitter shows body + twitter signature (no subject).

5. **Recipient tab behavior:** Tabs switch which recipient's draft is shown. Form state for each recipient's last name is independent.

**Exit criterion:** Preview renders correctly for all 11 scenarios; channel toggle works; recipient tabs work; placeholder color-coding is correct.

---

### Phase 7 — Actions and message log (Scribe leads, blocks on Phase 6)

Wire the Copy, Email-to-Self, and Reset actions. Implement message log append.

**Required outputs:**

1. **Copy to Clipboard:**
   - Builds plain-text output (subject + body + signature for Email; body + signature for Twitter) for the active recipient tab.
   - Writes to `navigator.clipboard`.
   - Appends to message log.
   - Shows toast confirmation.

2. **Email to Self:**
   - Builds `mailto:` URL with student email as To, scenario subject as Subject, plain-text body as Body.
   - Opens the URL.
   - Appends to message log with `emailed_to_self: true`.

3. **Reset Form:**
   - Clears all student-filled fields.
   - Restores auto-filled fields to current profile values.
   - Returns to the empty state (Phase 1 only revealed).

4. **Message log append:** Uses the `append_cmg_message_log` RPC from Phase 1. Failure is logged but does not block the user-visible action.

5. **Disable handling:** Email-to-Self button is disabled if `public.profiles.email` is empty, with a tooltip pointing to the profile page.

**Exit criterion:** All three actions work; clipboard contains correct plain text; mailto opens correctly; log entries appear in `cmg_message_log`.

---

### Phase 8 — Message history table (Scribe leads, blocks on Phase 7)

Render the message history table at the bottom of the page.

**Required outputs:**

1. **`<MessageHistory>`** reads from `public.profiles.cmg_message_log`.

2. **Table columns** match the prototype: Date, School, Scenario (tag), Channel (pill), Recipient, Emailed to Self.

3. **Sort:** Descending by `constructed_at`.

4. **Updates:** Table re-fetches or appends in-place after every Copy or Email-to-Self action.

5. **Empty state:** When `cmg_message_log` is empty, show: "No messages yet. Pick a scenario above to get started."

**Exit criterion:** Table renders correctly with at least one log entry; empty state renders correctly for a fresh student.

---

### Phase 9 — Acceptance test pass (Patch + Scribe joint)

Walk through the acceptance criteria in SPEC_FOR_CODE Step 10. Verify each item.

**Required outputs:**

1. **Visual fidelity check:** Side-by-side compare the implementation against the prototype HTML at desktop widths. Document any unintended deviations.

2. **Data fidelity check:** Run substitution against all 11 scenarios with fixture data; confirm output matches expected text.

3. **Behavioral fidelity check:**
   - Selecting each scenario mounts the correct builder configuration.
   - Phase reveal works correctly.
   - Channel toggle works correctly.
   - Recipient tabs work correctly.
   - Copy puts the right text on the clipboard.
   - Email-to-Self opens mailto with the right To, Subject, Body.
   - Reset returns to empty state.
   - Message history updates correctly after each action.

4. **Integration fidelity check:**
   - The five existing Student View pages still render byte-identically.
   - No regression in shortlist read, profile read, or any existing user flow.
   - Migration applied cleanly; rollback script verified on a copy of the staging DB.

**Exit criterion:** Acceptance criteria all pass. Any failures get logged as carry-forward items or fixed in-session.

---

### Phase 10 — Retro filing (operator leads)

Close the session with a retro filed to `docs/specs/.cmg-sprints/sprint-025-retro.md` (or repo convention).

**Retro contents:**

- What shipped (commits, files, tables, RPC functions).
- What didn't ship (any in-scope items that fell out).
- Reframings discovered mid-sprint (any deviations from the SPEC).
- Carry-forward items added to the execution plan.
- Tests run, results.

Update EXECUTION_PLAN.md revision history with sprint completion date.

---

## 4. Definition of done

The sprint is done when all of the following are true:

- [ ] All Phase 1 acceptance criteria from SPEC_FOR_CODE Step 10 pass.
- [ ] The CMG page is reachable from production Student View nav.
- [ ] Migration is applied to production (after staging signoff).
- [ ] At least one real student record has at least one message logged successfully.
- [ ] Retro is filed.
- [ ] EXECUTION_PLAN is updated with completion date.

---

## 5. Out of scope reminder

Things that are NOT in this sprint and should not creep in:

- Phase 2 coach contact picker
- Backend SMTP email-to-self path
- Visual redesign of the sandwich drawer beyond the prototype's reference (drawer mechanics ship this sprint; drawer polish is a v2 candidate)
- Bulk message generation
- Inline editing of past messages
- Twitter character counters
- Auto-adding "Other school" to shortlist
- Any modifications to the content regions of the five existing Student View pages (the nav refactor centralizes in `Layout.jsx`; per-page content is untouched)
- Mobile-specific layout polish beyond the responsive breakpoints in the prototype

If any of these creep into the session, the operator pauses and either explicitly extends scope or carries the item forward.

---

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `public.profiles` column names don't match the prototype's assumptions | Phase 1 Output 1 catches this against DATA_INVENTORY.md Section 3. Pause and decide before Phase 4. |
| Existing nav is not centralized in `Layout.jsx` (per-page replicas exist) | Pre-flight checklist surfaces this. If discovered mid-Phase-3, the failure-handling escalation path applies (operator picks: extend scope, ship partial, or revert). |
| Sandwich drawer regresses one of the five Student View pages | Phase 3 smoke test catches before any CMG-component work begins. Pre-refactor screenshots provide the comparison baseline. Phase 3 cannot exit until all five pages pass. |
| Drawer themes incorrectly for some partner-school slug | Phase 3 Output 4 explicitly tests both `bc-high` and `belmont-hill`. If a theme has missing tokens, surface to the design-token workstream — don't work around in `Layout.jsx`. |
| Design tokens missing for the test student's slug | Phase 1 Output 3 catches this. If the `bc-high` theme block is missing tokens, the CMG renders against `:root` defaults (not broken, but unbranded). Surface to the design-token workstream; do not work around in the CMG. |
| Mailto link doesn't open mail client on some corporate-managed devices | Documented as a known limitation; the Copy path is the always-works fallback. |
| Profile auto-fill data is incomplete for the test student | Backfill the test student in staging before sprint; fall back to seeded fixture data if backfill is blocked. |
| `cmg_message_log` JSONB append RPC fails under concurrent writes | Atomic `||` operator handles this at the Postgres level; smoke-test with rapid successive appends in Phase 1. RPC is `SECURITY INVOKER` so RLS enforces correct ownership. |
| Confusion between `cmg_message_log` and `public.coach_contacts` | DESIGN_NOTES D3.9 and the migration `COMMENT ON COLUMN` document the distinction. Both are referenced in the SPEC for future readers. |
| Template wording deviates from the docx during transcription | Phase 2 verification compares each substituted output against a fixture file derived directly from the docx. |
| Component re-render performance is poor with live preview | Debounce form state changes (~100ms) before re-rendering preview; profile only if needed. |
| `useSchoolIdentity()` returns null for some test students | Confirms the design-token wrapper falls back to neutral `:root` tokens — page is still usable, just unbranded. Surface as a `useSchoolIdentity` bug, not a CMG bug. |
| Sprint runs long because two deliverables (nav refactor + CMG) packed in | Expected duration revised to 120–150 minutes. If Phase 3 takes longer than 30 minutes, operator considers ending the session at Phase 3 close and re-scoping the CMG-component build as a follow-on sprint. |

---

## 7. References

- `coach-message-generator.html` — visual ground truth
- `README.md` — sprint orientation
- `DESIGN_NOTES.md` — locked decisions and rationale
- `SPEC_FOR_CODE.md` — build-time spec
- `EXECUTION_PLAN.md` — multi-sprint forward plan
- **DATA_INVENTORY.md** — canonical schema map. Required reading before Phase 1.
- Coach Communication Generator template docx — wording source
- Sprint Mode Primer — `_org/primers/sprint-mode-primer.md`
- Scoreboard sprint (precedent) — `prototypes/recruiting-scoreboard/` (note: predates design-token system; visual model has been superseded for the CMG)
