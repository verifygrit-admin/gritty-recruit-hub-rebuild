# Sprint 018 — Overlay Tint Restoration

**Status:** not_started
**Repo:** gritty-recruit-hub-rebuild
**Type:** routine build, single-deliverable fix sprint
**Exchange ceiling:** 15
**Estimated burn:** 5–7 exchanges
**Branch:** master (direct; single-commit fix)
**Spec location:** `docs/specs/sprint-018-overlay-tint-restoration.md`

---

## 1. Problem statement

Sprint 017 Session 2 HF-B (commit `99a8a65`, currently on production at `fb53b3c`) removed the cream/scarlet overlay tint rule from `src/index.css` while removing the background-image rules it was scoped to delete. The overlay rule was a separate concern that lived in the same source block and got carried out with the rest.

Result on production:

- **Belmont Hill students** see the Belmont Hill background photo in full color. No scarlet wash.
- **BC High students** see the BC High team photo in full color. No cream wash.
- **Anonymous students** inherit BC High default — same uncovered state.

The brand-token blocks still declare `--brand-overlay-rgba` correctly:

- `:root` → `rgba(245, 239, 224, 0.9)` (BC High cream)
- `body.school-belmont-hill` → `rgba(180, 31, 46, 0.08)` (Belmont Hill scarlet)

The token is defined. The rule that consumes it is missing.

## 2. Input state

- `master` HEAD: `a17c5f2` (Sprint 017 retro)
- Last source commit: `fb53b3c` (HF-Bf)
- `src/index.css` — `--brand-overlay-rgba` token blocks present in `:root` and `body.school-belmont-hill`. No rule applying the token to a surface.
- `src/components/Layout.jsx` — inline `backgroundImage` style on `<main>`, driven by `schoolSlug` from `useSchoolIdentity` (HF-B precedent).
- Belmont Hill onboarding functional end-to-end except this surface.
- BC High regression-clean except this surface.

## 3. Desired output state

- Belmont Hill students see the BH background photo with a scarlet wash overlaid (token: `rgba(180, 31, 46, 0.08)`).
- BC High students see the BC High team photo with a cream wash overlaid (token: `rgba(245, 239, 224, 0.9)`).
- Anonymous students see the BC High default — cream wash over BC High team photo.
- Overlay is driven by the existing `--brand-overlay-rgba` token via the body-class swap mechanism. No hardcoded school branches in components.
- Build green. Production deploy verified by operator via Claude in Chrome / browser.

## 4. Phase plan

### Phase 0 — Audit + plan-first (~1–2 exchanges)

Two implementation candidates exist:

**(a) Inline-style on `<main>` in Layout.jsx**, parallel to the `backgroundImage` inline-style HF-B introduced. Driven by `schoolSlug` from `useSchoolIdentity`. Matches HF-B precedent.

**(b) CSS pseudo-element** (e.g., `main.layout-main::before`) that reads `--brand-overlay-rgba` via the body-class swap mechanism already working for brand colors.

Audit both against current codebase state. Output:
- Code-level analysis of each candidate (where it lives, what it touches, side-effect surface).
- Recommendation with rationale grounded in the current file state.
- Risk register: any concerns about z-index, content readability, mobile, hover/focus states, or interaction with existing `backgroundImage` inline style.

**Gate:** Operator approves before Phase 1.

### Phase 1 — Execute chosen implementation (~1–2 exchanges)

Single-file or two-file edit (depending on chosen candidate). No migrations, no schema, no backend.

**Acceptance during Phase 1:**
- Code matches recommendation from Phase 0.
- Local build passes (`npm run build`).
- No new lint warnings on touched files.
- DOR-aligned: no hardcoded school branches in components; theming flows through `--brand-overlay-rgba` token.

### Phase 2 — Commit + push (~0.5 exchange)

- Verify build green pre-commit.
- Single commit with message that names the regression source (Sprint 017 HF-B) and the restoration scope.
- Push to `master`. Vercel auto-deploys.

### Phase 3 — Operator-driven verification (~1 exchange)

Same shape as Sprint 017 Phase 4 protocol. Operator verifies via Claude in Chrome or direct browser:

1. BC High signed-in student → cream wash visible over BC High team photo.
2. Belmont Hill signed-in student → scarlet wash visible over BH background photo.
3. Anonymous visitor → BC High default (cream wash, BC High photo).

If any check fails, return to Phase 1 with the failure as input.

### Phase 4 — Retro + close (~1 exchange)

- Sprint 018 retro filed at `docs/specs/sprint-018-overlay-tint-restoration-retro.md`.
- Capture: chosen candidate (a or b), why, anything surfaced in Phase 0 worth carrying forward, exchange burn vs ceiling.
- CHS scoring optional given single-deliverable scope.

