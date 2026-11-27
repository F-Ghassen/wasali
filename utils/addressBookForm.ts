import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import type { ContactRow } from '@/types/contacts';
import type { SavedAddress } from '@/types/models';
import { DEFAULT_PHONE_COUNTRY_CODE } from '@/utils/phoneCountries';
import { toContactFormValues } from '@/utils/contacts';
import {
  contactSchema,
  savedAddressSchema,
  type ContactFormData,
  type SavedAddressData,
} from '@/utils/validators';

/** A place is a reusable address. A person is a contact with their own address. */
export type AddressBookType = 'place' | 'person';

/** One form for both kinds. Each kind reads only its own fields. */
export interface AddressBookFormValues {
  type: AddressBookType;
  // Place
  label: string;
  country: string;
  // Person
  name: string;
  countryCode: string;
  phoneNumber: string;
  whatsappEnabled: boolean;
  // Shared address fields
  street: string;
  city: string;
  postalCode: string;
}

export function emptyAddressBookValues(type: AddressBookType): AddressBookFormValues {
  return {
    type,
    label: '',
    country: 'Tunisia',
    name: '',
    countryCode: DEFAULT_PHONE_COUNTRY_CODE,
    phoneNumber: '',
    whatsappEnabled: false,
    street: '',
    city: '',
    postalCode: '',
  };
}

/** The address columns a place and a person's address share. */
export type AddressFields = Pick<SavedAddress, 'label' | 'country' | 'street' | 'city' | 'postal_code'>;

/** Maps a place, or one of a person's addresses, onto the address form. */
export function placeToFormValues(address: AddressFields): AddressBookFormValues {
  return {
    ...emptyAddressBookValues('place'),
    label: address.label,
    country: address.country,
    street: address.street,
    city: address.city,
    postalCode: address.postal_code ?? '',
  };
}

/** Maps a person onto the person form. Their addresses are edited separately. */
export function personToFormValues(contact: ContactRow): AddressBookFormValues {
  const person = toContactFormValues(contact);
  return {
    ...emptyAddressBookValues('person'),
    name: person.name,
    countryCode: person.countryCode,
    phoneNumber: person.phoneNumber,
    whatsappEnabled: person.whatsappEnabled,
  };
}

/** Picks the address fields for a place or a person's address. */
export function toPlaceData(values: AddressBookFormValues): SavedAddressData {
  return {
    label: values.label,
    street: values.street,
    city: values.city,
    country: values.country,
    postalCode: values.postalCode,
  };
}

/** Picks the person fields for `useContacts`. */
export function toPersonData(values: AddressBookFormValues): ContactFormData {
  return {
    name: values.name,
    countryCode: values.countryCode,
    phoneNumber: values.phoneNumber,
    whatsappEnabled: values.whatsappEnabled,
  };
}

// The place schema and the contact schema are different objects, so the
// resolver picks one per submit. zodResolver is typed for each schema's own
// values, hence the casts to the shared form type.
const placeResolver = zodResolver(savedAddressSchema) as unknown as Resolver<AddressBookFormValues>;
const personResolver = zodResolver(contactSchema) as unknown as Resolver<AddressBookFormValues>;

/**
 * Validates with the schema for the active kind. On success it returns the
 * original form values: zod's parsed output drops `type` and other keys the
 * submit handler needs to tell a place from a person.
 */
export const addressBookResolver: Resolver<AddressBookFormValues> = async (values, context, options) => {
  const result =
    values.type === 'place'
      ? await placeResolver(values, context, options)
      : await personResolver(values, context, options);
  const isValid = Object.keys(result.errors).length === 0;
  return { values: isValid ? values : {}, errors: result.errors };
};
