# GRITTY RECRUIT HUB REBUILD — QA STRATEGY PHASE 1
**Owner:** Quin (QA Agent)
**Date:** 2026-03-24
**Status:** DRAFT — pending Scout review before implementation begins
**Repo:** gritty-recruit-hub-rebuild

---

## 1. CONTEXT AND SIMPLIFYING CONDITIONS

The following conditions from Chris's answers materially reduce QA scope relative to the
original cfb-recruit-hub test plan:

**ALL accounts are seeded and admin-activated.**
- No self-service signup flows exist in Phase 1 MVP
- No account creation tests needed — login-only
- No email verification tests needed — accounts are pre-confirmed
- No pending-to-active promotion tests needed — all accounts start active
- No coach "pending" status promotion workflow to test

**Only one high school (BC High).**
- No multi-school edge cases
- All coach-student relationships derive from a single school_id
- Junction table tests are simple: one school, fixed set of students

**Fixed user set.**
- 2 coaches, 3 guidance counselors, small number of students
- All test accounts are named and provisioned, not dynamically generated
- Concurrent-user collision risk is low but still must be tested for the shortlist

**SAID is retained (profiles table).**
- SAID generation trigger test is still required (profiles insert fires trigger)
- user_id is the sole FK on short_list_items and file_uploads (said removed there)
- auth_said() RPC still used for session restore

**Financial aid info is coach-visibility-excluded.**
- This is a hard access control assertion — tested in every coach dashboard scenario

---

## 2. PHASE 1 COVERAGE MAP

### Legend
- COVERED: test case exists and is executable
- PARTIAL: test case exists but one or more assertions are stub-level
- UNCOVERED: no test case — gap
- DEFERRED: intentionally out of Phase 1 scope
- BLOCKED: cannot test until a dependency is resolved

### 2.1 Schema (Step 1)

| Path | Status | Notes |
|------|--------|-------|
| All 6 tables exist with correct columns | UNCOVERED | Unit test via Supabase JS client needed |
| RLS policies: students read only own rows | UNCOVERED | Playwright auth test with cross-user probe |
| RLS policies: coaches read students at same school_id | UNCOVERED | Coach session + student data fetch assertion |
| RLS policies: no anonymous inserts | UNCOVERED | Unauthenticated insert attempt must return 401/403 |
| SAID trigger fires on profiles insert | UNCOVERED | Profile insert → assert said is non-null |
| said written to user_metadata after linkSaidToAuth | UNCOVERED | auth_said() RPC returns non-null after profile create |
| short_list_items.user_id FK is sole identity (no said FK) | UNCOVERED | Schema inspection test |
| file_uploads.user_id FK is sole identity (no said FK) | UNCOVERED | Schema inspection test |
| recruiting_journey_steps default has 15 steps on insert | UNCOVERED | Insert new shortlist item, count steps in JSON |
| step_id 1 "Added to shortlist" starts completed:true | UNCOVERED | Insert assertion on JSON field |

### 2.2 Auth Flows (Step 4)

| Path | Status | Notes |
|------|--------|-------|
| Student login (email/password) | UNCOVERED | Playwright — seeded account |
| Coach login (email/password) | UNCOVERED | Playwright — seeded account |
| Guidance counselor login | UNCOVERED | Playwright — seeded account |
| Session restore (reload after login) | UNCOVERED | Playwright — reload page, assert still authenticated |
| Session restore via auth_said() RPC | UNCOVERED | Playwright — sign in, reload, assert profile loads |
| Sign out clears session state | UNCOVERED | Playwright — sign out, assert UI shows unauthenticated |
| getSession() used (not getUser()) | PARTIAL | Code review / grep — not a runtime test |
| No anonymous profile insert | UNCOVERED | Playwright — attempt unauthenticated insert, expect block |

### 2.3 GRIT FIT + Student Experience (Step 5)

