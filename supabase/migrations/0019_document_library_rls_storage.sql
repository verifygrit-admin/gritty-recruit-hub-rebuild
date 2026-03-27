-- Migration: 0019_document_library_rls_storage
-- RLS policies for document_library and document_shares
-- Storage policies for library-path files in recruit-files bucket
-- Spec decisions:
--   D2: Counselor has full CRUD on associated students' library rows (same library, not a copy)
--   D4: No unshare — student INSERT only on document_shares; no student UPDATE or DELETE
--   Coach access: NOT in scope — no coach policies written

-- ============================================================
-- document_library RLS
-- ============================================================
ALTER TABLE public.document_library ENABLE ROW LEVEL SECURITY;

-- Student: full CRUD on own rows
CREATE POLICY "document_library_select_own"
  ON public.document_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "document_library_insert_own"
  ON public.document_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "document_library_update_own"
  ON public.document_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "document_library_delete_own"
  ON public.document_library FOR DELETE
  USING (auth.uid() = user_id);

-- Counselor: SELECT on associated students' library rows (D2)
CREATE POLICY "document_library_select_counselor"
  ON public.document_library FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Counselor: INSERT on behalf of associated student (D2)
CREATE POLICY "document_library_insert_counselor"
  ON public.document_library FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Counselor: UPDATE on associated students' library rows (D2)
CREATE POLICY "document_library_update_counselor"
  ON public.document_library FOR UPDATE
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Counselor: DELETE on associated students' library rows (D2)
CREATE POLICY "document_library_delete_counselor"
  ON public.document_library FOR DELETE
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- ============================================================
-- document_shares RLS
-- ============================================================
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Student: SELECT own share rows
CREATE POLICY "document_shares_select_own"
  ON public.document_shares FOR SELECT
  USING (auth.uid() = user_id);

-- Student: INSERT own share rows (the share action)
CREATE POLICY "document_shares_insert_own"
  ON public.document_shares FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND library_doc_id IN (
      SELECT id FROM public.document_library
      WHERE user_id = auth.uid()
    )
  );

-- Student: NO UPDATE policy (D4 — no unshare)
-- Student: NO DELETE policy (D4 — cascade-delete from library handles cleanup)

-- Counselor: SELECT share rows for associated students (D2)
CREATE POLICY "document_shares_select_counselor"
  ON public.document_shares FOR SELECT
  USING (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Counselor: INSERT share rows on behalf of associated students (D2)
CREATE POLICY "document_shares_insert_counselor"
  ON public.document_shares FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT student_user_id FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
    AND library_doc_id IN (
      SELECT id FROM public.document_library
      WHERE user_id IN (
        SELECT student_user_id FROM public.hs_counselor_students
        WHERE counselor_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Storage policies — library-path files
-- Path convention: {user_id}/library/{slot_number}/{filename}
-- Bucket: recruit-files (same bucket as file_uploads, established in 0013)
-- Existing policies (upload_own, select_own, delete_own) cover student's
-- own user_id prefix — they already cover library-path student operations.
-- New policies needed only for COUNSELOR access to a different student's prefix.
-- ============================================================

-- Counselor upload: counselor can upload to a student's library path
CREATE POLICY "recruit_files_upload_counselor_library"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recruit-files'
    AND (storage.foldername(name))[1] != auth.uid()::text
    AND (storage.foldername(name))[2] = 'library'
    AND (storage.foldername(name))[1] IN (
      SELECT student_user_id::text FROM public.hs_counselor_students
      WHERE counselor_user_id = auth.uid()
    )
  );

-- Counselor download: counselor can download library-path files for associated students
CREATE POLICY "recruit_files_select_counselor_library"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recruit-files'
    AND (storage.foldername(name))[2] = 'library'
    AND EXISTS (
      SELECT 1 FROM public.document_library dl
      JOIN public.hs_counselor_students hcs ON hcs.student_user_id = dl.user_id
      WHERE hcs.counselor_user_id = auth.uid()
        AND dl.storage_path = storage.objects.name
    )
  );

-- Counselor delete of library files for associated students
CREATE POLICY "recruit_files_delete_counselor_library"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recruit-files'
    AND (storage.foldername(name))[2] = 'library'
    AND EXISTS (
      SELECT 1 FROM public.document_library dl
      JOIN public.hs_counselor_students hcs ON hcs.student_user_id = dl.user_id
      WHERE hcs.counselor_user_id = auth.uid()
        AND dl.storage_path = storage.objects.name
    )
  );
