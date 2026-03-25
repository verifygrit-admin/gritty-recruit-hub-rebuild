# MORTY SCHEMA AUDIT - Patch v2 Schema and Auth Spec
**Auditor:** Morty (Architecture Auditor)
**Date:** 2026-03-24
**Spec audited:** docs/patch-schema-auth-spec-v2.md
**Context read:** SESSION_LOG_2026-03-24.md, REBUILD_STATE.md, PHASE1_ROADMAP.md, cfb-rebuild-phase1-directive.md, UX_SPEC_AUTH_FLOWS.md, UX_SPEC_SHORTLIST.md, UX_SPEC_PROFILE_FORM.md, tests/unit/schema.test.js
**Status:** COMPLETE

---

## OVERALL VERDICT: PASS WITH CONDITIONS

The Patch v2 spec is substantially sound. SAID removal is correctly applied across all tables. The junction table architecture is internally consistent and correctly wired to the RLS policies. Auth flow logic is clean. Four blocking conditions must be resolved before migrations are written. Two are cross-spec conflicts that will cause direct runtime failures if left uncorrected. Two are stale artifacts that will re-introduce SAID into the rebuild if not corrected.

---

## AUDIT ITEMS

### A-01 - Schema Completeness: Table Set
**Result: PASS**

All 11 tables required by Phase 1 MVP are present: hs_programs, users, hs_coach_schools, hs_counselor_schools, hs_coach_students, hs_counselor_students, profiles, schools, short_list_items, file_uploads, email_verify_tokens. Phase 2 deferrals (parent accounts, college_coach accounts, billing) are explicitly noted in Section 10 of the spec.

---

### A-02 - Schema Completeness: Column Types and Constraints
**Result: PASS WITH NOTE**

Column types are appropriate throughout. Mixed PK types (uuid on users/profiles, bigint IDENTITY on junction tables) are idiomatic Postgres but should be documented in migration comments. profiles.email has no UNIQUE constraint - acceptable given user_id UNIQUE and Supabase auth.users.email uniqueness guarantee. short_list_items.unitid has no FK to schools.unitid - deliberate denormalization; invalid unitids will persist silently.

---

### A-03 - Schema Completeness: NOT NULL Coverage
**Result: PASS WITH NOTE**

profiles.gpa, hs_lat, hs_lng, agi, dependents are nullable by design (partial profile allowed). GRIT FIT scoring requires gpa, hs_lat, hs_lng - application must validate these before invoking scoring. Confirm this validation lives in the profile form submit handler.

---

### A-04 - SAID Removal: Completeness Check
**Result: PASS**

said is absent from all tables in v2. profiles, short_list_items, and file_uploads all carry explicit comments confirming removal. No generate_said() trigger, no linkSaidToAuth() call, no auth_said() RPC in the v2 spec. Session restore (Section 3.4) correctly uses user_id from getSession() only. Clean.

---

### A-05 - CRITICAL: grit_fit_status Enum Conflict Between Spec Artifacts
**Result: FAIL - MUST RESOLVE BEFORE MIGRATION**

Three spec artifacts conflict on grit_fit_status default and enum values.

cfb-rebuild-phase1-directive.md Schema Correction (DEC-CFBRB-013): DEFAULT not_evaluated, non-nullable, enum includes not_evaluated.

patch-schema-auth-spec-v2.md Section 2.11: DEFAULT NULL, nullable, not_evaluated absent from enum. This is Patches deliberate v2 decision, made without explicitly superseding DEC-CFBRB-013.

PHASE1_ROADMAP.md DEC-CFBRB-013 explicitly rejects NULL default with stated rationale: NULL creates nullable complexity in RLS and display logic.

Impact if v2 as-is reaches migrations: (1) Every UI component displaying grit_fit_status must handle NULL. (2) schema.test.js lines 192-215 list the 6-value enum without not_evaluated and without NULL handling - written against neither spec version. (3) The Status filter in UX_SPEC_SHORTLIST.md cannot string-match NULL.

Required action - Patch and Chris must align before migration 0009:
Option A (Morty recommendation): Accept DEC-CFBRB-013. Add not_evaluated to enum, DEFAULT not_evaluated, non-nullable. Update v2 spec and schema.test.js.
Option B: Accept v2 NULL default. Formally supersede DEC-CFBRB-013. Update schema.test.js and all display components to handle NULL.

---

### A-06 - CRITICAL: Coach Auto-Link Query Target Conflict
**Result: FAIL - MUST RESOLVE BEFORE IMPLEMENTATION**

