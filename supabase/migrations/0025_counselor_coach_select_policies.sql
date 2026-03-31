-- 0025_counselor_coach_select_policies.sql
-- Allows counselors to read coach profiles for coaches linked to their students.
-- Required for: CoachSchoolDetailPanel "Email Coach" button in counselor view.
-- Decision: Option C Phase 2 (2026-03-30)

-- Gap 1: Counselor can read hs_coach_students rows for their linked students
CREATE POLICY "hs_coach_students_select_counselor"
  ON public.hs_coach_students FOR SELECT
  USING (
    student_user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Gap 2: Counselor can read coach profile rows (email) for coaches linked to their students
CREATE POLICY "profiles_select_counselor_coach"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT coach_user_id FROM public.hs_coach_students
      WHERE student_user_id IN (
        SELECT student_user_id FROM public.hs_counselor_students
        WHERE counselor_user_id = auth.uid()
      )
    )
  );
