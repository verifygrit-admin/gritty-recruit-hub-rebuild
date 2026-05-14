-- 0051_account_updates_admin_write_policies.sql
-- Sprint 027 — Phase 1. Adds admin-scoped write policies for the 7 in-scope
-- tables of the new "Account Updates" admin tab, extends admin_audit_log with
-- a per-field column to support Q7 audit semantics, and backfills 11 missing
-- supabase_migrations tracking rows (one-time cleanup of CF-027-2).
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- All Sprint 027 admin writes flow through new Edge Functions that use the
-- Supabase service role key. Service role bypasses RLS entirely, so the
-- policies created here are NOT load-bearing for the Sprint 027 EF write path.
-- They are defense-in-depth: if any future code path attempts to write to
-- these tables with the user's anon JWT carrying app_metadata.role='admin'
-- (e.g. a future direct-from-browser admin write), these policies grant the
-- write. Without them, such writes would silently fail under RLS.
--
-- The primary security boundary remains the EF auth gate
-- (userClient.auth.getUser(accessToken) → app_metadata.role === 'admin') —
-- pattern documented in supabase/functions/admin-update-school/index.ts:117-132
-- and DEC 016-C WT-B.
--
-- AUDIT TABLE EXTENSION
-- ---------------------
-- Sprint 027 Q7 ruling: one audit row per field changed (10-row × 5-field bulk
-- submit creates 50 audit rows). The existing public.admin_audit_log table has
-- no per-field column. Phase 0 Issue 2 decision: extend the existing table
-- (single audit table; lean schema) rather than create a separate
-- admin_account_updates_audit table.
--
-- The new `field` column is nullable to preserve compatibility with the 10
-- existing audit rows from admin-update-school (which writes one row per row
-- update, not per field). Sprint 027 admin-update-account writes set `field`
-- to the changed column name. The new index supports the canonical lookup
-- "what did admin X change to field F on row R" without JSONB key extraction.
--
-- LINK-TABLE POLICIES
-- -------------------
-- The HS Coaches and Counselors forms edit the school link inline
-- (hs_coach_schools.is_head_coach + hs_coach_schools.hs_program_id;
--  hs_counselor_schools.hs_program_id). Operator confirmed Phase 1
-- Issue 4 decision — link-table edits in the same form. Six policies cover
-- INSERT/UPDATE/DELETE for both link tables.
--
-- MIGRATION TRACKING BACKFILL
-- ---------------------------
-- public.supabase_migrations is missing 11 tracking rows for migrations
-- 0036-0041, 0045-0046, 0048-0050 (live schema reflects all of these as
-- applied; the tracking table diverged because some migrations were applied
-- via Supabase CLI db push or the Dashboard SQL editor rather than via
-- scripts/migrate.js). scripts/migrate.js already writes tracking rows
-- correctly (see line 134) — no patch required. This block is a one-time
-- cleanup. ON CONFLICT DO NOTHING keeps it idempotent.
--
-- IDEMPOTENCY
-- -----------
-- All policy creations use DROP POLICY IF EXISTS … ; CREATE POLICY … so the
-- migration can re-run safely. Column add uses IF NOT EXISTS. Index uses
-- IF NOT EXISTS. Migration tracking backfill uses ON CONFLICT DO NOTHING.
--
-- ROLLBACK PATH (manual, not auto-shipped)
-- ----------------------------------------
--   -- Schema:
--   ALTER TABLE public.admin_audit_log DROP COLUMN IF EXISTS field;
--   DROP INDEX IF EXISTS public.admin_audit_log_lookup_idx;
--   -- Policies (one DROP POLICY IF EXISTS per name created below):
--   DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
--   ...etc.
--
-- AUTHORIZATION
-- -------------
-- Sprint 027 Phase 1 — operator authorized 2026-05-13.

BEGIN;

-- ============================================================================
-- 1. Schema delta — admin_audit_log gains per-field column + lookup index
-- ============================================================================

ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS field text;

CREATE INDEX IF NOT EXISTS admin_audit_log_lookup_idx
  ON public.admin_audit_log (table_name, row_id, field, created_at DESC);

-- ============================================================================
-- 2. Admin-write policies — primary 7 entities (11 policies)
-- ============================================================================

-- 2a. profiles — admin UPDATE (no admin INSERT/DELETE; Students not in
--                              create/delete-enabled trio per Q5)

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update
  ON public.profiles
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- 2b. users — admin UPDATE (HS Coaches/Counselors not in create/delete trio)
--             Note: existing users_update_own_full_name policy is preserved;
--             both policies apply additively.

DROP POLICY IF EXISTS users_admin_update ON public.users;
CREATE POLICY users_admin_update
  ON public.users
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- 2c. hs_programs — admin UPDATE (High Schools not in create/delete trio)

