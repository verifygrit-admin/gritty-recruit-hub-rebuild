-- Migration: 0022_profiles_add_avatar_url
-- Adds Supabase Storage path column for Hudl-sourced profile avatars.
-- Decision: store path only; client generates public/signed URL at render time.
-- Column name: avatar_storage_path (David recommendation)
-- Bucket: avatars  (path pattern: {user_id}/avatar.jpg)

ALTER TABLE public.profiles
  ADD COLUMN avatar_storage_path text;

COMMENT ON COLUMN public.profiles.avatar_storage_path IS
  'Supabase Storage path for the student''s avatar image (e.g. "abc123/avatar.jpg"). '
  'Written by the fetch-hudl-avatar Edge Function. NULL means no avatar has been fetched yet. '
  'Client generates a public URL via supabase.storage.from(''avatars'').getPublicUrl(path).';
