-- Migration: 0023_storage_avatars_bucket
-- Creates the avatars Storage bucket and sets RLS policies.
--
-- Bucket design:
--   - Public read (coaches and the Layout header need URLs without signing)
--   - Authenticated write to own folder only ({user_id}/*)
--   - Service role can write anywhere (Edge Function uses service role)
--
-- Path convention: {user_id}/avatar.{ext}
-- Client URL generation: supabase.storage.from('avatars').getPublicUrl(path)

-- Create the avatars bucket (public = true allows unauthenticated GET)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: anyone can read avatars (public bucket, but explicit policy for clarity)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Policy: authenticated users can upload/update only their own folder
CREATE POLICY "avatars_owner_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: DELETE is intentionally not granted to authenticated users.
-- The Edge Function uses service_role which bypasses RLS, so it can
-- overwrite (upsert) without needing a separate delete policy.
