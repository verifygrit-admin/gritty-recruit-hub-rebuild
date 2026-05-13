# RLS Gap Analysis — Sprint 027

**Date:** 2026-05-13
**Source:** Live `pg_policies` query for the 7 in-scope tables + 3 auxiliary (`hs_coach_schools`, `hs_counselor_schools`, `partner_high_schools`) + `admin_audit_log`.
**Scope:** Identify (a) which tables already have admin-scoped write policies, (b) which rely on service-role bypass via EF, (c) which Phase 1 migration `0051` should add for defense-in-depth.

**Architectural posture:** All Sprint 027 admin writes go through Edge Functions that use the Supabase service role key. Service role bypasses RLS entirely. Therefore every admin-scoped write policy added in `0051` is **defense-in-depth, not the primary enforcement.** The EF auth gate (`getUser()` + `app_metadata.role === 'admin'` check, per DEC 016-C WT-B) is the primary enforcement. Adding admin-scoped policies guards against accidental anon-key write paths or future direct-from-browser admin writes.

---

## Live policy summary (pulled via `pg_policies` 2026-05-13)

### `public.profiles` (Students)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| INSERT | `profiles_insert_open` | public | `auth.uid() = user_id` (own row only) |
| SELECT | `profiles_select_own` | public | `auth.uid() = user_id` |
| SELECT | `profiles_select_coach` | public | coach-of-student chain |
| SELECT | `profiles_select_coach_counselor` | public | coach-of-counselor chain |
| SELECT | `profiles_select_counselor` | public | counselor-of-student chain |
| SELECT | `profiles_select_counselor_coach` | public | counselor-of-coach chain |
| SELECT | `profiles_select_public_recruits` | anon, authenticated | partner-school students with `grad_year >= 2026` |
| UPDATE | `profiles_update_own` | public | `auth.uid() = user_id` |

**Admin write coverage:** ❌ NONE. All admin writes today route through `supabase/functions/admin-approve-bulk-pds` (service-role).

**Gap:** No admin INSERT, no admin UPDATE, no admin DELETE policy.

**Phase 1 `0051` add:**
```sql
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO public
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
```
INSERT and DELETE for `profiles` are NOT enabled in Sprint 027 (Students is not in the create/delete-enabled trio per Q5). Do not add admin INSERT or DELETE policies — keep them implicitly denied.

---

### `public.users` (HS Coaches + Counselors)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `users_select_own` | public | `auth.uid() = user_id` |
| UPDATE | `users_update_own_full_name` | authenticated | own row + 4 privilege cols locked (Sprint 023) |

**Admin write coverage:** ❌ NONE. `admin-read-users` exists for SELECT; no admin write EF exists yet.

**Gap:** No admin UPDATE policy. The existing `users_update_own_full_name` policy locks `user_type`, `account_status`, `email_verified`, `payment_status` for non-admin updates — but admin-targeted update has no policy at all.

**Phase 1 `0051` add:**
```sql
CREATE POLICY users_admin_update ON public.users
  FOR UPDATE TO public
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
```
The existing `users_update_own_full_name` policy is preserved (independent — staff still edit their own `full_name` from `/coach/profile`). Postgres policies are additive within a command — both apply, either can grant.

INSERT and DELETE not enabled (HS Coaches / Counselors are not in the create/delete-enabled trio per Q5). Account creation continues to flow through `auth.signUp` + the existing seed scripts.

---

### `public.hs_programs` (High Schools)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `hs_programs_public_select` | public | `true` |

**Admin write coverage:** ❌ NONE — and no write policies of any kind. Today the table is updated only via service-role / direct SQL bootstrap.

**Gap:** No INSERT, no UPDATE, no DELETE policies.

**Phase 1 `0051` add:**
```sql
CREATE POLICY hs_programs_admin_update ON public.hs_programs
  FOR UPDATE TO public
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
```
INSERT and DELETE not enabled (High Schools is not in the create/delete-enabled trio per Q5). Onboarding new partner high schools remains an operator/seed-script action, not an in-app action.

