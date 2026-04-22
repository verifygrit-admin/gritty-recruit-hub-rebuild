---
sprint: 004
document: phase 1 state handoff
date: 2026-04-22
repo: gritty-recruit-hub-rebuild
branch: master
status: Phase 1 code fixes complete; operator re-verification pending
next_session_first_action: operator click-through re-verification of 6 Phase 1 findings on localhost dev server
---

# Sprint 004 — Phase 1 State Handoff

This document captures session-close state at the point Phase 1 code fixes landed but operator click-through re-verification has not yet been performed. The next session begins with the operator opening the dev server and re-running the Phase 1 click-through against the fixed code.

---

## Commit Chain (11 commits, all local, nothing pushed)

```
3677371 fix: Sprint 004 Phase 1 — restore scoring dimensions dropped in G9 consolidation
df86e8e fix: Sprint 004 Phase 1 — view-layer regressions (welcome copy, G5 popup revert, ShortlistSlideOut hooks + error boundary, shortlist rank reactivity, tour screenshots)
f40af85 chore: Sprint 004 — add G9 spot-check script for hand-run scoring regression
97a18da fix: Sprint 004 Phase 1 — consolidate G9 gating into applyMatchReturnLogic
0a3d9e0 feat: Sprint 004 Track B — G9 D2-cap high-academic subordinate scoring step
120e51f feat: Sprint 004 Wave 4 — S3 Shortlist slide-out + Track C EF deployment
540f2d8 feat: Sprint 004 Wave 3 — student view integrations (G1, G4a, S1a, H2, H3, G5, G6, G7a, G7b, G8, S2)
e07c776 feat: Sprint 004 Wave 1 — shared primitives (SC-1 CollapsibleTitleStrip, SC-2 StatusPill, SC-3 SlideOutShell, SC-4 SchoolDetailsCard, SC-5 Tooltip)
edbf277 feat: Sprint 004 Wave 0 — not_evaluated UI cleanup + student-read-recruiting-contacts EF scaffold + G9 test scaffold
9e296a0 feat: Sprint 004 Wave 2 — copy batch (H1, G2, G3a/b, G4b, S1b, G8 tooltips)
4512769 feat: Sprint 003 — Student View remediations (D1/D2/D3/D4)   <-- sprint baseline
```

Note on commit-date ordering: Wave 2 (`9e296a0`) was committed during its own sub-session while Waves 0 and 1 work remained uncommitted in the working tree. Waves 0 and 1 were retro-committed afterward on top of Wave 2. Topologically linear on master. Commit-date ordering oddity accepted as-is per ruling (no rebase).

---

## Test State

```
Tests:      478 passing / 1 failing (479 total)
Test files: ALL load cleanly (0 load errors)
```

- Sole failure: `tests/unit/schema.test.js:139` — journey-steps step-2 default-true bug. Pre-existing since Sprint 003. Elevated to Sprint 005 priority investigation per ruling A-8 (107/108 production rows affected, data drift not cosmetic). Do NOT fix.
- G9 spot-check via `node scripts/spot-check-g9.mjs`: 6/6 green.
- Sprint 003 floor of 194 passing: preserved.
- Sprint 004 net addition: +284 passing tests (194 → 478).

---

## Six Phase 1 Fixes — Code-Level Complete

