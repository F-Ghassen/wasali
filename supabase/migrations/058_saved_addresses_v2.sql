-- Migration 058: saved_addresses as the sender's single address book
--
-- saved_addresses was created only in schema.sql, never in a migration, so a
-- database built from migrations alone lacks it. CREATE TABLE IF NOT EXISTS
-- makes this safe on both fresh and existing databases.
--
-- Adds recipient contact fields so one row can serve as a sender's own
-- address or as a recipient entry, which lets the recipients table be
-- folded in later. recipients is NOT migrated or dropped here.
--
-- Adds a one-default-per-user guarantee and an atomic set_default_address()
-- function, so the app never has to clear and set the default in two
-- separate writes.

CREATE TABLE IF NOT EXISTS saved_addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       text NOT NULL,
  street      text NOT NULL,
  city        text NOT NULL,
  country     text NOT NULL,
  postal_code text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_addresses
  ADD COLUMN IF NOT EXISTS contact_name      text,
  ADD COLUMN IF NOT EXISTS contact_phone     text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();

-- Heal any existing duplicates before the unique index below.
-- Keeps the most recently created default per user and demotes the rest.
UPDATE saved_addresses sa
SET is_default = false
WHERE sa.is_default
  AND sa.id <> (
    SELECT x.id
    FROM saved_addresses x
    WHERE x.user_id = sa.user_id AND x.is_default
    ORDER BY x.created_at DESC, x.id DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS saved_addresses_one_default_per_user
  ON saved_addresses (user_id)
  WHERE is_default;

CREATE INDEX IF NOT EXISTS saved_addresses_user_id_idx
  ON saved_addresses (user_id);

-- updated_at maintained by the shared trigger function from migration 031.
DROP TRIGGER IF EXISTS saved_addresses_updated_at ON saved_addresses;
CREATE TRIGGER saved_addresses_updated_at
  BEFORE UPDATE ON saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Same policy as schema.sql, now with WITH CHECK so a user cannot insert or
-- move a row under another user_id.
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own addresses" ON saved_addresses;
CREATE POLICY "Users can manage own addresses" ON saved_addresses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Atomically make one of the caller's addresses the default.
-- SECURITY INVOKER, so RLS still applies to both updates.
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE saved_addresses
  SET is_default = false
  WHERE user_id = auth.uid()
    AND is_default
    AND id <> p_address_id;

  UPDATE saved_addresses
  SET is_default = true
  WHERE id = p_address_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_address(uuid) TO authenticated;