---

### `public.schools` (Colleges)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `schools_public_select` | public | `true` |
| INSERT | `schools_deny_insert` | public | `false` (explicitly denied) |
| UPDATE | `schools_admin_update` | public | `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'` ✓ |
| DELETE | `schools_deny_delete` | public | `false` (explicitly denied) |

**Admin write coverage:** ✅ UPDATE policy already exists. INSERT and DELETE are explicitly denied.

**Gap (Sprint 027 specific):** Q5 says Colleges is create/delete-DISABLED — which matches the existing DENY policies. **No `0051` change needed for `schools`.** The existing UPDATE policy is sufficient; the existing DENY INSERT and DENY DELETE policies match Sprint 027 intent.

**Note on the existing `admin-update-school` EF:** Its column whitelist is only 3 columns. Sprint 027 expanding the whitelist to all 38 editable fields can either:
- (a) extend `admin-update-school` whitelist → keeps single EF for Schools writes, but couples Sprint 027 to Sprint 016 EF
- (b) route Sprint 027 Schools writes through new `admin-update-account` EF → two EFs touching same table

Either is RLS-compatible. Phase 1 picks one based on EF responsibility model.

---

### `public.college_coaches` (College Coaches)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `college_coaches_select_public` | public | `true` |
| INSERT | `college_coaches_insert_service` | public | `auth.role() = 'service_role'` |
| UPDATE | `college_coaches_update_service` | public | `auth.role() = 'service_role'` |
| DELETE | `college_coaches_delete_service` | public | `auth.role() = 'service_role'` |

**Admin write coverage:** Service-role-only. Admin EF using service-role key satisfies these policies.

**Gap (Sprint 027 specific):** Sprint 027 CREATE / UPDATE / DELETE all flow through service-role EFs — current policies suffice. Adding admin-scoped policies for defense-in-depth is recommended.

**Phase 1 `0051` add (defense-in-depth):**
```sql
CREATE POLICY college_coaches_admin_insert ON public.college_coaches
  FOR INSERT TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

CREATE POLICY college_coaches_admin_update ON public.college_coaches
  FOR UPDATE TO public
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

CREATE POLICY college_coaches_admin_delete ON public.college_coaches
  FOR DELETE TO public
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
```
The existing service-role policies remain — both admin role AND service-role grant; either path works.

---

### `public.recruiting_events` (Recruiting Events)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `recruiting_events_select_public` | public | `true` |
| INSERT | `recruiting_events_insert_service` | public | `auth.role() = 'service_role'` |
| UPDATE | `recruiting_events_update_service` | public | `auth.role() = 'service_role'` |
| DELETE | `recruiting_events_delete_service` | public | `auth.role() = 'service_role'` |

**Admin write coverage:** Identical pattern to `college_coaches`.

**Phase 1 `0051` add:** Same three-policy block (insert / update / delete admin) with `recruiting_events_admin_*` names.

---

### `public.hs_coach_schools` (auxiliary — HS Coaches form join)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `hs_coach_schools_select_own` | public | `coach_user_id = auth.uid()` |
| SELECT | `hs_coach_schools_select_student` | public | `auth.uid() IS NOT NULL` |

**Admin write coverage:** ❌ NONE. No INSERT / UPDATE / DELETE policies.

**Gap:** If the HS Coaches form lets admin edit the school link (`is_head_coach`, `hs_program_id`), an admin write policy is needed. Phase 1 decision per `READ_ONLY_FIELDS.md` § 2.

**Phase 1 `0051` add (conditional on Phase 1 decision):**
```sql
CREATE POLICY hs_coach_schools_admin_update ON public.hs_coach_schools
  FOR UPDATE TO public
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
```
INSERT (admin re-linking a coach to a new school) and DELETE (admin unlinking) similarly conditional.

---

