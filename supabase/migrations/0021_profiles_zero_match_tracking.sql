-- Migration: 0021_profiles_zero_match_tracking
-- Adds zero-match scoring result tracking to profiles table.
-- Decision: Q1 confirmed 2026-03-29 — Option A (columns on profiles, no separate table)
-- Written on every scoring run (Q2 confirmed 2026-03-29 — write on every run, not just zero-match)

ALTER TABLE public.profiles
  ADD COLUMN last_grit_fit_run_at     timestamptz,
  ADD COLUMN last_grit_fit_zero_match boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.last_grit_fit_run_at IS
  'Timestamp of the most recent GRIT FIT scoring run for this student. Written on every run.';

COMMENT ON COLUMN public.profiles.last_grit_fit_zero_match IS
  'True if the most recent GRIT FIT scoring run produced zero matches. Written on every run. Reset to false when a run produces one or more matches.';
