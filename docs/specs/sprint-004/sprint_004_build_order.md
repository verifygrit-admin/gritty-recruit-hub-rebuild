---
sprint: 004
document: build-order map
date: 2026-04-22
repo: gritty-recruit-hub-rebuild
upstream_spec: docs/specs/sprint-004/sprint_004_session_spec.md
pre_flight_rulings: applied (operator 2026-04-22)
status: planning-only, no code produced
---

# Sprint 004 — Build-Order Map

## Goal

Sequence 19 Sprint 004 sub-deliverables (15 top-level: H1-3, G1-9, S1-3; G3 splits to G3a/b, G4 to G4a/b, G7 to G7a/b, S1 to S1a/b = 19 sub-items) into a minimal-dependency wave plan that maximizes parallelism, builds shared components once, and isolates the pure-logic engine work (G9) and the backend email-data work (S3 EF) from UI iteration.

## Architecture Approach

Three tracks running in parallel:

- **Track A — UI waves.** Shared primitives land first; copy ships as one safe batch; view integrations fan out; S3 slide-out closes the sprint.
- **Track B — G9 scoring subordinate step.** Pure logic in `src/lib/`, TDD, 8-combination trigger matrix, zero UI coupling. Runs independently start-to-finish; lands whenever complete.
- **Track C — S3 email-data Edge Function.** Backend only. Builds, tests, and deploys against Supabase before S3 UI consumes it.

Each track can commit and ship independently. Sprint closes with a single deploy to `app.grittyfb.com`.

---

## 1. Shared Component Candidates (build-once, reuse-many)

| # | Component | Path (proposed) | Consumers | Rationale |
|---|---|---|---|---|
| SC-1 | `<CollapsibleTitleStrip>` | `src/components/CollapsibleTitleStrip.jsx` | G1, G4a, S1a | Spec explicitly names this as a shared component. Maroon strip + gold text + chevron; desktop/mobile behavior parameterized |
| SC-2 | `<StatusPill>` + label/color map | `src/components/StatusPill.jsx` + `src/lib/statusLabels.js` | G5, G6, S2, S3 | Exists today as duplicated `STATUS_CONFIG` objects in `ShortlistCard.jsx`, `CoachSchoolDetailPanel.jsx`, `CoachStudentCard.jsx`, `ShortlistFilters.jsx`, `CoachRecruitingIntelPage.jsx`. Extract to one source of truth |
| SC-3 | `<SlideOutShell>` | `src/components/SlideOutShell.jsx` | G7b, S3 (and G5 if slide-out wins over popover) | Spec G7b note: "ideally the same component, parameterized by content". Width + animation match Sprint 003 existing slide-out |
| SC-4 | `<SchoolDetailsCard>` (content body) | `src/components/SchoolDetailsCard.jsx` | G5, G7b | Spec G7b: "Same content, same component" as G5. Slots into SC-3 for G7b and S3 |
| SC-5 | `<Tooltip>` primitive | `src/components/Tooltip.jsx` (only if no existing) | G8 | Spec defers to existing tooltip if one exists. First task in G8 wave is to check for an existing primitive |
| SC-6 | Copy modules | `src/lib/copy/*.js` | All copy deliverables | Extend `gritFitExplainerCopy.js`; add `homeWelcomeCopy.js`, `shortlistCopy.js`, `tableTooltipCopy.js`. Matches Sprint 001 pattern |

Additional pre-wave cleanup (not a component, but feeds SC-2):

| # | Workstream | Scope | Blocks |
|---|---|---|---|
| CW-1 | `not_evaluated` cleanup | Remove from `gritFitStatus.js` LABEL_PRIORITY + fallback-push; remove from the 5 component `STATUS_CONFIG`/label maps; flip `tests/unit/schema.test.js:199` assertion to "fallback does not surface `not_evaluated` at runtime". Postgres enum retained (inert artifact, logged in retro). | SC-2 (StatusPill label map must ship with the 6-value taxonomy, not 7) |

---

## 2. Dependency Graph

