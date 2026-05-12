# Design Notes — Coach Message Generator

This document captures every decision locked during prototyping, with the rationale for each. When questions arise during the sprint about why something was designed a particular way, this is the answer.

Decisions are organized by the AskUserQuestions round that surfaced them, plus downstream decisions made during construction.

---

## Decisions from Round 1 — core architecture

### D1.1 — Scenario picker: card gallery, 3+ columns

**Decision:** Students choose a scenario from a card gallery laid out as a 3-column grid (collapsing to 2 columns at tablet widths, 1 column on mobile). Each card shows the scenario number, a 2–4 word title, a one-line situation description, and a small channel-pattern label in the upper-right ("DM → Email" or "Email → DM" or "X/Twitter post").

**Rationale:** Three picker presentations were considered: card gallery, decision tree, and dropdown. The dropdown was rejected because eleven scenarios is more than the user can hold in working memory while scrolling — the situations need to be visible to compare against the student's actual circumstance. The decision tree was rejected because the branching logic ("Did the coach contact you?" "Was the email personalized?") would force the student to answer the wrong question first; in practice, students arrive at the CMG already knowing what just happened (a camp, a follow, a blast email) and need to match their situation to a scenario, not be interrogated about it. The card gallery shows all scenarios at once, makes the situations scannable, and lets the channel-pattern label give a hint about how the message will be sent.

### D1.2 — Public Posts separated from Coach Messages

**Decision:** Scenario 1 (the post-camp X/Twitter public post) lives in its own "Public Posts" section above the "Coach Messages" gallery. Card visual treatment differs: a dusty-navy accent stripe instead of the partner-school brand color, and a "X/Twitter post" channel label.

**Rationale:** Scenario 1 is not addressed to a specific coach; it's a broadcast to the public timeline with @-mentions of coaches the student worked with. The "pick a school, pick a coach, build a message" flow doesn't apply. Folding it into the same gallery as the ten coach-targeted messages would mislead students about what the scenario does and would force the builder to special-case scenario 1 internally. A separate section is one extra visual division and saves the builder from carrying that complexity.

The dusty-navy accent (`#3A5A8C`, exposed as `--twitter-accent` in the CMG-internal token set) signals "this is a different channel" without importing X's bright blue, which would clash with most partner-school brand palettes. `--twitter-accent` is theme-invariant — it does not change per partner school, because the channel is the same regardless of which school the student attends.

### D1.3 — Email-to-self via `mailto:`, no backend

**Decision:** The "Email to Myself" action opens the student's default mail client via a `mailto:` link with To (student email), Subject (per scenario), and Body (the constructed message) pre-populated. The server sends nothing. The student clicks Send in their own mail client.

**Rationale:** Three options were considered: `mailto:`, backend SMTP via Supabase edge function, and both. The backend SMTP path was rejected on several grounds: (a) Phase 1 doesn't yet have measurable evidence the email-to-self feature is used; building deliverability and abuse-protection infrastructure for an unproven feature is premature; (b) email from a no-reply server address is more likely to land in Spam than a self-addressed email from the student's own account; (c) the student already has a verified outbox; the CMG should leverage that, not duplicate it. The `mailto:` approach works on every desktop and mobile OS, requires zero backend, and frames the feature honestly: the CMG produces a draft, the student sends it.

The "Both" option was rejected as scope inflation — it would have required toggling logic and two distinct success paths to test. `mailto:` is the v1 path; SMTP is a v2 enhancement only if usage data shows demand.

### D1.4 — Message log: JSONB on `public.profiles`

**Decision:** Constructed messages are logged to a single JSONB column, `public.profiles.cmg_message_log`, holding an array of message records keyed by the student's `user_id` (via the `profiles` row's existing FK to `auth.users.id`). Each record carries: `id` (uuid), `unitid` (integer; references `public.schools.unitid`), `school_name` (text, denormalized for display), `scenario_number`, `scenario_title`, `channel` ("email" or "twitter"), `recipients` (array of "position_coach", "recruiting_area_coach", "recruiting_coordinator", or "broadcast"), `emailed_to_self` (boolean), `constructed_at` (ISO timestamp).

