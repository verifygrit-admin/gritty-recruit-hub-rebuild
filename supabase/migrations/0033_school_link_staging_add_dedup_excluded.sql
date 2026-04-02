-- 0033_school_link_staging_add_dedup_excluded.sql
-- Extends the match_status CHECK constraint on school_link_staging to include
-- 'dedup_excluded', required for STEP 3 of import_staging_to_schools.py.
--
-- Decision References:
--   DEC-CFBRB-067 — CHECK constraints (not CREATE TYPE) for all enum-like columns.
--   DEC-CFBRB-069 — school_link_staging is permanent infrastructure.
--
-- Prior constraint (0028): pending | auto_confirmed | manually_confirmed | unresolved
-- Updated constraint adds:  dedup_excluded

BEGIN;
ALTER TABLE public.school_link_staging
  DROP CONSTRAINT IF EXISTS
  school_link_staging_match_status_check;
ALTER TABLE public.school_link_staging
  ADD CONSTRAINT school_link_staging_match_status_check
  CHECK (match_status IS NULL OR match_status IN (
    'pending','auto_confirmed','manually_confirmed',
    'unresolved','dedup_excluded'
  ));
COMMIT;
