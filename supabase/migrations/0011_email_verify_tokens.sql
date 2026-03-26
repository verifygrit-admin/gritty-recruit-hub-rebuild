-- Migration: 0011_email_verify_tokens
-- Table: email_verify_tokens
-- Spec: patch-schema-auth-spec-v2.md Section 2.13 (OQ-1 resolution)
-- Dedicated table for email verification tokens — avoids stuffing tokens into user_metadata
-- used_at: NULL until consumed; set on successful verify (preserves audit trail, row is not deleted)
-- A user can have multiple rows (resend creates a new row; old rows expire naturally)
-- Edge Function verify-email query: token = $1 AND expires_at > now() AND used_at IS NULL
-- Expiry: 24 hours from creation (set by Edge Function at insert time)
-- RC-2: service role only on all operations — Edge Function must use service role key, not anon key

CREATE TABLE public.email_verify_tokens (
  id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_verify_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_verify_tokens_token_key UNIQUE (token)
);
