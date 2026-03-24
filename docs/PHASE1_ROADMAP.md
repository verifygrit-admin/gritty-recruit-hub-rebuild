# PHASE 1 MVP ROADMAP — Gritty Recruit Hub Rebuild
**Issued by:** Scout (Chief of Staff)
**Date:** 2026-03-24
**Status:** FINAL — All Gates Cleared
**Project:** gritty-recruit-hub-rebuild
**Classification:** STANDARD

---

## GATE CLEARANCE RECORD

All open questions and operator gates have been answered and cleared as of this session.
This roadmap may proceed to execution.

| Gate | Item | Resolution | Decision ID |
|------|------|------------|-------------|
| Gate 1 | Patch JD expansion scope | Project-scoped addition for gritty-recruit-hub-rebuild only. Not permanent JD change. | DEC-CFBRB-001 |
| Gate 2 | SAID system | Remove entirely. No generate_said() trigger, no linkSaidToAuth() RPC, no auth_said() function. user_id is sole identity key everywhere including profiles. | DEC-CFBRB-002 |
| OQ-3 | Guidance counselor: financial aid visibility | Counselors CAN see financial aid documents. Only coaches are excluded from financial_aid_info. | DEC-CFBRB-003 |
| OQ-4 | Guidance counselor dashboard scope | Same view as coaches PLUS EFC information for financial aid AND document upload status by category. Coaches see doc categories but NOT EFC. | DEC-CFBRB-004 |
| OQ-5 | SAID removal confirmation | Confirmed per Gate 2. Remove from profiles as well. SAID system eliminated in full. | DEC-CFBRB-005 |
| David | is_head_coach field | Confirmed. `is_head_coach boolean` added to `user_hs_programs`. | DEC-CFBRB-006 |
| David | Account seeding owner | Chris seeds coach and guidance counselor account data (name, email, password). | DEC-CFBRB-007 |
| Team | Deployment target | Vercel + app.grittyfb.com | DEC-CFBRB-008 |
| Team | Junction table model | Single `user_hs_programs` junction confirmed. Chris agrees. | DEC-CFBRB-009 |
| Team | Quill UX/UI authority | Quill owns all UX/UI for the rebuild. Confirmed. | DEC-CFBRB-010 |
| Team | Rio tag map | Confirmed. See Step 8 for version tag convention. | DEC-CFBRB-011 |
| Team | Git init as Step 0 | Confirmed. Step 0 precedes all other work. | DEC-CFBRB-012 |
| Morty | grit_fit_status default for manually-added schools | `'not_evaluated'` (new enum value). See schema correction below. | DEC-CFBRB-013 |

---

## DECISION LOG — NEW DECISIONS THIS SESSION (DEC-CFBRB-001 through DEC-CFBRB-013)

**Note to Scribe:** File each of the following as a decision record in a new `decisions/gritty-recruit-hub-rebuild/` folder within `_org/decisions/`. Append all 13 to MASTER_DECISION_LOG.txt. Format per DECISION_LOG_TEMPLATE.txt.

---

