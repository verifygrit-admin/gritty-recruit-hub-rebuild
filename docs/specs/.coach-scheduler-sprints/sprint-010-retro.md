---
sprint_id: Sprint010
sprint_name: GrittyFB Design Token System
status: closed
date_start: 2026-04-30
date_close: 2026-05-01
merge_sha: 0d139eabe75e599635e0688697cdb9a71a436449
deploy_id: 2t4MLmpypBBP7fLLaCjJ3DMsCQi7
---

# Sprint 010 Retro — GrittyFB Design Token System

## 1. Sprint Summary

| Field | Value |
|---|---|
| Sprint ID | Sprint010 |
| Date opened | 2026-04-30 |
| Date closed | 2026-05-01 |
| Merge SHA | `0d139eabe75e599635e0688697cdb9a71a436449` |
| PR | #1 (squash, branch deleted) |
| Deploy ID | `2t4MLmpypBBP7fLLaCjJ3DMsCQi7` |
| Deploy status | success |
| Prod domains | `app.grittyfb.com`, `gritty-recruit-hub-rebuild.vercel.app` |

### Deliverables shipped

| ID | Title | Status |
|---|---|---|
| D1 | Token inventory and naming (35 `gf-*` tokens) | shipped |
| D2 | Logo asset at `public/grittyfb-logo.png` | shipped |
| D3 | `PlayerCardReference` + `/styleguide` route | shipped |
| D4 | No-regression verification (BC High surfaces) | shipped |

### Token count by category (D1)

| Category | Count |
|---|---:|
| Surface (dark) | 6 |
| Accent (lime) | 4 |
| Text (on dark) | 4 |
| Light surface | 5 |
| Typography | 2 |
| Spacing | 7 |
| Radii | 4 |
| Shadows | 3 |
| **Total** | **35** |

### Vitest delta

| Metric | Pre-Sprint-010 | Post-Sprint-010 |
|---|---:|---:|
| Test files | 53 | 54 |
| Passing tests | 613 | 625 |
| Failing tests | 1 | 1 |
| Total tests | 614 | 626 |

Delta: +12 passing assertions, +1 test file. Floor preserved. Single failing test (`schema.test.js`) is pre-existing and proven independent of Sprint 010.

### Files changed

| Path | Diff |
|---|---|
| `src/index.css` | +63 |
| `index.html` | +3 |
| `src/App.jsx` | +6 |
| `public/grittyfb-logo.png` | new (43,656 B) |
| `src/components/styleguide/PlayerCardReference.jsx` | new (273) |
| `src/pages/StyleguidePage.jsx` | new (82) |
| `tests/unit/styleguide-player-card-reference.test.jsx` | new (183) |

Total: 7 paths, 610 insertions, 0 deletions.

---

## 2. Spec Deviations Log

| # | Deviation | Rationale | Authority |
|---|---|---|---|
| 1 | `.jsx` extension instead of spec-suggested `.tsx` | Repo has zero TypeScript footprint (no `tsconfig.json`, no `typescript`/`@types/*` in `package.json`, all `src/` is `.jsx`) | Spec D3 explicitly allowed "matching convention" |
| 2 | Spacing / radii / shadow tokens pulled into Phase 1 | Same authoritative `:root` block, same `gf-` prefix, Phase 2 reference component required them; pulling in once avoided a Phase-2 token amendment loop | Operator approved during Phase 1 confirmation (Q3) |
| 3 | Logo path `public/grittyfb-logo.png` (flat) instead of `public/brand/grittyfb-logo.png` | Matches `public/helmet.png` convention for single brand-class assets; subfolder reserved for future asset sets | Operator approved during Phase 1 confirmation (Q2) |
| 4 | Hex value deviations from prototype | None | n/a — every hex byte-identical to `docs/specs/.coach-scheduler-sprints/index.html` `:root` |

---

## 3. Constraint Register (carry forward to Sprint 011+)

### `gf-text-dim` contrast constraint