| Path | Status | Notes |
|------|--------|-------|
| Map loads with 662 school markers | UNCOVERED | Playwright count assertion |
| Map anonymous browse (no auth required) | UNCOVERED | Playwright — no login, confirm map renders |
| Profile form renders for authenticated student | UNCOVERED | Playwright |
| Profile form submission creates profiles row | UNCOVERED | Playwright + DB assertion |
| SAID trigger fires on profiles insert | UNCOVERED | See schema section |
| GRIT FIT algorithm returns 1-30 schools | UNCOVERED | Playwright — submit profile, assert result count |
| GRIT FIT result shows Map View | UNCOVERED | Playwright — assert map renders with filtered markers |
| GRIT FIT result shows Table View | UNCOVERED | Playwright — switch to table, assert rows |
| Table View is sortable | PARTIAL | Playwright — click sort header, assert order changes |
| Shortlist add from Table View | UNCOVERED | Playwright |
| Shortlist add from Map View | UNCOVERED | Playwright |
| Shortlist manual add from full map | UNCOVERED | Playwright |
| Shortlist persists across sign-out / sign-in | UNCOVERED | Playwright |
| grit_fit_status updates on profile re-edit | UNCOVERED | Playwright — edit profile to push school out of range, assert flag |
| source field = "grit_fit" for GRIT FIT adds | UNCOVERED | DB assertion |
| source field = "manual_add" for map adds | UNCOVERED | DB assertion |
| Journey step 1 auto-completed on shortlist add | UNCOVERED | DB assertion |
| Journey steps 2-15 start incomplete | UNCOVERED | DB assertion |
| Journey step toggle (mark complete) | UNCOVERED | Playwright |
| Journey step timestamp written on completion | UNCOVERED | DB assertion |
| Profile form: hs_programs dropdown renders BC High | UNCOVERED | Playwright |
| Profile form: coach auto-link prompt appears if coach found | UNCOVERED | Playwright |
| GRIT FIT scoring logic (unit tests) | COVERED (16 tests from original repo — must port) | |

### 2.4 Coach Dashboard (Step 6)

| Path | Status | Notes |
|------|--------|-------|
| Coach login routes to dashboard | UNCOVERED | Playwright |
| Dashboard shows all BC High students | UNCOVERED | Playwright — assert student count >= seeded count |
| Dashboard shows each student's shortlist | UNCOVERED | Playwright |
| Dashboard shows recruiting journey progress per school | UNCOVERED | Playwright |
| Recruiting activity aggregated by conference/division (not school name) | UNCOVERED | Playwright — assert no individual school names in summary |
| Financial aid info NOT visible to coach | UNCOVERED | Playwright — assert financial aid fields absent from coach view |
| Coach cannot see students from other schools | UNCOVERED | Playwright — probe with cross-school student data |
| File visibility: Transcripts visible to coach | UNCOVERED | Playwright |
| File visibility: Senior Course List visible to coach | UNCOVERED | Playwright |
| File visibility: Writing Examples visible to coach | UNCOVERED | Playwright |
| File visibility: Student Resume visible to coach | UNCOVERED | Playwright |
| File visibility: School Profile PDF visible to coach | UNCOVERED | Playwright |
| File visibility: SAT/ACT Scores visible to coach | UNCOVERED | Playwright |
| File visibility: Financial Aid Info NOT visible to coach | UNCOVERED | Playwright — explicit absence assertion |

### 2.5 File Upload / Download (Step 5/6)

| Path | Status | Notes |
|------|--------|-------|
| Student uploads Transcript | UNCOVERED | Playwright + Storage assertion |
| Student uploads Senior Course List | UNCOVERED | Playwright |
| Student uploads Writing Example (2 allowed) | UNCOVERED | Playwright — two uploads of same type |
| Student uploads Student Resume | UNCOVERED | Playwright |
| Student uploads School Profile PDF | UNCOVERED | Playwright |
| Student uploads SAT/ACT Scores | UNCOVERED | Playwright |
| Student uploads Financial Aid Info | UNCOVERED | Playwright |
| File_uploads row created in DB on upload | UNCOVERED | DB assertion |
| Coach can download Transcript | UNCOVERED | Playwright |
| Coach cannot download Financial Aid Info | UNCOVERED | Playwright — download attempt blocked |
| Storage path is non-guessable / user-scoped | PARTIAL | Architecture review — not a runtime test |

### 2.6 Scoring Unit Tests

