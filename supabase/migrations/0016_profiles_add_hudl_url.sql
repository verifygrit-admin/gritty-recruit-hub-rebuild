-- Migration: 0016_profiles_add_hudl_url
-- Table: profiles
-- Adds optional hudl_url field for recruit video profile links

ALTER TABLE public.profiles
  ADD COLUMN hudl_url text;
