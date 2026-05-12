-- 0047_profiles_add_cmg_message_log.sql
-- Add cmg_message_log JSONB column + GIN index + append_cmg_message_log RPC.
-- Date: 2026-05-11
-- Reference: DEC-CFBRB-098 (locks: JSONB on profiles, GIN index, append RPC
-- SECURITY INVOKER, idempotent migration form).
-- Sprint 025 Phase 1.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cmg_message_log jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_cmg_message_log_gin
  ON public.profiles USING GIN (cmg_message_log);

-- Atomic append RPC. SECURITY INVOKER so the existing public.profiles RLS
-- policies enforce that a student can only append to their own row.
CREATE OR REPLACE FUNCTION public.append_cmg_message_log(
  p_user_id uuid,
  p_record  jsonb
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE public.profiles
     SET cmg_message_log = cmg_message_log || jsonb_build_array(p_record),
         updated_at = now()
   WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION public.append_cmg_message_log(uuid, jsonb) IS
  'Atomically append a JSONB record to profiles.cmg_message_log for a given user. SECURITY INVOKER; relies on existing profiles RLS. Sprint 025, DEC-CFBRB-098.';

GRANT EXECUTE ON FUNCTION public.append_cmg_message_log(uuid, jsonb) TO authenticated;

-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE — safe to re-run.
