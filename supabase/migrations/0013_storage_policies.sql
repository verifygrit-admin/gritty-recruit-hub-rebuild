-- Migration: 0013_storage_policies
-- Supabase Storage: recruit-files bucket + storage policies
-- Spec: patch-schema-auth-spec-v2.md Section 4.12
-- Dual-layer enforcement: storage policy + file_uploads RLS both block coaches from financial_aid_info
-- Path convention: {user_id}/* — upload path must match the authenticated user's own user_id prefix

-- ============================================================
-- Create recruit-files bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recruit-files', 'recruit-files', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Upload policy (INSERT)
-- Authenticated users can upload only to their own user_id prefix
-- ============================================================
CREATE POLICY "recruit_files_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recruit-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Download policy (SELECT) — student
-- Student can download their own files (path prefix matches their user_id)
-- ============================================================
CREATE POLICY "recruit_files_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recruit-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Download policy (SELECT) — coach
-- Coach can download files of confirmed students EXCEPT financial_aid_info
-- Joins through file_uploads to enforce document_type exclusion
-- financial_aid_info is blocked at both this layer and the file_uploads RLS layer
-- ============================================================
CREATE POLICY "recruit_files_select_coach"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recruit-files'
    AND EXISTS (
      SELECT 1 FROM public.file_uploads fu
      JOIN public.hs_coach_students hcs ON hcs.student_user_id = fu.user_id
      WHERE hcs.coach_user_id = auth.uid()
        AND fu.storage_path = storage.objects.name
        AND fu.document_type != 'financial_aid_info'
    )
  );

-- ============================================================
-- Download policy (SELECT) — counselor
-- Counselor can download files of linked students — all document types permitted
-- financial_aid_info IS permitted for counselors (Chris confirmed OQ-3)
-- ============================================================
CREATE POLICY "recruit_files_select_counselor"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recruit-files'
    AND EXISTS (
      SELECT 1 FROM public.file_uploads fu
      JOIN public.hs_counselor_students hcs ON hcs.student_user_id = fu.user_id
      WHERE hcs.counselor_user_id = auth.uid()
        AND fu.storage_path = storage.objects.name
    )
  );

-- ============================================================
-- Delete policy
-- Users can delete only their own files
-- ============================================================
CREATE POLICY "recruit_files_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recruit-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: no policy — files are immutable; delete and re-upload if replacement needed
