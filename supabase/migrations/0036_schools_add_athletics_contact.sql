-- 0036: Add athletics contact columns to schools table (Session 016-C, OBJ-4)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS athletics_phone text,
  ADD COLUMN IF NOT EXISTS athletics_email text;
