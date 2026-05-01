---
sprint_id: Sprint010
sprint_name: GrittyFB Design Token System
asset: Gritty OS Web App - Styling Foundation
version: MVP
priority: Important, Not Urgent
effort: Low-Medium
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: not_started
---

# Sprint 010 Session Spec — GrittyFB Design Token System

## Sprint Objective

Establish a GrittyFB design token system in `gritty-recruit-hub-rebuild` so that subsequent coach-scheduler sprints (011 onward) and any other GrittyFB-styled surface can render consistent brand styling without per-component hex value duplication. This sprint produces no user-visible features. It produces the styling foundation that every later sprint in the coach-scheduler series depends on.

The token system must coexist cleanly with the existing BC High maroon palette used in the Coach Dashboard. No regressions in existing styled surfaces.

## Hard Constraints

1. **No regressions in existing styled surfaces.** The BC High Coach Dashboard, Student View, MY GRIT FIT, YOUR SHORTLIST, and admin panel must render identically before and after this sprint.
2. **No user-visible features in this sprint.** This is foundation work. The reference component required for acceptance is internal only and may be deleted or kept as a styleguide page.
3. **Single source of truth.** The tokens live in exactly one location. No second copy, no parallel definitions, no per-component overrides of brand color values.
4. **Mobile pairing not applicable.** Design tokens are not viewport-specific in this sprint. The tokens become viewport-aware in later sprints if needed.
5. **Scope discipline.** Anything beyond the token set + reference component (e.g., applying tokens to existing components, refactoring BC High maroon) goes to carry-forward.

## Asset Infrastructure

**Skills available for invocation this sprint:**
- `superpowers` — primary execution
- `front-end-design` — token taxonomy decisions, component primitives
- `planning` — token inventory ordering
- `testing` — Vitest assertion authoring (tokens render, no regressions)
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
| Coach Scheduler Execution Plan | `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints\EXECUTION_PLAN.md` | Strategy artifact establishing the 7-sprint sequence |
| Prototype HTML | `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints\prototype\index.html` | Working `--gf-*` token set; reference for token names and values |
| GrittyFB logo asset | `C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints\prototype\logo.png` | Logo file to be added to repo at standard public asset path |
| Existing styling baseline | `gritty-recruit-hub-rebuild/tailwind.config.*` (or equivalent) | Verify whether the project uses Tailwind theme extension or CSS variables; tokens go in the existing pattern |

## Deliverables

### D1 — Token Inventory and Naming

Define the GrittyFB token set in the repo's existing styling system (Tailwind theme extension OR CSS variable file — match what the codebase already uses).

The token set must include, at minimum:

**Surface tokens (dark palette):**
- `gf-bg-deep` — deepest forest, near black
- `gf-bg` — primary dark surface
- `gf-bg-elev` — elevated card surface
- `gf-bg-elev-2` — hover/active elevated
- `gf-border` — subtle border on dark
- `gf-border-strong` — visible border on dark

**Accent tokens (lime/chartreuse):**
- `gf-accent` — primary lime
- `gf-accent-hover` — lighter on hover
- `gf-accent-deep` — pressed state
- `gf-accent-soft` — tinted background (rgba)

**Text tokens (on dark):**
- `gf-text` — primary text on dark
- `gf-text-muted` — secondary text
- `gf-text-dim` — tertiary / labels
- `gf-text-on-accent` — text on lime buttons

**Light surface palette (for breathing-room sections):**
- `gf-light-bg` — warm off-white
- `gf-light-bg-elev` — pure white card
- `gf-light-border` — divider on light
- `gf-light-text` — primary text on light
- `gf-light-text-muted` — secondary text on light

**Typography tokens:**
- `gf-display` — Fraunces (serif display, italic-capable)
- `gf-body` — Inter (sans-serif body)

**Hex values:** Use the values from `prototype/index.html` `:root` block as authoritative. Implementer may adjust if a value produces unacceptable contrast against another token, but document any deviation.

**Acceptance:** Tokens are defined in one location in the repo's existing styling pattern. All listed tokens are present. Hex values match the prototype unless documented otherwise in the retro.

---

### D2 — Logo Asset Added to Repo

Add the GrittyFB logo to the repo at the standard public asset path so it can be referenced from any component.

