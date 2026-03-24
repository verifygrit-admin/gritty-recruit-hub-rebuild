# PATCH SPEC — Schema, Auth Flow, and RLS
**Owner:** Patch (GAS Engineer / Schema + Auth Build Owner for Phase 1 MVP)
**Date:** 2026-03-24
**Status:** DRAFT — Pending Morty Audit
**Version:** 1.0
**Supabase project:** NEW (separate from oeekcafirfxgtdoocael.supabase.co — that project is archived)

---

## 0. SCOPE NOTE

Chris designated Patch as auth flow builder and schema owner for this rebuild. Morty retains audit authority. This spec covers:

1. Updated schema (all Q3/Q6/Q7/Q9/Q10/Q11/Q12/Q13 answers incorporated)
2. Auth flow spec (seeded accounts, admin activation, email verification)
3. RLS policy spec (per-role read/write rules, financial aid exclusion)
4. Schema improvements confirmed by Chris's answers
5. Open questions that must be answered before implementation begins

---

## 1. DIRECTIVE DISCREPANCY — JOURNEY STEP COUNT

The directive narrative (Part 1) says "16-step recruiting journey" in two places. The journey step list enumerates 15 steps (numbered 1–15). The JSON default in the schema also has 15 entries. Chris's answer to Q3 confirms: **15 steps. The SQL schema is correct as-is.**

Resolution: All references in this spec use 15 steps. The narrative "16-step" language in the directive is an error. Scribe should log this as a documentation correction. No schema change required — the directive's own SQL is already correct.

---

## 2. UPDATED SCHEMA

### 2.1 Changes Applied from Chris's Answers

| Question | Answer | Schema Impact |
|----------|--------|---------------|
| Q3 | 15 steps confirmed | No change — directive SQL already correct |
| Q6 | Coach accounts seeded + admin-activated; only 2 for MVP | `account_status` DEFAULT changes to `'pending'`; admin activation field added |
| Q7 | All MVP accounts seeded + admin-activated; email verification via Resend click-to-verify | `email_verified` field added to `users`; `email_verify_token` + expiry on auth side |
| Q9 | `school_id` removed from `users` table; junction table for hs_program links | New table: `user_hs_programs`; `school_id` removed from `users` |
| Q10 | `said` removed from `short_list_items` and `file_uploads`; `user_id` is sole identity key | `said` columns dropped from both tables |
| Q11 | `document_type` field on `file_uploads`; RLS enforces coach visibility exclusion on `financial_aid` | `document_type` enum added; coach RLS policy filters on this field |
| Q12 | Guidance counselor: signup flow + dashboard in Phase 1; 3 accounts, seeded, admin-activated | Guidance counselors follow same admin-activation pattern; `hs_guidance_counselors_schools` junction table added |
| Q13 | Three junction tables: coaches-to-schools, guidance-counselors-to-schools, users-to-hs-programs | Three new tables specified below |

---

### 2.2 Table: `hs_programs` (no changes from directive)

```sql
CREATE TABLE public.hs_programs (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  school_name    text NOT NULL,
  address        text,
  city           text,
  state          text NOT NULL,
  zip            text,
  conference     text,
  division       text,
  state_athletic_association text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_programs_pkey PRIMARY KEY (id)
);
```

**Patch note:** For MVP, only BC High is seeded. David owns population. A `UNIQUE (school_name, state)` constraint is recommended — see Section 4.

---

### 2.3 Table: `users` (UPDATED — school_id removed; admin activation fields added)

```sql
CREATE TABLE public.users (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type       text NOT NULL CHECK (user_type IN (
                    'student_athlete',
                    'hs_coach',
                    'hs_guidance_counselor',
                    'parent',
                    'college_coach',
                    'college_admissions_officer'
                  )),
  -- school_id REMOVED per Q9 — school linkage lives in junction tables
  account_status  text NOT NULL DEFAULT 'pending' CHECK (account_status IN (
                    'active',
                    'paused',
                    'pending'
                  )),
  email_verified  boolean NOT NULL DEFAULT false,
  activated_by    uuid REFERENCES auth.users(id),  -- admin user_id who activated
  activated_at    timestamptz,
  payment_status  text DEFAULT 'free' CHECK (payment_status IN (
                    'free', 'trial', 'paid', 'expired'
                  )),
  trial_started_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login      timestamptz,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_user_id_key UNIQUE (user_id)
);
```

