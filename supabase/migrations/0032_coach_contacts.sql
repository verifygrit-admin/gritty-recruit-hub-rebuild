-- 0032_coach_contacts.sql
-- Creates the coach_contacts triple-junction table.
-- Resolves F-15 (MISSING: coach_contacts table).
-- Depends on: profiles (id PK), schools (unitid PK), college_coaches (id PK) — 0029 must run first.
--
-- Decision References:
--   DEC-CFBRB-064 — UUID PK for all entity/junction tables.
--   DEC-CFBRB-066 — coach_contacts replaces JSONB short_list_items.coach_contact for new writes.
--                   No new data may be written to the JSONB field. No automatic migration of legacy data.
--   DEC-CFBRB-067 — CHECK constraints (not CREATE TYPE) for enum-like columns.
--   DEC-CFBRB-074 — Cross-school integrity gap (unitid vs coach_id) enforced at application layer.
--                   The DB does not enforce that coach_id.unitid == unitid on this row.
--
-- RLS:
--   Students read/write their own rows.
--   HS coaches read/write rows for their linked students via hs_coach_students chain.
--   HS counselors read/write rows for their linked students via hs_counselor_students chain.
--   College coaches are EXPLICITLY DENIED all access — integrity rule, no exceptions.
--     (See section 4 of coach-contacts-table-spec.md)
--   Service role has full access for bulk imports.

CREATE TABLE public.coach_contacts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student reference (through profiles)
  profile_id      uuid        NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- College program reference
  unitid          int         NOT NULL
    REFERENCES public.schools(unitid) ON DELETE RESTRICT,

  -- Specific coach (nullable — contact may be with program inbox, not a named coach)
  coach_id        uuid
    REFERENCES public.college_coaches(id) ON DELETE SET NULL,

  -- Contact record
  contact_date    date        NOT NULL,

  contact_type    text
    CHECK (contact_type IS NULL OR contact_type IN (
      'email',
      'call',
      'text',
      'in_person',
      'dm',
      'camp'
    )),

  initiated_by    text
    CHECK (initiated_by IS NULL OR initiated_by IN (
      'student',
      'parent',
      'hs_coach',
      'college_coach'
    )),

  -- Shortlist pipeline position (nullable — contact may predate shortlist entry)
  short_list_step int
    CHECK (short_list_step IS NULL OR (short_list_step >= 1 AND short_list_step <= 15)),

  notes           text,        -- Free-form notes (nullable)
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coach_contacts IS
  'Cross-school integrity gap (unitid vs coach_id) enforced at application layer per DEC-CFBRB-074. '
  'The DB does not verify that coach_id.unitid matches the row unitid. '
  'College coaches are denied all write access — contact records are student/HS staff initiated only.';

-- Index on profile_id for student-scoped queries
CREATE INDEX coach_contacts_profile_id_idx ON public.coach_contacts (profile_id);

-- Index on unitid for school-scoped queries
CREATE INDEX coach_contacts_unitid_idx ON public.coach_contacts (unitid);

-- Index on coach_id for coach-scoped queries (nullable FK)
CREATE INDEX coach_contacts_coach_id_idx ON public.coach_contacts (coach_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.coach_contacts ENABLE ROW LEVEL SECURITY;

-- Students read their own rows
CREATE POLICY "coach_contacts_select_student"
  ON public.coach_contacts FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- Students write their own rows
CREATE POLICY "coach_contacts_insert_student"
  ON public.coach_contacts FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "coach_contacts_update_student"
  ON public.coach_contacts FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "coach_contacts_delete_student"
  ON public.coach_contacts FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- HS coaches read/write rows for their linked students via hs_coach_students chain
-- Uses SECURITY DEFINER helper from 0027 to avoid RLS recursion.
CREATE POLICY "coach_contacts_select_hs_coach"
  ON public.coach_contacts FOR SELECT
  USING (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_coach(auth.uid())
      )
    )
  );

CREATE POLICY "coach_contacts_insert_hs_coach"
  ON public.coach_contacts FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_coach(auth.uid())
      )
    )
  );

CREATE POLICY "coach_contacts_update_hs_coach"
  ON public.coach_contacts FOR UPDATE
  USING (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_coach(auth.uid())
      )
    )
  );

-- HS counselors read/write rows for their linked students via hs_counselor_students chain
-- Uses SECURITY DEFINER helper from 0027 to avoid RLS recursion.
CREATE POLICY "coach_contacts_select_hs_counselor"
  ON public.coach_contacts FOR SELECT
  USING (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_counselor(auth.uid())
      )
    )
  );

CREATE POLICY "coach_contacts_insert_hs_counselor"
  ON public.coach_contacts FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_counselor(auth.uid())
      )
    )
  );

CREATE POLICY "coach_contacts_update_hs_counselor"
  ON public.coach_contacts FOR UPDATE
  USING (
    profile_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT public.get_student_ids_for_counselor(auth.uid())
      )
    )
  );

-- COLLEGE COACHES: explicitly denied all access.
-- No SELECT, INSERT, UPDATE, or DELETE policy is created for college coaches.
-- This is intentional per coach-contacts-table-spec.md section 4 and DEC-CFBRB-066.
-- Contact records are student-initiated or HS coaching staff initiated only.
-- College coach role users will receive no rows from RLS — not an error, a design decision.
