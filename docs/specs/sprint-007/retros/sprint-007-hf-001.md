# Sprint 007 Hotfix Session 001 Retro

**Date range:** 2026-04-26 (single-day session)
**Master state at session open:** 6fbb02e (Sprint 007 close)
**Master state at session close:** 3029c7e (HF-6 follow-up)
**Total commits in session:** 7
**Test trajectory:** 561/562 baseline → 613/614 final (+52 passing, 1 inherited failure persists unchanged)

---

## 1. Hotfix Ledger

| HF | Commit | Title | Files Touched | Tests Added | Notes |
|---|---|---|---|---|---|
| HF-1 | a8bf2fa | Widen ShortlistPage profile SELECT | `src/pages/ShortlistPage.jsx`, `tests/unit/shortlist-page-profile-select.test.js` | +2 | Universal SELECT widening — Athletic Fit em-dash bug fixed across all student profiles, not just Ayden Watkins. |
| HF-2 | 6e68ab1 | Recruiting Scoreboard UI refinements (8 changes) | `src/components/RecruitingScoreboard.jsx`, `src/pages/ShortlistPage.jsx`, `tests/unit/recruiting-scoreboard-hotfix.test.jsx` | +7 | Bundled UI polish — gold header/chevron, body-font headers, school-name slide-out link, color-band contrast, italic-bold marker, copy update, Quality=0% filter with empty state. |
| HF-3 | 16a55f0 | Grit Fit title cleanup + Shortlist sort by progress | `src/pages/GritFitPage.jsx`, `src/pages/ShortlistPage.jsx`, `src/components/ShortlistFilters.jsx`, `tests/unit/sprint-007-hf3.test.jsx` | +9 | Title count token removed; new Most/Least Progress sort modes; Most Progress is new default. |
| HF-5 | 720d818 | Per-school recruiting progress bar | `src/components/ShortlistRow.jsx`, `tests/unit/shortlist-row-progress.test.jsx`, screenshot | +10 | New helper (`countCompletedSteps`, `JOURNEY_STEP_TOTAL`); horizontal bar with `n/15` label; mirrors HF-3 reducer pattern. |
| HF-4 | cee7797 | Verbal + Written Offer badges across 4 surfaces | `src/lib/offerStatus.js` (new), `src/components/OfferBadge.jsx` (new), `src/components/RecruitingScoreboard.jsx`, `src/components/ShortlistSlideOut.jsx`, `src/pages/GritFitPage.jsx`, `src/components/GritFitMapView.jsx`, `src/components/SchoolDetailsCard.jsx`, `src/components/GritFitTableView.jsx`, `tests/unit/sprint-007-hf4.test.jsx`, `tests/unit/s3-shortlist-slide-out.test.jsx`, screenshot | +24 | Diagnose-then-fix; phantom `offer_status` column wiring replaced with `recruiting_journey_steps` step 14/15 reads; Commitment chip preserved as placeholder per carry-forward. |
| HF-6 | 3555a9d | Scoreboard sticky headers + mobile margin | `src/components/RecruitingScoreboard.jsx`, `src/index.css`, screenshots | 0 (visual) | Per-`<th>` sticky CSS shipped + 16px mobile padding via media query. **Sticky failed in production** — see HF-6 follow-up. |
| HF-6 follow-up | 3029c7e | Two-row sticky header production fix | `src/index.css`, `src/components/RecruitingScoreboard.jsx`, `tests/sprint-007-hf6-followup-screenshots.spec.js`, screenshots | 0 (Playwright lock) | `overflow: clip` replaces `hidden` across three layers; Layer 3 inner wrapper switched to media-query-gated className; mobile sticky deferred. |

---

## 2. What Shipped — by User-Visible Surface

### a) My Grit Fit page