**Changes from directive:**
- `school_id` removed (Q9)
- `account_status` DEFAULT changed to `'pending'` — all MVP accounts start pending, admin activates
- `email_verified` added (Q7)
- `activated_by` + `activated_at` added (Q6, Q7, Q12 — admin activation audit trail)

---

### 2.4 Table: `user_hs_programs` (NEW — general user-to-high-school junction, Q9 + Q13)

Links any user (student, coach, counselor) to one or more hs_programs rows. Replaces `school_id` on the `users` table.

```sql
CREATE TABLE public.user_hs_programs (
  id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_program_id uuid NOT NULL REFERENCES public.hs_programs(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN (
                'student_athlete',
                'hs_coach',
                'hs_guidance_counselor'
              )),
  is_primary  boolean NOT NULL DEFAULT true,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_hs_programs_pkey PRIMARY KEY (id),
  CONSTRAINT user_hs_programs_user_program_role_key UNIQUE (user_id, hs_program_id, role)
);
```

**Design note:** A single junction table covers all three role types (Q13 asked for three tables — coaches-to-schools, counselors-to-schools, users-to-schools). One table with a `role` column is cleaner and avoids three nearly identical tables with identical RLS patterns. The `role` column enforces the same type safety. Morty should confirm this approach or flag if separate tables are preferred for auditability.

**`is_primary` flag:** For MVP, every user has one school. Flag exists for Phase 2 multi-school coach support.

---

### 2.5 Table: `profiles` (UPDATED — `said` retained; `school_id` reference updated)

`said` stays on profiles. It was removed from `short_list_items` and `file_uploads` (Q10), not from `profiles`.

```sql
CREATE TABLE public.profiles (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  said                text UNIQUE,
  -- school linkage is now via user_hs_programs; high_school text field retained for display
  name                text NOT NULL,
  high_school         text,           -- display label; authoritative link is user_hs_programs
  grad_year           integer,
  state               text,
  email               text NOT NULL,
  phone               text,
  twitter             text,
  position            text,
  height              text,
  weight              numeric,
  speed_40            numeric,
  gpa                 numeric,
  sat                 integer,
  hs_lat              numeric,
  hs_lng              numeric,
  agi                 numeric,
  dependents          integer,
  expected_starter    boolean DEFAULT false,
  captain             boolean DEFAULT false,
  all_conference      boolean DEFAULT false,
  all_state           boolean DEFAULT false,
  parent_guardian_email text,
  status              text DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);
```

**Change from directive:** `school_id` column removed from profiles. The authoritative school link lives in `user_hs_programs`. The `high_school` text field is kept as a display label (scored by GRIT FIT, shown in coach dashboard) but is not used as a foreign key relationship.

**`said` trigger:** `generate_said()` fires on INSERT. Pattern inherited from existing codebase. `linkSaidToAuth()` writes said to `auth.users.user_metadata` after insert.

---

### 2.6 Table: `schools` (NCAA — unchanged from directive)

662-school dataset migrated via `sync_schools.py` from the existing project. `unitid` remains the universal join key. Schema unchanged.

---

### 2.7 Table: `short_list_items` (UPDATED — `said` removed; 15-step journey confirmed)

```sql
CREATE TABLE public.short_list_items (
  id                      bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- said REMOVED per Q10 — user_id is the sole identity key
  unitid                  integer NOT NULL,
  school_name             text,
  div                     text,
  conference              text,
  state                   text,
  match_rank              integer,
  match_tier              text,
  net_cost                numeric,
  droi                    numeric,
  break_even              numeric,
  adltv                   numeric,
  grad_rate               numeric,
  coa                     numeric,
  dist                    numeric,
  q_link                  text,
  coach_link              text,
  source                  text NOT NULL DEFAULT 'manual_add' CHECK (source IN ('grit_fit', 'manual_add')),
  grit_fit_status         text DEFAULT 'currently_recommended' CHECK (grit_fit_status IN (
                            'currently_recommended',
                            'out_of_academic_reach',
                            'below_academic_fit',
                            'out_of_athletic_reach',
                            'below_athletic_fit',
                            'outside_geographic_reach'
                          )),
  recruiting_journey_steps jsonb NOT NULL DEFAULT '[
    {"step_id": 1,  "label": "Added to shortlist",                        "completed": true,  "completed_at": null},
    {"step_id": 2,  "label": "Completed recruiting questionnaire",         "completed": false, "completed_at": null},
    {"step_id": 3,  "label": "Completed admissions info form",             "completed": false, "completed_at": null},
    {"step_id": 4,  "label": "Contacted coach via email",                  "completed": false, "completed_at": null},
    {"step_id": 5,  "label": "Contacted coach via social media",           "completed": false, "completed_at": null},
    {"step_id": 6,  "label": "Received junior day invite",                 "completed": false, "completed_at": null},
    {"step_id": 7,  "label": "Received visit invite",                      "completed": false, "completed_at": null},
    {"step_id": 8,  "label": "Received prospect camp invite",              "completed": false, "completed_at": null},
    {"step_id": 9,  "label": "School contacted student via text",          "completed": false, "completed_at": null},
    {"step_id": 10, "label": "Head coach contacted student",               "completed": false, "completed_at": null},
    {"step_id": 11, "label": "Assistant coach contacted student",          "completed": false, "completed_at": null},
    {"step_id": 12, "label": "School requested transcript",                "completed": false, "completed_at": null},
    {"step_id": 13, "label": "School requested financial info",            "completed": false, "completed_at": null},
    {"step_id": 14, "label": "Received verbal offer",                      "completed": false, "completed_at": null},
    {"step_id": 15, "label": "Received written offer",                     "completed": false, "completed_at": null}
  ]'::jsonb,
  added_at                timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_list_items_pkey PRIMARY KEY (id),
  CONSTRAINT short_list_items_user_unitid_key UNIQUE (user_id, unitid)
);
```

