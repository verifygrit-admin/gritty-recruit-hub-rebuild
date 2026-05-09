---
sprint: 017
artifact: phase-0-audit-plan
status: draft
operator: Chris
drafted: 2026-05-07
parent_spec: docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md
---

# Sprint 017 — Phase 0 Audit Plan

## Scope

This plan enumerates the seven audit areas the Phase 0 recon will execute in
the next exchange. It does not execute any audit, propose any code, or apply
any change. Each area below specifies the exact files, paths, queries, or
search commands the audit will run; the expected output shape; and the
downstream decision the output will drive in Phases 1–4 (D2–D7 in the session
spec). Decisions on record (DOR-1 through DOR-5) are taken as fixed and the
plan does not relitigate them. The four BC High identity values referenced
throughout this plan are: school_name `Boston College High School`, the
`hs_programs.id` UUID `de54b9af-c03c-46b8-a312-b87585a06328`, the
`partner_high_schools.id` UUID `f315d77e-33d6-4450-8aa7-2ad8ac20b711`, and the
slug `bc-high`.

This audit operates inside the four-artifact sprint configuration documented
in `C:\Users\chris\dev\_org\primers\production-optimized-sprints-primer.md`.
The audit's findings translate technical state into product consequences the
operator can act on without engineering-grade evaluation — schema gaps surface
as "what the seed script can or cannot reuse," route-resolution shape surfaces
as "where Belmont Hill slots in," string inventories surface as "the list of
copy and config sites that need an update before launch."

## Pre-audit readiness check

Before Phase 0 fires, the operator and Claude.ai confirm the four artifacts
required by the production-optimized sprints primer Section 5 are present and
current:

1. **Sprint Mode Primer** — `C:\Users\chris\dev\_org\primers\sprint-mode-primer.md` (loaded; v0.2, 2026-05-02).
2. **README / prototype** — Sprint 017's deliverable identity. The session spec at `docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md` carries this; no separate prototype exists because the deliverable is infrastructure (RLS predicate generalization, token-system generalization) plus seed data, not a new visual surface. **The Belmont Hill brand assets** (`src/assets/Belmont Hill Logo and Brand.png`, `Belmont Hill background.jpg`) function as the prototype for the theming deliverable.
3. **Operator's Guide** — Sprint 017 lives at the recruit-hub-rebuild repo root, not inside a dedicated feature folder (per spec Section 12). No standalone Operator's Guide exists. Product-fit framing is carried by the session spec's Sections 2–3 (what this sprint exists to ship, why now). **This is acknowledged as a configuration thinning** — see "Open questions for operator" below.
4. **Execution Plan** — Sprint 017 is not governed by a feature-folder EXECUTION_PLAN per spec Section 12. The session spec itself functions as the plan; mid-sprint reframings get captured as session-spec amendments and rolled into the retro at sprint close.

If any of the four reads as missing, stale, or thinner than the work demands, the operator pauses Phase 0 to thicken the artifact before the audit fires — per primer Section 7 step 1.

---

## Audit Area 1: CSV Column-Shape Verification

**Files:**
- `src/assets/Belmont Hill School Account Seeding - Students.csv` (5 rows)
- `src/assets/Belmont Hill School Account Seeding - Coaches.csv` (1 row)
- `src/assets/Belmont Hill School Account Seeding - Counselor.csv` (1 row)

**Target tables to compare against** (schema reference: `docs/specs/erd/erd-current-state.md` Sections 2b and 2d):
- `profiles` — 31 columns (Section 2d, lines 520–553)
- `public.users` — 11 columns (Section 2d, lines 494–506)
- `hs_coach_schools` — 5 columns
- `hs_coach_students` — 4 columns
- `hs_counselor_schools` — 4 columns
- `hs_counselor_students` — 4 columns

