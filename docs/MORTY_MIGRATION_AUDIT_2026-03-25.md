# MORTY MIGRATION AUDIT — gritty-recruit-hub-rebuild
**Date:** 2026-03-25
**Auditor:** Morty (Architecture Auditor)
**Spec authority:** `docs/patch-schema-auth-spec-v2.md` (Patch, 2026-03-24)
**Scope:** 13 migration files — `0001_hs_programs.sql` through `0013_storage_policies.sql`
**Verdict:** PASS WITH CONDITIONS (3 conditions — all architectural, no blockers)

---

## CHECKLIST RESULTS (A–H)

---

### A. SAID REMOVAL (DEC-CFBRB-002) — PASS

No `said` column appears in any DDL across all 13 migrations. No `generate_said()` function. No `auth_said()` reference. No `linkSaidToAuth()`. No `user_metadata.said`.

Evidence:
- `0002_users_extended.sql` header comment: "NO SAID anywhere (DEC-CFBRB-002)" — confirmed by DDL, no `said` column in the `users` table.
- `0007_profiles.sql`: Comment explicitly states "SAID REMOVED ENTIRELY (DEC-CFBRB-002) — user_id is sole identity key. No generate_said() trigger. No linkSaidToAuth() call. No auth_said() RPC." DDL contains no `said` column.
- `0009_short_list_items.sql`: Comment "SAID REMOVED (DEC-CFBRB-002)" — confirmed by DDL.
- `0010_file_uploads.sql`: Comment "SAID REMOVED (DEC-CFBRB-002)" — confirmed by DDL.
- Global grep across all 13 files: the string "said" only appears in comments, never in DDL column definitions, function calls, or policy bodies.

The only appearance of "user_metadata" is in `0011_email_verify_tokens.sql` as a comment explaining what this table replaces ("avoids stuffing tokens into user_metadata") — not a code reference.

**DEC-CFBRB-002 is fully satisfied.**

---

### B. FINANCIAL AID EXCLUSION (DEC-CFBRB-003) — PASS

Coach SELECT on `file_uploads` blocks `financial_aid_info`. Counselor SELECT is unrestricted.

Evidence from `0012_rls_policies.sql`:

- **Coach policy** (`file_uploads_select_coach`, lines 117–125):
  ```sql
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_coach_students
      WHERE coach_user_id = auth.uid()
    )
    AND document_type != 'financial_aid_info'
  );
  ```
  The `AND document_type != 'financial_aid_info'` clause is present and correctly placed in `USING`.

- **Counselor policy** (`file_uploads_select_counselor`, lines 128–135):
  ```sql
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );
  ```
  No document_type restriction. All types including `financial_aid_info` are visible to counselors. Correct per Chris's OQ-3 answer.

Evidence from `0013_storage_policies.sql`:

- **Storage coach policy** (`recruit_files_select_coach`, lines 44–56): Joins through `file_uploads` and includes `AND fu.document_type != 'financial_aid_info'`. Dual-layer enforcement is in place.
- **Storage counselor policy** (`recruit_files_select_counselor`, lines 63–74): No document_type restriction. Counselors may download all file types.

The `financial_aid_info` value is present in the `document_type` CHECK enum in `0010_file_uploads.sql`.

**DEC-CFBRB-003 is fully satisfied at both the RLS layer and the storage policy layer.**

---

### C. grit_fit_status (DEC-CFBRB-013) — PASS

`grit_fit_status` is `NOT NULL DEFAULT 'not_evaluated'` with `'not_evaluated'` in the CHECK enum.

Evidence from `0009_short_list_items.sql` lines 30–38:
```sql
grit_fit_status  text NOT NULL DEFAULT 'not_evaluated' CHECK (grit_fit_status IN (
                   'not_evaluated',
                   'currently_recommended',
                   'out_of_academic_reach',
                   'below_academic_fit',
                   'out_of_athletic_reach',
                   'below_athletic_fit',
                   'outside_geographic_reach'
                 )),
```

