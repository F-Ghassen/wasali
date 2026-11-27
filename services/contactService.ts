import { supabase } from '@/lib/supabase';
import { CONTACT_ADDRESS_COUNTRY, createPersonAddress } from '@/services/addressService';
import type { ContactAddressRow, ContactInput, ContactRow, PersonAddress } from '@/types/contacts';
import { hasSameAddress, toAddressList } from '@/utils/contacts';
import { joinPhone, normalizePhoneNumber } from '@/utils/phone';

export type { ContactInput, ContactRow } from '@/types/contacts';

export const CONTACT_PAGE_SIZE = 20;

/** Fetches the people in rows `from`..`to` (inclusive), newest first. */
export async function fetchContacts(
  userId: string,
  from = 0,
  to = CONTACT_PAGE_SIZE - 1,
): Promise<ContactRow[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select(
      'id, name, phone, phone_country_code, phone_number, whatsapp_enabled, ' +
        'addresses(id, label, street, city, country, postal_code, is_default)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as unknown as ContactRowFromDb[];
  return rows.map((row) => ({ ...row, addresses: toAddressList(row.addresses) }));
}

/** A contact row as PostgREST returns it, before the addresses embed is normalised. */
type ContactRowFromDb = Omit<ContactRow, 'addresses'> & {
  addresses: PersonAddress | PersonAddress[] | null;
};

/**
 * Upserts a contact by (user_id, phone), used when a booking saves a recipient.
 * The booking's address is added to the person unless they already have it.
 */
/** Returns the person's id, whether the phone was new or already saved. */
export async function saveContact(userId: string, input: ContactInput): Promise<string> {
  const number = normalizePhoneNumber(input.phoneNumber);
  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      { ...personFields(input, number), user_id: userId },
      { onConflict: 'user_id,phone' },
    )
    .select('id, addresses(id, street, city, is_default)')
    .single();
  if (error) throw error;

  if (input.address) {
    await addBookingAddress(userId, data.id, toAddressList(data.addresses as PersonAddress | PersonAddress[] | null), input.address);
  }
  return data.id;
}

/** Edits a person by id. Changing it to a phone another person already uses fails on the unique key. */
export async function updateContact(contactId: string, input: ContactInput): Promise<void> {
  const number = normalizePhoneNumber(input.phoneNumber);
  const { error } = await supabase
    .from('contacts')
    .update(personFields(input, number))
    .eq('id', contactId);
  if (error) throw error;
}

/** Deletes a person. Their addresses go with them (ON DELETE CASCADE, migration 062). */
export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) throw error;
}

function personFields(input: ContactInput, number: string) {
  return {
    name: input.name,
    phone: joinPhone(input.phoneCountryCode, number),
    phone_country_code: input.phoneCountryCode,
    phone_number: number,
    whatsapp_enabled: input.whatsappEnabled,
  };
}

/**
 * Adds a booking's address to a person when it is new to them. It becomes the
 * default only when the person has no other address.
 */
async function addBookingAddress(
  userId: string,
  contactId: string,
  existing: PersonAddress[],
  address: ContactAddressRow,
): Promise<void> {
  if (hasSameAddress(existing, address)) return;

  await createPersonAddress(
    userId,
    contactId,
    {
      label: '',
      street: address.street,
      city: address.city,
      country: CONTACT_ADDRESS_COUNTRY,
      postal_code: address.postal_code,
    },
    existing.length === 0,
  );
}
