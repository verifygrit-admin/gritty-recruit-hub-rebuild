-- 0040_visit_request_players.sql
-- Sprint 012 Phase 3 — visit_request_players join table.
--
-- Pulls Sprint 013 D2 scope forward into Sprint 012. The Phase 2 modal's
-- player picker is fully functional with multi-select; this migration
-- gives those selections a place to persist so Sprint 013 can focus
-- on ICS generation and email send rather than schema work.
--
-- Player FK references profiles(user_id) — the canonical identity column
-- used throughout the recruit roster surface (Sprint 011 baseline).
-- The Phase 2 picker already emits user_id values; Phase 3 submit wiring
-- maps selectedPlayerIds directly to player_id without translation.
--
-- Composite primary key on (visit_request_id, player_id) prevents
-- duplicate player selections per visit. Both columns FK with
-- ON DELETE CASCADE so deleting a parent record cleans up join rows.
--
-- RLS: anon may INSERT join rows. Integrity comes from the FK on
-- visit_request_id — anon cannot reference an arbitrary visit_request
-- without first having created the parent in the same submit flow.
-- Same B1 binding rationale as DF-2 for visit_requests itself.
-- No SELECT, UPDATE, or DELETE for anon.
--
-- Authorization: Sprint 012 Phase 3 scope expansion 2026-05-01.
-- visit_request_players moves from Sprint 013 D2 to Sprint 012 Phase 3.

CREATE TABLE public.visit_request_players (
  visit_request_id uuid NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visit_request_id, player_id)
);

ALTER TABLE public.visit_request_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_request_players_insert_anon
  ON public.visit_request_players
  FOR INSERT
  TO anon
  WITH CHECK (true);
