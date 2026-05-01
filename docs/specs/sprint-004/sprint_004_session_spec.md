---
sprint: 004
date: 2026-04-22
repo: gritty-recruit-hub-rebuild
mode: sprint
deploy_target: app.grittyfb.com
scope: Student View remediations — Home, My Grit Fit, Your Shortlist
deliverable_count: 15
skills_expected: [superpowers, parallel-subagents, frontend-design, planning, testing, verification, review]
schema_changes: none
new_tables: none
new_data_sources: none
carry_forward_accepted:
  - item: /browse-map catchall redirect to / (no literal 404)
    decision: accept-as-is, documented in Sprint 003 retro
  - item: Credentials-gated Playwright suite (37 cases) awaiting CI secrets
    decision: pre-flight check only, not in-scope
  - item: gritFitExplainerCopy.js placeholder copy
    decision: resolved via Sprint 004 scope (G2, G3, G4)
hard_constraints:
  - No schema migrations, no new tables, no new data sources
  - Every desktop change paired with mobile-responsive change honoring existing margin presets
  - No regressions on Sprint 001 (admin) or Sprint 003 (student) deliverables
  - If schema change is discovered mid-execution, STOP and surface — do not absorb
  - All copy changes route through src/lib/copy/ per Sprint 001 pattern
  - All pure logic routes through src/lib/ with Vitest coverage per Sprint 001 pattern
---

# Sprint 004 — Student View Remediations

## Session Context

Fourth sprint in the gritty-recruit-hub-rebuild product track. Builds on Sprint 003 (student view scorecard redesign, map merge, home view restructure). All work is student-facing; admin view (Sprint 001) is out of scope except for regression verification.

The Session Spec covers 15 discrete deliverables across three views:
- **Home** (3 deliverables)
- **My Grit Fit** (9 deliverables)
- **Your Shortlist** (3 deliverables)

One deliverable (G9) extends the GRIT FIT scoring engine with a final subordinate step for a specific high-academic student-athlete profile shape. This is pure-logic layer work in `src/lib/` — no schema change, no new data.

## Pre-Flight

Before execution begins:

1. Confirm TEST_STUDENT_EMAIL and TEST_STUDENT_PASSWORD are set in CI secrets. If set, the 37-case credentials-gated Playwright suite from Sprint 003 can run; if not, note in retro.
2. Verify Sprint 003 commit 4512769 is deployed and green on `app.grittyfb.com`.
3. Verify `Recruit Reach` field is legible in the existing schools data as JSON-accessible computed field.
4. Read `docs/superpowers/specs/erd-current-state.md` — note ERD visual may be stale, Supabase is source of truth.

## Deliverables

### HOME

#### H1 — Welcome header copy change

**Location:** Student view home, welcome banner component.

**Change:** Replace current header text with:

```
Welcome back, [First Name]!
Your results are in! Check out your GRIT FIT matches and update your college football Short List.
```

**Implementation notes:**
- Copy lives in `src/lib/copy/` — create or extend existing home-view copy module
- `[First Name]` placeholder must resolve from student profile first_name field
- No change to banner component structure or styling, text-only swap
- Vitest coverage: assert rendered text matches expected string with a test fixture first_name

**Done when:** Rendered welcome banner matches the above string with the student's first name interpolated, on both desktop and mobile.

---

#### H2 — Take the Tour modal screenshots

**Location:** Take the Tour tutorial modal (launched from home view).

**Change:** Each modal step should include a web app screenshot of the subject matter being described, to provide visual aid.

**Implementation notes:**
- Screenshots are static assets — add to `public/` or `src/assets/` per existing convention
- Per step: one screenshot slot, positioned above or alongside the step text (frontend-design skill decides layout based on existing modal width)
- Mobile: screenshots must scale down, not break modal container
- This is a content/asset deliverable — code change is to add image slots per step; operator-sourced screenshots can be populated as PNG placeholders if final screenshots aren't staged yet
- If screenshots are not provided by operator at execution time, stage placeholder PNGs and flag in output — do not block

