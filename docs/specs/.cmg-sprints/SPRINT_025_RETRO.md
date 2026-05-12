# Sprint 025 Retro — Coach Message Generator Phase 1 + Sandwich Nav Refactor

**Sprint window:** 2026-05-11 to 2026-05-12
**Branch:** `master` (no feature branch; sprint-mode direct-to-master with phased commits)
**First commit:** `b72fb02` (pre-build housekeeping)
**Final commit:** `1a0c9c9` (helper-text restoration hotfix)
**Total commits in sprint window:** 30
**Files touched:** 46
**Lines:** +10,008 / -176

---

## Scope

Two coordinated deliverables shipped as gated phases in a single sprint:

1. **Sandwich nav refactor.** Replace the horizontal Student View nav with a drawer pattern across all five existing pages, centralized in `src/components/Layout.jsx`, reusing the `SlideOutShell` primitive. Add the sixth nav entry for the Coach Message Generator.
2. **Coach Message Generator (CMG) Phase 1.** A new sixth Student View page that turns the Coach Communication Generator template docx into a phase-by-phase form. Eleven scenario templates, channel toggle (Email / Twitter DM), recipient tabs (Position Coach / Recruiting Area Coach with RC fallback callout), profile-data auto-fill, copy-to-clipboard, email-to-self via `mailto:`, and a JSONB message log on `public.profiles.cmg_message_log` written via a SECURITY INVOKER RPC.

**Done State achieved: YES.** CMG page is reachable from the sandwich drawer at `/coach-message-generator`. All eleven scenarios render. Phase-by-phase reveal works. Preview substitution is live with channel-aware subject and signature. Copy and email-to-self both wire through `append_cmg_message_log` and write to the JSONB log. Migration `0047_profiles_add_cmg_message_log.sql` is applied to live Supabase project `xyudnajzhuwdauwkwsbh`. 883 unit tests pass (1 pre-existing failure unrelated to this sprint; 9 skipped).

---

## Phases executed

The sprint ran ten phases plus a pre-build housekeeping pass. Commits below are listed in chronological order.

### Pre-build housekeeping — `b72fb02`, `8283172`

Locked the six DEC-CFBRB decisions (096–101) that gated build kickoff, resolved spec drift between the prototype and `SPEC_FOR_CODE.md` / `DESIGN_NOTES.md`, archived the Coach Communication Generator template docx as the canonical wording source, and stripped persona names from session artifacts before any code was written.

### Phase 1 — Migration `0047_profiles_add_cmg_message_log.sql` — `3aac219`

Added `cmg_message_log` JSONB column to `public.profiles` (NOT NULL DEFAULT `'[]'::jsonb`), GIN index for future scenario/recipient filtering, and `append_cmg_message_log(uuid, jsonb)` RPC (SECURITY INVOKER). Migration is idempotent. Applied to the live project via the Management API in this phase; smoke-tested by reading the column back through PostgREST.

### Phase 2 — Scenario data module — `50b5ac0`, `8dc7cbf`

Built `src/data/cmgScenarios.ts` with all eleven scenarios sourced verbatim from the docx. The cleanup commit `8dc7cbf` canonicalized token variants (e.g. `[first_name]` / `[First Name]` collapse to a single canonical token at runtime), fixed subject-line hardcoding for scenarios where the docx left it blank, added `[Height]` and `[Weight]` tokens for Scenario 9, and documented the null-subject rationale inline for scenarios 9–11.

### Phase 3 — Sandwich nav refactor — `6cf1ab7`

Refactored the horizontal nav in `src/components/Layout.jsx` to a drawer panel via the existing `SlideOutShell` pattern. Added the sixth nav entry for CMG. Migrated `data-testid="authenticated-nav"` from the desktop horizontal nav to the drawer panel root so existing Playwright auth assertions remained valid.

### Phase 4 — CMG component scaffold + routing + Toast primitive — `ac76d87`

Created `src/pages/CoachMessageGeneratorPage.jsx`, wired the `/coach-message-generator` route in `App.jsx`, and added a reusable Toast primitive at `src/components/Toast.jsx` (this was the "Sprint 025 inline if absent" carry-forward item — closed in this phase). The page renders the gallery, phase-by-phase form shell, and preview pane container.

