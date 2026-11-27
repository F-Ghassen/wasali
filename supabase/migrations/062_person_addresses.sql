-- Migration 062: a person can have several addresses
--
-- Before: contacts.address_id linked each person to at most one address row.
-- After:  addresses.contact_id links an address to its person (one-to-many).
--         Places keep contact_id NULL. One default per person and one default
--         place per user are enforced by partial unique indexes.
--
-- Existing links are copied, not dropped. The column is only removed once the
-- copy has been checked, so no address is lost.

-- ─── 1. Owner column on addresses ───────────────────────────────────────────

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS addresses_contact_id_idx ON addresses (contact_id);

-- ─── 2. Copy the existing person → address links ────────────────────────────

UPDATE addresses a
SET contact_id = c.id
FROM contacts c
WHERE c.address_id = a.id
  AND a.contact_id IS NULL;

DO $$
DECLARE
  unlinked int;
BEGIN
  SELECT count(*) INTO unlinked
  FROM contacts c
  WHERE c.address_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM addresses a WHERE a.id = c.address_id AND a.contact_id = c.id);

  IF unlinked > 0 THEN
    RAISE EXCEPTION '% contact addresses were not copied', unlinked;
  END IF;
END $$;

-- ─── 3. Defaults: one per user for places, one per person for their addresses

DROP INDEX IF EXISTS addresses_one_default_per_user;
CREATE UNIQUE INDEX addresses_one_default_per_user
  ON addresses (user_id)
  WHERE is_default AND contact_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_person
  ON addresses (contact_id)
  WHERE is_default AND contact_id IS NOT NULL;

-- ─── 4. Drop the old one-to-one link ────────────────────────────────────────

DROP INDEX IF EXISTS contacts_address_id_idx;
ALTER TABLE contacts DROP COLUMN IF EXISTS address_id;

-- ─── 5. Default address for a person ────────────────────────────────────────
-- Same shape as set_default_address, scoped to the person that owns the address.

CREATE OR REPLACE FUNCTION public.set_default_person_address(p_address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT contact_id INTO owner
  FROM addresses
  WHERE id = p_address_id
    AND user_id = auth.uid()
    AND contact_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE addresses
  SET is_default = false
  WHERE contact_id = owner
    AND is_default
    AND id <> p_address_id;

  UPDATE addresses
  SET is_default = true
  WHERE id = p_address_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_person_address(uuid) TO authenticated;

-- ─── 6. Place default stays place-only ──────────────────────────────────────
-- set_default_address (059) clears every default the user has. Scope it to
-- places, so choosing a place default never clears a person's default.

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
    AND contact_id IS NULL
    AND is_default
    AND id <> p_address_id;

  UPDATE addresses
  SET is_default = true
  WHERE id = p_address_id
    AND user_id = auth.uid()
    AND contact_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Address not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_address(uuid) TO authenticated;
