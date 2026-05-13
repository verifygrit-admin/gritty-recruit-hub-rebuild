-- 0052_account_updates_soft_delete_and_updated_at.sql
-- Sprint 027 — Phase 2. Adds:
--   1. deleted_at timestamptz to college_coaches and recruiting_events
--      (soft-delete support for Q5-enabled DELETE EF).
--   2. updated_at timestamptz to both tables (Q6 concurrent-edit conflict
--      check — 409 coverage uniform across all 7 entities per operator
--      Phase 1 soft-note resolution).
--   3. set_updated_at() trigger function (shared, single definition).
--   4. BEFORE UPDATE triggers on both tables to maintain updated_at on
--      every row mutation.
--
-- ZERO-RISK ADD
-- -------------
-- Both tables currently have 0 rows live (Phase 0 verified). Adding columns
-- with defaults touches no rows. Triggers fire on future writes only.
--
-- WHY updated_at NOT NULL DEFAULT now()
-- -------------------------------------
-- Matches the convention used on public.profiles and public.short_list_items.
-- New rows always carry a timestamp; the trigger then maintains it on UPDATE.
-- This lets the admin-update-account EF compare updated_at_check before write
-- on every entity without per-entity NULL handling.
--
-- WHY deleted_at NULLABLE
-- -----------------------
-- Soft-delete state lives in the column itself. NULL = active, non-NULL =
-- soft-deleted with timestamp. Restoring a row is a one-column UPDATE.
-- admin-read-accounts filters WHERE deleted_at IS NULL.
--
-- TRIGGER NAMING
-- --------------
-- The set_updated_at() function is created with CREATE OR REPLACE so it can
-- be reused if other tables need the same trigger later. Trigger names are
-- per-table to keep DROP TRIGGER IF EXISTS targeted.
--
-- IDEMPOTENCY
-- -----------
-- ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION, DROP TRIGGER IF
-- EXISTS + CREATE TRIGGER make this migration safely re-runnable.
--
-- ROLLBACK (manual)
-- -----------------
--   DROP TRIGGER IF EXISTS set_updated_at_college_coaches ON public.college_coaches;
--   DROP TRIGGER IF EXISTS set_updated_at_recruiting_events ON public.recruiting_events;
--   ALTER TABLE public.college_coaches DROP COLUMN IF EXISTS updated_at, DROP COLUMN IF EXISTS deleted_at;
--   ALTER TABLE public.recruiting_events DROP COLUMN IF EXISTS updated_at, DROP COLUMN IF EXISTS deleted_at;
--   DROP FUNCTION IF EXISTS public.set_updated_at();
--
-- AUTHORIZATION
-- -------------
-- Sprint 027 Phase 2 — operator authorized 2026-05-13 (soft-note 2 resolution).

BEGIN;

-- ============================================================================
-- 1. Column adds — college_coaches
-- ============================================================================

ALTER TABLE public.college_coaches
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============================================================================
-- 2. Column adds — recruiting_events
-- ============================================================================

ALTER TABLE public.recruiting_events
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============================================================================
-- 3. Trigger function — shared
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Triggers — wire the function to both tables
-- ============================================================================

DROP TRIGGER IF EXISTS set_updated_at_college_coaches ON public.college_coaches;
CREATE TRIGGER set_updated_at_college_coaches
  BEFORE UPDATE ON public.college_coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_recruiting_events ON public.recruiting_events;
CREATE TRIGGER set_updated_at_recruiting_events
  BEFORE UPDATE ON public.recruiting_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
