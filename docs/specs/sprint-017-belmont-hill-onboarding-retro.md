---
sprint: 017
artifact: retro
status: MULTI-SESSION — SPRINT 017 SESSIONS 1+2 CLOSED, OVERLAY REGRESSION DEFERRED TO SPRINT 018
session_1_dates: 2026-05-07
session_2_dates: 2026-05-07
session_2_close_commit: fb53b3c
session_3_status: not declared; remaining work absorbed into Sprint 018 carry-forwards rather than a Session 3 sprint extension
parent_spec: docs/specs/sprint-017-belmont-hill-onboarding-session-spec.md
session_2_entry_brief: docs/specs/sprint-017-session-2-entry-brief.md
operator: Chris
---

# Sprint 017 — Belmont Hill Onboarding — Retro

## 1. Sprint summary (Session 1 state)

Belmont Hill is fully seeded into the database — partner-school identity rows
present in both `hs_programs` and `partner_high_schools`, the anon SELECT
predicate generalized so future onboarding is a data action, and 5 accounts
seeded (3 students + 1 head coach + 1 counselor) with correct school-link and
junction-students rows. The public `/athletes` roster is configured to surface
Belmont Hill via `recruits-schools.js` activation. BC High visibility is
regression-clean (26 → 26 anon-visible profiles).

Belmont Hill is **not yet themed** (D5 + D6 — design-token generalization and
banner dynamism — Phase 3) and has **not been verified end-to-end** against a
signed-in user (Phase 4). Two front-end hardcodes (`ProfilePage.jsx` static
BC High coach + counselor; `NextStepsDashboard.jsx` BC High S&C tip) are
absorbed into Phase 3 scope per Phase 0 audit's cross-area synthesis.

Sprint 017 declared multi-session at Phase 2 close. Session 2 ships Phase 3 +
Phase 4 against the entry brief.

## 2. What shipped clean (Session 1)

### Phase 0 — Audit (ahead of plan)
- Seven-area structured audit of CSV shapes, design-token system, hardcoded
  BC High strings, admin-login query, `/recruits/<slug>/` proxy resolution,
  BC High seed pattern, and password pattern.
- Surfaced two scope absorptions for Phase 3: `ProfilePage.jsx` static
  BC High coach/counselor data and `NextStepsDashboard.jsx` BC-High-specific
  S&C tip text. Operator approved absorption.
- Surfaced DOR-amendment: spec said 5 students; CSV has 3.
- Cost: ~1.0 exchange of 2-3 budget. Under plan.

### Phase 1 — Migrations 0043 + 0044 + recruits-schools.js (ahead of plan)
- `0043_generalize_partner_school_select_predicate.sql` — replaces hardcoded
  `'Boston College High School'` predicate with join against `hs_programs`.
- `0044_seed_belmont_hill_school_identity.sql` — seeds Belmont Hill rows in
  both `hs_programs` and `partner_high_schools`.
- `src/data/recruits-schools.js` — Belmont Hill row activated for `/athletes`.
- BC High visibility regression-clean: 26 pre, 26 post.
- Commit `33bf480` on origin/master.
- Cost: ~0.8 exchange of 3-4 budget. Under plan.

### Phase 2 — Belmont Hill account seeding (at budget cap, on plan)
- Parameterized `scripts/seed_users.js` and `scripts/bulk_import_students.js`
  with `SCHOOL_CONFIGS` pattern, `--school` CLI flag, header normalization,
  and skip-flags for the deferred-coach-link path.
- Seeded 3 students + 1 head coach (Frank Roche) + 1 counselor (June Schmunk).
- All 9 verification queries CLEAR (Q1 BC High regression check + Q4-Q11
  Belmont state checks + Q11 Belmont coords propagation).
- Idempotency validated: command 2 ran cleanly with `--coach-uuid` flag,
  re-using prior-created Frank without duplicate-creation attempts.
- Commits: `5c8a390` (seed_users.js — Path G close) and `09780fd`
  (bulk_import_students.js — orphan parameterization commit, Session 1 close).