UX_SPEC_AUTH_FLOWS.md Step 2 Coach Auto-Link Logic (approximately lines 271-272) queries: users table for user_type = hs_coach where school_id = [selected_school_id]. This assumes users.school_id exists.

patch-schema-auth-spec-v2.md Section 2.3 explicitly removes school_id from the users table. Coach-school linkage lives in hs_coach_schools. There is no school_id column on users in v2.

Correct v2 query per spec Section 3.5: SELECT coach_user_id FROM hs_coach_schools WHERE hs_program_id = [selected_program_id] AND is_head_coach = true

Impact: If Nova implements coach auto-link from UX_SPEC_AUTH_FLOWS.md literally, query fails at runtime: column users.school_id does not exist.

Required action: Update UX_SPEC_AUTH_FLOWS.md coach auto-link logic before Step 4 frontend implementation.

---

### A-07 - CRITICAL: UX_SPEC_AUTH_FLOWS.md Contains SAID References
**Result: FAIL - STALE SPEC - MUST BE CORRECTED**

UX_SPEC_AUTH_FLOWS.md contains live SAID references that directly contradict the v2 spec and DEC-CFBRB-002:

Student signup Step 3 data flow (approximately lines 314-315): generate_said() trigger fires -> said assigned; linkSaidToAuth() called -> said written to user_metadata.

Session Restore section (approximately lines 646-660): Extract said from user_metadata; Call auth_said() to get said from user_metadata.

Student Login Session Restore (approximately lines 458-462): If yes: Call auth_said() to get said from user_metadata.

If Nova implements from UX_SPEC_AUTH_FLOWS.md without cross-referencing v2, generate_said(), linkSaidToAuth(), and auth_said() will be re-introduced into the rebuild.

Required action: Update UX_SPEC_AUTH_FLOWS.md before any frontend auth implementation. Remove all SAID references. Rewrite session restore pseudocode to match v2 Section 3.4: getSession() -> user_id -> query public.users.

---

### A-08 - CRITICAL: schema.test.js Contains SAID Assertions
**Result: FAIL - TEST FILE WILL PRODUCE FALSE ASSERTIONS**

tests/unit/schema.test.js lines 218-257: describe block titled Schema: profiles.said generation trigger with two tests: (1) said column exists on profiles table - hard asserts profiles.said column exists; (2) seeded test student profile has a non-null said value - asserts said matches GRIT-NNNN-NNNN pattern.

profiles.said does not exist in v2. These will hard fail against a non-existent column.

Lines approximately 177 and 203: insert payloads for short_list_items include said: TEST-SAID. This column does not exist in v2. These inserts will fail with column-not-found error before CHECK constraint tests execute, producing misleading failure messages.

Required action before tests run against the new Supabase project: Remove the profiles.said describe block (lines 218-257). Remove said: TEST-SAID from insert payloads at approximately lines 178 and 203. Update grit_fit_status enum test (lines 192-215) after A-05 is resolved.

---

### A-09 - RLS Policy Coverage: Admin Role
**Result: FAIL - PHASE 2 FLAG, NOT BLOCKING PHASE 1**

No admin value exists in the users.user_type CHECK constraint. Chris operates via service role key for all admin actions - correct for Phase 1. When Phase 2 admin UI is built: users.user_type CHECK must add admin, users SELECT policy (auth.uid() = user_id) needs an admin override to read all rows, profiles and short_list_items need equivalent admin SELECT policies. Log as Phase 2 pre-condition.

---

### A-10 - RLS Policy Coverage: users INSERT Policy vs. Coach Self-Signup UX Spec
**Result: CONDITION - DEFERRED, ANNOTATION REQUIRED**

users INSERT is service role only (Section 4.1). v2 Section 3.1 confirms no self-service signup in MVP. Consistent. However, UX_SPEC_AUTH_FLOWS.md contains a fully-specified coach signup screen with a data flow implying browser-initiated INSERT into public.users. Future implementers will get a 42501 if they build from this spec without knowing it is Phase 2 only.

Required action: Annotate the coach and counselor signup sections in UX_SPEC_AUTH_FLOWS.md as Phase 2 only with a note that browser-side INSERT into public.users is blocked by service-role-only INSERT policy.

---

### A-11 - Auth Flow Integrity: Email Verification vs. Admin Activation Sequencing
**Result: PASS WITH NOTE**

