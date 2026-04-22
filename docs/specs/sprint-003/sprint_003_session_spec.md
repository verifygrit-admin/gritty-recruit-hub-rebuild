---
sprint: 003
title: Student View Remediations
product_repo: gritty-recruit-hub-rebuild
deploy_target: https://app.grittyfb.com
sprint_date: 2026-04-22
session_type: sprint
mode: single-session
spec_status: draft
spec_path: docs/specs/sprint-003/sprint_003_session_spec.md
prior_sprint_retro: docs/specs/sprint-001/sprint_001_retro.md
skills_invoked:
  - frontend-design
  - superpowers
  - parallel-subagents
hard_constraints:
  - no_new_tables
  - no_schema_migrations
  - no_new_data_sources
  - mobile_responsive_paired
  - no_sprint_001_regressions
deliverables:
  - D1_masthead_rename
  - D2_home_view_restructure
  - D3_map_merge
  - D4_grit_fit_scorecard_redesign
---

# Sprint 003 — Student View Remediations

## Scope summary

Four deliverables against the Student View of the Recruit Hub, all UI/UX remediations with no schema or data-pipeline changes. D1 is a masthead rename. D2 restructures the Home view with a new three-step user journey, a nav reorder, and button treatment updates. D3 merges the Browse Map and GRIT FIT Map into a single "My Grit Fit Map" with a new Recruiting List filter. D4 redesigns the GRIT FIT Matches scorecard display, adds an explainer section, adds view-only "what-if" sliders, and changes the match-return logic for profiles meeting a high-academic / D2+D3 threshold.

## Hard constraints

- No new database tables. No schema migrations. No new data sources.
- Every desktop change paired with mobile-responsive change honoring existing margin presets.
- No regressions on Sprint 001 deliverables: admin view, pagination, POR tooltip, Has Password column, shared AdminTableEditor component.
- If a schema change is discovered to be necessary mid-execution, stop and surface it — do not absorb it into the sprint.

## Skills to invoke during execution

- **frontend-design** (`/mnt/skills/public/frontend-design/SKILL.md`) — invoke before any visual component change in D2c, D3, D4.
- **superpowers** — use where it accelerates file search, multi-file edits, and test scaffolding.
- **parallel subagents** — launch parallel workstreams per the parallelization plan below.

## Pre-flight checklist

- [ ] Read `docs/superpowers/specs/erd-current-state.md` to confirm no schema dependency surprises.
- [ ] Read `docs/specs/sprint-001/sprint_001_retro.md` for carry-forward patterns (shared-component extraction, pure-logic in `src/lib/`, Edge Function aggregate pattern, orphan cleanup).
- [ ] Read current Student View masthead, Home view, Browse Map, GRIT FIT Map, and scorecard components before writing code.
- [ ] Read existing design tokens / theme file to locate gold, drop-shadow, and button color tokens.
- [ ] Verify test fixtures exist for mocked athlete profiles covering the D4 threshold logic (Athletic Fit ≥ 50% for D2 + D3, Academic Rigor ≥ 85%).

---

## D1 — Masthead rename

### Input state

Student View masthead renders the text `BOSTON COLLEGE HIGH SCHOOL RECRUIT HUB` on every authenticated Student View route. Admin View masthead is separate and unaffected.

### Desired end state

Student View masthead renders `BC HIGH RECRUIT HUB` on every authenticated Student View route. Admin View masthead is unchanged. Typography, container sizing, and background treatment remain identical to current state.

### Files

- **Modify:** masthead component for the Student View (expected path: `src/components/layout/StudentMasthead.jsx` or equivalent — confirm during pre-flight).
- **Modify (if present):** any page-title / meta-title strings that reference the old name.
- **Add:** none.
- **Delete:** none.

### Acceptance tests

- Vitest: `student-masthead.test.js` — assert rendered text is `BC HIGH RECRUIT HUB` on mount.
- Playwright: visual check at desktop (1440w) and mobile (390w) breakpoints on `/home`, `/grit-fit`, `/shortlist`, `/profile`.
- Regression: Admin View masthead assertion unchanged.

### Mobile-responsive notes

Text length drops from ~37 chars to ~17 chars. Confirm mobile masthead container does not need re-padding; shorter text should fit more comfortably, not break layout.