**Method:**
1. `Read` each CSV in full (small files, single read each).
2. Extract header row from each CSV.
3. For each CSV header column, classify as: (a) maps to `profiles` column, (b) maps to `public.users` column, (c) maps to a link table column, (d) is auth metadata (email → `auth.users`, password → seeding-time only), (e) drops with no target.
4. For each target table, list columns with no CSV source — partition into: defaulted by schema (e.g., `created_at` DEFAULT now), set by seeding logic constant (e.g., `account_status='active'`, `email_verified=true`, `user_type` per role), or operator-input required.
5. Compare against BC High's seed precedent — see Audit Area 6 for that pattern; column-shape discrepancies flagged here are the input to that comparison.

**Expected output shape:** Three column-mapping tables (one per CSV) with rows `csv_column → target_table.column | UNMAPPED (reason) | DROP (reason)`, plus a fourth table of `target_table.column ← REQUIRED FROM { default | seed-constant | operator }`.

**Drives decision:**
- D4 seed-script field assignments (which CSV columns get plumbed into which INSERTs).
- Whether the seed script can be a verbatim shape-match to the BC High pattern (Audit Area 6) or whether shape drift forces a divergence and a column-mapping shim.
- Operator surfaces: any CSV column with no target — drop confirmed or schema gap escalated.
- **Escalation path if drift is material** (e.g., a CSV column expected by BC High pattern is missing, or a target column has no source and no default and no obvious seed constant): flag as Phase 0 blocker; surface to operator before Phase 2 starts; if resolution requires schema work, declare scope-expansion at Phase 0 close per spec Section 7 multi-session rule.

---

## Audit Area 2: Design-Token System Inventory

**Files (to be discovered, not assumed):**
- Tailwind config: `tailwind.config.{js,ts,cjs,mjs}` at repo root.
- Global CSS: `src/styles/**`, `src/app/globals.css`, `app/globals.css`, `src/index.css` — whichever exists.
- Theme provider / context: search for `ThemeProvider`, `theme.ts`, `tokens.ts`, `colors.ts` under `src/`.
- `_org/DESIGN_SYSTEM.md` (already referenced in `_org/` listing) — read for canonical token names.

**Method:**
1. `Read` `_org/DESIGN_SYSTEM.md` for canonical token vocabulary and any school-conditional precedent.
2. `Glob` for `tailwind.config.*` and `Read` whichever match resolves.
3. `Grep` for hex-pattern literals matching BC High maroon and gold across `src/**`. Use a permissive hex regex (`#[0-9A-Fa-f]{3,8}\b`) plus targeted maroon/gold searches: `Grep` for `maroon`, `gold`, `#80000`, `#7F0000`, `#FFD700`, `#FFC72C` across `src/**` and `tailwind.config.*`.
4. `Grep` for token consumption sites: `--color-primary`, `--brand-`, `bg-primary`, `text-primary`, `theme.colors`, and any token-name patterns surfaced from step 2.
5. Read `src/assets/Belmont Hill Logo and Brand.png` (multimodal read) to capture proposed Belmont Hill hex values for D5 operator approval.

**Expected output shape:**
- Token-system summary: file path(s) holding tokens, naming convention (CSS variable / Tailwind config / JS const), authoritative location.
- Current BC High values (verbatim hex codes for maroon, gold, white, plus any background-asset reference).
- Token consumption inventory: where the tokens are read (component imports, className refs, theme provider plumbing) — file:line list.
- Proposed Belmont Hill hex values from the brand PNG (Deep Blue, Scarlet, White) for operator approval at Phase 3 entry.
- A "seam map": where a school-conditional pattern would slot in (which file holds the active-token resolution today, what pivot point would make it data-driven). **No implementation proposed** — only seam identification.

**Drives decision:**
- D5 implementation shape (whether the conditional resolution lives in the theme provider, the Tailwind config layer, or a runtime CSS-variable swap).
- Operator approval gate on Belmont Hill hex values before D5 starts.
- Whether D5 is a 1-exchange or 2-exchange task (operator can call multi-session at Phase 0 close per spec Section 7 if entanglement is heavier than expected).

---

## Audit Area 3: Hardcoded BC High String Inventory

**Method — exact commands the audit will run:**