DROP POLICY IF EXISTS hs_programs_admin_update ON public.hs_programs;
CREATE POLICY hs_programs_admin_update
  ON public.hs_programs
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- 2d. college_coaches — admin INSERT/UPDATE/DELETE (in create/delete-enabled trio)
--                       Existing college_coaches_*_service policies preserved;
--                       admin OR service_role grants the write (additive).

DROP POLICY IF EXISTS college_coaches_admin_insert ON public.college_coaches;
CREATE POLICY college_coaches_admin_insert
  ON public.college_coaches
  FOR INSERT
  TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS college_coaches_admin_update ON public.college_coaches;
CREATE POLICY college_coaches_admin_update
  ON public.college_coaches
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS college_coaches_admin_delete ON public.college_coaches;
CREATE POLICY college_coaches_admin_delete
  ON public.college_coaches
  FOR DELETE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- 2e. recruiting_events — admin INSERT/UPDATE/DELETE (in create/delete trio)

DROP POLICY IF EXISTS recruiting_events_admin_insert ON public.recruiting_events;
CREATE POLICY recruiting_events_admin_insert
  ON public.recruiting_events
  FOR INSERT
  TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS recruiting_events_admin_update ON public.recruiting_events;
CREATE POLICY recruiting_events_admin_update
  ON public.recruiting_events
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS recruiting_events_admin_delete ON public.recruiting_events;
CREATE POLICY recruiting_events_admin_delete
  ON public.recruiting_events
  FOR DELETE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- 2f. admin_audit_log — admin INSERT (so the audit-write EF call is RLS-clean
--                       even when not using service-role; service-role bypass
--                       remains the primary write path).

DROP POLICY IF EXISTS admin_audit_log_admin_insert ON public.admin_audit_log;
CREATE POLICY admin_audit_log_admin_insert
  ON public.admin_audit_log
  FOR INSERT
  TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- ============================================================================
-- 3. Admin-write policies — link tables (6 policies; Q4 link-edit decision)
-- ============================================================================

-- 3a. hs_coach_schools — admin INSERT/UPDATE/DELETE
--     UPDATE supports flipping is_head_coach and reassigning hs_program_id.
--     INSERT supports linking a coach to a new school via the same form.
--     DELETE supports unlinking (admin off-boards a coach from a school).

DROP POLICY IF EXISTS hs_coach_schools_admin_insert ON public.hs_coach_schools;
CREATE POLICY hs_coach_schools_admin_insert
  ON public.hs_coach_schools
  FOR INSERT
  TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS hs_coach_schools_admin_update ON public.hs_coach_schools;
CREATE POLICY hs_coach_schools_admin_update
  ON public.hs_coach_schools
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS hs_coach_schools_admin_delete ON public.hs_coach_schools;
CREATE POLICY hs_coach_schools_admin_delete
  ON public.hs_coach_schools
  FOR DELETE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- 3b. hs_counselor_schools — admin INSERT/UPDATE/DELETE

DROP POLICY IF EXISTS hs_counselor_schools_admin_insert ON public.hs_counselor_schools;
CREATE POLICY hs_counselor_schools_admin_insert
  ON public.hs_counselor_schools
  FOR INSERT
  TO public
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS hs_counselor_schools_admin_update ON public.hs_counselor_schools;
CREATE POLICY hs_counselor_schools_admin_update
  ON public.hs_counselor_schools
  FOR UPDATE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS hs_counselor_schools_admin_delete ON public.hs_counselor_schools;
CREATE POLICY hs_counselor_schools_admin_delete
  ON public.hs_counselor_schools
  FOR DELETE
  TO public
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- ============================================================================
-- 4. supabase_migrations tracking-row backfill (one-time cleanup, CF-027-2)
-- ============================================================================
-- The 11 migrations below were applied to the live DB via channels other than
-- scripts/migrate.js (Supabase CLI db push or Dashboard SQL editor) and were
-- never recorded in the tracking table. Backfill with the file basename as
-- name and the numeric prefix as version to match the scripts/migrate.js
-- convention (see scripts/migrate.js:134). ON CONFLICT preserves any rows
-- that may have been added via other channels in the interim.

INSERT INTO public.supabase_migrations (version, name) VALUES
  ('0036', '0036_schools_add_athletics_contact.sql'),
  ('0037', '0037_relabel_journey_steps_for_scoreboard.sql'),
  ('0038', '0038_add_public_recruits_select.sql'),
  ('0039', '0039_coach_scheduler_tables.sql'),
  ('0040', '0040_visit_request_players.sql'),
  ('0041', '0041_coach_submissions_intake_log_reframe.sql'),
  ('0045', '0045_athletes_public_select_authenticated_and_grad_year.sql'),
  ('0046', '0046_users_add_full_name.sql'),
  ('0048', '0048_bulk_pds_submissions.sql'),
  ('0049', '0049_profiles_add_bulk_pds_measurables.sql'),
  ('0050', '0050_bulk_pds_submissions_rls.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
