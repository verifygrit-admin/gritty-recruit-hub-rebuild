---
sprint_id: Sprint011
sprint_name: Gritty Recruits Public Page (Read-Only)
asset: Gritty OS Web App - Public Surface
version: MVP
priority: Important, Urgent
effort: Medium
mode: sprint-mode
skill_invoked: /coach-me
date_start: TBD
date_target_complete: TBD
repo: gritty-recruit-hub-rebuild
spec_location: C:\Users\chris\dev\gritty-recruit-hub-rebuild\docs\specs\.coach-scheduler-sprints
status: not_started
depends_on: Sprint010
---

# Sprint 011 Session Spec — Gritty Recruits Public Page (Read-Only)

## Sprint Objective

Ship the first public-facing page in `gritty-recruit-hub-rebuild`: a read-only roster of GrittyFB partner-school student-athletes at `/recruits`. No authentication. No scheduler (Sprint 012). No edit affordances. The page reads from existing Supabase tables and renders entirely with Sprint 010's GrittyFB token system. This is the substrate Sprints 012–016 build on.

## Hard Constraints

1. **No new tables or schema changes.** Reads from existing `players`, `schools`, and related tables only. Any field that doesn't exist in current schema is descoped to a later sprint, not added here.
2. **No authentication required.** Page is publicly accessible without login.
3. **No edit affordances.** Read-only browsing. No form fields, no save buttons, no admin links surfaced to public visitors.
4. **GrittyFB tokens only.** No BC High maroon, gold, Playfair, or DM Sans on `/recruits`. All styling routes through `gf-*` tokens. The token-purity guard pattern from Sprint 010 (`tests/unit/styleguide-player-card-reference.test.jsx`) applies — Sprint 011 components must pass an equivalent grep-based test that blocks brand hex literals at CI.
5. **PII whitelist only.** Public page surfaces ONLY non-PII fields. No email, phone, or street address. Field whitelist defined explicitly in Phase 0 audit.
6. **External nav links are external.** Top nav links to grittyfb.com sections are full external navigations (`<a href="https://www.grittyfb.com/#section">`), not in-app routing. Open in same tab unless explicitly noted.
7. **Mobile pairing required.** Card grid stacks cleanly at 390px viewport. Filters wrap. Top nav collapses to hamburger or hides secondary links — implementer's choice, document the decision.
8. **Scope discipline.** No CTA, no scheduler modal, no auth, no Profile link. Those are Sprints 012–016.

## Pre-Sprint Dependencies

These must be true before Sprint 011 opens:

1. **Sprint 010 merged to master and live on prod.** ✅ Confirmed — merge SHA `0d139ea`, deploy ID `2t4MLmpypBBP7fLLaCjJ3DMsCQi7`.
2. **Vercel Preview env scope must include Supabase vars.** BL-S010-02 was surfaced during Sprint 010's preview deploy attempt — `Uncaught Error: supabaseUrl is required`. Production scope has the vars; Preview scope does not. Sprint 011's preview gate cannot function until this is resolved. Resolution path: Vercel project Settings → Environment Variables → expand each Supabase var's scope to include Preview. Verify by redeploying any branch and confirming the app boots at the bypass URL.

If pre-sprint dependency #2 is unresolved when this sprint opens, Phase 0 surfaces it and pauses the sprint until fixed.

## Carry-Forward Constraints from Sprint 010

These are not work items; they are usage rules that apply to all GrittyFB-styled components going forward.

1. **`gf-text-dim` is AA-Large only on dark surfaces** (~3.5:1 contrast against `gf-bg`, `gf-bg-elev`). Held at prototype value. Constrain usage to label-class typography (≥14pt bold or ≥18pt regular). Do not use for body-weight tertiary text on dark. If Sprint 011 needs body-size dim text on dark, escalate — adjustment must be deliberate.
2. **Token-purity guard at CI.** Every new GrittyFB-styled component should be paired with a Vitest assertion that greps the source for brand hex literals and fails on any match. Pattern: see `tests/unit/styleguide-player-card-reference.test.jsx` test 12.
3. **Reference component lives at `src/components/styleguide/PlayerCardReference.jsx`.** Sprint 011's production Player Card on `/recruits` is a separate component — do not modify the reference. The reference is the styleguide's frozen exemplar; the production card is the live one. Names should distinguish (`PlayerCard.jsx` vs `PlayerCardReference.jsx`).

## Asset Infrastructure

**Skills available for invocation:** `superpowers`, `front-end-design`, `planning`, `testing`, `verification`, `review`. Auto-approved S1 permissions.

## Reference Documentation

