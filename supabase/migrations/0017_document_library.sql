-- Migration: 0017_document_library
-- Table: document_library
-- Purpose: Pre-Read Docs Library — one row per document slot per student.
--   All types get one slot. writing_example gets two slots (slot_number 1 and 2).
-- Spec decisions:
--   D1: slot_number column, UNIQUE on (user_id, document_type, slot_number)
--   D3: fresh start — no migration of file_uploads rows
--   D5: financial_aid_info excluded from this table (separate secure page planned)
-- Separate table from file_uploads — different lifecycle, sharing model, and slot logic.

CREATE TABLE public.document_library (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type    text        NOT NULL CHECK (document_type IN (
                                 'transcript',
                                 'senior_course_list',
                                 'writing_example',
                                 'student_resume',
                                 'school_profile_pdf',
                                 'sat_act_scores'
                               )),
  slot_number      integer     NOT NULL DEFAULT 1,
  file_name        text        NOT NULL,
  file_label       text,
  storage_path     text        NOT NULL,
  file_type        text,
  file_size_bytes  integer,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT document_library_pkey PRIMARY KEY (id),
  CONSTRAINT document_library_slot_unique UNIQUE (user_id, document_type, slot_number),

  -- writing_example: slot 1 or 2. All other types: slot 1 only.
  CONSTRAINT document_library_slot_number_check CHECK (
    (document_type = 'writing_example' AND slot_number IN (1, 2))
    OR (document_type != 'writing_example' AND slot_number = 1)
  )
);

-- Index for fast lookup by student (most common query pattern)
CREATE INDEX document_library_user_id_idx ON public.document_library (user_id);
