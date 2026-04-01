-- 0028_school_link_staging.sql
-- Permanent staging infrastructure for unitid resolution workflow.
-- Supports F-16 (schools.unitid completeness) and F-17 (staging table missing).
--
-- Decision References:
--   DEC-CFBRB-069 — school_link_staging is permanent infrastructure, not a one-time artifact.
--   DEC-CFBRB-067 — CHECK constraints (not CREATE TYPE) for all enum-like columns.
--
-- No RLS — service role access only.
-- No FK on matched_unitid — staging allows unresolved rows by design.
-- No FK indexes — no FK columns on this table.

COMMENT ON TABLE public.school_link_staging IS
  'Permanent staging infrastructure per DEC-CFBRB-069. '
  'Source of truth for unitid resolution before production inserts into college_coaches and recruiting_events. '
  'matched_unitid carries no FK constraint — unresolved rows are valid staging state.';

CREATE TABLE public.school_link_staging (
  id               serial      PRIMARY KEY,

  -- Source identification
  source_tab       text        NOT NULL,    -- D1-FBS | D1-FCS | D2 | D3
  source_run       text        NOT NULL,    -- Import run identifier e.g. 2026-03-31
  data_type        text        NOT NULL,    -- camp_link | coach_link | future types
  row_index        int,                     -- Row position in source tab (nullable)

  -- Raw source data
  school_name_raw  text,                    -- Exact school name text from Google Sheet
  athletics_url_raw text,                   -- Exact athletics URL from Google Sheet
  camp_url         text,                    -- Camp page URL (nullable)
  coach_url        text,                    -- Coach page URL (nullable)

  -- Match resolution
  matched_unitid   int,                     -- Best-match unitid — NO FK, staging allows unresolved
  match_confidence numeric,                 -- 0.0–1.0 fuzzy match confidence score (nullable)
  match_status     text
    CHECK (match_status IS NULL OR match_status IN (
      'pending',
      'auto_confirmed',
      'manually_confirmed',
      'unresolved'
    )),
  match_method     text,                    -- name_fuzzy | domain | manual (nullable)

  -- Review tracking
  reviewed_by      text,                    -- Who confirmed the match (nullable)
  reviewed_at      timestamptz,             -- When confirmed (nullable)

  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.school_link_staging.matched_unitid IS
  'Intentionally carries no FK constraint — staging rows may be unresolved (F-16). '
  'Confirm match_status = ''auto_confirmed'' or ''manually_confirmed'' before promoting to production tables.';