- **Title cleanup** — H1 reads "Your GRIT FIT Matches"; redundant count token removed (subheader still carries the count).
- **Verbal Offer + Written Offer badges in Map popup card** — gold (verbal) and maroon (written) pills appear inline with status pills when the school is in the student's shortlist with the corresponding journey step complete. Schools not in the shortlist render no badge.
- **Verbal Offer + Written Offer badges in Grit Fit Table** — same condition; rendered inline next to school_name on desktop rows, above conference line on mobile cards, and on the SchoolDetailsCard slide-out.

### b) My Shortlist page

- **Profile SELECT widened** — `studentProfile` fetch now includes `height, weight, speed_40, expected_starter, captain, all_conference, all_state` alongside the existing R4 token-resolution fields. Athletic Fit now resolves universally; the misleading "Add your position, height, and weight" banner no longer fires for students whose DB row is actually complete.
- **Most Progress / Least Progress sort options** — new options at the TOP of the sort dropdown. Most Progress is the new default on initial mount (replaces Name A–Z).
- **Per-school recruiting journey progress bar** — every shortlist row carries a 10px maroon bar with `n/15` label between the school identity block and the status pill. Empty track at 0/15 is intentional.
- **Mobile margin** — 16px horizontal padding on the page wrapper at `< 640px`; nested rule prevents double-padding on the Scoreboard inside.
- **Verbal Offer + Written Offer badges in slide-out** — three-chip slot preserved with rewired sources: `verbal_offer` reads step 14, `committable_offer` slot relabelled "Written Offer" reads step 15, `commitment` chip preserved as permanent placeholder. Replaces phantom `item.offer_status` column reads that always returned false.

### c) Recruiting Scoreboard component