**Done when:** Each Take the Tour step renders an image slot that displays a provided screenshot or a staged placeholder, with mobile-responsive scaling.

---

#### H3 — Three-step journey modal text spillover fix (mobile only)

**Location:** Three-step journey modal on home view, mobile breakpoint.

**Change:** Eliminate text box spillover. Desktop is unaffected.

**Implementation notes:**
- Diagnose current overflow cause — likely a fixed-width container or padding issue at mobile breakpoint
- Fix with CSS adjustments honoring existing margin presets
- Do not change desktop layout
- Playwright mobile viewport test to confirm no overflow

**Done when:** At mobile breakpoints (iPhone SE 375px, iPhone 12 390px, iPad Mini 768px), three-step journey modal text is fully contained within its box with no visual spillover.

---

### MY GRIT FIT

#### G1 — Title strip restyle: Athletic Fit Scores & Academic Rigor Scores

**Location:** My Grit Fit view, Athletic Fit Scores and Academic Rigor Scores section headers.

**Change:**
- Replace current title treatment with a **maroon title strip with gold text**, consistent with existing GrittyOS maroon/gold tokens.
- Add a collapsible toggle (chevron or equivalent) to each title strip.
- **Desktop behavior:** The two scorecards render as one modal level; the collapsible toggle on either strip collapses both modals together.
- **Mobile behavior:** The two scorecards render as two modal levels; each collapsible toggle collapses only its own modal.

**Implementation notes:**
- Use existing maroon (`#7c2529` or whatever token) and gold (`#c9a227` or whatever token) from the design system — do not introduce new color values
- Collapsible state should be local component state (not persisted)
- Default state: expanded on both desktop and mobile
- Shared `<CollapsibleTitleStrip>` component recommended — extract to `src/components/` for reuse by G4

**Done when:** Both scorecards display maroon/gold title strips with functional collapse toggles; desktop collapses both together, mobile collapses each independently.

---

#### G2 — Athletic Fit Scores explainer blurb copy change

**Location:** `src/lib/copy/gritFitExplainerCopy.js` (Sprint 003 artifact) — Athletic Fit explainer.

**Change:** Replace `"Compared to matched schools."` with:

```
Your percent rank compared to the distribution of Height, Weight, and Speed of all players in each level of college football. A score of 50% means means your athletic metrics equate to the average athletic metrics for that level of play.
```

**Implementation notes:**
- Copy-only change in `gritFitExplainerCopy.js`
- Preserve the duplicate "means means" as written in the outline — operator intent, not a typo to auto-correct. Flag in retro for operator confirmation post-sprint.
- Vitest assertion: exported copy string matches expected value

**Done when:** Athletic Fit explainer blurb renders the new string exactly as written.

---

#### G3 — Academic Rigor + Test Optional explainer blurb copy changes

**Location:** `src/lib/copy/gritFitExplainerCopy.js` — Academic Rigor and Test Optional explainers.

**Change:**

**G3a — Academic Rigor Score explainer.** Replace `"Highest composite SAT + GPA admissions standards you currently qualify for."` with:

```
Your current GPA and P/SAT scores qualify you for schools that are NOT test optional and are equal to or below this percent rank of Academic Rigor.
```

**G3b — Test Optional Score explainer.** Replace `"Highest admissions standards you currently qualify for at test-optional schools"` with:

```
Your current GPA qualifies you for admission to schools that ARE test optional and are equal to or below this percent rank of Academic Rigor.
```

**Implementation notes:**
- Both copy-only changes in the same copy module as G2
- Vitest assertions: both exported copy strings match expected values

**Done when:** Both Academic Rigor and Test Optional explainer blurbs render their new strings exactly as written.

---

#### G4 — GRIT FIT Recommendation Division Mix blurb: title strip + copy change

**Location:** My Grit Fit view, Division Mix blurb section.

**Change:**

**G4a — Title strip.** Apply maroon-background/gold-text title strip with collapsible toggle (reuse `<CollapsibleTitleStrip>` from G1). Desktop and mobile behavior: single modal level, single collapse toggle.

