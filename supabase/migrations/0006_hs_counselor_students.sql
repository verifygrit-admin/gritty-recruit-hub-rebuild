-- Migration: 0006_hs_counselor_students
-- Table: hs_counselor_students
-- Spec: patch-schema-auth-spec-v2.md Section 2.9
-- Links a counselor to their student roster
-- Admin-seeded in MVP — no self-service add

CREATE TABLE public.hs_counselor_students (
  id                  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  counselor_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_counselor_students_pkey PRIMARY KEY (id),
  CONSTRAINT hs_counselor_students_counselor_student_key UNIQUE (counselor_user_id, student_user_id)
);
