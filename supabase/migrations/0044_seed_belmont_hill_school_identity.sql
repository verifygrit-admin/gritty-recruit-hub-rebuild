-- 0044_seed_belmont_hill_school_identity.sql
-- Sprint 017 D3 — Belmont Hill onboarding: seed school-identity rows.
--
-- Two INSERTs:
--   1. public.hs_programs              — roster identity (referenced by
--                                         hs_coach_schools, hs_counselor_schools)
--   2. public.partner_high_schools     — partner-school identity at the data
--                                         layer (referenced by visit_requests)
--
-- Mirrors the BC High duplication pattern: Belmont Hill seeds into both tables
-- (per spec DOR-2 and ERD F-21). The rename refactor consolidating these two
-- tables is deferred to a follow-on sprint per spec Section 10.
--
-- UUIDs: GENERATED, not hardcoded. Both tables default `id` via
-- `gen_random_uuid()`. Downstream D4 seeds (Phase 2) look up the Belmont Hill
-- UUIDs via school_name (hs_programs) and slug (partner_high_schools), matching
-- the BC High pattern in scripts/bulk_import_students.js (which looks up by
-- email/program_id constants resolved at runtime).
--
-- Idempotency:
--   hs_programs            — ON CONFLICT (school_name, state) DO NOTHING
--                            (matches data/seed_hs_programs.sql for BC High)
--   partner_high_schools   — ON CONFLICT (slug) DO NOTHING (slug is the table's
--                            UNIQUE constraint per 0039)
--
-- BC High pattern reference:
--   hs_programs:           data/seed_hs_programs.sql (one INSERT, ON CONFLICT
--                          (school_name, state) DO NOTHING, all 8 non-id
--                          non-default columns populated).
--   partner_high_schools:  0039_coach_scheduler_tables.sql lines 59-65 (one
--                          INSERT inside the table-creation migration, no
--                          ON CONFLICT — table was empty at the time).
--
-- Belmont Hill identity (operator-supplied 2026-05-07):
--   School name : Belmont Hill School
--   Address     : 350 Prospect Street
--   City        : Belmont
--   State       : MA
--   Zip         : 02478
--   Lat / Lon   : 42.4069, -71.1842 (per-profile use in D4; not stored on
--                 hs_programs — the table has no lat/lon columns)
--
-- Note on partner_high_schools.meeting_location: BC High populates this with a
-- football-office address used by Sprint 013's ICS LOCATION derivation. Belmont
-- Hill is not yet active for the coach scheduler, so meeting_location is left
-- NULL here. Populate when Belmont Hill activates coach scheduler in a future
-- sprint.
--
-- Authorization: Sprint 017 Phase 1, audit closed 2026-05-07 with operator
-- decisions logged.

-- ============================================================================
-- hs_programs — Belmont Hill roster identity.
-- ============================================================================

INSERT INTO public.hs_programs (
  school_name,
  city,
  state,
  zip,
  address,
  conference,
  division,
  state_athletic_association
)
VALUES (
  'Belmont Hill School',
  'Belmont',
  'MA',
  '02478',
  '350 Prospect Street',
  NULL,  -- conference: operator did not supply; leave NULL until confirmed
  NULL,  -- division: same
  'MIAA' -- state_athletic_association: same Massachusetts state body as BC High
)
ON CONFLICT (school_name, state) DO NOTHING;

-- ============================================================================
-- partner_high_schools — Belmont Hill partner-school identity at data layer.
-- ============================================================================

INSERT INTO public.partner_high_schools (
  slug,
  name,
  meeting_location,
  address,
  timezone
)
VALUES (
  'belmont-hill',
  'Belmont Hill School',
  NULL,  -- meeting_location: not yet active for coach scheduler; populate later
  '350 Prospect Street, Belmont, MA 02478',
  'America/New_York'
)
ON CONFLICT (slug) DO NOTHING;