- Cost: ~4.0 exchange of 3-4 budget. At cap, on plan despite the platform fault.

## 3. What we ran into (Session 1)

### The GoTrue admin API platform fault (Phase 2)

Mid-Phase-2, the seed scripts hit a Supabase platform-level breakage that
turned a routine email-to-UUID resolution into a recursive debugging cycle.
Every admin-API surface that wraps the broken handler returned HTTP 500
"unexpected_failure":

- `/auth/v1/admin/users?email=` REST filter
- `supabase.auth.admin.listUsers()` (paginated and unfiltered)

Direct SQL queries against `auth.users` returned the rows cleanly (data is
healthy and findable via Postgres). The fault is in GoTrue's admin handler,
not the data layer. Filed as **ERD F-23**.

The hypothesis-investigation pause that the operator triggered after the
fourth failed resolution path (PIDs / dual-ID / agent-memory pattern search)
was the highest-leverage move of Session 1 — it ruled out two structural
hypotheses with negative evidence and confirmed the problem was novel. That
saved an unknown number of failed-patch exchanges.

### The DOR-amendment (Phase 0)

Spec Section 4 named 5 students. The CSV has 3 (Ricky Copeland, Ky-Mani
Monteiro, Ajani Kromah). Operator amended in-session: 3 students binding for
the rest of the sprint. Acceptance criteria D7 step 1 + step 2 (head coach
sees N students, counselor sees N students) read as 3 not 5. Belmont Hill
Counselor.csv's per-student boolean columns (`is_counselor_copeland`,
`is_counselor_monteiro`, `is_counselor_kromah`) confirm the 3-student shape
is internally consistent.

## 4. The five resolution paths

| Path | What | Outcome |
|---|---|---|
| A | Replace GoTrue REST resolver with `public.profiles` JS-client SELECT | **Partial.** Worked for student lookups (students have profile rows). Failed for coach/counselor (no profiles row). |
| D | Paginated `supabase.auth.admin.listUsers()` | **Failed.** Same HTTP 500 unexpected_failure as the REST email-filter — both endpoints route through the broken handler. |
| E | `supabase.schema('auth').from('users').select(...)` PostgREST direct | **Unavailable.** PostgREST exposes only `public` and `graphql_public`; `auth` schema not exposed. PGRST106. |
| F (rejected) | Hardcode UUIDs in script for one-shot use | Operator rejected as too brittle / not reusable for school N+1. |
| G | **`--coach-uuid` / `--counselor-uuid` CLI args + capture-from-createUser-response for fresh users** | **SHIPPED.** Bypasses the broken admin lookup entirely. Operator passes Frank's known UUID via flag; June's UUID captured directly from `createUser` response. Generic enough to support any future school onboarding where existing auth users need linking. |

Filed as ERD F-23 with full evidence chain.

## 5. Process observations (Session 1)

1. **The 20-exchange ceiling held against unexpected failure cascading.**
   Five failed paths, three Phase 2 BLOCKERs, plus a hypothesis-investigation
   detour, still closed Phase 2 clean at ~4.0 cumulative. The four-artifact
   configuration absorbed the platform shock without scope creep or
   improvisation outside operator authorization.

2. **The hypothesis-investigation pattern was the highest-leverage move of
   the sprint.** Operator paused after Path D failed and named three competing
   hypotheses (PID precedent, dual-ID oscillation, agent-memory pattern).
   Read-only investigation ruled out PID and dual-ID definitively before any
   more code work was authorized. This pattern belongs in the operating
   contract for any future debugging cycle that has produced 3+ failed
   resolution attempts.

3. **Diagnostic-before-patch (Phase 2 Exchange 12) saved a wasted Path D
   exchange.** Direct `auth.users` state inspection produced authoritative
   pinned UUIDs that survived the rest of the sprint, regardless of which
   resolver path eventually shipped. Should be the default move when an
   admin-API resolution path is suspect.

