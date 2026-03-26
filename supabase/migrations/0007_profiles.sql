-- Migration: 0007_profiles
-- Table: profiles
-- Spec: patch-schema-auth-spec-v2.md Section 2.4
-- SAID REMOVED ENTIRELY (DEC-CFBRB-002) — user_id is sole identity key
-- No generate_said() trigger. No linkSaidToAuth() call. No auth_said() RPC.
-- high_school is a display label; authoritative coach-student link is hs_coach_students

CREATE TABLE public.profiles (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  high_school         text,
  grad_year           integer,
  state               text,
  email               text NOT NULL,
  phone               text,
  twitter             text,
  position            text,
  height              text,
  weight              numeric,
  speed_40            numeric,
  gpa                 numeric,
  sat                 integer,
  hs_lat              numeric,
  hs_lng              numeric,
  agi                 numeric,
  dependents          integer,
  expected_starter    boolean DEFAULT false,
  captain             boolean DEFAULT false,
  all_conference      boolean DEFAULT false,
  all_state           boolean DEFAULT false,
  parent_guardian_email text,
  status              text DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);