**G4b — Copy change.** Replace the fourth sentence (starting `"If your Grit Fit map looks D3-heavy..."` and running through `"...see how your scores and matches shift as your numbers change."`) with:

```
If your Grit Fit Map and Grit Fit Table look D3-heavy, you are almost certainly looking at a real opportunity to find a program where your football talent allows you to earn a degree worth hundreds of thousands of dollars more than other students with a similar academic background, but who are not recruitable as football players.

Want to see how athletic and academic growth could change your GRIT FIT Recommendations? Use the what-if sliders below to see how your scores and matches shift as your numbers change. Don't be afraid to add Athletic and Academic Stretch schools to your Shortlist.
```

**Implementation notes:**
- Note the blank line / line break between the two paragraphs — render as `\n\n` or a `<br/><br/>` depending on component implementation
- Copy lives in `src/lib/copy/gritFitExplainerCopy.js` alongside G2/G3
- Vitest assertion: exported copy string matches expected value including paragraph break

**Done when:** Division Mix blurb renders with maroon/gold collapsible title strip and new two-paragraph copy.

---

#### G5 — GRIT FIT Map School Details Card: add Status indicators

**Location:** My Grit Fit Map, school details card (slide-out or popover on school marker click).

**Change:** Add a Status indicator to the card, using the same colored-bubble treatment as the Shortlist status indicators.

**Status taxonomy (six values, operator-confirmed):**
- Currently Recommended
- Below Academic Fit
- Academic Stretch
- Athletic Stretch
- Highly Recruitable
- Outside Geographic Reach

**Note:** "Not Evaluated" was in the outline draft but removed per operator confirmation — all schools are evaluated through the GRIT FIT engine, so the state is not reachable.

**Implementation notes:**
- Status is a derived property, not a schema field — computed from student profile × school in the GRIT FIT engine output
- Reuse existing Shortlist status bubble component — extract to shared component if not already
- Color tokens must match Shortlist exactly (visual parity across views is the point)
- Pure-logic: status derivation function in `src/lib/` with Vitest coverage for each of the six states

**Done when:** Map school details card renders the correct status bubble for each school, with visual parity to the Shortlist bubbles.

---

#### G6 — GRIT FIT Map filter: replace Conferences with Status

**Location:** My Grit Fit Map filter UI.

**Change:**
- Remove the Conferences filter entirely.
- Add a Status filter using the six-value taxonomy from G5.

**Implementation notes:**
- Filter options: multi-select, same UX pattern as existing filters
- Filter state should persist through map interactions (pan/zoom) but not across sessions
- Default state: all statuses selected (no filtering applied)

**Done when:** Map filter UI shows a Status filter in place of Conferences, with all six status values as selectable options, and map markers respond to filter state.

---

#### G7 — GRIT FIT Table mobile: sort controls + tap-to-slide-out

**Location:** My Grit Fit Table, mobile breakpoint only.

**Change:**

**G7a — Sort controls.** Mobile view cannot show desktop table headers. Add a sort control UI (dropdown or button group) with these four sort keys:
- GRIT FIT Rank
- Distance
- ADLTV
- Annual Cost

**G7b — Tap-to-slide-out.** When an individual school row is tapped in mobile view, open a slide-out school details card matching the GRIT FIT Map school details card (from G5). Same content, same component.

**Implementation notes:**
- Sort control should be visually distinct from table rows but inside the table container
- Slide-out animation should match the Shortlist slide-out pattern from S3 (use same component if possible)
- Desktop view is unchanged — this is mobile-only

**Done when:** Mobile GRIT FIT Table shows sort controls for the four listed keys and opens a slide-out school details card on row tap.

---

#### G8 — GRIT FIT Table tooltips (desktop and mobile)

**Location:** GRIT FIT Table column headers (desktop) and sort control labels (mobile, from G7a).

