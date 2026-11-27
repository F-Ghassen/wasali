import { supabase } from '@/lib/supabase';
import { deleteAddress, upsertContactAddress } from '@/services/addressService';
import type { ContactInput, ContactRow } from '@/types/contacts';
import { joinPhone, normalizePhoneNumber } from '@/utils/phone';

export type { ContactInput, ContactRow } from '@/types/contacts';

const CONTACT_LIMIT = 20;

export async function fetchContacts(userId: string): Promise<ContactRow[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, phone, phone_country_code, phone_number, whatsapp_enabled, address:addresses(street, city, postal_code)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(CONTACT_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as ContactRow[];
}

/**
 * Upserts a contact by (user_id, phone), used when a booking saves a recipient.
 */
export async function saveContact(userId: string, input: ContactInput): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('contacts')
    .select('id, address_id')
    .eq('user_id', userId)
    .eq('phone', joinPhone(input.phoneCountryCode, input.phoneNumber))
    .maybeSingle();
  if (lookupError) throw lookupError;

  await writeContact(userId, existing?.id ?? null, existing?.address_id ?? null, input);
}

/** Edits a contact by id. Changing it to a phone another contact already uses fails on the unique key. */
export async function updateContact(userId: string, contactId: string, input: ContactInput): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('contacts')
    .select('address_id')
    .eq('id', contactId)
    .single();
  if (lookupError) throw lookupError;

  await writeContact(userId, contactId, existing.address_id, input);
}

/** Deletes a contact and the address that only it used. */
export async function deleteContact(contactId: string): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('contacts')
    .select('address_id')
    .eq('id', contactId)
    .single();
  if (lookupError) throw lookupError;

  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) throw error;

  if (existing.address_id) await deleteAddress(existing.address_id);
}

/**
 * Writes the contact and its address. The contact is updated by id when known,
 * otherwise upserted by phone. An address that the contact no longer uses is
 * removed afterwards, so the address book does not keep orphaned rows.
 */
async function writeContact(
  userId: string,
  contactId: string | null,
  previousAddressId: string | null,
  input: ContactInput,
): Promise<void> {
  const addressId = input.address
    ? await upsertContactAddress(userId, input.name, input.address, previousAddressId)
    : null;

  const number = normalizePhoneNumber(input.phoneNumber);
  const fields = {
    name: input.name,
    phone: joinPhone(input.phoneCountryCode, number),
    phone_country_code: input.phoneCountryCode,
    phone_number: number,
    whatsapp_enabled: input.whatsappEnabled,
    address_id: addressId,
  };

  if (contactId) {
    const { error } = await supabase.from('contacts').update(fields).eq('id', contactId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('contacts')
      .upsert({ ...fields, user_id: userId }, { onConflict: 'user_id,phone' });
    if (error) throw error;
  }

  // The address was cleared: the contact has already stopped pointing at it, so drop the row.
  if (previousAddressId && previousAddressId !== addressId) {
    await deleteAddress(previousAddressId);
  }
}
