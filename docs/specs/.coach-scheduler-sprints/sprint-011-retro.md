---
sprint_id: Sprint011
sprint_name: Public Recruits Roster
status: closed
date_start: 2026-04-30
date_close: 2026-05-01
merge_sha: 22b523fe425f18ab01008b5160fd112766e2ec95
---

# Sprint 011 Retro — Public Recruits Roster

## 1. Sprint Summary

| Field | Value |
|---|---|
| Sprint ID | Sprint011 |
| Date opened | 2026-04-30 |
| Date closed | 2026-05-01 |
| Merge SHA | `22b523fe425f18ab01008b5160fd112766e2ec95` |
| PR | #2 (squash, branch deleted) |
| Live URL | `https://app.grittyfb.com/athletes` |
| Path (final) | `/athletes` (pivoted mid-sprint from `/recruits`) |

Sprint 011 shipped the first public-facing surface in `gritty-recruit-hub-rebuild`: a read-only roster of GrittyFB partner-school student-athletes. BC High active by default with 26 profiles loaded; Belmont Hill rendered as disabled with a "coming May 2026" subtext per the school config. The page reads through the new RLS migration `0038_add_public_recruits_select` via the anon key, with the column boundary enforced at the data hook's `PROFILES_WHITELIST_SELECT` clause.

The path pivoted from `/recruits` to `/athletes` mid-sprint after Phase 3 step 7 surfaced an active legacy system at `/recruits/<slug>/...` (a password-gated reverse proxy implemented in `api/recruits-auth.ts`). The pivot preserved both systems with no rewrite collision; the legacy proxy stays untouched.

### Deliverables shipped

| ID | Title | Status |
|---|---|---|
| D0 | Phase 0 pre-sprint data audit | shipped |
| D1 | Public route at `/athletes` | shipped (pivoted from `/recruits`) |
| D2 | Top navigation bar | shipped |
| D3 | Hero section | shipped |
| D4 | School toggle (pill segment) | shipped |
| D5 | Filter bar (search, position, class year, sort) | shipped |
| D6 | RecruitCard grid with PII whitelist | shipped |
| D7 | Mobile responsive + 44px touch targets at ≤768px | shipped |
| D8 | Footer with same-tab grittyfb.com link | shipped |
| D9 | Bleed audit + Vitest gate + BC High no-regression | shipped |

### Vitest delta

| Metric | Pre-Sprint-011 | Post-Sprint-011 |
|---|---:|---:|
| Test files | 54 | 63 |
| Passing tests | 625 | 772 |
| Failing tests | 1 | 1 |
| Total tests | 626 | 773 |

Delta: +147 passing assertions, +9 test files. Floor preserved. Single failing test (`tests/unit/schema.test.js:139`) is BL-S010-03, pre-existing and unchanged.

### Files changed (squash merge `22b523f`)

24 files, +4895 / −46.

- 6 styled components in `src/components/recruits/` (RecruitCard, RecruitsFilterBar, RecruitsFooter, RecruitsHero, RecruitsTopNav, SchoolToggle)
- 2 pages: `src/pages/AthletesPage.jsx`, `src/pages/CoachLoginPlaceholderPage.jsx`
- 1 data hook: `src/hooks/useRecruitsRoster.js`
- 1 utility module: `src/lib/recruits/utils.js`
- 1 data seed: `src/data/recruits-schools.js`
- 9 test files in `tests/unit/`
- 1 RLS migration: `supabase/migrations/0038_add_public_recruits_select.sql`
- 1 spec + 1 prototype filed at `docs/specs/.coach-scheduler-sprints/`
- App.jsx route registration + retro

---

## 2. Deliverables vs Spec Acceptance

Spec reference: `docs/specs/.coach-scheduler-sprints/sprint-011-session-spec.md` line numbers cited per criterion.

### D1 — Public route at `/athletes` (spec lines 87–92, path pivoted)

- ✓ Route registered outside `<Layout>` and outside `<ProtectedRoute>`/`<AdminRoute>` per `/styleguide` precedent
- ✓ Direct URL access works without auth (verified at prod via curl HTTP 200)
- ✓ No collision with existing routes (pivot from `/recruits` resolved the conflict with the legacy proxy)
- ✓ No admin or auth-gated UI surfaced