### Phase 5 — Form panes and progressive reveal — `b6ad4a8`, `a657655`, `63a3693`, `a9b62ab`, `a0e50e5`, `a7bccdf`

Built the substitution engine and the phase-by-phase form. Sub-phases:

- **5a (`b6ad4a8`)** — substitute engine (longest-match tokenizer, segment-based rendering, required-fields gate per phase).
- **5e (`a657655`)** — FormPane progressive reveal with per-phase gating; respects `prefers-reduced-motion`.
- **5d (`63a3693`)** — Phase 4 profile auto-fill display, visually distinguished from student-filled fields.
- **5b (`a9b62ab`)** — Phase 1 channel toggle and school picker (sourced from `public.short_list_items` with "Other school" fallback); Phase 3 recipient tabs.
- **5c (`a0e50e5`)** — Phase 2 event/context fields and Phase 5 closing questions.
- **Wire-up (`a7bccdf`)** — shortlist prop threaded from FormPane to Phase1Channel.

### Phase 6 — Preview pane and Phase 2 derivation — `fafb8ba`, `039818c`

- **6b (`fafb8ba`)** — PreviewPane renders the substituted body, swaps recipient tab content, applies channel-aware subject and signature, and surfaces the unconditional RC fallback callout.
- **6a (`039818c`)** — Scenario 1 Phase 2 fix: re-derived Phase 2 field set from `scenario.required_form_fields` instead of a hardcoded `EVENT_FIELDS` list. Added `camp_name` and two college coach handle fields specifically for Scenario 1.

### Phase 7 — Action row — `b9db74b`

Wired Copy / Email-to-Self / Reset. Copy writes to clipboard and fires a toast; Email-to-Self opens `mailto:` with To, Subject, and Body pre-populated; both append a row to `cmg_message_log` via the RPC. Reset clears the form back to scenario-pick state.

### Phase 8 — Message history table — `9b216e2`

Built the history table that reads `cmg_message_log` from `public.profiles`, sorts descending by date, renders relative timestamps, and looks up scenario titles by id.

### Phase 9 — Test sweep and acceptance — `aaf2d23`, `07c9356`, `6339ecd`, `3c5655e`, `f579a64`

- **9a (`f579a64`)** — Playwright acceptance suite covering all eleven scenarios end-to-end.
- **9b (`6339ecd`)** — unit test coverage sweep (substitute engine, mailto builder, message history, preview signature, Phase 1 shortlist behavior, closing questions, twitter normalizer, gallery helper text, plus edge cases).
- **9c (`3c5655e`)** — manual acceptance checklist filed as `SPRINT_025_ACCEPTANCE_CHECKLIST.md`.
- **History column polish (`aaf2d23`, `07c9356`)** — preview column ellipsis (className + CSS).

### Phase 10 — Retro and close (this filing)

Retro authored, EXECUTION_PLAN updated with Reframings and Carry-forward changes, `.cmg-sprints/README.md` marked SHIPPED.

---

## Hotfix rounds

Four hotfix rounds against the post-manual-review feedback. Eight fixes total. All caught by operator manual review against the live preview rather than by the automated suites.

### Round 1 (post-manual review)

- **`032b01c`** — nav label `coach messages` rendered lowercase; raised to uppercase to match the rest of the drawer convention.
- **`51c992b`** — Twitter channel was using the email signature template; switched to the Twitter-specific signature and suppressed the email signature block for that channel.
- **`dd0522f`** — shortlist schools were not populating in the CMG school dropdown; root cause traced to the absence of an FK between `short_list_items.unitid` and `schools.unitid`, worked around in the read layer (structural fix carried forward — see Carry-forward register).

### Round 2 (post-manual review)

- **`bc80d36`** — page subtitle copy changed from "coach" to "recruiting coach" for clarity.
- **`9c2639b`** — renamed the no-response sequence cards to "No Reply #1 / #2 / #3" for conceptual grouping; this is what the operator was already calling them in conversation.
- **`877b64c`** — stripped the redundant Closing Questions prompt sentences out of scenario bodies; the student-authored questions are the source of truth and the docx default prompts were pre-empting them.