| Gate | Status | Notes |
|------|--------|-------|
| Gate 1 — Athletic Tier (calcAthleticFit, calcAthleticBoost) | COVERED (porting from original repo) | |
| Gate 2 — Geographic Reach (haversine) | COVERED (porting) | |
| Gate 3 — Academic Fit | COVERED (porting) | |
| getClassLabel | COVERED (porting) | |
| Edge: no 40-yard dash value | COVERED (porting) | |
| Edge: test-optional school | COVERED (porting) | |
| Edge: zero matches | COVERED (porting) | |
| Edge: null ADLTV/COA | COVERED (porting) | |

---

## 3. DONE CONDITIONS BY STEP

### Step 1 — Schema Done Conditions

Schema is DONE when ALL of the following are true:

1. All 6 tables exist in the new Supabase project: hs_programs, users, profiles, schools, short_list_items, file_uploads
2. All FK relationships resolve without error (users.user_id → auth.users, profiles.user_id → auth.users, short_list_items.user_id → auth.users, file_uploads.user_id → auth.users, profiles.school_id → hs_programs, users.school_id → hs_programs)
3. RLS is enabled on all tables
4. A test INSERT into profiles with no authenticated session is rejected (RLS blocks anonymous insert)
5. The generate_said() trigger fires on profiles insert and produces a non-null said value in the format GRIT-[year]-[NNNN]
6. short_list_items.recruiting_journey_steps default inserts with exactly 15 steps, step_id 1 completed:true, steps 2-15 completed:false
7. short_list_items has no said column (user_id is sole identity key — per RB-002 and Chris Q11 context)
8. file_uploads has no said column (user_id is sole identity key)
9. A Supabase DB introspection query returns all expected columns for each table (Quin schema verification test passes)

Morty signs off on schema before Step 4 begins. Quin schema verification tests run as part of Morty's sign-off evidence.

### Step 4 — Auth Done Conditions

Auth is DONE when ALL of the following are true:

1. A seeded student account can sign in with email/password and receive a valid Supabase session
2. A seeded coach account can sign in with email/password and receive a valid Supabase session
3. A seeded guidance counselor account can sign in with email/password and receive a valid Supabase session
4. After sign-in, page reload restores the session without re-login (getSession() reads from local memory)
5. After sign-out, session state is cleared and the UI reflects unauthenticated state
6. auth_said() RPC returns the correct said for the authenticated student after profile creation
7. An unauthenticated INSERT into profiles is rejected
8. All auth code uses getSession() not getUser() for user_id retrieval (code review confirmation — not a runtime test)
9. No service role key is present in the browser bundle (code review confirmation)

Note: No signup flow tests exist because all MVP accounts are seeded. If a signup flow is added in a future session, Quin must be notified to add tests before implementation begins.

### Step 5 — GRIT FIT + Student Experience Done Conditions

This step is DONE when ALL of the following are true:

1. The 662-school map renders for an anonymous visitor without requiring login
2. A seeded student account can log in and see the GRIT FIT profile form
3. Submitting the profile form with valid data creates a profiles row in Supabase
4. The GRIT FIT algorithm returns between 1 and 30 schools for the seeded test profile
5. Results are visible in both Map View and Table View
6. A school can be added to the shortlist from the Table View
7. A school can be added to the shortlist from the Map View
8. A school can be manually added from the full 662-school map
9. The shortlist persists across sign-out and sign-in (DB-backed, not localStorage-only)
10. Adding a school from the GRIT FIT list sets source = "grit_fit" in short_list_items
11. Adding a school manually from the full map sets source = "manual_add"
12. short_list_items.recruiting_journey_steps is present and step 1 is completed:true on insert
13. A journey step can be marked complete and the completed_at timestamp is written
14. Editing the student profile so a shortlisted school falls out of GRIT FIT range triggers a grit_fit_status warning flag on that shortlist item (does NOT remove the item)
15. The hs_programs dropdown contains BC High
16. Vitest unit suite: all 16 scoring tests pass (ported from original repo)
17. The profile form includes the parent_guardian_email optional field

### Step 6 — Coach Dashboard Done Conditions

This step is DONE when ALL of the following are true:

1. A seeded coach account can log in and land on the coach dashboard
2. The dashboard displays all seeded student accounts with school_id matching BC High
3. For each student, the dashboard shows their shortlist schools
4. For each shortlist entry, the dashboard shows recruiting journey progress (step completion indicators)
5. Recruiting activity summary shows conference/division aggregation — individual school names are NOT shown in the activity summary
6. Financial aid info fields are absent from the coach dashboard view (explicit absence assertion)
7. The 6 non-financial-aid document types (Transcripts, Senior Course List, Writing Examples, Student Resume, School Profile PDF, SAT/ACT Scores) are downloadable by the coach
8. Financial Aid Info files are NOT accessible to the coach (download attempt is blocked or file type is not rendered in coach view)
9. A coach account cannot access student data from a different school_id (if testable with seeded data)

