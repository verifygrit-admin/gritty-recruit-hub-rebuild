# Sprint 025 — CMG Phase 1 + Sandwich Nav — Manual Acceptance Checklist

**Date authored:** 2026-05-12
**Run against:** production deploy after merging master through the final Sprint 025 Phase 9 commit (base SHA 07c9356 or later).
**Operator:** runs this manually with a real student account (recommended: Thomas Girmay on the `bc-high` slug; secondary verification on `belmont-hill`).
**Companion artifacts:** the Playwright suite (`tests/e2e/cmg-acceptance.spec.ts`) and unit suite (`tests/unit/cmg-*`) cover the automated path. This checklist is the operator-eye gate on top of those.

---

## Pre-flight

- [ ] Confirm `0047_profiles_add_cmg_message_log` migration applied on the target environment. Verify `public.profiles.cmg_message_log` column exists (type `jsonb`, default `'[]'`) and `public.append_cmg_message_log(uuid, jsonb)` RPC is callable.
- [ ] Confirm GIN index `idx_profiles_cmg_message_log_gin` exists on the column.
- [ ] Confirm test student profile has every auto-fill column populated: `name`, `grad_year`, `position`, `high_school`, `state`, `gpa`, `hudl_url`, `twitter`, `height`, `weight`, `email`.
- [ ] Confirm test student has at least one row in `public.short_list_items` (so the school picker has a non-empty default list).
- [ ] Confirm `useSchoolIdentity()` resolves the test student to `bc-high` (or whichever slug is current).
- [ ] Open browser at viewport 1280x800 (desktop) and a second tab/device emulation at 375x800 (mobile). Run desktop checks first, then mobile.
- [ ] Open browser dev tools to monitor the console for warnings, errors, and 4xx/5xx network traffic.
- [ ] Capture baseline screenshot of the deployed `/home` page so visual deviations have a ground truth.

---

## 1. Sandwich Nav (Phase 3)

- [ ] At `/home` (signed in as student), sandwich icon visible at top-left at desktop viewport.
- [ ] At `/home` (signed in as student), sandwich icon visible at top-left at mobile viewport.
- [ ] Click sandwich icon at desktop — drawer slides in from the LEFT.
- [ ] Click sandwich icon at mobile — drawer slides up from the BOTTOM.
- [ ] Drawer panel shows 6 nav links in this order: HOME, MY PROFILE, MY GRIT FIT, MY SHORTLIST, MY GRIT GUIDES, COACH MESSAGES.
- [ ] Active route is visually marked (underline + bold). Verify on each of the 6 routes by navigating one at a time.
- [ ] Press Escape — drawer closes.
- [ ] Click outside the drawer (backdrop region) — drawer closes.
- [ ] Click any nav link in the drawer — drawer closes AND navigation occurs.
- [ ] Per-school theming applies to the drawer chrome: drawer renders with the `bc-high` token palette under that slug.
- [ ] Per-school theming under `belmont-hill`: drawer recolors correctly with no leftover `bc-high` colors.
- [ ] No console warnings or errors on drawer open/close cycle.
- [ ] Drawer state does not persist across page navigations (closed by default after route change).
- [ ] [SCREENSHOT REQUIRED] Drawer open state, desktop, `bc-high` theme.
- [ ] [SCREENSHOT REQUIRED] Drawer open state, mobile, `belmont-hill` theme.
- [ ] [SCREENSHOT REQUIRED] Each of the 5 pre-existing Student View pages (Home, My Profile, My Grit Fit, My Shortlist, My Grit Guides) with the drawer closed — confirm content region renders byte-identically to the pre-sprint baseline.

---

## 2. CMG Page Entry (Phase 4)