**Changes from directive:**
- `said` column removed (Q10)
- `UNIQUE (user_id, unitid)` constraint added — prevents duplicate school entries per student (confirmed improvement from earlier recommendation)
- Journey step count: 15 (Q3 confirmed)

---

### 2.8 Table: `file_uploads` (UPDATED — `said` removed; `document_type` added)

```sql
CREATE TABLE public.file_uploads (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- said REMOVED per Q10
  unitid           integer,           -- nullable: some files are profile-level, not school-specific
  file_name        text NOT NULL,
  file_label       text,
  storage_path     text NOT NULL,
  document_type    text NOT NULL CHECK (document_type IN (
                     'transcript',
                     'senior_course_list',
                     'writing_example',
                     'student_resume',
                     'school_profile_pdf',
                     'sat_act_scores',
                     'financial_aid_info'
                   )),
  file_type        text,              -- MIME type
  file_size_bytes  integer,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_uploads_pkey PRIMARY KEY (id)
);
```

**Changes from directive:**
- `said` column removed (Q10)
- `document_type` enum added (Q11) — drives RLS coach visibility rule
- Document types per Q11: transcript, senior_course_list, writing_example, student_resume, school_profile_pdf, sat_act_scores, financial_aid_info
- `unitid` kept nullable — some files (e.g., student_resume) are not school-specific

---

### 2.9 Summary: Tables in Phase 1 Schema

| Table | Status | Notes |
|-------|--------|-------|
| `hs_programs` | New (directive) | BC High only for MVP |
| `users` | New (updated) | `school_id` removed; admin activation fields added |
| `user_hs_programs` | New (Q9/Q13) | Single junction replacing three separate tables |
| `profiles` | New (updated) | `school_id` removed; `said` retained |
| `schools` | Migrated | 662 NCAA schools; unchanged schema |
| `short_list_items` | New (updated) | `said` removed; unique constraint added; 15-step journey |
| `file_uploads` | New (updated) | `said` removed; `document_type` added |

---

## 3. AUTH FLOW SPEC

### 3.1 Core Principle

All MVP accounts (student, coach, guidance counselor) are seeded and admin-activated. There is no self-service signup flow in MVP. Email verification is still required — Chris wants users to verify ownership of their domain email address before the account becomes active.

### 3.2 Account Lifecycle (All User Types)

```
SEEDED STATE
  ↓
Chris creates auth.users record via Supabase Auth Admin API
Chris inserts row into public.users (account_status: 'pending', email_verified: false)
Chris links user to hs_programs via user_hs_programs table
  ↓
EMAIL VERIFICATION
  ↓
App sends verification email via Resend (noreply@grittyfb.com)
  Subject: "Verify your GrittyFB account"
  Body: click-to-verify link → Edge Function endpoint
  Token: UUID stored in auth.users.user_metadata (or a dedicated tokens table — see Q below)
  Expiry: 24 hours
  ↓
User clicks link → Edge Function validates token + expiry
  → Sets public.users.email_verified = true
  → Does NOT set account_status = 'active' (admin step is separate)
  ↓
ADMIN ACTIVATION (separate step, performed by Chris)
  ↓
Chris sets account_status = 'active' in public.users
Chris sets activated_by = chris_user_id, activated_at = now()
  ↓
ACTIVE STATE — user can sign in and access the app
```