### Round 3 (post-manual review)

- **`8d20ab9`** — twitter handle column on `public.profiles` stores bare handles, not URLs; added a normalizer (`src/lib/cmg/twitter.js`) that renders the full `https://x.com/{handle}` URL across the preview, mailto body, and Scenario 1 public post.

### Round 4 (post-manual review)

- **`1a0c9c9`** — section subtitles and per-scenario helper text were missing from the gallery; restored verbatim from the prototype.

---

## Decisions filed

Six DEC-CFBRB entries filed in pre-build housekeeping. All locked Sprint 025 scope before any code was written.

- **DEC-CFBRB-096 — Prototype lock.** `coach-message-generator.html` is the visual ground truth for Sprint 025; pre-build housekeeping cleared spec-vs-prototype drift before component work began.
- **DEC-CFBRB-097 — 11-scenario taxonomy lock.** The eleven scenarios are locked by number; titles and template wording are sourced verbatim from the Coach Communication Generator template docx.
- **DEC-CFBRB-098 — JSONB on `profiles.cmg_message_log`.** Message log persists as a JSONB array on `public.profiles`, with GIN index, `'[]'::jsonb` default, and a SECURITY INVOKER `append_cmg_message_log` RPC. Idempotent migration form (`IF NOT EXISTS`).
- **DEC-CFBRB-099 — Phase 1 / Phase 2 split.** Sprint 025 ships with student-filled coach last-name and Twitter-handle fields. Phase 2 replaces these with dropdown pickers backed by `public.college_coaches` once it is populated.
- **DEC-CFBRB-100 — Design-token consumption via `body.school-{slug}` class.** CMG components consume the existing body-class theme swap rather than introducing a parallel `data-school-theme` attribute. Spec docs updated to match the live wiring.
- **DEC-CFBRB-101 — Sandwich nav fold-in.** The drawer refactor is folded into Sprint 025 as Phase 3, gating CMG component build. Reuses `SlideOutShell` (240ms cubic-bezier, slide-from-left desktop, slide-from-bottom mobile). The `data-testid="authenticated-nav"` testid migrated from the desktop horizontal nav to the drawer panel root.

Full text: `docs/DECISION_FILING_MANIFEST.md` lines 140+.

---

## Reframings on record

Four mid-execution discoveries that changed the build plan.

1. **Scenario 1 coach handles are college coaches, not HS coaches.** The original read of the docx scenario assumed the two @-handle fields were the student's high-school staff. Build-time clarification confirmed they are college coaches at the target school. This forced Scenario 1's Phase 2 to be student-entered `camp_name` plus two college coach handle fields, distinct from every other scenario's event-context Phase 2. Resolved in `039818c`.

2. **Phase 2 field set must self-derive from `scenario.required_form_fields`.** Phase 6A surfaced that the hardcoded `EVENT_FIELDS` list was incompatible with Scenario 1's shape. Refactored to a `PHASE_2_FIELDS` union derived per-scenario from the data module. Resolved in `039818c`.

3. **Docx Closing Questions defaults pre-empted student input.** The docx scenario bodies include default Closing Questions prompt sentences. The CMG's Phase 5 collects student-authored Closing Questions, which are intended to be the message's source-of-truth content. The defaults had to be stripped from the substituted body to let the student's questions land. Caught in Hotfix Round 2 (`877b64c`).

4. **Twitter handle column stores bare handles, not URLs.** The `public.profiles.twitter` column stores `username` rather than `https://x.com/username`. Initial preview rendered bare handles as if they were relative URLs. Required a normalizer to produce the full URL in every surface: preview body, mailto body, Scenario 1 public post. Caught in Hotfix Round 3 (`8d20ab9`); normalizer lives at `src/lib/cmg/twitter.js`.

---

## Carry-forward register update

### Shipped this sprint (remove from carry-forward)

