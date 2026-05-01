-- 0038_add_public_recruits_select.sql
-- Sprint 011 — public read access for the /recruits roster.
--
-- Grants SELECT to the anon role on profiles + short_list_items, scoped tightly
-- to the active partner-school list in src/data/recruits-schools.js. Today the
-- seed has only BC High active; Belmont Hill stays excluded (active: false).
-- Future schools require a follow-up migration — the policy is the source of
-- truth for what is queryable, the seed is the source of truth for what is
-- rendered.
--
-- Column boundary is enforced by the hook's SELECT clause (the PII whitelist).
-- This migration adds row-level access only — anon could in principle ask for
-- excluded columns, so the hook must continue to name only whitelisted fields.
--
-- Existing RLS policies are untouched. This file only adds two new policies.
--
-- Authorization: Sprint 011 Phase 2 open, Path A locked by operator on
-- 2026-04-30 after RLS blocker surfaced during data-layer pre-flight.

-- Profiles: anon may SELECT only rows where high_school is in the active set.
CREATE POLICY profiles_select_public_recruits
  ON public.profiles
  FOR SELECT
  TO anon
  USING (high_school = 'Boston College High School');

-- Shortlist items: anon may SELECT only rows whose user_id corresponds to a
-- profile in the active partner-school set. Subquery uses the same school
-- string so the policy is self-contained and easy to amend per sprint.
CREATE POLICY short_list_items_select_public_recruits
  ON public.short_list_items
  FOR SELECT
  TO anon
  USING (
    user_id IN (
      SELECT user_id
      FROM public.profiles
      WHERE high_school = 'Boston College High School'
    )
  );
