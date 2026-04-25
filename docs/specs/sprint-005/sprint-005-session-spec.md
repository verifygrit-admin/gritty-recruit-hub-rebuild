---
sprint_id: Sprint005
sprint_name: Student View Remediations - MVP
asset: Gritty OS Web App - Students
version: MVP
priority: Important, Urgent
effort: High
mode: sprint-mode
skill_invoked: /coach-me
date_start: 2026-04-25
date_target_complete: 2026-04-25
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\sprint-005
status: not_started
---

# Sprint 005 Session Spec — Student View Remediations (MVP)

## Sprint Objective

Close the remaining MVP gaps in the Student View across three surfaces — **HOME**, **MY GRIT FIT**, and **YOUR SHORTLIST** — so that the Student View is feature-complete and visually stable ahead of Sprint 007 (Splash Page) and Sprint 009 (Marketing Video).

This sprint produces no new tables, no new data, and no schema migrations. All work is UI/component/scoring-logic remediation against existing data structures.

## Hard Constraints (carry-forward from Sprints 001–004)

1. **No new tables or schema changes.** All edits use existing Supabase data.
2. **Mobile pairing required.** Every desktop UI change ships with the matching mobile-responsive change, including margin presets.
3. **No regressions.** Sprint 004 closed with 478 passing Vitest assertions; that floor is preserved.
4. **Scope discipline.** Anything that surfaces mid-session and is not in this spec goes to carry-forward, not into the sprint.

## Asset Infrastructure (per Asset Infrastructure Strategic Plan, Part 1)

**Skills available for invocation this sprint:**
- `superpowers` — primary execution
- `parallel-agents` — for independent surface work (HOME, MY GRIT FIT, SHORTLIST can parallelize)
- `front-end-design` — for component primitives and styling parity
- `planning` — for breaking deliverables into ordered tasks
- `testing` — Vitest assertion authoring and verification
- `verification` — pre-commit state checks
- `review` — pre-Phase 3 deploy review

