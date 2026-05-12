# Spec for Code — Coach Message Generator

This is the build-time spec for the Coach Message Generator sprint. Patch and Scribe execute against this document. The visual ground truth is `prototypes/cmg/coach-message-generator.html`; this spec describes how to wire that visual to the live Recruit Hub.

## Build sequence

The sprint must execute in this order. Steps are gated — UI work blocks on data validation, integration testing blocks on UI completion.

### Step 1 — Schema validation and migration (Patch leads, blocks all UI work)

Before any visual implementation begins, validate the `public.profiles` schema (the actual student profile table per DATA_INVENTORY.md Section 3) and prepare the `cmg_message_log` JSONB column. Required outputs from this step:

1. **Profile field-name mapping (verified against DATA_INVENTORY.md).** Each auto-filled field in the prototype maps to a real `public.profiles` column. Confirm against the live schema using the Supabase MCP before relying on this table:

| Prototype label (user-facing) | `public.profiles` column | Type | Notes |
|---|---|---|---|
| Full Name | `name` | text | NOT `full_name`. `public.users.full_name` is for staff only (Sprint 023 Option γ). |
| Grad Year | `grad_year` | int | |
| Position | `position` | text | |
| HS Name | `high_school` | text | NOT `hs_name`. This is the exact value used to filter `recruits-schools.js` partner-school rosters. |
| State | `state` | text (2-char) | |
| GPA | `gpa` | numeric | NOT `cgpa`. Stored as numeric on the row. |
| Hudl Link | `hudl_url` | text | Added by migration `0016`. Confirm populated for the test student. |
| Twitter Profile | `twitter` | text | NOT `twitter_url`. URL is stored as a free-text value. |
| Student Email | `email` | text | |

