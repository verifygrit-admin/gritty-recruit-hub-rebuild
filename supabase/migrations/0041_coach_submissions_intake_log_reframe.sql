-- 0041_coach_submissions_intake_log_reframe.sql
-- Sprint 012 Phase 3 — coach_submissions intake-log reframe.
--
-- The 0040 apply surfaced that supabase-js v2 .upsert() defaults
-- Prefer: return=representation, triggering 42501 RLS denial under anon
-- on coach_submissions even with WITH CHECK satisfied. Operator review
-- of the DF-5.1 ignoreDuplicates: true workaround led to a deeper
-- reframe: coach_submissions and visit_requests are append-only intake
-- records, not staging rows. Each submit creates a new row capturing
-- what was asserted at the moment. Canonical coach identity lives in
-- college_coaches; an enrichment pipeline (later sprint) reads intake
-- rows and updates canonical tables.
--
-- This migration drops the email UNIQUE constraint (DF-3 reframed),
-- drops the verification_state text column with its CHECK constraint
-- (DF-7 reframed), and adds submitter_verified boolean default false
-- as a per-row verification flag.
--
-- DF-2 cascade: the existing coach_submissions_insert_anon policy
-- references verification_state in its WITH CHECK clause. The policy
-- is dropped and recreated with the new clause referencing
-- submitter_verified.
--
-- Sequencing: drop policy → drop UNIQUE constraint → drop column →
-- add new column → recreate policy. Each step is dependency-safe in
-- this order.
--
-- Authorization: Sprint 012 Phase 3 intake-log reframe 2026-05-01.

-- Step 1: Drop the existing anon INSERT policy (depends on verification_state column)
DROP POLICY IF EXISTS coach_submissions_insert_anon ON public.coach_submissions;

-- Step 2: Drop the email UNIQUE constraint (DF-3 reframed)
ALTER TABLE public.coach_submissions
  DROP CONSTRAINT IF EXISTS coach_submissions_email_key;

-- Step 3: Drop the verification_state column with its CHECK constraint (DF-7 reframed)
ALTER TABLE public.coach_submissions
  DROP COLUMN IF EXISTS verification_state;

-- Step 4: Add the submitter_verified boolean column (DF-7 reframed)
ALTER TABLE public.coach_submissions
  ADD COLUMN submitter_verified boolean NOT NULL DEFAULT false;

-- Step 5: Recreate the anon INSERT policy with the new WITH CHECK clause
CREATE POLICY coach_submissions_insert_anon
  ON public.coach_submissions
  FOR INSERT
  TO anon
  WITH CHECK (
    submitter_verified = false
    AND source = 'scheduler'
  );