### `public.hs_counselor_schools` (auxiliary — Counselors form join)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `hs_counselor_schools_select_own` | public | `counselor_user_id = auth.uid()` |
| SELECT | `hs_counselor_schools_select_student` | public | `auth.uid() IS NOT NULL` |

**Admin write coverage:** ❌ NONE. Same gap as `hs_coach_schools`.

**Phase 1 `0051` add (conditional):** Same shape as above.

---

### `public.partner_high_schools` (NOT in Sprint 027 scope per Q2; documented for completeness)

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `partner_high_schools_select_anon` | anon | `true` |

**Admin write coverage:** ❌ NONE. Sprint 027 does NOT touch this table per Q2 LOCKED.

---

### `public.admin_audit_log`

| cmd | Policy | Roles | Predicate |
|---|---|---|---|
| SELECT | `admin_audit_log_admin_select` | public | `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'` ✓ |

**Admin write coverage:** ❌ NO INSERT policy — writes today happen via service-role only (`admin-update-school` uses service role for the audit INSERT).

**Phase 1 `0051` add (defense-in-depth):**
```sql
CREATE POLICY admin_audit_log_admin_insert ON public.admin_audit_log
  FOR INSERT TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');
```
And — separately — the schema change discussed in `erd-drift-sprint027.md` § 3:
```sql
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS field text;
CREATE INDEX IF NOT EXISTS admin_audit_log_lookup_idx
  ON public.admin_audit_log (table_name, row_id, field, created_at DESC);
```

---

## Recommended `0051` migration shape (full)

Single migration file: `supabase/migrations/0051_account_updates_admin_write_policies.sql`

Estimated body (≈130 lines):
1. **Header comment block** — DEC reference, PROTO reference, sprint, why each policy exists.
2. **Schema changes (admin_audit_log):**
   - `ADD COLUMN IF NOT EXISTS field text` on `admin_audit_log`
   - `CREATE INDEX IF NOT EXISTS admin_audit_log_lookup_idx (table_name, row_id, field, created_at DESC)`
3. **Admin write policies — 7 tables × pattern:**
   - `profiles_admin_update`
   - `users_admin_update`
   - `hs_programs_admin_update`
   - `college_coaches_admin_insert` + `_admin_update` + `_admin_delete`
   - `recruiting_events_admin_insert` + `_admin_update` + `_admin_delete`
   - `admin_audit_log_admin_insert`
4. **Conditional admin write policies — link tables (only if Phase 1 routes link edits inline):**
   - `hs_coach_schools_admin_update` (+ optionally insert/delete)
   - `hs_counselor_schools_admin_update` (+ optionally insert/delete)
5. **Idempotency:** Every `CREATE POLICY` wrapped in `DROP POLICY IF EXISTS … ; CREATE POLICY …` to keep the migration re-runnable.
6. **Transactional:** Single `BEGIN; … COMMIT;` block. No data writes, no destructive operations.

**Total policies created: 11 (mandatory) + up to 6 (link tables, conditional) = 17 max.**

---

## Cross-cutting observations

1. **Service-role is the de-facto admin write path today.** Sprint 027 continues this pattern via service-role EF clients. The new RLS policies are not load-bearing for the EF write path.
2. **Sprint 027 EF auth gate is the actual security boundary.** Pattern: `userClient.auth.getUser(accessToken)` then `userData.user.app_metadata?.role === 'admin'`. See `admin-update-school/index.ts:117-132` for the canonical implementation.
3. **No CI / linter check exists for "RLS-enabled-but-no-policies."** `hs_programs` had only a SELECT policy and no other policies, and that was undetected. Consider adding a Phase 4 follow-up: a `pg_policies` audit script that flags any RLS-enabled table without write policies. Out of scope for Sprint 027 build but worth flagging.
4. **The `users_update_own_full_name` policy locks 4 columns at the RLS layer (Sprint 023).** If Sprint 027 admin writes ever fail unexpectedly, that policy is a likely suspect — but admin EF writes via service-role bypass it entirely. Note for Phase 3 negative-test design.
