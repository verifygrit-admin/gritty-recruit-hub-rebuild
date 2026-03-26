-- Migration: 0012_rls_policies
-- RLS policies for all tables
-- Spec: patch-schema-auth-spec-v2.md Section 4 (4.1 through 4.11)
-- Key decisions:
--   Coaches CANNOT see financial_aid_info under any condition (DEC-CFBRB-003)
--   Counselors CAN see all document types including financial_aid_info (DEC-CFBRB-003, OQ-3 Chris confirmed)
--   All coach/counselor visibility joins through hs_coach_students / hs_counselor_students
--   profiles_insert_open INCLUDED — permanent fix (was missing from live DB, caused 42501 incident 2026-03-24)

-- ============================================================
-- 4.1 users table
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT / UPDATE / DELETE: service role only (no browser-side policy needed; service role bypasses RLS)

-- ============================================================
-- 4.2 profiles table
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Student reads own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Coach reads profiles of confirmed students
CREATE POLICY "profiles_select_coach"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_coach_students
      WHERE coach_user_id = auth.uid()
    )
  );

-- Counselor reads profiles of linked students
CREATE POLICY "profiles_select_counselor"
  ON public.profiles FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Student inserts their own profile (profiles_insert_open — permanent fix)
CREATE POLICY "profiles_insert_open"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Student updates their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: service role only

-- ============================================================
-- 4.3 short_list_items table
-- ============================================================
ALTER TABLE public.short_list_items ENABLE ROW LEVEL SECURITY;

-- Student reads own shortlist
CREATE POLICY "short_list_items_select_own"
  ON public.short_list_items FOR SELECT
  USING (auth.uid() = user_id);

-- Coach reads shortlist of confirmed students
CREATE POLICY "short_list_items_select_coach"
  ON public.short_list_items FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_coach_students
      WHERE coach_user_id = auth.uid()
    )
  );

-- Counselor reads shortlist of linked students
CREATE POLICY "short_list_items_select_counselor"
  ON public.short_list_items FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

CREATE POLICY "short_list_items_insert_own"
  ON public.short_list_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "short_list_items_update_own"
  ON public.short_list_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "short_list_items_delete_own"
  ON public.short_list_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4.4 file_uploads table (CRITICAL — financial_aid_info policy)
-- ============================================================
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Student sees ALL their own files including financial_aid_info
CREATE POLICY "file_uploads_select_own"
  ON public.file_uploads FOR SELECT
  USING (auth.uid() = user_id);

-- Coach sees confirmed students' files EXCEPT financial_aid_info
-- Coaches CANNOT see financial_aid_info under any condition
CREATE POLICY "file_uploads_select_coach"
  ON public.file_uploads FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_coach_students
      WHERE coach_user_id = auth.uid()
    )
    AND document_type != 'financial_aid_info'
  );

-- Counselor sees linked students' ALL document types including financial_aid_info
CREATE POLICY "file_uploads_select_counselor"
  ON public.file_uploads FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

CREATE POLICY "file_uploads_insert_own"
  ON public.file_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "file_uploads_update_own"
  ON public.file_uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "file_uploads_delete_own"
  ON public.file_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4.5 hs_coach_schools table
-- ============================================================
ALTER TABLE public.hs_coach_schools ENABLE ROW LEVEL SECURITY;

-- Coach reads their own school links
CREATE POLICY "hs_coach_schools_select_own"
  ON public.hs_coach_schools FOR SELECT
  USING (coach_user_id = auth.uid());

-- INSERT / UPDATE / DELETE: service role only

-- ============================================================
-- 4.6 hs_counselor_schools table
-- ============================================================
ALTER TABLE public.hs_counselor_schools ENABLE ROW LEVEL SECURITY;

-- Counselor reads their own school links
CREATE POLICY "hs_counselor_schools_select_own"
  ON public.hs_counselor_schools FOR SELECT
  USING (counselor_user_id = auth.uid());

-- INSERT / UPDATE / DELETE: service role only

-- ============================================================
-- 4.7 hs_coach_students table
-- ============================================================
ALTER TABLE public.hs_coach_students ENABLE ROW LEVEL SECURITY;

-- Coach or student can read the link (student can see who their coach is)
CREATE POLICY "hs_coach_students_select"
  ON public.hs_coach_students FOR SELECT
  USING (
    coach_user_id = auth.uid()
    OR student_user_id = auth.uid()
  );

-- Student inserts their own coach link during profile setup (confirms the relationship)
CREATE POLICY "hs_coach_students_insert_student"
  ON public.hs_coach_students FOR INSERT
  WITH CHECK (auth.uid() = student_user_id);

-- UPDATE / DELETE: service role only

-- ============================================================
-- 4.8 hs_counselor_students table
-- ============================================================
ALTER TABLE public.hs_counselor_students ENABLE ROW LEVEL SECURITY;

-- Counselor or student can read the link
CREATE POLICY "hs_counselor_students_select"
  ON public.hs_counselor_students FOR SELECT
  USING (
    counselor_user_id = auth.uid()
    OR student_user_id = auth.uid()
  );

-- INSERT / UPDATE / DELETE: service role only (counselor-student links are admin-seeded in MVP)

-- ============================================================
-- 4.9 email_verify_tokens table
-- ============================================================
ALTER TABLE public.email_verify_tokens ENABLE ROW LEVEL SECURITY;

-- All operations: service role only (Edge Function uses service role key)
-- No browser-side policies — no authenticated user should read token rows directly

-- ============================================================
-- 4.10 hs_programs table
-- ============================================================
ALTER TABLE public.hs_programs ENABLE ROW LEVEL SECURITY;

-- Public read — school list visible to anyone for dropdown (anon + authenticated)
CREATE POLICY "hs_programs_public_select"
  ON public.hs_programs FOR SELECT
  USING (true);

-- INSERT / UPDATE / DELETE: service role only

-- ============================================================
-- 4.11 schools table (NCAA)
-- ============================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Public read — NCAA school data visible to anyone
CREATE POLICY "schools_public_select"
  ON public.schools FOR SELECT
  USING (true);

CREATE POLICY "schools_deny_insert"
  ON public.schools FOR INSERT
  WITH CHECK (false);

CREATE POLICY "schools_deny_update"
  ON public.schools FOR UPDATE
  USING (false);

CREATE POLICY "schools_deny_delete"
  ON public.schools FOR DELETE
  USING (false);