### 3.3 Sign-In Flow

```
User enters email + password
  ↓
Supabase auth.signInWithPassword()
  ↓
App checks public.users:
  - email_verified = false → show "Please verify your email" screen
  - account_status = 'pending' → show "Your account is awaiting activation" screen
  - account_status = 'active' → proceed
  ↓
App calls getSession() (NOT getUser()) to retrieve user_id
  ↓
Route by user_type:
  - student_athlete → profile check → GRIT FIT flow
  - hs_coach → coach dashboard
  - hs_guidance_counselor → counselor dashboard
```

**Critical rule inherited from existing codebase:** Use `getSession()` not `getUser()`. `getUser()` makes a network call that can fail or clear the session in CI. `getSession()` reads from local memory. This was a documented CI failure cause in the prior project.

### 3.4 Email Verification Implementation

- **Sender:** noreply@grittyfb.com via Resend (API key already stored; domain verified)
- **Delivery:** Edge Function — `send-verify-email`
- **Token storage:** Recommendation is a dedicated table `email_verify_tokens` rather than stuffing tokens into `auth.users.user_metadata`. Keeps auth metadata clean. See Open Question OQ-1.
- **Verify endpoint:** Edge Function — `verify-email` — receives token query param, validates, updates `public.users.email_verified`
- **Resend on expiry:** Admin can trigger a resend. Same Edge Function, new token + expiry.

### 3.5 Student-Athlete Session Restore

```
User returns → getSession() → user_id present
  ↓
Query public.users for user_type + account_status
  ↓
Query profiles by user_id → check said in user_metadata
  ↓
If said present in user_metadata AND profiles row exists:
  → Run GRIT FIT → restore results + shortlist
If said missing OR profiles row missing:
  → Route to profile form (incomplete signup)
```

### 3.6 Coach Head Coach Auto-Link

When a student selects their high school during profile setup:
1. Query `user_hs_programs` for users with `role = 'hs_coach'` at the same `hs_program_id`
2. If exactly one coach found: display "Is [coach name] your head coach?"
   - Yes: insert into `coach_student_links` junction (see OQ-2 — this table was not in the directive schema; clarification needed)
   - No: skip
3. If zero or multiple coaches found: skip prompt

---

## 4. RLS POLICY SPEC

All tables: RLS enabled. No anonymous inserts on any authenticated table.

### 4.1 `users` table

```
SELECT: user can read their own row (auth.uid() = user_id)
INSERT: Edge Function with service role only (seeded by admin — no browser insert)
UPDATE: service role only (account_status, email_verified not user-writable)
DELETE: service role only
```

### 4.2 `profiles` table

```
SELECT (student):   auth.uid() = user_id
SELECT (coach):     profiles.user_id IN (
                      SELECT uhp_student.user_id FROM user_hs_programs uhp_student
                      JOIN user_hs_programs uhp_coach ON uhp_student.hs_program_id = uhp_coach.hs_program_id
                      WHERE uhp_coach.user_id = auth.uid()
                      AND uhp_coach.role = 'hs_coach'
                    )
SELECT (counselor): same join pattern as coach, role = 'hs_guidance_counselor'
INSERT:             auth.uid() = user_id (student inserts own profile post-auth)
UPDATE:             auth.uid() = user_id (student updates own profile only)
DELETE:             service role only
```

### 4.3 `short_list_items` table

```
SELECT (student):   auth.uid() = user_id
SELECT (coach):     user_id IN (same school-join subquery as profiles coach policy)
SELECT (counselor): user_id IN (same school-join subquery, counselor role)
INSERT:             auth.uid() = user_id
UPDATE:             auth.uid() = user_id
DELETE:             auth.uid() = user_id
```

### 4.4 `file_uploads` table (CRITICAL — financial_aid_info exclusion)

```
SELECT (student):   auth.uid() = user_id
                    (student sees ALL their own files including financial_aid_info)

SELECT (coach):     user_id IN (school-join subquery)
                    AND document_type != 'financial_aid_info'
                    -- coaches CANNOT see financial aid documents under any condition

SELECT (counselor): user_id IN (school-join subquery)
                    AND document_type != 'financial_aid_info'
                    -- counselors also excluded from financial aid documents
                    -- NOTE: Q11 said "Coach can see everything EXCEPT Financial Aid Info"
                    -- Chris did not specify counselor visibility on financial_aid_info
                    -- This spec applies the same exclusion to counselors — see OQ-3

INSERT:             auth.uid() = user_id
UPDATE:             auth.uid() = user_id (rename/relabel)
DELETE:             auth.uid() = user_id
```

