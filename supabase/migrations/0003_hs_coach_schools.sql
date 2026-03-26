-- Migration: 0003_hs_coach_schools
-- Table: hs_coach_schools
-- Spec: patch-schema-auth-spec-v2.md Section 2.6
-- Decision: is_head_coach is a property of the coach-school relationship (Chris direction)
-- Replaces v1 user_hs_programs table

CREATE TABLE public.hs_coach_schools (
  id              bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  coach_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hs_program_id   uuid NOT NULL REFERENCES public.hs_programs(id) ON DELETE CASCADE,
  is_head_coach   boolean NOT NULL DEFAULT false,
  linked_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_coach_schools_pkey PRIMARY KEY (id),
  CONSTRAINT hs_coach_schools_coach_program_key UNIQUE (coach_user_id, hs_program_id)
);
