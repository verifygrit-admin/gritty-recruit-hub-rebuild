# CFB RECRUIT HUB — PHASE 1 MVP REBUILD DIRECTIVE
**Issued by:** Chris Conroy (Operator)  
**Date:** 2026-03-24  
**Status:** ACTIVE — Phase 1 Execution  
**Version:** 1.0  
**Classification:** STANDARD

---

## IMPORTANT NOTE TO THE TEAM

This document was produced from a deep design interview between Chris and Claude.ai. It represents a comprehensive set of architectural decisions, scope boundaries, and execution directives for the Phase 1 MVP rebuild of CFB Recruit Hub. Read it in full before asking any questions. Most answers are here.

Scout owns working group formation. All 14 agents should be leveraged. See the Working Groups section for full guidance.

---

## RELEVANT REPOSITORIES

| Repo | URL | Role |
|---|---|---|
| cfb-recruit-hub | https://github.com/verifygrit-admin/cfb-recruit-hub | Primary app — source for reuse |
| grittos-org | https://github.com/verifygrit-admin/grittos-org | Canonical governance |
| claude-memory | https://github.com/verifygrit-admin/claude-memory | Persistent agent memory |
| CFB-mapping | https://github.com/verifygrit-admin/CFB-mapping | Leaflet map — reuse intact |
| recruitingq-url-extract | https://github.com/verifygrit-admin/recruitingq-url-extract | Data pipeline — school URLs |
| hs-fbcoach-dash | https://github.com/verifygrit-admin/hs-fbcoach-dash | Coach dashboard reference |

## RELEVANT DATA SOURCES

| Source | URL | Role |
|---|---|---|
| GrittyOS DB (Google Sheet) | https://docs.google.com/spreadsheets/d/1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo/edit | School data source of truth (662 schools) |
| Example Student CFB Recruiting Center | https://docs.google.com/spreadsheets/d/1c7GNzuh3riV9sKVDp6WSGou4Rprtz4VgIuQ_szA0XX4/edit | Pre-offer tracking reference — Tab: 4. Pre-Offer Tracking |

## DESIGN REFERENCE

Color scheme: Chris will drop a BC High reference image into the project folder. Quill uses that image as the primary color palette reference. The current dark green/lime green palette is the baseline. Quill has full authority to propose adjustments based on the reference image.

---

## PART 1 — NARRATIVE SUMMARY OF DESIGN DECISIONS

### The Problem We're Solving

The existing CFB Recruit Hub was built iteratively without a unified auth-first architecture. The result was a system where anonymous users submitted profiles, which created an irreconcilable conflict with Supabase's Row Level Security model. Profiles couldn't be inserted with a valid `user_id` because the user didn't exist at insert time. Multiple CI failures traced back to this original design gap.

The rebuild starts from a clean Supabase project with auth-first architecture as the foundational principle. Every data relationship is anchored to an authenticated `user_id` from the moment of account creation.

### What We're Keeping From the Existing Codebase

Three components survive the rebuild intact:

**GRIT FIT Scoring Logic** — The four-gate algorithm (athletic tier match, geographic reach via Haversine distance, academic rigor scoring, financial fit via EFC table) is correct and battle-tested. It stays. No agent should modify the scoring logic without explicit operator instruction.

**Map Component** — The Leaflet.js map (`CFB-mapping` repo origin, integrated into `MapView.jsx`) with 662 schools, GrittyOS branding, and school markers stays intact. The map is the product's showpiece. It demonstrates data proficiency to any first-time visitor without requiring an account.

**QuickListForm Structure** — The form fields are largely correct. Additions: school selection dropdown (linked to `hs_programs` table) and optional parent/guardian email. No fields are removed without Quill's UX sign-off.

### The Core User Journey

There are two entry points into the app:

**Path A — Browse:** Any visitor (no account required) sees the full 662-school map. This is the hook. It demonstrates GrittyOS's data depth and college football landscape coverage. No form, no account, no friction.

