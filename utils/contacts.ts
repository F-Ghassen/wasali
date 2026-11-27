import type { ContactInput, ContactRow, SavedRecipient } from '@/types/contacts';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/utils/phoneCountries';
import { normalizePhoneNumber, splitPhone } from '@/utils/phone';
import type { ContactFormData } from '@/utils/validators';

/** Maps a contact row onto the edit form. Empty address fields stay empty strings. */
export function toContactFormValues(contact: ContactRow): ContactFormData {
  // Rows written before migration 060 have no parts; fall back to splitting the combined value.
  const fallback = splitPhone(contact.phone);
  return {
    name: contact.name,
    countryCode: contact.phone_country_code ?? fallback.countryCode ?? DEFAULT_PHONE_COUNTRY_CODE,
    phoneNumber: contact.phone_number ?? fallback.number,
    whatsappEnabled: contact.whatsapp_enabled,
    street: contact.address?.street ?? '',
    city: contact.address?.city ?? '',
    postalCode: contact.address?.postal_code ?? '',
  };
}

/**
 * Maps validated form values to the write shape. An address is only written
 * when street and city are both present; otherwise the contact has none.
 */
export function toContactInput(values: ContactFormData): ContactInput {
  const street = values.street?.trim() ?? '';
  const city = values.city?.trim() ?? '';
  const hasAddress = Boolean(street && city);
  return {
    name: values.name.trim(),
    phoneCountryCode: values.countryCode,
    phoneNumber: normalizePhoneNumber(values.phoneNumber),
    whatsappEnabled: values.whatsappEnabled,
    address: hasAddress
      ? { street, city, postal_code: values.postalCode?.trim() || null }
      : null,
  };
}

export function toSavedRecipient(row: ContactRow): SavedRecipient {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    phone_country_code: row.phone_country_code,
    phone_number: row.phone_number,
    whatsapp_enabled: row.whatsapp_enabled,
    address_street: row.address?.street ?? null,
    address_city: row.address?.city ?? null,
    address_postal_code: row.address?.postal_code ?? null,
  };
}

/**
 * Drops address rows that belong to a contact. Those are managed through the
 * contact, so they must not appear in the sender's address book.
 */
export function withoutContactLinks<T extends { contacts: unknown[] }>(
  rows: T[],
): Array<Omit<T, 'contacts'>> {
  return rows
    .filter((row) => row.contacts.length === 0)
    .map(({ contacts: _linkedContacts, ...address }) => address);
}
