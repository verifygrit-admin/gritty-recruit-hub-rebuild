-- 0031_student_recruiting_events.sql
-- Creates the student_recruiting_events junction table.
-- Resolves F-11 (MISSING: student_recruiting_events table).
-- Depends on: profiles (id PK), recruiting_events (id PK) — 0030 must run first.
--
-- Decision References:
--   DEC-CFBRB-062 — UNIQUE(profile_id, event_id) to prevent duplicate registrations.
--   DEC-CFBRB-064 — UUID PK for all entity/junction tables.
--   DEC-CFBRB-067 — CHECK constraints (not CREATE TYPE) for enum-like columns.
--
-- RLS:
--   Students read/write their own rows via profiles.user_id = auth.uid().
--   HS coaches read linked student rows via hs_coach_students chain.
--   HS counselors read linked student rows via hs_counselor_students chain.
--   No public read — event registrations are private to the student.

CREATE TABLE public.student_recruiting_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student reference (through profiles, not directly through auth.users)
  profile_id    uuid        NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Event reference
  event_id      uuid        NOT NULL
    REFERENCES public.recruiting_events(id) ON DELETE RESTRICT,

  -- Status tracking
  status        text
    CHECK (status IS NULL OR status IN (
      'recommended_by_coach',
      'registered',
      'on_calendar',
      'attended'
    )),

  -- Google Calendar sync
  gcal_event_id text,         -- Calendar event ID for Google Calendar integration (nullable)

  -- Confirmation tracking
  confirmed_by  text
    CHECK (confirmed_by IS NULL OR confirmed_by IN (
      'student',
      'parent',
      'hs_coach'
    )),
  confirmed_at  timestamptz,  -- When the registration was confirmed (nullable)

  notes         text,          -- Free-form notes (nullable)
  created_at    timestamptz   NOT NULL DEFAULT now(),

  -- One registration per student per event
  CONSTRAINT student_recruiting_events_profile_event_unique
    UNIQUE (profile_id, event_id)
);

-- Index on profile_id for student-scoped queries
CREATE INDEX student_recruiting_events_profile_id_idx
  ON public.student_recruiting_events (profile_id);

-- Index on event_id for event-scoped queries
CREATE INDEX student_recruiting_events_event_id_idx
  ON public.student_recruiting_events (event_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.student_recruiting_events ENABLE ROW LEVEL SECURITY;

-- Students read their own rows
CREATE POLICY "student_recruiting_events_select_student"
  ON public.student_recruiting_events FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- Students write their own rows
CREATE POLICY "student_recruiting_events_insert_student"
  ON public.student_recruiting_events FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "student_recruiting_events_update_student"
  ON public.student_recruiting_events FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "student_recruiting_events_delete_student"
  ON public.student_recruiting_events FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- HS coaches read rows for their linked students via hs_coach_students chain
CREATE POLICY "student_recruiting_events_select_hs_coach"
  ON public.student_recruiting_events FOR SELECT
  USING (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_coach(auth.uid())
      )
    )
  );

-- HS counselors read rows for their linked students via hs_counselor_students chain
CREATE POLICY "student_recruiting_events_select_hs_counselor"
  ON public.student_recruiting_events FOR SELECT
  USING (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_counselor(auth.uid())
      )
    )
  );
