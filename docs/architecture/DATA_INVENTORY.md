# DATA_INVENTORY.md

Comprehensive map of every place state lives in the `gritty-recruit-hub-rebuild` repo. Frontend and backend, build-time and runtime, first-party and external.

Initial pass: 2026-05-08.

---

## 1. Purpose & how to use this document

This document exists because state in this repo lives in many classes of artifact — Postgres tables, Edge Functions, Vercel API routes, committed JS config modules, committed CSV operator artifacts, sessionStorage, environment variables, external services — and the location is not always obvious from a feature description. Sprint planning has been bitten by guessing.

**How to read this:**
- For "where does X live?", jump to **Section 11**. Every Q routes to one canonical entry in Sections 3–10.
- For a complete entry (shape, write paths, read paths, lifecycle), use Sections 3–10.
- Every entry ends with a `Last verified:` date. Triage stale sections by that field.
- Section 7 (project config / seed data) has two distinct subclasses — runtime (E1, E2) and **operator artifacts that DO NOT load at runtime** (E3). E3 entries carry a banner header. Read that header before assuming anything in `src/assets/` is live.

**Quick lookup — top of mind risks:**

| Question | Class | Section |
|---|---|---|
| Where do recruit journey steps live? | A — Postgres column | 3 → `public.short_list_items` |
| Where is the partner-school registry? | E1 — committed JS config | 7 → `src/data/recruits-schools.js` |
| Where is partner-school staff identity? | E1 — committed JS config | 7 → `src/data/school-staff.js` |
| What about the Belmont Hill CSVs in `src/assets/`? | E3 — operator artifact | 7 → E3 |
| Where is offer status calculated? | Derived | 11 |
| Where do Scoreboard column headers come from? | Component-local constant | 11 |

---

## 2. Storage taxonomy

