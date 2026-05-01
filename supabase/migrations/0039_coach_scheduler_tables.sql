-- 0039_coach_scheduler_tables.sql
-- Sprint 012 Phase 1 — coach drop-in scheduler: three new tables.
--
-- Introduces the public scheduler write-path. This is the first anon-INSERT
-- surface in the schema; 0038 only granted anon SELECT on profiles and
-- short_list_items. Policy shape is column-bounded WITH CHECK per DF-2 (locked
-- 2026-05-01) — anon cannot escalate verification_state, status, or source.
--
-- Three new tables:
--   1. partner_high_schools  — school identity (FK target for visit_requests)
--      Distinct from public.schools, which holds NCAA institutions
--      (unitid integer PK, 662 rows). BC High is a high school and is not in
--      that table. Per DF-1 (locked 2026-05-01), partner_high_schools is the
--      uuid-keyed home for partner-school identity. Future schools onboard via
--      INSERT, not migration. The slug-in-config file
--      (src/data/recruits-schools.js) remains the source of truth for which
--      schools are active in the UI; this table is the source of truth for
--      school identity at the data layer.
--   2. coach_submissions     — soft profile for college coach intake
--      Semi-staging table (Decision K). Rows accumulate from multiple intake
--      paths (scheduler, registration, scraped imports) and progress through
--      verification_state independently of any single intake event. Email is
--      declared UNIQUE so the modal's upsert pattern (ON CONFLICT email) hits
--      a real unique index — Postgres 42P10 fires otherwise (DF-3, confirmed
--      live in Phase 0 probe 5b).
--   3. visit_requests        — coach-asked-to-come-by event surface
--      Distinct from recruiting_events (event_type='official_visit'), which is
--      the student-attends-a-school-event surface. Same noun, different system.
--
-- Convention conformance:
--   - UUID PKs with gen_random_uuid() (DEC-CFBRB-064)
--   - text + CHECK for closed value sets (DEC-CFBRB-067) — no CREATE TYPE
--   - timestamptz NOT NULL DEFAULT now() for created_at
--   - Anon-INSERT-only policy shape extends the 0038 anon-SELECT precedent
--     (column-bounded WITH CHECK, zero SELECT/UPDATE/DELETE for anon)
--
-- Threat model: honeypot-passing spam. FK provides referential integrity at
-- the data layer. Service role retains full access via the bypass-RLS path.
--
-- Authorization: Sprint 012 Phase 0 closed 2026-05-01 with all seven DF items
-- resolved (DF-1 through DF-7); EXECUTION_PLAN at v5.5; Sprint 012 spec D6
-- updated for the new partner_high_schools table and verification_state shape.

-- ============================================================================
-- partner_high_schools
-- ============================================================================

CREATE TABLE public.partner_high_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  meeting_location text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: BC High only for Sprint 012. Belmont Hill onboards via a later INSERT,
-- not via migration.
INSERT INTO public.partner_high_schools (slug, name, meeting_location, address)
VALUES (
  'bc-high',
  'Boston College High School',
  'BC High Football Office, 150 Morrissey Blvd., Dorchester, MA 02125',
  '150 Morrissey Blvd., Dorchester, MA 02125'
);

-- ============================================================================
-- coach_submissions
-- ============================================================================

CREATE TABLE public.coach_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  program text NOT NULL,
  source text NOT NULL DEFAULT 'scheduler'
    CHECK (source IN ('scheduler', 'registration')),
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified', 'email_verified', 'form_returned', 'auth_bound')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- visit_requests
-- ============================================================================

CREATE TABLE public.visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_submission_id uuid NOT NULL REFERENCES public.coach_submissions(id),
  school_id uuid NOT NULL REFERENCES public.partner_high_schools(id),
  requested_date date NOT NULL,
  time_window text NOT NULL
    CHECK (time_window IN ('morning', 'midday', 'afternoon', 'evening', 'flexible')),
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- RLS — anon INSERT-only on the two write tables; anon SELECT on the read table
-- ============================================================================

ALTER TABLE public.partner_high_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests       ENABLE ROW LEVEL SECURITY;

-- partner_high_schools: anon may SELECT all rows (school identity is public —
-- the modal needs it to render the school context).
CREATE POLICY partner_high_schools_select_anon
  ON public.partner_high_schools
  FOR SELECT
  TO anon
  USING (true);

-- coach_submissions: anon may INSERT only with verification_state pinned to
-- 'unverified' and source pinned to 'scheduler'. Anon cannot self-promote past
-- unverified and cannot impersonate other intake paths. No SELECT, UPDATE, or
-- DELETE policy for anon — those operations are denied silently under RLS.
CREATE POLICY coach_submissions_insert_anon
  ON public.coach_submissions
  FOR INSERT
  TO anon
  WITH CHECK (
    verification_state = 'unverified'
    AND source = 'scheduler'
  );

-- visit_requests: anon may INSERT only with status pinned to 'pending'. Anon
-- cannot self-confirm a visit. coach_submission_id integrity is enforced by
-- the FK alone — no additional WITH CHECK constraint per DF-2 (B1 binding).
CREATE POLICY visit_requests_insert_anon
  ON public.visit_requests
  FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');
