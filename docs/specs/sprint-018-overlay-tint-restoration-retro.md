---
sprint: 018
artifact: retro
status: CLOSED
dates: 2026-05-07
parent_spec: docs/specs/sprint-018-overlay-tint-restoration.md
session_close_commit: b8005a7
operator: Chris
---

# Sprint 018 — Overlay Tint Restoration — Retro

## 1. Sprint summary

Belmont Hill students see a substantial scarlet-tinted off-white wash over
the Belmont Hill background photo, comparable in legibility weight to the
BC High cream wash. BC High and anonymous sessions retain the existing
90% cream wash. Token-driven theming preserved — no hardcoded school
branches in components.

Single-deliverable fix sprint. Two commits on `master`, no branching.
Operator-confirmed in browser after second commit deployed.

## 2. What shipped

### Commit 3ecbd7e — Layout overlay div hardening
- `src/components/Layout.jsx` overlay div (15 insertions, 2 deletions).
- Replaced `inset: 0` shorthand with explicit `top/right/bottom/left: 0`
  longhand. Eliminates Safari < 14.1 risk and any React-style-processing
  edge case that could collapse the box to 0×0.
- Added explicit fallback to `var(--brand-overlay-rgba, rgba(245, 239,
  224, 0.9))` so the property never becomes invalid if the variable
  fails to resolve at paint time.
- Build green. Pushed `a17c5f2..3ecbd7e`.

### Commit b8005a7 — Belmont Hill overlay token opacity bump
- `src/index.css` `body.school-belmont-hill --brand-overlay-rgba`
  (7 insertions, 1 deletion).
- Changed from `rgba(180, 31, 46, 0.08)` (8% pure scarlet, imperceptible
  over a saturated outdoor background photo) to `rgba(245, 232, 234,
  0.92)` (92% scarlet-tinted off-white, parity with BC High cream weight,
  scarlet undertone for brand identity).
- Build green. Pushed `3ecbd7e..b8005a7`.

## 3. Chosen candidate (a vs b) — and the framing twist

Phase 0 audit produced a finding that reframed the entire sprint: **the
spec premise was factually off**. The spec asserted that HF-B (`99a8a65`)
deleted the overlay rule alongside the background-image rules. Audit
confirmed via `git show fb53b3c:src/components/Layout.jsx` that the
overlay-div token consumer was at lines 359–364 of Layout.jsx the entire
time. HF-B deleted only the three CSS background-image rules and the
anon fallback. The token consumer (the inline overlay div) was never
in `src/index.css` — it has been a JSX-co-located inline-style div since
`c662e60` (March 2026), with HF-A migrating its hardcoded rgba to the
var() reference.

So neither candidate (a) "add inline-style on `<main>`" nor (b) "add CSS
pseudo-element" was a green-field implementation. (a) already existed in
the form (a) prescribed.

**Chosen path: candidate (a) hardening, not implementation.** Reasoning:
- Matches HF-B's established pattern (inline-style on `<main>`,
  JSX-co-located).
- Avoids reintroducing CSS-side fragility in the same `index.css` block
  that just lost rules.
- Keeps the overlay structurally bound to the content div it sits
  behind — high-visibility in any future review.
- Smaller blast radius than introducing a new pseudo-element rule.

## 4. The two-iteration arc — what we got wrong, then right

### Iteration 1 (3ecbd7e) — necessary but not sufficient

Static analysis identified two latent failure modes in the overlay div
inline style: `inset: 0` shorthand with no longhand backstop, and
`var(--brand-overlay-rgba)` with no fallback color. Either failure
produces the same symptom: photo visible, no wash. Defensive fix
addressed both in a single edit.

This commit was a real hardening — the overlay div is now bulletproof
against both classes of failure — but it did not change the visible
outcome on Belmont Hill. The diagnosis was incomplete.

### Iteration 2 (b8005a7) — the actual visual fix

Operator pushback with DOM screenshot was the unblock. The screenshot
proved:
- Layering was correct (overlay between background and content per
  paint order).
