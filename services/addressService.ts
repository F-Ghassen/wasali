import { supabase } from '@/lib/supabase';
import type { ContactAddressRow } from '@/types/contacts';
import type { SavedAddress } from '@/types/models';
import { withoutContactLinks } from '@/utils/contacts';

/** Recipient addresses are stored as Tunisian; the legacy data carried no country. */
export const CONTACT_ADDRESS_COUNTRY = 'Tunisia';

export interface AddressRecord {
  label: string;
  street: string;
  city: string;
  country: string;
  postal_code: string | null;
}

/**
 * The sender's address book. Addresses that belong to a contact (recipient
 * addresses) are excluded, since they are managed through the contact.
 */
export async function fetchSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*, contacts(id)')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return withoutContactLinks(data ?? []) as SavedAddress[];
}

export async function createAddress(userId: string, record: AddressRecord): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .insert({ ...record, user_id: userId, is_default: false });
  if (error) throw error;
}

export async function updateAddress(addressId: string, record: AddressRecord): Promise<void> {
  const { error } = await supabase.from('addresses').update(record).eq('id', addressId);
  if (error) throw error;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', addressId);
  if (error) throw error;
}

/** Atomically moves the default flag to the given address (see migration 058). */
export async function setDefaultAddress(addressId: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_address', { p_address_id: addressId });
  if (error) throw error;
}

/**
 * Writes the address behind a contact. Updates the existing row when the
 * contact already has one, otherwise inserts. Returns the row id.
 */
export async function upsertContactAddress(
  userId: string,
  label: string,
  address: ContactAddressRow,
  existingAddressId: string | null,
): Promise<string> {
  const record = {
    label,
    street: address.street,
    city: address.city,
    country: CONTACT_ADDRESS_COUNTRY,
    postal_code: address.postal_code,
  };

  if (existingAddressId) {
    const { error } = await supabase.from('addresses').update(record).eq('id', existingAddressId);
    if (error) throw error;
    return existingAddressId;
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({ ...record, user_id: userId, is_default: false })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
