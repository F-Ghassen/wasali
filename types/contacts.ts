import type { SavedAddress } from '@/types/models';

/** An address as typed in by a sender or taken from a booking. */
export interface ContactAddressRow {
  street: string;
  city: string;
  postal_code: string | null;
}

/** One of a person's addresses, as embedded in a contact row. */
export type PersonAddress = Pick<
  SavedAddress,
  'id' | 'label' | 'street' | 'city' | 'country' | 'postal_code' | 'is_default'
>;

/** A contact row as read from `contacts`, with all of its addresses embedded. */
export interface ContactRow {
  id: string;
  name: string;
  /** Combined form, kept in sync by the database. Used for display and the unique key. */
  phone: string;
  phone_country_code: string | null;
  phone_number: string | null;
  whatsapp_enabled: boolean;
  addresses: PersonAddress[];
}

/** Shape the booking flow uses to prefill a recipient. */
export interface SavedRecipient {
  id: string;
  name: string;
  phone: string;
  phone_country_code: string | null;
  phone_number: string | null;
  whatsapp_enabled: boolean;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
}

export interface ContactInput {
  name: string;
  phoneCountryCode: string;
  phoneNumber: string;
  whatsappEnabled: boolean;
  /** Only set by a booking, which adds its recipient address to the person. */
  address?: ContactAddressRow | null;
}