4. **Phase 0 audit's seven-area completeness held up.** No late-Phase-3-style
   surprises landed in Phase 1 or Phase 2. The Phase 2 platform fault was
   external — nothing the audit could have caught.

5. **Multi-session declared at Phase 2 close, not pushed.** When
   remaining-exchange math doesn't cover remaining-phase budget, declare
   early. Pushing through would have produced a degraded Phase 3.

## 6. Configuration Health Score (Session 1 actuals)

| Sub-score | State | Notes |
|---|---|---|
| **S_speed** | Moderate | Phase 0 + Phase 1 ahead of plan; Phase 2 at budget cap due to platform fault. Not a script or design failure — an external shock absorbed cleanly. |
| **S_spec** | Clean | Spec held; only adjustments were DOR-amendment for student count (5 → 3) and Phase 3 absorption of two strings. Both surfaced and absorbed at correct decision points. |
| **S_artifact_health** | Clean | 2 migration files + 3 script edits + 4 doc files committed and pushed by Session 1 close. All artifacts referenceable; no orphans. |
| **S_carry_forward** | Manageable | 8 items: 4 pre-known carry-forward + 3 newly surfaced (platform fault, hygiene migration, bulk-import resolver alignment) + 1 Session 2 entry. |

Composite read: **clean Session 1 close given the external platform shock.**
The configuration absorbed an unexpected fault without compromising spec
fidelity or shipping degraded artifacts. Multi-session declaration is the
right adjustment, not a failure.

## 7. Session 1 carry-forward register (8 items, historical at Session 1 close)

| # | Category | Description | Owner / Sprint |
|---|---|---|---|
| C-1 | Architecture (existing) | F-21 — `partner_high_schools` ↔ `hs_programs` rename refactor. Belmont Hill seeded into both per DOR-2. Refactor candidate next sprint. | Sprint 018 candidate |
| C-2 | Data | Belmont Hill shortlist seeding (deferred per DOR-4). | Follow-on sprint |
| C-3 | QA | Mobile QA of Belmont Hill theme (deferred per DOR-5). | Mobile-QA sprint |
| C-4 | Architecture (existing) | F-06 PII column-level RLS — ongoing concern from Sprint 011. | Open |
| C-5 | **Platform health** | **F-23 — GoTrue admin API HTTP 500 across `?email=` filter and `listUsers`. Project-level fault. Escalate to Supabase support; route to Dexter for monitoring rotation.** | **External + Dexter** |
| C-6 | **Hygiene migration** | **Migration 0045 candidate — `public.get_user_id_by_email(email text) RETURNS uuid` SECURITY DEFINER function. Pattern matches migration 0027's cross-table SECURITY DEFINER helpers. Routes around F-23 for any future seed-script email lookup.** | **Sprint 018** |
| C-7 | **Resolver alignment** | **`bulk_import_students.js` still uses the broken GoTrue REST helper for one fallback path. Align to the Sprint 018 SECURITY DEFINER helper once C-6 lands.** | **Sprint 018** |
| C-8 | **Session 2 entry** | **Phase 3 + Phase 4 to ship.** Reference `docs/specs/sprint-017-session-2-entry-brief.md`. | **Sprint 017 Session 2 (RESOLVED at sprint close — see Section 13)** |

---

## 8. Session 2 ship state

Belmont Hill is fully themed end-to-end against the design-token system, with
the single exception of the cream/scarlet overlay surface deliberately deferred
to Sprint 018 as C-13. Phase 3 shipped D5 + D6 + the two absorbed scope items
(ProfilePage + NextStepsDashboard generalization). Phase 4 D7 verification
returned 7/8 PASS; Step 6 closed DEGRADED on the overlay regression introduced
by HF-B itself.

Commit chain on origin/master at session close:

| Hash | Title |
|---|---|
| `33bf480` | Phase 1 — generalize predicate + seed Belmont Hill identity (Session 1) |
| `5c8a390` | Phase 2 — seed Belmont Hill accounts (Session 1) |
| `09780fd` | Phase 2 — parameterize bulk_import_students.js (Session 1) |
| `2318998` | Session 1 retro + Session 2 entry brief + F-23 evidence (Session 1) |
| `e58db58` | Phase 3 — Belmont Hill theming + dynamic staff lookup (Session 2) |
| `b720256` | HF-A — token-system completeness for Layout.jsx three surfaces (Session 2) |
| `99a8a65` | HF-B — JS-import pattern for school backgrounds (Session 2) |
| `fb53b3c` | HF-Bf — track Belmont Hill background asset in git (Session 2) |

Final source-of-truth state at fb53b3c:
- All five Belmont Hill accounts authenticate; theme + masthead correct.
- Belmont Hill head coach + counselor dashboards return 3 Belmont Hill
  students with no BC High bleed.
- Belmont Hill student GRIT FIT renders NextStepsDashboard with the
  Markham S&C tip variant (when weight is the weakest metric).
- BC High control flow regression-clean.
- Overlay surface (cream for BC High, scarlet wash for Belmont Hill) is
  unrendered — known regression introduced by HF-B's CSS-rule removal.
  Filed as C-13.

## 9. What shipped clean (Session 2)

### Phase 3 — Belmont Hill theming + dynamic staff lookup (1 commit, 7 files)

Six sub-phases (3a → 3f) shipped in one commit `e58db58`:

- **3a — `useSchoolIdentity` hook** (NEW, `src/hooks/useSchoolIdentity.js`).
  Single source of truth for school identity. Resolves student / hs_coach /
  hs_guidance_counselor / anon paths via 2-step queries against the existing
  junction tables. Returns `{ schoolName, schoolSlug, schoolFullName, loading }`.
  Eliminated the prior `'BC HIGH'` hardcoded fallback in Layout.jsx.
- **3a — Layout.jsx refactor.** Consume hook; body-class side-effect drives
  CSS swap; teamPhoto static import dropped; student-profile fetch effect
  narrowed to name + avatar + hudl_url only.
- **3b — index.css token override + background-image rules.** `body.school-belmont-hill`
  block with three brand-color overrides; three school-conditional
  background-image rules with anon-fallback. (HF-B later removed the
  background-image rules; HF-Bf restored the asset; the brand-color override
  block stays.)
- **3c — `schoolShortName.js` Belmont Hill entry.** One-line append to the
  existing map.
- **3d — ProfilePage.jsx absorbed scope** (NEW `src/data/school-staff.js`).
  Static `BC_HIGH_COACH` + `BC_HIGH_COUNSELORS` literals replaced with
  `SCHOOL_STAFF[schoolSlug]` lookups. Coach/counselor confirm sections
  gracefully degrade for unconfigured schools. The c9960d1 architectural
  finding (Section 10) drove the Option A SCHOOL_STAFF config approach over
  the recon's originally-proposed dynamic-fetch pattern.
- **3e — NextStepsDashboard.jsx absorbed scope.** `isBCHigh` boolean prop
  replaced with `schoolSlug`; `SCHOOL_SC_OVERRIDES` module-scope const drives
  the school-conditional S&C tip variant. Belmont Hill keeps the
  stronglifts.com clause + adds Markham append; BC High strips clause + adds
  Kiely/McClune append (per operator decision D3).
- **3f — commit + push.** PROTO-GLOBAL-004 push gate satisfied. Build
  verified green; both school background images bundled with hashed
  filenames.

### Phase 4 — End-to-end verification (operator-driven)

D7 Steps 1-5 PASS at first pass. Step 6 surfaced the HF-A/HF-B/HF-Bf chain.
Steps 7-8 PASS.

### HF-A — token-system completeness for Layout.jsx (1 commit, 2 files)