- Pair: `gf-text-dim` (#6b8a78) on `gf-bg` (#0f2a1a) and `gf-bg-elev` (#143a25)
- Measured contrast: ~3.4–3.7:1
- WCAG AA Normal Text floor (4.5:1): fails
- WCAG AA Large Text floor (3.0:1): passes
- Decision: held at prototype value
- Usage constraint: label-class typography only (≥14pt bold OR ≥18pt regular)
- Re-open trigger: Sprint 011+ use case requiring body-weight tertiary text on dark surface

### Token-purity CI guard

- Enforced by `tests/unit/styleguide-player-card-reference.test.jsx` test `f`
- Greps `PlayerCardReference.jsx` for `#[0-9a-fA-F]{3,6}\b`
- Expected: zero matches
- Pattern to replicate on future styleguide components: same regex test colocated with the component test
- Constraint: do not consume `gf-*` tokens outside `src/components/styleguide/` and `src/pages/StyleguidePage.jsx` until a sprint explicitly authorizes consumption on a target surface

---

## 4. Backlog Items Surfaced (separate triage — not Sprint 010 work)

### BL-S010-01 — `deploy.yml` workflow broken since ~Sprint 005

- Symptom: `Build and Deploy` and `Playwright Regression` fail on every master push
- Span: 10+ consecutive master commits including Sprint 010 squash merge
- Empirical cross-reference: every red workflow run has paired with a Vercel `success` commit-status — Vercel's GitHub integration is the actual deploy mechanism
- Two repair paths:
  - (a) Fix the `amondnet/vercel-action` step (vercel CLI version, secrets, prebuilt flag)
  - (b) Strip the deploy step entirely; keep only the Vitest gate; let Vercel's GitHub integration own deploy
- Recommendation: option (b) — restores CI test enforcement without depending on the broken action; eliminates ghost-failure noise on every master commit

### BL-S010-02 — Vercel Preview env scope missing Supabase vars

- Symptom: Sprint 010 preview deploy at `gritty-recruit-hub-rebuil-git-754e35-verifygrit-admins-projects.vercel.app` failed to boot with `Uncaught Error: supabaseUrl is required`
- Cause: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist in Production scope only; Preview scope is empty
- Effect: every future preview deploy will fail to boot until Preview scope is expanded
- Repair: copy Production scope env vars into Preview scope (Vercel project settings → Environment Variables → expand to Preview)
- Sprint 010 mitigation: visual sweep moved to prod after merge with rollback ready (precedent established for low-risk additive changes)

### BL-S010-03 — `tests/unit/schema.test.js` Step 2 default-value assertion failing

- Test: `Schema: short_list_items.recruiting_journey_steps default → Step 2 should default to false`
- Failure mode: Step 2 is `completed: true` by default; assertion expects `false`
- Span: pre-existing on master before Sprint 010; verified independent via path-scoped stash test
- Triage path: schema migration / seed-data review

### BL-S010-04 — `LandingPage.jsx:471` duplicate `padding` key

- File: `src/pages/LandingPage.jsx:471`
- Symptom: Vite build warning — duplicate `padding` key in inline style object literal
- Span: pre-existing on master; surfaced during Sprint 010 build verification
- Triage path: 1-line fix on next LandingPage touch

---

## 5. Process Notes

### Visual sweep tooling gap

- Claude Code session lacked browser/screenshot capability despite Claude in Chrome MCP being listed in operator-authorized tooling
- Effect: Phase 3 items #1 (8-screenshot regression sweep) and #4 (live console error survey) could not be executed in-session
- Workaround: deferred to operator-driven sweep on prod after merge with rollback ready
- Forward action: confirm Claude in Chrome MCP is loaded into sprint-mode sessions going forward; if not loadable in Code, formalize the operator-driven sweep step in the sprint template

### Vercel preview protection wall

- Preview deploys default to Standard Protection (auth-gated)
- Bypass requires either a project bypass token or operator login
- Effect on Sprint 010: confounded with BL-S010-02 — even with bypass, the preview wouldn't boot
- Forward action: document bypass-token retrieval path in sprint-template for any sprint with a preview-deploy gate

### Vercel MCP team-scope 403

- Failed calls in this session: `list_teams` returned `{teams: []}`, `list_deployments` returned 403, `get_project` returned 403
- Cause: Vercel MCP OAuth scope does not include `team_260ITMYz3Fsl0Ioz0GbZDMyS`
- Workaround: `gh api` for commit statuses, deployments, and PR-bot comments — netted everything needed
- Forward action: scope Vercel MCP to the verifygrit-admin team OR formalize `gh api` as the canonical Vercel-state probe

### Stash maneuver false-start (Phase 2)

- First attempt to validate pre-existing schema test failure used `git stash push` with a pathspec that included untracked paths
- Git rejected the untracked paths and silently failed to create the stash entry
- Caught and corrected with a tracked-paths-only stash on retry
- Forward action: when proving pre-existing failure via stash, use tracked-paths-only pathspec or `git stash push -k` against staged-only

---

## 6. What Worked

### Spec phase-gating

- Phase 1 (tokens + logo) → Phase 2 (component + route) → Phase 3 (verify + deploy) → Phase 4 (retro) sequence held cleanly
- Each phase halted as instructed for explicit acceptance gate
- No phase advanced without operator confirmation
- Pattern: replicate verbatim on Sprint 011+

### Token-purity CI guard

- Single 4-line regex test enforces zero hex literals in `PlayerCardReference.jsx`
- Locks the constraint forward without per-PR review discipline
- High-leverage: prevents the most likely regression mode (someone pasting a hex during a hurried touch)
- Pattern: replicate on every styleguide component on add

### Source-level bleed audit

- `grep -rn "var(--gf-" src/ --exclude-dir=styleguide | grep -v StyleguidePage | grep -v index.css`
- Caught what would have been impossible to verify visually given BL-S010-02 (preview couldn't boot)
- Provides a deterministic pre-deploy check for token bleed
- Pattern: include in every sprint that introduces tokens or refactors token consumption

### Branch-push + Vercel preview as deploy gate

- Branch push triggered Vercel preview without firing the master-only `deploy.yml` workflow
- Preview build success confirmed code compiles even when boot failed (BL-S010-02)
- Visual sweep moved to prod after merge with rollback ready — viable for low-risk additive changes
- Pattern: usable again until BL-S010-02 is resolved; revisit once Preview env scope is fixed

### `gh api` as Vercel-state probe

- Filled gap left by the Vercel MCP 403s
- Surfaced commit statuses, deployment IDs, PR bot comments, branch workflow runs
- Sufficient for the entire Phase 3 verification flow
- Pattern: codify as the canonical Vercel-state probe until MCP scope is repaired
