-- Migration: 0010_file_uploads
-- Table: file_uploads
-- Spec: patch-schema-auth-spec-v2.md Section 2.12
-- SAID REMOVED (DEC-CFBRB-002)
-- document_type enum added (drives financial_aid_info exclusion in RLS)
-- financial_aid_info: visible to students + counselors; BLOCKED for coaches at RLS layer

CREATE TABLE public.file_uploads (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unitid           integer,
  file_name        text NOT NULL,
  file_label       text,
  storage_path     text NOT NULL,
  document_type    text NOT NULL CHECK (document_type IN (
                     'transcript',
                     'senior_course_list',
                     'writing_example',
                     'student_resume',
                     'school_profile_pdf',
                     'sat_act_scores',
                     'financial_aid_info'
                   )),
  file_type        text,
  file_size_bytes  integer,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_uploads_pkey PRIMARY KEY (id)
);
