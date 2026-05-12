-- 0049_profiles_add_bulk_pds_measurables.sql
-- Sprint 026 — Add five new numeric measurables + a Bulk PDS approval timestamp
-- to public.profiles.
--
-- Paired with 0048 (bulk_pds_submissions staging table). When an admin approves
-- a staging row, the corresponding profiles row gets the new measurable values
-- AND last_bulk_pds_approved_at is set to the approval timestamp.
--
-- Nullable. No default. Populated only by admin-approved write paths.
--
-- Note 1 (spec lock): these fields are NOT exposed in the Student View
-- /profile page in Sprint 026. They are write-only via the admin approval EF.
--
-- Decision references:
--   Q6 — last_bulk_pds_approved_at is distinct from updated_at, confirmed locked.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS time_5_10_5                 numeric,
  ADD COLUMN IF NOT EXISTS time_l_drill                numeric,
  ADD COLUMN IF NOT EXISTS bench_press                 numeric,
  ADD COLUMN IF NOT EXISTS squat                       numeric,
  ADD COLUMN IF NOT EXISTS clean                       numeric,
  ADD COLUMN IF NOT EXISTS last_bulk_pds_approved_at   timestamptz;

COMMENT ON COLUMN public.profiles.time_5_10_5               IS 'Pro Agility (5-10-5) drill time in seconds. Bulk PDS field (Sprint 026). Populated via admin approval of bulk_pds_submissions row.';
COMMENT ON COLUMN public.profiles.time_l_drill              IS 'L-Drill time in seconds. Bulk PDS field (Sprint 026). Populated via admin approval of bulk_pds_submissions row.';
COMMENT ON COLUMN public.profiles.bench_press               IS 'Bench press max in pounds. Bulk PDS field (Sprint 026). Populated via admin approval of bulk_pds_submissions row.';
COMMENT ON COLUMN public.profiles.squat                     IS 'Squat max in pounds. Bulk PDS field (Sprint 026). Populated via admin approval of bulk_pds_submissions row.';
COMMENT ON COLUMN public.profiles.clean                     IS 'Clean max in pounds. Bulk PDS field (Sprint 026). Populated via admin approval of bulk_pds_submissions row.';
COMMENT ON COLUMN public.profiles.last_bulk_pds_approved_at IS 'Timestamp of the most recent admin-approved Bulk PDS write to this profile. NULL if never updated via Bulk PDS. Distinct from updated_at (Q6 lock).';