Two-step activation is correctly designed. Sign-in flow checks email_verified before account_status - correct gate order. Edge case (Chris activates before user verifies): user sees please-verify screen on login, verifies, then signs in normally. Safe behavior. No schema change needed.

---

### A-12 - Auth Flow Integrity: Password Reset Mechanism
**Result: PASS**

Password reset delegates to Supabase built-in resetPasswordForEmail(). email_verify_tokens is only for custom email verification, not password reset. Correct separation of concerns.

---

### A-13 - Auth Flow Integrity: Session Restore Path
**Result: PASS**

Section 3.4 uses getSession() not getUser(), queries public.users for user_type and account_status, then queries profiles. Two-query pattern handles the incomplete-signup case correctly. No SAID, no user_metadata read. Consistent with prior project CI failure lessons.

---

### A-14 - Edge Function Specifications: Completeness
**Result: PASS WITH CONDITIONS**

verify-email: Query logic and DB writes are specified. HTTP response shape is not specified. UX spec implies a redirect - Edge Function must issue a 302/303 redirect with Location header, not JSON. Must be defined before Patch implements.

Send verification email: Section 3.2 says App sends verification email via Resend but does not name the Edge Function, define its endpoint, or specify input parameters. Resend API key must be accessed from Supabase Secrets in the Edge Function.

Patch RC-2 confirmed: email_verify_tokens is service-role-only. The Edge Function must use the service role key from Secrets. The anon key cannot write to email_verify_tokens.

---

### A-15 - Migration File Order and Dependencies
**Result: PASS**

13-migration plan in Section 9 is correctly ordered. No circular dependencies. No forward references. hs_programs (0001) is referenced by hs_coach_schools (0003) and hs_counselor_schools (0004) - ordered correctly. Note: confirm migration SQL in 0003 and 0004 uses schema-qualified name public.hs_programs to avoid search_path ambiguity.

---

### A-16 - Naming Conventions
**Result: PASS WITH NOTE**

Tables, FK columns, timestamps, PK names, and unique constraint names are consistent throughout. Minor inconsistency: hs_coach_students.confirmed_at vs. hs_counselor_students.linked_at - same semantic meaning with different column names across sibling tables. Cosmetic only. Recommend standardizing to linked_at across all four junction tables.

---

### A-17 - Security: Service Role Key Exposure
**Result: PASS**

Service role scoped to Edge Functions and server-side test runners only. No spec language puts the service role key in browser-accessible code or VITE_* variables. schema.test.js uses process.env.SUPABASE_SERVICE_ROLE_KEY correctly with an explicit warning against browser use.

---

### A-18 - Security: Privilege Escalation Paths
**Result: PASS WITH NOTE**

No user can self-activate or escalate to admin via the defined RLS policies. Note expanding Patch RC-1: hs_coach_students INSERT policy permits a student to link any coach UUID they provide - not just coaches at their own hs_program_id. For MVP (BC High only, seeded accounts) acceptable. At scale, consider requiring coach_user_id to exist in hs_coach_schools for the same hs_program_id as the student. Flag for Phase 2 hardening.

---

### A-19 - Data Integrity: Foreign Keys
**Result: PASS WITH ONE RECOMMENDATION**

All user-to-auth FK references use REFERENCES auth.users(id) ON DELETE CASCADE - correct throughout. short_list_items.unitid and file_uploads.unitid have no FK to schools.unitid - deliberate denormalization.

users.activated_by REFERENCES auth.users(id) has no ON DELETE clause specified in the v2 spec. PostgreSQL default NO ACTION will block deletion of the admin account if any users row references it.

Recommendation: Add ON DELETE SET NULL to users.activated_by. Audit trail is preserved (activated_at timestamp remains), admin account can be deleted cleanly.

---

### A-20 - Data Integrity: Unique Constraints
**Result: PASS**

All critical unique constraints are present and correctly placed: profiles.user_id, users.user_id, short_list_items(user_id, unitid), all four junction table composite UNIQUE constraints, email_verify_tokens.token, hs_programs(school_name, state).

---

### A-21 - Performance: Index Coverage
**Result: PASS WITH NOTE**

Four FK columns used in RLS subquery joins will become table scans at scale without indexes: hs_coach_students.coach_user_id, hs_counselor_students.counselor_user_id, short_list_items.user_id, file_uploads.user_id.