| ID | Finding | Fix | Commit |
|---|---|---|---|
| F1 | Home welcome header second line ended with "!" in `LandingPage.jsx:349` inline text, bypassing `homeCopy.js` template. Spec requires ".". | Character swap; regression guard asserting line 2 ends "." and explicitly NOT "!". | `df86e8e` |
| F2 | G5 was replaced with SC-3 slide-out by Track B; G5's intent was additive StatusPill ON the Sprint 003 Leaflet popup. | Reverted to Sprint 003 popup (Add-to-Shortlist + Recruiting Q + Coach Contacts buttons restored). StatusPill HTML inlined via `buildStatusPillHtml` + `derivePopupStatusKey` exported helpers. `GritFitMapWithSlideOut.jsx` deleted; `GritFitPage` renders `GritFitMapView` directly. SC-4 + SC-3 retained (still consumed by G7b mobile Table). | `df86e8e` |
| F3 | `ShortlistSlideOut.jsx` useMemo at line 152 ran AFTER early return at line 115 → "Rendered more hooks than during the previous render" crash on mount. Same bug that appeared as MY-GRIT-FIT-1 blank-page via Shortlist entry point. | All hooks moved above conditional return. New `src/components/ErrorBoundary.jsx` (generic class component, `getDerivedStateFromError` + `componentDidCatch` + Retry button) wraps ShortlistSlideOut at `ShortlistPage` level. | `df86e8e` |
| F4 | Money Map doesn't render / table rankings missing / Test Optional not applied / Distance+Annual Cost not tracked on shortlist. | Root cause Candidate C: `applyG9SubordinateStep` built its new top30 from raw `schoolsPool` records, stripping all enrichments (`matchRank`, `isTestOpt`, `dist`, `netCost`, `adltv`, `droi`, `breakEven`, etc). Fix: G9 function now builds `scoredByUnitid` / `scoredByName` Maps from `scoringOutput.scored` and enriches its selected records via unitid → name → raw fallback. `applyMatchReturnLogic` derives `scored` from `options.scored` if provided, else runs `runGritFitScoring` as defensive fallback. No consumer file changes; outer-gate pattern preserved; G9 pure-function contract preserved; 8 G9 unit tests still green via the raw-record fallback. | `3677371` |
| F5 | Shortlist rank `N/total` reactivity on filter/sort change. | Production code was already reactive — rank derived from reactive `sortedItems` useMemo. Test coverage strengthened with multi-row assertion verifying rank updates from 1/5, 2/5... to 1/2, 2/2 when filter narrows. No production code change needed; test hardening only. | `df86e8e` |
| F6 | Tour screenshots rendering wrong / slide 2 breaks modal layout. | Diagnostic: all 10 PNGs present in `public/tour/`, paths well-formed, alt text meaningful. Problem: `aspectRatio` wrapper forced modal layout when slide 2 was a 560x900 portrait placeholder. Applied ruling A-7 option (ii): replaced aspectRatio wrapper with flex-centered + `maxHeight: 360` constraint. Img gets `maxHeight: 360` + `height: auto` + `objectFit: contain` so portrait placeholders letterbox without breaking modal. `TOUR_STEP_VIEWPORTS` export unchanged. | `df86e8e` |

---

## Commit Split History

Original composite commit `7167fb9` bundled all 6 F-items (both Agent 1's view-layer work and Agent 2's F4 scoring work) due to parallel agents staging overlapping trees. Per operator ruling option (b), the composite was split via `git reset --soft HEAD~1` and two atomic commits:

- `df86e8e` — Agent 1 scope: F1, F2, F3, F5, F6 view-layer fixes (15 files).
- `3677371` — Agent 2 scope: F4 scoring-dimension restoration (4 files).

Each commit is now atomically revertible. Test count verified 478/1/0 before and after split — no behavior change.

---

## Wave 5 Phase Gate Status

| Phase | Status |
|---|---|
| Phase 1 — Integration verification | **Automated checks complete.** Operator click-through re-verification of the 6 Phase 1 findings against fixed code **NOT YET PERFORMED**. |
| Phase 2 — Regression verification | NOT STARTED. Blocked on Phase 1 operator re-verification. |
| Phase 3 — Deploy | NOT STARTED. Blocked on Phase 2 green. |

---

## Sprint 004 Retro Draft

**NOT STARTED.** Deferred until after Phase 3 deploy completes per operator ruling: premature retro is inaccurate retro. Retro path (when drafted): `docs/retros/sprint_004_retro.md`.

---

## Key Rulings Log (this sprint)

- **A-3 corrected mid-sprint.** G5 is a popup (with StatusPill additive), not a SC-3 slide-out. Track B had exceeded scope; reverted in `df86e8e`. SC-4 + SC-3 remain for G7b mobile Table consumption.
- **A-8 elevated to Sprint 005 priority.** Read-only Supabase SQL diagnostic during Wave 4: 107/108 live shortlist rows have step 2 defaulting to `completed: true` vs migration 0009's `false`. Data drift — root-cause investigation required in Sprint 005. S3 ships unchanged; progress bar may read ~1 step high on affected rows (code comment in `ShortlistSlideOut.jsx` references A-8).
- **Single-pipeline scoring consolidation landed.** Pre-Sprint-004 architecture had a double pipeline (scoring.js top30 + view-layer `applyMatchReturnLogic` overwrite). Sprint 004 consolidated G9 gating inside `applyMatchReturnLogic` as the outer gate; scoring.js returns raw top30; G9 module unchanged. Integration regression test added.
- **Deliverable completion: 15/19.** 15 top-level + 19 sub-items + 100% functional completion. Per operator ruling A-1, retro reports all three numbers — no single canonical count.

---

## Sprint 005 Carry-Forward (items logged during Sprint 004)

