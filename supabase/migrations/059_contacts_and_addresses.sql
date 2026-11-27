-- Migration 059: split people from places
--
-- saved_addresses (058) mixed a place with the person at that place. This
-- migration separates them:
--   addresses  — a reusable place, owned by a user (renamed from saved_addresses)
--   contacts   — a person to send to or from, with an optional address
--
-- Existing recipients rows are copied, not moved and not dropped. Each
-- recipient with an address gets an address row using the recipient's id,
-- so the link is deterministic. Recipient addresses have no country column,
-- so they are assumed to be in Tunisia. The legacy recipients table is kept
-- until the app has been verified against contacts; drop it in a later
-- migration.

-- ─── 1. Rename saved_addresses → addresses ──────────────────────────────────
-- Table, policy and function bodies follow the rename. The function is
-- recreated in step 6 because plpgsql bodies reference the table by name.

ALTER TABLE saved_addresses RENAME TO addresses;
ALTER TRIGGER saved_addresses_updated_at ON addresses RENAME TO addresses_updated_at;
ALTER INDEX saved_addresses_one_default_per_user RENAME TO addresses_one_default_per_user;
ALTER INDEX saved_addresses_user_id_idx RENAME TO addresses_user_id_idx;

-- ─── 2. Drop contact columns from addresses ─────────────────────────────────
-- Refuse to drop them if any row holds contact data, so nothing is lost silently.

DO $$
DECLARE
  with_contact int;
BEGIN
  SELECT count(*) INTO with_contact
  FROM addresses
  WHERE contact_name IS NOT NULL
     OR contact_phone IS NOT NULL
     OR whatsapp_enabled;

  IF with_contact > 0 THEN
    RAISE EXCEPTION '% addresses hold contact data; migrate them before dropping columns', with_contact;
  END IF;
END $$;

ALTER TABLE addresses
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS contact_phone,
  DROP COLUMN IF EXISTS whatsapp_enabled;

-- ─── 3. contacts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  phone            text NOT NULL,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  address_id       uuid REFERENCES addresses(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contacts_user_phone_key UNIQUE (user_id, phone)
);

CREATE INDEX IF NOT EXISTS contacts_address_id_idx ON contacts (address_id);

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 4. Copy recipients → addresses + contacts ──────────────────────────────
-- Address id = recipient id, so the link is deterministic and the insert is
-- safe to re-run (ON CONFLICT DO NOTHING).
-- Recipient addresses have no country; assumed Tunisia.

INSERT INTO addresses (id, user_id, label, street, city, postal_code, country, is_default, created_at)
SELECT r.id,
       r.user_id,
       r.name,
       COALESCE(r.address_street, ''),
       COALESCE(r.address_city, ''),
       r.address_postal_code,
       'Tunisia',
       false,
       r.created_at
FROM recipients r
WHERE r.address_street IS NOT NULL
   OR r.address_city IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO contacts (id, user_id, name, phone, whatsapp_enabled, address_id, created_at)
SELECT r.id,
       r.user_id,
       r.name,
       r.phone,
       r.whatsapp_enabled,
       CASE WHEN r.address_street IS NOT NULL OR r.address_city IS NOT NULL
            THEN r.id
       END,
       r.created_at
FROM recipients r
ON CONFLICT (id) DO NOTHING;

-- Refuse to continue if any recipient failed to copy.
DO $$
DECLARE
  not_copied int;
BEGIN
  SELECT count(*) INTO not_copied
  FROM recipients r
  WHERE NOT EXISTS (SELECT 1 FROM contacts c WHERE c.id = r.id);

  IF not_copied > 0 THEN
    RAISE EXCEPTION '% recipients were not copied to contacts', not_copied;
  END IF;
END $$;

COMMENT ON TABLE recipients IS
  'Legacy: superseded by contacts + addresses (migration 059). Drop after app verification.';

-- ─── 5. Keep the default-address guarantee on the renamed table ─────────────
-- Already present from 058 under the renamed index name; nothing to do.

-- ─── 6. Recreate set_default_address against addresses ──────────────────────

CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE addresses
  SET is_default = false
  WHERE user_id = auth.uid()
    AND is_default
    AND id <> p_address_id;

  UPDATE addresses
  SET is_default = true
  WHERE id = p_address_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_address(uuid) TO authenticated;
