-- 0027_rls_security_definer_cross_table.sql
-- Fixes circular RLS recursion between hs_coach_students and hs_counselor_students.
--
-- Root cause:
--   0025 "hs_coach_students_select_counselor" SELECT on hs_coach_students
--     subqueries hs_counselor_students — which itself has RLS policies.
--   0026 "hs_counselor_students_select_coach" SELECT on hs_counselor_students
--     subqueries hs_coach_students — which itself has RLS policies.
--   Each policy re-enters the other table's RLS → infinite recursion → 500.
--
-- Fix: SECURITY DEFINER functions bypass RLS on the inner table reads.
--   Two helper functions — one per cross-table lookup direction.
--   All four cross-table policies are dropped and re-created using these functions.

-- ============================================================
-- Step 1: Drop the four policies that form the cycle
-- ============================================================

DROP POLICY IF EXISTS "hs_coach_students_select_counselor"   ON public.hs_coach_students;
DROP POLICY IF EXISTS "profiles_select_counselor_coach"       ON public.profiles;
DROP POLICY IF EXISTS "hs_counselor_students_select_coach"    ON public.hs_counselor_students;
DROP POLICY IF EXISTS "profiles_select_coach_counselor"       ON public.profiles;

-- ============================================================
-- Step 2: SECURITY DEFINER helper functions
-- These functions execute as the function owner (superuser/postgres),
-- bypassing RLS entirely on the inner table read.
-- SET search_path = public prevents search_path injection.
-- ============================================================

-- Helper A: Given a counselor_user_id, returns the set of student_user_ids
-- they are linked to in hs_counselor_students (RLS bypassed on that table).
CREATE OR REPLACE FUNCTION public.get_student_ids_for_counselor(p_counselor_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_user_id
  FROM public.hs_counselor_students
  WHERE counselor_user_id = p_counselor_id;
$$;

-- Helper B: Given a coach_user_id, returns the set of student_user_ids
-- they are linked to in hs_coach_students (RLS bypassed on that table).
CREATE OR REPLACE FUNCTION public.get_student_ids_for_coach(p_coach_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_user_id
  FROM public.hs_coach_students
  WHERE coach_user_id = p_coach_id;
$$;

-- ============================================================
-- Step 3: Re-create all four cross-table RLS policies
--         using the SECURITY DEFINER functions
-- ============================================================

-- Counselor can read hs_coach_students rows for their linked students
CREATE POLICY "hs_coach_students_select_counselor"
  ON public.hs_coach_students FOR SELECT
  USING (
    student_user_id IN (
      SELECT public.get_student_ids_for_counselor(auth.uid())
    )
  );

-- Counselor can read coach profile rows for coaches linked to their students
CREATE POLICY "profiles_select_counselor_coach"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT coach_user_id
      FROM public.hs_coach_students
      WHERE student_user_id IN (
        SELECT public.get_student_ids_for_counselor(auth.uid())
      )
    )
  );

-- Coach can read hs_counselor_students rows for their linked students
CREATE POLICY "hs_counselor_students_select_coach"
  ON public.hs_counselor_students FOR SELECT
  USING (
    student_user_id IN (
      SELECT public.get_student_ids_for_coach(auth.uid())
    )
  );

-- Coach can read counselor profile rows for counselors linked to their students
CREATE POLICY "profiles_select_coach_counselor"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT counselor_user_id
      FROM public.hs_counselor_students
      WHERE student_user_id IN (
        SELECT public.get_student_ids_for_coach(auth.uid())
      )
    )
  );