| File | Path | Purpose |
|---|---|---|
| Coach Scheduler Execution Plan | `docs/specs/.coach-scheduler-sprints/EXECUTION_PLAN.md` | Strategy artifact, 7-sprint sequence |
| Prototype HTML | `docs/specs/.coach-scheduler-sprints/index.html` | Visual reference; flat path, no `prototype/` subdir |
| Sprint 010 retro | `docs/specs/.coach-scheduler-sprints/sprint-010-retro.md` | Token inventory, deviations log, constraint register |
| Sprint 010 reference component | `src/components/styleguide/PlayerCardReference.jsx` | Visual fidelity exemplar for the production card |
| Token definitions | `src/index.css` (`:root` block, lines ~12–73) | All `gf-*` tokens defined |

## Deliverables

### D0 — Phase 0 Pre-Sprint Data Audit

Before Phase 1 begins, Claude Code performs a read-only Supabase schema audit and reports:

1. **Route convention check.** Inspect `src/App.jsx` and existing route registrations. Is `/recruits` available? Are there existing public-route conventions (e.g., `/public/*`, `/coaches/*`) that should be matched?
2. **Player photo source.** Does the `players` table have a photo URL field? What's the field name? Is the URL absolute, or does it require a Supabase Storage bucket prefix? If photos are missing for some players, what's the expected fallback (initials)?
3. **Active interest data shape.** The prototype card displays "41 schools · Recruiting Progress 32%". Confirm whether both values are queryable from existing schema (likely from `recruiting_journey_steps` or similar). If either is not derivable from current data, flag for descoping — do not add new schema in Sprint 011.
4. **X/Twitter field name.** Confirm exact column name on `players` (e.g., `x_handle`, `twitter_url`, `social_x`). Confirm Hudl URL field name similarly.
5. **PII field whitelist.** Enumerate every field on `players` that will be exposed publicly. Confirm explicitly that `email`, `phone`, `address`, `parent_email`, `parent_phone`, and any equivalent fields are NOT in the whitelist. The public-render component must select only whitelisted fields.
6. **BC High player count and data completeness.** How many BC High players are in the database? How many have populated photos / Hudl / X / stats? If completeness is below ~70%, flag — public page should not launch with mostly empty cards.