- Column is `NOT NULL` — cannot be null.
- `DEFAULT 'not_evaluated'` — manual_add rows land here.
- `'not_evaluated'` is the first value in the CHECK enum — it is present.
- The old `'currently_recommended'` default is gone from the column definition; the value remains in the enum for programmatic use when GRIT FIT evaluates and promotes a school.

Spec's RC-4 note that this concern is closed is accurate — the DDL matches the resolution.

**DEC-CFBRB-013 is fully satisfied.**

---

### D. is_head_coach PLACEMENT (DEC-CFBRB-006) — PASS

`is_head_coach` is on `hs_coach_schools` only.

Evidence:
- `0003_hs_coach_schools.sql` line 11: `is_head_coach boolean NOT NULL DEFAULT false` — present on the junction table.
- `0002_users_extended.sql`: No `is_head_coach` column.
- `0007_profiles.sql`: No `is_head_coach` column.
- Global grep: `is_head_coach` appears only in `0003_hs_coach_schools.sql` (DDL) and its comment.

**DEC-CFBRB-006 is fully satisfied.**

---

### E. JUNCTION TABLE MODEL — PASS

Four distinct tables are present. `user_hs_programs` does not exist anywhere in the migration set.

Tables present:
- `0003_hs_coach_schools.sql` — `hs_coach_schools` (coach ↔ school)
- `0004_hs_counselor_schools.sql` — `hs_counselor_schools` (counselor ↔ school)
- `0005_hs_coach_students.sql` — `hs_coach_students` (coach ↔ student)
- `0006_hs_counselor_students.sql` — `hs_counselor_students` (counselor ↔ student)

`user_hs_programs` appears only in a comment in `0003_hs_coach_schools.sql` ("Replaces v1 user_hs_programs table") — not as DDL. No table is created with that name anywhere.

All four junction tables have appropriate UNIQUE constraints preventing duplicate link rows.

**Junction table model per Chris's direction is fully satisfied.**

---

### F. profiles_insert_open — PASS

Present in `0012_rls_policies.sql` lines 51–54:

```sql
-- Student inserts their own profile (profiles_insert_open — permanent fix)
CREATE POLICY "profiles_insert_open"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

The policy is named `profiles_insert_open`, operates on `FOR INSERT`, uses `WITH CHECK` (correct — INSERT policies use `WITH CHECK`, not `USING`), and the predicate is `auth.uid() = user_id`.

The migration comment explicitly notes this is the permanent fix for the 42501 incident of 2026-03-24. The policy is embedded in the migration file, meaning it will be applied on fresh database setup without a manual step — which was the failure mode in the prior project.

**profiles_insert_open is present, correctly formed, and protected by the migration sequence.**

---

### G. MIGRATION SEQUENCE INTEGRITY — PASS

FK chains are satisfiable in numbered order. Verified below:

| Migration | Tables Created | FK Dependencies | Dependency Available By |
|-----------|---------------|-----------------|------------------------|
| 0001 | `hs_programs` | none | — |
| 0002 | `users` | `auth.users(id)` | Supabase built-in (always present) |
| 0003 | `hs_coach_schools` | `auth.users(id)`, `hs_programs(id)` | 0001, Supabase |
| 0004 | `hs_counselor_schools` | `auth.users(id)`, `hs_programs(id)` | 0001, Supabase |
| 0005 | `hs_coach_students` | `auth.users(id)` × 2 | Supabase |
| 0006 | `hs_counselor_students` | `auth.users(id)` × 2 | Supabase |
| 0007 | `profiles` | `auth.users(id)` | Supabase |
| 0008 | `schools` | none (standalone) | — |
| 0009 | `short_list_items` | `auth.users(id)` | Supabase |
| 0010 | `file_uploads` | `auth.users(id)` | Supabase |
| 0011 | `email_verify_tokens` | `auth.users(id)` | Supabase |
| 0012 | RLS policies | All tables 0001–0011 | All present by 0011 |
| 0013 | Storage bucket + policies | `file_uploads`, `hs_coach_students`, `hs_counselor_students` | 0005, 0006, 0010 |

All FK chains are satisfiable. `0012_rls_policies.sql` references `hs_coach_students`, `hs_counselor_students`, `hs_programs`, `schools` — all created by 0005, 0006, 0001, 0008 respectively before 0012 runs.

`0013_storage_policies.sql` references `public.file_uploads`, `public.hs_coach_students`, `public.hs_counselor_students` in its policy EXISTS subqueries — all available before 0013 runs.

`0008_schools.sql` uses `CREATE TABLE IF NOT EXISTS` — idempotent, safe for re-runs. All other tables use `CREATE TABLE` without IF NOT EXISTS. This is internally consistent — if a migration has been applied, re-running it on a non-empty database will fail on the non-idempotent tables. This is standard Supabase migration behavior (migrations are run exactly once) and is not a defect.

**Sequence integrity is satisfied for all 13 migrations.**

---

### H. PATCH'S 3 FLAGGED ITEMS — RULED BELOW

Patch flagged RC-1, RC-2, and RC-3 in spec Section 7 (RC-4 was self-closed; RC-5 is a separate concern also ruled here).

**RC-1 — `hs_coach_students` INSERT policy and empty coach dashboard**

Patch's concern: if a student skips the "is your head coach?" prompt or no head coach is found, no `hs_coach_students` row is created, and the coach sees an empty dashboard.

Ruling: This is ACCEPTABLE BEHAVIOR FOR MVP and requires no schema change. The spec is explicit that coach visibility is intentionally predicated on an explicit student confirmation. An empty dashboard in the absence of a confirmed link is correct, not a defect. For BC High MVP with three seeded students, Chris will seed links manually. One condition is noted: this design decision should be documented as a user-facing behavior explanation in the coach dashboard empty state ("No students have confirmed you as their coach yet"). This is a frontend concern, not a schema concern — no migration change warranted.

**RC-2 — `email_verify_tokens` RLS with service-role-only access**

Patch's concern: `email_verify_tokens` has RLS enabled but no explicit policies. Service role bypasses RLS — but only if the Edge Function actually uses the service role key, not the anon key.

Ruling: This is CORRECT AS WRITTEN. RLS is enabled on `email_verify_tokens` in `0012_rls_policies.sql` with no browser-side policies. This means any browser-authenticated request will be denied by RLS default deny. The Edge Function must use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_ANON_KEY`) to read and write this table. The migration cannot enforce which key the Edge Function uses — that is an Edge Function implementation requirement.

**Condition 1 (RC-2):** When the `verify-email` Edge Function is written, Patch must confirm it initializes the Supabase client with `SUPABASE_SERVICE_ROLE_KEY`. This audit cannot verify that — the Edge Function does not yet exist. Morty flags this as a pending verification item for the Edge Function audit pass.

**RC-3 — `profiles.high_school` as display field vs. authoritative school link via `hs_coach_students`**

Patch's concern: a student might enter "Boston College High School" in `profiles.high_school` while the seeded `hs_programs` record is "BC High," causing a display drift between the text label and the authoritative relationship.

Ruling: This is an ACCEPTABLE ARCHITECTURE TRADE-OFF FOR MVP. The `profiles.high_school` field is a display-only text label. The coach-student relationship that drives RLS and dashboard visibility is entirely through `hs_coach_students` — which is resolved via `hs_programs.id` (a UUID, not a text match). Scoring logic that uses `high_school` as a text field is doing display work, not relationship work. The drift is cosmetic in MVP scope.

**Condition 2 (RC-3):** The profile form's high school input field MUST autocomplete from or resolve against `hs_programs` by the time coach-student auto-linking logic runs (spec Section 3.5). If the form writes a free-text value to `profiles.high_school` without first resolving a matching `hs_programs.id`, the auto-link prompt (step 1: "resolve hs_program_id from hs_programs table") will fail or silently skip. This is a frontend form implementation requirement, not a schema defect. Flagged for Quin's test plan.

**RC-5 — EFC data in profiles vs. a dedicated financial table**

Patch's concern: `profiles.agi` and `profiles.dependents` carry EFC-adjacent data on the main profiles row rather than in a privacy-isolated financial sub-table.