**Path B — GRIT FIT:** A student-athlete creates an account, submits their profile, and receives a personalized GRIT FIT result of up to 30 schools. This is the product.

These two paths are separate from the landing screen. The student-athlete does not submit a form anonymously and then create an account. Auth comes first. Value comes immediately after.

### The GRIT FIT Flow (Authenticated)

1. Student-athlete creates account (email/password)
2. Student selects their high school from `hs_programs` dropdown
3. System looks up the head coach for that school — if found, displays: "Is [Coach Name] your head coach?" Student selects Yes (auto-links) or No (skips)
4. Student fills GRIT FIT profile form (athletic stats, academic stats, household section)
5. Account activates immediately — no parent email required for MVP
6. System runs GRIT FIT algorithm → returns up to 30 schools that pass all four gates
7. Student sees results in two views: Map View (30 schools on map) and Table View (ranked, sortable)
8. Student adds schools to their Shortlist from either view, or manually from the full 662-school map

### The GRIT FIT List vs. The Shortlist

These are two distinct data structures with different behaviors:

**GRIT FIT List** — Dynamic. Recalculates every time the student edits their profile. Returns up to 30 schools that pass all four algorithm gates at the student's current profile state. Never saved as rows — computed on demand.

**Shortlist** — Persistent. Student-curated. Can include schools from the GRIT FIT list or manually added from the full map. Does NOT auto-update when GRIT FIT recalculates. Instead, when a school on the shortlist no longer appears in the current GRIT FIT 30, it receives a warning flag explaining why (out of academic reach, below athletic tier, outside geographic reach, etc.).

Two fields are added to `short_list_items` to support this: `source` (grit_fit | manual_add) and `grit_fit_status` (currently_recommended | out_of_academic_reach | below_academic_reach | out_of_athletic_reach | below_athletic_reach). These fields update in batch whenever GRIT FIT recalculates.

### The Pre-Offer Recruiting Journey

The current boolean flags (`crm_contacted`, `crm_applied`, `crm_offer`, `crm_committed`) are replaced with a 16-step JSON recruiting journey stored in `short_list_items.recruiting_journey_steps`. Each step has a boolean completion state and a timestamp.

Reference the Google Sheet tab "4. Pre-Offer Tracking" for the exact step definitions. The 16 steps are:

1. Added to shortlist
2. Completed recruiting questionnaire
3. Completed admissions info form
4. Contacted coach via email
5. Contacted coach via social media
6. Received junior day invite
7. Received visit invite
8. Received prospect camp invite
9. School contacted student via text
10. Head coach contacted student
11. Assistant coach contacted student
12. School requested academic info (transcript)
13. School requested financial info
14. Received verbal offer
15. Received written offer

This JSON structure stored in `short_list_items` keeps related data together, avoids column bloat, and is queryable via PostgreSQL JSON operators. As a general architectural principle for this rebuild: where a set of boolean attributes belongs to a single relationship, prefer JSON over individual columns.

### The Coach View

High school coaches sign up with their own email/password account and select their school from `hs_programs`. All students at that school with `school_id` matching the coach's `school_id` appear in the coach's dashboard automatically. No manual student-coach linking required.

The coach dashboard shows:
- A roster of all linked student-athletes
- For each student: their shortlist schools
- For each school on each student's shortlist: progress through the 16-step recruiting journey
- Recruiting activity aggregated by conference/division (not individual school names) — e.g., "Engaged with 3 ACC schools, has offers from 2 FCS programs"

### The User Model

**Six user types exist in the full system.** Phase 1 MVP implements three: student-athlete, hs_coach, hs_guidance_counselor. Phase 2 adds: parent, college_coach, college_admissions_officer.

**Student-athletes are always free.** All other user types pay (monthly or annual). Payment enforcement is Phase 2. Phase 1 creates the account types without billing integration.

**School-based relationships** are derived through `school_id` — not manual linking. A coach at Boston College High School is linked to their school via `school_id`. All students who select BCHS during signup share that `school_id`. The relationship is automatic.