Phase 4 Step 6 surfaced three Layout.jsx hardcoded hex literals that bypassed
the `var(--brand-*)` token system: banner `#8B3A3A`, nav indicator `#D4AF37`,
cream overlay `rgba(245, 239, 224, 0.9)`. HF-A migrated all three to `var()`
references and added a fourth brand token `--brand-overlay-rgba` so the
overlay tint swap is school-conditional. Commit `b720256`. Operator
re-verified Step 6 — banner, nav, overlay tint all PASS.

### HF-Bf — track Belmont Hill background asset in git (1 commit, 1 file)

Vercel build of HF-B (`99a8a65`) failed: Rollup could not resolve the
`Belmont Hill background.jpg` asset import because the file existed on the
operator's local filesystem but was not tracked in git. HF-Bf added the
asset (10 MB binary, no LFS required at this size) so HF-B's source changes
could resolve in the Vercel build environment. Commit `fb53b3c`. Production
deploy lands with the asset present and the JS-import path resolves to a
Vite-hashed URL.

### What did NOT ship clean (acknowledged, deferred)

HF-B (`99a8a65`) source changes are correct in their JS-import architecture
but inadvertently removed the overlay tint along with the background-image
CSS rules. Filed as C-13 — see Section 11.

## 10. What we ran into (Session 2)

### The c9960d1 architectural finding (Phase 3d plan-first)

The original recon proposed restoring the pre-c9960d1 dynamic-fetch pattern
for ProfilePage.jsx's coach/counselor data. Plan-first investigation
surfaced the structural reason c9960d1 went static in Sprint 011:

1. **Coaches and counselors do not have `public.profiles` rows.** The seed
   scripts populate `auth.users` + `public.users` + role-link rows but not
   `profiles`. Names and emails for staff exist only in
   `auth.users.raw_user_meta_data` (set during `auth.admin.createUser` from
   CSV data), not reachable from the JS client without a SECURITY DEFINER
   helper.
2. **`public.users` carries no name columns.** Migration 0002 defines
   `user_type`, `account_status`, `email_verified`, etc. — but no
   `first_name`, `last_name`, or `name`.
3. **Even if profiles rows existed, RLS blocks student→staff reads.**
   Migration 0012 grants `profiles_select_own` (student reads own),
   `profiles_select_coach` (coach reads student profiles),
   `profiles_select_counselor` (counselor reads student profiles), and the
   0025/0026/0027 policies cover counselor↔coach reads. NO policy grants an
   authenticated student SELECT access on a coach's or counselor's profile
   row. RLS would silently return zero rows.

This was the "Unknown Coach" trap the dynamic fetch fell into pre-c9960d1.
Static literals were the pragmatic patch when only one school existed.

**Resolution:** Option A — `SCHOOL_STAFF` config keyed by slug. Component
has zero school branches; config is school-keyed. Filed Option B (proper
identity model) as **C-9** for Sprint 018 alongside C-6 + C-7 — same
SECURITY DEFINER + identity migration window.

### The Phase 0 audit single-layer-grep gap (HF-A surface)

Phase 0 audit grepped `--brand-maroon|--brand-gold|--brand-gold-dark` and
identified six consumer files. The grep matched files that USE the variable
name. It did not match files that hardcode the same hex values without
referencing the variable. Phase 4 Step 6 verification surfaced three such
sites in Layout.jsx alone (banner, nav indicator, cream overlay) and the
HF-A diagnostic surfaced 31.8KB of additional matches across
`CollapsibleTitleStrip.jsx`, `CoachDashboardPage.jsx`, `AdminPage.jsx`, and
others.

**Lesson:** Phase 0 audit grep scope must cover BOTH consumer-of-token sites
AND literal-hex sites for the same colors. Token-system completeness is a
two-layer check, not a one-layer check. Same shape as Sprint 011's
`/recruits` collision — recon checked one platform layer but not the
parallel one.

**Resolution:** HF-A migrated the three Layout.jsx surfaces. Filed remaining
work as **C-10** for Sprint 018 — broader migration across the consumer
surfaces surfaced in the diagnostic 31.8KB grep. Some sites may be
intentionally school-neutral (e.g., admin per the entry brief's Section 4
note about `AdminLoginPage.jsx`) — Sprint 018 scoping must distinguish
"should theme" from "intentional school-neutral hardcode" before mass
migration.

