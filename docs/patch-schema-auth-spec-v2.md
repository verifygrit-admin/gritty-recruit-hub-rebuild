# PATCH SPEC — Schema, Auth Flow, and RLS
**Owner:** Patch (GAS Engineer / Schema + Auth Build Owner for Phase 1 MVP)
**Date:** 2026-03-24
**Status:** DRAFT — Pending Morty Audit
**Version:** 2.0
**Supabase project:** NEW (separate from oeekcafirfxgtdoocael.supabase.co — that project is archived)
**Supersedes:** patch-schema-auth-spec-v1.md

---

## CHANGELOG: v1 → v2

| OQ / Decision | v1 State | v2 Resolution | Authority |
|---------------|----------|---------------|-----------|
| OQ-1 email verify token | Open | Option A — dedicated `email_verify_tokens` table | Patch decision (Chris: use your discretion) |
| OQ-2 junction tables | Single `user_hs_programs` (Patch recommendation) | Distinct tables per role type: `hs_coach_schools`, `hs_counselor_schools`, `hs_coach_students`, `hs_counselor_students` | Chris answer |
| OQ-3 counselor financial aid | Open (defaulted to excluded) | Counselors CAN see financial aid. Only coaches are excluded. | Chris answer |
| OQ-4 counselor dashboard | Open | Same view as coach + EFC field + document upload status by category | Chris answer |
| OQ-5 SAID system | Retained on profiles; flagged as OQ | REMOVED ENTIRELY. No `said` column anywhere. No `generate_said()` trigger. No `linkSaidToAuth()`. No `auth_said()` RPC. `user_id` is the sole identity key in ALL tables including `profiles`. | Chris answer |
| is_head_coach field | Not specified | Added to `hs_coach_schools` junction — it is a property of the coach-school relationship | Chris answer + Patch placement decision |
| grit_fit_status default for manual_add | `'currently_recommended'` (directive default) | `NOT NULL DEFAULT 'not_evaluated'` — `'currently_recommended'` is factually false for user-added schools; `'not_evaluated'` is the canonical sentinel value (DEC-CFBRB-013) | Patch decision → confirmed by Chris (DEC-CFBRB-013) |

---

## 0. SCOPE NOTE

Chris designated Patch as auth flow builder and schema owner for this rebuild. Morty retains audit authority. This spec covers:

1. Updated schema (all Chris answers incorporated; all open questions resolved)
2. Auth flow spec (seeded accounts, admin activation, email verification)
3. RLS policy spec (per-role read/write rules, financial aid exclusion — coaches only)
4. Schema improvements confirmed by Chris's answers
5. Remaining concerns flagged at the end

---

## 1. DIRECTIVE DISCREPANCY — JOURNEY STEP COUNT

The directive narrative (Part 1) says "16-step recruiting journey" in two places. The journey step list enumerates 15 steps (numbered 1–15). The JSON default in the schema also has 15 entries. **15 steps is correct. The SQL schema is correct as-is.**

Resolution: All references in this spec use 15 steps. The narrative "16-step" language in the directive is an error. No schema change required.

---

## 2. UPDATED SCHEMA

### 2.1 Design Decisions Applied

| Item | Decision | Rationale |
|------|----------|-----------|
| SAID removed entirely | No `said` column anywhere | `user_id` is the sole identity key; SAID was adding complexity with no MVP benefit |
| Distinct junction tables per role | `hs_coach_schools`, `hs_counselor_schools`, `hs_coach_students`, `hs_counselor_students` | Chris's explicit direction: schools have a unique table, coaches have a unique table, counselors have a unique table, all junction with the student table |
| `is_head_coach` on `hs_coach_schools` | Coach-school relationship record carries this field | A coach is head coach at a school — not at a student; belongs on the coach-school junction |
| `grit_fit_status` DEFAULT `'not_evaluated'` for manual_add | `'currently_recommended'` replaced with `NOT NULL DEFAULT 'not_evaluated'` | Manual-add schools have not been evaluated by GRIT FIT; `'not_evaluated'` is the canonical sentinel (non-nullable); DEC-CFBRB-013 |
| Email verify tokens: dedicated table | `email_verify_tokens` table | Keeps auth metadata clean, queryable for expiry, avoids user_metadata complexity that caused problems in prior project |
| Counselors CAN see financial_aid_info | RLS updated | Chris confirmed; only coaches are excluded from financial aid documents |