### Dependencies

None. D1 is fully isolated.

### Risk flags

None.

---

## D2 — Home view restructure

Three sub-changes, all touching the Home view.

### D2a — User journey replacement of dual modals

#### Input state

Home view shows two side-by-side modals under the heading "Choose how to explore colleges:":
- Browse Map modal (explains browsing all 662 programs, button: "Browse Map")
- GRIT FIT modal (explains personalized match results, button: "View Results")

#### Desired end state

The dual-modal block is replaced with a vertical three-step user journey, each step a dynamic modal/card with connecting arrows indicating flow direction:

1. **My Profile** — what the Student Athlete Profile is, how to create it, why the data matters to downstream results.
2. **My Grit Fit** — how Grit Fit is calculated, what it returns, why it matters to the student's recruiting strategy.
3. **My Short List** — how the student builds their Short List, how it drives the recruiting journey and coach relationships.

Each card:
- Has a clear heading, 2–3 sentences of explanatory copy (operator-editable constant, placeholder copy drafted in implementation), and a CTA button linking to the corresponding route.
- Connects to the next card visually via a down-arrow separator.

Copy should be drafted as editable constants in a dedicated copy file (e.g., `src/lib/copy/homeJourneyCopy.js`) so the operator can revise without component edits.

#### Files

- **Add:** `src/components/home/JourneyCard.jsx` (reusable card primitive).
- **Add:** `src/components/home/JourneyStepper.jsx` (composes three cards + arrows).
- **Add:** `src/lib/copy/homeJourneyCopy.js` (editable copy constants).
- **Modify:** `src/pages/Home.jsx` — remove dual-modal block, mount JourneyStepper.
- **Delete:** dual-modal components if they are not reused elsewhere (confirm by grep before deletion).

#### Acceptance tests

- Vitest: `journey-stepper.test.js` — renders three cards in order My Profile, My Grit Fit, My Short List; each card renders its heading, body, and CTA.
- Vitest: `journey-card.test.js` — prop-driven rendering of heading, body, CTA label, CTA href.
- Playwright: snapshot of Home view at desktop + mobile, with focus on correct ordering and arrow connectors.

#### Mobile-responsive notes

Vertical stack naturally suits mobile. Confirm arrow connectors scale appropriately and do not overflow on narrow viewports. Use existing margin presets for card spacing.

### D2b — Menu reordering

#### Input state

Top nav order: `HOME  MY GRIT FIT  SHORTLIST  PROFILE`.

#### Desired end state

Top nav order left-to-right, following the user journey:

1. My Profile
2. My Grit Fit
3. My Shortlist

HOME anchor handling: preserve HOME as leftmost nav item if existing routing requires it, OR absorb the Home route into the logo/masthead click-target (standard pattern). Spec-level decision: **preserve HOME as leftmost** unless implementation reveals a clean reason to absorb. Document the choice in the retro.

Final proposed order: `HOME  MY PROFILE  MY GRIT FIT  MY SHORTLIST`.

Label updates:
- `MY GRIT FIT` (already present)
- `SHORTLIST` → `MY SHORTLIST`
- `PROFILE` → `MY PROFILE`

#### Files

- **Modify:** top nav component (expected: `src/components/layout/StudentNav.jsx` — confirm during pre-flight).
- **Modify:** any route label constants / i18n strings referencing the old nav names.

#### Acceptance tests

- Vitest: `student-nav.test.js` — asserts rendered order and labels.
- Playwright: visual check of nav at desktop + mobile (hamburger menu if applicable).

#### Mobile-responsive notes

If nav collapses to a hamburger on mobile, confirm the drawer ordering matches desktop.

### D2c — Welcome message button treatment

#### Input state

Welcome message area shows two buttons: `Edit Profile` and `View Results Now`. Both have transparent or outlined backgrounds. No drop shadow.

#### Desired end state

Both buttons:
- Solid background (no transparency).
- White lettering.
- Light drop shadow (use existing shadow token if present, e.g., `shadow-sm` in Tailwind or equivalent).

Label change:
- `View Results Now` → `View My Results Now`.