### CSS-relative asset resolution + spaces-in-filename fragility (HF-B)

HF-A re-verification surfaced a production-only failure on the Belmont Hill
background image. Local Vite builds (6.4.1) correctly hashed both BC High
and Belmont Hill `url()` references in the bundled CSS. The deployed CSS
on `app.grittyfb.com` showed an un-hashed, doubled-`/assets/`
`/assets/assets/Belmont%20Hill%20background.jpg` path for Belmont Hill,
producing a 404. The BC High asset (`bchigh-team.jpg`, no spaces) resolved
correctly. The Belmont Hill asset (with spaces) did not.

The asymmetry rules out CSS specificity, body-class wiring, build configuration,
and Vite version drift. Most defensible cause: spaces in asset filenames are
fragile across the build → CDN → URL encoding chain, even when individual
tools handle them correctly in isolation.

**Resolution:** HF-B bypassed CSS-side asset resolution entirely. JS-imported
both background assets (Vite's most-tested asset code path), built a
slug-keyed `SCHOOL_BACKGROUNDS` map, and drove the `<main>` element's
background via inline style. Removed the three CSS background-image rules.

**Subordinate finding (HF-Bf):** the Belmont Hill asset existed on the
operator's local filesystem but was not tracked in git. Vercel's build
environment pulled the import statement without the file. HF-Bf added the
asset to git.

Filed as **C-12** — strengthen as codebase convention: "default to
JS-imported assets for binary assets the application depends on; verify
binary assets are tracked in git before relying on them in committed import
statements." Sprint 018 / process-doc update.

### The hotfix-chain context fatigue (closing decision)

Each individual hotfix in the Phase 4 → HF-A → HF-B → HF-Bf chain was
tightly scoped and correctly diagnosed:

- HF-A correctly identified the three Layout.jsx hardcoded sites + a
  defensible token-system extension (`--brand-overlay-rgba`).
- HF-B correctly diagnosed the production-only CSS asset resolution failure
  and proposed the proven-working JS-import pattern.
- HF-Bf correctly diagnosed the missing-from-git asset.

But HF-B's edit to `index.css` removed the three background-image rules in
one block — and the same block-removal also dropped the overlay rule that
should have stayed (the overlay was a separate concern from the
background image; it should have been migrated, not deleted). The HF-B
prompt didn't distinguish; the diff was authored cleanly under that prompt;
the regression slipped in.

The cumulative context load across eight hotfix exchanges (recon plus
Phase 4 → HF-A → HF-A re-verify → HF-B → HF-B Vercel-fail diagnostic →
HF-Bf → HF-Bf re-verify) produced a quality regression in the hotfix
authorship itself, not in any single hotfix's scope. Operator and
coach-me-Claude both observed the pattern setting in around HF-B and
called the close at the overlay-regression discovery rather than absorbing
a tenth hotfix.

**Lesson:** Hotfix chains beyond ~3 hotfixes per phase warrant a deliberate
session close + retro + Sprint N+1 declaration, even when individual
budget remains. Cumulative context load is a separate axis from
exchange-count budget. Same multi-session-when-budget-doesn't-cover-quality
precedent as Session 1's Phase 2 close.

This finding does not need its own carry-forward — it is the lesson
recorded by THIS retro and the close decision.

## 11. The overlay regression (deferred — C-13)

**Specific finding:** `HF-B (commit 99a8a65)` removed the three
`body.school-* main.layout-main` `background-image` rules from
`src/index.css`. The same edit also removed the overlay rule that was
tinting the `<main>` surface (cream for BC High, scarlet wash for Belmont
Hill). The overlay was a separate concern from the background image — but
in the index.css source it lived in the same logical block, and the HF-B
prompt didn't distinguish.

**User-visible impact:**
- Belmont Hill students see the Belmont Hill background photo with full
  color (no scarlet wash). The brand-color tokens (Deep Blue banner,
  Scarlet nav) still apply correctly — only the overlay surface is missing.
- BC High students see the BC High team photo with no cream wash. Banner
  + nav indicator + every other BC High surface still renders identically
  to pre-Sprint-017.

**Severity:** visible, not blocking. Belmont Hill is fully themed except
for this surface. The `--brand-overlay-rgba` token defined by HF-A is
still in `:root` and `body.school-belmont-hill` — the consumer site is
what's missing.

**Fix shape (Sprint 018):** restore the overlay as a school-conditional
inline-style property on `<main>`, parallel to `backgroundImage` (matches
HF-B's JS-import pattern). The token already exists; only the consumer
needs reconnecting. Estimated cost: 1-2 line edits in `Layout.jsx`.

Belmont Hill admin handoff can proceed with this known issue on operator's
call. The platform is functionally correct; the regression is cosmetic
on a single surface.

## 12. Configuration Health Score (Session 2 actuals)

| Sub-score | State | Notes |
|---|---|---|
| **S_speed** | Moderate | Through Phase 3 close: ahead of plan (~9 of 20). Hotfix chain extended cumulative to ~16 of 20 plus operator-authorized overrun (untouched). Cumulative budget consumed reflects Phase 0 audit's single-layer-grep gap (which produced the hotfix chain) rather than scope inflation in Phase 3 proper. |
| **S_spec** | Mostly clean | Phase 3 + Phase 4 Steps 1-5/7/8 PASS. Step 6 closed DEGRADED with the overlay regression. Sprint spec D7 step 6 holds for "theme + banner switch correctly" except for the overlay surface — partial PASS deliberately deferred rather than pushed-through-anyway. |
| **S_artifact_health** | Clean | All Session 2 commits on origin/master, retro doc updated to sprint-close state, carry-forward register reconciled. No orphan artifacts. Pre-existing carryover (12 untracked + 1 unrelated mod) preserved untouched per scope discipline across all 4 Session 2 commits. |
| **S_carry_forward** | Manageable | 6 new items (C-9, C-10, C-11, C-12, C-13, R-11) plus 7 carried-forward from Session 1. Clear Sprint 018 grouping: design-system + identity hygiene window (C-9 + C-10 + C-13), process-doc updates (C-11 + C-12), asset-size optimization (R-11). |

Composite read: **clean Session 2 close given Phase 0 audit's single-layer
scope.** The configuration absorbed two structural findings (c9960d1
architecture, hardcoded-hex consumer surfaces) and one production-environment
fragility (CSS-asset spaces) without shipping degraded primary deliverables.
The overlay regression is real and visible but deferred deliberately — same
multi-session-when-budget-doesn't-cover-quality precedent as Session 1's
Phase 2 close.

## 13. Carry-forward register (final, consolidated, 13 items)

Session 1's 8 items reconciled with Session 2's 6 new items. C-8 (Session 2
entry) is RESOLVED — Session 2 happened, Phase 3 + Phase 4 shipped.

| # | Category | Description | Owner / Sprint |
|---|---|---|---|
| C-1 | Architecture | F-21 — `partner_high_schools` ↔ `hs_programs` rename refactor | Sprint 018 candidate |
| C-2 | Data | Belmont Hill shortlist seeding (deferred per DOR-4) | Follow-on sprint |
| C-3 | QA | Mobile QA of Belmont Hill theme (deferred per DOR-5) | Mobile-QA sprint |
| C-4 | Architecture | F-06 PII column-level RLS — ongoing concern from Sprint 011 | Open |
| C-5 | Platform health | F-23 — GoTrue admin API HTTP 500 across `?email=` filter and `listUsers` | External + Dexter |
| C-6 | Hygiene migration | Migration 0045 candidate — `public.get_user_id_by_email` SECURITY DEFINER helper | Sprint 018 |
| C-7 | Resolver alignment | `bulk_import_students.js` align to the Sprint 018 SECURITY DEFINER helper once C-6 lands | Sprint 018 (contingent on C-6) |
| ~~C-8~~ | Session 2 entry | ~~Phase 3 + Phase 4 to ship~~ — **RESOLVED at sprint close** | — |
| **C-9** | **Architecture (NEW)** | **Coach/counselor identity rows + student→staff name lookup RLS. Architecturally parallel to C-6 + C-7 — same SECURITY DEFINER + identity migration window** | **Sprint 018** |
| **C-10** | **Design system (NEW)** | **Hardcoded brand-color hex literals across consumer surfaces (CollapsibleTitleStrip, CoachDashboardPage, AdminPage, others surfaced in HF-A diagnostic 31.8KB grep). Migrate to `var(--brand-*)` for full token-system coverage** | **Sprint 018** |
| **C-11** | **UX (NEW)** | **Initial-mount FOUC on first sign-in load. `useSchoolIdentity` is async; CSS/inline-style is sync. Brief flicker BC High → Belmont Hill before hook resolves. Mitigation candidates: SSR/SSG of school-conditional theming (large), session-storage cache (medium), accept and document as known transient (small)** | **Future / low priority** |
| **C-12** | **Process / convention (NEW)** | **Default to JS-imported assets for binary assets the application depends on. Verify binary assets are tracked in git before relying on them in committed import statements. Spaces in production asset filenames are fragile across build/CDN chains** | **Process-doc update** |
| **C-13** | **UX (NEW)** | **Overlay regression — HF-B removed the cream/scarlet overlay tint along with the background-image rules. Belmont Hill background photo and BC High photo both render with no overlay. Fix: restore overlay as inline-style property on `<main>`, parallel to `backgroundImage`, using existing `--brand-overlay-rgba` token. ~1-2 line edits in Layout.jsx** | **Sprint 018** |
| R-11 | Asset hygiene | 10 MB Belmont Hill background.jpg now tracked in git. Compress to <500 KB and commit-or-replace to reduce permanent repo bloat | Operator out-of-band or Sprint 018 |

**Sprint 018 pickup grouping:**
- **Design system + identity hygiene window:** C-6 + C-7 + C-9 + C-10 + C-13.
  Natural single-sprint grouping — all touch the SECURITY DEFINER + identity
  + design-token migration surface.
- **Process-doc updates:** C-11 + C-12. Lighter-weight; can fold into any
  sprint that touches the operating contracts or the four-artifact primer.
- **Operational follow-up:** R-11 (asset compression, operator-driven
  out-of-band).
- **Independent:** C-1, C-2, C-3, C-4, C-5. Existing carry-forwards with
  pre-existing owners.

## 14. Status

**SPRINT 017 CLOSED.** Multi-session sprint completed across two sessions:

- **Session 1 (closed 2026-05-07 at commit `2318998`):** Phases 0 + 1 + 2.
  Database identity, predicate generalization, account seeding. F-23 platform
  fault absorbed without blocking sprint ship.
- **Session 2 (closed 2026-05-07 at commit `fb53b3c`, retro at next commit):**
  Phase 3 + Phase 4 + HF-A + HF-B + HF-Bf. Theming + dynamic staff lookup
  end-to-end correct except for the C-13 overlay surface (deliberately
  deferred to Sprint 018). Phase 0 audit single-layer-grep gap surfaced
  through HF-A as C-10. CSS-relative-asset fragility surfaced through HF-B
  as C-12. Hotfix-chain context fatigue surfaced as the close decision —
  multi-session-when-budget-doesn't-cover-quality precedent applied.

Sprint 018 picks up the consolidated carry-forward register at Section 13,
with C-9 + C-10 + C-13 + C-6 + C-7 forming the natural design-system +
identity-hygiene window.

Five Belmont Hill accounts seeded; partner-school identity present;
predicate generalized; public roster activated; BC High regression-clean;
theming end-to-end correct except for the overlay surface. Belmont Hill
admin handoff can proceed on operator's call.