---

## PART 2 — STRUCTURED DECISION LOG

| Decision ID | Decision | Rationale | Phase |
|---|---|---|---|
| RB-001 | New Supabase project from scratch | Existing project has RLS policy conflicts and schema debt that would compound in a rebuild | 1 |
| RB-002 | Auth-first architecture | User must exist before profile is inserted — eliminates the RLS chicken-and-egg problem that caused 6+ CI failures | 1 |
| RB-003 | Keep GRIT FIT scoring logic intact | Algorithm is correct and battle-tested across multiple sessions | 1 |
| RB-004 | Keep map component intact | Leaflet map is the product showpiece — no changes | 1 |
| RB-005 | Keep QuickListForm structure, add school dropdown + parent email | Form fields are valid — only additive changes for Phase 1 | 1 |
| RB-006 | GRIT FIT list and shortlist are separate data structures | Shortlist is student-curated and persistent; GRIT FIT list is dynamic and computed | 1 |
| RB-007 | Shortlist does not auto-reset on profile edit | Students maintain control of their shortlist; GRIT FIT status flags update instead | 1 |
| RB-008 | 16-step recruiting journey replaces 4 boolean flags | Pre-offer tracking reference (Google Sheet Tab: 4. Pre-Offer Tracking) defines the steps | 1 |
| RB-009 | Recruiting journey stored as JSON in short_list_items | Attributes belong to one relationship; JSON avoids column bloat and is queryable | 1 |
| RB-010 | One users table with user_type enum | Shared auth needs across user types; RLS policies can be written declaratively | 1 |
| RB-011 | School-based relationship model (school_id) | Coach-student relationships derived from matching school_id — no manual linking | 1 |
| RB-012 | hs_programs table (separate from NCAA schools table) | High school programs need their own identity: name, address, conference, division, state athletic association | 1 |
| RB-013 | Parent accounts deferred to Phase 2 | Simplifies MVP auth flow; students can activate without parent confirmation | 2 |
| RB-014 | College coach accounts deferred to Phase 2 | Permission model complexity (questionnaire-gated, parent-authorized, coach-authorized) is post-MVP | 2 |
| RB-015 | Payment/billing enforcement deferred to Phase 2 | Account types created without billing integration for MVP | 2 |
| RB-016 | File upload/download via Supabase Storage | Already using Supabase for data; Storage keeps infrastructure unified. Simple upload/download with label and display for MVP | 1 |
| RB-017 | Coach sees recruiting activity aggregated by conference/division | Competitive intelligence without exposing specific school matchups | 1 |
| RB-018 | Color scheme update per BC High reference image | Quill owns palette decisions based on reference image Chris provides | 1 |
| RB-019 | All 14 agents involved in Phase 1 | Full team leveraged with Scout shaping working groups for maximum intelligence and error-catching | 1 |

---

## PART 3 — DATABASE SCHEMA

**IMPORTANT NOTE TO PATCH AND THE TEAM:** The SQL below represents the intended schema based on the design decisions above. The team has full authority to supersede this with better judgment. If Patch, Morty, or David identify improvements — column types, constraints, index strategies, RLS policy structures — make them. This is a starting point, not a mandate. Document any departures from this schema in the decision log with rationale.

### New Supabase Project

Start fresh. Do not migrate the existing project. The existing Supabase project (`oeekcafirfxgtdoocael.supabase.co`) is archived as reference only.

### Table: hs_programs

High school football programs. The identity anchor for coach-student relationships.

```sql
CREATE TABLE public.hs_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  address text,
  city text,
  state text NOT NULL,
  zip text,
  conference text,
  division text,
  state_athletic_association text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hs_programs_pkey PRIMARY KEY (id)
);
```

### Table: users (extended profile layer)

Supabase manages `auth.users`. This table extends it with app-specific fields. Linked via `user_id` to `auth.users.id`.

