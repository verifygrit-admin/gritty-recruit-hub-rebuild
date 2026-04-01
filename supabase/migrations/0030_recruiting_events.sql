-- 0030_recruiting_events.sql
-- Creates the recruiting_events entity table.
-- Resolves F-10 (MISSING: recruiting_events table).
-- Depends on: schools (unitid PK must exist).
--
-- Decision References:
--   DEC-CFBRB-064 — UUID PK for all entity/junction tables.
--   DEC-CFBRB-067 — CHECK constraints (not CREATE TYPE) for enum-like columns.
--
-- RLS: public SELECT (read-only for authenticated + anon). Service role only for writes.
-- ON DELETE RESTRICT on unitid FK — do not cascade-delete events if school is removed.
-- UNIQUE constraint on (unitid, event_type, event_date) for event deduplication.

CREATE TABLE public.recruiting_events (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- School affiliation
  unitid                int           NOT NULL
    REFERENCES public.schools(unitid) ON DELETE RESTRICT,

  -- Event classification
  event_type            text
    CHECK (event_type IS NULL OR event_type IN (
      'camp',
      'junior_day',
      'official_visit',
      'unofficial_visit'
    )),
  event_name            text,          -- Human-readable event name (nullable)

  -- Scheduling
  event_date            date          NOT NULL,
  end_date              date,          -- Multi-day event end date (nullable) -- end_date and description authorized per DEC-CFBRB-078
  registration_deadline date,          -- Registration cutoff (nullable)

  -- Logistics
  location              text,          -- Venue / address (nullable)
  cost_dollars          numeric(8,2),  -- Explicit precision per Patch advisory (nullable)
  registration_url      text,          -- Registration link (nullable)

  -- Status
  status                text
    CHECK (status IS NULL OR status IN (
      'confirmed',
      'registration_open',
      'completed',
      'cancelled'
    )),

  description           text,          -- Free-form event description (nullable) -- end_date and description authorized per DEC-CFBRB-078
  created_at            timestamptz   NOT NULL DEFAULT now(),

  -- Deduplication constraint — one event per school/type/date combination
  CONSTRAINT recruiting_events_unitid_event_type_event_date_unique
    UNIQUE (unitid, event_type, event_date)
);

-- Index on unitid for FK join performance
CREATE INDEX recruiting_events_unitid_idx ON public.recruiting_events (unitid);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.recruiting_events ENABLE ROW LEVEL SECURITY;

-- Public read — any authenticated or anon user can read events
CREATE POLICY "recruiting_events_select_public"
  ON public.recruiting_events FOR SELECT
  USING (true);

-- Service role writes only — INSERT
CREATE POLICY "recruiting_events_insert_service"
  ON public.recruiting_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role writes only — UPDATE
CREATE POLICY "recruiting_events_update_service"
  ON public.recruiting_events FOR UPDATE
  USING (auth.role() = 'service_role');

-- Service role writes only — DELETE
CREATE POLICY "recruiting_events_delete_service"
  ON public.recruiting_events FOR DELETE
  USING (auth.role() = 'service_role');