### D2 — Top navigation bar (spec lines 99–103)

- ✓ Logo asset references `/grittyfb-logo.png`
- ✓ All nav links use `<a href>` with full external URLs to grittyfb.com sections
- ✓ "Recruits" link marked active via `aria-current="page"` + 2px solid `var(--gf-accent)` border-bottom
- ✓ "Coach Login" routes to `/coach-login-placeholder` stub (Sprint 016 lands the real flow)

### D3 — Hero section (spec lines 111–117)

- ✓ Headline: `Elite high school talent. *One roster.* One visit away.` with italic `<em>` on "One roster."
- ✓ Subhead: locked Q5 copy, 22 words
- ✓ Partner-schools indicator data-driven from `RECRUIT_SCHOOLS`
- ✓ Typography routes through `gf-display` + `gf-body`
- ✓ Colors route through `gf-*` tokens (token-purity test green)
- ✓ No CTA, no button, no link in hero

### D4 — School toggle (spec lines 122–129)

- ✓ Pill segment control above roster grid, BC High active by default, Belmont Hill disabled
- ✓ Iterates `RECRUIT_SCHOOLS` array (verified by test); no hardcoded buttons
- ✓ Inline `(coming May 2026)` subtext on Belmont Hill, label-class typography, `gf-text-dim`
- ✓ No data fetched for disabled schools (hook receives `null` filter when active is false)

### D5 — Filter bar (spec lines 134–144)

- ✓ Search (case-insensitive substring on name)
- ✓ Position dropdown populated from distinct positions
- ✓ Class year dropdown populated from distinct grad_years
- ✓ Sort options: Name A–Z, Name Z–A, Class Year (3 options exactly, no stat-based sort per spec line 141)
- ✓ Filter state lifted to `AthletesPage`; `RecruitsFilterBar` fully controlled, no URL params

### D6 — RecruitCard grid (spec lines 148–167)

- ✓ Responsive grid `auto-fill` `minmax(320px, 1fr)`, `gf-space-lg` gap
- ✓ Card visual fidelity matches frozen `PlayerCardReference`
- ✓ Photo or initials fallback (53.8% have avatars per Phase 0; initials handle the rest)
- ✓ Name (Fraunces), position·height·weight (Inter), school + lime dot, Class 2027 pill
- ✓ Active interest summary block — `X schools · Recruiting Progress Y%` for the 3 active students; `Not yet active` zero-state for the 23 without shortlist activity
- ✓ Stats grid: GPA + 40 yd (2-stat per locked Q1)
- ✓ Hudl + X/Twitter outbound links with `target="_blank" rel="noopener noreferrer"`; Twitter normalized via `normalizeTwitter()` at render
- ✓ Accolade chips render-when-true, hidden when false/null (in practice only `expected_starter` renders given Phase 0 data)
- ✓ Hover state replicated from prototype: border `gf-accent-deep`, `translateY(-2px)`, `gf-shadow-elev`
- ✓ PII enforcement at render layer (test passes a profile with email/phone/parent_guardian_email populated and asserts none surface in card text)
- ✓ PII enforcement at data layer (`PROFILES_WHITELIST_SELECT` constant — 16 columns explicit, zero excluded names, no wildcard)

### D7 — Mobile responsive (spec lines 170–178)

- ✓ At 390px: card grid single column, filter bar wraps, top nav usable
- ✓ Touch targets ≥44px on filter inputs, school toggle pills, top nav active + coach-login (`@media (max-width: 768px)` rule via scoped `<style>` blocks; classNames `recruits-filter-input`, `recruits-school-pill`, `recruits-nav-link-active`, `recruits-nav-link-coach`)
- ✓ Operator visual sweep at 1440 / 1024 / 768 / 390 confirmed all four breakpoints; touch targets verified ≥44px

### D8 — Footer (spec lines 181–188)

- ✓ Lives at the bottom of the page, not fixed
- ✓ One external link to `https://www.grittyfb.com`, same-tab (no `target="_blank"`, no `rel`)
- ⚠ Color token: spec says `gf-text-muted`; implementation uses `gf-light-text-muted` because the footer is on a light surface. Surface-appropriate variant chosen. **Recommend spec amendment** to disambiguate the token-by-surface mapping. (See deviation 1 below.)