| # | Item | Context |
|---|---|---|
| 1 | Root-cause A-8 journey-steps default drift | 107/108 rows disagree with migration 0009; schema-level vs app-code vs migration history investigation |
| 2 | Drop `not_evaluated` Postgres enum value | Inert artifact; hard-constraint prevented in Sprint 004 |
| 3 | Add `is_head_coach` column to `hs_coach_students` | MVP is first-linked-wins; precedence column needed |
| 4 | Add `is_primary_counselor` column to `hs_counselor_students` | Same rationale |
| 5 | Copy QA pass | "means means" G2 duplicate, ADLTV/ADTLV spelling variance, TODO(tooltip-copy) markers on 5 of 6 G8 tooltips, TODO(tour-screenshots) on 10 H2 placeholders, TODO(copy-qa) on mailto templates |
| 6 | Normalize remaining node-env Vitest tests to jsdom+RTL | Mixed regime landed in Sprint 004 (SC-3/SC-4/SC-5 and downstream used jsdom; SC-1/SC-2 remained node) |
| 7 | Consolidate scoring-pipeline enrichment as a first-class stage | F4 surfaced fragility; recommendation: `score → enrich → cap` with a dedicated EnrichmentIndex primitive to remove the `runGritFitScoring` defensive fallback inside `applyMatchReturnLogic` |
| 8 | Playwright `grit-fit-map-merge.spec.js` credentials gate | CI secrets still absent (pre-flight ruling 6); local run ready; production run awaits CI wiring |
| 9 | `offer_status` field on `short_list_items` | S3 renders all three offer chips inactive by default; tolerant reader ready for populate |
| 10 | `profiles.name` single-column split | S3 whitespace-splits firstName/lastName; future fields or structured name would be cleaner |
| 11 | `fastest_payback` vs `break_even` vocabulary | S3 falls back to `break_even` which is the actual schema field; spec used `fastest_payback` |
| 12 | Hardcoded breakpoint residual inventory | 3 non-critical flex-basis/popup-width literals remain; `useIsDesktop()` is sole responsive dispatch elsewhere |
| 13 | Coach-view color alignment | ShortlistCard colors adopted as canonical; coach-view shifted `#F44336` → `#FF9800` on `out_of_academic_reach`/`out_of_athletic_reach` |
| 14 | Orphan deletion verification protocol | GritFitActionBar.jsx and ShortlistCard.jsx deleted in-sprint when causally linked to scope changes; establish precedent in team docs |

---

## Next Session — First Action

**Operator opens `http://localhost:5174/` (or runs `npm run dev` if the dev server was stopped) and re-runs the Phase 1 click-through against the fixed code.**

Re-verification checklist (same as the original Phase 1 list):

### HOME
- [ ] Welcome header final line ends with "." not "!"
- [ ] Take the Tour modal renders placeholders without layout breakage at slide 2 (portrait placeholder letterboxes correctly)
- [ ] Three-step journey modal at 375 / 414 — no text spillover

### MY GRIT FIT
- [ ] Map marker click opens the Sprint 003 popup WITH status pill now added
- [ ] Popup actions present: Add-to-Shortlist, Recruiting Questionnaire, Coach Contacts
- [ ] Map filter shows Status options (no Conferences) — 6 pill options
- [ ] Money Map renders
- [ ] Table rankings display (Rank column populated)
- [ ] Test Optional ranking applied where expected
- [ ] Desktop table tooltips on 6 column headers
- [ ] Mobile table sort controls + tap tooltips + row tap opens slide-out

### YOUR SHORTLIST
- [ ] Row click opens ShortlistSlideOut without crash (F3 hooks fix)
- [ ] Error Boundary present (not user-visible unless triggered)
- [ ] All 9 sections render in the slide-out
- [ ] Distance and Annual Cost populate on shortlist items (F4 restoration)
- [ ] Rank N/total updates when filter/sort changes (F5)
- [ ] Email button labels flip correctly at 400px breakpoint
- [ ] Mailto clicks generate correct URIs
- [ ] Missing-email buttons disabled with tooltip

### G9 DISPLAY LAYER (the original F4 canary)
- [ ] Use a G9-trigger-matching profile (AF@D2 ≥ 50%, AF@D3 ≥ 50%, AR ≥ 85%, pool ≥ 30 D2 candidates)
- [ ] Displayed recommendations include at most 2 from {Bentley, Colorado Mines}
- [ ] Remainder is top-academic D3 descending
- [ ] Each returned school carries Distance, Annual Cost, matchRank, Test Optional application (visible in table and Money Map)
- [ ] Non-trigger-matching profile: normal top-30 (no forced cap)

If all green or only small anomalies: Phase 2 regression verification opens (automated) → Phase 3 deploy.
If functional break: new STOP, ruling required, fix in-sprint, re-verify.

---

*End of Phase 1 state handoff. No push. Tree clean for sprint purposes. Eleven commits local.*
