import { supabase } from '@/lib/supabase';
import type { SavedAddress } from '@/types/models';

/** Booking addresses are stored as Tunisian; the legacy data carried no country. */
export const CONTACT_ADDRESS_COUNTRY = 'Tunisia';

export interface AddressRecord {
  label: string;
  street: string;
  city: string;
  country: string;
  postal_code: string | null;
}

/**
 * The sender's places: addresses that belong to no person. A person's own
 * addresses are read through the contact (see contactService).
 */
export async function fetchSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .is('contact_id', null)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAddress(userId: string, record: AddressRecord): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .insert({ ...record, user_id: userId, contact_id: null, is_default: false });
  if (error) throw error;
}

/** Adds an address to a person. Only one of a person's addresses can be the default. */
export async function createPersonAddress(
  userId: string,
  contactId: string,
  record: AddressRecord,
  isDefault: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .insert({ ...record, user_id: userId, contact_id: contactId, is_default: isDefault });
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

/** Atomically moves the place default flag to the given address (see migrations 058, 062). */
export async function setDefaultAddress(addressId: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_address', { p_address_id: addressId });
  if (error) throw error;
}

/** Atomically moves a person's default flag to the given address (see migration 062). */
export async function setDefaultPersonAddress(addressId: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_person_address', { p_address_id: addressId });
  if (error) throw error;
}
