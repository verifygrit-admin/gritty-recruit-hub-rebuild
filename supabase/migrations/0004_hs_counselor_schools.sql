-- Migration: 0004_hs_counselor_schools
-- Table: hs_counselor_schools
-- Spec: patch-schema-auth-spec-v2.md Section 2.7
-- Links a guidance counselor to their high school program

CREATE TABLE public.hs_counselor_schools (
  id                  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  counselor_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_program_id       uuid NOT NULL REFERENCES public.hs_programs(id) ON DELETE CASCADE,
  linked_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_counselor_schools_pkey PRIMARY KEY (id),
  CONSTRAINT hs_counselor_schools_counselor_program_key UNIQUE (counselor_user_id, hs_program_id)
);
