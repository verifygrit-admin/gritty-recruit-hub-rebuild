-- 0034_schools_admin_update_policy.sql
-- Replaces the blanket schools_deny_update policy with an admin-only update policy.
-- Required by: Edge Function admin-update-school (Section C).
--
-- Decision References:
--   CHECK WITH ME approved by Chris, 2026-04-10.
--   Morty architecture review: APPROVED, 2026-04-10.
--   Three-way session (Patch + David + Morty), 2026-04-10.
--
-- What this does:
--   1. Drops the existing USING(false) blanket deny on UPDATE.
--   2. Creates an admin-only UPDATE policy scoped to app_metadata.role = 'admin'.
--   Edge Functions use service_role (bypasses RLS) — this policy gates browser-side
--   UPDATE attempts and documents the intended access model in the schema.

-- Step 1: Drop the existing blanket deny policy.
DROP POLICY "schools_deny_update" ON public.schools;

-- Step 2: Create admin-only update policy.
CREATE POLICY "schools_admin_update"
  ON public.schools FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