```
                  ┌────────────────────────────────────────────────┐
                  │                                                │
              [CW-1 not_evaluated cleanup]                         │
                  │                                                │
                  ▼                                                │
              [SC-2 StatusPill]◄─────────────────┐                 │
                  │                              │                 │
         ┌────────┼──────────────┬───────────────┤                 │
         ▼        ▼              ▼               ▼                 │
        G5       G6            S2(pills)      S3(pills)            │
                                                │                  │
              [SC-1 CollapsibleTitleStrip]      │                  │
                  │                             │                  │
         ┌────────┼────────┐                    │                  │
         ▼        ▼        ▼                    │                  │
        G1       G4a      S1a                   │                  │
                                                │                  │
              [SC-3 SlideOutShell] + [SC-4 SchoolDetailsCard]      │
                  │                             │                  │
         ┌────────┼─────────────┐               │                  │
         ▼        ▼             ▼               ▼                  │
        G5      G7b            S3 slide-out ◄───┘                  │
                                                                   │
              [SC-5 Tooltip]                                       │
                  │                                                │
                  ▼                                                │
                 G8                                                │
                                                                   │
              [Copy module extensions — Wave 2 batch]              │
                  │                                                │
         ┌────────┼────────┬────────┬──────┬──────┐                │
         ▼        ▼        ▼        ▼      ▼      ▼                │
         H1      G2       G3a      G3b   G4b    S1b                │
                                                                   │
       ┌────────────────────────────────────────────┐              │
       │                                            │              │
       │   Track B (ISOLATED): G9 subordinate       │              │
       │   step in src/lib/scoring/. No deps.       │              │
       │                                            │              │
       └────────────────────────────────────────────┘              │
                                                                   │
       ┌────────────────────────────────────────────┐              │
       │                                            │              │
       │   Track C (ISOLATED): S3 email-data EF.    │──────────────┘
       │   Ships before S3 UI consumes it.          │
       │                                            │
       └────────────────────────────────────────────┘

   Independent-no-graph-deps: H2 (asset staging), H3 (mobile CSS fix),
                              G7a (mobile sort controls — no slide-out dep)
```

**Blocks-others summary:**

- **Fan-in bottleneck:** `SC-2 StatusPill` (4 consumers: G5, G6, S2, S3) and `SC-3 SlideOutShell + SC-4 SchoolDetailsCard` (3 consumers: G5, G7b, S3). Shipping these first unblocks the widest set.
- **Must-land-before-S3:** Track C email EF.
- **Can-ship-anytime:** H2, H3, G7a, Track B (G9), all Wave 2 copy.

---

## 3. Wave Sequencing (6 waves)

### Wave 0 — Isolated / Backend / Cleanup (parallel, pre-UI)

Runs in parallel. None block each other. No UI touched.

| ID | Deliverable | Track | Notes |
|---|---|---|---|
| W0.1 | CW-1 `not_evaluated` cleanup | A prep | Feeds SC-2 in Wave 1 |
| W0.2 | Track C — S3 email-data EF (build + deploy to Supabase) | C | Scoped EF returning linked HS coach + counselor email for a given student, JOIN across `hs_coach_students` / `hs_counselor_students` → `auth.users.email` or linked profile. Admin-JWT-gated EF pattern per Sprint 001 |
| W0.3 | Track B — G9 subordinate step in `src/lib/scoring/` | B | Superpowers skill: test-first. 8-combination trigger matrix per spec (all-3 met / each of 3 negated / Recruit Reach Bentley-first / Recruit Reach Mines-first / edge-case one-of-two has AF≥50%@D2). Lands anytime; sprint can ship without it and merge separately |

**Wave 0 exit criteria:**
- W0.1: Vitest green, `not_evaluated` no longer renders at runtime in any of the 5 components.
- W0.2: EF deployed, smoke-tested with a known student fixture, returns `{ head_coach_email, counselor_email }` or nulls with clear semantics.
- W0.3: may slip to Wave 3 or later without blocking UI waves.

### Wave 1 — Shared UI Primitives

Land in this order (SC-2 depends on W0.1):

| ID | Component | Consumers |
|---|---|---|
| W1.1 | SC-1 `<CollapsibleTitleStrip>` | G1, G4a, S1a |
| W1.2 | SC-2 `<StatusPill>` + `statusLabels.js` | G5, G6, S2, S3 |
| W1.3 | SC-5 `<Tooltip>` (or confirm existing primitive) | G8 |
| W1.4 | SC-3 `<SlideOutShell>` | G7b, S3 |
| W1.5 | SC-4 `<SchoolDetailsCard>` | G5, G7b |

All five can run as parallel PRs by one engineer or as a parallel subagent fan-out. W1.2 must be sequenced after W0.1.

