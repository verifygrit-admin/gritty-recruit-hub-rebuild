# Coach Message Generator Prototype

A new sixth page in the Student View of GrittyOS Recruit Hub. The Coach Message Generator (CMG) is a dynamic, phase-by-phase form that constructs templated email and Twitter DM messages to college coaches across 11 recruiting scenarios. Output is plain text; students copy to clipboard or email the message to themselves to send from their own account.

This README, plus DESIGN_NOTES, SPEC_FOR_CODE, EXECUTION_PLAN, and the Sprint 025 session spec, live at `docs/specs/.cmg-sprints/`. The visual ground truth (the prototype HTML) lives at `prototypes/cmg/coach-message-generator.html`. Per Sprint Mode Primer Section 9.5, the split keeps the prototype with other product prototypes and keeps sprint-mode docs (retros, execution plans, session specs) in the docs tree.

## Status

**Prototype:** Locked. 11 scenarios, two-pane builder, JSONB-backed message log.
**Sprint:** Sprint 025 — pending kickoff.
**Owner WG:** Student View working group (proposed; confirm at session open).
**Phase strategy:** Phase 1 ships with student-filled coach data (no coach DB). Phase 2 unlocks Position Coach / Recruiting Area Coach pickers once coach contact scraping is complete.
**Decision logs to file before kickoff:**
- `DEC-CFBRB-XXX` locking the prototype as canonical for Sprint 025
- `DEC-CFBRB-XXX` locking the 11-scenario taxonomy (10 coach-targeted + 1 public X post)
- `DEC-CFBRB-XXX` locking the JSONB message-log storage choice (`public.profiles.cmg_message_log`)
- `DEC-CFBRB-XXX` locking the Phase 1 / Phase 2 split (deferring coach picker to post-scrape, blocked on `public.college_coaches` population)
- `DEC-CFBRB-XXX` locking the design-token consumption pattern (CMG consumes Student View tokens via `data-school-theme`; no per-school refactors)

## Files in the feature folders

**In `prototypes/cmg/`** (visual ground truth):

| File | Purpose |
|---|---|
| `coach-message-generator.html` | Visual ground truth. Single-file HTML prototype. Do not modify during the sprint. |

**In `docs/specs/.cmg-sprints/`** (sprint-mode docs):

| File | Purpose |
|---|---|
| `README.md` | This file. |
| `DESIGN_NOTES.md` | Locked decisions with rationale. The "why" document. |
| `SPEC_FOR_CODE.md` | Build-time spec. Database mapping, integration constraints, the contract. |
| `EXECUTION_PLAN.md` | Multi-sprint forward plan from prototype to Phase 2 production. |
| `SPRINT_025_SESSION_SPEC.md` | Session spec for Sprint 025 kickoff. |
| `sprint-025-retro.md` | (Pending) Sprint 025 retro, filed at session close. |

## What the CMG does

The Coach Message Generator renders as a new page in the Student View navigation: **Home | My Profile | My Grit Fit | My Shortlist | My Grit Guides | Coach Message Generator**. On the CMG page, a student:

1. **Picks a scenario** from a card gallery — 1 Public Post (Scenario 1) above a 10-card Coach Messages gallery (Scenarios 2–11).
2. **Fills the dynamic builder form** below the gallery — phases reveal one at a time as prior phases complete. Auto-filled fields (profile data) are visually distinguished from student-filled fields.
3. **Reviews the preview pane** on the right — message renders live as fields are filled. For most coach scenarios, two tabs in the preview (Position Coach / Recruiting Area Coach) show side-by-side recipient versions; a callout instructs students to fall back to the Recruiting Coordinator if neither can be found.
4. **Toggles channel** between Email and Twitter DM. Email includes subject line and signature with redundant Twitter link; Twitter DM strips the subject and renders body-only. Output is plain text in either case.
5. **Copies the message** to clipboard or **emails it to themselves** via `mailto:` link (no backend SMTP in Phase 1) for completion and send from their preferred client.
6. **Sees the message log** at the bottom — every constructed message is recorded in a JSONB column on the student profile, with school, scenario, channel, recipients, and email-to-self flag.

The eleven scenarios:

| # | Title | Channel pattern | Notes |
|---|---|---|---|
| 1 | Post-Camp Highlights | X/Twitter public post | Broadcast post with @-mentions of Position and Head Coaches. Separate "Public Posts" section above the Coach Messages gallery. |
| 2 | Camp Follow-Up | DM → Email | I attended a camp and want to follow up with a coach I met. |
| 3 | Coach Followed Me on X | DM → Email | A coach followed me on X — thank them and introduce myself. |
| 4 | Introducing Myself | Email → DM | Shortlist school hasn't contacted me — I introduce myself first. |
| 5 | Reply to Email Blast | Email → DM | Reply to an unpersonalized email blast and start a real conversation. |
| 6 | No Response from AC/RC | Email → DM | Reached AC or RC, no reply — escalate to Head Coach. |
| 7 | Pre-Camp Notice | Email → DM | I'll be at the camp this coach will attend — heads-up before. |
| 8 | Post-Visit Thank You | DM → Email | After Junior Day, prospect camp, or visit — within 48 hours. |
| 9 | No Reply — First Nudge | DM → Email | First of three follow-ups in the No Response sequence. |
| 10 | Bump to the Top | DM → Email | Second follow-up, 5–7 days after #9. |
| 11 | Respectful Close | DM → Email | Final follow-up, 5–7 days after #10. Graceful, leaves door open. |