Color:
- `View My Results Now` button uses a darker, richer gold than current. If an existing design-token gold (e.g., `gold-700` or `brand-gold-dark`) fits, use it. Otherwise, propose a hex value in the implementation PR (suggest starting from the current gold, shifted ~15–20% darker in HSL lightness) and leave as a one-line token addition.
- `Edit Profile` button: solid background matching current brand primary.

#### Files

- **Modify:** Home view welcome message section (`src/pages/Home.jsx` or extracted `src/components/home/WelcomeBanner.jsx`).
- **Modify (if needed):** design tokens / theme file to add a darker gold token.

#### Acceptance tests

- Vitest: assert button labels (`Edit Profile`, `View My Results Now`).
- Playwright: visual regression on button treatment at desktop + mobile.

#### Mobile-responsive notes

Confirm button sizing and drop shadow render correctly on touch viewports.

### D2 dependencies

D2a, D2b, D2c all touch Home view / top-level layout. Internally sequenceable or parallelizable across sub-agents if file isolation is clean. D2c's darker-gold token, if added, should land before D2c button implementation.

### D2 risk flags

- If no darker-gold token exists, do not hardcode a hex inline — add a token to the design system file and reference it. Inline hex is a Sprint 001-style hygiene regression.
- If dual-modal components are reused elsewhere (unlikely but verify), do not delete — just unmount from Home view.

---

## D3 — Map merge

### Input state

Two separate map experiences exist:

1. **Browse Map** (`/browse-map` or equivalent route) — renders all 662 college football programs with division-colored pins per the existing legend (Power 4, G6, FCS, D2, D3). Pin click opens a School Detail Card. Filters: All Divisions dropdown. Search box for school/city/state.

2. **GRIT FIT Map** (`/grit-fit` or equivalent route) — renders the 30 matched programs with the current Grit Fit styling. Filters: All Conferences, All Divisions, All States. Search box. Map View / Table View toggle. Recalculate button. Shortlist-membership indicator on pin cards.

School Detail Cards on both maps include: Recruiting Questionnaire link, Coach Contact link, Add to Shortlist / In Shortlist indicator.

### Desired end state

Single unified map at `/grit-fit` renamed conceptually to **"My Grit Fit Map"**. The Browse Map route is deleted.

Base layer renders all 662 programs with division-colored pins per the existing legend. Overlay icons indicate Grit Fit / Shortlist state:

- **Grit Fit recommended schools** — star icon overlay on the division-colored pin.
- **Shortlist schools** — check icon overlay on the division-colored pin.
- Pins with both states show both overlays (stacking pattern TBD in implementation — spec allows either side-by-side or composed).

New filter: **Recruiting List** with three options:

- `All Schools` (default) — shows all 662 programs.
- `My Grit Fit (Recommended)` — filters to the 30 matched programs.
- `My Short List` — filters to shortlisted programs only.

Existing filters preserved unchanged: **Competition Level**, **Conferences**, **States**.

Retained unchanged:

- School Detail Cards: Recruiting Questionnaire link, Coach Contact link, Add to Shortlist / In Shortlist indicator.
- Map View / Table View toggle.
- Recalculate button.
- Search box (school name or location).

Browse Map route, component, and any component-level tests are deleted after merge verification passes. Edge Functions backing Browse Map (if any exist as dedicated endpoints) are candidates for removal — sequence with orphan cleanup per Sprint 001 pattern.

### Files

- **Modify:** GRIT FIT Map component (`src/components/map/GritFitMap.jsx` or equivalent) — expand to render all 662 programs as base layer, add overlay logic for Grit Fit / Shortlist icons, add Recruiting List filter.
- **Modify:** map filter bar component — add Recruiting List dropdown.
- **Modify:** data-fetching layer — ensure the map pulls the full 662-school dataset plus the user's 30 Grit Fit matches plus the user's shortlist IDs. Reuse existing endpoints; do not add new ones.
- **Add:** `src/lib/map/overlayLogic.js` — pure function mapping a school record + user context to the correct overlay state (none / star / check / both).
- **Add:** `src/lib/map/recruitingListFilter.js` — pure function for the new filter.
- **Delete:** Browse Map component, route, and associated test files.
- **Delete (if orphaned after merge):** any Edge Functions dedicated solely to Browse Map.

### Acceptance tests

