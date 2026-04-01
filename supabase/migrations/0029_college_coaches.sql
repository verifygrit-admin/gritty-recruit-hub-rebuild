-- 0029_college_coaches.sql
-- Creates the college_coaches entity table.
-- Resolves F-09 (MISSING: college_coaches table).
-- Depends on: schools (unitid PK must exist).
--
-- Decision References:
--   DEC-CFBRB-064 — UUID PK for all entity/junction tables.
--   DEC-CFBRB-065 — is_head_coach boolean; data cleanup script deferred post-v1.
--   DEC-CFBRB-067 — CHECK constraints (not CREATE TYPE) for enum-like columns.
--
-- Naming: always "college_coaches" — never "coaches". Distinguishes from
-- hs_coach_students and hs_coach_schools at all layers (DB, code, scripts).
--
-- RLS: public SELECT (read-only for authenticated + anon). Service role only for writes.
-- ON DELETE RESTRICT on unitid FK — do not cascade-delete coaches if school is removed.

CREATE TABLE public.college_coaches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- School affiliation
  unitid           int         NOT NULL
    REFERENCES public.schools(unitid) ON DELETE RESTRICT,

  -- Identity
  name             text        NOT NULL,  -- Single name column per ERD after-state
  title            text,                  -- Coaching title (nullable — incomplete scrape data expected)
  email            text,                  -- Email (nullable — incomplete scrape data expected)
  photo_url        text,                  -- Headshot URL (nullable)
  twitter_handle   text,                  -- Without @ prefix (nullable)
  is_head_coach    boolean     NOT NULL DEFAULT false,  -- DEC-CFBRB-065
  profile_url      text,                  -- Source profile page URL (nullable)

  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index on unitid for FK join performance
CREATE INDEX college_coaches_unitid_idx ON public.college_coaches (unitid);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.college_coaches ENABLE ROW LEVEL SECURITY;

-- Public read — any authenticated or anon user can read coach records
CREATE POLICY "college_coaches_select_public"
  ON public.college_coaches FOR SELECT
  USING (true);

-- Service role writes only — INSERT
CREATE POLICY "college_coaches_insert_service"
  ON public.college_coaches FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role writes only — UPDATE
CREATE POLICY "college_coaches_update_service"
  ON public.college_coaches FOR UPDATE
  USING (auth.role() = 'service_role');

-- Service role writes only — DELETE
CREATE POLICY "college_coaches_delete_service"
  ON public.college_coaches FOR DELETE
  USING (auth.role() = 'service_role');
