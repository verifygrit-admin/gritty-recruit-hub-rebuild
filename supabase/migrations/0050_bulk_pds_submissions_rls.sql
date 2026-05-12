-- 0050_bulk_pds_submissions_rls.sql
-- Sprint 026 — RLS policies for public.bulk_pds_submissions.
--
-- Pre-state (set by Supabase when the table was created in 0048):
--   rls_enabled = true, policy_count = 0  → table is locked to all non-service roles.
--
-- This migration installs the three policies that govern the Bulk PDS flow:
--
--   1. Coach SELECT — coaches can read only the rows they submitted.
--   2. Coach INSERT — coaches can submit only with their own coach_user_id,
--      and only for students linked to them in public.hs_coach_students.
--   3. Admin SELECT — admin JWT (app_metadata.role='admin') can SELECT any row.
--      (Admin EFs use service_role and bypass RLS; this policy exists for
--      consistency with the admin_audit_log pattern from migration 0035 and
--      to support direct authenticated-user reads from a future admin UI.)
--
-- Intentionally NOT present:
--   - Coach UPDATE / Coach DELETE   — staging rows are immutable to coaches.
--     Per Q3, admin cannot edit staging values either.
--   - Coach INSERT for other coaches — WITH CHECK clause locks coach_user_id
--     to auth.uid() and verifies hs_coach_students linkage.
--   - Approval / rejection UPDATEs   — performed by admin EFs via service_role,
--     which bypasses RLS entirely. No browser-side admin write policy needed.
--
-- Behavioral RLS scenarios from SPRINT_026_PLAN.md §4.2 (6 scenarios):
--   These require live auth sessions for distinct coach/student users and
--   land as Phase 1 integration tests, not Phase 0 schema tests. The policy
--   structure below is what those tests will exercise.

-- (RLS is already enabled by Supabase on table creation; redeclare for safety.)
ALTER TABLE public.bulk_pds_submissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: coach SELECT — own submissions only.
CREATE POLICY "bulk_pds_coach_select_own"
  ON public.bulk_pds_submissions
  FOR SELECT
  USING (coach_user_id = auth.uid());

-- Policy 2: coach INSERT — only with own coach_user_id, and only for students
-- linked to the coach via public.hs_coach_students.
CREATE POLICY "bulk_pds_coach_insert_own_linked_students"
  ON public.bulk_pds_submissions
  FOR INSERT
  WITH CHECK (
    coach_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.hs_coach_students hcs
      WHERE hcs.coach_user_id   = auth.uid()
        AND hcs.student_user_id = bulk_pds_submissions.student_user_id
    )
  );

-- Policy 3: admin SELECT — mirrors admin_audit_log pattern (migration 0035).
CREATE POLICY "bulk_pds_admin_select_all"
  ON public.bulk_pds_submissions
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