The No Response sequence is rendered as three independent cards (not a wizard). Students self-select which message they're sending; sequencing is the student's responsibility, not the app's.

## Critical constraints

**Read-only school data.** The CMG never edits school or shortlist state. It reads from the student's shortlist for the school picker and reads profile data for auto-fill. Adding a school via the "Other school" option does not auto-add to the shortlist in v1 (deferred to v2).

**Phase 1 ships without coach contact data.** Until coach contact scraping is complete (a separate workstream), the Position Coach and Recruiting Area Coach are filled in by the student as free-text last-name inputs. Phase 2 replaces these with dropdown pickers backed by a real coach contact table.

**Output is plain text.** The clipboard payload and the `mailto:` body are both plain text. No HTML email, no rich formatting, no images. Students paste into whatever client they prefer (Gmail, Outlook, iOS Mail, X DM compose box).

**Email-to-self uses `mailto:`, not SMTP.** Phase 1 sends nothing from the server. The student clicks "Email to Myself," and their default mail client opens with To, Subject, and Body pre-populated. Sending happens in the student's own account. This intentionally avoids deliverability, sender reputation, and abuse-vector concerns until the feature has measurable value.

**Message log is fire-and-forget.** The JSONB log captures that a message was constructed, not that it was sent or whether the coach replied. No downstream system infers relationship state from this log; the Recruit Hub's existing recruiting journey tracker remains the source of truth for relationship state. The CMG log answers four questions only: (1) has the student used the CMG for this school? (2) when? (3) email or Twitter? (4) emailed to self?

**Twitter output is treated as DM.** No 280-char counter, no warning, no truncation. Scenario 1 (the public X post) is short enough that this is not a constraint in practice; the public-post output is the only Twitter content that needs to fit a character budget, and its template fits comfortably under 280.

**Additive integration with bundled nav refactor.** The CMG mounts as a new sixth page in Student View. Adding a sixth nav entry pushes the existing horizontal nav past readable density at narrow desktop widths, so Sprint 025 also refactors the Student View nav into a sandwich (hamburger) drawer. The refactor is centralized in `src/components/Layout.jsx`; nav entries continue to be sourced from `src/lib/navLinks.js` (E1 per DATA_INVENTORY.md Section 7). The sandwich refactor ships as a gated phase preceding the CMG component build within the same sprint — see DESIGN_NOTES D3.5 for why this is folded in rather than decoupled.

## Dependencies

**Resolved:**
- Student View design-token system: established. CMG consumes `var(--brand-primary)`, `var(--surface-base)`, etc. and inherits per-school themes via `data-school-theme="<slug>"` on the shell wrapper.
- Auto-fill field visual treatment: theme-invariant CMG-internal tokens (`--autofill-bg` / `--autofill-edge` / `--autofill-text`), tuned in prototype CSS.
- Channel toggle pattern: established in prototype.
- Recipient tabs (Position Coach / Recruiting Area Coach): established in prototype.
- 11-scenario taxonomy and template wording: locked from the Coach Communication Generator template docx.
- Phase 1 / Phase 2 split for coach contact data: locked. Phase 2 blocks on `public.college_coaches` being populated (currently 0 rows per DATA_INVENTORY.md Section 3).
- JSONB message log on `public.profiles.cmg_message_log`: locked. Deliberately distinct from `public.coach_contacts` (the relationship-state ledger; see DESIGN_NOTES D3.9 for the non-collision rationale).
- Sandwich nav refactor: in scope for Sprint 025, gated as a phase before the CMG component build (DESIGN_NOTES D3.5).

**Unresolved — needs sanity check before build:**
- `public.profiles` column verification: confirm the column names in DATA_INVENTORY.md Section 3 entry on `public.profiles` match the live schema. Expected columns (per DATA_INVENTORY): `name`, `grad_year`, `position`, `high_school`, `state`, `gpa`, `hudl_url`, `twitter`, `email`. NOTE: `name` (not `full_name`), `high_school` (not `hs_name`), `gpa` (not `cgpa`), `twitter` (not `twitter_url`) — these are the codebase's actual column names, not the prototype's display labels. Patch validates against the live schema at sprint start.
- `public.short_list_items` read access: confirm the school picker can pull the student's shortlist (`unitid`, `school_name`, plus `public.schools.type` for tier display: P4/G6/FCS/D2/D3). Matches the read pattern at `src/pages/ShortlistPage.jsx:417, 424, 693`.
- `cmg_message_log` migration: confirm the column does not already exist on `public.profiles` with a conflicting shape. If it doesn't exist, add it as part of Step 1 (migration `0047_profiles_add_cmg_message_log.sql`).
- Design-token coverage: confirm `useSchoolIdentity()` resolves the student's slug correctly for both BC High and Belmont Hill (the two current partner schools per DATA_INVENTORY Section 7 entries on `recruits-schools.js`). If a partner school's theme is missing tokens the CMG needs, surface to the design-token workstream — don't ship workarounds.
- Existing `Layout.jsx` nav implementation: confirm the current horizontal-nav code is centralized enough that the sandwich refactor is a focused edit. If the nav has been distributed across multiple components (per-page replicas, conditional renders, etc.), surface that to the working group before sprint kickoff — it changes the scope of the refactor phase.