---

### 2.2 Table: `hs_programs`

High school programs. Unchanged from directive — no SAID-related columns to remove.

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
  CONSTRAINT hs_programs_pkey PRIMARY KEY (id),
  CONSTRAINT hs_programs_school_state_key UNIQUE (school_name, state)
);
```

**Note:** `UNIQUE (school_name, state)` applied — prevents duplicate school entries. For MVP, only BC High is seeded. David owns population.

---

### 2.3 Table: `users`

Public user table. `school_id` removed (replaced by role-specific junction tables). Admin activation fields added. `said` never present on this table — no removal needed.

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
  account_status  text NOT NULL DEFAULT 'pending' CHECK (account_status IN (
                    'active',
                    'paused',
                    'pending'
                  )),
  email_verified  boolean NOT NULL DEFAULT false,
  activated_by    uuid REFERENCES auth.users(id),
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
- `school_id` removed — school linkage lives in role-specific junction tables
- `account_status` DEFAULT `'pending'` — all MVP accounts start pending, admin activates
- `email_verified` added
- `activated_by` + `activated_at` added — admin activation audit trail

---

### 2.4 Table: `profiles`

Student-athlete profile. **`said` removed entirely** — user_id is the sole identity key. No `generate_said()` trigger. No `linkSaidToAuth()` call.

```sql
CREATE TABLE public.profiles (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- said REMOVED — user_id is sole identity key per Chris's direction
  name                text NOT NULL,
  high_school         text,           -- display label; authoritative link is hs_programs via hs_coach_students
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

**v1 → v2 change:** `said text UNIQUE` column removed. No trigger or RPC references to SAID. The `high_school` text field is kept as a display/scoring label; the authoritative school link for coach visibility is `hs_coach_students`.

---

### 2.5 Junction Table Architecture

Chris's direction: schools have a unique table, coaches have a unique table, guidance counselors have a unique table, and they ALL need junctions with the student table. Implementation uses four junction tables:

| Table | Relationship |
|-------|-------------|
| `hs_coach_schools` | Coach → hs_program (coach is employed at this school) |
| `hs_counselor_schools` | Counselor → hs_program (counselor works at this school) |
| `hs_coach_students` | Coach → student (student confirmed this coach) |
| `hs_counselor_students` | Counselor → student (counselor oversees this student) |

The first two tables establish who works where. The second two establish the student-facing relationships that drive dashboard visibility and "is this your head coach?" logic.

**v1 change:** v1 used a single `user_hs_programs` table with a `role` column. This is replaced by four distinct tables per Chris's direction.

---

### 2.6 Table: `hs_coach_schools`

Links a coach to their high school program. Carries `is_head_coach` per Chris's direction.

```sql
CREATE TABLE public.hs_coach_schools (
  id              bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  coach_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_program_id   uuid NOT NULL REFERENCES public.hs_programs(id) ON DELETE CASCADE,
  is_head_coach   boolean NOT NULL DEFAULT false,
  linked_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_coach_schools_pkey PRIMARY KEY (id),
  CONSTRAINT hs_coach_schools_coach_program_key UNIQUE (coach_user_id, hs_program_id)
);
```

**`is_head_coach` placement rationale:** The "is this your head coach?" prompt compares the student's school against coaches at that school. `is_head_coach` is a property of the coach-school relationship — a coach is (or is not) head coach at a given school. It does not belong on a student-facing table.

**Usage:** When a student selects their high school during profile setup, query `hs_coach_schools` for coaches at the same `hs_program_id`. If exactly one coach found and `is_head_coach = true`, display the prompt. If zero or multiple, skip prompt.

---

### 2.7 Table: `hs_counselor_schools`

Links a guidance counselor to their high school program.

```sql
CREATE TABLE public.hs_counselor_schools (
  id                  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  counselor_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_program_id       uuid NOT NULL REFERENCES public.hs_programs(id) ON DELETE CASCADE,
  linked_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_counselor_schools_pkey PRIMARY KEY (id),
  CONSTRAINT hs_counselor_schools_counselor_program_key UNIQUE (counselor_user_id, hs_program_id)
);
```

---

### 2.8 Table: `hs_coach_students`

Explicit coach-student link. Created when student confirms "Yes, [Coach Name] is my coach." Drives coach dashboard visibility and is the RLS join key for coach SELECT policies.

```sql
CREATE TABLE public.hs_coach_students (
  id              bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  coach_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_coach_students_pkey PRIMARY KEY (id),
  CONSTRAINT hs_coach_students_coach_student_key UNIQUE (coach_user_id, student_user_id)
);
```

**Note:** For MVP, coach-student links are either seeded by admin or confirmed by the student during profile setup. No self-service add. The link is the authoritative basis for coach dashboard visibility — not the shared `hs_program_id`. This means a coach only sees students who have explicitly confirmed the link.

---

### 2.9 Table: `hs_counselor_students`

Links a counselor to their student roster. Seeded by admin for MVP.

```sql
CREATE TABLE public.hs_counselor_students (
  id                  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  counselor_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_counselor_students_pkey PRIMARY KEY (id),
  CONSTRAINT hs_counselor_students_counselor_student_key UNIQUE (counselor_user_id, student_user_id)
);
```

---

### 2.10 Table: `schools` (NCAA — unchanged)

662-school dataset migrated via `sync_schools.py`. `unitid` is the universal join key. Schema unchanged from prior project.

---

### 2.11 Table: `short_list_items` (UPDATED)

`said` removed. `grit_fit_status` changed from `DEFAULT 'currently_recommended'` to `NOT NULL DEFAULT 'not_evaluated'` with `'not_evaluated'` added to the CHECK constraint enum. (DEC-CFBRB-013)

```sql
CREATE TABLE public.short_list_items (
  id                      bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- said REMOVED — user_id is sole identity key
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
  grit_fit_status         text NOT NULL DEFAULT 'not_evaluated' CHECK (grit_fit_status IN (
                            'not_evaluated',
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

**v1 → v2 changes:**
- `grit_fit_status` changed from `DEFAULT 'currently_recommended'` to `NOT NULL DEFAULT 'not_evaluated'`. `'not_evaluated'` added to the CHECK constraint enum. IS NULL guard removed — column is non-nullable. Manual-add rows default to `'not_evaluated'`; application code updates to a specific status when GRIT FIT evaluates the school. (DEC-CFBRB-013)
- `said` column removed (carried from v1, confirmed in v2)

---

### 2.12 Table: `file_uploads` (UPDATED)

`said` removed. `document_type` added. No other changes from v1.

```sql
CREATE TABLE public.file_uploads (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- said REMOVED — user_id is sole identity key
  unitid           integer,
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
  file_type        text,
  file_size_bytes  integer,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_uploads_pkey PRIMARY KEY (id)
);
```

---

### 2.13 Table: `email_verify_tokens` (NEW — OQ-1 resolved)

Dedicated table for email verification tokens. Avoids stuffing tokens into `auth.users.user_metadata`.

```sql
CREATE TABLE public.email_verify_tokens (
  id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,             -- NULL until consumed; set on successful verify
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_verify_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_verify_tokens_token_key UNIQUE (token)
);
```

**Design decisions:**
- `used_at` is set (not deleted) when the token is consumed — preserves audit trail
- A user can have multiple token rows (resend creates a new row; old rows expire naturally)
- The Edge Function `verify-email` queries: `token = $1 AND expires_at > now() AND used_at IS NULL`
- Expiry: 24 hours from creation
- Cleanup: periodic cleanup of expired rows can run as a scheduled Edge Function (Phase 2 operational task — not blocking for MVP)

---

### 2.14 Summary: Tables in Phase 1 Schema

| Table | Status | Key v2 Change |
|-------|--------|---------------|
| `hs_programs` | New | `UNIQUE (school_name, state)` added |
| `users` | New | `school_id` removed; pending default; activation fields |
| `hs_coach_schools` | New | Replaces `user_hs_programs`; carries `is_head_coach` |
| `hs_counselor_schools` | New | Replaces `user_hs_programs` for counselors |
| `hs_coach_students` | New | Explicit coach-student link; drives coach RLS |
| `hs_counselor_students` | New | Explicit counselor-student link; drives counselor RLS |
| `profiles` | New | `said` REMOVED; no trigger; no RPC |
| `schools` | Migrated | Unchanged from prior project |
| `short_list_items` | New | `said` removed; `grit_fit_status` NOT NULL DEFAULT `'not_evaluated'` (DEC-CFBRB-013) |
| `file_uploads` | New | `said` removed; `document_type` added |
| `email_verify_tokens` | New | Dedicated verify token table (OQ-1 resolution) |

---

## 3. AUTH FLOW SPEC

### 3.1 Core Principle

All MVP accounts (student, coach, guidance counselor) are seeded and admin-activated. There is no self-service signup flow in MVP. Email verification is required before admin activation completes.

**SAID is gone.** Session restore uses `user_id` from `getSession()` exclusively. No `user_metadata.said` check. No `auth_said()` call.

### 3.2 Account Lifecycle (All User Types)

```
SEEDED STATE
  |
  v
Chris creates auth.users record via Supabase Auth Admin API
Chris inserts row into public.users (account_status: 'pending', email_verified: false)
Chris links coach/counselor to hs_programs via hs_coach_schools / hs_counselor_schools
  |
  v
EMAIL VERIFICATION
  |
  v
App sends verification email via Resend (noreply@grittyfb.com)
  Subject: "Verify your GrittyFB account"
  Body: click-to-verify link → Edge Function endpoint
  Token: UUID written to email_verify_tokens table (24-hour expiry)
  |
  v
User clicks link → Edge Function `verify-email`
  → Queries email_verify_tokens: token valid, not expired, not used
  → Sets email_verify_tokens.used_at = now()
  → Sets public.users.email_verified = true
  → Does NOT set account_status = 'active' (that is a separate admin step)
  |
  v
ADMIN ACTIVATION (performed by Chris)
  |
  v
Chris sets account_status = 'active' in public.users
Chris sets activated_by = chris_user_id, activated_at = now()
  |
  v
ACTIVE STATE — user can sign in and access the app
```

### 3.3 Sign-In Flow

```
User enters email + password
  |
  v
Supabase auth.signInWithPassword()
  |
  v
App checks public.users:
  - email_verified = false    → show "Please verify your email" screen
  - account_status = 'pending' → show "Your account is awaiting activation" screen
  - account_status = 'active'  → proceed
  |
  v
App calls getSession() (NOT getUser()) to retrieve user_id
  |
  v
Route by user_type:
  - student_athlete           → profile check → GRIT FIT flow
  - hs_coach                  → coach dashboard
  - hs_guidance_counselor     → counselor dashboard
```

**Critical rule:** Use `getSession()` not `getUser()`. `getUser()` makes a network call that can fail or clear the session in CI. This was a documented CI failure cause in the prior project.

### 3.4 Student-Athlete Session Restore

`said` is gone. Session restore uses `user_id` only.

```
User returns → getSession() → user_id present
  |
  v
Query public.users WHERE user_id = $1 → get user_type + account_status
  |
  v
Query profiles WHERE user_id = $1
  |
  v
If profiles row exists:
  → Run GRIT FIT → restore results + shortlist
If profiles row missing:
  → Route to profile form (incomplete signup)
```

No `user_metadata.said` check. No `auth_said()` RPC call.

### 3.5 Coach Head Coach Auto-Link

When a student selects their high school during profile setup:

1. The student's `hs_program_id` is resolved from the `hs_programs` table.
2. Query `hs_coach_schools` for coaches at the same `hs_program_id` where `is_head_coach = true`.
3. If exactly one head coach found: display "Is [coach name] your head coach?"
   - Yes: insert into `hs_coach_students (coach_user_id, student_user_id)`
   - No: skip (student will be linked manually by admin if needed)
4. If zero or multiple head coaches found: skip prompt; admin links manually.

**Why `hs_coach_students` is the RLS basis (not `hs_coach_schools`):** Coach dashboard visibility is per-student, not per-school. A coach should only see students who have confirmed the relationship, not every student who attends the same school. This prevents a substitute coach or assistant with a different school association from seeing students they have no relationship with.

### 3.6 Counselor Dashboard Fields

Per Chris's answer to OQ-4, the counselor dashboard shows the same data as the coach dashboard plus:

- **EFC (Expected Family Contribution)** — visible to counselors, not coaches. This is stored in `profiles.agi` / `profiles.dependents` (existing profile fields). The EFC calculation or display is a frontend concern — no new schema fields needed.
- **Document upload status by category:** transcript, SAT scores, writing examples, resume, school profile, senior course list. This is derived from `file_uploads` rows for the student — document category completeness is a query, not a stored field.

Coach dashboard shows the same document category list but **no EFC field** — confirmed by Chris.

No new schema fields needed for either view. RLS policies govern what each role can read; the dashboard difference is a frontend rendering decision.

---

## 4. RLS POLICY SPEC

All tables: RLS enabled. No anonymous inserts on any authenticated table.

**Key change from v1:** Counselor `file_uploads` SELECT policy now PERMITS `financial_aid_info`. Only coaches are excluded.

**Key structural change from v1:** All coach/counselor visibility policies use the `hs_coach_students` / `hs_counselor_students` junction tables as the join key — not `user_hs_programs` (which no longer exists).

### 4.1 `users` table

```
SELECT: user can read their own row (auth.uid() = user_id)
INSERT: service role only
UPDATE: service role only
DELETE: service role only
```

### 4.2 `profiles` table

```
SELECT (student):   auth.uid() = user_id

SELECT (coach):     user_id IN (
                      SELECT student_user_id FROM hs_coach_students
                      WHERE coach_user_id = auth.uid()
                    )

SELECT (counselor): user_id IN (
                      SELECT student_user_id FROM hs_counselor_students
                      WHERE counselor_user_id = auth.uid()
                    )

INSERT:             auth.uid() = user_id
UPDATE:             auth.uid() = user_id
DELETE:             service role only
```

### 4.3 `short_list_items` table

```
SELECT (student):   auth.uid() = user_id

SELECT (coach):     user_id IN (
                      SELECT student_user_id FROM hs_coach_students
                      WHERE coach_user_id = auth.uid()
                    )

SELECT (counselor): user_id IN (
                      SELECT student_user_id FROM hs_counselor_students
                      WHERE counselor_user_id = auth.uid()
                    )

INSERT:             auth.uid() = user_id
UPDATE:             auth.uid() = user_id
DELETE:             auth.uid() = user_id
```

### 4.4 `file_uploads` table (CRITICAL — financial_aid_info policy)

```
SELECT (student):   auth.uid() = user_id
                    -- student sees ALL their own files including financial_aid_info

SELECT (coach):     user_id IN (
                      SELECT student_user_id FROM hs_coach_students
                      WHERE coach_user_id = auth.uid()
                    )
                    AND document_type != 'financial_aid_info'
                    -- COACHES CANNOT see financial_aid_info under any condition

SELECT (counselor): user_id IN (
                      SELECT student_user_id FROM hs_counselor_students
                      WHERE counselor_user_id = auth.uid()
                    )
                    -- COUNSELORS CAN see ALL document types including financial_aid_info
                    -- No document_type exclusion applies (Chris confirmed OQ-3)

INSERT:             auth.uid() = user_id
UPDATE:             auth.uid() = user_id
DELETE:             auth.uid() = user_id
```

### 4.5 `hs_coach_schools` table

```
SELECT: coach_user_id = auth.uid()  (coach reads their own school links)
INSERT: service role only
UPDATE: service role only
DELETE: service role only
```

### 4.6 `hs_counselor_schools` table

```
SELECT: counselor_user_id = auth.uid()
INSERT: service role only
UPDATE: service role only
DELETE: service role only
```

### 4.7 `hs_coach_students` table

```
SELECT: coach_user_id = auth.uid()
        OR student_user_id = auth.uid()  (student can see who their coach is)
INSERT: auth.uid() = student_user_id (student confirms the link during profile setup)
        OR service role (admin can seed links)
UPDATE: service role only
DELETE: service role only
```

### 4.8 `hs_counselor_students` table

```
SELECT: counselor_user_id = auth.uid()
        OR student_user_id = auth.uid()
INSERT: service role only (counselor-student links are admin-seeded in MVP)
UPDATE: service role only
DELETE: service role only
```

### 4.9 `email_verify_tokens` table

```
SELECT: service role only (Edge Function reads with service role)
INSERT: service role only
UPDATE: service role only (used_at written by Edge Function)
DELETE: service role only
```

**Rationale:** The verify-email Edge Function runs with the service role key. There is no reason for browser-side code to read token rows. Exposing verify tokens to authenticated users is unnecessary surface area.

### 4.10 `hs_programs` table

```
SELECT: public (anon + authenticated) — school list visible to anyone for dropdown
INSERT: service role only
UPDATE: service role only
DELETE: service role only
```

### 4.11 `schools` (NCAA schools)

```
SELECT: public (anon + authenticated)
INSERT: service role only
UPDATE: service role only
DELETE: service role only
```

### 4.12 Supabase Storage RLS (`recruit-files` bucket)

```
Upload (INSERT):
  authenticated, path must match user_id prefix: {user_id}/*

Download (SELECT):
  Student:   path prefix matches their own user_id
  Coach:     underlying file_uploads row passes coach SELECT policy (no financial_aid_info)
  Counselor: underlying file_uploads row passes counselor SELECT policy (all types permitted)

financial_aid_info download:
  Student: yes
  Coach:   no — blocked at both storage policy and file_uploads RLS layers
  Counselor: yes
```

---

## 5. CONFIRMED SCHEMA IMPROVEMENTS

| Improvement | Where | Status |
|-------------|-------|--------|
| `UNIQUE (user_id, unitid)` on `short_list_items` | Section 2.11 | Applied |
| `document_type` enum on `file_uploads` | Section 2.12 | Applied |
| `account_status` DEFAULT `'pending'` | Section 2.3 | Applied |
| `activated_by` + `activated_at` audit trail | Section 2.3 | Applied |
| Distinct junction tables per role | Sections 2.6–2.9 | Applied (v2 change from v1) |
| `is_head_coach` on `hs_coach_schools` | Section 2.6 | Applied |
| `UNIQUE (school_name, state)` on `hs_programs` | Section 2.2 | Applied |
| `grit_fit_status` NOT NULL DEFAULT `'not_evaluated'` for manual_add | Section 2.11 | Applied (DEC-CFBRB-013) |
| SAID removed entirely | All tables | Applied |
| Dedicated `email_verify_tokens` table | Section 2.13 | Applied |

---

## 6. OPEN QUESTIONS — RESOLVED

All five original open questions are resolved as of v2. No blocking items remain on the schema/auth side.

| OQ | Status | Resolution |
|----|--------|------------|
| OQ-1 email verify token storage | RESOLVED | Dedicated `email_verify_tokens` table (Patch decision) |
| OQ-2 junction table structure | RESOLVED | Four distinct tables per role type (Chris direction) |
| OQ-3 counselor financial aid visibility | RESOLVED | Counselors CAN see financial_aid_info (Chris confirmation) |
| OQ-4 counselor dashboard scope | RESOLVED | Same as coach + EFC + document upload status (Chris confirmation) |
| OQ-5 SAID system | RESOLVED | Removed entirely (Chris direction) |

---

## 7. REMAINING CONCERNS FOR MORTY REVIEW

These are not blocking issues but warrant Morty's attention before migrations are written.

### RC-1 — `hs_coach_students` INSERT policy and the "is your coach?" prompt

The INSERT policy on `hs_coach_students` permits `auth.uid() = student_user_id` — the student creates their own coach link during profile setup. This is correct for the one-prompt MVP case. However, if a student does not go through the prompt (e.g., skips it, or prompt is suppressed because no head coach is found), there is no coach-student link and the coach sees zero students on their dashboard.

For BC High MVP with three seeded students, this is manageable — Chris can seed the links manually. But the RLS design should be explicit: **coach dashboard visibility depends entirely on `hs_coach_students`, not on `hs_coach_schools`**. If a coach is linked to BC High but no student has confirmed them, they see an empty dashboard. Morty should confirm this is acceptable behavior or flag if a fallback visibility rule is needed.

### RC-2 — `email_verify_tokens` table RLS vs. no RLS

The `email_verify_tokens` table carries service-role-only policies. In the current Supabase project (prior cfb-recruit-hub), a missing RLS policy caused a 42501 on INSERT (the `profiles_insert_open` incident, 2026-03-24). Morty should flag any migration where a table with RLS enabled has a missing policy that would block the Edge Function from writing to it. Service role bypasses RLS — but only if the Edge Function is actually using the service role key, not the anon key. This must be confirmed when Edge Functions are written.

### RC-3 — `profiles.high_school` as a display field vs. the authoritative school link

The `profiles.high_school` text column is used by `scoring.js` and displayed in coach dashboards. The authoritative coach-student relationship is through `hs_coach_students`. These two can drift: a student enters "Boston College High School" in their profile but the seeded `hs_programs` record is "BC High." Morty should assess whether the profile form should autocomplete from `hs_programs` or whether this is acceptable drift for MVP.

### RC-4 — `grit_fit_status` nullable enum — RESOLVED (DEC-CFBRB-013)

`grit_fit_status` is now `NOT NULL DEFAULT 'not_evaluated'`. The nullable / IS NULL guard concern is moot — the column is non-nullable and the CHECK constraint is a clean `IN (...)` with `'not_evaluated'` as the sentinel value. No Supabase type generation issue expected. This RC is closed.

### RC-5 — EFC data in profiles vs. a separate financial table

`profiles.agi` and `profiles.dependents` are the current EFC-adjacent fields. The counselor dashboard will display EFC information derived from these. There is no dedicated `financial_profile` table — EFC fields sit on the main `profiles` row. The `file_uploads` table holds uploaded financial aid documents. These are two different things: the profile fields are student-entered data; the file uploads are PDFs. Morty should confirm this split is intentional or flag if a dedicated financial data table is warranted for privacy isolation.

---

## 8. WHAT DOES NOT CHANGE

Confirmed by the directive and Chris's answers. No agent modifies these without explicit operator instruction:

- GRIT FIT scoring logic (`scoring.js`) — reused intact
- Map component (Leaflet.js, `MapView.jsx`) — reused intact
- `schools` table schema — migrated unchanged from existing project
- `getSession()` (not `getUser()`) — enforced in all Edge Functions and browser code
- Resend integration — noreply@grittyfb.com, API key already stored as Supabase secret
- 15-step recruiting journey JSON structure

**Removed from v1's "does not change" list:**
- `auth_said()` RPC — removed (SAID gone)
- `generate_said()` trigger — removed (SAID gone)
- `user_metadata.said` session restore check — removed (SAID gone)

---

## 9. MIGRATION FILE PLAN

No open questions remain. Migrations can be written after Morty audits this spec and Scout gates it.

```
0001_hs_programs.sql             — hs_programs table (UNIQUE school_name+state)
0002_users_extended.sql          — public.users (pending default, activation fields)
0003_hs_coach_schools.sql        — hs_coach_schools junction (is_head_coach)
0004_hs_counselor_schools.sql    — hs_counselor_schools junction
0005_hs_coach_students.sql       — hs_coach_students junction
0006_hs_counselor_students.sql   — hs_counselor_students junction
0007_profiles.sql                — profiles (no said, no trigger, no RPC)
0008_schools.sql                 — NCAA schools (migrated via sync_schools.py)
0009_short_list_items.sql        — short_list_items (grit_fit_status NOT NULL DEFAULT 'not_evaluated')
0010_file_uploads.sql            — file_uploads (document_type enum)
0011_email_verify_tokens.sql     — email verify token table
0012_rls_policies.sql            — all RLS policies (after schema stable)
0013_storage_policies.sql        — Supabase Storage bucket + policies
```

**No migrations are written until Morty audits this spec and Scout gates it.**

---

## 10. DEFERRED TO PHASE 2

- Parent accounts and parent-student linking
- College coach accounts (permission-gated, parent-authorized)
- Billing/payment enforcement
- Multi-school coach accounts
- Self-service signup for any user type
- Expired token cleanup (scheduled Edge Function for `email_verify_tokens`)
- EFC calculation engine (counselor dashboard reads the raw fields; calculation is deferred)

---

*Spec ends. All five open questions resolved. Five concerns flagged for Morty review (RC-1 through RC-5). No migrations are written until Morty audit PASS and Scout gate confirmation.*

**— Patch**
