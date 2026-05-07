-- 0043_generalize_partner_school_select_predicate.sql
-- Sprint 017 D2 — Belmont Hill onboarding: generalize the anon SELECT predicate
-- on profiles + short_list_items so partner-school onboarding becomes a data
-- action (INSERT into hs_programs) rather than a code change.
--
-- Replaces the hardcoded `'Boston College High School'` predicate introduced in
-- 0038_add_public_recruits_select.sql with a join against hs_programs. Any row
-- whose `high_school` matches an `hs_programs.school_name` is anon-readable.
--
-- Policies touched:
--   profiles_select_public_recruits           — DROP + recreate
--   short_list_items_select_public_recruits   — DROP + recreate
--
-- BC High visibility: preserved by definition. The BC High row already exists
-- in hs_programs (`Boston College High School`, MA), so every BC High profile
-- whose `high_school` matches will continue to satisfy the predicate. No data
-- migration needed.
--
-- Belmont Hill visibility: granted automatically once 0044 inserts the Belmont
-- Hill row into hs_programs. The seed in 0044 is the activator.
--
-- Predicate shape: Option A from the Phase 0 audit. Joins on the small
-- hs_programs reference table (1 row pre-0044, 2 rows post-0044). Per Sprint
-- 011's PII-render-boundary precedent, joins on small reference tables are
-- RLS-safe.
--
-- Authorization: Sprint 017 Phase 1, audit closed 2026-05-07 with operator
-- decisions logged.

-- ============================================================================
-- profiles_select_public_recruits — generalize from BC High string match to
-- hs_programs.school_name join.
-- ============================================================================

DROP POLICY IF EXISTS profiles_select_public_recruits ON public.profiles;

CREATE POLICY profiles_select_public_recruits
  ON public.profiles
  FOR SELECT
  TO anon
  USING (
    high_school IN (SELECT school_name FROM public.hs_programs)
  );

-- ============================================================================
-- short_list_items_select_public_recruits — parallel generalization. Anon may
-- SELECT shortlist rows whose user_id corresponds to a profile in any active
-- partner-school's roster.
-- ============================================================================

DROP POLICY IF EXISTS short_list_items_select_public_recruits ON public.short_list_items;

CREATE POLICY short_list_items_select_public_recruits
  ON public.short_list_items
  FOR SELECT
  TO anon
  USING (
    user_id IN (
      SELECT user_id
      FROM public.profiles
      WHERE high_school IN (SELECT school_name FROM public.hs_programs)
    )
  );

-- ============================================================================
-- Sanity check (commented — operator runs as a separate verification step).
-- For the BC-High-only pre-state, this should return the current count of BC
-- High recruits whose `high_school` matches the seeded hs_programs row.
-- Post-0044, it should additionally include Belmont Hill recruits (zero in
-- this migration's window; D4 lands them in Phase 2).
-- ============================================================================

-- SELECT count(*)
-- FROM public.profiles p
-- WHERE EXISTS (
--   SELECT 1 FROM public.hs_programs hp
--   WHERE hp.school_name = p.high_school
-- );
