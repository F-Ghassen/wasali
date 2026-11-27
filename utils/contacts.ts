import type { ContactAddressRow, ContactInput, ContactRow, PersonAddress, SavedRecipient } from '@/types/contacts';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/utils/phoneCountries';
import { normalizePhoneNumber, splitPhone } from '@/utils/phone';
import type { ContactFormData } from '@/utils/validators';

/**
 * PostgREST returns an embed as an array for a to-many relation and as one object
 * (or null) for a to-one relation. Until migration 062 is applied, the database
 * still links a contact to a single address, so the embed can arrive as an object.
 */
export function toAddressList(embed: PersonAddress | PersonAddress[] | null | undefined): PersonAddress[] {
  if (Array.isArray(embed)) return embed;
  return embed ? [embed] : [];
}

/** Maps a contact row onto the person form. Addresses are not part of this form. */
export function toContactFormValues(contact: ContactRow): ContactFormData {
  // Rows written before migration 060 have no parts; fall back to splitting the combined value.
  const fallback = splitPhone(contact.phone);
  return {
    name: contact.name,
    countryCode: contact.phone_country_code ?? fallback.countryCode ?? DEFAULT_PHONE_COUNTRY_CODE,
    phoneNumber: contact.phone_number ?? fallback.number,
    whatsappEnabled: contact.whatsapp_enabled,
  };
}

/** Maps validated person form values to the write shape. */
export function toContactInput(values: ContactFormData): ContactInput {
  return {
    name: values.name.trim(),
    phoneCountryCode: values.countryCode,
    phoneNumber: normalizePhoneNumber(values.phoneNumber),
    whatsappEnabled: values.whatsappEnabled,
  };
}

/**
 * The address used when a person is picked in booking: the default one, or the
 * first one when none is marked. Null when the person has no addresses.
 */
export function pickDefaultAddress(addresses: PersonAddress[]): PersonAddress | null {
  return addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
}

/** True when a booking's address matches one the person already has (case and spacing ignored). */
export function hasSameAddress(addresses: PersonAddress[], address: ContactAddressRow): boolean {
  const key = (street: string, city: string) =>
    `${street.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
  const target = key(address.street, address.city);
  return addresses.some((a) => key(a.street, a.city) === target);
}

/**
 * The country code and number of a saved recipient. Rows saved before migration
 * 060 have no parts, so the combined phone is split instead.
 */
export function savedRecipientPhone(
  r: Pick<SavedRecipient, 'phone' | 'phone_country_code' | 'phone_number'>,
): { countryCode: string; number: string } {
  const parts = splitPhone(r.phone);
  return {
    countryCode: r.phone_country_code ?? parts.countryCode ?? DEFAULT_PHONE_COUNTRY_CODE,
    number: r.phone_number ?? parts.number,
  };
}

/**
 * Whether the booking's recipient fields belong to this saved recipient. Phone is
 * unique per user (contacts_user_phone_key), so it identifies the person; a name
 * can be shared by several people.
 */
export function isSavedRecipientSelected(
  r: Pick<SavedRecipient, 'phone' | 'phone_country_code' | 'phone_number'>,
  form: { countryCode: string; number: string },
): boolean {
  const phone = savedRecipientPhone(r);
  return phone.countryCode === form.countryCode && phone.number === form.number;
}

export function toSavedRecipient(row: ContactRow): SavedRecipient {
  const address = pickDefaultAddress(row.addresses);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    phone_country_code: row.phone_country_code,
    phone_number: row.phone_number,
    whatsapp_enabled: row.whatsapp_enabled,
    address_street: address?.street ?? null,
    address_city: address?.city ?? null,
    address_postal_code: address?.postal_code ?? null,
  };
}
