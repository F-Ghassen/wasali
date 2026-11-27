import type { SavedAddress } from '@/types/models';
import { isSameCity } from './addressFormat';

/** Saved addresses usable as a driver pickup point in the given collection city. */
export function getPickupCandidates(addresses: SavedAddress[], city: string): SavedAddress[] {
  return addresses.filter((address) => isSameCity(address.city, city));
}

/** The address to prefill: the default when it qualifies, otherwise the first candidate. */
export function pickPreferredAddress(candidates: SavedAddress[]): SavedAddress | null {
  return candidates.find((address) => address.is_default) ?? candidates[0] ?? null;
}

/** Sender form fields a chosen pickup address fills. The city is locked to the stop, so it is not included. */
export function toSenderPickupFields(address: SavedAddress): {
  senderAddressStreet: string;
  senderAddressPostalCode: string;
} {
  return {
    senderAddressStreet: address.street,
    senderAddressPostalCode: address.postal_code ?? '',
  };
}