### Step 7 — Regression Suite Done Conditions

The regression suite PASSES when ALL of the following are true:

1. All Playwright tests in regression.spec.js pass against the live deployed URL
2. All Vitest unit tests in tests/unit/scoring.test.js pass
3. No test is skipped (skipped tests are a Warning, not a PASS condition)
4. No test uses hardcoded credentials — all secrets come from environment variables or GitHub Secrets
5. The full suite completes in under 5 minutes in CI (performance baseline)
6. Dexter confirms green CI after suite run

Minimum passing Playwright suite for v1.0.0:
- TC-AUTH-001: Student login and session restore
- TC-AUTH-002: Coach login and session restore
- TC-AUTH-003: Sign out clears session
- TC-MAP-001: Anonymous map load (662 markers)
- TC-GRIT-001: GRIT FIT result returns 1-30 schools for test profile
- TC-GRIT-002: Results show in Table View
- TC-SL-001: Add school to shortlist from Table View
- TC-SL-002: Shortlist persists across sign-out / sign-in
- TC-COACH-001: Coach dashboard shows BC High students
- TC-COACH-002: Financial aid info absent from coach view
- TC-FILE-001: Student can upload Transcript
- TC-FILE-002: Coach can download Transcript
- TC-FILE-003: Coach cannot access Financial Aid Info file

---

## 4. TEST ACCOUNT PROVISIONING REQUIREMENTS FOR CI

All test accounts must be seeded in the new Supabase project before any Playwright CI runs.

### Required Test Accounts

| Account | user_type | Email (env var) | Notes |
|---------|-----------|-----------------|-------|
| Test Student 1 | student_athlete | TEST_STUDENT_EMAIL | Must have a complete profiles row with SAID generated. Must have at least 1 shortlist item seeded. |
| Test Coach 1 | hs_coach | TEST_COACH_EMAIL | school_id = BC High. Must be active status. |
| Test Guidance Counselor 1 | hs_guidance_counselor | TEST_COUNSELOR_EMAIL | school_id = BC High. Phase 1 MVP — basic account only. |

### Required GitHub Secrets (new project)

| Secret | Contents |
|--------|----------|
| VITE_SUPABASE_URL | New project URL |
| VITE_SUPABASE_ANON_KEY | New project anon key |
| TEST_STUDENT_EMAIL | Seeded student email |
| TEST_STUDENT_PASSWORD | Seeded student password |
| TEST_COACH_EMAIL | Seeded coach email |
| TEST_COACH_PASSWORD | Seeded coach password |
| TEST_COUNSELOR_EMAIL | Seeded counselor email |
| TEST_COUNSELOR_PASSWORD | Seeded counselor password |

Note: TEST_EMAIL and TEST_PASSWORD from the original cfb-recruit-hub repo do NOT carry over. The new secrets must be set for the new project before playwright.yml runs for the first time.

### Test Data Seeding Requirements

Before Playwright CI runs are valid, the following DB state must exist:

1. hs_programs has at least 1 row for BC High (school_id known and stable)
2. auth.users has 3 confirmed accounts (student, coach, counselor)
3. public.users has 3 rows — one per auth account — with correct user_type and school_id
4. public.profiles has 1 row for TEST_STUDENT — with said generated, hs_lat/hs_lng populated (required for haversine in GRIT FIT), gpa/sat/speed_40/position populated
5. public.short_list_items has at least 1 row for TEST_STUDENT (enables shortlist restore test)
6. public.file_uploads has at least 1 Transcript row for TEST_STUDENT (enables coach file access test)
7. schools table has the 662-school dataset loaded (enables GRIT FIT to run)

Seeding must be idempotent — CI can run repeatedly without accumulating duplicate state. Patch owns the seed script or migration approach. Quin defines what state must exist; Patch implements.

### Test Isolation