**Acceptance:** Logo asset exists at the standard public path (e.g., `public/brand/grittyfb-logo.png` or matching the repo's existing convention). Asset is referenceable from a component without import path gymnastics.

---

### D3 — Reference Component (Internal Styleguide Card)

Build one reference component that uses only GrittyFB tokens — no hardcoded hex values, no inline color literals. This component proves the token set is functional.

**Component scope:** A "Player Card" component matching the prototype's player card visual: photo placeholder (initials in lime-on-dark circle), name (Fraunces serif), position-height-weight line (Inter), school name (lime accent with dot indicator), class year tag, active interest summary block (with light background and accent left-border), stats grid, link row.

**Acceptance:**
- Component renders with prototype-equivalent visual fidelity
- Source contains zero hardcoded hex values for brand colors
- Component lives at a path that does not collide with future Sprint 011 work (suggest `src/components/styleguide/PlayerCardReference.tsx` or matching convention)
- Reference component is reachable from a styleguide route (e.g., `/styleguide` — internal only, can be auth-gated or simply unlisted) so the work is verifiable

---

### D4 — No-Regression Verification of Existing Styled Surfaces

Confirm BC High Coach Dashboard, Student View (HOME, MY GRIT FIT, YOUR SHORTLIST), and admin panel render identically before and after token introduction.

**Acceptance:**
- Visual smoke test on all four surfaces, desktop + mobile, shows no perceivable changes
- Existing Vitest assertions all pass (floor preserved)
- No new hex values appearing in the existing styled surfaces (i.e., the token introduction did not accidentally bleed into surfaces that should remain BC High maroon)

---

## Phased Execution Plan

**Phase 1 — Inventory and define**
- Verify whether `tailwind.config.*` exists in the repo and is the styling source-of-truth, or whether CSS variables are used. Match the existing pattern.
- Inventory the token set per D1, write tokens into the chosen location.
- Add logo asset per D2.

**Phase 2 — Build reference component**
- Build the Player Card reference per D3.
- Wire to a styleguide route so it can be visually verified.

**Phase 3 — Regression verification and deploy**
- Run full Vitest suite. Floor preserved.
- Manual visual smoke test on existing surfaces per D4.
- `git status` clean. Vercel deploy from main if applicable, or merge to main per repo convention.

**Phase 4 — Retro**
- Spec deviations log (any token name or hex value changes from the prototype)
- Carry-forward register (token application to existing surfaces is explicitly carry-forward, not in this sprint)

## Carry-Forward Inputs from Strategy Artifact

These are documented context, not work items for this sprint:
- Coach-scheduler execution plan v4 (the 7-sprint sequence) is the parent strategy artifact
- Admin panel persistence bug is active during Sprints 010–014; data integrity workaround is direct Supabase Studio edits for accuracy-critical fields
- Sprints 011 onward all depend on this token foundation; no later sprint should introduce new brand color hex values

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Token names collide with existing Tailwind/CSS conventions | Low | Prefix all tokens with `gf-`; verify no existing class collision before merging |
| Hex values from prototype produce poor contrast in production rendering (different display calibration) | Low | Run a contrast check (WCAG AA minimum) on text/bg pairs; adjust and document |
| Reference component path collides with future Sprint 011 component path | Low | Place reference component under `src/components/styleguide/` or equivalent isolated location |
| Adding fonts (Fraunces, Inter) introduces font-loading delay or FOUT | Low | Use existing font-loading pattern in the repo if one exists; otherwise self-host or use `font-display: swap` |
| Token introduction inadvertently changes existing surfaces (CSS specificity collision) | Medium | Verify D4 visual smoke test on all four existing surfaces before deploy |

## Definition of Done

- All 4 deliverables (D1–D4) ship.
- Vitest assertion count ≥ existing floor, all passing.
- No console errors on any existing route.
- Reference component reachable at a styleguide route, rendering with token-only styling.
- No regressions in BC High Coach Dashboard, Student View, or admin panel.
- Deploy live (or merged to main per repo convention).
- Spec deviations logged in retro.

---

## Prompt 0 — Sprint 010 Opening Prompt for Claude Code

> The text below is the literal opening prompt to paste into Claude Code at session start. Do not paraphrase it.

```
We are running Sprint 010 in sprint mode.

Spec file: docs/specs/.coach-scheduler-sprints/sprint-010-session-spec.md

Read the spec in full before doing anything else. Then confirm back to me:
1. The 4 deliverables (D1 through D4) you've parsed from the spec
2. The styling pattern you've identified in the repo (Tailwind theme extension
   vs. CSS variables) and where the tokens will live
3. The hard constraints (no regressions, no user-visible features, single source
   of truth, scope discipline)
4. Any questions on the spec — flag them now, not mid-sprint

Once I confirm, invoke the superpowers skill and begin Phase 1. Use front-end-design
for token taxonomy and the reference component. Use testing for Vitest authorship.

Ground rules for this session:
- No regressions in BC High Coach Dashboard, Student View, or admin panel.
- Token introduction must not bleed into existing styled surfaces.
- The prototype HTML at docs/specs/.coach-scheduler-sprints/prototype/index.html
  is the authoritative source for token names and hex values. Match it unless
  contrast or rendering forces a deviation, and document any deviation in the
  retro.
- Reference component goes under a styleguide path that does not collide with
  future Sprint 011 component paths. Suggest src/components/styleguide/ or
  match the repo's existing convention.
- Auto-approved permissions are the S1 set. Do not pause to ask for permission
  on S1-class actions.
- Anything beyond the token set, logo asset, reference component, and regression
  verification goes to carry-forward, not into the sprint.

When you finish Phase 1 and Phase 2, stop and report status before running
Phase 3 deploy.
```

---