## Sprint scope (recommended for Sprint 025)

In scope:
- Build the CMG page as a new route in Student View
- Wire the eleven scenario templates with placeholder substitution
- Implement the phase-by-phase form reveal pattern from the prototype
- Wire auto-fill from `public.profiles` (per DATA_INVENTORY.md column mapping; see SPEC_FOR_CODE Step 1)
- Wire the school picker to `public.short_list_items` (read-only, matching the existing Shortlist read pattern)
- Implement the channel toggle (Email / Twitter DM) with subject and signature differences
- Implement the recipient tabs (Position Coach / Recruiting Area Coach) with copy/email actions per tab
- Implement the Copy to Clipboard action
- Implement the Email-to-Self `mailto:` action
- Add the `cmg_message_log` JSONB column to `public.profiles` (migration `0047_profiles_add_cmg_message_log.sql`) plus the `append_cmg_message_log` RPC
- Implement fire-and-forget logging on every Copy or Email-to-Self action
- Render the message history table on the page, sorted descending by date
- Refactor the Student View nav into a sandwich (hamburger) drawer in `src/components/Layout.jsx`; verify the five existing Student View pages still render correctly through the drawer before starting CMG component work
- Add the CMG entry to `src/lib/navLinks.js` so it appears as the sixth entry in the new sandwich menu

Out of scope (this sprint):
- Phase 2 Position/Recruiting Area Coach picker (separate sprint, blocked on `public.college_coaches` being populated)
- Writing to `public.coach_contacts` (the relationship-state ledger; CMG produces drafts, not contact records — see DESIGN_NOTES D3.9)
- Defining new partner-school themes (separate design-token workstream)
- Backend SMTP email-to-self (Phase 1 uses `mailto:` only)
- Twitter character counters or warnings
- Auto-adding "Other school" entries to the shortlist
- Relationship-state inference from the CMG log (`public.short_list_items.recruiting_journey_steps` remains the source of truth for relationship state)
- Inline editing of completed messages in the history table
- Bulk message generation (one scenario × multiple schools at once)
- Mobile-specific layout polish (the responsive breakpoint in the prototype is sufficient for v1)
- Visual redesign of the sandwich drawer beyond the prototype's reference (the drawer mechanics ship in this sprint; further drawer polish is a v2 candidate if real usage shows friction)

## Template note

This is a template for use with all students in the GrittyOS Recruit Hub, not just Thomas Girmay. Thomas's data is in the prototype because the Coach Communication Generator template docx was originally written using his profile as the worked example. Once the CMG is built and wired, every student's CMG page renders with their own profile auto-filled, their own shortlist in the school picker, and their own partner school's theme applied via `data-school-theme`.

## How to view the prototype

Open `coach-message-generator.html` in any modern browser. No build step, no dependencies. Single file.

To preview a different partner-school theme, open the file and change `data-school-theme="bc-high"` on the `.app-shell` div to `data-school-theme="belmont-hill"` (or add a new theme block in the CSS and use its slug).

## Related artifacts

- **Coach Communication Generator template docx**: source of all 11 scenario message bodies (uploaded to Sprint 025 prep session, archived to the feature folder on sprint kickoff).
- **DATA_INVENTORY.md**: canonical map of every storage location in `gritty-recruit-hub-rebuild`. The CMG depends on Section 3 entries for `public.profiles`, `public.short_list_items`, `public.schools`, and `public.college_coaches`; Section 7 entries for `src/data/recruits-schools.js`, `src/data/school-staff.js`, and `src/lib/navLinks.js`; and the `useSchoolIdentity` hook references.
- **`public.profiles`**: live Supabase table for student profile auto-fill (DATA_INVENTORY.md Section 3, last verified 2026-05-08).
- **`public.short_list_items`**: live Supabase table for the school picker source (DATA_INVENTORY.md Section 3).
- **`public.college_coaches`**: reserved for Phase 2 (currently 0 rows; DATA_INVENTORY.md Section 3 Notes: "Reserved for Phase 2. Sprint 013 coach scheduler does NOT use this table — it uses `coach_submissions`.").
- **Scoreboard prototype** (`prototypes/recruiting-scoreboard/`): precedent for additive Student View page integration and read-only data flow patterns. The Scoreboard's hardcoded palette predates the design-token system and is not the visual model for the CMG.
- **Phase 2 coach scrape workstream**: separate workstream tracked elsewhere; Phase 2 CMG sprint blocks on `public.college_coaches` being populated.