- Vitest: `overlay-logic.test.js` — unit tests for star / check / both / none outcomes across representative school records.
- Vitest: `recruiting-list-filter.test.js` — unit tests for each filter option returning the expected school subset.
- Vitest: `grit-fit-map.test.js` — component-level assertions: 662 programs render as base, overlays apply correctly, filters compose with existing Competition Level / Conferences / States filters.
- Playwright: `grit-fit-map-merge.spec.js` — 5–7 cases covering default load, Recruiting List filter toggle, School Detail Card link preservation, search box, Map/Table View toggle, Recalculate button, Browse Map route returns 404 (confirming deletion).
- Regression: existing Sprint 001 map-test failure (Leaflet render issue, retro carry-forward #3) is NOT fixed in this sprint — leave as-is.

### Mobile-responsive notes

- Map height and filter bar stacking on mobile should follow existing GRIT FIT Map mobile treatment.
- Recruiting List dropdown may need to collapse into a filter drawer on narrow viewports if the filter bar already stacks.

### Dependencies

- Must not begin before pre-flight reading of ERD and current map component is complete.
- D4 also lives under `/grit-fit` — sequence D3 before D4 OR cleanly isolate files (overlay logic / filter logic are in `src/lib/map/`; scorecard logic is in `src/lib/grit-fit/`).

### Risk flags

- **Performance:** rendering 662 pins instead of 30 may affect initial load and pan/zoom responsiveness. If Leaflet performance degrades meaningfully, consider pin clustering — but do not add new dependencies mid-sprint. Flag as carry-forward if needed.
- **Pre-existing Leaflet test failure** (Sprint 001 retro item 3) must not be touched. Verify new map tests do not inherit the same failure pattern.
- **Orphan cleanup:** only delete Browse Map Edge Functions if grep confirms zero references. Follow Sprint 001 `SchoolsTableEditor` deletion pattern.

---

## D4 — GRIT FIT Matches scorecard redesign

### Input state

Three side-by-side scorecards at the top of the GRIT FIT Matches view:

1. **Athletic Fit Score** — single composite percentage (e.g., 67.6%) with caption "Compared to matched schools".
2. **Academic Rigor Score** — single percentage (e.g., 84.4%) with caption "SAT + GPA composite".
3. **Test Optional Score** — single percentage (e.g., 94.9%) with caption "GPA-only score".

No explainer section. No what-if sliders. Match-return logic returns 30 schools ranked by Grit Fit score regardless of the division mix implications for high-academic profiles.

### Desired end state

Two restructured scorecards plus a new explainer section plus view-only what-if sliders plus new match-return logic.

#### Scorecard 1 — Athletic Fit Scores (per-division breakout)

Replaces the single Athletic Fit Score. Shows per-division percentages across Power 4, G5, FCS, D2, D3. Each per-division score gets threshold-based color treatment:

- `≥ 50%` — green, labeled **Athletic Fit**
- `40% – 49.9%` — yellow, labeled **Athletic Stretch**
- `< 40%` — greyed out (no label, or a subdued "Below Fit" label — spec defers to frontend-design skill judgment)

Caption: "Compared to matched schools".

#### Scorecard 2 — Academic Rigor Scores (merged)

Merges the existing Academic Rigor Score and Test Optional Score into a single scorecard with both figures side by side.

Captions:

- Academic Rigor Score: "Highest composite SAT + GPA admissions standards you currently qualify for"
- Test Optional Score: "Highest admissions standards you currently qualify for at test-optional schools"

#### GRIT FIT Explainer (new section)

A narrative explainer placed below the scorecards and above the map. Copy explains why the GRIT FIT model is recommending this specific division mix for this student, framed to:

- Counter the myth that D2 and especially D3 football are "after-thoughts" or "less than".
- Surface the merit-aid opportunity and degree value of high-academic D3 programs.

Implementation stores copy as an operator-editable constant (e.g., `src/lib/copy/gritFitExplainerCopy.js`) with placeholder copy drafted during implementation. Do NOT hardcode copy into the component.

#### What-if sliders (new, view-only)

Below the explainer, render five sliders for:

1. Height
2. Weight
3. 40yd Time
4. GPA
5. SAT Score

Slider interaction:

- Changes to any slider update the scorecard figures AND the map/table match results in real time.
- Updates are **view-only** — no writes to the student's profile or any database.
- **Reset button** restores true profile values.

Implementation pattern: slider state lives in local React state, feeds into a pure client-side recomputation of Grit Fit scores and match returns. Server calls are NOT made on slider change. Reset swaps local state back to the server-provided true profile.

#### New match-return logic

When a student profile produces ALL of:

- Athletic Fit ≥ 50% for D2 AND
- Athletic Fit ≥ 50% for D3 AND
- Academic Rigor ≥ 85%

Then the match-return logic returns:

- At most **2 qualifying D2 schools** — Bentley University and Colorado School of Mines, subject to the existing Recruit Reach proximity logic (so a student outside Recruit Reach of one or both may see 0 or 1 D2 returns).
- **Remaining 28–30 slots filled with highest-qualifying D3 schools.**

Rationale: for high-academic, D2+D3 qualifying students, pure Grit Fit ranking would return too many D2 schools that end up labeled "Below Academic Fit" because D2 academic standards generally sit below this student's threshold. Academic rigor supersedes division-of-play return ranking for this cohort.

For students NOT meeting this combined threshold, existing match-return logic is unchanged.

### Files

- **Modify:** GRIT FIT Matches scorecard component (expected: `src/components/grit-fit/MatchScorecards.jsx` — confirm).
- **Add:** `src/components/grit-fit/AthleticFitScorecard.jsx` — per-division breakout card.
- **Add:** `src/components/grit-fit/AcademicRigorScorecard.jsx` — merged academic card.
- **Add:** `src/components/grit-fit/GritFitExplainer.jsx` — explainer section.
- **Add:** `src/components/grit-fit/WhatIfSliders.jsx` — slider panel with Reset button.
- **Add:** `src/lib/copy/gritFitExplainerCopy.js` — operator-editable explainer copy.
- **Add:** `src/lib/grit-fit/athleticFitThresholds.js` — pure function mapping score → {color, label}.
- **Add:** `src/lib/grit-fit/recomputeMatches.js` — pure client-side function for slider-driven recomputation.
- **Add / modify:** `src/lib/grit-fit/matchReturnLogic.js` — pure function implementing the new D2-cap-at-2 + D3-fill logic. **This must live in pure logic with no DB access.** If the implementation attempts to add a config table or DB lookup, stop and surface as a schema-change risk.
- **Modify:** GRIT FIT Matches page / route to compose the new components.

### Acceptance tests

- Vitest: `athletic-fit-thresholds.test.js` — color/label assignment across threshold boundaries (≥ 50%, 49.9%, 40%, 39.9%, 0%).
- Vitest: `athletic-fit-scorecard.test.js` — per-division breakout renders, color/label correctness for a mocked fixture.
- Vitest: `academic-rigor-scorecard.test.js` — both captions render, both figures render.
- Vitest: `grit-fit-explainer.test.js` — renders copy from the copy constant.
- Vitest: `what-if-sliders.test.js` — slider state updates scorecard values via callback; reset restores initial values.
- Vitest: `recompute-matches.test.js` — slider-driven recomputation produces expected score shifts on fixture profiles.
- Vitest: `match-return-logic.test.js` — D2-cap-at-2 + D3-fill fires for qualifying profiles; default ranking applies for non-qualifying profiles; Recruit Reach interaction tested.
- Playwright: `grit-fit-scorecard-redesign.spec.js` — 4–6 cases covering scorecard rendering, explainer visibility, slider interaction, reset behavior, no-write guarantee (network tab assertion).
- Regression: verify no writes to `profiles` or related tables occur during slider interaction (Playwright or integration test on the write path).

### Mobile-responsive notes

- Per-division Athletic Fit breakdown may need to stack or horizontal-scroll on narrow viewports.
- Explainer copy should reflow cleanly.
- Sliders should be touch-friendly with sufficient track size.
- Reset button positioning should not require long scroll on mobile.

### Dependencies

- Shares `/grit-fit` route with D3. Sequence D3 first OR isolate via `src/lib/map/` (D3) vs `src/lib/grit-fit/` (D4) file boundaries.
- Depends on fixture data for mocked profiles covering the threshold logic — confirm during pre-flight.

### Risk flags

- **Schema-change temptation:** if the D2-cap-at-2 logic or the new match-return rules tempt a DB config table, **stop and surface**. This logic must live in pure client or Edge Function code with no schema dependency.
- **Silent writes:** if any slider interaction triggers a network write, that is a spec violation. Test explicitly for no-write on slider interaction.
- **Copy ownership:** explainer copy must be an editable constant. Hardcoding copy into the component is a carry-forward smell — do not ship that way.
- **Threshold-logic correctness:** boundary values (exactly 50%, exactly 40%, exactly 85%) must have explicit test coverage to prevent off-by-epsilon bugs.

---

## Parallelization plan

- **D1** (masthead): fully isolated. Run in parallel with anything.
- **D2** (home view): touches Home view and top nav. Internally, D2a/D2b/D2c can be isolated file-by-file but are grouped for review. Run in parallel with D1 and either D3 or D4.
- **D3** (map merge): touches `/grit-fit` route + map components + Browse Map deletion. Shares route with D4.
- **D4** (scorecard redesign): touches `/grit-fit` route + scorecard components + match-return logic.

**Recommended sequencing:**

- Phase 1 (parallel): D1 + D2 (three sub-agents — masthead, home-journey, nav-reorder, button-treatment).
- Phase 2 (sequential or file-isolated parallel): D3, then D4. File isolation allows parallel if `src/lib/map/` and `src/lib/grit-fit/` stay clean; otherwise sequence.

Launch parallel subagents where dependencies allow. Serialize D3 → D4 if uncertain.

## Test coverage plan

New Vitest files (target):

| File | Assertions (target) | Deliverable |
|---|---|---|
| `student-masthead.test.js` | 3 | D1 |
| `journey-stepper.test.js` | 6 | D2a |
| `journey-card.test.js` | 5 | D2a |
| `student-nav.test.js` | 5 | D2b |
| `welcome-banner.test.js` | 4 | D2c |
| `overlay-logic.test.js` | 8 | D3 |
| `recruiting-list-filter.test.js` | 6 | D3 |
| `grit-fit-map.test.js` | 10 | D3 |
| `athletic-fit-thresholds.test.js` | 8 | D4 |
| `athletic-fit-scorecard.test.js` | 6 | D4 |
| `academic-rigor-scorecard.test.js` | 4 | D4 |
| `grit-fit-explainer.test.js` | 3 | D4 |
| `what-if-sliders.test.js` | 8 | D4 |
| `recompute-matches.test.js` | 6 | D4 |
| `match-return-logic.test.js` | 10 | D4 |

**Target total:** ~92 new Vitest assertions.

New Playwright specs (target):

| File | Cases | Deliverable |
|---|---|---|
| `student-masthead.spec.js` | 4 | D1 |
| `home-restructure.spec.js` | 5 | D2 |
| `grit-fit-map-merge.spec.js` | 7 | D3 |
| `grit-fit-scorecard-redesign.spec.js` | 6 | D4 |

**Target total:** 22 new Playwright cases.

Run Playwright locally during implementation. CI credential injection (Sprint 001 retro carry-forward #4) remains pending — not blocking for sprint sign-off.

## Out-of-scope register

Explicitly NOT touched in Sprint 003:

- Admin View (anything under `/admin`).
- Parent↔student link table (Sprint 001 carry-forward #1).
- College Coaches data pipeline (Sprint 001 carry-forward #2).
- Leaflet map test failure TC-MAP-001/002 (Sprint 001 carry-forward #3).
- Schema or migration work of any kind.
- New Edge Functions (existing EFs can be deleted as orphan cleanup per D3, but no new ones).
- CSV export, data download, or any new I/O surface.
- Authentication, session handling, or permission changes.

## Sprint-level acceptance

Sprint 003 is complete when:

1. All four deliverables pass their acceptance tests locally.
2. Deploy to `https://app.grittyfb.com` succeeds and is manually verified at desktop + mobile breakpoints on `/home`, `/grit-fit`, `/shortlist`, `/profile`.
3. No Sprint 001 regressions — admin pagination, admin tabs, POR tooltip, Has Password column all still pass.
4. Browse Map route returns 404 / is removed from nav.
5. Slider interaction on D4 produces zero network writes (verified in network tab or test).
6. Retro drafted at `docs/specs/sprint-003/sprint_003_retro.md` following the Sprint 001 retro format.