**Auto-approved permissions (S1 classification):**
- File reads: Read, Glob, Grep
- Web lookups: WebSearch, WebFetch, Context7
- Git inspection: status, log, diff, branch list
- System checks: versions, env vars, directory listings
- Analysis/recommendation skills (no state mutation)
- Safe git operations per allowlist

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Sprint 005 Outline (source) | `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\sprint-005\` | Authoritative spec; this file is its execution artifact |
| ERD Current State | `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\superpowers\specs\erd-current-state.md` | Supabase table map (visual may be stale; verify against live DB if scoring logic touches data shape) |
| Asset Infrastructure Strategic Plan | `C:\Users\chris\.knowing\wiki\Asset-Infrastructure-Strategic-Plan.md` | Skill/permission/protocol taxonomy |

## Deliverables

### D1 — HOME: "Take the Tour" Tutorial Slide Modal Image Wiring

Wire the five tutorial slide modals to their correct placeholder images. No copy or layout changes — image-source remediation only.

| Slide | Image Path |
|---|---|
| Welcome to Your Recruit Hub | `public/tour/browse-step-1-placeholder.png` |
| Understanding the Data | `public/tour/browse-step-2-placeholder.png` |
| Filtering & Browsing | `public/tour/browse-step-3-placeholder.png` |
| Your GRIT FIT Score | `public/tour/browse-step-4-placeholder.png` |
| Choose Your Path | `public/tour/browse-step-5-placeholder.png` |

**Acceptance:** All five modals render their assigned image on desktop and mobile. Tour navigation order matches the spec order above.

---

### D2 — MY GRIT FIT: Outer Gate Recruit Reach Logic Fix (D2/D3 High Academic Mixer)

**Bug:** The Sprint 004 outer-gate "high academic mixer" correctly invokes the D2 (Bentley, Colorado School of Mines) + high-rigor/test-optional D3 mix for 85th-percentile-or-greater Academic Rigor students, but **does not re-apply Recruit Reach radius logic** to that mixed pool. Result: recommendations include schools outside the student's realistic recruit reach.

**Fix:** Re-apply Recruit Reach radius filtering as the final filter in the outer-gate formula, after the academic mixer resolves the candidate pool.

**Acceptance:**
- High-academic test student profile produces a recommendation set where every returned school passes both (a) the Academic Rigor + Test Optional mixer and (b) the Recruit Reach radius filter.
- Vitest coverage added for the radius-after-mixer ordering.
- No regression on existing Sprint 004 G6 / D2-cap / what-if slider tests.

---

### D3 — MY GRIT FIT: Multi-Fit-Category Badge Display & Pill Co-Selection

Two interrelated UI fixes on the Grit Fit Map:

**D3a — School Detail Card multi-badge display:** When a school qualifies for more than one Fit Category (e.g., both "Highly Recruitable" and "Academic Stretch"), the school details card must display **all applicable** Fit Category badges, not just one. Possible categories: Currently Recommended, Academic Stretch, Athletic Stretch, Below Academic Fit, Highly Recruitable, Outside Geographic Reach.

**D3b — Fit Category Pill co-selection:** When a single Fit Category Pill is selected by the user, and the resulting map surfaces schools that *also* qualify for additional Fit Categories beyond the one selected, the additional applicable Pills must **force-select (remain lit)** to communicate the multi-fit relationship. This is a read-out signal, not a filter expansion — the surfaced school set does not change; only the lit-pill state changes.

**Acceptance:**
- Test fixture: a school with three concurrent Fit Categories renders all three badges in the detail card.
- Selecting any one of those three Pills lights the other two when that school is among the displayed results.
- Mobile detail card has space allocated for up to all six Fit Category badges without overflow.
- Vitest coverage added for badge-set computation and pill co-selection logic.

---

### D4 — YOUR SHORTLIST: Main View Alternating Row Colors

Apply the same alternating-row background color formatting used in the Grit Fit Table View to the Shortlist Main View only.

**Scope guard:** No other Grit Fit Table styling transfers — this is row-color parity only. Shortlist intentionally retains its no-field-headers design.

**Acceptance:** Desktop and mobile Shortlist Main View show alternating row backgrounds matching Grit Fit Table View tokens.

---

### D5 — YOUR SHORTLIST: Dynamic Ranking Column

Add a dynamic ranking column to the Shortlist Main View that updates ranks whenever the user changes the Sort By selector. Sort options: **Name, Date Added, Distance, Degree ROI, Annual Net Cost, Fastest Payback**.

**Display contract:** Rank column is the leftmost column. Display style mirrors the Grit Fit Table rank visual but Shortlist retains its no-field-header design pattern (i.e., the rank column is present but unlabeled in the body, header label `Rank ↑` only).

**Acceptance:**
- Switching sort selector re-numbers ranks in real time across all six sort options.
- Ranks recompute when shortlist composition changes (add/remove school).
- Mobile view places rank as the leading element of each row card.
- Vitest coverage on rank recomputation across all six sort modes.

---

### D6 — YOUR SHORTLIST: Slide-Out Recruiting Journey Task List

**Bug:** When the collapsible Recruiting Journey Progress section is expanded, it correctly reveals the steps progress bar but **fails to render the 15-step task list** beneath it.

**Fix:** Render the full 15-step Recruiting Journey Progress Task List directly under the progress bar when the section is expanded. Task completion state is read from existing data structures (no new tables).

**Acceptance:**
- Expanding the Recruiting Journey Progress section reveals progress bar + all 15 steps with completion state.
- Collapsing hides the task list.
- Mobile slide-out renders the task list with appropriate scroll behavior inside the slide-out container.
- Vitest coverage on task list render under expanded state.

---

### D7 — YOUR SHORTLIST: Slide-Out Animation

Add a brief animated slide-out transition when a Shortlist school is selected from the Main View, replacing the current hard-cut transition.

**Acceptance:**
- Click/tap on a Shortlist row triggers a slide-out animation (recommended: 200–300ms ease-out, slide from right on desktop, slide from bottom on mobile — implementer chooses within this envelope).
- Closing the slide-out reverses the animation.
- Animation respects `prefers-reduced-motion`.

---

### D8 — Mobile UI: Stabilize Horizontal Parallax

**Bug:** Mobile users can accidentally drag the screen horizontally, producing a "wobbly" feel during navigation.

**Fix:** Constrain mobile viewport interaction to vertical-only pan/scroll. Horizontal drag should not move the page body.

**Acceptance:**
- Mobile horizontal swipe does not translate the page body.
- Vertical scroll/drag remains unaffected.
- Scoped to the app shell — does not break any intentional horizontal-scroll containers (e.g., admin panel horizontal-scroll tables, if present in student view).

---

## Phased Execution Plan

**Phase 1 — Build (parallelizable)**
- Track A (HOME): D1
- Track B (MY GRIT FIT): D2, D3a, D3b
- Track C (YOUR SHORTLIST): D4, D5, D6, D7
- Track D (Mobile shell): D8

Tracks A, B, C, D have no shared file surface conflicts and are candidates for parallel-agents skill.

**Phase 2 — Regression check**
- Run full Vitest suite. Floor: 478 passing assertions from Sprint 004, plus new assertions added in Phase 1.
- Manual smoke test of each deliverable on desktop + mobile breakpoints.

**Phase 3 — Deploy**
- `git status` clean, `--no-verify-jwt` flag not relevant (no Edge Function changes this sprint).
- Vercel deploy from main.
- Post-deploy smoke test on app.grittyfb.com.

**Phase 4 — Retro (deferred per Sprint 004 pattern if time-bound)**
- Spec deviations log
- Carry-forward register
- Vitest count delta vs. Sprint 004 floor

## Known Carry-Forward Inputs from Sprint 004

These are documented context, not work items for this sprint:
- Credentials-gated Playwright suite (37 cases) awaiting CI secrets — does not block Sprint 005 execution
- `/browse-map` redirect semantics decision — not in scope for Sprint 005
- Placeholder explainer copy needs operator revision before external stakeholder demo — addressed in a later sprint

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| ERD visual stale; D2 scoring fix touches data shape assumption | Medium | Verify radius field availability against live Supabase before implementing D2 |
| D3b co-selection logic creates infinite re-render loop | Medium | Implement co-selection as derived state from displayed-schools set, not as event-chained pill state |
| D7 animation trips `prefers-reduced-motion` user expectation | Low | Honor the media query; no animation when set |
| D8 horizontal lock breaks an intentional horizontal-scroll container elsewhere in student view | Low | Scope lock to outermost app shell; preserve `overflow-x` on inner containers |

## Definition of Done

- All 8 deliverables (D1–D8) ship desktop + mobile.
- Vitest assertion count ≥ 478 + new assertions added this sprint, all passing.
- No console errors on any student view route in production.
- Phase 3 deploy live on app.grittyfb.com.
- Spec deviations (if any) logged in retro or carry-forward.

---

## Prompt 0 — Sprint 005 Opening Prompt for Claude Code

> The text below is the literal opening prompt to paste into Claude Code at session start. Do not paraphrase it.

```
We are running Sprint 005 in sprint mode.