**Change:** Add hover (desktop) / tap (mobile) tooltips for six columns:
- Rank
- Div
- Conf
- Distance
- ADTLV
- Your Annual Cost (tooltip notes this is an estimate using parent financial info from the Student Profile)

**Implementation notes:**
- Tooltip copy should live in `src/lib/copy/` — create or extend a table tooltip copy module
- Use existing tooltip component if one exists, otherwise introduce a minimal accessible tooltip (frontend-design skill decides)
- Mobile: tap-to-reveal, tap-elsewhere-to-dismiss
- ADTLV preserved as operator spelling; do not auto-correct to ADLTV (note: G7a uses ADLTV, G8 uses ADTLV — operator to reconcile post-sprint, spec preserves outline)
- Tooltip copy for "Your Annual Cost" must include the parent-financial-info qualifier

**Done when:** All six column headers / sort labels display tooltips on hover (desktop) and tap (mobile) with operator-authored copy.

**Operator reconciliation flag:** ADLTV (G7a) vs. ADTLV (G8) spelling mismatch — preserve as written in outline; operator to reconcile in retro.

---

#### G9 — GRIT FIT scoring engine: D2-capable, high-academic subordinate step

**Location:** GRIT FIT scoring engine in `src/lib/` (Sprint 003 extended scoring logic).

**Change:** Add a final subordinate step to the GRIT FIT scoring engine that activates only for student-athlete profiles meeting all three of these conditions:

**Trigger conditions (all must hold — Reading A, operator-confirmed):**
1. Student Athletic Fit Score ≥ 50% for **both** D2 and D3 levels
2. Student Academic Rigor Score ≥ 85% (property of the student, not of schools)
3. Student's profile generates ≥ 30 candidate D2 schools (i.e., schools where the student's Athletic Fit ≥ 50% at D2)

**Subordinate step behavior when trigger fires:**
1. Cap D2 returns at **two** schools maximum. The two eligible D2 schools are: **Bentley University** and **Colorado School of Mines**. Which of the two returns first is determined by the student's Recruit Reach proximity to each school (Recruit Reach is an existing computed field, JSON-legible).
2. Fill the remainder of the GRIT FIT recommendation slots with the **highest-qualifying Academic Rigor Score D3 schools** from the database (where student Athletic Fit at D3 ≥ 50%).

**Rationale preserved in code comment:** High-academic students returning too many D2 schools would see those schools labeled "Below Academic Fit" due to the student's academic qualifications exceeding typical D2 academic rigor. This would produce recommendations with lower degree value and lower degree ROI than a properly-filtered D3 selection for the same student.

**Implementation notes:**
- Pure-logic layer — lives in `src/lib/gritFitEngine/` (or wherever Sprint 003 placed the scoring engine)
- Must run **after** the main scoring engine completes, as a final filter/transform step
- Must be unit-tested with Vitest covering:
  - All three trigger conditions met → D2 capped at 2 (Bentley + Colorado Mines in Recruit Reach order) + D3 fill
  - Trigger condition 1 fails (Athletic Fit < 50% at D2 or D3) → no subordinate step applied
  - Trigger condition 2 fails (Academic Rigor < 85%) → no subordinate step applied
  - Trigger condition 3 fails (< 30 candidate D2 schools) → no subordinate step applied
  - Recruit Reach proximity: Bentley closer → Bentley first; Colorado Mines closer → Colorado Mines first
  - Edge case: only one of Bentley / Colorado Mines has student Athletic Fit ≥ 50% at D2 → only that one returns, still cap at 2 but one slot is empty and the D3 fill expands
- Integration test: fixture student profile meeting all three conditions → verify recommended list structure end-to-end
- Must not regress any Sprint 003 scoring behavior for profiles that don't meet the trigger

**Done when:** Scoring engine applies the subordinate step correctly for trigger-matching profiles and leaves all other profiles untouched, with full Vitest coverage including negative cases.

---

### YOUR SHORTLIST

#### S1 — Pre-Read Docs Library: collapsible + copy change

**Location:** Shortlist view, Pre-Read Docs Library section.

