-- =============================================================================
-- 0042_visit_request_deliveries.sql
-- Sprint 013 D7 — Per-Recipient Delivery Tracking + Phase 1 prep
--
-- Introduces visit_request_deliveries: per-recipient delivery row written by
-- the Sprint 013 dispatch function (Vercel Node, api/coach-scheduler-dispatch.ts).
-- Service role only — no anon policies. Sprint 014 Coach Dashboard reads
-- this table filtered by visit_request_id.
--
-- Ride-along: ALTER TABLE partner_high_schools ADD COLUMN timezone (OQ8 prep).
-- timezone is required by D5's DTSTART/DTEND derivation. BC High inherits
-- America/New_York via DEFAULT.
--
-- ERD update: docs/specs/erd/erd-current-state.md is updated in this same
-- commit per Architectural Carry-Forward #8 (ERD update discipline).
--
-- Authorization: Sprint 013 spec D7 + Phase 1 carry-forward locks (2026-05-02).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- visit_request_deliveries
-- -----------------------------------------------------------------------------

CREATE TABLE public.visit_request_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_request_id uuid NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_role text NOT NULL CHECK (recipient_role IN ('college_coach', 'head_coach', 'player')),
  recipient_name text,
  send_status text NOT NULL CHECK (send_status IN ('sent', 'failed', 'bounced', 'pending')),
  provider_message_id text,
  error_code text,
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX visit_request_deliveries_visit_request_id_idx
  ON public.visit_request_deliveries(visit_request_id);

ALTER TABLE public.visit_request_deliveries ENABLE ROW LEVEL SECURITY;

-- No anon policies. Service role bypasses RLS for INSERT/UPDATE from the
-- dispatch function. Sprint 014 will introduce authenticated SELECT for
-- head coaches reading their school's deliveries.

-- -----------------------------------------------------------------------------
-- partner_high_schools.timezone (OQ8 prep)
-- -----------------------------------------------------------------------------

ALTER TABLE public.partner_high_schools
  ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';
