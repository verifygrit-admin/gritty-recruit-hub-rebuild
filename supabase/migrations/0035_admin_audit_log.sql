-- 0035_admin_audit_log.sql
-- Creates the admin_audit_log table for Section C audit trail.
-- Resolves the audit INSERT TODO in EF2 (admin-update-school) and the
-- table query TODO in EF3 (admin-read-audit-log).
--
-- Decision References:
--   DEC-CFBRB-064 — UUID PK for all entity/junction tables.
--   Three-way session (Patch + David + Morty), 2026-04-10 — schema finalized.
--   Chris direct instruction, 2026-04-10 — direct INSERT path (no trigger).
--

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  admin_email   text          NOT NULL,
  action        text          NOT NULL,
  table_name    text          NOT NULL,
  row_id        text          NOT NULL,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX idx_admin_audit_log_created_at  ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_admin_email ON public.admin_audit_log (admin_email);
CREATE INDEX idx_admin_audit_log_table_name  ON public.admin_audit_log (table_name);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin read policy — mirrors Section C admin claim contract
-- (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
CREATE POLICY "admin_audit_log_admin_select"
  ON public.admin_audit_log FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No INSERT/UPDATE/DELETE browser-side policies needed.
-- All writes and reads via Edge Functions use service_role, which bypasses RLS.
