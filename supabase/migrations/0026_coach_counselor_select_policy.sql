-- 0026_coach_counselor_select_policy.sql
-- Allows coaches to read hs_counselor_students rows for their linked students.
-- Required for: CoachSchoolDetailPanel "Email Counselor" button in coach view.
-- Root cause: 0012 hs_counselor_students_select policy only covers counselor_user_id = auth.uid()
--   OR student_user_id = auth.uid(). A coach is neither, so RLS returned zero rows,
--   making counselorByStudent always empty for coaches.
-- Symmetric to: hs_coach_students_select_counselor added in 0025.

-- Gap 1: Coach can read hs_counselor_students rows for their linked students
CREATE POLICY "hs_counselor_students_select_coach"
  ON public.hs_counselor_students FOR SELECT
  USING (
    student_user_id IN (
      SELECT student_user_id FROM public.hs_coach_students
      WHERE coach_user_id = auth.uid()
    )
  );

-- Gap 2: Coach can read counselor profile rows (email) for counselors linked to their students
CREATE POLICY "profiles_select_coach_counselor"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT counselor_user_id FROM public.hs_counselor_students
      WHERE student_user_id IN (
        SELECT student_user_id FROM public.hs_coach_students
        WHERE coach_user_id = auth.uid()
      )
    )
  );
