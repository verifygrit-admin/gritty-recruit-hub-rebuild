-- Migration: 0014_coach_contact_jsonb
-- Table: short_list_items
-- Adds: coach_contact JSONB column
-- Context: Stores college coach recruiting contact data per shortlist entry.
--   College coaches are external entities — NOT in the users table.
--   Phase 2 normalizes this to a full coach user model.
-- Decision reference: DEC-CFBRB (coach_contact column addition, 2026-03-26)

ALTER TABLE public.short_list_items
  ADD COLUMN coach_contact jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.short_list_items.coach_contact IS
  'College coach recruiting contact — name, role, contact method. Phase 1 JSONB; Phase 2 normalizes to coach user model.';