**Acceptance:** Phase 0 audit report committed to `docs/specs/.coach-scheduler-sprints/sprint-011-phase-0-audit.md` (or returned in chat — implementer's choice). Report answers all 6 questions. Any flagged scope shifts are surfaced before Phase 1 begins.

---

### D1 — Public Route at `/recruits`

New route in the web app, non-auth, publicly accessible. Renders the roster page.

**Acceptance:**
- Route registered in `src/App.jsx` outside `<ProtectedRoute>` and `<AdminRoute>` guards
- Direct URL access works without auth
- Route does not collide with existing routes
- Route does not surface admin or auth-gated UI

---

### D2 — Top Navigation Bar

GrittyFB logo + wordmark upper-left, linking to `https://www.grittyfb.com`. Nav links bridge externally to grittyfb.com sections (Why GrittyFB, Partnership, Outcomes, Contact). "Recruits" link marks active. "Coach Login" placeholder upper-right.

**Acceptance:**
- Logo asset references `/grittyfb-logo.png` (Sprint 010 path)
- All nav links use `<a href>` with full external URLs
- "Recruits" link has visual active-state indicator using `gf-accent`
- "Coach Login" link is present-but-non-functional. Click behavior: navigates to a `/coach-login-placeholder` route or shows no-op. Implementer chooses; document in retro. (Sprint 016 supplies the real flow.)

---

### D3 — Hero Section

Dark forest background (`gf-bg-deep` or `gf-bg`), Fraunces serif headline, Inter body subhead, partner-schools indicator. No CTA in hero.

**Acceptance:**
- Headline copy: "Elite high school talent. *One roster.* One visit away." (italic span on "One roster.")
- Subhead: short copy about browsing student-athletes from partner schools (final wording at implementer's discretion within ~25 words)
- Partner-schools indicator: e.g., "Currently active: BC High" (data-driven from school toggle's available schools)
- All typography routes through `gf-display` and `gf-body`
- All colors route through `gf-*` tokens
- No CTA, no button, no link in hero

---

### D4 — School Toggle

Pill segment control above the roster grid. BC High active by default. Belmont Hill visible-but-disabled.

**Acceptance:**
- BC High pill is active by default, uses `gf-accent` for active state
- Belmont Hill pill is dim/disabled, uses `gf-text-dim` for label (label-class typography satisfies AA-Large constraint), tooltip or inline copy reads "Coming May 2026" (verify month at promotion time)
- Architecture supports adding a third school without UI redesign — toggle iterates over a config array, not hardcoded buttons
- No data fetched for disabled schools

---

### D5 — Filter Bar

Search input (filter by name), position selector, class year selector, sort selector. All filtering client-side against the loaded roster.

**Acceptance:**
- Search input: case-insensitive substring match on player name
- Position selector: dropdown populated from distinct positions in loaded roster
- Class year selector: dropdown populated from distinct class years
- Sort selector: at minimum [Name A–Z, Name Z–A, Class Year]. Stat-based sorting is descoped unless audit confirms a single canonical "primary stat" field per player
- Filter state lives in component state; URL query params not required this sprint
- All filters operate on the active school's roster (school toggle scopes the dataset)

---

### D6 — Player Card Grid

Responsive card grid (CSS grid, `auto-fill`, min 320px, gap from `gf-space-*` tokens). Each card displays only PII-whitelisted fields per Phase 0 audit. Card visual fidelity matches `PlayerCardReference.jsx`.

**Card contents:**
- Photo or initials fallback (initials generated from name; photo from Phase 0 field name)
- Name (Fraunces, `gf-display`)
- Position · Height · Weight (Inter, `gf-body`)
- School name with lime dot indicator (`gf-accent-deep`)
- Class year tag (top-right pill)
- Active interest summary block — IF Phase 0 audit confirms the data is derivable; otherwise descope this block for Sprint 011 and flag for a later sprint
- Stats grid (GPA, hometown, athletic stat, also-plays — exact fields per Phase 0 whitelist)
- Outbound links row: **Hudl Film** and **X / Twitter** (open in new tab, `target="_blank" rel="noopener noreferrer"`)
- NO "Profile" link, NO CTA, NO contact button

**Acceptance:**
- Card source contains zero hardcoded brand hex literals (token-purity guard test)
- All fields displayed are on the Phase 0 PII whitelist
- Empty fields render gracefully (e.g., "—" for missing stats, omit link if URL absent)
- Initials fallback works when photo URL is null/missing

---

### D7 — Mobile Responsive

Cards stack on narrow viewports (390×844 reference). Filter bar wraps cleanly. Top nav collapses (hamburger or hide-secondary-links — document choice). Hero text sizes down via responsive type scale.

**Acceptance:**
- At 390px viewport: card grid is single column, filters wrap to multiple rows without overflow, top nav is usable, hero copy fits without horizontal scroll
- No fixed widths or pixel-perfect layouts that break at narrow viewports
- Touch targets ≥44px for filter controls and nav links

---

### D8 — Footer

Minimal footer: GrittyFB attribution + link back to `https://www.grittyfb.com`.

**Acceptance:**
- Lives at the bottom of the page, not fixed
- Uses `gf-text-muted` for attribution copy
- One external link, opens in same tab

---

### D9 — No-Regression Verification on BC High Surfaces

Same protocol as Sprint 010's D4. Coach Dashboard, Student View (HOME, MY GRIT FIT, YOUR SHORTLIST), admin panel all render identically before and after this sprint.

**Acceptance:**
- Visual smoke test on all four BC High surfaces, desktop + mobile, shows no perceivable changes
- Bleed audit: grep `src/` for `var(--gf-*)` references — should appear ONLY in `src/components/styleguide/`, `src/pages/StyleguidePage.jsx`, the new Sprint 011 component files, and `src/index.css`
- Existing Vitest assertions all pass (floor preserved per Sprint 010 retro: 625/626, schema.test.js failure remains pre-existing)
- No PII field appears on `/recruits` (manual + audit-based check)

---

## Phased Execution Plan

**Phase 0 — Pre-sprint data audit**
- Per D0 above
- Halt for explicit acceptance before Phase 1

**Phase 1 — Route + nav + hero**
- D1: Register `/recruits` route
- D2: Build top nav with external links
- D3: Build hero section
- Halt for acceptance

**Phase 2 — School toggle + filter bar + card grid**
- D4: School toggle pill control
- D5: Filter bar with search, position, class year, sort
- D6: Player card grid with token-purity-guarded PlayerCard component
- Test data: BC High players from Phase 0 audit
- Halt for acceptance

**Phase 3 — Mobile + footer + regression sweep**
- D7: Mobile responsive pass on all components
- D8: Footer
- D9: Bleed audit, full Vitest run, console error survey
- Branch push + Vercel preview gate (preview env vars must be functional per Pre-Sprint Dependency #2)
- Halt for visual sweep authorization
- On approval: squash merge to master, Vercel auto-deploys to prod
- Verify prod deploy: domain serving Sprint 011 deployment artifact, `/recruits` resolves publicly without auth

**Phase 4 — Retro**
- Spec deviations log
- Constraint register additions (if any)
- Backlog items surfaced
- Process notes

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Active interest data not derivable from existing schema | Medium | Phase 0 D0 audit answers definitively; if not derivable, descope the active-interest block from cards and flag for a later sprint |
| Player PII inadvertently exposed publicly | High | Phase 0 D0 establishes explicit field whitelist; PlayerCard component selects only whitelisted fields; manual D9 verification before deploy |
| Existing route convention conflicts with `/recruits` | Low | Phase 0 D0 answers |
| Token-purity guard test pattern doesn't cleanly extend to a new component | Low | Sprint 010's test pattern is reusable; copy-adapt for `PlayerCard.test.jsx` |
| Preview env scope still missing Supabase vars at sprint open | High → Pre-sprint dep | Pre-Sprint Dependency #2 must be resolved before sprint opens; Phase 0 surfaces if unresolved |
| Card grid performance with full BC High roster | Low | Roster size known after Phase 0; if >200 players, consider virtualization, but otherwise CSS grid handles natively |
| `gf-text-dim` used incorrectly on dark body text | Low | Carry-forward constraint documented; Phase 2 review catches |

## Definition of Done

- All 9 deliverables (D0–D9) ship.
- `/recruits` renders publicly without auth on prod.
- All BC High players visible by default.
- PII whitelist enforced — zero email/phone/address fields on the public page.
- External nav links navigate to grittyfb.com sections.
- Mobile (390×844) + desktop (1440×900) verified.
- Vitest assertion count ≥ Sprint 010 floor + new Sprint 011 assertions, all passing (excluding pre-existing schema.test.js failure).
- Token-purity guard test passes on the new PlayerCard component.
- Bleed audit clean: no `gf-*` references outside Sprint 010/011 component paths, styleguide paths, and `src/index.css`.
- No regressions on BC High surfaces (verified per D9).
- Deploy live on `app.grittyfb.com` and verifiable at `app.grittyfb.com/recruits`.
- Spec deviations logged in retro.

---

## Prompt 0 — Sprint 011 Opening Prompt for Claude Code

> The text below is the literal opening prompt to paste into Claude Code at session start. Do not paraphrase it.

```
We are running Sprint 011 in sprint mode.

Spec file: docs/specs/.coach-scheduler-sprints/sprint-011-session-spec.md
Sprint 010 retro (token inventory, constraints): docs/specs/.coach-scheduler-sprints/sprint-010-retro.md
Token definitions: src/index.css :root block
Reference component: src/components/styleguide/PlayerCardReference.jsx
Visual prototype: docs/specs/.coach-scheduler-sprints/index.html

Read the spec in full before doing anything else. Then confirm back to me:
1. The 9 deliverables (D0 through D9) you've parsed from the spec, including the
   Phase 0 pre-sprint data audit.
2. Confirmation that Sprint 010 is live on prod (merge SHA 0d139ea on master,
   /styleguide route resolves, gf-* tokens present in src/index.css).
3. The two carry-forward constraints from Sprint 010 (gf-text-dim AA-Large
   constraint; token-purity guard pattern) and how they apply to Sprint 011.
4. Status of Pre-Sprint Dependency #2 (Vercel Preview env scope for Supabase
   vars). If not yet confirmed by Chris, flag and pause.
5. Any questions on the spec — flag them now, not mid-sprint.

Once I confirm, invoke the superpowers skill and begin Phase 0: pre-sprint data
audit per D0. Do not start Phase 1 until Phase 0 audit results are reviewed and
explicitly accepted.

Ground rules for this session:
- No auth on /recruits. Public route.
- No PII (email, phone, address) on public cards. Phase 0 establishes the
  whitelist.
- No BC High maroon, gold, Playfair, or DM Sans on /recruits. GrittyFB tokens
  only.
- Token-purity guard test required on the new PlayerCard component.
- External grittyfb.com nav links use full <a href> external navigation, not
  in-app routing.
- No new Supabase tables or schema changes. Reads only.
- No CTA, no scheduler, no Profile link — those are Sprints 012-016.
- Auto-approved permissions are the S1 set. Do not pause to ask permission on
  S1-class actions.
- Anything beyond the 9 deliverables goes to carry-forward.

When you finish each phase, stop and report status before proceeding to the
next. Phase 0 is a hard gate — Phase 1 does not begin until Phase 0 audit is
accepted.
```

---

## Notes for Promotion

When this spec was promoted from `draft` to `not_started`:
1. ✅ Open questions converted to Phase 0 D0 audit tasks (the audit itself answers them)
2. ✅ Carry-forward constraints from Sprint 010 retro embedded
3. ✅ Pre-sprint dependency surfaced (Preview env scope, BL-S010-02)
4. ✅ Reference paths corrected (flat prototype path, retro path)
5. ✅ Definition of Done expanded
6. ✅ Prompt 0 added
7. ✅ Sprint 010 retro confirmed complete — merge SHA 0d139ea live on prod

---