### Wave 2 — Copy Batch (one commit, one PR)

Pure-string changes through `src/lib/copy/` per Sprint 001 pattern. No component structure changes. Vitest assertions: one per exported string.

| ID | Copy target | Destination module |
|---|---|---|
| H1 | Welcome header | `src/lib/copy/homeWelcomeCopy.js` (new) |
| G2 | Athletic Fit explainer | `gritFitExplainerCopy.js` (extend) |
| G3a | Academic Rigor explainer | `gritFitExplainerCopy.js` |
| G3b | Test Optional explainer | `gritFitExplainerCopy.js` |
| G4b | Division Mix copy (two-paragraph) | `gritFitExplainerCopy.js` |
| S1b | Pre-Read Docs explainer | `src/lib/copy/shortlistCopy.js` (new) |
| G8 | 6 tooltip strings | `src/lib/copy/tableTooltipCopy.js` (new) |

**Preserved-as-written strings:** G2 "means means" duplicate; G8 "ADTLV" (not "ADLTV"). Both flagged in retro for operator reconciliation.

### Wave 3 — View Integrations (parallel, consumes Wave 1)

These fan out once their respective primitives are ready.

| ID | Deliverable | Depends on |
|---|---|---|
| G1 | Athletic + Academic title strips (desktop-unified / mobile-split) | SC-1 |
| G4a | Division Mix title strip | SC-1 |
| S1a | Pre-Read Docs collapsible | SC-1 |
| G5 | Map card status indicators | SC-2, SC-4 |
| G6 | Map filter Conferences → Status | SC-2 |
| G7a | Mobile sort controls (GRIT FIT, Distance, ADLTV, Annual Cost) | Wave 2 tooltip copy (for mobile tooltip hookups) |
| G7b | Mobile tap-to-slide-out | SC-3, SC-4 |
| G8 | Tooltip integrations on 6 columns + sort labels | SC-5, Wave 2 copy |
| S2 | Shortlist list format refactor (replace card with row) | SC-2 |
| H2 | Take the Tour screenshots (or placeholder PNGs) | — |
| H3 | Three-step journey modal mobile overflow fix | — |

### Wave 4 — S3 Slide-Out (terminal UI)

Consumes SC-3, SC-4, SC-2, Track C EF, and Wave 3 S2 (row click handler).

| ID | Deliverable |
|---|---|
| S3 | Single-layer slide-out with 11 sections: close button, school name, meta, student name subhead, Recruiting Q + Coaching Staff buttons, offer pills, status pills, data strip, Recruiting Journey Progress collapsible, Pre-Read Documents list with Email (Head) Coach + Email Counselor mailto buttons populated from Track C EF |

### Wave 5 — Integration + Regression + Deploy

| ID | Step |
|---|---|
| W5.1 | Full Vitest pass — floor: 194 passing held; new assertions: ~15+ (per-copy-string, G5 6-status derivation, G9 matrix if Track B landed, G7a 4 sort keys, SC-1 collapse behavior, SC-2 label map) |
| W5.2 | Mobile spot-checks at 375 / 390 / 768 across every deliverable touching a mobile breakpoint |
| W5.3 | Sprint 001 admin visual smoke (no regression expected) |
| W5.4 | Sprint 003 student view visual smoke (Chris operator-performed, gated Playwright remains skipped per pre-flight ruling 6) |
| W5.5 | Single commit, single deploy to `app.grittyfb.com`, retro captured |

---

## 4. Track B — G9 Isolated Workstream (explicit call-out)