```sql
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('student_athlete', 'hs_coach', 'hs_guidance_counselor', 'parent', 'college_coach', 'college_admissions_officer')),
  school_id uuid REFERENCES public.hs_programs(id),
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'paused', 'pending')),
  payment_status text DEFAULT 'free' CHECK (payment_status IN ('free', 'trial', 'paid', 'expired')),
  trial_started_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_user_id_key UNIQUE (user_id)
);
```

### Table: profiles (student-athlete only)

One profile per student-athlete. Linked to `auth.users` via `user_id`. `said` generated by trigger on insert.

```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  said text UNIQUE,
  school_id uuid REFERENCES public.hs_programs(id),
  name text NOT NULL,
  high_school text,
  grad_year integer,
  state text,
  email text NOT NULL,
  phone text,
  twitter text,
  position text,
  height text,
  weight numeric,
  speed_40 numeric,
  gpa numeric,
  sat integer,
  hs_lat numeric,
  hs_lng numeric,
  agi numeric,
  dependents integer,
  expected_starter boolean DEFAULT false,
  captain boolean DEFAULT false,
  all_conference boolean DEFAULT false,
  all_state boolean DEFAULT false,
  parent_guardian_email text,
  status text DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);
```

### Table: schools (NCAA — migrated from existing project)

Migrate the existing 662-school dataset via `sync_schools.py`. Schema unchanged from existing project. `unitid` remains the universal join key.

### Table: short_list_items (updated)

```sql
CREATE TABLE public.short_list_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  said text NOT NULL,
  unitid integer NOT NULL,
  school_name text,
  div text,
  conference text,
  state text,
  match_rank integer,
  match_tier text,
  net_cost numeric,
  droi numeric,
  break_even numeric,
  adltv numeric,
  grad_rate numeric,
  coa numeric,
  dist numeric,
  q_link text,
  coach_link text,
  source text NOT NULL DEFAULT 'manual_add' CHECK (source IN ('grit_fit', 'manual_add')),
  grit_fit_status text DEFAULT 'currently_recommended' CHECK (grit_fit_status IN (
    'currently_recommended',
    'out_of_academic_reach',
    'below_academic_fit',
    'out_of_athletic_reach',
    'below_athletic_fit',
    'outside_geographic_reach'
  )),
  recruiting_journey_steps jsonb NOT NULL DEFAULT '[
    {"step_id": 1, "label": "Added to shortlist", "completed": true, "completed_at": null},
    {"step_id": 2, "label": "Completed recruiting questionnaire", "completed": false, "completed_at": null},
    {"step_id": 3, "label": "Completed admissions info form", "completed": false, "completed_at": null},
    {"step_id": 4, "label": "Contacted coach via email", "completed": false, "completed_at": null},
    {"step_id": 5, "label": "Contacted coach via social media", "completed": false, "completed_at": null},
    {"step_id": 6, "label": "Received junior day invite", "completed": false, "completed_at": null},
    {"step_id": 7, "label": "Received visit invite", "completed": false, "completed_at": null},
    {"step_id": 8, "label": "Received prospect camp invite", "completed": false, "completed_at": null},
    {"step_id": 9, "label": "School contacted via text", "completed": false, "completed_at": null},
    {"step_id": 10, "label": "Head coach contacted student", "completed": false, "completed_at": null},
    {"step_id": 11, "label": "Assistant coach contacted student", "completed": false, "completed_at": null},
    {"step_id": 12, "label": "School requested transcript", "completed": false, "completed_at": null},
    {"step_id": 13, "label": "School requested financial info", "completed": false, "completed_at": null},
    {"step_id": 14, "label": "Received verbal offer", "completed": false, "completed_at": null},
    {"step_id": 15, "label": "Received written offer", "completed": false, "completed_at": null}
  ]'::jsonb,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT short_list_items_pkey PRIMARY KEY (id)
);
```

### Table: file_uploads

Student file uploads per school (stored in Supabase Storage, metadata here).

```sql
CREATE TABLE public.file_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  said text NOT NULL,
  unitid integer,
  file_name text NOT NULL,
  file_label text,
  storage_path text NOT NULL,
  file_type text,
  file_size_bytes integer,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT file_uploads_pkey PRIMARY KEY (id)
);
```