## 5. Acceptance criteria

| # | Criterion | How verified |
|---|---|---|
| 1 | BH students see scarlet wash over BH photo | Phase 3 browser verification |
| 2 | BC High students see cream wash over BC High photo | Phase 3 browser verification |
| 3 | Anon students see BC High default | Phase 3 browser verification |
| 4 | Overlay driven by `--brand-overlay-rgba` token (no hardcoded school hex) | Code review in Phase 1 |
| 5 | Build green on master | Vercel deploy status |
| 6 | No regression to BC High background-image surface | Phase 3 browser verification |

## 6. Definition of Ready (carried from Sprint 017)

- Theming is school-conditional via existing design-token system, driven dynamically by `hs_programs` identity.
- No hardcoded school branches in components.
- `--brand-overlay-rgba` is the token consumed.

## 7. Out of scope

Hard fence — anything below does not enter Sprint 018:

- Any other Sprint 017 carry-forward (handled in Sprint 019+).
- F-21 `partner_high_schools` / `hs_programs` refactor (Sprint 019).
- Belmont Hill shortlist seeding (Sprint 019).
- Token-system migration of `CollapsibleTitleStrip`, `CoachDashboardPage`, `AdminPage` hardcoded hex literals (separate future sprint).
- Backend / RLS / migration work.
- Initial-mount FOUC concern.
- 10 MB Belmont Hill background asset compression (operator out-of-band).

If any of the above surfaces during execution, capture as carry-forward in the Sprint 018 retro and continue. Do not absorb into this sprint.

## 8. Operating contract preamble for Claude Code

To be fired into Claude Code at Phase 0 open. Flat-technical, no agent invocation, no governance language.

```
Sprint 018 — Overlay Tint Restoration. Single-deliverable fix sprint
in gritty-recruit-hub-rebuild.

Context:
Sprint 017 Session 2 HF-B (commit 99a8a65) removed the cream/scarlet
overlay tint rule from src/index.css alongside background-image rules
it was scoped to delete. The overlay rule was separate but lived in the
same source block. On production (current HEAD a17c5f2, last source
commit fb53b3c), Belmont Hill students see the BH background photo with
no scarlet wash, and BC High students see the BC High team photo with
no cream wash.

The brand-token blocks still declare --brand-overlay-rgba correctly:
- :root --brand-overlay-rgba: rgba(245, 239, 224, 0.9)   (BC High cream)
- body.school-belmont-hill --brand-overlay-rgba: rgba(180, 31, 46, 0.08)  (BH scarlet)

The token is defined. The rule that consumes it is missing.

Sprint 018 deliverable:
Restore the overlay rule. BH students see scarlet wash over BH photo.
BC High students see cream wash over BC High photo. Anon students see
BC High default.

Phase 0 task (this prompt):
Audit two implementation candidates against the current codebase state.

Candidate (a): inline-style on <main> in src/components/Layout.jsx,
parallel to the backgroundImage inline-style introduced in HF-B,
driven by schoolSlug from useSchoolIdentity.

Candidate (b): CSS pseudo-element (e.g., main.layout-main::before) in
src/index.css that reads --brand-overlay-rgba via the body-class swap
mechanism already working for brand colors.

For each candidate, report:
1. Where the change lives (file + approximate location).
2. Side-effect surface (z-index, content readability, mobile, hover/focus
   states, interaction with the existing backgroundImage inline style).
3. Risk that the implementation re-introduces the deletion fragility
   that caused this regression.

Then recommend (a) or (b) with rationale grounded in the current file
state. Do not implement yet. Operator gates before execution.

Constraints:
- No hardcoded school branches in components. Theming flows through
  --brand-overlay-rgba.
- Single-file or two-file edit at most.
- No backend, no migrations, no RLS.
- No FOUC work, no asset compression.
```

## 9. Risk register (open at sprint open)

- **R1:** Same deletion fragility recurs. If overlay rule is re-introduced in `src/index.css` near the deleted background-image block, a future cleanup pass could remove it again. Mitigation: Phase 0 audit must surface this and propose either separation (different selector / different file) or comment-anchoring.
- **R2:** Z-index interaction with content. Overlay must sit above background but below content. Phase 0 reports stacking context.
- **R3:** Mobile rendering. Both candidates need to behave on narrow viewports. Phase 3 verification covers signed-in BH on mobile.

## 10. Revision history

| Version | Date | Notes |
|---|---|---|
| v0.1 | 2026-05-07 | Initial draft. Sprint open. |
