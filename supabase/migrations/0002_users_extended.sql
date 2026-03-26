-- Migration: 0002_users_extended
-- Table: public.users
-- Spec: patch-schema-auth-spec-v2.md Section 2.3
-- Changes from directive: school_id removed; account_status DEFAULT 'pending';
--   email_verified added; activated_by + activated_at added for admin audit trail
-- NO SAID anywhere (DEC-CFBRB-002)

CREATE TABLE public.users (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type       text NOT NULL CHECK (user_type IN (
                    'student_athlete',
                    'hs_coach',
                    'hs_guidance_counselor',
                    'parent',
                    'college_coach',
                    'college_admissions_officer'
                  )),
  account_status  text NOT NULL DEFAULT 'pending' CHECK (account_status IN (
                    'active',
                    'paused',
                    'pending'
                  )),
  email_verified  boolean NOT NULL DEFAULT false,
  activated_by    uuid REFERENCES auth.users(id),
  activated_at    timestamptz,
  payment_status  text DEFAULT 'free' CHECK (payment_status IN (
                    'free', 'trial', 'paid', 'expired'
                  )),
  trial_started_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login      timestamptz,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_user_id_key UNIQUE (user_id)
);