**DEC-CFBRB-001**
Date: 2026-03-24
What was decided: Patch's expanded auth/schema build authority applies to gritty-recruit-hub-rebuild only. It is a project-scoped role addition, not a permanent JD amendment.
Why: Maintains Patch's core GAS Engineer identity in the canonical JD while acknowledging the specialized build role for this project.
Alternatives rejected: Permanent JD revision (rejected — premature; Patch's role post-rebuild is TBD).
Owner: Scout
Status: Made

---

**DEC-CFBRB-002**
Date: 2026-03-24
What was decided: SAID system removed entirely from the rebuild. No generate_said() trigger, no linkSaidToAuth() RPC, no auth_said() function, no `said` column on profiles or any table. user_id (UUID from auth.users) is the sole identity key throughout the system.
Why: SAID was originally designed as a human-readable fallback for RLS enforcement before auth-first architecture was established. In an auth-first rebuild, user_id serves all the same purposes without the complexity of a separate identifier system.
Alternatives rejected: Retain SAID on profiles only (rejected — creates a hybrid identity model that adds complexity with no MVP benefit).
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-003**
Date: 2026-03-24
What was decided: Guidance counselors CAN see financial_aid_info documents. Only hs_coach role is excluded from financial_aid_info in file_uploads RLS policy.
Why: Guidance counselors require financial aid information to advise students on college fit and affordability. Their professional role is distinct from coaches — they need EFC and financial aid context to do their job.
Alternatives rejected: Exclude counselors from financial aid (rejected — operationally incorrect for guidance counseling function).
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-004**
Date: 2026-03-24
What was decided: Guidance counselor dashboard = coach dashboard view PLUS (a) EFC information for financial aid and (b) document upload status by category (transcript, SAT scores, writing examples, resume, school profile, senior course list). Coach view shows same document categories but NOT EFC info.
Why: Guidance counselors are financial aid advisors in addition to recruiting support. EFC visibility is required for their core function. Document upload status lets counselors track submission readiness across their student roster.
Alternatives rejected: Counselor view identical to coach view (rejected — counselors need additional financial context not appropriate for coaches).
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-005**
Date: 2026-03-24
What was decided: Confirmed per DEC-CFBRB-002. SAID removal is complete and unconditional — all tables, all RPCs, all Edge Functions.
Why: Confirmation of Gate 2 scope.
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-006**
Date: 2026-03-24
What was decided: `is_head_coach boolean NOT NULL DEFAULT false` added to `user_hs_programs` table. When Chris seeds coach accounts, head coach designation is set at seed time.
Why: The student-facing "Is [Coach Name] your head coach?" prompt requires distinguishing the head coach from assistant coaches at the same school. Without this field, the query would return all coaches and the prompt logic would break.
Alternatives rejected: Separate head_coach column on users table (rejected — school-coach relationship already lives in user_hs_programs; head coach status belongs with the relationship, not the user).
Owner: Patch (schema authority)
Status: Made

---

**DEC-CFBRB-007**
Date: 2026-03-24
What was decided: Chris seeds all coach and guidance counselor account data manually (name, email, password) via Supabase Auth Admin API and direct table inserts. Students are seeded separately for testing. No self-service signup flow in Phase 1 MVP.
Why: MVP account population is controlled and limited (BC High only). Self-service signup would require additional validation, rate limiting, and account quality controls that are out of Phase 1 scope.
Alternatives rejected: Scripted bulk seeding by David (deferred — appropriate when school count scales beyond single school).
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-008**
Date: 2026-03-24
What was decided: Frontend deploys to Vercel at app.grittyfb.com. GitHub Actions CI pipeline retained for testing. Vercel replaces GitHub Pages as the deployment target.
Why: Vercel provides custom domain routing to app.grittyfb.com without the DNS complexity of GitHub Pages. grittyfb.com is owned by Chris and already Resend-verified. Vercel deployment was backlogged in the existing project — this rebuild implements it from the start.
Alternatives rejected: GitHub Pages (rejected — custom subdomain routing on gh-pages is more complex; Vercel is cleaner for this stack).
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-009**
Date: 2026-03-24
What was decided: Single `user_hs_programs` junction table with `role` column covers all three user types (student, coach, counselor). The three-table approach from the original directive is superseded.
Why: Three identical tables with identical RLS patterns is maintenance overhead with no structural benefit. A single table with a role discriminator column achieves the same type safety more cleanly.
Alternatives rejected: Three separate junction tables (rejected — architectural overhead without benefit at MVP scale).
Owner: Patch (schema authority) / Chris confirmed
Status: Made

---

**DEC-CFBRB-010**
Date: 2026-03-24
What was decided: Quill has full UX/UI authority for the rebuild. All interface decisions, color scheme implementation, component specifications, and layout decisions require Quill's sign-off before Nova implements.
Why: Consolidates design authority. Prevents Nova from making ad hoc UX decisions during implementation. The BC High reference image and DESIGN_SYSTEM.md are Quill's inputs.
Owner: Scout
Status: Made

---

**DEC-CFBRB-011**
Date: 2026-03-24
What was decided: Rio version tag convention for Phase 1 rebuild: v0.1.0 at Step 0 complete (repo + Vercel live), v0.2.0 at Step 2 complete (schema + Morty audit pass), v0.3.0 at Step 4 complete (auth flows green), v0.4.0 at Step 5 complete (student experience), v0.5.0 at Step 6 complete (coach + counselor dashboards), v1.0.0 at Step 7 complete (full regression pass + Dexter PASS).
Why: Pre-1.0 semver signals active development. Each major step earns a minor version increment. v1.0.0 is earned only after Dexter and Quin both issue PASS.
Owner: Rio (version authority)
Status: Made

---

**DEC-CFBRB-012**
Date: 2026-03-24
What was decided: Step 0 (git init + GitHub repo + Vercel project setup) is a formal prerequisite to all other work. No schema work, no auth work, no app code begins until the repo is initialized, pushed to GitHub, and connected to Vercel.
Why: All subsequent work depends on having a canonical remote to push against. Vercel connection needs the repo live before project creation. This is infrastructure, not ceremony.
Owner: Chris (Operator)
Status: Made

---

**DEC-CFBRB-013**
Date: 2026-03-24
What was decided: `grit_fit_status` default for manually-added schools is `'not_evaluated'`. The enum is extended to include `'not_evaluated'` as a valid value alongside the five existing values. Schools added manually (source = 'manual_add') start with `'not_evaluated'`. After the first GRIT FIT calculation, all shortlist items are batch-updated to their correct status.
Why: `'currently_recommended'` as default for manual adds is semantically incorrect — the algorithm has not evaluated them. `null` creates nullable complexity in the RLS and display logic. `'not_evaluated'` is accurate, queryable, and displayable.
Alternatives rejected: null default (rejected — nullable status field creates conditional display logic in every view that references it); 'currently_recommended' default (rejected — factually wrong for manual adds before any calculation runs).
Owner: Patch (schema authority) / Morty (audit confirmation needed)
Status: Made

---

## SCHEMA CORRECTION — FINAL GATE RESOLUTION

The `grit_fit_status` enum in `patch-schema-auth-spec-v1.md` (Section 2.7) must be updated to include `'not_evaluated'` and the DEFAULT changed based on source:

```sql
grit_fit_status text DEFAULT 'not_evaluated' CHECK (grit_fit_status IN (
  'not_evaluated',
  'currently_recommended',
  'out_of_academic_reach',
  'below_academic_fit',
  'out_of_athletic_reach',
  'below_athletic_fit',
  'outside_geographic_reach'
)),
```

The application-layer rule is:
- On manual add: `grit_fit_status = 'not_evaluated'`
- On GRIT FIT add: `grit_fit_status = 'currently_recommended'`
- After GRIT FIT recalculation: all shortlist items batch-updated to their current status

**Note to Patch:** Update `patch-schema-auth-spec-v1.md` Section 2.7 with this correction before producing migration 0006. This is a schema correction, not a new spec — the existing spec file should be updated with a version note.

---

## SAID SYSTEM — FINAL SCHEMA IMPACT

DEC-CFBRB-002 removes SAID entirely. The following changes supersede `patch-schema-auth-spec-v1.md` Section 2.5:

**profiles table — SAID removed:**
- Drop `said text UNIQUE` column
- Drop `generate_said()` trigger
- No `linkSaidToAuth()` function
- No `auth_said()` RPC
- Session restore uses `user_id` from `getSession()` directly — no `said` extraction from user_metadata

**Migration impact:**
- Migration 0004 (profiles) no longer includes the `said` column, `generate_said` trigger, or `linkSaidToAuth` function
- Migration 0004 is simplified accordingly
- The existing codebase's auth_said.sql is not ported

**Note to Patch:** Update `patch-schema-auth-spec-v1.md` Section 2.5, Section 3.5 (session restore), and Section 7 (what does not change — remove the three SAID items from the preserved list) to reflect DEC-CFBRB-002. Version note required on all updated sections.

---

## DOMAIN AUTHORITY TABLE (FINAL)

This table supersedes the domain authority table in `cfb-rebuild-phase1-directive.md` Part 6.

| Domain | Authority | Consulting Party | No One Else Does This Without Asking |
|--------|-----------|-----------------|--------------------------------------|
| Database schema and migrations | Patch | Morty (audit), David (data fields) | No schema touches Supabase without Patch sign-off |
| Auth flow logic and implementation | Patch | Morty (audit review) | Patch owns auth for this project (DEC-CFBRB-001) |
| Architecture audit and RLS review | Morty | Patch (implementation questions) | Morty's audit PASS is required before schema is applied to Supabase |
| UX/UI decisions | Quill | Sage (recruiting domain), Nova (feasibility) | No layout, color, or component decisions without Quill sign-off |
| GRIT FIT scoring logic | Nova + Chris | Sage (domain validation) | Algorithm changes require explicit operator instruction |
| Student experience implementation | Nova | Quill (UX spec), Quin (done conditions) | Nova implements; does not design |
| Coach + counselor dashboard implementation | Nova | Quill (UX spec), David (data queries), Quin (done conditions) | Nova implements; does not design |
| Deployment and version tagging | Rio | Dexter (CI gate), Scout (session gate) | Only Rio pushes version tags |
| Source-of-truth writes | Scout (gate) | All agents (any can flag) | All canonical governance file writes require Scout clearance |
| Data integrity and hs_programs population | David | Patch (schema constraints) | School data, hs_programs entries, migration data queries |
| Test specification and done conditions | Quin | All agents (input welcome) | Quin defines what "done" means before implementation begins |
| Platform health, CI, and Vercel | Dexter | Rio (version coordination) | CI configuration, GitHub Actions, Vercel, environment variables |
| Financial aid document visibility (RLS) | Patch | Morty (audit), Scout (compliance) | Counselors see financial_aid_info; coaches do not (DEC-CFBRB-003) |
| Guidance counselor dashboard scope | Quill + Nova | David (EFC queries), Quin (done conditions) | Scope defined in DEC-CFBRB-004 — EFC + doc status additions |
| Account seeding | Chris (Operator) | David (data prep), Patch (schema) | Chris seeds all coach and counselor accounts |

---

## WORKING GROUP ASSIGNMENTS (FINAL)

### Group 1 — Infrastructure (Step 0)
**Purpose:** Repository, CI, and deployment infrastructure before any code is written.

| Agent | Role | Authority |
|-------|------|-----------|
| Chris | Git init, GitHub repo creation, Vercel project connection | Operator — executes directly |
| Dexter | CI pipeline configuration (GitHub Actions), Vercel environment variables, sentinel configuration | Owns all CI/CD infrastructure |
| Rio | Initial v0.1.0 tag after Step 0 confirmed complete | Version authority |
| Scout | Gate — Step 0 done condition confirmation before Step 1 begins | Compliance gate |

**What Group 1 does NOT do:** No schema, no auth code, no application code.

---

### Group 2 — Database and Schema (Step 1 + Step 2)
**Purpose:** New Supabase project, final schema, migrations, data population.

| Agent | Role | Authority |
|-------|------|-----------|
| Patch | Supabase project creation, all migration files, RLS policies, Storage bucket, Edge Function shells | Owns all schema decisions |
| Morty | Architecture audit of schema before any migration is applied to Supabase | Audit authority — PASS required before Step 3 gate opens |
| David | hs_programs population (BC High seed), schools table migration via sync_schools.py | Data integrity and population |
| Scout | Step 2 gate — Morty PASS required before auth work begins | Compliance gate |

**What Group 2 does NOT do:** No auth flow code, no React components, no application logic.

**Blocking note:** Everything downstream of Step 2 is blocked until Morty issues an audit PASS on the schema. This is a hard gate.

---

### Group 3 — Auth Flows (Step 3 + Step 4)
**Purpose:** Student signup, coach signup, counselor signup, session restore, email verification, admin activation.

| Agent | Role | Authority |
|-------|------|-----------|
| Patch | Auth flow implementation — all signup flows, email verification Edge Functions, session restore logic, admin activation | Auth build authority (DEC-CFBRB-001) |
| Quin | Auth test specifications written before implementation begins; defines done conditions for all auth flows | Test spec authority |
| Morty | Post-implementation audit of auth flows against spec | Audit review |
| Dexter | CI environment variables for new Supabase project, Playwright auth config | Platform authority |
| Scout | Step 4 gate — Quin done conditions met, Morty review complete | Compliance gate |

**What Group 3 does NOT do:** No GRIT FIT integration, no dashboard UI, no student-facing features.

---

### Group 4 — Student Experience (Step 5)
**Purpose:** GRIT FIT scoring integration, Map View, Table View, Shortlist, recruiting journey UI, profile form.

| Agent | Role | Authority |
|-------|------|-----------|
| Nova | GRIT FIT algorithm integration with new auth/schema, Map View, Table View, Shortlist, recruiting journey component, profile form wiring | Build authority for student experience |
| Quill | UX/UI specifications for all student-facing components; color scheme implementation per DESIGN_SYSTEM.md and BC High reference; component design and layout | UX/UI authority |
| Quin | Student flow regression tests; done conditions per step | Test spec authority |
| Sage | Domain advisory — pressure-test UX decisions and recruiting journey against real recruiting process | Recruiting domain expertise |
| Scout | Step 5 gate — Quin done conditions met, Quill UX sign-off | Compliance gate |

**What Group 4 does NOT do:** No coach dashboard, no counselor dashboard, no admin tooling.

**Dependency note:** Group 4 cannot begin until Step 4 (auth flows) is gated complete. Nova needs working Supabase auth before GRIT FIT can be wired.

---

### Group 5 — Coach and Counselor Dashboards (Step 6)
**Purpose:** Coach dashboard (student roster, shortlist progress, recruiting activity by conference/division), guidance counselor dashboard (same plus EFC and document upload status).

| Agent | Role | Authority |
|-------|------|-----------|
| Nova | Coach dashboard implementation, counselor dashboard implementation | Build authority |
| Quill | Coach view design, counselor view design (EFC display, document status display), recruiting activity layout | UX/UI authority |
| David | Recruiting activity aggregation queries by conference/division; counselor EFC query support | Data query authority |
| Quin | Coach and counselor view regression tests; done conditions | Test spec authority |
| Scout | Step 6 gate — Quin done conditions met, Quill UX sign-off | Compliance gate |

**What Group 5 does NOT do:** No student-facing feature modifications, no schema changes, no new auth flows.

---

### Group 6 — QA and Regression (Step 7)
**Purpose:** Full regression suite, Dexter CI confirmation, pre-release sign-off.

| Agent | Role | Authority |
|-------|------|-----------|
| Quin | Full regression suite execution; all done conditions confirmed | QA authority |
| Dexter | CI green confirmation, Playwright pass, Vercel deployment health check | Platform authority |
| Morty | Final architecture audit — review any schema or auth changes made during Steps 4-6 | Audit authority |
| Scout | Step 7 gate — Quin PASS + Dexter PASS + Morty PASS all required before v1.0.0 | Compliance gate |

---

### Group 7 — Governance and Version Control (All Steps)
**Purpose:** Documentation, decisions, versioning — active throughout all steps.

| Agent | Role | Authority |
|-------|------|-----------|
| Scout | Compliance monitoring, all step gates, scope enforcement, source-of-truth protection | Compliance authority |
| Scribe | Session logs, decision files, spec history, meeting transcripts | Documentation filing |
| Vault | MASTER_INDEX sync, file retrieval, archive management | Archival authority |
| Rio | Semantic version tags at each step gate; final v1.0.0 tag | Version authority |
| Lumen | Context audits at session open and when context load is high; token optimization recommendations | Context efficiency |
| Meridian | Available for structural governance questions; invoked only when architecture decisions surface | Architecture governance |

---

## CRITICAL PATH — STEP-BY-STEP EXECUTION PLAN

```
STEP 0: Infrastructure Setup (Group 1)
  Git init → GitHub repo → Vercel project → CI baseline
        ↓
STEP 1: Schema Build (Group 2)
  Patch writes migration files (0001-0010)
  David prepares hs_programs seed data
        ↓
STEP 2: Schema Audit + Data Population (Group 2)
  Morty audits schema — PASS required
  David runs hs_programs seed + schools migration
  Scout gates Step 2
        ↓
STEP 3: Auth Test Specs Written (Group 3)
  Quin writes all auth flow test specifications BEFORE implementation
        ↓
STEP 4: Auth Flows Built (Group 3)
  Patch implements all signup flows + Edge Functions
  Dexter configures Playwright for new project
  Quin confirms done conditions met
  Morty reviews auth implementation
  Scout gates Step 4
        ↓
STEP 5: Student Experience (Group 4) — PARALLEL TRACKS
  Track A: Nova wires GRIT FIT + Map View + Table View
  Track B: Quill designs and specs all student components (parallel with Track A)
  Track C: Quin writes student flow tests (before/during implementation)
  Track D: Sage domain advisory available throughout
  Quin done conditions met → Quill UX sign-off → Scout gates Step 5
        ↓
STEP 6: Coach + Counselor Dashboards (Group 5) — PARALLEL TRACKS
  Track A: Nova implements coach dashboard
  Track B: Nova implements counselor dashboard (after coach baseline)
  Track C: Quill designs both dashboard views (parallel)
  Track D: David provides aggregation query support
  Track E: Quin writes dashboard regression tests
  Quin done conditions met → Quill UX sign-off → Scout gates Step 6
        ↓
STEP 7: Full Regression + Pre-Release (Group 6)
  Quin full regression suite
  Dexter CI + Vercel deployment confirmation
  Morty final architecture audit
  Scout gates Step 7 — all three PASS required
        ↓
STEP 8: Version Tag (Group 7)
  Rio tags v1.0.0
  Scout session close
```

---

## STEP DETAIL CARDS

Each card contains: working group, agents on point, scope boundaries, done conditions, gate conditions, and dependencies.

---

### STEP 0 — Infrastructure Setup

**Working Group:** Group 1 (Infrastructure)
**Agent On Point:** Chris (Operator)
**Supporting Agents:** Dexter, Rio, Scout

**Scope — IN:**
- Create `gritty-recruit-hub-rebuild` GitHub repository under verifygrit-admin
- Initialize local git repo at `C:\Users\chris\dev\gritty-recruit-hub-rebuild`
- React + Vite scaffold (matches existing cfb-recruit-hub stack)
- Connect GitHub repo to Vercel
- Configure `app.grittyfb.com` custom domain in Vercel
- Initial GitHub Actions CI scaffold (Dexter owns)
- Environment variable placeholders in Vercel and GitHub secrets (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE if needed)
- Rio tags v0.1.0 after Step 0 confirmed complete

**Scope — OUT:**
- No Supabase project creation (Step 1)
- No application code beyond scaffold
- No schema, no migrations

**Done Conditions (Quin defines, Scout confirms):**
1. `gritty-recruit-hub-rebuild` repo exists on GitHub under verifygrit-admin
2. Local repo at `C:\Users\chris\dev\gritty-recruit-hub-rebuild` initialized and pushed to origin
3. React + Vite scaffold builds without errors locally
4. Vercel project connected to GitHub repo
5. `app.grittyfb.com` resolves to Vercel deployment (may show scaffold placeholder)
6. GitHub Actions CI scaffold present and passing on push
7. v0.1.0 tag present on initial commit

**Gate Condition:** Scout confirms all 7 done conditions before Step 1 begins.

**Dependencies:** None — this is the root of the dependency chain.

---

### STEP 1 — Schema Build

**Working Group:** Group 2 (Database and Schema)
**Agent On Point:** Patch
**Supporting Agents:** David, Morty (reviewing in parallel), Scout

**Scope — IN:**
- New Supabase project created (separate from oeekcafirfxgtdoocael.supabase.co)
- All migration files produced: 0001 through 0010 (see migration plan in patch-schema-auth-spec-v1.md Section 8)
- SAID system NOT present in any migration (DEC-CFBRB-002)
- `grit_fit_status` enum updated to include `'not_evaluated'` (DEC-CFBRB-013)
- `is_head_coach` boolean on `user_hs_programs` (DEC-CFBRB-006)
- `email_verify_tokens` table included (OQ-1 resolved to Option A in patch-schema-auth-spec-v1.md)
- coach-student link model: `user_hs_programs` only — no separate coach_student_links table (OQ-2 resolved to Option A)
- RLS policies in migration 0009 reflect DEC-CFBRB-003 (counselors CAN see financial_aid_info)
- David prepares hs_programs seed data (BC High school record, at minimum)
- David prepares schools migration script (sync_schools.py pointed at new project)
- Patch reviews and confirms all schema improvements from patch-schema-auth-spec-v1.md Section 5

**Scope — OUT:**
- Migrations are NOT applied to Supabase until Step 2 gate clears (Morty PASS required first)
- No auth flow code
- No React components

**Done Conditions:**
1. All 10 migration files present in `supabase/migrations/`
2. Migration files reviewed by Patch for correctness
3. SAID references absent from all migration files
4. `grit_fit_status` enum includes `'not_evaluated'` with correct application-layer defaults
5. `is_head_coach` present on `user_hs_programs`
6. RLS policy for `file_uploads` allows counselors to read `financial_aid_info`
7. `email_verify_tokens` table present (Option A)
8. David confirms hs_programs seed data prepared
9. David confirms sync_schools.py is configured for new project

**Gate Condition:** Patch declares spec complete → Morty begins audit → Step 2 gate (not Step 1).

**Dependencies:** Step 0 complete.

---

### STEP 2 — Schema Audit and Data Population

**Working Group:** Group 2 (Database and Schema)
**Agent On Point:** Morty (audit) + Patch (apply migrations) + David (populate data)
**Gate Holder:** Scout

**Scope — IN:**
- Morty audits all 10 migration files against the directive, patch-schema-auth-spec-v1.md, and all DEC-CFBRB decisions
- Morty produces written audit report with PASS or BLOCKED verdict
- If BLOCKED: Patch addresses findings, Morty re-audits before anything continues
- If PASS: Patch applies migrations to new Supabase project in order (0001 through 0010)
- David runs hs_programs seed (BC High)
- David runs sync_schools.py to migrate 662-school dataset
- David confirms row counts and data integrity post-population
- Vercel environment variables updated with new Supabase project URL and anon key
- GitHub secrets updated to match new project

**Scope — OUT:**
- No auth flow code
- No application code

**Done Conditions:**
1. Morty audit report filed — verdict: PASS
2. All 10 migrations applied to new Supabase project with no errors
3. David confirms hs_programs: BC High row present with correct fields
4. David confirms schools table: 662 rows, unitid populated, no null school_names
5. RLS policies verified against pg_policies (not just migration files — per standing lesson from rls_policy_gap_incident.md)
6. Vercel and GitHub secrets updated with new project credentials
7. Rio tags v0.2.0

**Gate Condition:** Scout confirms all 6 done conditions. Morty PASS is non-negotiable. If Morty issues BLOCKED, no work advances until all findings are resolved and Morty re-issues PASS.

**Dependencies:** Step 1 complete.

---

### STEP 3 — Auth Test Specifications

**Working Group:** Group 3 (Auth Flows)
**Agent On Point:** Quin
**Supporting Agents:** Patch (spec clarifications), Morty (architecture questions)

**Scope — IN:**
- Quin writes test specifications for all auth flows BEFORE Patch begins implementation
- Auth flows to be covered: student signup, coach signup, counselor signup, session restore, email verification, admin activation, sign-in routing by user_type, pending/verified state handling
- Done conditions defined for each auth flow test
- Quin confirms: what constitutes a passing auth test vs. a failing one
- Test specs filed with Scribe

**Scope — OUT:**
- Quin does not implement tests yet — specs only at this step
- Quin does not fix bugs

**Done Conditions:**
1. Test specs written for all auth flows (minimum: student signup, coach signup, counselor signup, session restore, email verification, sign-in routing)
2. Each test spec includes: setup state, action, expected outcome, pass/fail criteria
3. Test specs reviewed by Patch for feasibility (one pass, no rework loop)
4. Test specs filed with Scribe

**Gate Condition:** Patch confirms specs are implementable before Step 4 begins.

**Dependencies:** Step 2 complete (Morty PASS, schema live).

---

### STEP 4 — Auth Flow Implementation

**Working Group:** Group 3 (Auth Flows)
**Agent On Point:** Patch
**Supporting Agents:** Quin (test execution), Morty (post-implementation review), Dexter (CI + Playwright config), Scout

**Scope — IN:**
- Student-athlete signup flow (email/password → auth.users → public.users insert → hs_programs selection → head coach auto-link prompt → profile form → GRIT FIT flow entry)
- hs_coach signup flow (email/password → auth.users → public.users insert → hs_programs selection → account active immediately)
- hs_guidance_counselor signup flow (same pattern as coach)
- Email verification: `send-verify-email` Edge Function (Resend, noreply@grittyfb.com), `verify-email` Edge Function, token via email_verify_tokens table
- Admin activation: Patch documents the exact Supabase dashboard steps for Chris to activate accounts (no automated admin UI in Phase 1)
- Sign-in flow: getSession() (NOT getUser()), route by user_type
- Session restore: student profile check, route to profile form if incomplete
- Pending/verified state handling: correct error screens for unverified and pending accounts
- Dexter configures Playwright and CI environment variables for new project
- Quin runs test suite against live flows

**Scope — OUT:**
- No GRIT FIT wiring (Step 5)
- No dashboard UI
- No file upload

**Done Conditions:**
1. All Quin auth flow test specs pass against live Supabase project
2. Student signup: auth.users created, public.users row inserted, user_hs_programs junction row inserted, email verification email delivered (Resend log confirms), sign-in succeeds after admin activation
3. Coach signup: same pattern, user_type = hs_coach, head coach flag set at seed time
4. Counselor signup: same pattern, user_type = hs_guidance_counselor
5. Email verification Edge Function: valid token → email_verified = true; expired token → correct error; already-used token → correct error
6. Session restore: returning student routes to GRIT FIT results (if profile complete) or profile form (if incomplete)
7. Sign-in routing: student → profile/results, coach → coach dashboard placeholder, counselor → counselor dashboard placeholder
8. Pending state: sign-in with pending account shows correct message, no dashboard access
9. Morty post-implementation review: no audit findings that rise to BLOCKED
10. Dexter CI + Playwright: green on push
11. Rio tags v0.3.0

**Gate Condition:** Scout confirms all 11 done conditions. Morty review must be complete (PASS or BLOCKED resolved).

**Dependencies:** Step 3 complete.

---

### STEP 5 — Student Experience

**Working Group:** Group 4 (Student Experience)
**Agents On Point:** Nova (build), Quill (UX spec)
**Supporting Agents:** Quin (tests), Sage (domain advisory), Scout

**IMPORTANT — Sequence within Step 5:**
Quill produces UX specs BEFORE Nova begins component implementation. Nova does not build until Quill's spec for each component is delivered. Quin writes test specs in parallel with Quill's UX work. This is not negotiable — it prevents rework.

**Scope — IN:**

*Quill delivers (before Nova builds):*
- GRIT FIT profile form spec (school selection dropdown wired to hs_programs, existing fields confirmed)
- GRIT FIT results: Map View spec (30 schools, marker behavior, filter state)
- GRIT FIT results: Table View spec (columns, sort, rank display, net_cost, droi, etc.)
- Shortlist component spec (add from map or table, recruiting journey progress, grit_fit_status warning display)
- Recruiting journey step UI spec (15-step progress display per shortlist item)
- File upload interface spec (upload by document_type, display uploaded files, download link)
- Landing page final spec (Browse vs GRIT FIT entry, anonymous map access confirmed)
- Color scheme implementation per DESIGN_SYSTEM.md and BC High reference image

*Nova builds (after Quill spec delivered):*
- GRIT FIT scoring.js integration with Supabase profiles table (user_id-based, no SAID)
- Profile form component wired to Supabase (insert into profiles using auth.uid())
- Map View: 30 GRIT FIT results overlaid on full 662-school map
- Table View: ranked results, sortable columns
- Shortlist: add/remove, source tracking, grit_fit_status batch update on recalculation
- Recruiting journey: 15-step progress UI per shortlist item
- File upload/download: Supabase Storage via service role Edge Function
- Landing page: two entry points, anonymous map access

*Account seeding for testing:*
- Chris seeds test student account(s) at start of Step 5 using confirmed admin activation process from Step 4

**Scope — OUT:**
- No coach dashboard (Step 6)
- No counselor dashboard (Step 6)
- No schema changes

**Done Conditions:**
1. Quill UX specs for all student-facing components delivered and filed with Scribe before Nova begins each component
2. Profile form: submits successfully, inserts into profiles with auth.uid() populated, no RLS error
3. GRIT FIT scoring: runs against test student profile, returns up to 30 schools, results match expected algorithm output
4. Map View: 30 GRIT FIT schools render on map, full 662-school map accessible to anonymous users
5. Table View: ranked results display, sort by at least 3 columns
6. Shortlist: add from map works, add from table works, manual add from full map works
7. Shortlist grit_fit_status: 'not_evaluated' for manual adds before first calculation; correct status after calculation runs
8. Recruiting journey: 15-step display renders per shortlist item, step 1 pre-checked on add
9. File upload: all 7 document types uploadable, files retrievable by student
10. Landing page: anonymous user sees map, authenticated user routes to GRIT FIT flow
11. Quin full student flow regression: all tests pass
12. Dexter CI green
13. Rio tags v0.4.0

**Gate Condition:** Scout confirms all 13 done conditions. Quill UX sign-off and Quin PASS both required.

**Dependencies:** Step 4 complete.

---

### STEP 6 — Coach and Counselor Dashboards

**Working Group:** Group 5 (Coach and Counselor Dashboards)
**Agents On Point:** Nova (build), Quill (UX spec)
**Supporting Agents:** David (aggregation queries), Quin (tests), Scout

**IMPORTANT — Sequence within Step 6:**
Same rule as Step 5: Quill delivers specs before Nova builds. Coach dashboard first, then counselor dashboard (counselor is additive to coach baseline).

**Scope — IN:**

*Quill delivers:*
- Coach dashboard spec: student roster layout, shortlist progress display per student, recruiting activity summary (aggregated by conference/division)
- Counselor dashboard spec: same as coach PLUS EFC display per student, document upload status by category per student

*Nova builds:*
- Coach dashboard: student roster (all students with matching hs_program_id), per-student shortlist view, 15-step journey progress per shortlist item, recruiting activity aggregated by conference/division (no individual school names)
- Counselor dashboard: coach dashboard + EFC column for each student (from profiles.agi + dependents — EFC derivation same as GRIT FIT financial gate), document upload status grid (7 categories, yes/no per student)
- Routing: sign-in as coach → coach dashboard; sign-in as counselor → counselor dashboard

*David delivers:*
- Recruiting activity aggregation query spec (conference/division rollup from short_list_items joined to schools)
- Counselor EFC display query spec

*Account seeding for testing:*
- Chris seeds test coach and counselor accounts using admin activation process from Step 4
- Test coach account linked to BC High via user_hs_programs with is_head_coach = true
- Test counselor account linked to BC High via user_hs_programs

**Scope — OUT:**
- No student-facing feature modifications
- No schema changes
- No Phase 2 features (college coach, parent accounts)

**Done Conditions:**
1. Quill UX specs for coach dashboard and counselor dashboard delivered and filed before Nova begins
2. Coach dashboard: renders student roster for all students sharing coach's hs_program_id
3. Coach dashboard: per-student shortlist visible with recruiting journey progress
4. Coach dashboard: recruiting activity display shows conference/division aggregation — no individual school names
5. Coach dashboard: file_uploads display excludes financial_aid_info documents (RLS enforced at query level)
6. Counselor dashboard: same as coach (items 2-4) PLUS EFC column visible per student
7. Counselor dashboard: document upload status grid shows 7 categories per student (financial_aid_info included — DEC-CFBRB-003)
8. Routing: hs_coach login → coach dashboard; hs_guidance_counselor login → counselor dashboard
9. Quin full dashboard regression: all tests pass
10. Dexter CI green
11. Rio tags v0.5.0

**Gate Condition:** Scout confirms all 11 done conditions. Quill UX sign-off and Quin PASS both required.

**Dependencies:** Step 5 complete.

---

### STEP 7 — Full Regression and Pre-Release

**Working Group:** Group 6 (QA and Regression)
**Agent On Point:** Quin (QA lead), Dexter (platform)
**Supporting Agents:** Morty (final audit), Scout

**Scope — IN:**
- Quin executes full regression suite across all flows: auth, student experience, coach dashboard, counselor dashboard, file uploads, edge cases
- Dexter confirms CI green on all GitHub Actions workflows (test, build, deploy)
- Dexter confirms Vercel deployment health at app.grittyfb.com
- Dexter confirms Playwright suite: all tests pass
- Morty final architecture audit: reviews any schema or auth changes made during Steps 4-6 against original spec; confirms no RLS regressions; confirms SAID-free throughout
- Any BLOCKED findings from Quin or Morty go back to Nova/Patch for resolution — no v1.0.0 tag until all resolved
- Scout confirms all three PASS verdicts

**Scope — OUT:**
- No new features
- No scope additions
- Backlog items stay in backlog

**Done Conditions:**
1. Quin full regression: PASS — all test specs pass, no open failures
2. Dexter platform check: PASS — CI green, Playwright green, Vercel healthy, app.grittyfb.com loads
3. Morty final audit: PASS — no BLOCKED findings; any ADVISORY findings documented for backlog
4. All three PASS verdicts in writing, filed with Scribe
5. No anonymous inserts possible on any authenticated table (verify via Postman or Playwright)
6. No service role key accessible in browser bundle (verify in Vercel build logs)
7. getSession() used throughout — getUser() not present in any browser-executed code

**Gate Condition:** Scout confirms all 7 done conditions. All three agents must issue written PASS. Any BLOCKED verdict restarts the resolution cycle before the gate re-opens.

**Dependencies:** Step 6 complete.

---

### STEP 8 — Release

**Working Group:** Group 7 (Governance and Version Control)
**Agent On Point:** Rio
**Supporting Agents:** Scout, Scribe

**Scope — IN:**
- Rio tags v1.0.0 on the commit that passed Step 7
- Scribe files Phase 1 MVP release decision log entry
- Scout session close: push check, retro if multi-agent session, decision log confirmed, broadcasting obligations confirmed
- Retrospective: What Worked / What Didn't / What We Learned / Open Decisions
- Phase 2 planning items identified from open backlog

**Done Conditions:**
1. v1.0.0 tag present on GitHub
2. Vercel deployment at app.grittyfb.com serves v1.0.0
3. Scout retro complete and filed with Scribe
4. Session close gate confirmed

**Gate Condition:** Scout session close confirmation.

**Dependencies:** Step 7 complete (all three PASS verdicts).

---

## ACCOUNT SEEDING PLAN

All MVP accounts are seeded and admin-activated. No self-service signup in Phase 1.

### Who Seeds What

| Account Type | Seeded By | When |
|---|---|---|
| Test student-athlete accounts | Chris | Start of Step 5 |
| hs_coach accounts (BC High) | Chris | Start of Step 6 |
| hs_guidance_counselor accounts (BC High) | Chris | Start of Step 6 |
| BC High hs_programs row | David | Step 2 (schema population) |

### Seeding Process (per Chris's confirmed process from Step 4 auth documentation)

1. Chris creates `auth.users` record via Supabase Auth Admin API (email + password)
2. Chris inserts row into `public.users` (user_type, account_status: 'pending', email_verified: false)
3. Chris inserts row into `user_hs_programs` (user_id, hs_program_id for BC High, role, is_head_coach as appropriate)
4. App sends verification email (Resend trigger via `send-verify-email` Edge Function)
5. Chris verifies own email by clicking link
6. Chris sets `account_status = 'active'` and `activated_by`, `activated_at` in Supabase dashboard
7. Account is live

**Patch delivers:** Exact Supabase dashboard steps for admin activation (Step 4 deliverable). Chris follows that document for all seeding.

### Test Account Inventory (to be confirmed at seeding time)

| Role | Email | Notes |
|---|---|---|
| student_athlete | TBD by Chris | At least 1 test student for Step 5 validation |
| hs_coach | TBD by Chris | BC High head coach — is_head_coach = true |
| hs_guidance_counselor | TBD by Chris | BC High counselor |

---

## GUIDANCE COUNSELOR DASHBOARD — SCOPE DEFINITION

**Authority:** DEC-CFBRB-004
**UX Owner:** Quill
**Build Owner:** Nova
**Data Query Support:** David

### What the counselor dashboard shows (versus coach dashboard):

| Feature | Coach Dashboard | Counselor Dashboard |
|---------|----------------|---------------------|
| Student roster (all students at shared school) | YES | YES |
| Per-student shortlist | YES | YES |
| 15-step recruiting journey per shortlist item | YES | YES |
| Recruiting activity aggregated by conference/division | YES | YES |
| EFC (Expected Family Contribution) per student | NO | YES |
| Document upload status by category per student | Categories visible, no EFC | All 7 categories including financial_aid_info |
| financial_aid_info document download | BLOCKED by RLS | PERMITTED by RLS |

### Document categories displayed (both dashboards, with column header only, not downloadable for coach):

1. Transcript
2. Senior course list
3. Writing example
4. Student resume
5. School profile PDF
6. SAT/ACT scores
7. Financial aid info (counselor: downloadable; coach: status display only, no download)

### EFC derivation for counselor view:

EFC is derived from the same inputs used by GRIT FIT financial gate: `profiles.agi` + `profiles.dependents`. The EFC display in the counselor dashboard is the same calculation — it is not a new field, it is a read of existing profile data. Quill decides the display format (numeric, bracket, simplified label — Quill's call).

---

## VERCEL DEPLOYMENT — STEP 0 CONFIGURATION

### Deployment Target
- **Platform:** Vercel
- **Domain:** app.grittyfb.com
- **DNS:** grittyfb.com is owned by Chris; Resend-verified. Vercel custom domain setup: add CNAME or A record to Vercel IP per Vercel's domain configuration guide.

### Environment Variables (Vercel + GitHub Secrets)
| Variable | Owner | When Set |
|----------|-------|----------|
| VITE_SUPABASE_URL | Dexter | Step 2 (new project created) |
| VITE_SUPABASE_ANON_KEY | Dexter | Step 2 |
| SUPABASE_SERVICE_ROLE_KEY | Dexter | Step 2 (Vercel server-side only — never in browser bundle) |
| RESEND_API_KEY | Patch | Step 4 (Edge Function deployment) |
| ANTHROPIC_API_KEY | Dexter | If needed for any AI features — deferred |

### CI Pipeline (Dexter owns)
- Vitest as pre-deploy gate (matches existing cfb-recruit-hub pattern)
- Playwright regression suite post-deploy
- Commit lint on PRs
- Sentinel checks (daily) — Dexter configures scope for new project

---

## RIO VERSION TAG MAP (DEC-CFBRB-011)

| Tag | Trigger | Gate Holder |
|-----|---------|-------------|
| v0.1.0 | Step 0 complete — repo + Vercel live | Scout |
| v0.2.0 | Step 2 complete — schema + Morty audit PASS | Scout |
| v0.3.0 | Step 4 complete — auth flows green | Scout |
| v0.4.0 | Step 5 complete — student experience | Scout |
| v0.5.0 | Step 6 complete — dashboards | Scout |
| v1.0.0 | Step 7 complete — full regression + Dexter PASS | Scout |

---

## SCOPE PROTECTIONS

The following items are explicitly out of scope for Phase 1. Any agent that encounters a request or temptation to build these must stop and surface to Scout immediately.

- Parent accounts and parent-student linking
- College coach accounts (any level of visibility)
- College admissions officer accounts
- Payment or billing enforcement
- Email notifications beyond verification and password reset
- Historical profile versioning or audit log
- Advanced analytics or reporting dashboard
- Multi-school coach accounts
- Batch student profile upload
- Mobile or desktop app
- Integration with Hudl, SCOIR, Canvas, ARMS, Sidearm, JumpForward, FrontRush, RecruitSpot, PrestoSports, TFAForms, ARI, or any external recruiting platform

**Standing rule:** If it's not in a done condition for Steps 0-8, it does not get built. New ideas mid-build get a ruling from Scout (YES NOW / BACKLOG / SPEC CHANGE). Chris makes the final call on any ruling that affects scope.

---

## BLOCKING RELATIONSHIPS SUMMARY

| Step | Blocked By | Blocking Agent's Gate |
|------|-----------|----------------------|
| Step 1 | Step 0 complete | Scout (Step 0 gate) |
| Step 2 | Step 1 complete (Patch declares spec done) | Scout (Step 2 gate requires Morty PASS) |
| Step 3 | Step 2 complete (schema live, Morty PASS) | Scout (Step 2 gate) |
| Step 4 | Step 3 complete (Quin specs approved by Patch) | Patch confirmation |
| Step 5 | Step 4 complete (auth flows gated by Scout) | Scout (Step 4 gate) |
| Step 6 | Step 5 complete (student experience gated by Scout) | Scout (Step 5 gate) |
| Step 7 | Step 6 complete (dashboards gated by Scout) | Scout (Step 6 gate) |
| Step 8 | Step 7 complete (all three PASS — Quin, Dexter, Morty) | Scout (Step 7 gate) |

**Morty is on the critical path twice:** Step 2 (schema audit) and Step 7 (final architecture audit). Both are hard gates. No workarounds.

**Quin is on the critical path in Steps 3, 4, 5, 6, and 7.** Test specs must precede implementation in Steps 4, 5, and 6. Quin must not be skipped or rushed.

---

## OPEN ITEMS — NOT BLOCKING ROADMAP

These items are documented for awareness but do not block Phase 1 execution:

1. **Patch spec update:** `patch-schema-auth-spec-v1.md` requires three updates based on this session's gate resolutions — (a) grit_fit_status enum correction (DEC-CFBRB-013), (b) SAID system removal from all sections (DEC-CFBRB-002), (c) file_uploads RLS counselor policy correction (DEC-CFBRB-003). Patch should update the spec before producing migration 0006.

2. **Quill UX specs pending (from task list):** UX_SPEC for coach dashboard (Task 7), counselor dashboard (Task 8, now in scope — DEC-CFBRB-004), and file upload interface (Task 9) are not yet produced. These are Step 6 dependencies — not blocking Steps 0-5 but must be delivered before Step 6 begins.

3. **Morty — grit_fit_status default confirmation:** DEC-CFBRB-013 records this as "Made" but notes Morty should confirm the approach during the Step 2 schema audit. If Morty has a different recommendation, it surfaces in the audit report before migrations are applied.

4. **OQ-2 resolved:** Coach-student link via `user_hs_programs` only (Option A). No `coach_student_links` table. This is consistent with the "is this your head coach?" UX being confirmatory only — not a new data write.

5. **OQ-1 resolved:** email_verify_tokens as dedicated table (Option A). Migration 0008 applies.

6. **grittos-org push pending:** Per standing items in MEMORY.md — grittos-org push pending (PROTO-017, DEC-042/043, JD syncs). This roadmap document should be filed there as well — Scribe routes to Vault for MASTER_INDEX entry after filing.

---

## SESSION STATUS

**All gates: CLEARED.**
**All blocking open questions: RESOLVED.**
**Decisions DEC-CFBRB-001 through DEC-CFBRB-013: Logged and ready for Scribe filing.**

This session is ready to close after:

1. Scout retro (this session was multi-agent — retro is mandatory per DEC-GLOBAL-003 / Nova Rule 5)
2. Scribe files: (a) 13 decision records in `_org/decisions/gritty-recruit-hub-rebuild/`, (b) append 13 entries to MASTER_DECISION_LOG.txt, (c) session log for this session
3. Push check: This roadmap document should be committed to the gritty-recruit-hub-rebuild repo. Check push state before session closes.
4. Rio: no version tag required at this point — v0.1.0 tags at Step 0 completion, which has not occurred yet.

**Next session pickup:** Step 0 — Git init + GitHub repo + Vercel project setup. Chris executes with Dexter support. Scout opens with PROTO-GLOBAL-015 task-open gate for Step 0.

---

*Document produced by Scout (Chief of Staff) — 2026-03-24.*
*All decisions confirmed by Chris Conroy (Operator).*
*This roadmap is the single authoritative execution plan for Phase 1 MVP.*
*Questions go to Scout first. Scout routes to the appropriate domain authority.*