### RLS Policy Approach

All tables require RLS enabled. Core principles:

- Students can only read/write their own rows (matched by `user_id` or `said`)
- Coaches can read profiles and short_list_items for students where `profiles.school_id = coach.school_id`
- No anonymous inserts on any table — all inserts require authenticated session
- Service role used only in Edge Functions, never in browser bundle

**Patch owns RLS policy implementation.** The above is directional. Patch writes the actual policy SQL.

### SAID System

Retain the `generate_said()` trigger pattern from the existing codebase. `said` is generated on `profiles` insert. It is embedded in `auth.users.user_metadata` via `linkSaidToAuth()` after profile creation. The `auth_said()` RPC extracts it for RLS enforcement on `short_list_items`.

---

## PART 4 — AUTH FLOW SPECIFICATION

**Morty owns implementation. This is directional.**

### Student-Athlete Signup Flow

```
1. User arrives at signup screen
2. Enters email + password
3. Supabase creates auth.users record → user_id generated
4. App inserts row into public.users (user_type: student_athlete, account_status: active)
5. Student selects high school from hs_programs dropdown
   → school_id written to public.users and public.profiles
6. System queries hs_programs for head coach (user_type: hs_coach, school_id match)
   → If found: display "Is [Coach Name] your head coach?"
     → Yes: junction record created (coach_id linked to student user_id)
     → No: skip
7. Student fills GRIT FIT profile form
   → Optional: parent_guardian_email field
8. On form submit:
   → Insert into public.profiles (user_id populated — auth-first, no RLS conflict)
   → generate_said() trigger fires → said assigned
   → linkSaidToAuth() called → said written to user_metadata
9. GRIT FIT algorithm runs → returns up to 30 schools
10. Student sees Map View and Table View of results
```

### High School Coach Signup Flow

```
1. Coach arrives at signup screen (separate coach signup path)
2. Enters email + password
3. Supabase creates auth.users record
4. App inserts row into public.users (user_type: hs_coach)
5. Coach selects school from hs_programs dropdown
   → school_id written to public.users
6. Account active immediately
7. Coach dashboard shows all students with matching school_id
```

### Session Restore Flow

```
1. User signs in → Supabase auth session established
2. App calls auth_said() → extracts said from user_metadata
3. If said exists → fetch profile → run GRIT FIT → restore results
4. If said missing → route to profile form (new user or incomplete signup)
```

### Critical Auth Rules

- **No anonymous profile inserts.** Every insert into `profiles` requires a valid `auth.users` session. `user_id` must be populated at insert time.
- **getSession() not getUser() for user_id retrieval.** `getUser()` makes a network call that can fail or clear the session in CI. `getSession()` reads from local memory. This was validated in the existing codebase after multiple CI failures.
- **Edge Functions for any server-side operations.** No service role key in the browser bundle. Ever.

---

## PART 5 — PHASE 1 SCOPE

### IN SCOPE — Phase 1 MVP

- New Supabase project with clean schema
- Student-athlete account creation with school selection and coach auto-link
- GRIT FIT scoring (reused from existing codebase)
- Up to 30 school results in Map View and Table View
- Shortlist with source/grit_fit_status tracking
- 16-step recruiting journey JSON per shortlist item
- Coach dashboard: student roster + shortlist progress + recruiting activity summary
- File upload/download via Supabase Storage (labeled, displayed)
- Color scheme refresh per BC High reference image
- Playwright regression tests covering all core flows
- GitHub Actions CI pipeline

### OUT OF SCOPE — Phase 2 (do not build, do not scope, do not discuss in Phase 1 sessions)

