import type { SavedAddressData } from '@/utils/validators';
import type { SavedAddress } from '@/types/models';

export const EMPTY_ADDRESS_FORM: SavedAddressData = {
  label: '',
  street: '',
  city: '',
  country: 'Tunisia',
  postalCode: '',
};

/** Maps a stored address onto the form, for edit mode. */
export function toAddressFormValues(address: SavedAddress): SavedAddressData {
  return {
    label: address.label,
    street: address.street,
    city: address.city,
    country: address.country,
    postalCode: address.postal_code ?? '',
  };
}

/** Maps form values to the column shape `addressService` writes. */
export function toAddressRecord(values: SavedAddressData) {
  return {
    label: values.label.trim(),
    street: values.street.trim(),
    city: values.city.trim(),
    country: values.country.trim(),
    postal_code: values.postalCode?.trim() || null,
  };
}
