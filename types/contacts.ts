export interface ContactAddressRow {
  street: string;
  city: string;
  postal_code: string | null;
}

/** A contact row as read from `contacts`, with its linked address embedded. */
export interface ContactRow {
  id: string;
  name: string;
  /** Combined form, kept in sync by the database. Used for display and the unique key. */
  phone: string;
  phone_country_code: string | null;
  phone_number: string | null;
  whatsapp_enabled: boolean;
  address: ContactAddressRow | null;
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
  address: ContactAddressRow | null;
}