**Change:**

**S1a — Collapsible.** Section should be collapsible (reuse `<CollapsibleTitleStrip>` from G1 if visually appropriate, otherwise a minimal collapse pattern consistent with the rest of the view).

**S1b — Explainer copy.** Replace `"Upload your documents once here, then share them to individual schools from each school card below."` with:

```
Coaches and admissions officials at academically selective schools will require some or all of these documents to recruit you. Upload your documents once here, beginning on February 1st of your Junior Year, then share them with individual schools from each school card below when requested.
```

**Implementation notes:**
- Copy lives in `src/lib/copy/` — create or extend a shortlist copy module
- Collapsible state local, default expanded
- Vitest assertion: exported copy string matches expected value

**Done when:** Pre-Read Docs Library is collapsible and renders the new explainer copy.

---

#### S2 — Shortlist main: list format replacing card layout

**Location:** Shortlist view main page.

**Change:** Replace current card/tile layout with a list format matching the screenshot in the outline (page 7 of the PDF). Each row shows:
- School name (left, primary)
- Division · Conference (left, secondary under school name)
- Status pill (center-right, colored bubble matching G5/G6 status taxonomy)
- Rank indicator (right, format "N/15" where 15 = total list length)

**Retain from current implementation:**
- Filters: Status, Divisions, Conferences
- Sorting options: Name, Date Added, Distance, Degree ROI, Annual Net Cost, Fastest Payback
- When sorted, each row displays its rank number relative to the full (filtered) list in the format "N/total"

**Implementation notes:**
- New `<ShortlistRow>` component replacing existing card component
- The rank-indicator "N/15" pattern matches the screenshot — `total` is the count of the currently-filtered list, not the unfiltered list
- Visual parity with the screenshot: cream/beige row background, maroon school name, dark secondary meta text, status pill with taxonomy colors, small maroon progress-bar-style rank indicator on the right
- Mobile-responsive: rows stack cleanly, status pill and rank indicator remain legible at mobile widths
- Row is clickable/tappable — click opens slide-out (S3)

**Done when:** Shortlist main page renders as a list per the screenshot with filters, sorts, and rank indicators working; row click opens the S3 slide-out.

---

#### S3 — Shortlist slide-out (single-layer, per screenshot)

**Location:** Shortlist view, triggered by click/tap on any S2 row.

**Change:** New single-layer slide-out matching the screenshot in the outline (page 9 of the PDF).

**Slide-out contents (top to bottom):**
1. Close (X) button, top-left
2. School name, large maroon type
3. Conference · Division · Distance (e.g., "NESCAC | D3 | 131 miles") — secondary meta
4. "Added [date]" — tertiary meta
5. "Viewing [Student Name]'s progress with this school" — italic subhead
6. Two action buttons side-by-side:
   - **Recruiting Questionnaire** (maroon, primary) — links to the school's recruiting questionnaire
   - **Coaching Staff** (outline, secondary) — opens coaching staff contact info