**Rationale:** Three options were considered: localStorage, a Supabase storage bucket as a per-student JSON file, and a JSONB column on the existing `public.profiles` table. localStorage was rejected because cross-device continuity matters — students will construct messages on desktop and review on mobile. A storage bucket file was rejected because the four questions the log needs to answer (used CMG for this school? when? channel? emailed to self?) are simple enough that querying via Postgres JSON operators is cheaper than fetching and parsing a JSON file. A JSONB column on `public.profiles` is queryable, atomic (one document per student), and avoids the overhead of a new SQL table for a log that intentionally does not participate in joins with relationship-state tables.

The choice to live on `public.profiles` (rather than create a new table) is deliberate: `profiles` is the canonical per-student row, every consumer of the CMG will already be reading that row for auto-fill fields, and the JSONB column reuses the existing RLS policies (`profiles` policies grant the owner SELECT/UPDATE on their own row per DATA_INVENTORY.md Section 3). No new RLS configuration is needed.

The deliberate choice not to use a SQL table is the design's most consequential decision: the CMG log is not a relationship-state ledger, and isolating it in JSONB visually communicates that to any future engineer who looks at the schema. The recruiting journey tracker (`public.short_list_items.recruiting_journey_steps`, per DATA_INVENTORY.md) stays the canonical source of truth for relationship state; the CMG log is just a "what did the student build, when" trace. See D3.9 for the explicit non-collision with `public.coach_contacts`.

### D1.5 — Twitter output treated as DM, no character limit

**Decision:** Twitter mode renders the full message body with no 280-character counter and no warning. Scenario 1 (the public X post) is the only Twitter content that needs to fit a character budget, and its template is short enough that no counter is needed in practice.

**Rationale:** All ten coach-targeted scenarios in Twitter mode are DMs, which have no 280-character limit. Adding a counter would either (a) display "no limit" most of the time, which is confusing, or (b) display a count only for Scenario 1, which is inconsistent. Treating Twitter output uniformly as DM-formatted text avoids both. If a student sends the Scenario 1 X post text as written, it fits comfortably under 280 (~250 characters with full placeholders filled).

The simpler treatment also makes the channel toggle behavior more predictable: switching from Email to Twitter strips the subject line and the email signature's structure, and that's the only visible change. No conditional warnings.

### D1.6 — Design tokens consumed, not defined

**Decision:** The CMG consumes the Student View design-token system rather than defining its own palette. Colors are not hardcoded by school. The CMG stylesheet declares `var(--brand-primary)`, `var(--surface-base)`, `var(--ink)`, etc.; the actual values resolve at runtime via the `body.school-{slug}` class set on the document body by the Student View shell (`document.body.classList.add('school-{slug}')` in `Layout.jsx` lines 117–120; consumed via `body.school-belmont-hill { ... }` CSS rules in `src/index.css` line 49). The slug is resolved from the authenticated student's partner school via the existing `useSchoolIdentity()` hook (DATA_INVENTORY.md references at `src/hooks/useSchoolIdentity.js`); the slug values come from `src/data/recruits-schools.js` (canonical UI source per DATA_INVENTORY.md Section 7).

The prototype demonstrates the mechanism with two theme blocks: `bc-high` (the worked example, paired with the Thomas Girmay profile) and `belmont-hill`. Onboarding additional partner schools adds new `body.school-{slug}` blocks in the design-token module and a new partner-school registry row — no CMG component changes.

**Rationale:** Earlier prototype iterations specified a burgundy/parchment palette as the "Student View visual standard," matching the existing Shortlist and Scoreboard views. That framing was wrong for two reasons. First, GrittyOS partner schools have their own brand identities tied to the email domain a student authenticates with (`@bchigh.edu`, `@belmonthill.org`, etc.) — a Belmont Hill student opening their Recruit Hub should see Belmont Hill colors, not BC High's. The "Student View visual standard" is the *design-token system*, not any single palette. Second, hardcoding any school's colors into the CMG would force a refactor every time a new partner school is onboarded, which directly contradicts the goal of making partner-school onboarding cheap.

Three alternatives were considered:
- *Hardcode burgundy/parchment* — rejected as above.
- *Pass a theme object as a prop* — rejected because it duplicates state that `useSchoolIdentity()` already resolves and forces every Student View page to thread the prop. The CSS variable cascade does this for free.
- *Compile-time CSS-in-JS keyed by slug* — rejected because runtime theming via CSS variables is simpler, requires no build step, and is already the established pattern in the codebase.