### 4.5 `user_hs_programs` table

```
SELECT: auth.uid() = user_id (each user reads their own school links)
        OR role = 'hs_coach' and same hs_program_id (coach can see who is at their school)
        -- exact policy: TBD pending OQ-2 resolution
INSERT: service role only (seeded; no self-service in MVP)
UPDATE: service role only
DELETE: service role only
```

### 4.6 `hs_programs` table

```
SELECT: public (anon + authenticated) — school list visible to anyone for dropdown
INSERT: service role only
UPDATE: service role only
DELETE: service role only
```

### 4.7 `schools` (NCAA schools table)

```
SELECT: public (anon + authenticated) — map and scoring work without auth
INSERT: service role only (populated by sync_schools.py)
UPDATE: service role only
DELETE: service role only
```

### 4.8 Supabase Storage RLS (file_uploads bucket)

Storage bucket: `recruit-files`

```
Upload (INSERT):  authenticated, path must match user_id prefix: {user_id}/*
Download (SELECT):
  - Student: path prefix matches their user_id
  - Coach: underlying file_uploads row passes the coach SELECT policy (non-financial-aid)
  - Counselor: same as coach
Download (financial_aid_info): student only — no coach/counselor download path
```

---

## 5. CONFIRMED SCHEMA IMPROVEMENTS

These are the improvements I flagged in earlier analysis that are now confirmed by Chris's answers:

| Improvement | Where Applied | Reason |
|-------------|--------------|--------|
| `UNIQUE (user_id, unitid)` on `short_list_items` | Section 2.7 | Prevents duplicate school entries per student; was recommended, now applied |
| `document_type` enum on `file_uploads` | Section 2.8 | Enables RLS policy to filter on type; required by Q11 |
| `account_status` DEFAULT `'pending'` | Section 2.3 | All accounts start pending; prevents access before admin activation |
| `activated_by` + `activated_at` audit trail | Section 2.3 | Admin activation audit; no equivalent in directive schema |
| Single `user_hs_programs` junction vs. three separate tables | Section 2.4 | Identical RLS pattern on three tables is maintenance overhead; single table with `role` column is cleaner |
| `UNIQUE (school_name, state)` on `hs_programs` | Recommended but NOT yet applied | Prevents duplicate school entries; recommended for Morty review before applying |
| `is_primary` flag on `user_hs_programs` | Section 2.4 | Phase 2 multi-school coach support; zero-cost to add now |
| Remove `said` from `short_list_items` and `file_uploads` | Sections 2.7, 2.8 | Q10 confirmed; `user_id` is sole identity key; `said` only stays on `profiles` |

---

## 6. OPEN QUESTIONS (DO NOT PROCEED WITHOUT ANSWERS)

### OQ-1 — Email verification token storage

**Question:** Where do we store the email verification token and expiry?

**Option A:** Dedicated table `email_verify_tokens (id, user_id, token, expires_at, used_at)`. Clean separation, easy to expire old tokens, full audit trail.

**Option B:** `auth.users.user_metadata` — token written via Auth Admin API. Simpler, no extra table, but mixes app tokens into auth metadata. Not easily queryable for expiry cleanup.

**Recommendation:** Option A. One small table, clean separation, queryable. The existing codebase used user_metadata for SAID and it created complexity we are deliberately leaving behind.

**Blocking:** Yes — Edge Function `send-verify-email` and `verify-email` cannot be written until storage location is confirmed.

---

### OQ-2 — Coach-student explicit link table

**Question:** The directive auth flow (Part 4, Step 6) describes a junction record being created when a student confirms "Yes, [Coach Name] is my head coach." What table holds this link?

The directive schema does not include a `coach_student_links` table. The school-based relationship model (shared `hs_program_id` via `user_hs_programs`) already implicitly links coaches and students at the same school. The explicit "is this your coach?" confirmation step would need somewhere to live.

**Option A:** Rely entirely on `user_hs_programs`. If coach and student share `hs_program_id`, the relationship exists. The "is this your coach?" confirmation is a UX moment only — no additional row written.

**Option B:** Dedicated `coach_student_links (coach_user_id, student_user_id, confirmed_at)` table. Captures explicit student confirmation. Useful if a student attends a school with multiple coaches and needs to distinguish between them.

