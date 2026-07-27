-- Migration 055: Create the package-photos storage bucket + RLS policies.
--
-- utils/imageUpload.ts's uploadImage() helper always existed but was never
-- called from the booking-creation flow, and the bucket itself was never
-- created (commented out in schema.sql: "run in Supabase dashboard or CLI").
-- PackageStep.tsx stored raw local `file://` device URIs directly into
-- `package_photos`, which are meaningless off the sender's own device — the
-- driver could never actually view them. This migration creates the bucket
-- so the upload wired up in PackageStep.tsx (this change) has somewhere to
-- land; public (like `avatars`) so the resulting URL is a stable, permanent
-- public URL rather than a 1-hour signed URL that would go stale before a
-- driver views it days later.

INSERT INTO storage.buckets (id, name, public)
VALUES ('package-photos', 'package-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Uploads are scoped to a folder named after the uploader's own user id
-- (path shape: `{userId}/{filename}`), so a user can only write into their
-- own folder.
CREATE POLICY "Users can upload their own package photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'package-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own package photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'package-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own package photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'package-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public bucket: reads via the public CDN URL bypass RLS entirely (same as
-- `avatars`), but an explicit SELECT policy is still needed for authenticated
-- API-level listing/access (e.g. to overwrite/replace via `upsert: true`).
CREATE POLICY "Anyone can view package photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'package-photos');