The CMG defines a small set of CMG-internal tokens that are deliberately theme-invariant: `--autofill-bg` / `--autofill-edge` / `--autofill-text` (the auto-fill field treatment), `--token-unfilled` (the burnt-orange "you need to fill this" indicator), `--success`, and `--twitter-accent`. These don't change per partner school because their semantics are channel- or state-based, not brand-based. The badge that marks an auto-filled field as auto-filled should look the same at BC High and Belmont Hill — what changes is the brand color around it.

Sprint 025 also ships a Toast primitive (`src/components/Toast.jsx`) as a CMG-internal component: single global slot, fade in/out, 3s auto-dismiss, success/error variants. The Toast is theme-invariant for the same reason the auto-fill tokens are — confirmation and error feedback should read consistently across partner schools.

Coupling implications:
- The CMG depends on the Student View shell setting the `body.school-{slug}` class correctly. If the shell fails to set it, the CMG renders against the neutral defaults in `:root`. This is a graceful degradation, not a hard failure.
- The design-token module is its own workstream. The CMG sprint does NOT define new themes, add new partner schools, or modify the token schema. If a partner school's theme is missing tokens the CMG needs (e.g., `--brand-primary-faded`), that's surfaced to the design-token workstream as a gap; the CMG does not work around it.

---

## Decisions from Round 2 — clarifications and corrections

### D2.1 — Public Posts section sits above Coach Messages

**Decision:** The Public Posts section renders first on the page, above Coach Messages. Each gets its own section header and gallery.

**Rationale:** Visual hierarchy by use-case sequence. A student who just got back from a camp opens the CMG to do two things in order: post highlights publicly, then DM the coaches they worked with. Public Posts first matches that workflow. Reversing the order would push the public-broadcast scenario below the more numerous coach-message scenarios and lose the workflow signal.

### D2.2 — Recipient handling: tabs, not stacked previews

**Decision:** When generating both a Position Coach and a Recruiting Area Coach version of the same message, the preview pane uses tabs ("Position Coach" | "Recruiting Area Coach") to switch between the two drafts. Copy and Email-to-Self actions act on whichever tab is currently active.

**Rationale:** Three layout options were considered: two stacked previews, tabs, and side-by-side. Stacked previews double the vertical footprint of the builder, which is already two-column with a long form pane; the page would scroll endlessly on mobile and feel cluttered on desktop. Side-by-side previews work at desktop widths but force a three-column page (form + two previews) that fails on tablets and below. Tabs keep the preview pane to a single fixed footprint and let the student switch contexts cheaply, which matches how they'll work anyway — write the position-coach version, copy it, switch tabs, edit the area-coach version, copy that, done.

The trade-off is that students can't see both drafts simultaneously. Mitigated by the fact that the two drafts are 95% identical (only the Last Name differs between the position coach and area coach versions in Phase 1; in Phase 2, the salutation and signature may differ if coach contact data carries title information).

### D2.3 — No Response Sequence: three independent cards, not a wizard

**Decision:** Scenarios 9, 10, and 11 (the No Response Sequence) are three independent scenario cards in the gallery. The student picks which one they're sending based on where they are in the sequence. The cards are visually clustered (slightly warmer surface tint than other Coach Messages cards) but functionally independent.