Recommended additions to migrations:
  CREATE INDEX idx_hs_coach_students_coach ON hs_coach_students(coach_user_id);
  CREATE INDEX idx_hs_counselor_coun ON hs_counselor_students(counselor_user_id);
  CREATE INDEX idx_short_list_items_user ON short_list_items(user_id);
  CREATE INDEX idx_file_uploads_user ON file_uploads(user_id);

Not blocking for BC High MVP scale. Should be in initial migrations regardless.

---

### A-22 - RLS Policy Coverage: Coach SELECT on Financial Profile Fields
**Result: PASS WITH NOTE - REQUIRES CHRIS INPUT**

Section 4.2 defines coach SELECT on profiles as a full row read via the hs_coach_students junction. This means coaches can read profiles.agi and profiles.dependents - raw household income and dependent count.

The financial exclusion in the spec applies only to file_uploads.document_type = financial_aid_info. The raw AGI/dependents numbers on profile rows are not restricted from coaches.

The directive (Part 1) states coaches see recruiting journey + location + academic rigor only. Raw household income data sits outside that stated scope.

This may be intentional - the coach UI will not display these fields even if readable at the DB layer.

Required: Chris to confirm whether profiles.agi and profiles.dependents should be excluded from the coach SELECT policy, or whether full-profile SELECT is acceptable with UI-level suppression.

---

### A-23 - RLS Policy Coverage: Storage Bucket Policy SQL
**Result: PASS WITH NOTE**

Section 4.12 describes storage policies in prose only. Actual CREATE POLICY SQL for storage.objects is not provided. The coach download restriction (no financial_aid_info) requires a non-trivial join between storage.objects.name and file_uploads.storage_path. Migration 0013_storage_policies.sql must contain explicit, tested SQL - not a prose description. Confirm whether file upload is Phase 1 or Phase 3 scope before writing migration 0013.

---

### A-24 - Frontend Compatibility: Shortlist Display
**Result: PASS**

UX_SPEC_SHORTLIST.md shows 15 steps. The v2 spec JSON default has exactly 15 steps. Step labels match between the two documents. UX spec header references RB-008 (16-step) - stale reference only; the spec body is correct at 15 steps.

---

### A-25 - Frontend Compatibility: Profile Form Field Coverage
**Result: PASS**

UX_SPEC_PROFILE_FORM.md form fields map correctly to profiles table columns. No UI field references a non-existent column. No profiles column is missing a corresponding UI input.

---

### A-26 - RC-3: profiles.high_school Display vs. Authoritative School Link
**Result: CONFIRMED RISK - APPLICATION-LAYER CONTROL REQUIRED**

Patch RC-3 is valid. profiles.high_school is a free-text label used by scoring.js and dashboards. Drift between the text value and hs_programs.school_name is preventable if the profile form populates profiles.high_school from the hs_programs dropdown selection (not a free-text input). Application code must enforce this. No schema change needed.

---

### A-27 - RC-4: grit_fit_status Nullable Column and PostgREST Type Generation
**Result: SUPERSEDED BY A-05**

If A-05 resolves to a non-nullable not_evaluated default (recommended), the nullable column concern disappears. If NULL default is retained instead, test PostgREST TypeScript type generation explicitly after migration and confirm all consumers handle NULL correctly.

---

### A-28 - RC-5: EFC Fields in profiles vs. Separate Financial Table
**Result: ACCEPTED FOR PHASE 1 - PHASE 2 CONSIDERATION LOGGED**

For Phase 1 MVP with a small controlled user base, profiles.agi and profiles.dependents on the main profiles row is acceptable. A separate financial_profiles table with tighter RLS isolation is a Phase 2 architectural improvement to reduce blast radius from future policy misconfiguration. No Phase 1 action required.

---

---

## SUMMARY TABLE