- [ ] Navigate to `/coach-messages` via the drawer.
- [ ] Page header reads "Coach Messages".
- [ ] Intro copy renders below the header (matches the prototype copy verbatim).
- [ ] ScenarioGallery renders below intro with two sections in this order: "Public Posts" (1 card) then "Coach Messages" (10 cards).
- [ ] Public-post card uses the `var(--twitter-accent)` accent color (not the school's brand primary).
- [ ] Each of the 10 coach-message cards shows a channel-pattern label matching the scenario's `channel_pattern` (`dm-first` or `email-first`).
- [ ] Scenario card order in the gallery matches the prototype.
- [ ] No console errors on `/coach-messages` mount.
- [ ] [SCREENSHOT REQUIRED] Scenario gallery, full page, desktop, `bc-high` theme.

---

## 3. Per-Scenario Validation (11 scenarios)

For each scenario, validate four things in order: card placement and label, builder reveal sequence, Phase 2 fields, preview composition (subject + body + signature), and action button state.

### Scenario 1 — Post-Camp Highlights (`public_post`, twitter-public)

- [ ] Card displays in the Public Posts section with channel label "X/Twitter post".
- [ ] On select: builder mounts, smooth-scrolls into view. Phase reveal sequence: Phase 1 -> Phase 4 only (Phases 2, 3, 5 suppressed because no recipient and no closing questions; Phase 2 still renders for camp fields).
- [ ] Phase 1 — channel toggle SUPPRESSED (only school picker rendered; public post is twitter-only).
- [ ] Phase 2 — 3 fields render: Camp Name, Position Coach Twitter handle (helper text "@-prefixed"), Head Coach Twitter handle ("@-prefixed"). Both handle fields show helper "Phase 2 will replace this with a picker once college coach data is loaded."
- [ ] Phase 3 — HIDDEN (no recipient phase for public posts).
- [ ] Phase 4 — auto-fill fields visible: `name`, `grad_year`, `position`, `high_school`, `state`, `gpa`, `height`, `weight`, `hudl_url`, `twitter`. All show the auto-filled treatment (sand-tinted bg, "auto-filled" pill).
- [ ] Phase 5 — HIDDEN (`closing_questions: "neither"`).
- [ ] Preview: NO recipient tabs. NO subject line. Body substitutes `[Name of Camp]`, `@[Position Coach]`, `@[Head Coach]` correctly. `[Attach Twitter Video Highlights from Camp]` renders as an instructional callout (NOT substituted in v1).
- [ ] Signature: Twitter signature renders (3 lines: name / class line / HS name). No Twitter profile link line.
- [ ] Action row — Copy: ENABLED. Email-to-Self: HIDDEN (twitter channel).
- [ ] Click Copy: toast appears; MessageHistory gains a row with channel pill "X/Twitter".
- [ ] Reset: clears Phase 2 form fields; keeps the scenario selected and school selected; auto-fill fields remain populated from profile.

### Scenario 2 — Camp Follow-Up (`coach_message`, dm-first)

- [ ] Card displays in Coach Messages with channel label "DM first, email fallback".
- [ ] On select: builder mounts. Reveal sequence: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5.
- [ ] Phase 1 — channel toggle present (Email | Twitter). School picker present (defaults to shortlist).
- [ ] Phase 2 — 2 fields: Camp Name, Camp Location (`[Name of Location]`).
- [ ] Phase 3 — recipient inputs: Position Coach last name AND Recruiting Area Coach last name. Recipient tabs in preview render both.
- [ ] Phase 4 — full auto-fill set.
- [ ] Phase 5 — 2 optional checkboxes: Junior Day question, Camp question. Each checkbox toggles whether `[Junior Day Question]` / `[Camp Question]` token renders content.
- [ ] Preview subject (Email channel): `Nice to meet you at [Camp Name] | [Abbrev Grad Year] [Position] | [HS Name]` — substituted (e.g., "Nice to meet you at Stonehill Camp | '27 LB | BC High").
- [ ] Preview body substitutes `[Last Name]` per active recipient tab. `[School Namel]` (verbatim typo) resolves to the same school name as `[School Name]`.
- [ ] Recruiting Coordinator fallback callout rendered unconditionally below the preview body (D3.7).
- [ ] Email signature: 4 lines including Twitter profile link.
- [ ] Twitter channel: subject HIDDEN. Body unchanged. Signature is 3-line Twitter variant (no profile link).
- [ ] Action row — Copy: ENABLED. Email-to-Self: ENABLED (profile.email populated).
- [ ] Reset clears Phase 2/3/5 fields; auto-fill stays populated; scenario stays selected.

### Scenario 3 — Coach Followed Me on X (`coach_message`, dm-first)

- [ ] Card displays in Coach Messages with channel label "DM first, email fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 3 -> Phase 4 -> Phase 5. (Phase 2 SUPPRESSED — no event-context fields.)
- [ ] Phase 3 — recipient inputs: Position Coach last name + Recruiting Area Coach last name. Tabs in preview.
- [ ] Phase 5 — Junior Day + Camp question checkboxes.
- [ ] Preview subject (Email): `Thank you for the follow! | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]`.
- [ ] Preview body substitutes `[School Name]` (canonical, no typo) and `[Last Name]`.
- [ ] Recruiting Coordinator fallback callout present.
- [ ] Email + Twitter channel signatures correct as in Scenario 2.
- [ ] Copy + Email-to-Self both functional.

### Scenario 4 — Introducing Myself (`coach_message`, email-first)

- [ ] Card displays with channel label "Email first, DM fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 3 -> Phase 4 -> Phase 5 (no Phase 2).
- [ ] Phase 3 — Position Coach + Recruiting Area Coach last names. Tabs.
- [ ] Phase 5 — Junior Day + Camp question checkboxes.
- [ ] Preview subject: `Completed Recruiting Questions | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]`.
- [ ] Body has NO `[Twitter profile link]` line (this scenario's body omits it — verify against `body_template`).
- [ ] Recruiting Coordinator fallback callout present.
- [ ] Copy + Email-to-Self functional.

### Scenario 5 — Reply to Email Blast (`coach_message`, email-first)

- [ ] Card displays with channel label "Email first, DM fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 3 -> Phase 4 -> Phase 5.
- [ ] Phase 3 — Position Coach + Recruiting Area Coach last names. Tabs.
- [ ] Phase 5 — Junior Day + Camp question checkboxes.
- [ ] Preview subject (Email channel): **NO subject section rendered** (subject template intentionally null — student replies on the existing email thread).
- [ ] Helper text shown in place of subject: clarifying that the student replies on the existing thread (matches prototype copy).
- [ ] Body substitutes correctly; Twitter profile link line present.
- [ ] Copy + Email-to-Self functional. Email-to-Self mailto URL emits an empty subject parameter (verify by inspecting the URL before send).

### Scenario 6 — No Response from AC/RC (`coach_message`, email-first)

- [ ] Card displays with channel label "Email first, DM fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 3 -> Phase 4 -> Phase 5.
- [ ] Phase 3 — single recipient field labeled Head Coach last name AND a separate field for AC/RC last name (`ac_or_rc_last_name`). NO recipient tabs in preview (single recipient: head_coach).
- [ ] Phase 5 — Junior Day + Camp question checkboxes.
- [ ] Preview subject: `Completed Recruiting Questions | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]`.
- [ ] Body substitutes head coach `[Last Name]` AND `[Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact]` correctly in their respective positions.
- [ ] Recruiting Coordinator fallback callout present.
- [ ] Copy + Email-to-Self functional.

### Scenario 7 — Pre-Camp Notice (`coach_message`, email-first)

- [ ] Card displays with channel label "Email first, DM fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4. (Phase 5 SUPPRESSED — `closing_questions: "neither"`.)
- [ ] Phase 2 — 2 fields: Camp Name, Camp Date (`[Date]`).
- [ ] Phase 3 — Position Coach + Recruiting Area Coach last names. Tabs.
- [ ] Phase 5 — HIDDEN.
- [ ] Preview subject: `Attending [Camp Name] | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]`.
- [ ] Body substitutes `[Name of the Camp]` (variant) and `[College Name]` (variant of school_name) to the same form values as their canonical tokens.
- [ ] `[Attach camp flyer image to email]` rendered as an instructional callout (not substituted).
- [ ] Recruiting Coordinator fallback callout present.
- [ ] Copy + Email-to-Self functional.

### Scenario 8 — Post-Visit Thank You (`coach_message`, dm-first)

- [ ] Card displays with channel label "DM first, email fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4.
- [ ] Phase 2 — 3 fields: Event Name (`[Name of Event]`), Day of Week (`[day of the week on which the event occurred]`), Thank-You Sentence (multi-line text area for `[Thank the coach by sharing a sentence...]`).
- [ ] Phase 3 — Position Coach + Recruiting Area Coach last names. Tabs.
- [ ] Phase 5 — HIDDEN.
- [ ] Preview subject (Email): `Thank you! | [Your Full Name] [Abbrev Grad Year] [Position] | [HS Name]`.
- [ ] Body substitutes Event Name, day-of-week, thank-you sentence (preserving newlines if entered), and `[School Name]`.
- [ ] Copy + Email-to-Self functional.

### Scenario 9 — No Reply: First Nudge (`coach_message`, dm-first)

- [ ] Card displays in the No Response Sequence group (3 separate cards per D2.3) with channel label "DM first, email fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 3 -> Phase 4.
- [ ] Phase 3 — Position Coach + Recruiting Area Coach last names. Tabs.
- [ ] Phase 5 — HIDDEN.
- [ ] Preview subject: **NO subject section rendered** (subject template intentionally null — same-thread nudge pattern preserves the prior thread's subject).
- [ ] Body substitutes `[Abbv Grad Year]` (variant typo) AND `[GPA]` (variant of `[Current GPA]`) AND `[Height]`, `[Weight]`, `[HS Name]`, `[Hudl film link]` from profile. All are profile-sourced auto-fills — verify their preview spans carry the autofilled visual treatment.
- [ ] `[School Name]` (canonical, from form) renders with the plain (student-entered) treatment.
- [ ] Email-to-Self mailto URL emits empty subject parameter.
- [ ] Copy + Email-to-Self functional.

### Scenario 10 — Bump to the Top (`coach_message`, dm-first)

- [ ] Card displays in the No Response Sequence group with channel label "DM first, email fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 4 (Phase 3 SUPPRESSED — `[Last Name]` is not in the body for this scenario; required_form_fields is `["school_name"]` only).
- [ ] Phase 3 — HIDDEN (no last-name field required; body opens with "Hi Coach -" generically).
- [ ] Phase 5 — HIDDEN.
- [ ] Preview subject: **NO subject section rendered**.
- [ ] Body substitutes `[School Name]` only.
- [ ] Recipient tabs HIDDEN (no per-recipient last_name diff possible).
- [ ] Copy + Email-to-Self functional.

### Scenario 11 — Respectful Close (`coach_message`, dm-first)

- [ ] Card displays in the No Response Sequence group with channel label "DM first, email fallback".
- [ ] Reveal sequence: Phase 1 -> Phase 4 (Phase 3 SUPPRESSED — `required_form_fields` is empty).
- [ ] Phase 2, 3, 5 — all HIDDEN.
- [ ] Preview subject: **NO subject section rendered**.
- [ ] Body renders verbatim with NO substitutions required (no bracketed tokens in body).
- [ ] Recipient tabs HIDDEN.
- [ ] Copy + Email-to-Self functional.

- [ ] [SCREENSHOT REQUIRED] Builder open on Scenario 2, Email channel, both Phase 2 and Phase 5 visible.
- [ ] [SCREENSHOT REQUIRED] Preview pane on Scenario 9, Twitter channel, showing autofilled token spans (sand-tinted) vs form-filled spans (plain).

---

## 4. Recipient Tab Swap (Phase 6)

- [ ] On Scenario 2, fill different last_name values for Position Coach (e.g., "Smith") and Recruiting Area Coach (e.g., "Jones").
- [ ] Click the Recruiting Area Coach tab — preview body re-substitutes `[Last Name]` -> "Jones".
- [ ] Click the Position Coach tab — preview body reverts to "Smith".
- [ ] Both values persist across multiple tab switches (no clear-on-flip).
- [ ] Channel toggle state persists across recipient tab swaps.
- [ ] On Scenario 6 (head_coach only), confirm no recipient tabs render and the Phase 3 head-coach last name flows directly into preview substitution.

---

## 5. Action Buttons (Phase 7)

- [ ] Copy button: click -> toast "Copied to clipboard" appears (bottom-right), fades in/out over ~3s.
- [ ] Paste the clipboard contents into a plain-text editor and confirm exact match to the rendered preview (subject + body + signature for Email; body + signature for Twitter; substitutions resolved, no `[Bracketed Tokens]` remaining for fields that were filled).
- [ ] After Copy: a new row appears in MessageHistory below.
- [ ] Email-to-Self: click -> opens the OS mail client with mailto URL pre-loaded. Confirm To = profile.email, Subject = scenario subject template substituted (or empty for null-subject scenarios), Body = substituted body + signature.
- [ ] Email-to-Self disabled state: temporarily clear `profile.email` via the profile page (or use a test account with no email) -> button renders disabled with tooltip pointing to the profile page.
- [ ] Reset: click -> Phase 2/3/5 form fields clear; auto-fill fields refresh from profile; scenario stays selected; school stays selected; channel toggle and recipient tab state persist.
- [ ] Twitter channel: Copy works (writes body + 3-line signature only). Email-to-Self HIDDEN.
- [ ] Long-body advisory toast: select Scenario 2, enable both closing questions with long custom text producing a body of >2000 characters, click Email-to-Self. Advisory toast precedes the mailto open warning that some mail clients truncate long mailto bodies.

---

## 6. Message History (Phase 8)

- [ ] After 1 Copy action: MessageHistory shows 1 row with columns: Date (renders "just now" or current timestamp), School, Scenario tag, Channel pill, Recipient label, Preview snippet (first ~80 chars + ellipsis).
- [ ] After 5 mixed actions (mix of Copy + Email-to-Self across 2-3 scenarios): all 5 rows present, sorted DESC by `constructed_at`.
- [ ] Rapid successive Copy actions (3 in quick succession): all 3 rows appear (atomic append verified).
- [ ] Empty state copy: log out, sign in as a fresh test student with empty `cmg_message_log` — "No messages yet. Pick a scenario above to get started." rendered (exact copy from SPRINT_025_SESSION_SPEC Phase 8).
- [ ] Channel pill color: Email rows use brand-primary; Twitter rows use `var(--twitter-accent)`.
- [ ] Page reload preserves the history (data is round-tripping through `public.profiles.cmg_message_log`).
- [ ] [SCREENSHOT REQUIRED] MessageHistory populated state with 3+ rows of mixed channels.
- [ ] [SCREENSHOT REQUIRED] MessageHistory empty state.

---

## 7. Edge Cases and Visual Treatment

- [ ] Auto-fill visual treatment on Phase 4 fields: sand-tinted background (`var(--autofill-bg)`), dark sand text, small "auto-filled" pill badge to the right of the label.
- [ ] Auto-fill fields remain editable; editing a field does NOT propagate the edit back to `public.profiles`.
- [ ] Unfilled token spans in preview: burnt-orange dotted underline (`var(--token-unfilled)`).
- [ ] Autofilled token spans in preview: sand-tinted background tint matching the form-side autofill treatment.
- [ ] Filled-from-form spans in preview: plain text, no highlight, no underline.
- [ ] School typeahead: select "Other school not in my shortlist" -> typeahead opens against the full schools table (~662 rows). Verify keyboard navigation (Arrow up/down, Enter to select, Escape to close).
- [ ] Selecting "Other school" via typeahead: school is used for preview substitution but is NOT auto-added to the shortlist (per carry-forward register).
- [ ] Per-school theming on `/coach-messages`: drawer chrome + CMG component palette both reflect the active school slug. Confirm under `bc-high` and `belmont-hill`.
- [ ] Token variants resolve correctly: open Scenario 2 with all camp fields populated -> `[School Name]` and `[School Namel]` both resolve to the same value in the preview (verify by inspecting the substituted body).
- [ ] Token variants on Scenario 9: `[Abbv Grad Year]` and `[Abbrev Grad Year]` (if both were present anywhere) resolve identically; `[GPA]` and `[Current GPA]` resolve identically.
- [ ] Scenario 1 instructional placeholder `[Attach Twitter Video Highlights from Camp]` renders as a callout in preview — NOT substituted.
- [ ] Scenario 7 instructional placeholder `[Attach camp flyer image to email]` renders as a callout in preview — NOT substituted.

---

## 8. Cross-Browser Smoke

- [ ] Chrome desktop — all critical paths work (gallery, builder, channel toggle, recipient tabs, Copy, Email-to-Self, MessageHistory).
- [ ] Safari desktop — verify mailto navigation opens the OS Mail app, clipboard write succeeds, transition animations are smooth.
- [ ] iOS Safari (or mobile emulator) — drawer slides from bottom, school typeahead opens, mailto opens the Mail app, Copy writes to clipboard.
- [ ] Firefox desktop — verify clipboard write (Firefox sometimes prompts for permission first time).
- [ ] On any of the above: verify the preview pane does not horizontally overflow on a 1280-wide viewport, and on mobile the form pane and preview pane stack vertically.

---

## 9. Console Cleanliness and Network

- [ ] No React warnings (no key warnings, no missing-dependency warnings) on `/coach-messages` navigation.
- [ ] No React warnings on builder mount/unmount cycle (select a scenario, close it, select another).
- [ ] No 4xx or 5xx network errors in the network tab during normal use.
- [ ] No CORS errors against Supabase endpoints.
- [ ] No CSP violations in the console.
- [ ] `append_cmg_message_log` RPC call returns 2xx on every Copy and Email-to-Self.
- [ ] No errors thrown on log-append failure (the failure must be silent-to-user but logged to console — verify by simulating an offline state, hitting Copy, and confirming Copy itself still succeeds).

---

## 10. Integration Fidelity (regression check)

- [ ] Visit `/home` — content region renders byte-identically to the pre-sprint baseline. Only the top-of-page nav is changed.
- [ ] Visit `/profile` — no regression in profile read or any profile-update path.
- [ ] Visit `/grit-fit` — page renders as before.
- [ ] Visit `/shortlist` — shortlist read path works; any pre-existing shortlist write paths still work.
- [ ] Visit `/grit-guides` — page renders as before.
- [ ] After visiting `/coach-messages` and constructing one message, return to `/shortlist` — confirm no side effects.
- [ ] Migration rollback script verified on a copy of the staging DB (`cmg_message_log` column drop + RPC drop) leaves the schema in the pre-migration state with no orphaned objects.

---

## Known Follow-ups (NOT BLOCKING this sprint)

These are documented as known limitations or deferred work. They do not block sprint signoff. Cross-reference: `EXECUTION_PLAN.md` Section 5 (Carry-forward register).

1. **Phase 2 coach contact picker** — blocked on `public.college_coaches` population. Replaces student-filled coach last_name and @handle inputs with database-backed dropdown pickers. Scoped as a separate sprint.
2. **"Emailed to Self" badge on MessageHistory rows** — not rendered in Phase 1. The `emailed_to_self: true` flag IS persisted in `cmg_message_log` records; only the visual badge is deferred.
3. **Scenarios 9/10/11 email subject is intentionally null** — same-thread nudge pattern. The email client preserves the prior thread's subject line on reply. The mailto handler emits an empty subject parameter accordingly. Not a bug.
4. **"BC High" hardcoded in docx subjects for Scenarios 2 and 3** — corrected to `[HS Name]` in `cmgScenarios.ts`. The docx itself is not modified (it remains the archived wording source). Flagged for downstream docx-source cleanup.
5. **Token variant typos preserved verbatim in `cmgScenarios.ts`** — `[School Namel]`, `[Abbv Grad Year]`, `[Name of Camp]` vs `[Name of the Camp]`, `[College Name]` vs `[School Name]`, `[GPA]` vs `[Current GPA]`. All routed through the `SUBSTITUTION_TOKENS` dispatcher to their canonical fields. A future docx cleanup can collapse the variants; until then the renderer is variant-tolerant by design.
6. **Auto-fill tokens added as `:root` CSS variables** — the Belmont Hill theme override block intentionally does NOT override them (auto-fill is theme-invariant per `DESIGN_NOTES.md`).
7. **Long-body advisory toast** — current implementation fires the advisory BEFORE the mailto open. Future enhancement: intercept mailto failure and surface remediation guidance after the fact.
8. **Toast notification primitive** — if not already present in Student View, may have been added inline this sprint. Track as infrastructure carry-forward for future page reuse.
9. **Auto-add "Other school" to shortlist** — deferred to v2. Selecting "Other school" in the picker uses the school for substitution but does NOT mutate `public.short_list_items`.
10. **Inline editing of past MessageHistory rows** — deferred to v2 or v3.
11. **Twitter character counter for Scenario 1** — deferred; will be reconsidered only if real usage shows that students need it.
12. **Mobile-specific layout polish (touch targets, keyboard handling)** — deferred to v2 contingent on mobile usage share.
13. **Localization / non-English templates** — separate workstream, not yet scoped.
14. **Partner-school theme coverage audit for new schools** — added to the new-school onboarding checklist.

---

## Sign-off

- [ ] Operator sign-off date: ___________
- [ ] Operator name: ___________
- [ ] Environment verified: staging / production (circle one)
- [ ] Test student used: ___________ (slug: ___________)
- [ ] Screenshots captured count: ___ / 10 expected
- [ ] Sprint 025 deployment readiness: READY / BLOCKED (if BLOCKED, list blocking items below)
- [ ] Blocking items (if any):
  - ___________
  - ___________
  - ___________