### D9 — Bleed audit + no-regression (spec lines 192–200)

- ✓ Bleed audit: `var(--gf-*)` consumption confined to 10 authorized files (6 Sprint 011 components + RecruitsFooter + AthletesPage + CoachLoginPlaceholderPage + StyleguidePage + frozen PlayerCardReference)
- ✓ Vitest floor preserved: 772 passing, 1 failing (BL-S010-03 unchanged)
- ✓ Operator-driven no-regression sweep on `/`, `/styleguide`, `/coach-login-placeholder` confirmed no perceivable changes
- ✓ Zero PII fields appear on `/athletes` (manual + 33 test assertions)

---

## 3. Constraint Register and Decisions

### Carry-forward from Sprint 010 (still active)

- `gf-text-dim` AA-Large only on dark surfaces (~3.5:1 contrast against `gf-bg`, `gf-bg-elev`); label-class typography only (≥14pt bold OR ≥18pt regular)
- Token-purity guard at CI: every new GrittyFB-styled component pairs with a Vitest assertion that greps for hex literals
- `src/components/styleguide/PlayerCardReference.jsx` is frozen; the production card lives at `src/components/recruits/RecruitCard.jsx`

### Sprint 011 additions

- **PII whitelist locked at 16 columns** (`name`, `high_school`, `grad_year`, `state`, `position`, `height`, `weight`, `speed_40`, `gpa`, `twitter`, `hudl_url`, `avatar_storage_path`, `expected_starter`, `captain`, `all_conference`, `all_state`) plus `user_id` for keying. Five explicit exclusions enforced at both data and render layers: `email`, `phone`, `parent_guardian_email`, `agi`, `dependents` (plus `hs_lat`, `hs_lng`, `last_login`, `created_at`, `updated_at`, `last_grit_fit_run_at`, `last_grit_fit_zero_match`, `status`, `sat`, `id`).
- **Twitter normalizer at render time**: strip leading `@`, scheme prefixes, `x.com/`, `twitter.com/`, query strings, trailing slashes; render as outbound link to `https://x.com/${normalized}`; omit when null/empty.
- **Accolade chips render-when-true**: `expected_starter`, `captain`, `all_conference`, `all_state` render only when boolean is `true`; hidden when `false` or `null`. No empty placeholder slots.
- **Active interest "Not yet active" zero-state**: when `schoolsShortlisted === 0`, the entire `X schools · Y%` summary line is replaced with `Not yet active` in `gf-text-dim`.

### Sprint 010 carry-forward extension

- The `gf-text-dim` contrast constraint as currently documented covers dark surfaces only (~3.5:1 against `gf-bg`/`gf-bg-elev`). On the school toggle's light surface, contrast against `gf-light-bg-elev` is ≈4:1 — passes AA Normal Text. **The constraint document needs amendment** to call out the surface-by-surface contrast and clarify acceptable usage on light surfaces. Logged for the constraint-register update.

---

## 4. Spec Deviations Log (Intentional)

| # | Deviation | Rationale | Authority |
|---|---|---|---|
| 1 | Footer color token: `gf-light-text-muted` instead of spec's `gf-text-muted` | Footer is on a light surface (`gf-light-bg`); the dark-surface variant `gf-text-muted` (#a8c4b3) on light background would render washed-out. Implementation chose surface-appropriate variant. **Spec amendment recommended** to disambiguate token-by-surface naming. | Static pre-check at OP 64; implementation through Phase 3 step 2 |
| 2 | Class year tag format: `Class 2027` (not numeric only) | Matches prototype phrasing | Operator approved during Phase 2 plan (Q-default 4) |
| 3 | "Recruiting Progress" label retained verbatim | Matches prototype card exemplar (Ayden Watkins fixture: "41 schools · Recruiting Progress 32%"). Compact shorthand was not selected. | Phase 2 build, locked at component implementation |
| 4 | School toggle disabled-pill subtext: inline `(coming May 2026)` | Tooltip avoided because disabled buttons don't reliably fire `:hover` cross-browser; inline subtext is also accessible without JS state | Operator approved during Phase 2 plan (Q3) |
| 5 | Mobile nav collapse: hide-secondary at <768px (no hamburger) | No JS state; simpler than hamburger for a 4-link nav | Operator approved during Phase 1 plan (Q3) |
| 6 | `<style>` blocks inside components (not src/index.css) for media queries and hover states | Inline-style components can't carry @media or :hover. Token-purity grep still scans `<style>` content. | Phase 1 RecruitsTopNav; pattern reused for SchoolToggle, RecruitsFilterBar, RecruitCard hover |