7. Three offer-status pills: **Verbal Offer**, **Committable Offer**, **Commitment** — rendered as outlined/dashed pills, filled only when status is achieved
8. Status pills from the G5 taxonomy (e.g., "Academic Stretch", "Highly Recruitable") — can be multiple
9. Data strip (cream background, four columns): **COA**, **Annual Net Cost**, **DROI**, **Fastest Payback** with values
10. **Recruiting Journey Progress** (collapsible) — "N of 15 steps completed" with a maroon progress bar
11. **PRE-READ DOCUMENTS** section — list of documents, each row showing:
    - Document name (Transcript, Course List, Writing Sample #1, Writing Sample #2, Resume, School Profile, Test Scores)
    - Status pill (e.g., "NOT SUBMITTED", "SUBMITTED")
    - Two action buttons per row: **Email (Head) Coach** (maroon outline) and **Email Counselor** (blue outline)

**Student-view-specific behavior (vs. Coach's view referenced as visual precedent):**
- This is the **only** slide-out layer for the student view (coach's view has two layers; student view has one)
- Buttons labeled **"Email (Head) Coach"** and **"Email Counselor"** — student emails their high school head coach and guidance counselor about the school. "Head" is implied — label can read "Email Coach" if space-constrained, with tooltip or accessibility label including "Head Coach"
- Contact data (HS head coach email, guidance counselor email) is sourced from existing Student Profile fields — confirm these fields are JSON-legible in profile data at execution time; if not, STOP and surface (per hard constraint)
- The existing Recruiting Questionnaire and Coaching Staff buttons (items 6) continue to contact the college coaches as they do in the coach's view

**Implementation notes:**
- Slide-out animation and width should match the G7b map slide-out — ideally the same component, parameterized by content
- All button actions open `mailto:` links with pre-filled subjects/bodies where helpful
- The Pre-Read Documents section reads the existing Pre-Read Docs state (Sprint 003 or earlier) — no new data model
- Recruiting Journey Progress value ("6 of 15" in screenshot) reads from existing recruiting progress state — no new data model

**Done when:** Clicking any Shortlist row opens the single-layer slide-out with all listed sections, Email (Head) Coach and Email Counselor buttons functioning as mailto handlers populated from Student Profile fields.

**STOP-and-surface trigger:** If Student Profile does not already contain HS head coach email and guidance counselor email fields, halt this deliverable and surface to operator — do not introduce new profile fields without scope approval.

---

## Testing & Verification

Per Sprint 001 / Sprint 003 pattern:

**Vitest coverage (new assertions):**
- Every copy change: exported string matches expected value
- G5 status derivation: one assertion per status value (six assertions)
- G9 scoring engine: minimum seven assertions covering all trigger conditions, negative cases, and Recruit Reach ordering
- G7a sort logic: one assertion per sort key (four assertions)

**Playwright coverage (new cases, credentials-gated):**
- H1 welcome header renders with first name interpolated
- H3 mobile overflow absent at three breakpoints (375, 390, 768)
- G1/G4 title strip collapse behavior (desktop and mobile variants)
- G5 map card shows status bubble
- G6 map filter shows Status options, excludes Conferences
- G7a mobile sort controls functional
- G7b mobile tap-to-slide-out opens
- G8 tooltips display on hover and tap
- S2 list layout renders with filters and sorts
- S3 slide-out opens with all sections

**Regression verification:**
- Sprint 001 admin panel: no change expected, visual smoke test
- Sprint 003 student view scorecard, map merge, home view: no regression, full Playwright pass on existing gated suite
- `/browse-map` route: continues to catchall-redirect to `/` as Sprint 003 accepted state

## Parallelization Plan

Claude Code should decompose into parallel subagent workstreams where dependencies allow:

**Workstream A — Copy-only changes (fast, no component dependencies):**
H1, G2, G3, G4b, S1b

**Workstream B — Shared components (must complete before consumers):**
`<CollapsibleTitleStrip>` (consumed by G1, G4a, S1a), shared slide-out component (consumed by G7b, S3)

**Workstream C — Pure logic (independent of UI):**
G5 status derivation function, G9 scoring engine subordinate step — both can run in parallel with Workstream A and B

**Workstream D — View integrations (depend on B and C):**
G1, G4a, G5 card integration, G6 filter, G7, G8, S1a, S2, S3 — depend on Workstream B components and Workstream C functions

**Workstream E — Asset staging (independent):**
H2 screenshot slots + placeholder PNGs

**Workstream F — Mobile pairing (reviewed at end of each view):**
H3 mobile overflow fix, plus mobile-pair verification for every desktop change in My Grit Fit and Shortlist

## Deploy & Close

Single commit, single deploy to `app.grittyfb.com`, following Sprint 003 pattern. Sprint 004 retro captures:
- Deliverable completion count vs. 15 scoped
- Any STOP-and-surface events and resolution
- Operator reconciliations flagged (G2 "means means", G7a/G8 ADLTV/ADTLV spelling)
- Carry-forward items for Sprint 005 if any
