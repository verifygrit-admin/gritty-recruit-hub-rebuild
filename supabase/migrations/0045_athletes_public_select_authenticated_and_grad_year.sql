-- 0045_athletes_public_select_authenticated_and_grad_year.sql
-- Sprint 020 — fix /athletes auth-state contamination + enforce active-class
-- graduation cutoff at the security boundary.
--
-- Problem fixed
-- -------------
-- The two `*_public_recruits` policies created in 0038 and generalized in 0043
-- were granted `TO anon` only. Postgres assigns the `anon` role exclusively to
-- unauthenticated requests; once a Supabase JWT is present the role becomes
-- `authenticated`, and the anon-scoped policies are no longer in the OR set
-- evaluated for that request. The remaining SELECT policies on `profiles` are
-- all per-row (`auth.uid() = user_id`, coach links, counselor links), so an
-- authenticated user querying the public roster received exactly one row —
-- their own profile. Symptom: /athletes BC High tab rendered 0 athletes for an
-- authenticated Belmont Hill player; /athletes Belmont Hill tab rendered only
-- the auth'd player. Logged-out behavior was correct because the anon role
-- engaged the existing policy.
--
-- Fix
-- ---
-- DROP and recreate both policies with `TO anon, authenticated`. The
-- public-roster lane now matches whether the visitor is logged in or not —
-- which is correct, because an authenticated user could already see every
-- public-recruit row by signing out, so widening the policy reveals nothing
-- new.
--
-- Also adds `grad_year >= 2026` to the profiles policy USING clause so
-- graduated athletes (class of 2025 and earlier) are filtered at the security
-- boundary, not just in the UI. This is the active-recruiting-class cutoff.
--
-- Annual amendment required
-- -------------------------
-- The `2026` cutoff is hardcoded. It must be bumped each recruiting class
-- transition (typically July, after the National Letter of Intent signing
-- window closes for the prior class). Candidate follow-up sprint to make this
-- dynamic — two reasonable shapes:
--
--   1. Add `recruiting_class_floor SMALLINT NOT NULL` to `hs_programs` and
--      join against it in the policy USING clause. Per-school control, allows
--      Belmont Hill and BC High to advance independently if needed.
--
--   2. Replace the literal with `extract(year from now())::int` (or `+ 1`
--      depending on what counts as "active"). Single source, no per-school
--      override, no annual amendment.
--
-- Pick one in a follow-up sprint; for Sprint 020 the literal is intentional
-- and called out here so the next maintainer sees it.
--
-- short_list_items predicate
-- --------------------------
-- The shortlist policy reads from `short_list_items`, which has no `grad_year`
-- column — that field lives on `profiles`. Filtering shortlist visibility by
-- grad_year is implicit: the inner subquery against `profiles` already gates
-- on `grad_year >= 2026` (because the new profiles policy does), so a
-- graduated player's profile row is unreadable, and therefore the inner
-- `SELECT user_id FROM public.profiles WHERE ...` cannot produce that user
-- when evaluated under the same role. To make this explicit and resilient
-- (the inner subquery executes with the policy enforced), we mirror the
-- predicate in the shortlist policy's WHERE clause as well — this is
-- defense-in-depth against any future refactor that bypasses the row-level
-- check on the inner SELECT.
--
-- Authorization
-- -------------
-- Sprint 020 — operator authorized 2026-05-09 after Step 1 root-cause report.

-- ============================================================================
-- profiles_select_public_recruits
-- ============================================================================

DROP POLICY IF EXISTS profiles_select_public_recruits ON public.profiles;

CREATE POLICY profiles_select_public_recruits
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    high_school IN (SELECT school_name FROM public.hs_programs)
    AND grad_year >= 2026
  );

-- ============================================================================
-- short_list_items_select_public_recruits
-- ============================================================================

DROP POLICY IF EXISTS short_list_items_select_public_recruits ON public.short_list_items;

CREATE POLICY short_list_items_select_public_recruits
  ON public.short_list_items
  FOR SELECT
  TO anon, authenticated
  USING (
    user_id IN (
      SELECT user_id
      FROM public.profiles
      WHERE high_school IN (SELECT school_name FROM public.hs_programs)
        AND grad_year >= 2026
    )
  );