---

## 5. Backlog Items Surfaced

### BL-S011-01 — `vercel.json` → `vercel.ts` migration

Vercel knowledge update flagged `vercel.ts` as the recommended config path (Vercel session-start hook). Project still uses `vercel.json`. Out of scope for Sprint 011; infra sprint candidate.

### BL-S011-02 — Spec language drift "players" vs schema "profiles"

Sprint 011 spec referred throughout to a `players` table; the actual table is `public.profiles`. Phase 0 audit caught and mapped, but the drift remained in the spec. Future spec authoring: validate table names against current schema before locking.

### BL-S011-03 — RecruitCard naming collision (resolved)

`src/components/PlayerCard.jsx` already exists in the repo (legacy from earlier coach-dashboard work). Sprint 011 chose `RecruitCard.jsx` to avoid overwriting. **Resolved by file naming choice** in Phase 1 plan; closing this entry.

### BL-S011-04 — DB-level Twitter normalization

`profiles.twitter` is free-text (handle, URL, with or without `@`). Sprint 011 normalizes at render via `normalizeTwitter()`. Longer-term consideration: normalize at DB write time so downstream consumers don't each re-implement. Future infra/data sprint.

### BL-S011-05 — `captain` / `all_conference` / `all_state` booleans 0% true across BC High

Phase 0 found these accolade booleans are 0% true across all 26 BC High profiles. The fields exist; the data-entry pipeline doesn't populate them. Not a Sprint 011 build item. Data-entry pipeline gap.

### BL-S011-06 — `collect()` test helper does not recurse into nested-array JSX children

Hit twice this sprint (FilterBar Phase 2, SchoolToggle Phase 3). Components mixing a static `<style>` element with `.map()` produce children = `[<style>, [<element>...]]` — the `collect` helper iterates the outer array but not the nested one. Workaround: spread mapped children into a flat array literal. **Either upgrade the helper to recurse arrays repo-wide, or adopt jsdom + `@testing-library/react` for rendering tests** so the test layer matches React's actual children semantics. Infra sprint candidate.

### BL-S011-07 — `supabase/.temp/` should be gitignored

Surfaced via the `git add -A` incident at OP 53: `supabase/.temp/linked-project.json` (a Supabase CLI generated temp) was swept into a commit. Cleanup commit removed it. The directory should be added to `.gitignore` so future `add -A` (in any session) can't include it. Infra sprint.

### BL-S011-08 — DEC filing on the legacy `/recruits/<slug>/` proxy system

The legacy password-gated proxy at `api/recruits-auth.ts` + `public/recruits/login.html` is in production use (env vars `RECRUIT_PASSWORD_*`, `RECRUIT_ORIGIN_*`, `RECRUIT_AUTH_SECRET` confirmed live in Phase 0 Part A). It has no DEC, no `_org` entry, no spec reference. Active production system with secrets, undocumented in any project artifact. **Needs governance traceability**. Governance-mode work, post-sprint.

---

## 6. Process Notes (Operator-Prompt Discipline Thread)

This sprint surfaced a pattern of operator-prompt discipline issues that compound across phases. Capturing as primer-style guidance for future sprints.

### A. Phase commits at phase close, not aggregated

Phase 1 was never committed. The omission surfaced at Phase 3 step 0 branch hygiene (OP 40.3) and required a Phase 1 catch-up commit (`a00b2eb`) ahead of Phase 3 work. The squash merge collapsed everything cleanly, but the in-branch history became chronologically inverted (Phase 2 commit predated the Phase 1 commit).

**Future sprints:** explicit commit at the close of every phase, with file lists named in the operator prompt that authorizes the commit. Don't carry uncommitted phase work into subsequent phase planning.

### B. Smoke-test prompts must reference canonical sources