These tests write to a test-designated Supabase project (the new project created for the rebuild). They do NOT touch the existing cfb-recruit-hub Supabase project (oeekcafirfxgtdoocael). The new project is the test environment. No production data is at risk because there is no production data yet.

If the rebuild reaches a point where a separate staging vs. production Supabase project is needed, Quin will flag that before the first production-bound deployment.

---

## 5. REMAINING QA CONCERNS

### CONCERN 1 — Financial Aid Exclusion is a Hard Access Control Requirement
**Severity: HIGH**

The directive specifies that coaches see all document types EXCEPT Financial Aid Info (Chris Q11). This is not just a UI hide — it must be enforced at the storage/RLS level, not only via conditional rendering. A coach who knows the storage_path could retrieve the file directly if RLS does not block it.

Recommended test: after uploading a Financial Aid Info file as a student, attempt to retrieve the storage URL using the coach's authenticated session. This test must pass at the RLS/Storage policy level, not merely at the component level.

Patch must confirm whether Supabase Storage policies or a signed URL approach is used, and that coach sessions cannot generate signed URLs for Financial Aid files.

**This concern must be flagged to Patch and Morty before file upload implementation begins (Step 5).**

### CONCERN 2 — said Column in short_list_items (Directive vs. Chris Q11 Context)
**Severity: MEDIUM**

The directive schema shows short_list_items with `said text NOT NULL` as a column (Part 3). Chris's answers state "user_id is sole identity key (said removed from short_list_items and file_uploads)." These two sources conflict.

If said is removed from short_list_items, the auth_said() RPC pattern used for RLS on that table must be revised (or user_id-based RLS is used instead). The SAID reference in short_list_items.said in the directive schema may be stale.

**This conflict must be resolved by Patch before the schema migration is written. Quin cannot write accurate schema verification tests until the authoritative column list is confirmed.**

Routing to Scout for a CHECK WITH ME determination on which source takes precedence.

### CONCERN 3 — 15 vs 16 Journey Steps
**Severity: LOW**

Chris confirmed "15 recruiting journey steps" in Q3. The directive (Part 3, short_list_items default JSON) lists exactly 15 steps (step_id 1 through 15). The directive narrative (Part 1) says "16-step recruiting journey" and lists 16 items including a "16. Committed" step not in the schema default. The schema JSON is the implementation truth — 15 steps.

Quin will write journey step tests against 15 steps (matching the schema JSON). If a 16th step is added, Quin must be notified before it lands.

### CONCERN 4 — No Playwright Config Exists Yet
**Severity: MEDIUM**

The rebuild repo has no playwright.config.js. The test infrastructure must be initialized before any spec files can run. This includes:
- playwright.config.js with testDir, baseURL, and testMatch
- playwright.yml GitHub Actions workflow
- vitest.config.mjs for unit tests
- package.json scripts for test:unit and test:e2e

Dexter owns CI workflow config. Quin owns the spec files and config requirements. A working group sync (Quin + Dexter) is needed before Step 7.

### CONCERN 5 — Guidance Counselor View Not Specified
**Severity: LOW**

The directive includes guidance counselors as a Phase 1 account type but does not specify what they see. Q11 answers apply only to student/coach visibility rules. Guidance counselor view scope is undefined.

Quin will defer counselor-specific view tests until the counselor dashboard is specced. For Phase 1, the counselor test account is provisioned and login is tested, but no dashboard-specific assertions are written.

### CONCERN 6 — grit_fit_status Update Trigger Mechanism Not Specced
**Severity: MEDIUM**

The directive states grit_fit_status fields "update in batch whenever GRIT FIT recalculates." The mechanism for this batch update is not specified — it could be a frontend loop on profile save, a DB function, or an Edge Function. Until the mechanism is known, Quin cannot write a complete grit_fit_status test. The test stub exists in the coverage map but assertions will be incomplete.

Routing to Nova (Step 5 owner) for mechanism confirmation before the grit_fit_status test is finalized.

---

## 6. WHAT QUIN IS NOT DOING

- Not writing production code, RLS policies, or Edge Functions
- Not executing deployments or issuing PASS confirmations
- Not making UX decisions about how journey steps are displayed
- Not deciding the storage path structure for file_uploads (Patch owns this)
- Not writing the seed scripts (Patch owns, Quin defines the required state)
- Not executing the Playwright suite post-deploy (Dexter owns execution)