- **Toast notification primitive.** Inline-added in Phase 4 at `src/components/Toast.jsx`. Closes the "Sprint 025 inline if absent" carry-forward item.
- **Sandwich nav refactor.** Shipped as Phase 3 (`6cf1ab7`).
- **JSONB message log + append RPC.** Migration `0047` applied to live; RPC and column verified.

### Deferred (still carry-forward)

- **Phase 2 coach picker.** Still blocked on `public.college_coaches` population. No current owner for the data acquisition track.
- **"Emailed to Self" badge column on the history table.** History today records `emailed_to_self` in the JSONB row but does not surface it as a column or badge. Visual polish deferred.
- **Mobile-specific layout polish.** Beyond the responsive collapse already in place, no mobile-specific tuning was done.
- **Inline editing of past messages.** Not in Phase 1 scope.
- **Bulk message generation across multiple shortlisted schools.** Not in Phase 1 scope; needs UX safeguards before consideration.
- **Localization / Spanish templates.** Separate workstream.
- **`short_list_items.unitid → schools.unitid` FK.** Surfaced as root cause of Hotfix Round 1's shortlist-not-populating bug (`dd0522f`). Structural gap in the schema. Requires a migration plus an `ON DELETE` decision. Right sprint for this is TBD.

### New from sprint

- **Live Playwright auth-gated test execution.** The acceptance suite at `tests/cmg.spec.js` is structurally valid but un-runnable in this environment without `TEST_STUDENT_EMAIL` credentials. Operator should run the suite in an authenticated environment as a post-deploy verification step.

---

## What went well

**Sprint-mode discipline held across 13+ chat exchanges.** Phases were sequenced, commits were tagged with phase identifiers, and the flat technical register was maintained from open to close without governance drift.

**Parallel subagent execution accelerated Phases 1+2 and Phases 7+8.** Independent file scopes meant migration + scenarios and action-row + history could run concurrently without merge conflicts.

**Manual operator review caught eight issues the automated suites would not have.** Bare-handle-as-relative-URL, redundant docx prompt sentences, missing helper text, lowercase nav label, wrong-channel signature — all visual/UX defects that human-in-the-loop validation surfaced before they shipped to a wider audience. This is high-value verification that complements, not duplicates, the unit and Playwright tests.

**Persona stripping was successful first-pass.** No agent-name references leaked into committed code, comments, commit messages, or spec docs across the sprint window.

**The substitution engine absorbed docx idiosyncrasies cleanly.** Longest-match tokenization plus a variant-token dispatcher meant typos, abbreviations, and alt phrasings in the docx (e.g. `[first_name]` vs `[First Name]`, `[School]` vs `[College]`) could be reconciled at runtime without rewriting the source content. This kept the docx as the canonical wording source per DEC-CFBRB-097.

---

## What didn't go well

**The Playwright suite is structurally valid but un-runnable in this environment.** Missing `TEST_STUDENT_EMAIL` credentials meant the live integration of the CMG page was never end-to-end verified by automation in this sprint. Mitigated by the operator manual pass, but this is a medium-severity gap that should be closed before the next sprint that touches authenticated student flows.

**One Phase 2 subagent over-indexed on `MEMORY.md` and mis-flagged a schema gap.** The subagent flagged `[Height]` and `[Weight]` tokens (Scenario 9) as missing from the schema because `MEMORY.md` only lists the eight auto-fill columns. The live `public.profiles` schema actually has both `height` (text) and `weight` (numeric) columns. This was caught and corrected in the Phase 2 cleanup commit `8dc7cbf` and reinforced at the orchestrator level. Root cause: `MEMORY.md` is a partial snapshot, not a full schema map. Recommendation: any token-to-column mapping check should query the live schema (or `DATA_INVENTORY.md` Section 3) rather than `MEMORY.md`.

**Hotfix round count suggests Phase 9 verification under-caught.** Four hotfix rounds with eight fixes total after Phase 9 closed indicates the acceptance checklist and Playwright suite are not catching what manual review catches. The manual pass surfaced visual + UX issues that automated tests structurally cannot catch (bare-handle URLs, redundant prompts, missing helper text, lowercase labels). Future sprint: invest in a visual regression workflow or a live-preview operator pass earlier in Phase 9, before commit-and-push.

