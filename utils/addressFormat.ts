import type { SavedAddress } from '@/types/models';

/** Renders an address as one line, e.g. "12 Rue X, 75011 Paris". */
export function formatAddress(address: Pick<SavedAddress, 'street' | 'city' | 'postal_code'>): string {
  const locality = [address.postal_code, address.city].filter(Boolean).join(' ');
  return [address.street, locality].filter(Boolean).join(', ');
}

/** Case- and whitespace-insensitive city comparison. Empty values never match. */
export function isSameCity(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? '').trim().toLowerCase();
  return left.length > 0 && left === (b ?? '').trim().toLowerCase();
}