Spec file: docs/specs/sprint-005/sprint-005-session-spec.md

Read the spec in full before doing anything else. Then confirm back to me:
1. The 8 deliverables (D1 through D8) you've parsed from the spec
2. The 4-track parallelization plan from Phase 1
3. The hard constraints (no new tables, mobile pairing, no regressions, scope discipline)
4. Any questions on the spec — flag them now, not mid-sprint

Once I confirm, invoke the superpowers skill and begin Phase 1. Use parallel-agents
across Tracks A/B/C/D where the file surfaces don't conflict. Use front-end-design
for component primitives. Use testing for Vitest authorship.

Ground rules for this session:
- No new tables, no schema migrations.
- Every desktop UI change ships paired with mobile.
- Sprint 004 floor is 478 passing Vitest assertions. We do not regress that floor.
- Anything not in the spec goes to carry-forward, not into the sprint.
- Auto-approved permissions are the S1 set per Asset-Infrastructure-Strategic-Plan
  Part 7. Do not pause to ask for permission on S1-class actions.
- If the ERD visual at docs/superpowers/specs/erd-current-state.md disagrees with
  live Supabase on any field this sprint touches (especially for D2's Recruit
  Reach radius logic), trust the live DB and flag the staleness for retro.

When you finish Phase 1 across all tracks, stop and report status before
running Phase 2 regression.
```

---