At OP 21.6, the operator prompt paraphrased typography spec from memory and stated DM Sans where the actual `src/index.css` token resolved to Inter. Inverted diagnosis at the smoke test produced confusion that took an extra round to resolve.

**Future:** smoke-test prompt language pulls from `src/index.css` token definitions, prototype `index.html`, and locked Phase 0 decisions — never paraphrased from spec memory.

### C. Operator prompts that act on git state must reflect actual state

At OP 53, the operator prompt directed `git reset HEAD` against a state where the bad commit was already pushed to origin; the recipe didn't run as written. Claude Code held before destructive ops and surfaced the mismatch.

**Future:** prompts that issue git operations include a state precondition the prompt author has verified at the time of prompt writing.

### D. `git add -A` discipline

At OP 53, Claude Code used `git add -A` and swept in 31 unrelated files into the pivot commit. Required a follow-up cleanup commit (`3a6a8e8`) that removed 29 of them.

**Future:** operator prompts that include explicit file lists must reinforce the discipline: stage by explicit path only, never `git add -A` or `git add .`.

### E. Tool routing — Claude Code vs Claude in Chrome

At OP 56, the operator prompt was labeled "Claude in Chrome prompt" but written in a register Claude Code interpreted as its own. Claude Code declined to fabricate the visual sweep observations and surfaced the tooling constraint.

**Future:** prompt header must match the tool the prompt is for, and prompt body must not assume capabilities the tool lacks.

---

## 7. Phase 0 Audit Thread

Two real Phase 0 audit gaps surfaced mid-sprint, both of which the audit could have caught in the same session.

### A. Live anon-key SELECT against any table the sprint plans to read

Phase 0 Q1–Q6 confirmed schema, fields, and BC High completeness via service-role MCP introspection. **The actual RLS policy state on `profiles` and `short_list_items` was not exercised at the anon-key layer.** The blocker surfaced at Phase 2 step 0 (OP 26.3) and required migration `0038_add_public_recruits_select` to unblock.

**Future Phase 0:** include a live anon-key SELECT against every table the sprint plans to read. The audit must exercise the auth boundary, not just the schema.

### B. URL collision audit across all platform layers

Phase 0 Q1 checked React Router for `/recruits` collision and confirmed no React-side conflict. **The audit did not check `vercel.json` rewrites, `public/` static files, or `api/` Edge Functions.** The collision surfaced at Phase 3 step 7 push (OP 41) when curl probes against the preview returned the legacy `Not Found` from `api/recruits-auth.ts`'s pathname guard. Resolution required a path pivot to `/athletes`.

**Future Phase 0:** audit URL paths at every layer — React Router, `vercel.json` rewrites, `public/` static file paths, `api/` route handlers, edge config.

### C. Existing-system inventory

The legacy `/recruits/<slug>/` proxy is live, has secrets, has code, but no DEC, no `_org` entry, no spec reference. Phase 0 noted the `RECRUIT_*` env vars as informational only — the connection between those env vars and an active production code path was not made until Phase 3.

**Future spec authoring:** include a "what existing systems touch this surface" preflight. Catalog any code, env vars, rewrites, or assets that share the proposed namespace before locking the spec.

---

## 8. Carry-Forward to Sprint 012

The coach-scheduler series continues. Sprint 012 builds on `/athletes` plus the scheduler components.

- **Vercel Standard Protection** re-toggled ON post-merge (operator-driven)
- **`vercel.json` untouched**; the legacy `/recruits/<slug>/` proxy continues to coexist with `/athletes`
- **RLS migration `0038`** in production. New RLS policies for any new tables Sprint 012 adds will follow the same pattern: anon role, scope to active partner schools per `src/data/recruits-schools.js`
- **The 6 styled Sprint 011 components** and the `useRecruitsRoster` data hook are stable building blocks for Sprint 012
- **PII whitelist + Twitter normalizer + accolade chip pattern** locked as conventions; future card-shaped surfaces should follow the same defense-in-depth pattern (data-layer SELECT clause + render-layer destructure boundary + boundary tests at both layers)
- **The `<style>` block + className pattern** for media queries and hover states is the carry-forward solution until either CSS Modules or styled-components is adopted repo-wide