- **Path:** `src/lib/scoring/` (or wherever Sprint 003's `runGritFitScoring()` lives — `src/lib/scoring.js:170` per pre-flight grep).
- **Skill:** `superpowers:test-driven-development`.
- **Consumes:** existing `runGritFitScoring()` output (topTier, recruitReach, scored). No DB column dependency per pre-flight ruling 3.
- **Does not consume:** any Wave 1/2/3/4 UI component.
- **Does not block:** any UI wave.
- **Blocks:** nothing in Sprint 004 if it slips — can ship as its own PR after the main sprint commit, or defer to Sprint 005 if uncovered risks surface.
- **Trigger matrix (all three must hold per spec, 8 Vitest assertions minimum):**
  1. All 3 met → D2 cap at 2 (Bentley + Colorado Mines, Recruit-Reach order) + D3 fill
  2. AF@D2 or AF@D3 < 50% → no subordinate step
  3. Acad Rigor < 85% → no subordinate step
  4. D2 candidate count < 30 → no subordinate step
  5. Bentley closer → Bentley first
  6. Mines closer → Mines first
  7. Only Bentley has AF≥50%@D2 → 1 D2 + expanded D3 fill
  8. Only Mines has AF≥50%@D2 → 1 D2 + expanded D3 fill
- **Regression guard:** integration test with Sprint 003 non-triggering fixture profile → recommended list structure unchanged.
- **Rationale preserved in code comment** (spec requirement): the high-academic D2 filtering rationale.

---

## 5. not_evaluated Cleanup Workstream (explicit call-out)

Positioned as Wave 0.1 because it feeds SC-2's label map in Wave 1. Self-contained, ~30 min of changes.

- **UI removals:**
  - `src/lib/gritFitStatus.js` — drop `'not_evaluated'` from `LABEL_PRIORITY` (line 17); replace the `labels.length === 0` fallback push (lines 83-86) with behavior per operator ruling on ambiguity #2 below
  - `src/components/ShortlistCard.jsx:26, 36`
  - `src/components/CoachSchoolDetailPanel.jsx` (STATUS_CONFIG + BADGE_ORDER entries)
  - `src/components/CoachStudentCard.jsx` (label + color maps)
  - `src/components/ShortlistFilters.jsx` (filter option)
  - `src/pages/coach/CoachRecruitingIntelPage.jsx` (label + color maps)
- **Test update:**
  - `tests/unit/schema.test.js:199` — flip assertion from "enum contains `not_evaluated`" to "runtime status computation never returns `not_evaluated`"
- **Retained (inert artifact, per operator ruling 5):**
  - Postgres enum value in `supabase/migrations/0009_short_list_items.sql:36` and `0020_grit_fit_labels.sql:23` — NOT dropped (hard-constraint: no schema migrations)
- **Retro entry:** "accepted inert artifact — Postgres `grit_fit_label` enum retains `not_evaluated` value; clean up in a future migration sprint"

---

## 6. Track C — S3 Email-Data Edge Function (explicit call-out)

Positioned as Wave 0.2. Lands before Wave 4 (S3 UI) consumes it.

- **Function name (proposed):** `student-read-recruiting-contacts`
- **Path:** `supabase/functions/student-read-recruiting-contacts/index.ts`
- **Auth gate:** Bearer JWT → `getUser()` → verify student role, verify requested student_user_id matches auth user (or admin role)
- **Data JOINs (existing Sprint 001/003 tables, no new schema):**
  - `hs_coach_students` WHERE `student_user_id = :uid` → `coach_user_id` → `auth.users.email` or linked `profiles.email`
  - `hs_counselor_students` WHERE `student_user_id = :uid` → `counselor_user_id` → linked email
- **Response shape:**
  ```
  200 { success: true, contacts: { head_coach_email: string|null,
                                   counselor_email: string|null } }
  401 / 403 / 500 per Sprint 001 EF pattern
  ```
- **Deployment:** `node scripts/deploy-ef.js student-read-recruiting-contacts` per project memory
- **Smoke test:** run against a seeded student fixture before Wave 4 opens
- **RLS note:** per operator ruling 4, emails not exposed through broad RLS — only through this scoped EF with auth gate
- **Regression guard:** Dexter 4-point inspection on deployed EF (per project memory standard)

---

## 7. Ambiguity Flags — Surfaced, Not Resolved

These surfaced during planning. Operator to rule before the relevant wave opens.

| # | Ambiguity | Where it bites | Proposed default if no ruling |
|---|---|---|---|
| A-1 | Deliverable count mismatch. Spec `deliverable_count: 15` top-level; sub-item split yields 19; operator prompt said 20. Which number governs the retro "deliverable completion count"? | Retro drafting, Wave 5 | Report both: "15 top-level / 19 sub-items / 100%" |
| A-2 | Empty-status case. After `not_evaluated` fallback is removed, what renders on a school with zero applicable status labels? Options: (a) no pill, (b) a default like "Currently Recommended" if gates pass, (c) a new neutral pill label. Spec is silent | W0.1 cleanup, G5 (map card pill), S2/S3 (list + slide-out pills) | (a) no pill rendered; UI treats empty-label as "no status indicator shown". Retro-flag edge case |
| A-3 | G5 "slide-out or popover". G7b is explicitly slide-out. If they share SC-4 `<SchoolDetailsCard>` in SC-3 `<SlideOutShell>`, G5 should also be slide-out. Spec leaves the door open | Wave 1 SC-3/SC-4 shape, Wave 3 G5 | Slide-out for both. Popover option dropped. One component, one interaction pattern |
| A-4 | Coach-side status mapping deduplication. Extracting SC-2 `<StatusPill>` would naturally consolidate duplicated maps in `CoachSchoolDetailPanel.jsx`, `CoachStudentCard.jsx`, `CoachRecruitingIntelPage.jsx`. Spec is student-view-only | Wave 1 SC-2 | Refactor coach-side to consume SC-2 in the same PR (DRY, one-line diff per file). If operator wants strict scope, leave coach duplicates and accept the tech-debt retro entry |
| A-5 | G1 desktop collapse mechanics. "Collapse either strip collapses both together." Shared state (one bool governs both) or linked state (each toggles the other)? Mobile is independent | Wave 1 SC-1 design, Wave 3 G1 | Shared state — one `isCollapsed` bool passed from parent on desktop; two independent bools on mobile. Driven by a viewport hook |
| A-6 | G6 filter state persistence across view navigation. Spec says "through map interactions (pan/zoom) but not across sessions." Silent on: within-session navigation away and back | Wave 3 G6 | Local component state, lost on unmount. Consistent with "not across sessions" intent |
| A-7 | H2 screenshots staging. Spec says "stage placeholder PNGs and flag" if not provided at execution time. Are finals staged for this sprint? | Wave 3 H2 | Stage 1:1 placeholder PNGs (800x500) per modal step, flag in retro for asset drop in a follow-up |
| A-8 | S3 Recruiting Journey Progress "6 of 15" on fresh students. Pre-existing Vitest failure (`schema.test.js:138`) — steps 2-15 default to `true` instead of `false`. If the DB actually behaves that way, S3's progress bar renders wrong for new student records | Wave 4 S3 | Verify in production Supabase (read-only) whether the default is `true` or `false`. If `true` → flag as blocking-defect for S3 completeness; if `false` → the failing test is wrong, and the bug is in the test itself. Do not fix per operator ruling 2 — but data behavior must be confirmed to know what S3 renders |
| A-9 | G8 ADLTV vs ADTLV — spec already flagged for operator reconciliation; how do I render the column header and tooltip label? | Wave 2 copy, Wave 3 G8 | Render as written in outline (table header "ADLTV", tooltip text "ADTLV"). Preserves the operator-reconciliation flag. Alternative: pick one spelling now. Operator ruling desired |
| A-10 | S3 "Email (Head) Coach" vs "Email Coach" label. Spec says "Head" is implied, can shorten if space-constrained, with accessibility label including "Head Coach" | Wave 4 S3 | Render "Email Coach" on mobile narrow widths and "Email (Head) Coach" on desktop/tablet. `aria-label="Email Head Coach"` in both cases |

---

## 8. Parallelization Capacity

If you decompose Wave 1 and Wave 3 to parallel subagent streams:

- **Wave 0:** 3 agents in parallel (W0.1, W0.2, W0.3).
- **Wave 1:** 5 agents in parallel (SC-1 through SC-5), gated behind W0.1 for SC-2.
- **Wave 2:** 1 agent, single commit (7 copy changes in one PR).
- **Wave 3:** up to 11 agents in parallel (G1, G4a, S1a, G5, G6, G7a, G7b, G8, S2, H2, H3) with G5/G6/S2/G7b/S1a gated on Wave 1 components.
- **Wave 4:** 1 agent (S3 terminal).
- **Wave 5:** 1 agent (integration, deploy).

---

## 9. Exit Criteria

- All 19 sub-deliverables completed OR operator-approved deferrals logged.
- Vitest: floor of 194 passing held; target ~210+ with Sprint 004 additions.
- Zero regressions against Sprint 001 admin and Sprint 003 student views.
- Single commit, single deploy to `app.grittyfb.com`.
- Retro captures: inherited failures (pre-existing schema test), accepted inert artifacts (`not_evaluated` enum), operator reconciliations (G2 "means means", G8 ADLTV/ADTLV), any Track B slippage, any ambiguity rulings.

---

*End of build-order map. Awaiting operator rulings on ambiguities A-1 through A-10 before Wave 0 opens. No code will be written until those are resolved.*