Ruling: ACCEPTABLE FOR MVP. The counselor's ability to see `profiles` rows is already gated by `profiles_select_counselor` (which joins through `hs_counselor_students`). The coach cannot read `profiles.agi` or `profiles.dependents` because coach access is through `profiles_select_coach` — which only returns rows for confirmed students, and coaches see all columns on those rows. This is a data minimization concern (coaches see agi/dependents on students they coach), not a functional defect for MVP.

**Condition 3 (RC-5):** For Phase 2, evaluate whether coach-facing `profiles` SELECT policies should use column-level exclusions for `agi` and `dependents`, or whether a separate `financial_profile` table with its own stricter RLS is warranted. This is deferred — Phase 2 scope per spec Section 10. No migration change warranted now.

---

## PER-FILE VERDICTS (0001–0013)

| File | Verdict | Notes |
|------|---------|-------|
| `0001_hs_programs.sql` | PASS | Exact DDL match to spec Section 2.2. UNIQUE (school_name, state) applied. |
| `0002_users_extended.sql` | PASS | Exact DDL match to spec Section 2.3. No said. No is_head_coach. account_status DEFAULT 'pending'. activation fields present. |
| `0003_hs_coach_schools.sql` | PASS | is_head_coach present, NOT NULL DEFAULT false. UNIQUE (coach_user_id, hs_program_id) applied. bigint GENERATED ALWAYS AS IDENTITY for PK — correct. |
| `0004_hs_counselor_schools.sql` | PASS | Exact DDL match to spec Section 2.7. UNIQUE constraint applied. |
| `0005_hs_coach_students.sql` | PASS | Exact DDL match to spec Section 2.8. UNIQUE (coach_user_id, student_user_id) applied. |
| `0006_hs_counselor_students.sql` | PASS | Exact DDL match to spec Section 2.9. UNIQUE (counselor_user_id, student_user_id) applied. |
| `0007_profiles.sql` | PASS | No said column. No trigger body. No RPC reference. DDL matches spec Section 2.4 field-for-field. |
| `0008_schools.sql` | PASS | CREATE TABLE IF NOT EXISTS — idempotent. Schema matches prior project. All expected columns present including adltv, adltv_rank, admissions_rate. |
| `0009_short_list_items.sql` | PASS | grit_fit_status NOT NULL DEFAULT 'not_evaluated' — correct. 'not_evaluated' in CHECK enum — correct. 15-step journey JSON — step_id 1 through 15, step 1 has completed: true as expected. No said. |
| `0010_file_uploads.sql` | PASS | document_type enum present with all 7 values including financial_aid_info. No said. |
| `0011_email_verify_tokens.sql` | PASS | Matches spec Section 2.13. used_at nullable (NULL until consumed — correct). UNIQUE (token) applied. |
| `0012_rls_policies.sql` | PASS | All 11 table policies present. profiles_insert_open present and correctly formed with WITH CHECK. financial_aid_info exclusion on coach SELECT correct. Counselor SELECT unrestricted. RLS enabled on all tables. |
| `0013_storage_policies.sql` | PASS | Bucket creation idempotent (ON CONFLICT DO NOTHING). Upload path enforced via foldername(name)[1] = auth.uid()::text. Coach download joins file_uploads with financial_aid_info exclusion. Counselor download unrestricted. Delete policy restricts to own path. No UPDATE policy — files are immutable per spec design. |

---

## ADDITIONAL FINDINGS

### Finding 1 — `users` table: No INSERT policy in RLS (expected, not a defect)

`0012_rls_policies.sql` enables RLS on `users` and creates only `users_select_own`. There is no INSERT, UPDATE, or DELETE policy. The spec states these are service-role-only operations (Section 4.1). This means:
- All browser-authenticated INSERT attempts to `public.users` will be blocked by RLS default deny.
- Admin account seeding must use the service role key or a server-side Edge Function.
- This is correct per the spec design — all MVP accounts are seeded by Chris, not self-created.