- **Eight HF-2 UI refinements** — gold title + chevron (`var(--brand-gold)`); group/column headers in body font (`var(--font-body)`); school name renders as button when `onSchoolClick` is supplied (opens matching slide-out); Quality + Athletic Fit color bands widened to 12px and recolored for contrast (`#9B1C2C` deep red / `#E8B5BE` light pink); boundary marker in body-font italic-bold; boundary copy updated to include "Increase outreach to coaches, attend more recruiting events, or make lower priority"; Quality=0% rows filtered out with post-filter rank re-numbering and a distinct "No recruiting activity yet" empty state.
- **Verbal Offer + Written Offer badges in College column** — both badges stack below school name when the corresponding step is complete on that row.
- **Sticky two-row header on desktop** — group-row pinned at `top: 0`, column-row pinned at `top: 36`, both stay stacked together while page scrolls. Mobile sticky deferred (carry-forward #20).

---

## 3. What Worked

**Diagnose-then-fix discipline.** Three of the seven hotfixes shipped after a diagnosis pass that surfaced a different bug than the operator's initial hypothesis: HF-1 was originally reported as a Scoreboard tier-source bug but turned out to be an upstream `studentProfile` SELECT omission; HF-4's offer-badge bug was operator-hypothesized as missing wiring on four surfaces but the slide-out's existing chip code was already wiring against a phantom `offer_status` column that doesn't exist in the schema; HF-6's "sticky CSS appears to work in test" was confirmed via diagnosis to be a stripped-DOM Playwright fixture masking a three-layer ancestor problem in production. In each case the diagnosis report prevented a wasted fix on the wrong layer.

**Bundling discipline.** Surgical UI polish bundled cleanly when changes shared a single component (HF-2's eight Scoreboard refinements in one commit; HF-3's title + sort changes in one commit). Feature work that touched new files or required separate diagnosis stayed in its own exchange (HF-4 badges, HF-5 progress bar). HF-4 explicitly re-scoped Phase 1 + Phase 2 into a single commit at operator approval, but the diagnosis-vs-fix split still ran across two exchanges.

**Universality language baked into prompts.** Every operator prompt included a "Universality Reminder" instructing the fix to apply system-wide, not user-scoped. This produced a clean checkpoint: each hotfix could be reviewed for "does this introduce any user-scoped logic?" before commit. Zero user-scoped paths shipped across seven commits.

**Single source of truth helpers.** `offerStatus.js` exports `hasVerbalOffer`/`hasWrittenOffer` as the single producer used by all four offer-badge surfaces. `ShortlistRow.jsx` exports `countCompletedSteps` + `JOURNEY_STEP_TOTAL` mirroring the HF-3 inline progress reducer in `ShortlistPage.jsx`. The two reducers are kept in lockstep by tests on both sides rather than refactored to a shared module — minimizing blast radius without duplicating logic.

**Test trajectory monotonic.** Every hotfix added tests (+2, +7, +9, +10, +24, 0, 0). The inherited `schema.test.js` step-default failure persisted unchanged across all seven commits. No regressions ever introduced. The existing `s3-shortlist-slide-out.test.jsx` was the only pre-existing test file modified — to update assertions to the operator-approved new HF-4 contract, not to silence a regression.

---

## 4. What Didn't

**HF-6 false positive.** The HF-6 Playwright spec used `page.setContent()` with inline styles only — no `src/index.css` injection, no `<div id="root">` wrapper. The test fixture's ancestor chain was a stripped-down `<html><body><div>...` that allowed sticky to attach to the viewport. Production has `html, body, #root { overflow-x: hidden }` from Sprint 005 D8, which establishes a scroll-context boundary at #root and traps sticky descendants. Sticky CSS was applied correctly in production but bound to the wrong scroll container, never activating during page scroll. The bug shipped to deployed preview and operator manual test caught it. Cost: one HF-6 follow-up cycle (commit 3029c7e) to diagnose and fix. Mitigation captured as carry-forward #25 — required pattern documented at top of `tests/sprint-007-hf6-followup-screenshots.spec.js`.

**HF-6 mobile sticky structurally blocked.** Empirically in current Chromium, an element with `overflow-x: auto` is a sticky-y scroll container regardless of `overflow-y` value (`auto`, `clip`, and `visible`-coerced-to-`auto` all behave identically for sticky-y purposes). The original three-file `clip` plan addressed Layers 5 and 10/11/12 correctly but Layer 3 (HF-2's `tableScrollStyle`) couldn't be passed-through with `overflow-y: clip` as the diagnosis predicted. Mid-fix pivot: replace inline overflow with a media-query-gated className so desktop has no overflow-x (sticky works) and mobile has overflow-x: auto (horizontal scroll works, sticky deactivates). Mobile sticky deferred to carry-forward #20 — fix path is two-table-with-JS-sync or CSS Grid restructure, materially out of scope for a hotfix.

**HF-4 sequencing required mid-session re-scope.** The operator's HF-4 spec presented as a single batch but its diagnosis revealed Phase 1 (slide-out + Scoreboard, JSONB on hand) and Phase 2 (Map + Table, requires lifting JSONB to GritFitPage) had different complexity profiles. The operator approved Phase 1 + Phase 2 in a single exchange after the diagnosis. Worked cleanly because the diagnosis split was clean — but the alternative (split across two exchanges) was offered explicitly so the operator could choose. The pattern is worth carrying: when a diagnosis reveals natural phase boundaries, surface them with a recommended split and let the operator decide the bundling.

**Deployed-preview captures unattainable in-session.** The operator-required deployed-preview screenshots for HF-6 follow-up could not be captured because the auth'd `/shortlist` route requires a session credential the work session doesn't hold. Fallback: Playwright captures with production CSS injected demonstrate the fix functions correctly with the production scroll-context chain, with operator capturing deployed-preview post-deploy as carry-forward #24.

---

## 5. Carry-Forward Register

**New from this session:**

- **#20 — Mobile sticky headers on Recruiting Scoreboard.** Currently deactivated at `< 1240px` because `overflow-x: auto` on the horizontal-scroll wrapper reestablishes sticky boundary regardless of `overflow-y: clip`. Fix requires either two-table structure with JS scroll-left synchronization, or CSS Grid restructure. Regression-lock in place at `tests/sprint-007-hf6-followup-screenshots.spec.js` — the `expect(box.y).toBeLessThan(0)` assertion will fail when mobile sticky is implemented, signaling the maintainer to update the test.

- **#21 — Commitment chip source of truth.** Slide-out's third offer chip renders as permanently-inactive placeholder. Decide whether Commitment is a new journey step 16, a separate column on `short_list_items`, or a derived state from some other signal.

- **#22 — Latent contract bug at `RecruitingScoreboard.jsx:222`.** `item.div` should be `schools.type` per source-of-truth contract. Currently masked by 100% data alignment across all 108 `short_list_items` rows but should be hardened before drift.

- **#23 — Banner copy refinement.** Once #22 is fixed, the "Grit Fit not yet computed" banner could legitimately fire on a school-side data gap. Refine copy to "Athletic Fit unavailable" or similar when profile is verifiably complete but the lookup falls through.

- **#24 — Deployed-preview operator review.** Visual confirmation of all six hotfixes on the deployed Vercel environment with a populated student (Ayden Watkins recommended for Scoreboard data; Jesse Bargar for offer badges since he has step 14 complete on St Lawrence and Oberlin). Capture operator-facing screenshots for Sprint 007 close record.

- **#25 — Required Playwright pattern.** All future scroll/sticky/responsive specs MUST inject `src/index.css` into the test page and wrap fixture content in `<div id="root">`. Pattern documented at top of `tests/sprint-007-hf6-followup-screenshots.spec.js`. Future Sprint 008 work touching these concerns must follow.

**Inherited from earlier in Sprint 007 close (referenced from sprint-007 close record, not duplicated):**

- #13 — Coach-side STATUS_LABELS rename
- #14 — Pre-existing schema test failure (inherited)
- #15 — pg_dump version mismatch tooling
- #16 — Two-device mobile mail smoke
- #17 — Operator visual confirmation of RecruitingScoreboard
- #18 — Drop `_pre_0037_short_list_items_snapshot` post-dwell
- #19 — Future cleanup: remove `hs_head_coach_email` entirely

---

## 6. Sprint 008 Setup Recommendation

Open Sprint 008 with **#24 — deployed-preview operator review** as the gate. Six hotfixes shipped to master and triggered Vercel deploy; before any new feature work, validate the production environment matches what the Playwright fixtures + commit screenshots claim. This is mechanical (no decisions required), unblocks the close record for Sprint 007, and surfaces any operator-visible issue before it becomes another hotfix cycle. After #24 clears, **#22 (sticky source-of-truth)** is the highest-leverage technical follow-up — small surface, hardens a contract before drift makes it user-visible.

---

## 7. Session-Level Observations on Hotfix Mode

Hotfix sessions in sprint mode benefit materially from a **diagnosis-only first response** when the bug touches more than one file. Three of seven hotfixes (HF-1, HF-4, HF-6 follow-up) revealed a different bug than the operator's initial hypothesis; the diagnosis-then-fix discipline prevented a wasted fix on the wrong layer in each case. The cost was one extra exchange per diagnosed hotfix, recovered by avoiding one or more rework cycles.

Hotfix sessions also benefit from **structural test-environment fidelity**. The HF-6 false positive demonstrates that test fixtures bypassing production CSS chain produce confident-looking failure modes. Future hotfix specs should default to production-CSS injection unless there's a specific reason to isolate; the `<div id="root">` + `loadProductionCss()` pattern from the HF-6 follow-up spec is the working template.

A third observation: **operator-supplied universality and source-of-truth language in prompts produced a higher-quality output floor than implicit expectations would have.** "This bug affects every student, not just Ayden" and "Athletic Fit reads schools.type, period" both eliminated whole categories of fix-the-symptom-not-the-bug paths before the engineering work even started. The pattern is worth carrying forward: when the operator already knows the structural constraint, stating it in the prompt is cheaper than reverse-engineering it from the failed fix.

---

*End of retro.*
