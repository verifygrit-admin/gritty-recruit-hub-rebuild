-- 0046_users_add_full_name.sql
-- Sprint 023 — Phase 2A. Adds `public.users.full_name` plus the RLS UPDATE
-- policy that lets staff (coach/counselor) edit their own display name from
-- the new /coach/profile page (StaffProfilePage), and backfills the 6 known
-- staff rows so the page renders correct names on day 1 without requiring
-- each staff member to log in and save.
--
-- Why this column exists (Decision Point #1, Option γ — operator chose
-- 2026-05-09 in spec §4)
-- ----------------------------------------------------------------------
-- The Sprint 011 c9960d1 commit ripped out a JOIN-on-profiles pattern that
-- attempted to resolve coach/counselor display names dynamically. That
-- dynamic shape is structurally broken: coaches and counselors do NOT have
-- `public.profiles` rows (seed scripts populate auth.users + public.users
-- only), `public.users` carries no name columns today, and student RLS on
-- `profiles` does not grant SELECT on staff rows. Sprint 017 D5 introduced
-- `src/data/school-staff.js` as a hardcoded display-name fallback; Sprint
-- 018 carry-forward C-9 owns the full structural refactor (DB-backed
-- staff identity table). Sprint 023 needs an editable Name field on the
-- new staff My Profile page right now, so we add `full_name` directly to
-- `public.users` as an interim source of truth. C-9 will consolidate.
--
-- Why backfill is in this migration
-- ---------------------------------
-- The new StaffProfilePage reads `public.users.full_name` first and falls
-- back to email if NULL. Without backfill, every staff user sees their
-- email in the Name field on first load until they manually save. Six
-- UPDATE statements in the same transaction as the column add eliminate
-- that bad-first-impression window.
--
-- Why the WITH CHECK clause locks four columns
-- --------------------------------------------
-- `public.users` carries privilege-relevant columns: `user_type` (account
-- role), `account_status` (active/suspended), `email_verified` (gating
-- access to certain flows), `payment_status` (gating paid features). The
-- new UPDATE policy is scoped so a malicious authenticated client cannot
-- craft an UPDATE that mutates any of those four while the policy
-- ostensibly only enables full_name edits. The WITH CHECK reads each
-- privilege column from the row's current state via a subquery and
-- requires the post-image to be IS NOT DISTINCT FROM that value — so any
-- change to those columns is rejected at the security boundary, not the
-- application layer. Admin writes still flow through service-role Edge
-- Functions, which bypass RLS entirely.
--
-- Backfill scope (6 rows, not 8)
-- ------------------------------
-- school-staff.js lists 6 staff today: 4 BC High (Paul Zukauskas, Devon
-- Balfour, Caitlin O'Connell, Kyle Swords) + 2 Belmont Hill (Frank Roche,
-- June Schmunk). The production query in spec §4 surfaced two additional
-- coach UUIDs (fa8fa926-00f0-4325-b913-5e78be2b4c4a,
-- 9169818d-744f-411f-bf11-4bc13e13d0cb) in `hs_coach_schools` that have
-- no display-name source in school-staff.js. Per spec §9 carry-forward,
-- those two rows are intentionally left NULL in this migration; Sprint
-- 024 admin pass identifies them and backfills. Until then,
-- StaffProfilePage falls back to email for those two accounts.
--
-- Rollback path (manual, not auto-shipped)
-- ----------------------------------------
--   DROP POLICY IF EXISTS users_update_own_full_name ON public.users;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS full_name;
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + DROP POLICY IF EXISTS make this
-- migration safely re-runnable. The backfill UPDATEs are also idempotent
-- — they match exactly one row each by user_id; re-running overwrites
-- with the same value.
--
-- Authorization
-- -------------
-- Sprint 023 — operator authorized 2026-05-09 (spec §4, Option γ chosen).

BEGIN;

-- ============================================================================
-- 1. Column add
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name text;

-- ============================================================================
-- 2. UPDATE RLS policy — own row only, four privilege columns locked
-- ============================================================================

DROP POLICY IF EXISTS users_update_own_full_name ON public.users;

CREATE POLICY users_update_own_full_name
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND user_type IS NOT DISTINCT FROM (SELECT user_type FROM public.users WHERE user_id = auth.uid())
    AND account_status IS NOT DISTINCT FROM (SELECT account_status FROM public.users WHERE user_id = auth.uid())
    AND email_verified IS NOT DISTINCT FROM (SELECT email_verified FROM public.users WHERE user_id = auth.uid())
    AND payment_status IS NOT DISTINCT FROM (SELECT payment_status FROM public.users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 3. Backfill — 6 known staff from src/data/school-staff.js
-- ============================================================================

-- BC High (4)
UPDATE public.users SET full_name = 'Paul Zukauskas'      WHERE user_id = '9177ba55-eb83-4bce-b4cd-01ce3078d4a3';
UPDATE public.users SET full_name = 'Devon Balfour'       WHERE user_id = '92dbdc93-18b6-4361-8925-2d0e1fbd68ad';
UPDATE public.users SET full_name = 'Caitlin O''Connell'  WHERE user_id = 'b80f1b4c-c5c3-4285-a88a-0cc39e650e02';
UPDATE public.users SET full_name = 'Kyle Swords'         WHERE user_id = 'e0c99343-e525-411a-b6a8-8691bdc31da7';

-- Belmont Hill (2)
UPDATE public.users SET full_name = 'Frank Roche'         WHERE user_id = '4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb';
UPDATE public.users SET full_name = 'June Schmunk'        WHERE user_id = '4a48c09f-5f5c-411b-9d00-8aa7213e4eef';

-- The two unknown coach UUIDs (fa8fa926-00f0-4325-b913-5e78be2b4c4a,
-- 9169818d-744f-411f-bf11-4bc13e13d0cb) are intentionally NOT updated.
-- Sprint 024 carry-forward identifies and backfills them.

COMMIT;