| ID   | Area                                      | Result               | Blocking?       |
|------|-------------------------------------------|----------------------|-----------------|
| A-01 | Schema completeness: table set            | PASS                 | No              |
| A-02 | Schema completeness: column types         | PASS WITH NOTE       | No              |
| A-03 | Schema completeness: NOT NULL coverage    | PASS WITH NOTE       | No              |
| A-04 | SAID removal completeness                 | PASS                 | No              |
| A-05 | grit_fit_status enum conflict             | FAIL                 | YES             |
| A-06 | Coach auto-link query conflict            | FAIL                 | YES             |
| A-07 | SAID refs in UX_SPEC_AUTH_FLOWS.md        | FAIL                 | YES             |
| A-08 | SAID assertions in schema.test.js         | FAIL                 | YES             |
| A-09 | Admin role RLS coverage                   | FAIL (Phase 2 flag)  | No for Phase 1  |
| A-10 | users INSERT policy vs. UX spec           | CONDITION            | Deferred        |
| A-11 | Email verification sequencing             | PASS WITH NOTE       | No              |
| A-12 | Password reset mechanism                  | PASS                 | No              |
| A-13 | Session restore path                      | PASS                 | No              |
| A-14 | Edge Function specifications              | PASS WITH CONDITIONS | Partial         |
| A-15 | Migration file order                      | PASS                 | No              |
| A-16 | Naming conventions                        | PASS WITH NOTE       | No              |
| A-17 | Service role key exposure                 | PASS                 | No              |
| A-18 | Privilege escalation paths                | PASS WITH NOTE       | No              |
| A-19 | Foreign keys                              | PASS WITH RECOMM.    | No              |
| A-20 | Unique constraints                        | PASS                 | No              |
| A-21 | Index coverage                            | PASS WITH NOTE       | No (MVP scale)  |
| A-22 | Coach SELECT on financial profile fields  | PASS WITH NOTE       | Chris input req |
| A-23 | Storage bucket policy SQL                 | PASS WITH NOTE       | Scope confirm   |
| A-24 | Frontend: shortlist step count            | PASS                 | No              |
| A-25 | Frontend: profile form field coverage     | PASS                 | No              |
| A-26 | RC-3: high_school display drift           | CONFIRMED RISK       | App layer       |
| A-27 | RC-4: nullable enum concern               | SUPERSEDED BY A-05   | N/A             |
| A-28 | RC-5: EFC on profiles                     | ACCEPTED             | No (Phase 2)    |

---

## BLOCKING CONDITIONS

All four must be resolved before Patch writes any migration.

**CONDITION 1 (A-05):** Resolve the grit_fit_status conflict between DEC-CFBRB-013 (not_evaluated default, non-nullable) and the v2 spec (NULL default, no not_evaluated enum value). Requires Chris and Patch to align. Morty recommends DEC-CFBRB-013.

**CONDITION 2 (A-06):** Update UX_SPEC_AUTH_FLOWS.md coach auto-link logic to use hs_coach_schools not users.school_id (which does not exist in v2). Nova must not implement this flow from the stale spec.

**CONDITION 3 (A-07):** Update UX_SPEC_AUTH_FLOWS.md to remove all SAID references (generate_said(), linkSaidToAuth(), auth_said(), user_metadata.said). Rewrite session restore pseudocode to match v2 Section 3.4.

**CONDITION 4 (A-08):** Update tests/unit/schema.test.js - remove the profiles.said describe block (lines 218-257) and said: TEST-SAID insert payloads (approximately lines 178 and 203). Update the grit_fit_status enum test after Condition 1 is resolved.

---

## NON-BLOCKING RECOMMENDATIONS

**R-1 (A-19):** Add ON DELETE SET NULL to users.activated_by FK reference.

**R-2 (A-21):** Add four indexes to initial migrations: hs_coach_students(coach_user_id), hs_counselor_students(counselor_user_id), short_list_items(user_id), file_uploads(user_id).

**R-3 (A-14):** Define the verify-email Edge Function HTTP response shape (redirect URL, not JSON). Name and parameterize the send-verification-email Edge Function explicitly.

**R-4 (A-22):** Chris to confirm whether profiles.agi and profiles.dependents should be excluded from the coach SELECT policy, or full-profile SELECT is acceptable with UI filtering.

**R-5 (A-26):** Application code must auto-populate profiles.high_school from hs_programs.school_name at profile creation - not from a free-text input.

**R-6 (A-10):** Annotate coach and counselor signup sections in UX_SPEC_AUTH_FLOWS.md as Phase 2 only, with a note that browser-side INSERT into public.users is blocked by service-role-only INSERT policy.

---

## FILES REQUIRING CORRECTION BEFORE IMPLEMENTATION

- **docs/UX_SPEC_AUTH_FLOWS.md** - A-06 (coach auto-link query), A-07 (SAID refs), A-10 (Phase 2 annotation)
- **tests/unit/schema.test.js** - A-08 (SAID assertions)
- **docs/patch-schema-auth-spec-v2.md** - A-05 (grit_fit_status resolution update)

---

*Audit completed 2026-03-24. Migrations must not be written until all four blocking conditions are resolved and Scout gates the spec updates.*

**- Morty**