- Parent accounts and parent-student linking
- College coach accounts and permission-gated access
- College admissions officer accounts
- High school guidance counselor accounts (beyond basic account creation)
- Batch upload of student profiles by coaches
- Payment/billing/subscription enforcement
- Email notifications (beyond existing Supabase Edge Functions)
- Historical profile versioning and audit log
- Advanced reporting and analytics dashboard
- Multi-school coach accounts
- Mobile app
- Desktop app
- Integration with Hudl, SCOIR, Canvas, ARMS, Sidearm, JumpForward, FrontRush, RecruitSpot, PrestoSports, TFAForms, ARI

---

## PART 6 — WORKING GROUPS

### Scout's Directive

**Scout owns working group formation for Phase 1.** The groups below are recommended starting points. Scout has full authority to reshape them, add agents to groups, move agents between groups, create new groups, or dissolve groups that don't make sense in practice.

**Core principle:** All 14 agents should be meaningfully involved. This is not about token efficiency at the expense of intelligence. A well-placed agent catching a mistake early saves far more than the token cost of their involvement. Be economical, but be complete. Every agent on the roster has domain expertise that can improve this build.

### Recommended Working Groups

**Group 1 — Database & Schema (Blocking — starts first)**
- **Patch** (owner — all schema decisions, RLS policies, Edge Functions, Supabase Storage setup)
- **David** (data — populate hs_programs with high school program data, migrate schools table from existing project)
- **Morty** (audit — review schema for architectural soundness before any app code is written)
- **Scout** (gate — no app development begins until Morty signs off on schema)

**Group 2 — Auth & User Flow**
- **Morty** (owner — student signup flow, coach signup flow, session restore, getSession() implementation)
- **Dexter** (platform — CI configuration for new project, environment variable setup, Playwright config)
- **Quin** (QA — write auth flow tests before implementation, define done conditions)
- **Patch** (support — RLS policies that auth flows depend on)

**Group 3 — Student Experience**
- **Nova** (owner — GRIT FIT integration, Map View, Table View, Shortlist, recruiting journey UI)
- **Quill** (UX/UI — all interface decisions, color scheme implementation, component design, layout)
- **Quin** (QA — regression tests for student flows)
- **Sage** (advisory — pressure-test UX decisions against recruiting domain knowledge)

**Group 4 — Coach Dashboard**
- **Nova** (owner — coach dashboard implementation)
- **Quill** (UX/UI — coach view design, recruiting activity display, student roster layout)
- **David** (data — recruiting activity aggregation queries by conference/division)
- **Quin** (QA — coach view regression tests)

**Group 5 — Governance, Documentation & Version Control**
- **Scout** (compliance — gates all source-of-truth writes, monitors scope creep)
- **Scribe** (documentation — session logs, decision files, spec history)
- **Vault** (archival — MASTER_INDEX sync, file retention)
- **Rio** (versioning — semantic version tagging, release management)
- **Lumen** (efficiency — periodic context audits, token optimization between sessions)
- **Meridian** (architecture — available for structural governance questions as they arise)

### Domain Authority (Who Has Final Say on What)

| Domain | Authority | No One Else Does This Without Asking |
|---|---|---|
| Database schema and migrations | Patch | No agent modifies Supabase schema without Patch's sign-off |
| Auth flow logic | Morty | No agent writes auth code without Morty's review |
| UX/UI decisions | Quill | No agent makes layout or color decisions without Quill's sign-off |
| GRIT FIT scoring logic | Nova + Chris | Algorithm changes require operator confirmation |
| Deployment and version tagging | Rio | Only Rio pushes tags and manages releases |
| Source-of-truth writes | Scout gate | All canonical governance file writes require Scout clearance |
| Data integrity and population | David | School data, hs_programs population, migration queries |
| Test specification and done conditions | Quin | Quin defines what "done" means before implementation begins |
| Platform health and CI | Dexter | CI configuration, GitHub Actions, environment variables |

### What Agents Are NOT Doing in Phase 1

This is as important as what they are doing.