- Iteration 1's hardening had landed (var() fallback visible in the
  inline style).
- The resolved background-color for `body.school-belmont-hill` was
  `rgba(180, 31, 46, 0.08)` — 8% pure scarlet over a saturated outdoor
  photo.

The overlay was rendering. It was just below the visible threshold.

That value was set in HF-A (`b720256`) as a "warm tint, 8%"
interpretation. It produced no visible wash on Belmont Hill from day
one, and was never visually verified before HF-A merged. The
restoration the spec asked for (a visible scarlet wash) required
changing the token, not the consumer.

### What I should have caught in Phase 0

Phase 0 audit raised the 8%-token question as one of three plausible
causes for "no wash" — but the recommendation routed to operator
verification before changing the token. In retrospect, the token value
was the highest-prior cause given that:
- BC High at 90% would be massively visible (so a "no wash" report
  on BC High likely reflects a different bug or cache).
- Belmont Hill at 8% over a saturated outdoor photo is genuinely
  imperceptible — a sufficient explanation for the BH report alone.

Splitting the cause space between "BC High broken" and "BH 8% too
subtle" should have surfaced as the more likely diagnosis. Iteration
1's defensive fix was still the right thing to ship (the latent
failure modes were real) — but iteration 2 should have shipped in the
same pass.

## 5. Acceptance criteria — final state

| # | Criterion | State |
|---|---|---|
| 1 | BH students see scarlet wash over BH photo | PASS — operator confirmed |
| 2 | BC High students see cream wash over BC High photo | UNCHANGED from prior — :root 90% cream still applies |
| 3 | Anon students see BC High default | UNCHANGED — :root default + inline fallback |
| 4 | Overlay driven by `--brand-overlay-rgba` token (no hardcoded school hex) | PASS — token consumer preserved |
| 5 | Build green on master | PASS |
| 6 | No regression to BC High background-image surface | PASS — BC High path untouched |

## 6. Carry-forwards

### C-13 — Visual verification gate on token migrations

HF-A migrated three Layout.jsx hardcoded literals to `var(--brand-*)`
references and introduced `--brand-overlay-rgba` with school-conditional
values. The 8% scarlet BH override was set without visible-on-photo
verification. Pattern lesson: token migrations that change a perceptual
property (color, opacity, blur, transform) should require a visual
diff — not just a "var() resolves" check — before merging. This is
distinct from the Sprint 017 D-2 lesson on token-system completeness;
that one was about coverage, this one is about output verification.

Owner: standing rule, not a sprint. Add to a future cross-cutting
process doc when one is being written.

### C-14 — Pseudo-element option as a future hardening path

Sprint 018 chose candidate (a) hardening. Candidate (b) — a CSS
`main.layout-main::before` pseudo-element — was not implemented but
remains a viable structural improvement. It would put var() resolution
in pure CSS (no React style-processing surface) and remove one
positioned div from the JSX tree. Not urgent — current implementation
is now hardened. Consider if/when the Layout.jsx file gets a broader
refactor.

Owner: deferred indefinitely. Not a Sprint 019 candidate.

## 7. Exchange burn vs ceiling

| Phase | Estimated | Actual |
|---|---|---|
| Phase 0 — audit | 1–2 | ~1 |
| Phase 1 — execute | 1–2 | ~2 (across two iterations) |
| Phase 2 — commit + push | 0.5 | ~0.5 (per commit, two commits) |
| Phase 3 — operator verification | 1 | ~1 |
| Phase 4 — retro + close | 1 | ~1 |

**Total: ~6 of 15 ceiling.** Within plan. Iteration 2 added one
exchange beyond a single-pass fix; the cost of incomplete Phase 0
diagnosis.

## 8. CHS scoring

Optional per spec given single-deliverable scope. Skipped.

## 9. Revision history

| Version | Date | Notes |
|---|---|---|
| v1.0 | 2026-05-07 | Sprint 018 closed. Both commits on origin/master, operator-verified. |