**Rationale:** Three options were considered: a single "No Response Sequence" card opening a 3-step wizard generating all three drafts at once; three independent cards; or one card that progressively unlocks (#9 first, then #10 after the student confirms no reply, then #11). The wizard was rejected because the three messages are sent 5–14 days apart, not in a single session — generating all three at once and dumping them on the student doesn't match the actual flow. The progressive-unlock was rejected because it requires the CMG to track sequence state per (student, school, coach), which is a relationship-state concern that the CMG explicitly does not participate in (see D1.4). Independent cards put the responsibility on the student to know where they are, which is correct: the student knows whether they're sending the first nudge or the respectful close, and the CMG just renders the message for whichever situation they pick.

The visual clustering (warmer background tint on the three cards) signals that these are related without implying a forced sequence.

### D2.4 — Coach Twitter handle: visible placeholder, no input field in Phase 1

**Decision:** Scenarios 2, 3, 5, 6 reference a coach's Twitter handle for @-mention purposes. In Phase 1, these handles are rendered as visible `[@CoachHandle]` placeholder tokens in the output. The student fills them in by editing the copied text or by typing them into the mail compose window before sending. No input field appears in the form for coach Twitter handles in Phase 1.

**Rationale:** Three options were considered: visible placeholder only, an input field in the form, or both. The form input was rejected because Phase 1 is explicitly the "before we have coach contact data" phase — adding a form field for coach Twitter handles invites the student to look up the handle separately, type it into the form, then have it appear in the preview, when they could just edit the placeholder directly in the copied message. The form-field approach also creates an inconsistency: position coach last name is a form field, but position coach Twitter handle is a form field too, and recruiting area coach Twitter handle is a form field, and the form bloats fast.

Phase 2 will replace the placeholder with auto-filled handle data from the coach contact table; at that point, the placeholder disappears because the data is real.

Visible placeholders in the preview are color-coded burnt-orange (`#B85C2A`) so the student notices them and knows they're TODO before send.

### D2.5 — Phase 1 / Phase 2 split for coach contact data

**Decision:** Sprint 025 (Phase 1) ships with student-filled coach data. A later sprint (Phase 2, blocked on coach contact scraping completion) replaces student-filled fields with database-backed dropdown pickers for Position Coach, Recruiting Area Coach, and a Recruiting Coordinator fallback.

**Rationale:** Coach contact data isn't yet in the GrittyOS database, and the scraping workstream to populate it is its own multi-sprint effort with no current timeline lock. Blocking the CMG on coach data would delay a feature that has real value even in its data-poor form — the student-athlete still needs to send these messages and still benefits from auto-filled profile data, scenario taxonomy, and the channel toggle. Phasing the build lets the CMG ship now with a transparent data-completeness story ("we'll add the coach picker once we have the data"), and Phase 2 becomes a focused, well-scoped follow-on sprint rather than a multi-month dependency chain.

### D2.6 — Auto-filled fields are editable

**Decision:** Profile data (name, grad year, position, HS name, state, GPA, Hudl link, Twitter profile) auto-fills from the student profile but renders as editable input fields. Visual treatment marks them as auto-filled (sand-tinted background, "auto-filled" badge on the label), but the student can override any value for a specific message.

**Rationale:** Two reasons. First, profile data drifts: a student's GPA on their profile might be from last semester, and they want to send the current semester's number on this specific message without updating the profile (or before they've gotten around to updating the profile). Locking auto-filled fields would force a profile-edit detour for one message. Second, profile data can be wrong: typos, abbreviations, position changes mid-season. Allowing edits per message means the CMG doesn't depend on the profile being perfect — it depends on the profile being a useful starting point.

Edits to auto-filled fields in the CMG do not propagate back to the profile. The profile remains the canonical source; the CMG carries a local override for the duration of the message construction.

---

## Downstream construction decisions

### D3.1 — Phase-by-phase form reveal with subtle stagger

**Decision:** The builder form is divided into five phases (Channel & School, Event Context, Coach Recipients, Your Profile, Closing Questions). Each phase reveals with a fade-up animation (opacity 0→1, translateY 10px→0, ~500ms ease) when the prior phase's required fields are filled. Phases that are auto-complete (because all their fields are auto-filled and valid) reveal immediately.

**Rationale:** The phase reveal serves two functions: it paces the form so the student doesn't see a wall of fields on first render, and it signals to the student that each step builds on the prior one. The fade-up is subtle enough not to feel gimmicky; the stagger delay (80ms × phase index) gives the eye time to register each phase as a discrete step.

In the prototype, all phases are pre-revealed because the prototype demonstrates the populated end-state. The production implementation gates each phase on the prior phase's completion criteria.

### D3.2 — Auto-filled visual treatment: sand-tinted background + "auto-filled" badge

**Decision:** Auto-filled input fields use a sand-tinted background (`#E8DFC4`) with a darker sand border (`#C7B98D`) and brown text (`#5C4B2A`). A small `auto-filled` badge appears next to the field label.

**Rationale:** Auto-fill needs to be visually distinguished from student-filled because the student needs to know which fields are "their own words" and which are pulled from the profile (and therefore subject to whatever's in the profile). The sand tint is a CMG-internal token (`--autofill-bg`), deliberately theme-invariant — it reads as "this is from another source" regardless of the partner school's brand palette. The badge provides explicit labeling for accessibility — color alone isn't enough.

Inside the preview pane, auto-filled tokens use the same sand-tinted highlight so the student can trace which words in the output came from which source.

### D3.3 — Placeholder tokens are color-coded by source in the preview

**Decision:** In the preview pane, tokens that originated as placeholders in the template are color-coded by their current state:

- **Burnt orange (`#B85C2A`)** — unfilled placeholder. Student must fill before sending. Example: `[Last Name]` for the coach.
- **Sand tint** — auto-filled from profile. Example: `Class of 2027`.
- **Plain text** — manually entered by the student in the form. Example: `Boston College Elite Camp` (camp name).

**Rationale:** A constructed message has three kinds of text: the template's fixed wording, the data the student provided, and the data still missing. The student needs to visually scan for missing data before they copy or email-to-self — orange tokens make that scan instant. Auto-filled tokens are tinted (not orange) so the student doesn't mistake them for missing data, but still highlighted so the student can see at a glance which words came from the profile (and might need editing).

Plain text (form-entered) reads as ordinary message text because that's the most common case — calling visual attention to every word the student typed would clutter the preview.

### D3.4 — Channel toggle hides/shows the subject line

**Decision:** Switching the channel toggle from Email to Twitter strips the subject line from the preview and changes the format badge from "Email" (rendered with the active partner-school's `--brand-primary`) to "Twitter DM" (rendered with the theme-invariant `--twitter-accent`). Switching back to Email restores the subject. The signature changes too: email signature includes the redundant Twitter profile link on its own line; Twitter signature is more compact and omits the redundant link (since the DM is itself on Twitter).

**Rationale:** The two channels have genuinely different output requirements. Subject lines don't exist in DMs; including one would confuse the student into pasting it into the DM body. The redundant Twitter link in the email signature is a cross-platform handoff signal ("here's where to also find me on the platform you're not using right now") that's irrelevant when the recipient is already on Twitter.

The format badge changes color in addition to text because students will often glance at the preview before deciding which copy/send action to take, and the color is faster to recognize than the text.

### D3.5 — Sandwich menu folded into Sprint 025

**Decision:** The sandwich (hamburger) menu refactor across all five existing Student View pages ships within Sprint 025 itself, as a phase preceding the CMG component build. The Student View nav was already due for the refactor independently of the CMG; adding a sixth page is the forcing function, and the refactor is a small enough body of work that decoupling adds more overhead than it saves.

**Rationale:** Earlier scoping considered making the sandwich menu a separate prep sprint on the theory that it touches every Student View page and would inflate Sprint 025's scope. On closer look, the refactor is mostly mechanical:

- `src/lib/navLinks.js` (E1 per DATA_INVENTORY.md Section 7) is already the single source of truth for nav entries — the refactor is a presentation change, not a data-model change.
- The existing horizontal nav is a few dozen lines of layout CSS in `src/components/Layout.jsx` (per DATA_INVENTORY.md Section 3 entry on `public.profiles`, read at `Layout.jsx:102`). Swapping it for a sandwich drawer is a focused component edit, not a multi-component refactor.
- The five Student View pages don't need per-page changes — they consume the layout, not the other way around. The refactor is centralized.

Given that footprint, splitting into a separate sprint would add more ceremony (separate session, separate retro, separate decision lock) than the work itself merits. Folding into Sprint 025 means one session, one retro, one shipped feature. The session spec gates the CMG component build on the sandwich refactor's completion (sequential phases within the same sprint), so the failure mode "CMG ships against an incompatible nav" is structurally prevented.

The alternative considered — keep horizontal nav, ship the sandwich later — was rejected because the horizontal nav already feels cramped with five tabs at narrow desktop widths; adding a sixth would force a visual compromise that needs to be revisited within weeks anyway.

### D3.6 — School picker defaults to shortlist, allows "Other school"

**Decision:** The school picker in the form (Phase 1 of the builder) defaults to schools in the student's current shortlist, listed by name with competition tier in parentheses. An "Other school not in my shortlist" option at the bottom allows the student to pick any school in the GrittyOS database.

**Rationale:** Matches the read-only shortlist pattern established in the Scoreboard sprint. The shortlist is the student's curated set of schools they're actively pursuing, which is where the CMG will be used 90%+ of the time. The "Other school" option handles the case where a student is sending a one-off message to a school they haven't decided to shortlist yet (e.g., a school that just emailed them a blast and they want to reply to even if they're not yet sure about adding to the shortlist).

"Other school" entries do not auto-add to the shortlist in v1. v2 may prompt with "Want to add this school to your shortlist?" after the message is constructed.

### D3.7 — Fallback to Recruiting Coordinator when neither coach is known

**Decision:** A standing callout in the preview pane reads: "**Can't find this coach?** Address your message to the team's Recruiting Coordinator instead. Find the staff directory at the school's football website." This callout is present on all coach-targeted scenarios; it's not gated on whether the student left the position-coach and area-coach fields blank.

**Rationale:** The instruction text in the original Coach Communication Generator template explicitly mentions falling back to the Recruiting Coordinator if the AC or RC isn't reachable. Making this guidance visible at the preview stage (not buried in a help doc) ensures students don't assume the CMG only supports the two named recipient types. The callout is unconditional in v1 because gating it on "blank" state would either fire prematurely (before the student has tried to fill the fields) or never fire (if the student types something to suppress it). An unconditional callout costs the student one extra glance; gated logic costs implementation complexity for marginal UX benefit.

Phase 2 may add a "Recruiting Coordinator" option to the recipient tabs (alongside Position Coach and Recruiting Area Coach) once coach contact data includes RC roles.

### D3.8 — JSONB schema is a flat array, not a nested object

**Decision:** The `cmg_message_log` JSONB is structured as a flat array of message records: `[{record}, {record}, ...]`. Records are not grouped by school or by scenario in the JSONB shape itself.

**Rationale:** The four Phase 1 reporting questions can all be answered with a single array scan or a simple filter expression in PostgreSQL's JSONB operators:

- *Has student messaged School X?* → `WHERE cmg_message_log @> '[{"unitid": X}]'::jsonb`
- *When?* → array scan filtered by `unitid`, return `constructed_at`
- *Channel?* → same scan, return `channel`
- *Emailed to self?* → same scan, return `emailed_to_self`

The `unitid` is the integer IPEDS identifier from `public.schools.unitid` (DATA_INVENTORY.md Section 3) — the same join key used by `public.short_list_items`, `public.recruiting_events`, and every other school-keyed table in the schema. Using `unitid` (rather than an invented `school_id`) keeps the CMG log consistent with the rest of the codebase and makes the log joinable to `public.schools` if a future analyst wants to enrich the log with school metadata.

Grouping by school in the JSONB would require nested object access and complicate the append operation (every new record either creates or extends a school-keyed sub-object). Flat array means every new message is a simple array append. Storage cost is minimal at expected scale (a heavy CMG user sends 20–40 messages per recruiting cycle).

If query patterns evolve to need grouping or aggregation across messages, that's the signal to migrate the log out of JSONB into a SQL table — but the explicit non-goal of Phase 1 is to avoid that complexity.

### D3.9 — Non-collision with `public.coach_contacts`

**Decision:** The CMG log lives in `public.profiles.cmg_message_log` (JSONB) and does NOT write to `public.coach_contacts` (a separate SQL table that already exists in the schema with 0 rows). These are two different artifacts with two different purposes:

| | `public.profiles.cmg_message_log` (CMG log) | `public.coach_contacts` (relationship-state ledger) |
|---|---|---|
| Purpose | "Did the student build a CMG message?" | "Did the student make contact with this coach?" |
| Trigger | Copy or Email-to-Self button in CMG | Student manually logs an interaction |
| Granularity | One record per constructed message (could be zero, one, or multiple per actual coach contact) | One record per actual coach contact event |
| Shape | JSONB array, scenario-aware | SQL row with `short_list_step` (1–15), `contact_type` enum, `initiated_by` enum |
| Joins | None — fire-and-forget trace | FK to `college_coaches.id`, joins to `short_list_items` via `unitid` + `profile_id` |
| Source of truth for journey state? | No | No — that's `short_list_items.recruiting_journey_steps` |

**Rationale:** When this prototype was first built, I didn't know `public.coach_contacts` already existed. DATA_INVENTORY.md (Section 3 entry on `public.coach_contacts`) revealed a 0-row SQL table with shape `(id, profile_id, unitid, coach_id, contact_date, contact_type, initiated_by, short_list_step, notes, created_at)`. The natural question is: should the CMG write here instead of inventing a JSONB column?

The answer is no, for three reasons. First, `public.coach_contacts` is the right shape for a *relationship-state ledger* — a record of "the student actually contacted this coach about this thing." The CMG produces *drafts*, not sent messages. A student can construct a CMG message and never send it; constructing a message is not the same as making contact. Conflating the two would corrupt the relationship-state ledger with draft traffic.

Second, `public.coach_contacts.short_list_step` (1–15) ties contact records to the recruiting journey schema. CMG scenarios (1–11) do not map cleanly to journey steps — Scenario 2 (camp follow-up) might map to step 5 (contacted coach via email), but Scenario 4 (introducing myself) might also map to step 5, and Scenarios 9/10/11 (no response sequence) don't correspond to any new journey step at all. Forcing a mapping would either lose information or introduce a synthetic step taxonomy.

Third, `public.coach_contacts` is currently 0 rows and unwired anywhere in the application (per DATA_INVENTORY.md: "Write paths: not yet wired in src/. Read paths: not yet wired."). The product surface that will eventually populate that table is its own product decision, separate from the CMG. The CMG sprint should not pre-empt that decision by claiming the table.

The naming similarity invites future confusion. To mitigate: a comment on the migration (`0047_profiles_add_cmg_message_log.sql`) explicitly notes the distinction, and the README contrasts the two in the constraints section.

---

## Decisions explicitly deferred

The following were considered and intentionally left for a later iteration.

- **Phase 2 coach contact picker.** Replaces student-filled coach last name and Twitter handle fields with dropdown pickers backed by a scraped coach contact table. Includes Recruiting Coordinator as a recipient option. Sprint blocks on coach scraping completion; tracked separately in the execution plan.
- **Backend SMTP email-to-self.** Phase 1 uses `mailto:`. SMTP becomes worth the deliverability investment only if usage data shows the email-to-self action is heavily used and the `mailto:` flow has friction that SMTP would remove.
- **Auto-add "Other school" to shortlist.** Optional prompt after message construction. v2.
- **Bulk message generation.** "Send Scenario 4 to all 12 D3 schools in my shortlist" — useful but invites spam-pattern concerns and needs UX safeguards. Deferred until the use case is concrete.
- **Inline editing of constructed messages in the history table.** v1's history table is read-only; clicking a row could open a "duplicate and edit" flow. v2 or v3.
- **Twitter character counter on Scenario 1.** Public X post is short enough not to need one in practice. Add only if real usage shows posts being trimmed.
- **Relationship-state inference from the CMG log.** The CMG log is intentionally not a relationship-state source. If a future product surface needs "how many coaches has this student contacted?" derived from the CMG log, that's a derivation in that product surface — not a change to the log's purpose.
- **Mobile-specific design polish.** v1 inherits the responsive breakpoints in the prototype CSS. Targeted mobile work (touch targets, mobile keyboard handling on phase reveal) is a v2 candidate after real student usage on phones.
- **Localization.** All template wording is English-only in v1. Spanish or other-language templates are a separate workstream.

---

## Revision History

- 2026-05-11 — Pre-build housekeeping corrections:
  - Theme wiring: data-school-theme attribute references reverted to body.school-{slug} class (matches current Layout.jsx + src/index.css implementation; data-school-theme was never adopted).
  - GPA label locked: form labels and UI text use "GPA" (substitution tokens unchanged).
  - Toast primitive added to Sprint 025 scope: src/components/Toast.jsx, single global slot, fade in/out, 3s auto-dismiss, success/error variants.
  - Drawer motion locked: reuses SlideOutShell.jsx (240ms cubic-bezier(0.16, 1, 0.3, 1), slide-from-left desktop, slide-from-bottom mobile, backdrop + scroll-lock + Escape + click-outside-close).
  - Recruiting Coordinator callout: unconditional (no 5-second timer; per D3.7).