- **Nova** does not make database schema decisions. Nova executes confirmed schema.
- **Morty** does not write frontend components. Morty audits architecture and owns auth logic.
- **Patch** does not write React components. Patch owns Supabase — schema, RLS, Edge Functions, Storage.
- **Dexter** does not write application code. Dexter owns CI, platform health, and diagnostic tooling.
- **Quill** does not implement components. Quill designs and specifies. Nova implements.
- **Quin** does not fix bugs. Quin defines test specs and done conditions. Fixing is Nova's job.
- **Rio** does not build features. Rio tags versions after Dexter confirms green CI.
- **Scout** does not write code. Scout gates, monitors, and governs.
- **Lumen** does not run during active build sessions unless invoked. Lumen runs at session open or when context feels heavy.
- **Meridian** is not invoked for routine questions. Meridian is invoked when something structural needs to be reconsidered.
- **Sage** does not make technical decisions. Sage advises on recruiting domain and strategic direction.
- **Scribe** does not make decisions. Scribe files them.
- **Vault** does not make decisions. Vault retrieves and archives them.
- **David** does not write application code. David owns data queries, population scripts, and integrity checks.

---

## PART 7 — CRITICAL PATH

The blocking dependency chain for Phase 1:

```
Step 1: Patch creates new Supabase project + schema (BLOCKS EVERYTHING)
        ↓
Step 2: David populates hs_programs table
        Morty audits schema (parallel with Step 2)
        ↓
Step 3: Scout gates schema (Morty sign-off required)
        ↓
Step 4: Morty builds auth flows (student signup, coach signup, session restore)
        Dexter configures CI for new project (parallel)
        Quin writes auth test specs (parallel)
        ↓
Step 5: Nova integrates GRIT FIT with new auth/schema
        Quill designs student experience components (parallel)
        ↓
Step 6: Nova builds coach dashboard
        Quill designs coach view (parallel)
        ↓
Step 7: Quin runs full regression suite
        Dexter confirms CI green
        ↓
Step 8: Rio tags v1.0.0
        Scout closes session
```

---

## PART 8 — CONVERSATION TRANSCRIPT SUMMARY

*This section summarizes the key exchanges from the design interview between Chris and Claude.ai that produced this document. It provides context for decisions that might otherwise seem arbitrary.*

**On why we're rebuilding from scratch:** The existing app was built iteratively without a unified architecture. The RLS/auth conflict that caused 6+ CI failures wasn't a fixable bug — it was a symptom of anonymous-first design that was never reconciled with Supabase's security model. The rebuild addresses the root cause, not the symptom.

**On the two entry points:** Chris was clear that anonymous browsing of the map is a feature, not a gap. The map demonstrates data proficiency and serves as the product hook for visitors who haven't committed to creating an account. The GRIT FIT product is behind auth. These are intentional product decisions.

**On the GRIT FIT list vs. shortlist distinction:** Chris explicitly rejected the idea that editing a profile should reset the shortlist. Students worked hard to identify their target schools. The GRIT FIT list updates; the shortlist is theirs to manage. Warning flags on out-of-range schools preserve the intelligence of the algorithm without overriding student agency.

**On the pre-offer tracking steps:** The four boolean flags in the current app were never what Chris envisioned. The Google Sheet has always had 15 specific steps. The rebuild implements those steps correctly as a JSON array.

**On the coach-student relationship:** Chris made a legally significant point about minors in the recruiting process. College coaches should not have open access to student profiles. Students, parents, or high school coaches must authorize college coach visibility. This is a compliance decision, not just a UX decision. Phase 2 must implement this correctly.

**On the school_id model:** Rather than manually linking coaches to students, the relationship is derived from a shared `school_id`. This scales naturally — a coach at any school sees all their students automatically. It also enables guidance counselors to be added to the same school without additional linking logic.

**On all 14 agents:** Chris was explicit that he wants the full team involved, even if it costs some tokens. The intelligence dividend of catching mistakes early outweighs the token cost of broader participation. Scout has authority to shape the groups. The principle is: leverage everyone's expertise, be economical about how, but don't leave resources on the table.

---

*Document ends. Questions go to Scout first. Scout routes to the appropriate domain authority.*