This repo uses eight storage classes. Each has different write semantics, lifecycle, and update mechanics. Misclassifying a storage location is the most common cause of planning errors.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Class A  Postgres tables (Supabase)            runtime, mutable        │
│  Class B  Storage buckets (Supabase)            runtime, mutable        │
│  Class C  Edge Functions (Supabase)             handlers + side effects │
│  Class D  Vercel serverless routes (api/*)      handlers + side effects │
│  Class E  Committed config / seed data          build-time, in git      │
│           E1 — frontend config modules                                   │
│           E2 — build-time reference data                                 │
│           E3 — operator seeding artifacts (NOT runtime)                  │
│           E4 — static public assets                                      │
│  Class F  Browser-local state                   per-session, per-device │
│  Class G  Environment variables                 deploy-time, per-env    │
│  Class H  External services with state          third-party, contractual│
└─────────────────────────────────────────────────────────────────────────┘
```

Update mechanics by class:
- **A, B**: live writes via the running app, EFs, or scripts. No deploy required.
- **C, D**: code change requires Supabase / Vercel deploy.
- **E**: code change requires `git commit` + Vercel deploy. **Updating an E1 file does NOT update production until the deploy ships.**
- **F**: client-side only; no central authority.
- **G**: deploy-time; managed via Vercel CLI / Supabase secrets.
- **H**: governed by third-party APIs; this repo is a consumer.

---

## 3. Class A — Supabase Postgres tables

Project: `xyudnajzhuwdauwkwsbh` (verified live 2026-05-08 via `mcp__supabase__list_tables`). All tables in `public` schema. RLS enabled on every table. Auth tables (`auth.users`) are managed by Supabase Auth and not enumerated here, but every table below references `auth.users.id` directly or through `public.users`.

Tables, in dependency order:

1. `public.users` — extended user record
2. `public.profiles` — student athlete profile
3. `public.schools` — 662 NCAA programs (the GRIT FIT universe)
4. `public.hs_programs` — partner high school records (legacy)
5. `public.hs_coach_schools` — HS coach ↔ HS program link
6. `public.hs_counselor_schools` — HS counselor ↔ HS program link
7. `public.hs_coach_students` — HS coach ↔ student link
8. `public.hs_counselor_students` — HS counselor ↔ student link
9. `public.short_list_items` — student's per-school recruiting journey
10. `public.file_uploads` — legacy single-school document uploads
11. `public.email_verify_tokens` — verification token store
12. `public.document_library` — student's reusable document library
13. `public.document_shares` — document_library ↔ school share link
14. `public.school_link_staging` — IPEDS unitid resolution staging
15. `public.college_coaches` — college program staff (placeholder)
16. `public.recruiting_events` — camps, junior days, visits
17. `public.student_recruiting_events` — student ↔ event link
18. `public.coach_contacts` — student-recorded contact log
19. `public.admin_audit_log` — admin write audit trail
20. `public.partner_high_schools` — coach-scheduler partner registry
21. `public.coach_submissions` — coach scheduler intake (college coaches)
22. `public.visit_requests` — coach scheduler visit request
23. `public.visit_request_players` — visit request ↔ player link
24. `public.visit_request_deliveries` — coach scheduler email delivery log
25. `public._pre_0037_short_list_items_snapshot` — pre-relabel backup (108 rows)
26. `public.supabase_migrations` — migration tracking (managed by `scripts/migrate.js`)

---

### `public.users`

Class: A — Postgres table
Purpose: Extended user metadata (user_type, account status, payment status). Mirrors `auth.users` 1:1 via `user_id` FK.

Shape (12 cols, 40 rows):
- `id` uuid PK (gen_random_uuid)
- `user_id` uuid UNIQUE → `auth.users.id`
- `user_type` text — `student_athlete | hs_coach | hs_guidance_counselor | parent | college_coach | college_admissions_officer`
- `account_status` text DEFAULT `pending` — `active | paused | pending`
- `email_verified` bool DEFAULT false
- `activated_by` uuid → `auth.users.id`
- `activated_at` timestamptz
- `payment_status` text DEFAULT `free` — `free | trial | paid | expired`
- `trial_started_at` timestamptz
- `created_at`, `last_login` timestamptz
- `full_name` text — staff display name (Sprint 023, Option γ). Nullable. Backfilled for 6 known staff from `src/data/school-staff.js`; 2 coach UUIDs intentionally NULL pending Sprint 024 admin pass.

Defining migrations:
- `supabase/migrations/0002_users_extended.sql`
- `supabase/migrations/0046_users_add_full_name.sql` — adds `full_name` column + UPDATE-own RLS policy + 6-row backfill

Write paths:
- `scripts/seed_users.js` — initial seed
- `scripts/bulk_import_students.js` — bulk student import (service role)
- `scripts/import_bc_high_counselors.py`, `scripts/import_paul_zukauskas.py`, `scripts/import_jesse_bargar.py` — operator imports
- `supabase/functions/check-account-status/index.ts` — account status reads/writes
- `supabase/functions/admin-read-users/index.ts` — admin lookups (read)
- `src/pages/StaffProfilePage.jsx` — Name save (own row UPDATE under `users_update_own_full_name` policy)

Read paths:
- `src/hooks/useAuth.jsx` — session bootstrap reads `user_type`
- `src/components/AdminUsersTab.jsx` (via `admin-read-users` EF)
- `src/components/Layout.jsx` — role-based nav
- `src/pages/CoachDashboardPage.jsx` and `src/pages/coach/*` — coach-side gating
- `src/pages/StaffProfilePage.jsx` — display name
- `tests/unit/schema.test.js` — schema fixtures

Lifecycle: Runtime. Role and account state are JWT-anchored where possible (`app_metadata.role` for admin, per memory).

Notes:
- `public.users` and `public.profiles` BOTH FK to `auth.users.id`, NOT to each other. Joining the two requires `user_id` on both sides.
- Admin role is on JWT `app_metadata.role`, not in this table.
- `name` is on `profiles`, not here. This table has no name columns.
- Sprint 023 Option γ added `full_name`. Display name lookup precedence: `public.users.full_name` (own row) → `src/data/school-staff.js` `findStaffByUserId()` fallback. The fallback covers staff rows where `full_name` is NULL. Sprint 018 carry-forward C-9 should consolidate `full_name` into the eventual staff identity table.

Last verified: 2026-05-09

---

### `public.profiles`

Class: A — Postgres table
Purpose: Student athlete profile — measurables, academics, contact, badges. Single row per student.

Shape (31 cols, 34 rows):
- `id` uuid PK, `user_id` uuid UNIQUE → `auth.users.id`
- Identity: `name`, `email`, `phone`, `twitter`, `parent_guardian_email`
- HS: `high_school`, `grad_year`, `state`, `hs_lat`, `hs_lng`
- Athletic: `position`, `height` (text, e.g. `"6-2"`), `weight`, `speed_40`, `gpa`, `sat`
- Bulk PDS measurables (Sprint 026, 0049): `time_5_10_5` (numeric, 5-10-5 drill seconds), `time_l_drill` (numeric, L-drill seconds), `bench_press` (numeric, lbs), `squat` (numeric, lbs), `clean` (numeric, lbs), `last_bulk_pds_approved_at` (timestamptz, distinct from `updated_at`)
- Badges: `expected_starter`, `captain`, `all_conference`, `all_state` (bool)
- Financial: `agi`, `dependents`
- Status: `status` DEFAULT `'active'`
- GRIT FIT: `last_grit_fit_run_at`, `last_grit_fit_zero_match`
- Media: `hudl_url`, `avatar_storage_path`
- Audit: `created_at`, `updated_at`

Defining migrations:
- `0007_profiles.sql` — table
- `0016_profiles_add_hudl_url.sql`
- `0021_profiles_zero_match_tracking.sql`
- `0022_profiles_add_avatar_url.sql`
- `0049_profiles_add_bulk_pds_measurables.sql` — Sprint 026 (5 measurables + last_bulk_pds_approved_at)
- `0012`, `0015`, `0025`, `0026`, `0027`, `0043` — RLS

Write paths:
- `src/pages/ProfilePage.jsx:271` — `upsert(payload, { onConflict: 'user_id' })`
- `src/pages/GritFitPage.jsx` — writes `last_grit_fit_run_at`, `last_grit_fit_zero_match` after every score run
- `supabase/functions/fetch-hudl-avatar/index.ts` — writes `avatar_storage_path`
- `supabase/functions/admin-approve-bulk-pds/index.ts` — Sprint 026; on admin approval, writes the 5 Bulk PDS measurables + `last_bulk_pds_approved_at` (also bumps `updated_at`). Source rows come from `public.bulk_pds_submissions`.
- `scripts/backfill-hudl-avatars.js` — backfill `avatar_storage_path`
- `scripts/bulk_import_students.js` — bulk insert (service role)
- `scripts/repair_shortlist_fields.py` — operator backfill

Read paths:
- `src/pages/ProfilePage.jsx:90`
- `src/pages/GritFitPage.jsx:403` — feeds the scorer
- `src/pages/ShortlistPage.jsx:417, 424, 693`
- `src/pages/LandingPage.jsx:39` — masthead summary
- `src/components/Layout.jsx:102` — header
- `src/components/StudentDetailPanel.jsx`, `PlayerCard.jsx`, `PreReadLibrary.jsx`
- `src/hooks/useRecruitsRoster.js` — recruits roster aggregation

Lifecycle: Runtime. `updated_at` reflects the last student-side save.

Notes:
- Coaches and counselors do **NOT** have rows here. Seed scripts populate `auth.users` + `public.users` only. Any feature that needs a staff name must use `src/data/school-staff.js` (Section 7) or query through an EF; broadening RLS to allow students to read staff `profiles` rows is explicitly NOT done.
- `height` is text (`"6-2"`), not numeric. Parsed by `parseHeight` in `src/components/RecruitingScoreboard.jsx:127`.
- Badges + measurables feed `calcAthleticFit` / `calcAthleticBoost` in `src/lib/scoring.js`.
- The 5 Bulk PDS measurables (`time_5_10_5`, `time_l_drill`, `bench_press`, `squat`, `clean`) are NOT exposed in the Student "My Profile" page in Sprint 026 (Note 1 lock). They write only via the admin-approve-bulk-pds EF. `last_bulk_pds_approved_at` is intentionally distinct from `updated_at` — the latter tracks the broader profile lifecycle.

Last verified: 2026-05-12

---

### `public.schools`

Class: A — Postgres table
Purpose: The 662-school NCAA universe used by GRIT FIT scoring. UI calls them "institutions". PK is IPEDS `unitid`.

Shape (40 cols, 662 rows):
- `unitid` integer PK
- Identity: `school_name`, `state`, `city`, `control`, `school_type`, `type`, `ncaa_division`, `conference`
- Geo: `latitude`, `longitude`
- Cost / aid: `coa_out_of_state`, `est_avg_merit`, `avg_merit_award`, `share_stu_any_aid`, `share_stu_need_aid`, `need_blind_school`, `dltv`, `adltv`, `adltv_rank`, `admissions_rate`
- Academic rigor (per cohort × test-optional flag): `acad_rigor_senior/junior/soph/freshman`, `acad_rigor_test_opt_*`, `is_test_optional`, `graduation_rate`, `avg_gpa`, `avg_sat`
- Recruiting links: `recruiting_q_link`, `coach_link`, `prospect_camp_link`, `field_level_questionnaire`
- Athletics contact: `athletics_phone`, `athletics_email`
- Audit: `last_updated`

Defining migrations:
- `0008_schools.sql` — table + initial seed
- `0034_schools_admin_update_policy.sql` — admin write policy
- `0036_schools_add_athletics_contact.sql`
- `0044_seed_belmont_hill_school_identity.sql` — note: this name is misleading; check the file before assuming it touches partner-school registries

Write paths:
- `scripts/sync_schools.py` — IPEDS sync
- `scripts/write_validated_links_to_schools.py` — link backfill
- `scripts/extract_schools_with_links.py`, `scripts/extract_and_stage.py`
- `supabase/functions/admin-update-school/index.ts` — admin in-app edits (logs to `admin_audit_log`)

Read paths:
- `src/pages/GritFitPage.jsx:404` — full universe pulled for scoring
- `src/pages/ShortlistPage.jsx:425, 694`
- `src/components/AdminInstitutionsTab.jsx` — via `admin-read-institutions` / `admin-read-schools` EFs
- `src/components/grit-fit/AthleticFitScorecard.jsx`, `AcademicRigorScorecard.jsx`
- `src/lib/scoring.js`, `src/lib/grit-fit/recomputeMatches.js`

Lifecycle: Runtime. Refreshed periodically via IPEDS pipeline. Admin in-app edits possible via `admin-update-school` EF.

Notes:
- `unitid` is the FK target for `short_list_items`, `college_coaches`, `coach_contacts`, `recruiting_events`, `document_shares`. `short_list_items.unitid` is NOT FK-constrained (verified — no constraint listed).
- The 5-tier division key (`Power 4`, `G6`, `FCS`, `D2`, `D3`) lives on `schools.type`, not `ncaa_division`. UConn maps to `G6`.

Last verified: 2026-05-08

---

### `public.hs_programs`

Class: A — Postgres table
Purpose: Partner high school program records. Predates `partner_high_schools` (Section: coach scheduler). Currently 2 rows.

Shape (10 cols): `id` uuid PK, `school_name`, `address`, `city`, `state`, `zip`, `conference`, `division`, `state_athletic_association`, `created_at`.

Defining migrations:
- `0001_hs_programs.sql`
- `data/seed_hs_programs.sql` — seed
- `data/hs_programs.csv` — source CSV

Write paths:
- `data/seed_hs_programs.sql` (run once at bootstrap)

Read paths:
- `public.hs_coach_schools.hs_program_id` FK target
- `public.hs_counselor_schools.hs_program_id` FK target
- No direct frontend read confirmed — used only as FK target for staff link tables

Lifecycle: Runtime, but effectively static (2 rows: BC High, Belmont Hill).

Notes:
- Two parallel partner-school tables exist: `hs_programs` (legacy, Sprint 001) and `partner_high_schools` (coach scheduler, Sprint 013). They are NOT joined. See Section 11.
- The `name` and `slug` shape used by the coach scheduler is on `partner_high_schools`, not here.

Last verified: 2026-05-08

---

### `public.hs_coach_schools` / `public.hs_counselor_schools`

Class: A — Postgres table (link)
Purpose: Many-to-many between HS staff and `hs_programs`.

Shape:
- `hs_coach_schools` (4 rows): `id`, `coach_user_id` → `auth.users.id`, `hs_program_id` → `hs_programs.id`, `is_head_coach` bool, `linked_at`
- `hs_counselor_schools` (4 rows): same shape, `counselor_user_id`, no `is_head_coach`

Defining migrations: `0003_hs_coach_schools.sql`, `0004_hs_counselor_schools.sql`

Write paths:
- `scripts/import_paul_zukauskas.py`, `scripts/import_bc_high_counselors.py`
- Manual seeds during partner school onboarding

Read paths:
- `src/hooks/useSchoolIdentity.js` — resolves student's HS slug from auth user
- Coach-side queries during dashboard load

Lifecycle: Runtime, low volume.

Notes:
- The truthful display name for a coach/counselor is NOT here — it's in `src/data/school-staff.js`. These tables only carry the link.

Last verified: 2026-05-08

---

### `public.hs_coach_students` / `public.hs_counselor_students`

Class: A — Postgres table (link)
Purpose: Many-to-many between HS staff and the students they advise.

Shape:
- `hs_coach_students` (30 rows): `id`, `coach_user_id`, `student_user_id`, `confirmed_at`
- `hs_counselor_students` (29 rows): `id`, `counselor_user_id`, `student_user_id`, `linked_at`

Defining migrations: `0005_hs_coach_students.sql`, `0006_hs_counselor_students.sql`, RLS in `0012`/`0015`/`0025`/`0026`/`0027`

Write paths:
- `src/pages/ProfilePage.jsx:187, 206` — student confirms staff during profile flow
- `scripts/import_jesse_bargar.py`, `scripts/import_bc_high_counselors.py` — bulk seed

Read paths:
- `src/pages/coach/CoachStudentsPage.jsx`, `CoachReportsPage.jsx`, `CoachRecruitingIntelPage.jsx` — coach roster
- `supabase/functions/student-read-recruiting-contacts/handler.js` — resolves student's coach + counselor for shortlist contacts lookup

Lifecycle: Runtime. Written when the student confirms identity in profile flow.

Notes:
- `confirmed_at` on coach link, `linked_at` on counselor link — column naming is inconsistent between the two tables.

Last verified: 2026-05-08

---

### `public.bulk_pds_submissions`

Class: A — Postgres table
Purpose: Staging table for HS coach Bulk Player Data Submission (Sprint 026). One row per (coach submission, student). Admin verifies and approves rows; approval writes through to `public.profiles`. Rejection sets `approval_status='rejected'` with no profiles write.

Shape (22 cols, 3 rows after P2-4 fixture seed):
- `id` uuid PK
- `batch_id` uuid (NOT NULL, indexed) — groups all Player Update Cards from a single coach submit click
- `coach_user_id` uuid → `auth.users.id` (ON DELETE CASCADE)
- `student_user_id` uuid → `auth.users.id` (ON DELETE CASCADE)
- Identity snapshot (immutable record of identity at submit time): `student_name_snapshot`, `student_email_snapshot`, `student_grad_year_snapshot`, `student_high_school_snapshot`, `student_avatar_storage_path_snap`
- Performance (write-thru candidates): `height` (text), `weight`, `speed_40`, `time_5_10_5`, `time_l_drill`, `bench_press`, `squat`, `clean` (all numeric)
- Lifecycle: `submitted_at` (timestamptz NOT NULL DEFAULT now()), `approval_status` (text NOT NULL DEFAULT `'pending'`, check `IN ('pending','approved','rejected')`), `approved_by` uuid → `auth.users.id` (ON DELETE SET NULL), `approved_at` timestamptz, `rejection_reason` text

Defining migrations:
- `0048_bulk_pds_submissions.sql` — table + 5 indexes + 3 FKs + CHECK
- `0050_bulk_pds_submissions_rls.sql` — 3 policies

RLS (live):
- `bulk_pds_coach_select_own` (SELECT): `coach_user_id = auth.uid()`
- `bulk_pds_coach_insert_own_linked_students` (INSERT WITH CHECK): coach must own the row AND have a matching row in `public.hs_coach_students` for `student_user_id`
- `bulk_pds_admin_select_all` (SELECT): JWT `app_metadata.role = 'admin'` — admin EFs use service_role so this is consistency-only

No coach UPDATE or DELETE policy. No browser-side admin write — all lifecycle UPDATEs happen via service_role EFs.

Write paths:
- `src/lib/bulkPds/submitBulkPdsBatch.js` — Coach UI bulk INSERT path, RLS-gated
- `supabase/functions/admin-approve-bulk-pds/index.ts` — service_role; sets `approval_status='approved'`, `approved_by`, `approved_at`; paired write to `public.profiles`
- `supabase/functions/admin-reject-bulk-pds/index.ts` — service_role; sets `approval_status='rejected'`, `approved_by`, `approved_at`, `rejection_reason`. No profiles write.
- `scripts/seed_bulk_pds_fixture.js` — idempotent E2E fixture seed (Sprint 026 P2-4, fixed batch_id `00000026-…`)

Read paths:
- `supabase/functions/admin-read-bulk-pds/index.ts` — GET grouped pending batches list and per-batch detail (LEFT JOIN `profiles` on `student_user_id`)
- `src/lib/bulkPds/admin/adminBulkPdsClient.js` — Admin UI fans out list → per-batch detail in parallel
- Direct coach reads via PostgREST allowed by the SELECT policy (not currently used in the Coach UI; coach gets toast feedback after the INSERT, not a read-back)

Lifecycle: Runtime. Submissions retained indefinitely after approval or rejection (Q8 lock — no purge cadence).

Notes:
- Snapshot columns capture identity at submit time so the admin compare panel is stable even if the student's profile changes between submission and approval.
- `notify-bulk-pds-event` EF (Sprint 026) emits emails on submission / approval / rejection. When `RESEND_API_KEY` is absent from Supabase EF secrets, the helper degrades to logging `EMAIL_DISABLED:` lines and returns `{ disabled: true }` — lifecycle does NOT block on email.
- Q1 contract: approve/reject EFs accept EITHER `{ batch_id }` OR `{ submission_id }` (mutually exclusive); the Admin UI exposes both whole-batch and per-row controls.

Last verified: 2026-05-12

---

### `public.short_list_items`

Class: A — Postgres table
Purpose: One row per (student, school) pairing on a student's shortlist. Holds the per-school 15-step recruiting journey as JSONB. **This is where recruit journey steps live.**

Shape (24 cols, 111 rows):
- `id` bigint identity PK
- `user_id` uuid → `auth.users.id` (ON DELETE CASCADE)
- `unitid` integer (NOT FK-constrained against `schools`)
- Denorm school: `school_name`, `div`, `conference`, `state`
- Match metadata: `match_rank`, `match_tier`
- Cost / value: `net_cost`, `droi`, `break_even`, `adltv`, `grad_rate`, `coa`, `dist`
- Links: `q_link`, `coach_link`, `camp_link`
- `source` text — `grit_fit | manual_add`
- `grit_fit_status` text — `not_evaluated | currently_recommended | out_of_academic_reach | below_academic_fit | out_of_athletic_reach | below_athletic_fit | outside_geographic_reach`
- `grit_fit_labels` text[] — full label set; `grit_fit_status` is `labels[0]`
- **`recruiting_journey_steps` jsonb** — 15-element array of `{ step_id, label, completed, completed_at }`
- `coach_contact` jsonb — Phase 1 inline coach contact
- `added_at`, `updated_at` timestamptz
- UNIQUE `(user_id, unitid)`

Defining migrations:
- `0009_short_list_items.sql` — table + initial 15-step DEFAULT
- `0020_grit_fit_labels.sql` — `grit_fit_labels` array
- `0024_reorder_journey_steps.sql` — step order remap (4-11 reordered)
- `0037_relabel_journey_steps_for_scoreboard.sql` — relabels step_id 8, 12, 13
- `0014_coach_contact_jsonb.sql` — `coach_contact` jsonb column
- `0021_profiles_zero_match_tracking.sql` — companion run-state on `profiles`
- `0038_add_public_recruits_select.sql`, `0043_generalize_partner_school_select_predicate.sql` — RLS

Live DEFAULT for `recruiting_journey_steps` (verified 2026-05-08 via Supabase MCP):
```
[
  { step_id: 1,  label: "Added to shortlist",                completed: true,  completed_at: null },
  { step_id: 2,  label: "Completed recruiting questionnaire", completed: false, ... },
  { step_id: 3,  label: "Completed admissions info form" },
  { step_id: 4,  label: "Assistant coach contacted student" },
  { step_id: 5,  label: "Contacted coach via email" },
  { step_id: 6,  label: "Contacted coach via social media" },
  { step_id: 7,  label: "Received junior day invite" },
  { step_id: 8,  label: "Tour / Visit Confirmed" },           // 0037 relabel
  { step_id: 9,  label: "Received prospect camp invite" },
  { step_id: 10, label: "Coach contacted student via text" },
  { step_id: 11, label: "Head coach contacted student" },
  { step_id: 12, label: "Admissions Pre-Read Requested" },    // 0037 relabel
  { step_id: 13, label: "Financial Aid Pre-Read Submitted" }, // 0037 relabel
  { step_id: 14, label: "Received verbal offer" },
  { step_id: 15, label: "Received written offer" }
]
```

Write paths:
- `src/pages/GritFitPage.jsx:553` — `insert(payload)` from GRIT FIT result picker
- `src/pages/ShortlistPage.jsx:77-126` — toggle journey step (read-modify-write of JSONB)
- `scripts/import_shortlist_bc_high.py` — bulk seed for partner school students (service role)
- `scripts/import_jesse_bargar.py` — single-student seed
- `scripts/repair_shortlist_fields.py` — operator backfill
- `scripts/execute_short_list_items_coach_link_update.py`, `scripts/update_short_list_items_coach_link.sql` — coach_link backfill

Read paths:
- `src/pages/GritFitPage.jsx:408` — student's own list for map/list
- `src/pages/ShortlistPage.jsx:417, 424, 693` — full shortlist view
- `src/hooks/useRecruitsRoster.js:132` — public recruits page
- `src/components/RecruitingScoreboard.jsx:154` — Scoreboard (reads JSONB by `step_id`, see Notes)
- `src/components/CoachStudentCard.jsx:38, 225, 265, 273` — coach-side display
- `src/components/CoachSchoolDetailPanel.jsx:7, 114` — coach drill-in
- `src/components/CoachActivitySummary.jsx:53` — coach activity rollup
- `src/pages/coach/CoachStudentsPage.jsx:19, 72-73, 178-179`
- `src/pages/coach/CoachReportsPage.jsx:40`
- `src/pages/coach/CoachRecruitingIntelPage.jsx:281`
- `src/lib/offerStatus.js:28` — derives verbal/written offer chips from steps 14 / 15
- `src/lib/recruits/utils.js:48` — public roster step extraction

Lifecycle: Runtime. JSONB seeded by Postgres column DEFAULT on every INSERT. Each row owns a complete copy.

Notes:
- `recruiting_journey_steps` is a **JSONB column on this table**, NOT a separate table and NOT a project config file. Each row gets its own copy.
- Updating labels or order requires (a) a migration that ALTERs the column DEFAULT, and (b) a remap of every existing row. See `0024` for the remap pattern and `0037` for the surgical relabel pattern.
- The Scoreboard's column headers come from a **component-local constant** `SCOREBOARD_COLUMNS` at `src/components/RecruitingScoreboard.jsx:57`, NOT from the JSONB `label` field. The component reads booleans by `step_id` and renders its own headers verbatim. Changing JSONB labels does NOT change the Scoreboard column text.
- `unitid` carries no FK to `schools.unitid`. This is by design — it lets a manual-add row reference a school not in the universe.
- `_pre_0037_short_list_items_snapshot` (108 rows) is a frozen backup taken before the 0037 relabel.

Data fixes:
- 2026-05-12 — Backfilled q_link + coach_link on short_list_items from schools where null (54 rows affected, Belmont Hill import gap). Ref: commit 9191d3a + this hotfix.

Last verified: 2026-05-08

---

### `public.file_uploads`

Class: A — Postgres table
Purpose: Legacy single-school document uploads. 1 row. Superseded by `document_library` + `document_shares`.

Shape: `id`, `user_id`, `unitid`, `file_name`, `file_label`, `storage_path`, `document_type` (enum 7), `file_type`, `file_size_bytes`, `uploaded_at`.

Defining migrations: `0010_file_uploads.sql`

Write paths: legacy; not currently written.
Read paths: not currently read in `src/`.

Lifecycle: Runtime, deprecated.

Notes:
- The `document_type` enum here includes `financial_aid_info` which is NOT in `document_library.document_type` (6 values). Treat this table as historical.

Last verified: 2026-05-08

---

### `public.email_verify_tokens`

Class: A — Postgres table
Purpose: Email verification token store for `send-verification` / `verify-email` EFs.

Shape (0 rows): `id`, `user_id`, `token` UNIQUE, `expires_at`, `used_at`, `created_at`.

Defining migrations: `0011_email_verify_tokens.sql`

Write paths:
- `supabase/functions/send-verification/index.ts` — issues token
- `supabase/functions/verify-email/index.ts` — marks `used_at`

Read paths:
- `supabase/functions/verify-email/index.ts` — token lookup

Lifecycle: Runtime, ephemeral. Token TTL via `expires_at`.

Notes:
- 0 rows in the live DB. Either flow is rare or row hygiene clears used tokens.

Last verified: 2026-05-08

---

### `public.document_library`

Class: A — Postgres table
Purpose: Student's reusable document library. One row per uploaded file. Files referenced by `storage_path` in the `document_library` Storage bucket.

Shape (10 cols, 9 rows):
- `id` uuid PK, `user_id` uuid → `auth.users.id`
- `document_type` text — `transcript | senior_course_list | writing_example | student_resume | school_profile_pdf | sat_act_scores`
- `slot_number` integer DEFAULT 1
- `file_name`, `file_label`, `storage_path`, `file_type`, `file_size_bytes`
- `uploaded_at` timestamptz

Defining migrations: `0017_document_library.sql`, `0019_document_library_rls_storage.sql`

Write paths:
- `src/components/DocumentsSection.jsx`, `PreReadLibrary.jsx` — student upload
- Pairs writes with the `document_library` Storage bucket (Class B)

Read paths:
- `src/components/PreReadLibrary.jsx`, `DocumentsSection.jsx`
- `src/lib/preReadLibrary.js`

Lifecycle: Runtime.

Notes:
- This table is the metadata. The actual file bytes live in Storage bucket `document_library` (Class B).

Last verified: 2026-05-08

---

### `public.document_shares`

Class: A — Postgres table (link)
Purpose: Maps a `document_library` row to a school it has been shared with.

Shape (5 cols, 1 row): `id`, `library_doc_id` → `document_library.id`, `user_id`, `unitid`, `shared_at`.

Defining migrations: `0018_document_shares.sql`, `0019_document_library_rls_storage.sql`

Write paths: `src/components/PreReadLibrary.jsx` — share toggle
Read paths: `src/components/PreReadLibrary.jsx` — share state per school

Lifecycle: Runtime.

Notes:
- No FK on `unitid`.

Last verified: 2026-05-08

---

### `public.school_link_staging`

Class: A — Postgres table
Purpose: Permanent staging for IPEDS `unitid` resolution before promotion to `college_coaches` / `recruiting_events`. Per DEC-CFBRB-069.

Shape (15 cols, 667 rows): `id`, `source_tab`, `source_run`, `data_type`, `row_index`, `school_name_raw`, `athletics_url_raw`, `camp_url`, `coach_url`, `matched_unitid` (no FK), `match_confidence`, `match_status` (enum), `match_method`, `reviewed_by`, `reviewed_at`, `created_at`.

Defining migrations: `0028_school_link_staging.sql`, `0033_school_link_staging_add_dedup_excluded.sql`

Write paths:
- `scripts/extract_and_stage.py`
- `scripts/scrape_camp_details_playwright.{js,py}`
- Operator review writes (manual SQL or scripts)

Read paths:
- `scripts/import_ready_to_production.py`
- `scripts/verify_migrations_0028_0032.js`

Lifecycle: Runtime, accumulating. Permanent infrastructure (NOT temporary).

Notes:
- `matched_unitid` carries no FK constraint by design — unresolved rows are valid staging state. Confirm `match_status = 'auto_confirmed' | 'manually_confirmed'` before promoting.

Last verified: 2026-05-08

---

### `public.college_coaches`

Class: A — Postgres table
Purpose: College program staff records. Promoted from `school_link_staging`.

Shape (10 cols, 0 rows): `id` uuid PK, `unitid` → `schools.unitid`, `name`, `title`, `email`, `photo_url`, `twitter_handle`, `is_head_coach` bool, `profile_url`, `created_at`.

Defining migrations: `0029_college_coaches.sql`

Write paths: `scripts/import_ready_to_production.py` (when promoting from staging)
Read paths: `public.coach_contacts.coach_id` FK target. No frontend read confirmed.

Lifecycle: Runtime. Currently empty.

Notes:
- Reserved for Phase 2. Sprint 013 coach scheduler does NOT use this table — it uses `coach_submissions`.

Last verified: 2026-05-08

---

### `public.recruiting_events`

Class: A — Postgres table
Purpose: Camps, junior days, official + unofficial visits. Linked to schools by `unitid`.

Shape (13 cols, 0 rows): `id` uuid PK, `unitid` → `schools.unitid`, `event_type` (enum 4), `event_name`, `event_date`, `end_date`, `registration_deadline`, `location`, `cost_dollars`, `registration_url`, `status` (enum 4), `description`, `created_at`.

Defining migrations: `0030_recruiting_events.sql`

Write paths:
- `supabase/functions/admin-read-recruiting-events/index.ts` — admin read; writes happen via `admin-update-school` pattern (NOTE: no `admin-update-recruiting-event` EF exists yet)
- `scripts/scrape_camp_details_playwright.{js,py}` — camp scrape pipeline

Read paths:
- `src/components/AdminRecruitingEventsTab.jsx` (via EF)

Lifecycle: Runtime. Currently empty.

Last verified: 2026-05-08

---

### `public.student_recruiting_events`

Class: A — Postgres table (link)
Purpose: Student ↔ event link with calendar sync state.

Shape (8 cols, 0 rows): `id` uuid PK, `profile_id` → `profiles.id`, `event_id` → `recruiting_events.id`, `status` (enum 4), `gcal_event_id`, `confirmed_by` (enum 3), `confirmed_at`, `notes`, `created_at`.

Defining migrations: `0031_student_recruiting_events.sql`

Write paths: not yet wired.
Read paths: not yet wired.

Lifecycle: Runtime. Currently empty. Reserved for student-side event registration.

Notes:
- The FK is `profile_id` (→ `profiles.id`) NOT `user_id`. This is unusual for this codebase, where most student-keyed tables use `user_id`. Joining requires going through `profiles`.

Last verified: 2026-05-08

---

### `public.coach_contacts`

Class: A — Postgres table
Purpose: Student-recorded log of contact with college coaches. Tied to a shortlist step.

Shape (10 cols, 0 rows): `id`, `profile_id` → `profiles.id`, `unitid` → `schools.unitid`, `coach_id` → `college_coaches.id` (nullable), `contact_date`, `contact_type` (enum 6), `initiated_by` (enum 4), `short_list_step` 1-15, `notes`, `created_at`.

Defining migrations: `0032_coach_contacts.sql`

Write paths: not yet wired in `src/`.
Read paths: not yet wired.

Lifecycle: Runtime. Currently empty.

Notes:
- College coaches are denied all write access per DEC-CFBRB-074 — contact records are student/HS staff initiated only.
- Cross-school integrity (`coach_id.unitid` matches row `unitid`) is enforced at the application layer, NOT the DB.
- Same `profile_id` quirk as `student_recruiting_events` — joins through `profiles`, not `auth.users` directly.

Last verified: 2026-05-08

---

### `public.admin_audit_log`

Class: A — Postgres table
Purpose: Audit trail of admin writes. Written by `admin-*` Edge Functions.

Shape (8 cols, 1 row): `id`, `admin_email`, `action`, `table_name`, `row_id`, `old_value` jsonb, `new_value` jsonb, `created_at`.

Defining migrations: `0035_admin_audit_log.sql`

Write paths:
- `supabase/functions/admin-update-school/index.ts`
- All future admin write EFs are expected to log here

Read paths:
- `src/components/AuditLogViewer.jsx` (via `admin-read-audit-log` EF)
- `supabase/functions/admin-read-audit-log/index.ts`

Lifecycle: Runtime, append-only.

Last verified: 2026-05-08

---

### `public.partner_high_schools`

Class: A — Postgres table
Purpose: Coach-scheduler partner school registry. 2 rows. Distinct from `public.hs_programs` (Sprint 001 legacy).

Shape (7 cols, 2 rows): `id` uuid PK, `slug` UNIQUE, `name`, `meeting_location`, `address`, `timezone` DEFAULT `'America/New_York'`, `created_at`.

Defining migrations: `0039_coach_scheduler_tables.sql`, `0044_seed_belmont_hill_school_identity.sql`

Write paths:
- `0044_seed_belmont_hill_school_identity.sql` — Belmont Hill seed
- Operator INSERT only

Read paths:
- `src/components/scheduler/CoachSchedulerSection.jsx` (lookup by slug)
- `api/coach-scheduler-dispatch.ts` — joins via `visit_requests.school_id`

Lifecycle: Runtime. Effectively static (one row per partner school).

Notes:
- Two parallel partner-school sources: `partner_high_schools` (DB, scheduler) and `src/data/recruits-schools.js` (E1, recruits page). They are NOT joined. Onboarding a new school requires updating both.

Last verified: 2026-05-08

---

### `public.coach_submissions`

Class: A — Postgres table
Purpose: Coach scheduler intake — college coach contact info captured when they request a visit.

Shape (7 cols, 5 rows): `id` uuid PK, `name`, `email`, `program`, `source` (enum: `scheduler | registration`) DEFAULT `'scheduler'`, `created_at`, `submitter_verified` bool DEFAULT false.

Defining migrations: `0039_coach_scheduler_tables.sql`, `0041_coach_submissions_intake_log_reframe.sql`

Write paths:
- `src/components/scheduler/CoachSchedulerSection.jsx:11` — intake form

Read paths:
- `api/coach-scheduler-dispatch.ts` — joins to build dispatch email
- `src/components/scheduler/CoachSchedulerSection.jsx`

Lifecycle: Runtime.

Notes:
- This is the de-facto "college coach" record for Sprint 013 scheduler — `public.college_coaches` is NOT used.

Last verified: 2026-05-08

---

### `public.visit_requests`

Class: A — Postgres table
Purpose: Coach scheduler visit request — links a `coach_submission` to a `partner_high_school` and a target date/window.

Shape (8 cols, 5 rows): `id` uuid PK, `coach_submission_id` → `coach_submissions.id`, `school_id` → `partner_high_schools.id`, `requested_date` date, `time_window` (enum 5: `morning | midday | afternoon | evening | flexible`), `notes`, `status` (enum 4) DEFAULT `'pending'`, `created_at`.

Defining migrations: `0039_coach_scheduler_tables.sql`

Write paths:
- `src/components/scheduler/CoachSchedulerSection.jsx:12` — intake (pairs with `coach_submissions`)
- Operator status updates

Read paths:
- `api/coach-scheduler-dispatch.ts` — full row read for dispatch
- Dashboard / admin views

Lifecycle: Runtime.

Notes:
- `time_window` enum maps to concrete time ranges in `api/coach-scheduler-dispatch.ts:34` (`TIME_WINDOW_MAP`).

Last verified: 2026-05-08

---

### `public.visit_request_players`

Class: A — Postgres table (link)
Purpose: Many-to-many between `visit_requests` and the specific student profiles a coach asked to see.

Shape (3 cols, 5 rows): `visit_request_id`, `player_id` → `profiles.user_id`, `created_at`. Composite PK `(visit_request_id, player_id)`.

Defining migrations: `0040_visit_request_players.sql`

Write paths:
- `src/components/scheduler/CoachSchedulerSection.jsx:13`

Read paths:
- `api/coach-scheduler-dispatch.ts` — to email each player

Lifecycle: Runtime.

Notes:
- `player_id` references `profiles.user_id` (unique col), not `profiles.id`. Mixing the two will silently fail joins.

Last verified: 2026-05-08

---

### `public.visit_request_deliveries`

Class: A — Postgres table
Purpose: Per-recipient email delivery log for the coach scheduler dispatch flow.

Shape (11 cols, 3 rows): `id` uuid PK, `visit_request_id` → `visit_requests.id`, `recipient_email`, `recipient_role` (enum 3: `college_coach | head_coach | player`), `recipient_name`, `send_status` (enum 4: `sent | failed | bounced | pending`), `provider_message_id`, `error_code`, `error_message`, `attempted_at`, `delivered_at`.

Defining migrations: `0042_visit_request_deliveries.sql`

Write paths:
- `api/coach-scheduler-dispatch.ts` — service-role-only writer (Hard Constraint 7)

Read paths:
- Operator inspection only (no frontend read confirmed)

Lifecycle: Runtime, append-only.

Notes:
- Service role bypasses RLS — `coach-scheduler-dispatch` is the only legitimate writer.
- One row per recipient per dispatch attempt, regardless of send outcome.

Last verified: 2026-05-08

---

### `public._pre_0037_short_list_items_snapshot`

Class: A — Postgres table (frozen backup)
Purpose: Snapshot of `short_list_items` taken before migration 0037's relabel.

Shape: same as `short_list_items` minus PK constraint. 108 rows, no PK, no FKs.

Defining migrations: side-effect of `0037_relabel_journey_steps_for_scoreboard.sql`

Write paths: none (frozen).
Read paths: forensic only.

Lifecycle: Permanent backup.

Notes:
- Do not query as if it were live data. Use only for diff against `short_list_items` if a 0037 rollback is ever needed.

Last verified: 2026-05-08

---

### `public.supabase_migrations`

Class: A — Postgres table
Purpose: Migration application tracking. Managed by `scripts/migrate.js`.

Shape (3 cols, 13 rows): `version` text PK, `name`, `applied_at`.

Defining migrations: `0000_bootstrap-migrations.sql`

Write paths: `scripts/migrate.js`
Read paths: `scripts/migrate.js`, manual ops

Lifecycle: Runtime, append-only.

Notes:
- Row count (13) does NOT match the 45 migration files in `supabase/migrations/`. Either the runner only tracks a subset, or many migrations were applied out-of-band. Flagged in Section 12.

Last verified: 2026-05-08

---

## 4. Class B — Supabase Storage buckets

Two buckets confirmed via grep + migration review.

### `avatars` (public bucket)

Class: B — Supabase Storage bucket
Purpose: Student avatar images. Path stored in `profiles.avatar_storage_path`.

Shape: object paths like `{user_id}/avatar.jpg`. Public read.

Defining migrations: `0023_storage_avatars_bucket.sql`

Write paths:
- `supabase/functions/fetch-hudl-avatar/index.ts` — fetches from Hudl, writes object + updates `profiles.avatar_storage_path`
- `scripts/backfill-hudl-avatars.js`

Read paths:
- `src/components/Layout.jsx:26` — header avatar
- `src/components/PlayerCard.jsx:50`
- `src/hooks/useRecruitsRoster.js:90`
- `src/pages/coach/CoachRecruitingIntelPage.jsx:306`
- `src/pages/ProfilePage.jsx:366`
- All consumers use `supabase.storage.from('avatars').getPublicUrl(path)` — public URL generation, no signed URL.

Lifecycle: Runtime.

Notes:
- Public bucket. Anyone with the path can read. Don't put anything sensitive here.

Last verified: 2026-05-08

---

### `document_library` (private bucket)

Class: B — Supabase Storage bucket
Purpose: Student document files (transcripts, resumes, etc.). Metadata in `public.document_library`.

Shape: object paths keyed under user_id. RLS on bucket via `0019_document_library_rls_storage.sql`.

Defining migrations: `0013_storage_policies.sql`, `0019_document_library_rls_storage.sql`

Write paths:
- `src/components/DocumentsSection.jsx`, `PreReadLibrary.jsx`

Read paths:
- `src/components/PreReadLibrary.jsx` — generates signed URLs for sharing

Lifecycle: Runtime.

Notes:
- Private. Access via signed URLs only.

Last verified: 2026-05-08

---

## 5. Class C — Edge Functions (Supabase) — request handlers (with state side effects noted)

Eleven Edge Functions, all in `supabase/functions/<slug>/index.ts`. Each handles requests; some have state side effects beyond Postgres writes (rate-limit counters, deno-side caches, log accumulation). Side effects are flagged per entry.

Stack: Deno + `https://esm.sh/@supabase/supabase-js@2`. Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (per EF).

Auth pattern (per memory, DEC 016-C WT-B): all admin EFs use `userClient.auth.getUser(accessToken)` + check `app_metadata.role === 'admin'`. Reference: `admin-read-schools/index.ts:68-77`.

Deployment: `node scripts/deploy-ef.js <function-slug>` → Supabase Management API.

### `verify-email`

Purpose: Validates an email verification token, marks `email_verify_tokens.used_at`, flips `users.email_verified` on success.

DB writes: `email_verify_tokens.used_at`, `users.email_verified`.
DB reads: `email_verify_tokens` by `token`.
Side effects: none beyond DB.

Last verified: 2026-05-08

---

### `send-verification`

Purpose: Issues a verification token, writes to `email_verify_tokens`, sends email.

DB writes: `email_verify_tokens` insert.
External services: email provider (Resend or similar — confirm in Section 12 gaps).
Side effects: outbound email.

Last verified: 2026-05-08

---

### `check-account-status`

Purpose: Returns active/paused/pending status for a user.

DB reads: `users` by `user_id`.
DB writes: none in primary path.
Side effects: none.

Last verified: 2026-05-08

---

### `fetch-hudl-avatar`

Purpose: Scrapes student avatar from Hudl URL, uploads to `avatars` bucket, updates `profiles.avatar_storage_path`.

DB reads: `profiles` (Hudl URL).
DB writes: `profiles.avatar_storage_path`.
Storage writes: `avatars` bucket.
External services: Hudl (HTTP scrape).
Side effects: outbound HTTP request to Hudl. **Subject to Hudl rate limits / TOS**.

Last verified: 2026-05-08

---

### `admin-read-schools`

Purpose: Admin-only paginated read of `schools` (recon endpoint for the Institutions admin tab).

DB reads: `schools`.
Auth: admin gate via `app_metadata.role`.
Side effects: none.

Last verified: 2026-05-08

---

### `admin-read-institutions`

Purpose: Aggregated institution view for the admin Institutions tab. See sibling `aggregate.js` for the rollup logic.

DB reads: `schools` + joins.
Side effects: none.

Last verified: 2026-05-08

---

### `admin-update-school`

Purpose: Admin write to a single `schools` row. Logs the diff to `admin_audit_log`.

DB reads: `schools` (current value, for diff).
DB writes: `schools`, `admin_audit_log`.
Side effects: audit log row.

Last verified: 2026-05-08

---

### `admin-read-users`

Purpose: Admin-only user listing with associations. See sibling `associations.js` for join logic.

DB reads: `users`, `profiles`, link tables.
Side effects: none.

Last verified: 2026-05-08

---

### `admin-read-recruiting-events`

Purpose: Admin-only listing of `recruiting_events`.

DB reads: `recruiting_events` + joins.
Side effects: none.

Last verified: 2026-05-08

---

### `admin-read-audit-log`

Purpose: Admin-only listing of `admin_audit_log`.

DB reads: `admin_audit_log`.
Side effects: none.

Last verified: 2026-05-08

---

### `student-read-recruiting-contacts`

Purpose: Returns the student's resolved HS head coach + counselor email addresses, derived from `hs_coach_students` and `hs_counselor_students`. Used by the Shortlist slide-out.

DB reads: `hs_coach_students`, `hs_counselor_students`, `profiles`. Falls back to `auth.users.email` via `auth.admin.getUserById` when the profile email is missing.
Auth: `student_athlete` (own id only) or `admin` (any id).
Side effects: none.

Why an EF instead of direct RLS read: cross-user `profiles.email` access is sensitive. Scoping through this EF avoids broadening RLS. (See header comment in `index.ts:1-30`.)

Last verified: 2026-05-08

---

## 6. Class D — Vercel serverless API routes

Two routes in `api/`. Mixed runtime project (intentional per OQ5 lock 2026-05-02).

### `api/recruits-auth.ts`

Class: D — Vercel Edge Function
Purpose: Cookie-gated reverse proxy for `/recruits/{slug}/*` paths. Each recruit has a dedicated guide deployment; this function HMAC-validates a cookie and proxies the request to the guide origin.

Runtime: `edge`.

Write paths: HTTP `Set-Cookie` on successful auth. No DB writes.
Read paths: HTTP request inspection; reads env vars `RECRUIT_AUTH_SECRET`, `RECRUIT_PASSWORD_<SLUG>`, `RECRUIT_ORIGIN_<SLUG>`.

State side effects:
- Sets a 30-day signed cookie (`grittyos_recruit_auth`).
- Issues outbound HTTP fetch to recruit guide origin (per request).
- No persistent DB or KV — entirely cookie-driven.

Lifecycle: Runtime per request. Cookie persists 30 days client-side (Class F).

Notes:
- Each recruit's guide origin is in env: `RECRUIT_ORIGIN_<SLUG_UPPER>`. Per-slug password: `RECRUIT_PASSWORD_<SLUG_UPPER>`. Adding a recruit means adding both env vars.
- The login page at `/recruits/login` is served as a static asset (`public/recruits/login.html`).

Last verified: 2026-05-08

---

### `api/coach-scheduler-dispatch.ts`

Class: D — Vercel Node Function
Purpose: Reads a `visit_requests` row, generates an ICS calendar invite, emails it to the college coach + HS head coach + selected players via Resend, writes one `visit_request_deliveries` row per recipient.

Runtime: `nodejs` (function-level pin per OQ5 lock 2026-05-02).

DB reads: `visit_requests`, `coach_submissions`, `partner_high_schools`, `visit_request_players`, `profiles`.
DB writes: `visit_request_deliveries` (service role; bypasses RLS).
External services: Resend (transactional email), `ics` package (in-process ICS gen).

State side effects:
- Outbound email via Resend per recipient.
- Service-role DB writes — sole legitimate writer to `visit_request_deliveries`.
- Time-window mapping is hardcoded (`TIME_WINDOW_MAP`, line 34) — changing slot ranges requires a code change + deploy.

Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`. Non-prefixed (not `VITE_*`) per OQ5 lock.

Lifecycle: Runtime per request.

Last verified: 2026-05-08

---

## 7. Class E — Project config / seed data committed to repo

This is the class that bit the last sprint. Splits into four subclasses by lifecycle and role.

### E1 — Frontend config modules (`src/data/`, `src/lib/copy/`, `src/lib/constants.js`)

Class: E1 — committed JS module, build-time bundled into the SPA.
Lifecycle: Build-time. **Updates require `git commit` + Vercel deploy. Production is NOT updated by editing these files alone.**

#### `src/data/recruits-schools.js`

Purpose: Single source of truth for which schools surface on `/athletes`. Partner-school registry for the recruits page.

Shape: `RECRUIT_SCHOOLS` array of `{ slug, label, filter, active, comingMonth? }`.
- `slug` — URL-safe id (matches `partner_high_schools.slug` in Class A and `school-staff.js` keys in E1)
- `filter` — exact value of `profiles.high_school` for SQL filtering
- `active` — true = roster fetched; false = pill rendered disabled

Current entries (verified): `bc-high` (BC High → `'Boston College High School'`), `belmont-hill` (Belmont Hill → `'Belmont Hill School'`).

Write paths: manual edit.
Read paths:
- `src/hooks/useRecruitsRoster.js`
- `src/components/recruits/SchoolToggle.jsx`
- `src/components/recruits/RecruitsHero.jsx`
- `src/hooks/useSchoolIdentity.js`

Lifecycle: Build-time.

Notes:
- The `slug` here is the canonical identifier. `school-staff.js` keys must match exactly. `partner_high_schools.slug` (DB) must also match.
- Onboarding a new partner school requires updates in at least three places: this file, `school-staff.js`, and `partner_high_schools` row.

Last verified: 2026-05-08

---

#### `src/data/school-staff.js`

Purpose: Display names + emails for partner-school head coach + counselors. Keyed by school slug. Populates the student profile-confirmation flow.

Shape: `SCHOOL_STAFF` map `{ [slug]: { head_coach: { user_id, name, title, email }, counselors: [{ user_id, name, email }] } }`.

Current entries (verified): `bc-high` (Paul Zukauskas + 3 counselors), `belmont-hill` (Frank Roche + June Schmunk).

Write paths: manual edit.
Read paths:
- `src/pages/ProfilePage.jsx` — student staff picker
- `src/hooks/useSchoolIdentity.js`
- `findStaffByUserId(userId)` exported helper

Lifecycle: Build-time.

Notes:
- Why this exists in code rather than DB: coaches and counselors do NOT have `public.profiles` rows. Seed scripts populate `auth.users` + `public.users` only. `public.users` carries no name columns. Student RLS on `profiles` does not grant SELECT to staff rows. Sprint 011 ripped out a dynamic-fetch pattern that broke on this; Sprint 017 replaced it with this static config.
- `user_id` values are real `auth.users.id` UUIDs and must match the live auth records — not invented identifiers.
- Sprint 018 carry-forward C-9 covers the proper structural fix (DB-backed staff identity + RLS).

Last verified: 2026-05-08

---

#### `src/lib/constants.js`

Purpose: Shared constants — `TIER_ORDER` (`Power 4`, `G6`, `FCS`, `D2`, `D3`) and other scoring/UI invariants.

Read paths: `src/lib/scoring.js`, `src/components/RecruitingScoreboard.jsx`, GRIT FIT scorecards.

Lifecycle: Build-time.

Last verified: 2026-05-08

---

#### `src/lib/statusLabels.js`

Purpose: Single source of truth for GRIT FIT status pill labels, colors, priority order.

Shape: `STATUS_LABELS` (six keys: `currently_recommended`, `below_academic_fit`, `out_of_academic_reach`, `out_of_athletic_reach`, `below_athletic_fit`, `outside_geographic_reach`), `STATUS_ORDER`, `getStatusConfig(key)`.

Read paths: every file rendering a GRIT FIT status pill. Coach-side files retain local copies — see file header.

Lifecycle: Build-time.

Notes:
- The DB enum on `short_list_items.grit_fit_status` carries the source-of-truth keys (7 keys including `not_evaluated`). This file maps 6 to display copy. `not_evaluated` intentionally renders no pill.

Last verified: 2026-05-08

---

#### `src/lib/copy/*.js`

Purpose: Operator-editable copy for static content sections.

Files:
- `homeJourneyCopy.js` — `HOME_JOURNEY_STEPS` (3 entries: Profile, Grit Fit, Short List). **NOT the 15-step recruit journey** — see Section 11.
- `homeCopy.js` — Home view body copy
- `gritFitExplainerCopy.js` — GRIT FIT explainer
- `shortlistCopy.js`, `shortlistMailtoCopy.js` — Shortlist UI copy + mailto templates
- `tooltipCopy.js` — tooltip strings

Read paths: corresponding components.

Lifecycle: Build-time.

Notes:
- `homeJourneyCopy.js` defines the **3-step user-flow journey** (the home page card stack: Profile → Grit Fit → Short List). It is NOT the 15-step recruiting journey, which lives in `short_list_items.recruiting_journey_steps` (Class A).

Last verified: 2026-05-08

---

#### Other notable E1 modules

| File | Purpose |
|---|---|
| `src/lib/scoring.js`, `src/lib/scoring/g9SubordinateStep.js` | Athletic fit + boost calc |
| `src/lib/grit-fit/athleticFitThresholds.js` | Threshold table per tier × position |
| `src/lib/grit-fit/recomputeMatches.js` | Full GRIT FIT pipeline |
| `src/lib/grit-fit/matchReturnLogic.js` | Match selection rules |
| `src/lib/offerStatus.js` | Derives verbal/written offer from `recruiting_journey_steps` (NOT a stored field) |
| `src/lib/gritFitStatus.js` | Status priority ordering (`LABEL_PRIORITY`) |
| `src/lib/documentTypes.js`, `preReadLibrary.js` | Document type enums + helpers |
| `src/lib/buttonStateLogic.js`, `nextStepsUtils.js`, `pagination.js` | UI helpers |
| `src/lib/adminTabs.js`, `adminUsersColumns.js` | Admin panel column configs |
| `src/lib/map/{overlayLogic,recruitingListFilter,statusFilter}.js` | Map filtering |
| `src/lib/recruits/utils.js` | Recruits page roster helpers |
| `src/lib/schoolShortName.js`, `gpaDistributions.js`, `hasPassword.js`, `navLinks.js`, `athletesInterestedDisplay.js` | Misc |

All E1. All build-time. All require deploy to update.

Last verified: 2026-05-08

---

### E2 — Build-time reference data (`data/`)

Lifecycle: Bootstrap-time. Read by seed scripts; not bundled into the SPA.

#### `data/hs_programs.csv`

Purpose: Source CSV for `hs_programs` table seed.
Read paths: `data/seed_hs_programs.sql`, manual ops.
Lifecycle: One-time at bootstrap.

#### `data/seed_hs_programs.sql`

Purpose: Idempotent seed for `public.hs_programs` from the CSV.
Lifecycle: One-time at bootstrap.

#### `data/users.csv`

Purpose: Source CSV referenced by user-import operator scripts.
Read paths: `scripts/bulk_import_students.js`, `scripts/import_*.py`.
Lifecycle: Operator-driven.

Last verified: 2026-05-08

---

### E3 — Operator seeding artifacts (`src/assets/*.csv`, `src/assets/*.png`)

> ## ⚠️ NOT A RUNTIME DATA SOURCE
>
> Files in this subclass are **operator artifacts committed for traceability**. They are NOT loaded by the running app, NOT consumed by build, and NOT referenced by any frontend code at runtime. The placement under `src/assets/` is misleading — Vite's `src/assets/` is conventionally for image imports, but these CSVs are NEVER imported.
>
> Updating these files does NOT change anything in production. To onboard a partner school, use the import scripts (`scripts/import_*.py`) which read these CSVs locally as input.

#### `src/assets/Belmont Hill School Account Seeding - Students.csv`
#### `src/assets/Belmont Hill School Account Seeding - Coaches.csv`
#### `src/assets/Belmont Hill School Account Seeding - Counselor.csv`
#### `src/assets/Belmont Hill_Recruit Journey Seeding - RecruitJourneySteps.csv`
#### `src/assets/Require Changes_Belmont Hill Accounts.png`

Purpose: Operator inputs for the Sprint 017 / 019 Belmont Hill onboarding. Likely consumed by a yet-to-be-written or partially-written `scripts/import_*.py` import script (BC High has equivalents — `import_bc_high_counselors.py`, `import_paul_zukauskas.py`, `import_shortlist_bc_high.py`).

Write paths: operator commits the CSV from a Google Sheet export.
Read paths: **none at runtime.** Bootstrap-time read by import scripts in `scripts/` (operator-run, service-role).

Lifecycle: Bootstrap. Committed for traceability. After import, the data lives in:
- Students → `auth.users`, `public.users`, `public.profiles`, `public.hs_coach_students`, `public.hs_counselor_students`, `public.short_list_items` (with the 15-step JSONB seeded by column DEFAULT)
- Coaches → `auth.users`, `public.users`, `public.hs_coach_schools` (and surfaced via `src/data/school-staff.js` for display names — E1)
- Counselors → `auth.users`, `public.users`, `public.hs_counselor_schools`
- "Recruit Journey Seeding" CSV → seed values written into `short_list_items.recruiting_journey_steps` JSONB during bulk import (overrides the column DEFAULT for pre-checked steps)

Notes:
- The `Belmont Hill_Recruit Journey Seeding - RecruitJourneySteps.csv` filename is the most error-prone in the repo. It looks like it could be a runtime data source. It is not. Its content ends up in `public.short_list_items.recruiting_journey_steps` as JSONB after import, on a per-(student, school) basis.
- Image assets in this group (`Belmont Hill background.jpg`, `Belmont Hill Logo and Brand.png`, `bchigh-team.jpg`) ARE imported by components and ARE runtime — see E4 if/when migrated to `public/`, or treat as the standard Vite asset import case.

Last verified: 2026-05-08

---

### E4 — Static public assets (`public/`)

Lifecycle: Build-time → served as static files at deploy origin.

#### `public/recruits/login.html`

Purpose: Static login page for the recruit-guide auth flow served by `api/recruits-auth.ts`. Submits a password to `/recruits/auth`.

Lifecycle: Build-time. Served directly by Vercel static.

Notes:
- The `recruits-auth` Edge Function explicitly skips `/recruits/login` so the static asset is served (`api/recruits-auth.ts:96`).

#### `public/tour/*.png`

Purpose: Tour walkthrough placeholder screenshots (`gritfit-step-*-placeholder.png`, `browse-step-*-placeholder.png`).

Read paths: tour components in `src/components/Tutorial.jsx`.

Lifecycle: Build-time.

#### `public/grittyfb-logo.png`, `public/helmet.png`

Purpose: Logo + helmet asset used in the masthead and helmet animation (`HelmetAnim.jsx`).

Lifecycle: Build-time.

Last verified: 2026-05-08

---

## 8. Class F — Browser-local state

### `sessionStorage.helmetShown`

Class: F — sessionStorage
Purpose: Per-tab flag to suppress repeat helmet animation on the landing page.

Shape: string `'1'` after first display.

Write paths: `src/pages/LandingPage.jsx:50`
Read paths: `src/pages/LandingPage.jsx:47`

Lifecycle: Per-tab (cleared on tab close).

Notes:
- This is the ONLY sessionStorage / localStorage write found in `src/`. All other client state is in React state or query results.

Last verified: 2026-05-08

---

### Cookie: `grittyos_recruit_auth`

Class: F — HTTP cookie (HMAC-signed)
Purpose: Recruit-guide auth gate.

Shape: `<slug>.<hex_hmac_sha256_signature>`. Max age 30 days. Set by `api/recruits-auth.ts`.

Write paths: `api/recruits-auth.ts` — `Set-Cookie` on successful login.
Read paths: `api/recruits-auth.ts` — `verifyCookie` on every `/recruits/{slug}/*` request.

Lifecycle: 30-day client-side persistence.

Notes:
- HMAC secret is `RECRUIT_AUTH_SECRET` (env). Constant-time comparison.
- Per-slug — auth for `bc-high` does not grant access to `belmont-hill`.

Last verified: 2026-05-08

---

### Supabase Auth tokens (in `localStorage`)

Class: F — localStorage (managed by `@supabase/supabase-js`)
Purpose: Holds the Supabase session JWT + refresh token.

Shape: managed by Supabase SDK. Default key: `sb-<project-ref>-auth-token`.

Write/Read paths: `@supabase/supabase-js` SDK only — never accessed directly by app code.

Lifecycle: Persistent until logout / refresh token expiry.

Notes:
- App code does not touch this. Listed for completeness because it IS a state location.
- No first-party `localStorage` writes were found — the only direct-access browser-storage key in this codebase is `sessionStorage.helmetShown` above.

Last verified: 2026-05-08

---

## 9. Class G — Environment variables

Grouped by consumer.

### Browser (Vite-bundled, prefixed `VITE_*`)

| Var | Source | Consumers |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project | `src/lib/supabaseClient.js`, `src/pages/ProfilePage.jsx:284`, `src/pages/ShortlistPage.jsx:298` |
| `VITE_SUPABASE_ANON_KEY` | Supabase project | `src/lib/supabaseClient.js`, `src/pages/ProfilePage.jsx:285` |

Notes:
- These ship to the browser. Anon key is intended public.

### Vercel Edge / Node functions (api/)

| Var | Consumer |
|---|---|
| `RECRUIT_AUTH_SECRET` | `api/recruits-auth.ts` (HMAC) |
| `RECRUIT_PASSWORD_<SLUG>` (per recruit) | `api/recruits-auth.ts` |
| `RECRUIT_ORIGIN_<SLUG>` (per recruit) | `api/recruits-auth.ts` (proxy target) |
| `SUPABASE_URL` | `api/coach-scheduler-dispatch.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/coach-scheduler-dispatch.ts` (service role; RLS bypass) |
| `RESEND_API_KEY` | `api/coach-scheduler-dispatch.ts` |
| `RESEND_FROM_ADDRESS` | `api/coach-scheduler-dispatch.ts` |

### Supabase Edge Functions (Deno runtime, `Deno.env.get`)

| Var | Consumers |
|---|---|
| `SUPABASE_URL` | All EFs |
| `SUPABASE_SERVICE_ROLE_KEY` | All EFs |

### Operator scripts (Node, `process.env`, loaded via `dotenv`)

| Var | Consumers |
|---|---|
| `SUPABASE_URL` | scripts/* |
| `SUPABASE_SERVICE_ROLE_KEY` | scripts/* (service role) |
| `SUPABASE_PAT` | `scripts/migrate.js`, `scripts/deploy-ef.js`, `scripts/verify_idx_raw.js`, `scripts/verify_migrations_0028_0032.js` |
| `SUPABASE_PROJECT_REF` | migration + verify scripts |
| `DATABASE_URL` | `scripts/migrate.js` (Postgres direct) |
| `SUPABASE_DB_PASSWORD` | (in `.env`, used by DATABASE_URL) |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` (fallback) | several scripts |
| `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` | scrape scripts (fallback path) |

### Playwright E2E (tests/)

| Var | Consumers |
|---|---|
| `PLAYWRIGHT_BASE_URL` | `playwright.config.js:41` (default `https://app.grittyfb.com`) |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | admin specs |
| `TEST_STUDENT_EMAIL` / `TEST_STUDENT_PASSWORD` | student specs |
| `TEST_COACH_EMAIL` / `TEST_COACH_PASSWORD` | coach specs |
| `CI` | reporter / retry config |

Notes:
- `.env` and `.env.local` both present in repo root. Both are gitignored (see Section 12 items 7 and 8). `.env` holds live Supabase credentials. `.env.local` is the Vercel-pulled file (`vercel env pull .env.local`) and contains the `VERCEL_OIDC_TOKEN`. Neither is tracked or pushed.
- No `.env.example` is present in the repo. There is no committed template that documents the expected variable list.

### 9.1 Source-of-truth question (`.env` vs Vercel)

For variables consumed by the live Vercel deployment (`api/recruits-auth.ts`, `api/coach-scheduler-dispatch.ts`, browser bundle), there are two possible canonical-storage models. The codebase does not state which model applies, and getting this wrong reverses the rotation order. This subsection documents what is known and what remains open.

**The two models:**

- **Model A — Local `.env` is canonical.** Operator edits `.env`, then manually copies values into the Vercel dashboard (or pushes them via `vercel env add`). Vercel's stored values are downstream copies. To rotate: edit `.env` first, then push.
- **Model B — Vercel is canonical.** Vercel dashboard / `vercel env` is the authority. Local `.env.local` is a developer-machine copy obtained via `vercel env pull`. `.env` may be a hand-maintained dev-only copy that diverges from production. To rotate: rotate at the issuer, update Vercel first, then `vercel env pull` to refresh local.

**What can be inferred from the codebase:**

- `.env.local` contains a `VERCEL_OIDC_TOKEN` and a header comment `# Created by Vercel CLI`. This is the standard `vercel env pull` output. Strong evidence that `.env.local` is Vercel-pulled (Model B-shaped for whatever variables it contains).
- `.env` has no `# Created by Vercel CLI` header. It looks hand-edited, with section comments organized by consumer (`# ── Supabase API (frontend + Vite) ──`, `# ── Supabase service role (scripts only — never expose to browser) ──`, etc.). It is not the output of `vercel env pull`.
- `.env.local` does NOT mirror all of `.env` — `.env.local` (read in this audit) contains only `VERCEL_OIDC_TOKEN`. None of `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `RECRUIT_AUTH_SECRET`, `RECRUIT_PASSWORD_*`, or `RECRUIT_ORIGIN_*` were present in `.env.local` at audit time.
- Consequence: there are at least two distinct env stores in play. `.env` holds Supabase + DB secrets used by local scripts. Vercel-deployment-time secrets (`RESEND_API_KEY`, `RECRUIT_AUTH_SECRET`, the per-recruit `RECRUIT_*_<SLUG>` triplets, and the `SUPABASE_*` values used by `api/coach-scheduler-dispatch.ts`) must be set somewhere else for the live functions to work — and the only candidate is the Vercel project's environment variables.
- Inferred state: Vercel is canonical for variables consumed by live `api/*` functions. `.env` is canonical (or at minimum the working copy) for variables consumed by local `scripts/*` and `vitest` runs. The two stores overlap on the Supabase variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), and there is no automation in the repo that keeps them in sync.

**Likely canonical store, by variable** (best-guess from the inference above; not confirmed):

| Variable | Likely canonical | Used by | Confidence |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Vercel (build-time) + `.env` (local dev) | browser bundle, scripts | medium — both copies must match |
| `VITE_SUPABASE_ANON_KEY` | Vercel (build-time) + `.env` (local dev) | browser bundle | medium — both copies must match |
| `SUPABASE_URL` | Vercel (for `api/*`) + `.env` (for scripts) | api routes, scripts, EFs | medium |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (for `api/coach-scheduler-dispatch.ts`) + `.env` (for scripts) | api route, scripts, EFs | medium |
| `RESEND_API_KEY` | Vercel only | `api/coach-scheduler-dispatch.ts` | high — never appears in `.env` |
| `RESEND_FROM_ADDRESS` | Vercel only | `api/coach-scheduler-dispatch.ts` | high |
| `RECRUIT_AUTH_SECRET` | Vercel only | `api/recruits-auth.ts` | high |
| `RECRUIT_PASSWORD_<SLUG>` | Vercel only | `api/recruits-auth.ts` | high |
| `RECRUIT_ORIGIN_<SLUG>` | Vercel only | `api/recruits-auth.ts` | high |
| Supabase Edge Function `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project (auto-provisioned) | all EFs in `supabase/functions/` | high — set by Supabase platform, not Vercel |
| `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `SUPABASE_PAT`, `SUPABASE_PROJECT_REF` | `.env` only | `scripts/migrate.js`, `scripts/deploy-ef.js`, verify scripts | high — script-only, never used by Vercel deployment |
| `TEST_*_EMAIL`, `TEST_*_PASSWORD`, `PLAYWRIGHT_BASE_URL` | `.env` (local) + CI secret store (if any) | Playwright | medium |

**What is unknown and requires operator confirmation:**

- Whether the Vercel project actually has the `SUPABASE_*`, `RESEND_*`, and `RECRUIT_*` variables set (cannot be checked from the repo alone — Vercel CLI or dashboard inspection required).
- Whether anyone has copied the `.env` Supabase values into Vercel, or whether Vercel has independently issued values that drifted from `.env`.
- Whether there is a separate CI secret store for Playwright credentials.
- Whether the Supabase Edge Functions inherit `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from the Supabase platform automatically (likely) or from explicit secrets configured per function.
- Whether any deployment script or runbook documents the canonical store; none was found in `docs/` or `scripts/` during this audit.

**Why this matters:**

- For a credential rotation, the order depends on which store is canonical. If Vercel is canonical, you rotate at the issuer → update Vercel first → optionally update `.env` for parity. If `.env` is canonical, you rotate at the issuer → update `.env` → push to Vercel.
- For variables that have copies in BOTH stores (the Supabase block), forgetting to update one side leaves the live app reading a stale value. The script side and the live-app side can silently diverge.
- For variables with NO local copy (the Resend + Recruit blocks), `.env` is irrelevant; rotation is purely "update at issuer, update Vercel."

**Recommendation for next audit step (out of scope here):** run `vercel env ls` against the production environment and diff against the `.env` file. That single command would confirm canonicality and surface drift. This audit did not do it because the prompt was read-only and `vercel env` would touch the Vercel platform.

Last verified: 2026-05-08

---

## 10. Class H — External services with state

### Hudl

Class: H — third-party
Purpose: Source of student avatar images.
Consumers: `supabase/functions/fetch-hudl-avatar/index.ts`, `scripts/backfill-hudl-avatars.js`.
Side effects on this repo: writes `profiles.avatar_storage_path` + uploads to `avatars` bucket.
State holder: Hudl owns the avatar URL → image mapping.

Last verified: 2026-05-08

---

### Resend

Class: H — third-party (transactional email)
Purpose: Outbound email for coach scheduler dispatch (and likely `send-verification`, to be confirmed).
Consumers: `api/coach-scheduler-dispatch.ts`.
State holder: Resend retains delivery logs server-side; this repo persists per-recipient outcome to `visit_request_deliveries`.

Last verified: 2026-05-08

---

### Vercel platform

Class: H — hosting / orchestrator
Purpose: Hosts the SPA, the `api/*` routes, environment variables, deployment state.
State held: deployment artifacts, env var values per environment, OIDC tokens (`.env.local` `VERCEL_OIDC_TOKEN`).
Consumers: implicit — every deploy.

Last verified: 2026-05-08

---

### IPEDS / external NCAA data sources

Class: H — third-party
Purpose: Source of `schools` table data (662 rows: cost of attendance, graduation rates, division, conference, etc.).
Consumers: `scripts/sync_schools.py`.
State holder: IPEDS / NCAA. This repo periodically syncs.

Last verified: 2026-05-08

---

## 11. Where does X live? (router → canonical entries)

Pointers only. The canonical answer always lives in the Section 3–10 entry. **Each Q ends with "See Section X entry: Y."**

### Q1 — Where do recruit journey steps live?

In a JSONB column on `public.short_list_items`. One copy per (student, school) row. Default 15-element array seeded by Postgres on INSERT. Defined in migration `0009_short_list_items.sql`, reordered in `0024_reorder_journey_steps.sql`, relabeled in `0037_relabel_journey_steps_for_scoreboard.sql`. Updates require a migration AND a remap.

**See Section 3 entry: `public.short_list_items`.**

### Q2 — Where is the partner-school registry (BC High, Belmont Hill)?

Three places that must stay in sync — they are NOT joined automatically:
1. `src/data/recruits-schools.js` (E1) — for the recruits page UI.
2. `public.partner_high_schools` (Class A) — for the coach scheduler.
3. `public.hs_programs` (Class A, legacy) — Sprint 001 link tables.

The `slug` is the canonical identifier across all three.

**See Section 7 entry E1: `recruits-schools.js`** (canonical UI source) and **Section 3 entry: `partner_high_schools`** (canonical scheduler source).

### Q3 — Where are partner-school head coach + counselor identities (display names + emails)?

`src/data/school-staff.js` (E1, build-time, requires deploy). Underlying `auth.users` + `public.users` rows hold the auth records, but no `public.profiles` row exists for staff. This file restores correctness because `profiles` is the only source of names, and student RLS doesn't allow cross-user reads.

**See Section 7 entry E1: `school-staff.js`.**

### Q4 — What about the Belmont Hill seeding CSVs in `src/assets/`?

⚠️ **Not a runtime data source.** They are operator artifacts read by import scripts in `scripts/`, then committed for traceability. Updating the CSV does NOT change production. The data ends up in `auth.users`, `public.users`, `public.profiles`, `hs_coach_students`, `hs_counselor_students`, `short_list_items`, etc., after the import script runs.

**See Section 7 entry E3: Operator seeding artifacts.**

### Q5 — Where is offer status (verbal / written) calculated?

Derived in `src/lib/offerStatus.js`. NOT a stored column. `hasVerbalOffer(item)` and `hasWrittenOffer(item)` read `short_list_items.recruiting_journey_steps` and check `step_id === 14` (verbal) or `step_id === 15` (written) with strict-true completion. Consumers: `ShortlistSlideOut.jsx`, `RecruitingScoreboard.jsx`, `SchoolDetailsCard.jsx`, `GritFitMapView.jsx`, `GritFitTableView.jsx`.

**See Section 7 entry E1: `offerStatus.js` (in "Other notable E1 modules") and Section 3 entry: `public.short_list_items`** (the source data).

### Q6 — Where do the Recruiting Scoreboard column headers come from?

A component-local constant `SCOREBOARD_COLUMNS` at `src/components/RecruitingScoreboard.jsx:57`. The Scoreboard reads booleans from `short_list_items.recruiting_journey_steps` by `step_id`, but renders its own column headers (`HC Contact`, `AC Contact`, `Jr Day Invite`, `FB Camp Invite`, `Tour / Visit Confirmed`, `Admissions Pre-Read Req.`, `Financial Aid Pre-Read Submitted`) — NOT the JSONB `label` field. Changing JSONB labels does not change Scoreboard text. Migration `0037` aligned the JSONB labels to these headers, but the binding is still `step_id`-based.

**See Section 3 entry: `public.short_list_items`** (Notes section, "The Scoreboard's column headers come from a component-local constant").

### Q7 — Why does `public.profiles` have no rows for HS coaches or counselors?

Seed scripts populate `auth.users` + `public.users` only. `public.users` has no name columns. Adding staff to `profiles` would require either (a) broader RLS policies that let students SELECT staff `profiles` rows (rejected for privacy), or (b) a separate identity table. Sprint 011 attempted dynamic resolution and broke; Sprint 017 worked around it with `src/data/school-staff.js` (E1). Sprint 018 carry-forward C-9 covers the proper structural fix.

**See Section 3 entry: `public.profiles`** (Notes) **and Section 7 entry E1: `school-staff.js`** (Notes).

### Q8 — Where are Recruiting Journey step LABELS defined? (vs the order, vs the count)

The labels are stored per-row in the JSONB column `recruiting_journey_steps` on each `short_list_items` row. The column DEFAULT in Postgres carries the canonical 15-label set; a row gets its own copy on INSERT. Updating labels for **future** rows requires migrating the column DEFAULT. Updating **existing rows** requires a remap migration (see `0024` and `0037`). The labels are NOT in any frontend config file — but the Scoreboard displays its own copy regardless (Q6).

**See Section 3 entry: `public.short_list_items`** (full DEFAULT inlined).

### Q9 — Where is the home page 3-step user-journey copy? (Profile → Grit Fit → Short List)

`src/lib/copy/homeJourneyCopy.js` (E1). This is unrelated to the 15-step recruit journey. The 3 entries (`profile`, `gritfit`, `shortlist`) drive the `JourneyStepper` cards on the landing/home view.

**See Section 7 entry E1: `homeJourneyCopy.js`** (in "src/lib/copy/*.js").

### Q10 — Where do recruit-guide auth secrets live?

Environment variables on the Vercel project: `RECRUIT_AUTH_SECRET` (HMAC), `RECRUIT_PASSWORD_<SLUG>` (per-recruit password), `RECRUIT_ORIGIN_<SLUG>` (per-recruit guide URL). Cookie-based session, 30-day expiry. No DB table involved.

**See Section 6 entry: `api/recruits-auth.ts`** and **Section 9: env vars.**

### Q11 — Where are GRIT FIT match results stored?

Two pieces:
- The full universe scored is in `public.schools` (read every run; no scored output written back).
- The selected matches the student keeps are written to `public.short_list_items` with `source = 'grit_fit'`.
- Per-row primary status: `short_list_items.grit_fit_status`. Full status set: `short_list_items.grit_fit_labels` (text array, 0020).
- Run telemetry (timestamp, zero-match flag): `public.profiles.last_grit_fit_run_at` + `last_grit_fit_zero_match` (0021).

**See Section 3 entries: `public.schools`, `public.short_list_items`, `public.profiles`.**

### Q12 — Where is the canonical 5-tier division key for a school?

`public.schools.type` (NOT `ncaa_division`). Five values: `Power 4`, `G6`, `FCS`, `D2`, `D3`. UConn (FBS Independent) maps to `G6` per DEC-CFBRB lock. Frontend mapping safety net in `src/components/RecruitingScoreboard.jsx:75` (`tierFromDiv`).

**See Section 3 entry: `public.schools`** (Notes).

---

## 12. Known gaps

Items I could not confirm in this audit, or that are ambiguous and need operator input.

1. **`public.supabase_migrations` row count mismatch.** The live table has 13 rows; `supabase/migrations/` has 45 SQL files. Either (a) `scripts/migrate.js` only registers a subset, (b) earlier migrations were applied out-of-band before the tracking table existed (`0000_bootstrap-migrations.sql` is plausibly the pivot), or (c) the runner stops registering at some point. Worth confirming before assuming any migration-tracking automation is reliable.

2. **`send-verification` external service.** The function presumably sends transactional email but I did not read its full body in this audit. Resend is plausible (matches `coach-scheduler-dispatch`), but a different provider is possible. Confirm the env var (`RESEND_API_KEY` vs `SENDGRID_*` vs other) before relying on the assumption.

3. **`scripts/import_belmont_hill_*.py`** — does this exist? BC High has dedicated import scripts (`import_paul_zukauskas.py`, `import_bc_high_counselors.py`, `import_shortlist_bc_high.py`). For Belmont Hill, the `src/assets/Belmont Hill *.csv` artifacts are committed but a corresponding import script could not be confirmed. Sprint 019 may need to write one OR the existing `bulk_import_students.js` may be the intended consumer. Operator input needed.

4. **`Belmont Hill_Recruit Journey Seeding - RecruitJourneySteps.csv` import target shape.** The CSV almost certainly seeds non-default `completed`/`completed_at` values into `short_list_items.recruiting_journey_steps` for pre-existing student progress. The exact mapping (how the CSV columns map to step_id + completed flags + dates) is not documented and the import script is not yet identified (item 3). **This is the artifact that prompted the audit — do not assume its semantics.**

5. **`prototypes/recruiting-scoreboard/`** — directory exists. Likely a self-contained HTML/JS prototype, possibly the source of `SCOREBOARD_COLUMNS` headers. Not audited as runtime state, but flagged in case it holds reference data.

6. **`extracted/`** — contains `D1-FBS.html|json`, `D1-FCS.html|json`, etc., plus various pilot CSVs. These look like one-time scrape outputs feeding `school_link_staging`. Whether any are still actively read by scripts is not confirmed.

7. **`credentials.json` and `token.pickle` in repo root — local-only, NOT exposed via the repo.** Both files exist on the developer machine at the repo root. Both are explicitly listed in `.gitignore` (lines 20 and 21). `git log --all --diff-filter=A -- credentials.json token.pickle` returned zero results — neither file has ever been added to any branch. `git ls-files` confirms they are not currently tracked. The earlier framing of these files as "committed" in the initial pass of this document was incorrect and has been corrected. Contents (Google OAuth installed-app credentials for project `grittyos-extract`; pickled OAuth refresh token, 1052 bytes binary) are local-only. The consumers of these files were still not traced in this audit — they belong to a Python script that uses Google APIs (Sheets export is the most likely candidate). See item 14 for the hygiene-level concern that they may belong to a stale or unused workflow.

8. **`.env` in repo root — local-only, NOT exposed via the repo.** The repo root `.env` contains live `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `SUPABASE_PAT`, and other Supabase credentials. The file is explicitly listed in `.gitignore` (line 3). `git log --all --diff-filter=A -- .env` returned zero results — `.env` has never been added to any branch. `git ls-files` confirms it is not currently tracked. `.env.local` is also gitignored (line 29) and never tracked. The earlier framing of `.env` as "committed" in the initial pass of this document was incorrect and has been corrected. The `.env` file is properly local-only. See item 15 for the separate hygiene-level concern about credential reuse inside the file.

9. **`scripts/import_staging_to_schools_DEPRECATED_20260405.py`** — deprecation marker present. Worth a doc note that the live path is `import_ready_to_production.py`, but this audit did not deeply read the active import pipeline.

10. **`api/recruits-auth.ts` cookie observability.** No metrics or logs are emitted from this function (per the file body). If a recruit reports auth failures, there is no first-party telemetry; reproduction depends on Vercel function logs only.

11. **GRIT FIT scored output write-back.** GRIT FIT computes match status per (student, school) on every run, but the result is NOT persisted for unranked schools — only schools the student adds to their shortlist get a `short_list_items` row. The previous run's full ranked list is not stored anywhere. Worth confirming this is intentional before any sprint that wants historical match comparison.

12. **Layout-level shared queries.** `src/components/Layout.jsx:102` issues a `profiles` read on every page mount. There is no global query cache (no React Query, SWR, or context-level cache visible). Each page re-issues its own profile fetch. Worth noting if a future sprint wants to consolidate.

13. **Sprint 019 specific — recruit journey step seeding.** The acceptance test mentions Sprint 019 will seed `recruiting_journey_steps` for Belmont Hill students. The mechanism (column DEFAULT applies to new rows; the CSV in E3 likely overrides per-row for pre-completed steps) needs operator confirmation. The shape of the CSV (column → step_id mapping, date format) is the integration contract and is undocumented.

14. **HYGIENE — `credentials.json` and `token.pickle` may be stale.** Not an exposure incident (see item 7). Both files were last modified 2026-04-01 (`credentials.json`) and 2026-04-20 (`token.pickle`). No grep hit found in `scripts/` for either filename. Their consuming script — a Python workflow that uses Google OAuth for an installed-app flow against the `grittyos-extract` GCP project — was not identified in this audit. If the workflow is no longer in use, both files should be deleted from the developer machine (separate decision; deferred per current sprint scope). If still in use, the script that consumes them should be documented in `scripts/`.

15. **HYGIENE — DB password reuse inside `.env`.** Not an exposure incident (see item 8). The `SUPABASE_DB_PASSWORD` value `Bawhak20202026` appears twice in `.env`: once as `SUPABASE_DB_PASSWORD` and once embedded inside `DATABASE_URL`. Two literal copies of the same secret in one file is a minor maintenance hazard — a future password rotation must remember to update both. Worth a small refactor (have `DATABASE_URL` reference `${SUPABASE_DB_PASSWORD}` if the loader supports interpolation, or remove `SUPABASE_DB_PASSWORD` if `DATABASE_URL` is the only consumer). Hygiene only; no rotation pressure from this finding alone.

---

*End of DATA_INVENTORY.md*
