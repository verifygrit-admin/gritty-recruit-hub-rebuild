-- Migration: 0005_hs_coach_students
-- Table: hs_coach_students
-- Spec: patch-schema-auth-spec-v2.md Section 2.8
-- Explicit coach-student link — created when student confirms "Yes, [Coach] is my coach"
-- This table is the RLS join key for all coach SELECT policies on profiles/short_list_items/file_uploads
-- Coach sees ONLY students who have explicitly confirmed the link

CREATE TABLE public.hs_coach_students (
  id              bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  coach_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_coach_students_pkey PRIMARY KEY (id),
  CONSTRAINT hs_coach_students_coach_student_key UNIQUE (coach_user_id, student_user_id)
);