The profile row is keyed by `id` (uuid PK) and joined to `auth.users.id` via `user_id` (uuid UNIQUE). The CMG queries by `user_id` (the authenticated student's auth id), consistent with the codebase pattern (see `src/pages/ProfilePage.jsx:90` and `src/components/Layout.jsx:102` per DATA_INVENTORY.md).

If any field is missing or named differently from the table above, Patch flags it and the working group decides whether to add the column, rename, or alias in the application layer. Do not silently fall back on placeholders for missing profile fields — the CMG depends on these and the build should not start until they're confirmed.

2. **Shortlist data access (`public.short_list_items`).** Confirm the existing shortlist relationship table exposes, for a given `user_id`, the list of shortlisted schools with:
   - `unitid` (integer; FK target → `schools.unitid`, but NOT FK-constrained on `short_list_items` per DATA_INVENTORY.md)
   - `school_name` (denormalized on the shortlist row)
   - `div` and `match_tier` (use whichever the existing Shortlist UI is wired against for tier display)
   - For competition-level display in the picker, the canonical 5-tier key is `public.schools.type` (Power 4 / G6 / FCS / D2 / D3) — NOT `ncaa_division`. UConn maps to G6 per the DEC-CFBRB lock (DATA_INVENTORY Section 3 Notes on `public.schools`).

3. **`cmg_message_log` migration on `public.profiles`.** If the column does not exist on `public.profiles`, add it. Use the next available migration number in `supabase/migrations/` (current high-water mark per DATA_INVENTORY.md is `0046`; this will likely be `0047_profiles_add_cmg_message_log.sql`).

```sql
-- 0047_profiles_add_cmg_message_log.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cmg_message_log jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_cmg_message_log_gin
  ON public.profiles USING gin (cmg_message_log);

-- RLS: the existing profiles policies already grant the owner SELECT/UPDATE
-- on their own row. The new column is covered by those policies. Confirm by
-- inspection of migrations 0012, 0015, 0025, 0026, 0027, 0043 (the profiles
-- RLS migrations per DATA_INVENTORY.md) — if any policy uses column lists
-- rather than full-row access, add cmg_message_log to those lists.
```

If a column with that name already exists with a conflicting shape, stop and surface to the working group before proceeding. Do not silently overwrite.

4. **Test student record.** Confirm at least one test student (recommended: Thomas Girmay, since the prototype references his profile) has every field above populated and is queryable in the expected shape. Note: the prototype's specific values for Thomas are illustrative — they're drawn from the Coach Communication Generator template docx and may not match his current database state. Treat the column structure and the formula as authoritative; treat the prototype's data values as scaffolding.

5. **Partner-school theme resolution.** Confirm `useSchoolIdentity()` (existing hook per DATA_INVENTORY.md Section 3 entries on `public.users` and Section 7 entries on `recruits-schools.js`) resolves the student's HS slug from their auth user. The CMG renders inside the Student View shell, which sets body class `school-{slug}` via the wiring in `Layout.jsx` (lines 117-120). The slug values are `bc-high`, `belmont-hill`, etc., from `src/data/recruits-schools.js`. The actual theme token definitions are scoped to the design-token module (separate workstream — see DESIGN_NOTES D1.6 for the integration contract). Sprint 025 consumes the existing design-token system; it does NOT define new themes or add new partner schools.

**Exit criterion:** All five outputs confirmed. Migration is reversible (a rollback script lives in `supabase/migrations/` alongside the forward migration, following the pattern of existing reverse migrations in the repo).

### Step 2 — Templates as data (Scribe leads, parallel-safe with Step 1)

Extract the eleven scenario templates from the Coach Communication Generator source docx into a single JSON or TypeScript module that the component can import. Each template object has:

```typescript
type ScenarioTemplate = {
  scenario_number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  title: string;                       // "Camp Follow-Up"
  situation: string;                   // one-line situation for the card
  channel_pattern: "twitter-public" | "dm-first" | "email-first";
  is_public_post: boolean;             // true only for scenario 1
  email_subject_template: string | null;  // null for Twitter-DM-only, null for Scenario 5 (reply-to)
  body_template: string;               // with [Placeholders] in brackets
  email_signature_template: string;    // with redundant Twitter link
  twitter_signature_template: string;  // shorter, no redundant link
  required_form_fields: string[];      // e.g., ["camp_name", "camp_location", "coach_last_name"]
  optional_closing_questions: {
    junior_day_question: string;
    camp_question: string;
  };
  applies_to_recipients: ("position_coach" | "recruiting_area_coach" | "recruiting_coordinator" | "head_coach" | "broadcast")[];
};
```

The templates module is **the single source of truth for message wording**. The component renders by reading the template and substituting placeholders. Do not embed message text in the React/Vue component code.

Special-case notes for specific scenarios:

- **Scenario 1** has `email_subject_template: null` (public post; no subject).
- **Scenario 5** has `email_subject_template: null` (the instruction is "reply directly to the email you received from the coach" — no new subject).
- **Scenarios 9, 10, 11** have `email_subject_template` set per the template docx for the email fallback path, even though the channel-pattern is "DM → Email." (The "DM → Email" pattern means try DM first; if DM fails, send via email — the email version needs a subject.)
- **Scenario 9, 10, 11** are independent cards but share the No Response sequence's visual cluster style.
- **Scenarios 2, 3, 5, 6** reference a coach's Twitter handle for @-mention purposes. In Phase 1, these render as visible `[@CoachHandle]` placeholders in the output. Phase 2 will substitute from coach contact data.

### Step 3 — Component implementation (Scribe leads)

Build the CMG as a single page-level React component (or Vue, matching repo convention — check `src/` first) with the following structure:

```jsx
// Mounts inside the existing Student View shell. The shell sets body class
// school-{slug} using useSchoolIdentity() (Layout.jsx lines 117-120) so the
// partner-school theme tokens cascade into the CMG automatically — no theme
// prop needed.
<CoachMessageGeneratorPage />
```

The component is the only external surface. It pulls the authenticated user via the existing `useAuth()` hook (per DATA_INVENTORY.md Section 3 entry on `public.users`, `src/hooks/useAuth.jsx`) — consistent with every other Student View page. No prop drilling.

Internal structure:

- `<ScenarioGallery>` — renders the Public Posts section and the Coach Messages section. Selection sets the active scenario in component state.
- `<MessageBuilder>` — renders the two-pane builder. Mounts when a scenario is selected. Receives the active scenario template and the student profile.
  - `<FormPane>` — renders the phases in order. Each phase mounts as a `<Phase>` sub-component with its own reveal state.
  - `<PreviewPane>` — renders the live preview. Receives form state + scenario template. Hosts the recipient tabs, the channel format badge, the preview body, and the action buttons.
- `<MessageHistory>` — renders the message log table. Reads from `public.profiles.cmg_message_log`.

**Internal data fetching (auth-aware):**
- On mount: resolve `user_id` from `useAuth()`.
- On mount: fetch `public.profiles` row for that `user_id` — single row, all auto-fill fields + the JSONB `cmg_message_log`. Reuses the same fetch pattern as `src/pages/ProfilePage.jsx:90` and `src/components/Layout.jsx:102`.
- On mount: fetch the student's `public.short_list_items` rows (school picker source) joined to `public.schools` for the 5-tier `type` column (P4/G6/FCS/D2/D3). Matches the read pattern at `src/pages/ShortlistPage.jsx:417, 424, 693`.
- On Copy or Email-to-Self: call the `append_cmg_message_log` RPC with the student's `user_id` and the new record.

**Render:**
- Match the visual ground truth in `coach-message-generator.html` 1:1 for layout, color, typography, spacing.
- Use the existing component primitives from the Student View where they exist (status pills, button styles, form field styles).
- Phase reveal: each phase is hidden initially and animates in (opacity + translateY transition) when the prior phase's required fields are filled. Phases composed entirely of auto-filled fields reveal immediately.
- The preview pane updates live as form fields change (debounced ~100ms to avoid layout thrash on rapid typing).

**Interactions:**
- Scenario card click → selects the scenario; the builder mounts (or its content swaps if already mounted) and the page smooth-scrolls to the builder.
- Channel toggle → swaps Email/Twitter format in the preview; strips/restores the subject line; swaps signature variants.
- Recipient tab → swaps which recipient's draft is displayed in the preview. Form state for `position_coach_last_name` and `recruiting_area_coach_last_name` is independent.
- Copy button → copies the active tab's plain-text message (subject + body + signature for Email; body + signature for Twitter) to clipboard. Logs the action.
- Email-to-Self button → opens `mailto:` with `to=student.email`, `subject=` and `body=` populated. Logs the action with `emailed_to_self: true`.
- Reset Form → clears all student-filled fields, restores auto-filled fields to current profile values, returns to the empty (Phase 1 only) state.
- Builder header close → deselects the scenario, scrolls back to the gallery.

**No interactions in v1:**
- No inline editing of past messages in the history table.
- No "duplicate this message" action.
- No filtering or sorting the history table beyond descending-by-date.
- No bulk operations.

### Step 4 — Mounting in Student View navigation

Add the CMG as a new route in Student View. Page hierarchy after integration:

```
Student View
├── Home
├── My Profile
├── My Grit Fit
├── My Shortlist
├── My Grit Guides
└── Coach Message Generator (NEW)
```

**Integration constraints:**
- The Student View nav refactors from horizontal strip to sandwich (hamburger) drawer as part of this sprint, ahead of the CMG component build. See SESSION_SPEC Phase 3 for the refactor's scope and exit criteria. The CMG component build is gated on the refactor passing its smoke test (the five existing Student View pages render correctly through the drawer).
- Do not modify any of the five existing Student View pages beyond what the nav refactor requires (which should be zero per-page changes if the nav is centralized in `src/components/Layout.jsx`). If a per-page change turns out to be required, surface to the working group before continuing.
- The CMG route should be a top-level route at `/coach-messages` (or similar — match the existing Student View URL convention).
- Auth: the page requires the student to be authenticated; reuse the existing `useAuth()` + Student View auth wrapper. The CMG should be gated on `public.users.user_type === 'student_athlete'` (DATA_INVENTORY.md Section 3 entry on `public.users`).
- Nav entries are configured in `src/lib/navLinks.js` (E1; DATA_INVENTORY.md Section 7 "Other notable E1 modules"). Add the CMG entry as the sixth entry. The Student View shell consumes `navLinks.js` to render the (now-sandwich) menu — beyond the data addition and the `Layout.jsx` refactor, no shell-level modifications.

**Design-token consumption:**

The CMG renders inside the Student View shell, which already sets body class `school-{slug}` via `useSchoolIdentity()` (DATA_INVENTORY.md references at `src/hooks/useSchoolIdentity.js`; wiring in `Layout.jsx` lines 117-120). The CMG's stylesheet declares variable consumers only — `var(--brand-primary)`, `var(--surface-base)`, etc. — and inherits theme values from the body-class selector. **The CMG sprint must not hardcode any school-specific color values.** If a partner school's theme is missing tokens that the CMG needs, surface to the design-token workstream as a gap; do not ship workarounds inside the CMG component.

The ten semantic tokens the CMG consumes (prototype CSS is the canonical list):
- `--brand-primary`, `--brand-primary-deep`, `--brand-primary-soft`, `--brand-primary-faded`
- `--surface-base`, `--surface-warm`, `--surface-edge`
- `--ink`, `--ink-soft`, `--ink-muted`

The CMG also uses theme-invariant tokens (not overridden per school): `--autofill-bg`, `--autofill-edge`, `--autofill-text`, `--token-unfilled`, `--success`, `--twitter-accent`. These are CMG-internal and live in the CMG stylesheet only.

### Step 5 — Placeholder substitution logic

The template body contains placeholder tokens in brackets, e.g., `[Last Name]`, `[School Name]`, `[Camp Name]`, `[Hudl film link]`. The component substitutes these from a substitution map built from form state + profile data + active recipient.

```typescript
type SubstitutionMap = {
  // From profile (auto-filled) — source: public.profiles, keyed by user_id
  "[Your Full Name]": string;           // profiles.name
  "[Grad Year]": string;                // profiles.grad_year, e.g. 2027
  "[Abbrev Grad Year]": string;         // derived: "'" + last 2 digits, e.g. '27
  "[Position]": string;                 // profiles.position, e.g. LB
  "[HS Name]": string;                  // profiles.high_school
  "[State]": string;                    // profiles.state
  "[Current GPA]": string;              // profiles.gpa
  "[Hudl film link]": string;           // profiles.hudl_url
  "[Twitter profile link]": string;     // profiles.twitter

  // From form state
  "[School Name]": string;              // form: school picker → public.short_list_items.school_name
                                        //       (or public.schools.school_name for "Other school" path)
  "[Camp Name]": string | undefined;
  "[Name of Camp]": string | undefined;
  "[Name of Location]": string | undefined;
  "[Date]": string | undefined;
  "[Name of Event]": string | undefined;
  "[day of the week on which the event occurred]": string | undefined;
  // Visit-specific freeform
  "[Thank the coach by sharing a sentence...]": string | undefined;

  // From recipient tab + form (Phase 1: student-filled; Phase 2: public.college_coaches lookup)
  "[Last Name]": string;
  "[Last Name of the Assistant Coach or Recruiting Coordinator you have been trying to contact]": string | undefined;
  "[Position Coach]": string;           // @handle for Scenario 1
  "[Head Coach]": string;               // @handle for Scenario 1
  "[@CoachHandle]": string | undefined; // Phase 1: visible placeholder

  // Optional closing questions (omit entire question text if unchecked)
  "[Junior Day Question]": string;      // empty if unchecked
  "[Camp Question]": string;            // empty if unchecked
};
```

Substitution rules:

```javascript
function substituteTemplate(template, substitutionMap) {
  let result = template;
  for (const [token, value] of Object.entries(substitutionMap)) {
    if (value === undefined || value === '') {
      // Leave the placeholder visible in the output so the student sees it
      // is unfilled. The preview rendering layer wraps unfilled placeholders
      // in a styled span; copy/email-to-self preserves the bracketed text.
      continue;
    }
    // Replace ALL occurrences (template references some tokens multiple times)
    result = result.split(token).join(value);
  }
  return result;
}
```

**Critical:** The substituted output is plain text. Color-coded tokens in the preview are a rendering concern only — they're styled by wrapping placeholder strings in `<span class="placeholder-token">` at render time, not stored that way. The clipboard payload and the `mailto:` body are stripped of HTML.

### Step 6 — Channel-specific output formatting

```javascript
function buildEmailOutput(scenario, substitutionMap, recipient) {
  const subject = scenario.email_subject_template
    ? substituteTemplate(scenario.email_subject_template, substitutionMap)
    : null;
  const body = substituteTemplate(scenario.body_template, substitutionMap);
  const signature = substituteTemplate(scenario.email_signature_template, substitutionMap);
  return {
    subject,                              // null if no-subject scenario
    body: `${body}\n\n${signature}`,
    plainText: subject
      ? `Subject: ${subject}\n\n${body}\n\n${signature}`
      : `${body}\n\n${signature}`,
  };
}

function buildTwitterOutput(scenario, substitutionMap, recipient) {
  const body = substituteTemplate(scenario.body_template, substitutionMap);
  const signature = substituteTemplate(scenario.twitter_signature_template, substitutionMap);
  // Twitter output omits the subject and uses the shorter signature variant.
  // No 280-char counter, no warning (D1.5).
  return {
    subject: null,
    body: `${body}\n\n${signature}`,
    plainText: `${body}\n\n${signature}`,
  };
}
```

### Step 7 — Copy to Clipboard action

```javascript
async function copyToClipboard(plainText, logEntry) {
  await navigator.clipboard.writeText(plainText);
  await appendToMessageLog(logEntry);
  showToast('Copied to clipboard');
}
```

The toast is a small ephemeral confirmation in the lower-right of the viewport, ~2 seconds, surface-on-brand-primary (consumes the active theme tokens). Match any existing toast pattern in the Student View; if none exists, add a minimal one in this sprint.

### Step 8 — Email to Self action

```javascript
async function emailToSelf(scenario, output, recipient, studentEmail, logEntry) {
  const params = new URLSearchParams();
  params.set('subject', output.subject ?? '');
  params.set('body', output.body);
  const mailtoUrl = `mailto:${encodeURIComponent(studentEmail)}?${params.toString()}`;

  // The browser handles the mailto: navigation. No server-side send.
  window.location.href = mailtoUrl;

  // Log immediately on action — we cannot detect whether the student
  // actually sends from their mail client.
  await appendToMessageLog({ ...logEntry, emailed_to_self: true });
}
```

**Mailto edge cases:**
- Some mailto handlers (corporate webmail, locked-down browsers) may not handle long bodies cleanly. If the body exceeds ~2000 characters, append a small note in the preview pane: "Long message — if your mail client doesn't open, use Copy instead." Do not block the action.
- The student's email is the value of `public.profiles.email`. If empty, the Email-to-Self button is disabled with a tooltip pointing to the profile page.

### Step 9 — Message log append

```javascript
async function appendToMessageLog(entry) {
  const newRecord = {
    id: crypto.randomUUID(),
    unitid: entry.unitid,                    // FK target: public.schools.unitid
    school_name: entry.school_name,          // denormalized for read-fast display
    scenario_number: entry.scenario_number,
    scenario_title: entry.scenario_title,
    channel: entry.channel,                  // "email" | "twitter"
    recipients: entry.recipients,            // ["position_coach", "recruiting_area_coach"] etc.
    emailed_to_self: entry.emailed_to_self ?? false,
    constructed_at: new Date().toISOString(),
  };

  // Append to the JSONB array atomically using Postgres jsonb concatenation.
  // p_user_id matches the auth.users.id of the authenticated student
  // (codebase pattern — see DATA_INVENTORY.md Section 3 entries on public.profiles
  // and on user-keyed queries throughout src/pages/).
  await supabase.rpc('append_cmg_message_log', {
    p_user_id: entry.user_id,
    p_record: newRecord,
  });
}
```

The RPC `append_cmg_message_log` is a server-side function added in Step 1's migration. It performs the atomic JSONB append against the authenticated student's `profiles` row:

```sql
-- Part of migration 0047_profiles_add_cmg_message_log.sql

CREATE OR REPLACE FUNCTION public.append_cmg_message_log(
  p_user_id uuid,
  p_record jsonb
) RETURNS void
LANGUAGE sql
SECURITY INVOKER  -- runs as the calling user; RLS on public.profiles applies
AS $$
  UPDATE public.profiles
     SET cmg_message_log = cmg_message_log || jsonb_build_array(p_record),
         updated_at = now()
   WHERE user_id = p_user_id;
$$;
```

`SECURITY INVOKER` is deliberate: the function runs under the calling user's identity so the existing `public.profiles` RLS policies (migrations 0012/0015/0025/0026/0027/0043 per DATA_INVENTORY.md) enforce that a student can only append to their own row. The `updated_at` write keeps the audit trail consistent with the table's existing write pattern (`ProfilePage.jsx:271` upsert).

Atomic append matters because the student might click Copy and Email-to-Self in quick succession; each action is its own log entry, and we don't want one to overwrite the other.

**Edge cases:**
- Log append failure: do not block the user-visible action. The clipboard copy or `mailto:` open should succeed even if the log append fails. Log the failure to the application's error stream; do not surface to the student.
- Empty initial log: the default `'[]'::jsonb` from the migration handles this. No special-case code needed.
- Recipients array: for Scenario 1 (public post), `recipients` is `["broadcast"]`. For scenarios where the active tab is Position Coach, it's `["position_coach"]`. If the student copies both tabs in sequence, that's two log entries.

### Step 10 — Acceptance criteria

The sprint is complete when all of the following are true.

**Visual fidelity:**
- The CMG page renders 1:1 with the prototype HTML at desktop widths when the same school theme class is applied to both.
- All color values in the CMG component consume Student View design tokens (`var(--brand-primary)`, `var(--surface-base)`, etc.) — no hardcoded school-specific hex values.
- The prototype's BC High theme renders identically to the implementation when the body has class `school-bc-high`.
- Swapping the body class to `school-belmont-hill` (or any other live partner-school slug) re-themes the entire CMG without visual breakage — no theme-specific code paths in the component.
- Public Posts section sits above Coach Messages section, with the public-post card using `var(--twitter-accent)` (theme-invariant CMG-internal token).
- The eleven scenarios appear in the order in the prototype with the correct channel-pattern labels.
- The two-pane builder layout matches the prototype, with the form pane on the left and the preview pane on the right.
- Phase-by-phase fade-up animation works on phase reveal.
- Auto-filled fields show the auto-fill treatment (`var(--autofill-bg)`) and "auto-filled" badge.
- Placeholder tokens in the preview are color-coded: `var(--token-unfilled)` for unfilled, `var(--autofill-bg)` tint for auto-filled, plain for student-entered.
- The channel toggle visually changes the format badge color (brand-primary for Email; `var(--twitter-accent)` for Twitter) and strips/restores the subject line.
- The recipient tabs swap the preview correctly.

**Data fidelity:**
- All auto-filled fields pull from the live `public.profiles` for the authenticated student.
- The school picker lists the student's current shortlist with competition tiers, plus an "Other school not in my shortlist" option that lists all schools in the GrittyOS database.
- Template wording for all eleven scenarios matches the Coach Communication Generator source docx exactly.
- Placeholder substitution produces the correct output for at least one verified case per scenario (test fixture data covers all eleven).
- Email format includes subject, body, signature with redundant Twitter link.
- Twitter format omits subject, body, signature without redundant Twitter link.
- Message log append writes a correctly shaped record to `public.profiles.cmg_message_log` on every Copy and Email-to-Self action.
- Multiple rapid actions produce multiple log entries (atomic append verified).

**Behavioral fidelity:**
- Selecting a scenario card mounts (or swaps) the builder and smooth-scrolls to it.
- Phase 1's required fields gate Phase 2's reveal; Phase 2's required fields gate Phase 3's reveal; etc.
- Auto-filled phases reveal immediately on builder mount.
- Switching the channel toggle to Twitter strips the subject; switching back restores it.
- Switching the recipient tab swaps the preview correctly without affecting the other tab's form state.
- Copy to Clipboard puts the plain-text output on the clipboard (subject + body + signature for Email; body + signature for Twitter).
- Email-to-Self opens `mailto:` with the correct To, Subject, and Body. Both Copy and Email-to-Self log to `cmg_message_log`.
- The message history table renders the log entries in descending date order.
- The builder header close button deselects the scenario and returns to the gallery view.

**Integration fidelity:**
- The CMG page is reachable from the Student View sandwich drawer (sixth entry).
- The five existing Student View pages render correctly through the new sandwich drawer — content regions byte-identical to their pre-sprint state, only the top-of-page nav changed.
- The sandwich drawer opens and closes correctly across the five existing Student View pages and the new CMG page.
- No regression in shortlist data access, profile read, or shortlist write paths.
- The migration applies cleanly on staging and production with no data loss.

## Out of scope for this sprint

- Phase 2 coach contact picker (replaces student-filled coach fields with database-backed dropdowns)
- Backend SMTP email-to-self (Phase 1 uses `mailto:` only)
- Visual redesign of the sandwich drawer beyond the prototype's reference (drawer mechanics ship this sprint; further drawer polish is a v2 candidate)
- Bulk message generation
- Inline editing of constructed messages in the history table
- Twitter character counters or warnings
- Auto-adding "Other school" entries to the shortlist
- Relationship-state inference from the CMG log
- Mobile-specific layout polish beyond the responsive breakpoints in the prototype
- Localization or non-English templates

## Things that need a `DEC-CFBRB` before sprint kickoff

1. **Lock the prototype as canonical for this sprint.** Reference: `prototypes/cmg/coach-message-generator.html`. Deviations require a follow-on `DEC`.
2. **Lock the 11-scenario taxonomy.** 10 coach-targeted + 1 public X post. Reference: `DESIGN_NOTES.md` D1.1, D1.2.
3. **Lock the JSONB message-log storage choice.** `public.profiles.cmg_message_log` as JSONB array. Distinct from `public.coach_contacts` (DATA_INVENTORY.md Section 3) — see `DESIGN_NOTES.md` D3.8 for the rationale. Reference: `DESIGN_NOTES.md` D1.4, D3.8.
4. **Lock the Phase 1 / Phase 2 split.** Phase 1 ships with student-filled coach data; Phase 2 unlocks pickers once `public.college_coaches` (currently 0 rows, reserved for Phase 2 per DATA_INVENTORY.md) is populated. Reference: `DESIGN_NOTES.md` D2.5.
5. **Lock the design-token consumption pattern.** The CMG consumes Student View design tokens via body class `school-{slug}` (set in `Layout.jsx` lines 117-120) and `var(--brand-primary)` / `var(--surface-base)` etc. The CMG sprint does not define new themes or add partner schools. Reference: `DESIGN_NOTES.md` D1.6.
6. **Lock the sandwich nav refactor scope.** Sprint 025 ships the sandwich (hamburger) nav refactor as a gated phase preceding the CMG component build, rather than decoupling it as a separate sprint. The refactor is centralized in `src/components/Layout.jsx`; nav entries continue to source from `src/lib/navLinks.js`. Reference: `DESIGN_NOTES.md` D3.5.

These six decisions can ship as a single batched `DEC` if convenient, or as six separate ones for granular traceability.

## Things that need follow-up after sprint completion

1. **Phase 2 sprint scoping.** Once `public.college_coaches` is populated (DATA_INVENTORY.md Section 3 currently records 0 rows; reserved for Phase 2), draft the Phase 2 session spec to replace student-filled coach fields with database-backed pickers. Track the scraping/promotion workstream (`scripts/import_ready_to_production.py` per DATA_INVENTORY.md) as the blocker.
2. **Usage telemetry review.** After 30 days of production use, review `public.profiles.cmg_message_log` for: scenario distribution (which scenarios are used most?), channel mix (Email vs. Twitter), email-to-self adoption rate. The review informs whether v2 features (SMTP send, bulk, inline edit) are justified.
3. **Mailto edge-case audit.** After 30 days, check whether any students report Email-to-Self not opening their mail client. If meaningful prevalence, prioritize the SMTP path for v2.
4. **Mobile usage audit.** Track the share of CMG usage from mobile vs. desktop. If mobile is >30% of usage, prioritize mobile-specific layout polish.
5. **Scenario template wording.** The eleven templates may need iteration based on coach feedback ("students are sending us these and they read templated"). The templates are a data module — updating them is a one-line PR. Track this as a feedback channel, not a sprint.
6. **Theme coverage audit for new partner schools.** Every onboarded partner school needs a `body.school-{slug}` block in the design-token module. The CMG won't break visually if a theme is missing tokens (defaults cascade from `:root`), but the school's branding won't apply either. Verify coverage as part of new-school onboarding checklists.

## Reference files

- `coach-message-generator.html` — visual ground truth
- `DESIGN_NOTES.md` — every locked decision and rationale
- `README.md` — sprint orientation and folder index
- `EXECUTION_PLAN.md` — multi-sprint forward plan from prototype to Phase 2 production
- `SPRINT_025_SESSION_SPEC.md` — session spec for Sprint 025 kickoff
- Coach Communication Generator template docx — original wording source; archived to the feature folder on sprint kickoff

## Revision History

- 2026-05-11 — Pre-build housekeeping: corrected token count (eight → ten), removed data-school-theme references in favor of body.school-{slug} class, locked GPA label, migration body uses IF NOT EXISTS.