```
# Literal name strings — case variants
Grep pattern: "Boston College High School"   glob: !node_modules/!.next/!dist/!build/
Grep pattern: "BC High"                       glob: !node_modules/!.next/!dist/!build/
Grep pattern: "(?i)\bbc[-_ ]?high\b"          glob: !node_modules/!.next/!dist/!build/

# UUIDs
Grep pattern: "de54b9af-c03c-46b8-a312-b87585a06328"
Grep pattern: "f315d77e-33d6-4450-8aa7-2ad8ac20b711"

# Slug
Grep pattern: "['\"`]bc-high['\"`]"
```

**File-type scope:** `sql`, `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs`, `md`, `json`, `css`, `env`, `env.local`, `env.example`. Run each Grep with `output_mode: content` and `-n: true` to capture file:line:context.

**Excluded directories:** `node_modules`, `.next`, `dist`, `build`, `.git`, `coverage`, `.turbo`. Use `--glob '!path/**'` exclusions on each Grep.

**Expected output shape:** A categorized table with columns `category | file:line | matched_string | sprint-ownership-note`, partitioned into:
1. **Migration files** (`supabase/migrations/**`) — frozen artifacts; cannot be retroactively edited; new generalization migration replaces behavior, not file content.
2. **Front-end copy** (banner text, page titles, marketing strings).
3. **Slug / route-resolution logic** (route files, middleware, Next.js dynamic-segment handlers).
4. **Config / data files** (`src/data/recruits-schools.js` and similar seed configs).
5. **Test fixtures and seed scripts** (`scripts/`, `__tests__/`, `e2e/`, `playwright/` if present).
6. **Documentation** (`docs/`, `README.md`, `_org/`) — informational hits, not behavioral.

**Drives decision:**
- D2 migration scope (which RLS policies need replacement vs. which are already data-driven).
- D6 banner-text dynamism scope (every front-end string hit becomes a replacement target).
- Audit Area 5 cross-reference (any slug-resolution hit feeds Area 5 directly).
- Surfaces any migration files beyond `0038` that hardcode BC High and would need a parallel D2-style fix.

---

## Audit Area 4: Admin-Login Dashboard Query Verification

**Method:**
1. Locate the admin-login route: `Glob` for `**/admin-login/**` and `**/admin/**` under `src/app/`, `src/pages/`, or whatever Next.js routing convention is in use.
2. `Read` the route handler / page component fully.
3. Identify the user-list query: search for `from('users')`, `from('auth.users')`, `.rpc(`, or any Supabase client call inside the admin-login surface.
4. If the query is a Supabase RPC or Edge Function, locate the function definition (`supabase/functions/**` or DB function via Grep on `CREATE FUNCTION` or `CREATE OR REPLACE FUNCTION` in `supabase/migrations/**`).
5. Inspect the WHERE clauses (or absence thereof) for any school-identity filter — `high_school =`, `hs_program_id =`, `partner_high_schools` joins.
6. Cross-reference against admin RLS posture in `0034_schools_admin_update_policy.sql` and `0035_admin_audit_log.sql` (admin role lives on JWT `app_metadata.role`).

**Expected output shape:**
- Route path, component path, query call site (file:line).
- Query shape (RPC name + body, or inline client query SQL/select call).
- Filter assertion: one of (a) school-agnostic, no filter; (b) admin RLS bypass with no app-layer filter; (c) filters by school identity (specify which column).

**Drives decision:**
- One of two crisp outputs: **"school-agnostic, no change needed for D7 verification step 5"** OR **"filters by school, requires generalization — scope expansion of +N exchanges, classify under D2.5 or extend D2"**.
- If (c) lands, this is the critical scope-expansion trigger from spec Section 9 risk register; Phase 0 close must surface it before Phase 1 starts.

---

## Audit Area 5: /recruits/<slug>/ Proxy School-Resolution Logic — All Platform Layers

**Standing rule applied here:** Per Sprint 011's Pattern 5 (Phase 0 audit gaps surfacing late as Phase 3 blockers — the `/recruits` URL collision with the legacy `api/recruits-auth.ts` proxy that forced the `/recruits → /athletes` pivot), this audit area checks **every platform layer that can claim a route**, not just the framework router. Missing a layer here is the most expensive failure mode this sprint can produce.

**Layers that must be checked:**

1. **Next.js / framework routes** — `Glob` for `**/recruits/**` under `src/app/`, `src/pages/`, and the project root; look for dynamic-segment files (`[slug]`, `[school]`, `[...slug]`). `Read` page components and layouts.
2. **Middleware** — `src/middleware.{ts,js}` and `middleware.{ts,js}` at repo root. `Read` if present; identify any path-rewrite or auth-gate logic that touches `/recruits/*` or `/athletes/*`.
3. **`vercel.json`** — `Read` if present at repo root. Inspect `rewrites`, `redirects`, `headers`, and any path-pattern entry that matches `/recruits` or `/athletes` or BC-High-specific slugs. Also check `vercel.ts` if present (per the platform's current recommended config form).
4. **`public/`** — `Glob` for `public/recruits/**` and `public/athletes/**`. Static assets at these paths can shadow dynamic routes silently.
5. **`api/`** — `Glob` for `api/**` at repo root and `src/api/**`. The Sprint 011 collision lived at `api/recruits-auth.ts`. Specifically grep this directory for any reference to `recruits`, `bc-high`, or password-gated proxy logic.
6. **Edge functions / Supabase functions** — `Glob` for `supabase/functions/**`. Inspect any function that resolves school context from a slug or hostname.
7. **Build-time / SSG manifest** — if Next.js static export or any prerender list is in play, check whether school slugs are baked in at build (a Belmont Hill slot may need a manifest entry).

**Method:**
1. Sweep all seven layers above, file by file.
2. `Grep pattern: "recruits-schools"` (the data file referenced in migration 0038's header comment) to locate `src/data/recruits-schools.js` and read it.
3. Trace the full slug → school resolution path end-to-end: which layer claims the path first, what it does, what it hands off to.
4. Identify any anon Supabase client query that resolves school context for the public `/recruits` roster page (this is what migration 0038 grants SELECT on; the predicate generalization in D2 must align with whatever this resolution does).
5. Identify the slot for Belmont Hill: confirm whether adding Belmont Hill to `recruits-schools.js` (or equivalent config) plus the D2 generalization is sufficient, or whether code changes are needed in the resolution layer or any of the other six layers.

**Expected output shape:**
- A layer-by-layer inventory: for each of the seven layers, "no match" or specific file:line + claim-shape.
- Resolution mechanism: one of (a) data-driven config lookup (`recruits-schools.js` or DB join), (b) hardcoded string match on `'bc-high'`, (c) hybrid (config + hardcoded fallback), (d) layered (multiple layers contribute).
- Clear statement of where Belmont Hill needs to slot in: a config-row addition only, OR a code change — and if a code change, named per layer and scoped under D2 / D3 / new D2.5.
- Explicit "no collision" assertion for `/recruits/belmont-hill` and any plausible variant slug across all seven layers.

**Drives decision:**
- D2 predicate shape (Option A vs. Option B from spec Section 5 D2) — if resolution is data-driven, Option A is straightforward; if hardcoded, may need a hybrid.
- Whether D6 banner-text dynamism is a single-source change or multi-site change.
- Whether a new D2.5 deliverable needs insertion between D2 and D3.
- **Sprint 011-style late-Phase-3 surprises:** explicitly prevented by this audit area's seven-layer sweep. If a collision surfaces here at Phase 0, it's absorbed into the spec via amendment + retro carry-forward (Pattern 3 response per primer Section 10) rather than discovered at Phase 3 push.

---

## Audit Area 6: Existing Seed-Script Pattern from BC High Onboarding

**Method:**
1. `Glob` for `scripts/**/*.{js,ts,sh,sql,py}` and inspect names — likely candidates: `seed-bc-high.*`, `seed-users.*`, `bc-high-onboarding.*`.
2. `Glob` for `supabase/migrations/**` files referencing BC High user data INSERTs (carried as a hit list from Audit Area 3 — the UUID and string searches will surface any seed-in-migration paths).
3. `Grep` patterns to locate the BC High seeding code regardless of location:
   - `Grep pattern: "pzukauskas@bchigh.edu"` (the BC High head coach email, per ERD line 176)
   - `Grep pattern: "supabase.auth.admin.createUser"`
   - `Grep pattern: "auth.users"` with file-type scope `sql,ts,js`
   - `Grep pattern: "is_head_coach"` (head-coach link pattern)
4. `Read` whatever seed file(s) surface and document:
   - **auth.users INSERT mechanism:** direct SQL INSERT with manual password hash, `supabase.auth.admin.createUser` (Admin API), or RPC.
   - **public.users + profiles linkage:** ordered INSERT pattern, FK reference passing (does it use the auth user ID returned by createUser, or a SELECT roundtrip?).
   - **Idempotency mechanism:** UPSERT, pre-flight `SELECT ... WHERE email = ?`, `ON CONFLICT DO NOTHING`, or none.
   - **Link-table seeding:** `hs_coach_schools` INSERT with `is_head_coach=true`, `hs_coach_students` rows, `hs_counselor_schools` row, `hs_counselor_students` rows.
   - **Password handling:** see Audit Area 7.
5. If no centralized BC High seed script exists, document that explicitly — surface as Phase 0 finding that BC High was seeded ad-hoc and Belmont Hill needs a clean pattern established this sprint.

**Expected output shape:**
- File path of BC High seed (or "no centralized seed script — BC High was seeded ad-hoc via [trace evidence]").
- Pattern catalog: auth INSERT mechanism, ordering, idempotency, link-table approach.
- Verbatim-match assessment: can Belmont Hill seed mirror the BC High pattern as-is? If divergence is required, what and why.

**Drives decision:**
- D4 implementation shape: script vs. migration. (Spec Section 5 D4 leaves this Phase-0-determined.)
- D4 idempotency contract.
- Whether a new generalized seed pattern needs to be authored this sprint (raising Phase 2 from 3–4 to 4–5 exchanges) or whether Belmont Hill seeds via a ~50-line shape-match.

**Cost flag:** This is the audit area with the highest variance. If BC High has no centralized seed and the pattern must be reverse-engineered from migration history and live data, Audit Area 6 alone could consume a full exchange. Flagged in the cost estimate below.

---

## Audit Area 7: Initial-Password Communication Pattern from BC High Onboarding

**Method:**
1. Carry forward from Audit Area 6: locate the BC High seed mechanism, then specifically inspect the password-handling logic.
2. `Grep` patterns:
   - `Grep pattern: "generateRandomPassword|crypto.randomBytes|nanoid|uuid.*password"` across `scripts/**` and `supabase/**`
   - `Grep pattern: "magic_link|inviteUserByEmail|generateLink"` (Supabase Admin API magic-link / invite path)
   - `Grep pattern: "welcome.*email|sendWelcome"` (welcome-flow trigger)
   - `Grep pattern: "initial_password|temp_password|default_password"` (fixed-pattern indicator)
3. Check `_org/SESSION_LOG_*.md` files dated around BC High onboarding for documented operator decision (the `_org/` listing shows logs from 2026-03-24 through 2026-03-29, plus a Sprint 011 retro at 2026-04-30 from migration 0038 header — search those).
4. `Grep pattern: "password"` scoped to commit messages: `git log --all --grep="password"` and `git log --all --grep="seed"` — captured via Bash, output trimmed to subject lines.
5. Check the docs surface: `_org/SPEC_*` and `docs/specs/sprint-01*-retro.md` for any documented decision.

**Expected output shape:**
- BC High pattern: one of (a) fixed pattern (e.g., a known string + email-derived suffix), (b) random per-user logged to a one-time CSV, (c) `inviteUserByEmail` magic-link, (d) welcome-email trigger flow, (e) **undocumented / ad-hoc**.
- Where the decision is recorded (commit, retro, README, session log) — exact file:line or commit hash; if undocumented, state so explicitly.
- Suitability assessment for Belmont Hill: does the BC High pattern hold up, or is there an operational reason (e.g., school admin handling vs. direct-to-student) to diverge?

**Drives decision:**
- Spec Section 11 operator decision input. The audit surfaces the recommendation in one of two forms:
  - "BC High pattern was X; Belmont Hill matches X. No new design work."
  - "BC High pattern was X but X has limitation Y; recommend Z for Belmont Hill, with rationale."
- D4 password-handling code path.
- Whether a separate out-of-band artifact (one-time CSV for operator) needs to be produced as a D4 sub-deliverable.

---

## Estimated audit execution cost

**Total exchanges:** 1 to 2 (out of the 2–3 Phase 0 budget per spec Section 7, inside the 20-exchange session ceiling per production primer Section 7.1).

| Area | Estimated cost | Notes |
|---|---|---|
| 1. CSV column-shape | low | Three small file reads + tabular comparison. |
| 2. Design-token inventory | medium | Multiple files, multimodal logo read, seam-mapping. |
| 3. Hardcoded BC High strings | low | Mechanical grep sweeps; output volume could be moderate but cost is bounded. |
| 4. Admin-login query | low | Single route trace. |
| 5. /recruits/<slug>/ resolution | medium | Seven-layer sweep (framework routes, middleware, `vercel.json`, `public/`, `api/`, edge functions, build-time manifest) per Sprint 011 Pattern 5. Up-cost from prior estimate is intentional — the additional layers are the difference between catching a collision at Phase 0 versus at Phase 3 push. |
| 6. BC High seed pattern | **medium–high** | Highest variance. If BC High was seeded ad-hoc, reverse-engineering the pattern could spike cost. **Flagged.** |
| 7. Password pattern | low | Grep + log search; usually resolves quickly once Area 6 surfaces the seed location. |

**Token order-of-magnitude:** ~40–70k tokens for a single-exchange audit; ~90–130k if Area 5 or Area 6 spikes. If either area trips the budget, the audit splits at that area and the audit report is delivered in two beats.

**Phase 0 close — multi-session declaration triggers:** Per production primer Section 7.1, the 20-exchange ceiling forces this trade-off to be declared early, not at exchange 18. Multi-session is declared at Phase 0 close if any of the following:
- Area 4 returns a school-filtered admin-login query (forces +1 exchange under D2 or new D2.5).
- Area 5 returns a multi-layer collision risk (forces an absorbed spec amendment per Pattern 3 of production primer Section 10, +1–2 exchanges).
- Area 6 returns no documented BC High seed pattern (forces clean-slate seed-pattern authorship under D4, +1–2 exchanges).
- Area 2 returns design-token entanglement deeper than a single seam (forces D5 split into two phases, +1 exchange).

**Configuration Health Score (CHS) awareness:** The audit's findings feed forward into the sprint's CHS at retro close. Areas 4, 5, and 6 are the highest-leverage signal sources — a clean Phase 0 here is what allows S_speed to clear 0.85 and S_spec to clear 0.85 at sprint close.

---

## Open questions for operator

- **Operator's Guide thinning, acknowledged.** Sprint 017 lives at the recruit-hub-rebuild repo root (per spec Section 12), not inside a `docs/specs/.belmont-hill-onboarding-sprints/` feature folder. There is no standalone Operator's Guide — the session spec's Sections 2–3 carry product-fit framing. Confirm this is the intended configuration for this sprint, or pause Phase 0 to spin up a feature folder + minimal Operator's Guide before the audit fires. The cost of pausing is small; the cost of discovery thrash mid-sprint without a fit-check artifact (production primer Pattern 2) is larger.
- **Confirm the audit may read multimodal assets** (`Belmont Hill Logo and Brand.png` for hex extraction in Area 2). If hex values must come from operator inspection rather than image read, Area 2's "proposed hex values" output will be deferred to operator input at Phase 3 entry.
- **Confirm the audit may invoke `git log --grep`** (Area 7). It's a read-only Bash call but listed for transparency since the plan is otherwise file/grep-only.
- **Confirm the seven-layer sweep in Area 5 is in scope.** It expands Area 5 from the prior framework-router-only check to all platform layers per Sprint 011 Pattern 5. The cost increase is +1 exchange in the worst case; the value is preventing a Phase 3 push collision. Default recommendation: include the full sweep.
