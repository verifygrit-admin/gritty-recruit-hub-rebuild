-- Migration: 0001_hs_programs
-- Table: hs_programs
-- Spec: patch-schema-auth-spec-v2.md Section 2.2
-- Decision: UNIQUE (school_name, state) applied — prevents duplicate school entries

CREATE TABLE public.hs_programs (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  school_name    text NOT NULL,
  address        text,
  city           text,
  state          text NOT NULL,
  zip            text,
  conference     text,
  division       text,
  state_athletic_association text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hs_programs_pkey PRIMARY KEY (id),
  CONSTRAINT hs_programs_school_state_key UNIQUE (school_name, state)
);