---

## Metrics

| Metric | Value |
|---|---|
| Total commits in sprint window | 30 (33 after Phase 10 retro filing) |
| Phases completed | 10 + pre-build housekeeping |
| Hotfix rounds | 4 (8 fixes total) |
| Files changed | 46 |
| Lines added | +10,008 |
| Lines deleted | -176 |
| Unit tests added | +116 (883 final passing, ~767 baseline) |
| Unit tests passing at close | 883 |
| Unit tests failing at close | 1 (`collapsible-title-strip.test.js`, pre-existing, unrelated) |
| Unit tests skipped at close | 9 |
| Migrations applied | 1 (`0047_profiles_add_cmg_message_log.sql`) |
| Schema columns added | 1 (`profiles.cmg_message_log` JSONB) |
| RPC functions added | 1 (`append_cmg_message_log`) |
| DECs filed | 6 (DEC-CFBRB-096 through DEC-CFBRB-101) |
| New files (highlights) | `src/data/cmgScenarios.ts`, `src/pages/CoachMessageGeneratorPage.jsx`, `src/components/cmg/*`, `src/lib/cmg/*`, `src/components/Toast.jsx`, `src/lib/cmg/twitter.js`, `supabase/migrations/0047_profiles_add_cmg_message_log.sql`, `tests/unit/cmg-*.test.js`, `tests/cmg.spec.js`, `docs/specs/.cmg-sprints/SPRINT_025_ACCEPTANCE_CHECKLIST.md`, `src/assets/Coach Communication Generator.docx` |
| Modified files (highlights) | `src/components/Layout.jsx`, `src/lib/navLinks.js`, `src/index.css`, `src/App.jsx`, existing test fixtures, spec docs in `.cmg-sprints/` |

---

## Open questions remaining

- **Phase 2 coach picker timing.** Blocked on `public.college_coaches` being populated. No current owner for the data acquisition track. Surfaces in every CMG retrospective conversation; needs a decision on ownership or an explicit park.
- **Template wording feedback loop ownership.** When the docx wording needs adjustment (variant tokens, hardcoded "BC High" in a couple of scenarios, missing subject lines for #9–11), who owns the docx update versus the `cmgScenarios.ts` override? The current path is to override in TS without touching the docx; whether the docx remains canonical or drifts is unresolved.
- **Phase 1 student-facing messaging about the coach data gap.** Should the "[Position Coach]" / "[Head Coach]" placeholder fields show clearer copy explaining that this will become a picker in Phase 2? Right now the placeholders read as if they are intentional permanent fields.
- **`cmg_message_log` downstream consumers.** Is the log derived from anywhere (analytics, coach contact suggestion, deliverability tracking)? Today it is fire-and-forget. If a future surface needs to consume it, that surface should be the one to define the derivation — but we should know which surfaces those might be before they need it.
- **`short_list_items` → `schools` FK migration.** Surfaced in Hotfix Round 1 (`dd0522f`). When is the right sprint to address this structural gap? Requires migration + `ON DELETE` decision.

---

## Next sprint pre-reads

- `EXECUTION_PLAN.md` is updated with the Reframings, Carry-forward changes, and a Revision History entry for sprint close.
- The next sprint in this repo is **Sprint 026**. No spec exists yet — Sprint 026's session spec needs to be authored as a separate task.
- The next CMG sprint (Phase 2 picker) is gated on `public.college_coaches` population and is not Sprint 026 unless that workstream lands first.

---

## Sprint 025 — CLOSED

All ten phases shipped. All four hotfix rounds applied. CMG Phase 1 is live on master at `1a0c9c9`. Migration `0047` is applied to the live Supabase project. 883 unit tests pass. The Playwright suite requires authenticated credentials to run in a live environment as a post-deploy verification step. The CMG page is reachable from the sandwich drawer; the eleven scenarios render; the substitution engine works; copy and email-to-self both wire through the JSONB log via the SECURITY INVOKER RPC.