**Recommendation:** Option A for MVP. The "is this your coach?" prompt is confirmatory UX — not a new data relationship. The school-based link is sufficient for coach dashboard visibility. Option B becomes relevant in Phase 2 if multi-coach scenarios appear.

**Blocking:** Yes for the auth flow spec — need to know if RLS for coach-student visibility depends on `user_hs_programs` alone or requires a separate link table.

---

### OQ-3 — Guidance counselor visibility on financial_aid_info files

**Question:** Q11 states "Coach can see everything EXCEPT Financial Aid Info." It does not specify guidance counselor visibility on financial aid documents.

**Option A:** Counselors also excluded from `financial_aid_info` (same rule as coaches). This spec currently implements Option A.

**Option B:** Counselors CAN see financial aid documents (they may need this for college advising work).

**Blocking:** Yes — the `file_uploads` RLS policy for `hs_guidance_counselor` role depends on this answer.

---

### OQ-4 — Guidance counselor dashboard scope

**Question:** Q12 says guidance counselors get a signup flow and dashboard in Phase 1. What does the counselor dashboard show?

The directive's Working Groups section does not define the counselor dashboard scope separately from the coach dashboard. The coach dashboard is well-specified (student roster, shortlist progress, recruiting activity by conference/division).

Does the counselor dashboard show:
- Same as coach dashboard (full student roster view at their school)?
- Different view (e.g., college application status, academic tracking)?
- A reduced view (student list with shortlists, no recruiting journey details)?

**Blocking:** Yes for Nova's Group 3/4 work and Quill's component design. Not blocking for schema or RLS (counselor SELECT policy is the same join pattern as coach regardless of what data is displayed).

---

### OQ-5 — `said` system for the rebuild

**Question:** The directive retains `said` (GRIT-[year]-[NNNN]) on `profiles` via a `generate_said()` trigger and `linkSaidToAuth()` post-insert call. Chris's Q10 answer removes `said` from `short_list_items` and `file_uploads`. This means `said` is now only on `profiles`.

Given that `user_id` is the sole identity key everywhere else, is `said` still needed at all? Or is it retained only as a human-readable student identifier for the coach dashboard and external communications?

**This is not a blocking question** — the directive explicitly retains `said` on `profiles` and the `auth_said()` RPC. I am flagging it for Chris's awareness in case there is a desire to simplify further. No schema change is proposed here without explicit instruction.

---

## 7. WHAT DOES NOT CHANGE

These items are confirmed by the directive and Chris's answers. No agent should modify them without explicit operator instruction:

- GRIT FIT scoring logic (four-gate algorithm, `scoring.js`) — reused intact
- Map component (Leaflet.js, `MapView.jsx`) — reused intact
- `schools` table schema — migrated unchanged from existing project
- `auth_said()` RPC — retained for session restore
- `generate_said()` trigger on `profiles` — retained
- `getSession()` (not `getUser()`) for client-side auth — enforced in all Edge Functions and browser code

---

## 8. MIGRATION FILE PLAN

Once Open Questions OQ-1 through OQ-3 are answered, migrations will be produced in this order:

```
0001_hs_programs.sql             — hs_programs table
0002_users_extended.sql          — public.users table (no school_id)
0003_user_hs_programs.sql        — junction table
0004_profiles.sql                — profiles table + generate_said trigger + linkSaidToAuth function
0005_schools.sql                 — NCAA schools table (migrated via sync_schools.py)
0006_short_list_items.sql        — short_list_items (no said, unique constraint, 15-step JSON)
0007_file_uploads.sql            — file_uploads (no said, document_type enum)
0008_email_verify_tokens.sql     — if OQ-1 resolves to Option A
0009_rls_policies.sql            — all RLS policies (after schema is stable)
0010_storage_policies.sql        — Supabase Storage bucket + policies
```

**No migrations are written until Morty audits this spec and Scout gates it.**

---

## 9. DEFERRED TO PHASE 2

Per the directive's out-of-scope list and Chris's answers:

- Parent accounts and parent-student linking
- College coach accounts (permission-gated, parent-authorized)
- Billing/payment enforcement
- Multi-school coach accounts (`is_primary` flag on `user_hs_programs` is the Phase 2 hook)
- Self-service signup for any user type

---

*Spec ends. OQ-1 through OQ-5 require Chris's answers before migration files are written. Morty review required before any Supabase schema is applied.*

**— Patch**
