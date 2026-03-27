-- Migration: 0015_student_coach_counselor_select_policies
-- Purpose: Allow students to see coaches and counselors at their hs_program
--   so they can confirm coach/counselor relationships in the profile form.
-- Also: Allow students to INSERT into hs_counselor_students (was service-role only).

CREATE POLICY "hs_coach_schools_select_student"
  ON public.hs_coach_schools FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hs_counselor_schools_select_student"
  ON public.hs_counselor_schools FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "hs_counselor_students_insert_student"
  ON public.hs_counselor_students FOR INSERT
  WITH CHECK (auth.uid() = student_user_id);