**No change required. Behavior is by design. Document in admin onboarding runbook.**

### Finding 2 — `email_verify_tokens` has RLS enabled with no policies (expected, not a defect)

`0012_rls_policies.sql` enables RLS on `email_verify_tokens` and creates zero policies. This is correct: the comment states "All operations: service role only (Edge Function uses service role key) — no browser-side policies." Service role bypasses RLS by definition in Supabase. Any browser-authenticated client hitting this table will get default-deny. See Condition 1 (RC-2) above for the pending verification requirement.

### Finding 3 — `schools` table in 0012 gets deny policies for INSERT/UPDATE/DELETE

`0012_rls_policies.sql` creates `schools_deny_insert`, `schools_deny_update`, `schools_deny_delete` policies with `WITH CHECK (false)` / `USING (false)`. This is belt-and-suspenders given that `sync_schools.py` uses service role. Explicit deny policies are good practice — they make intent visible and prevent accidental writes if a browser client ever gets its anon key used on this table.

**This is a positive finding — explicit deny is better than relying on RLS default alone.**

### Finding 4 — Storage policy uses array index [1] on foldername()

`0013_storage_policies.sql` line 23: `(storage.foldername(name))[1] = auth.uid()::text`

`storage.foldername()` returns an array of path segments. Index [1] (1-based in Postgres) is the first folder component. For a path like `{user_id}/filename.pdf`, this correctly extracts the user_id prefix. This is the correct Supabase Storage pattern.

**This is correct. No change required.**

### Finding 5 — `short_list_items` UNIQUE constraint is on (user_id, unitid)

`0009_short_list_items.sql` line 59: `CONSTRAINT short_list_items_user_unitid_key UNIQUE (user_id, unitid)`. This means a student cannot add the same school twice. This is intentional per spec Section 5. The `unitid` column is `integer NOT NULL` but has no FK reference to `public.schools(unitid)`. This is correct — FK to schools would prevent adding schools that are in the app's GRIT FIT results but not yet seeded in the `schools` table, and it would create unnecessary coupling. The loose join via `unitid` is the correct design for MVP.

**No change required. Noted as an intentional design choice.**

### Finding 6 — 0007_profiles.sql has no `updated_at` trigger

`profiles` has `updated_at timestamptz NOT NULL DEFAULT now()` but no trigger to auto-update it on UPDATE. If the application does not manually set `updated_at = now()` on every profile UPDATE call, the field will be stale. This is a common pattern issue in Supabase projects.

**Recommendation:** Either add a `BEFORE UPDATE` trigger on `profiles` to set `updated_at = now()`, or require application code to always include `updated_at: new Date().toISOString()` in UPDATE payloads. The same applies to `short_list_items.updated_at`. For MVP with few records, application-layer handling is acceptable — but a trigger is safer. This is not a blocking defect. Flagged for Patch's attention when Edge Functions are written.

---

## OVERALL VERDICT

**PASS WITH CONDITIONS**

All 8 checklist items (A through H) pass. All 13 migrations match the spec with fidelity. The three conditions stated above are not blocking for migration deployment — they are implementation requirements for the Edge Function layer and the frontend form layer.

**Three conditions summary:**

1. **(RC-2 / Edge Function)** The `verify-email` Edge Function must initialize its Supabase client with `SUPABASE_SERVICE_ROLE_KEY`. Verify when Edge Function is written. Patch owns this.

2. **(RC-3 / Frontend Form)** The profile form's high school field must resolve against `hs_programs` (UUID lookup) before the coach auto-link prompt runs. Free-text entry that bypasses `hs_programs` lookup will silently fail the auto-link. Quin to include in test plan. Nova to enforce in form implementation.

3. **(RC-5 / Phase 2 Debt)** Column-level access control for `profiles.agi` and `profiles.dependents` from coach-facing queries is deferred to Phase 2. Document as a known scope boundary.

**These migrations are cleared for deployment.**

---

*— Morty (Architecture Auditor)*
*Audit completed 2026-03-25. Spec: patch-schema-auth-spec-v2.md v2.0. No migration files were modified.*
