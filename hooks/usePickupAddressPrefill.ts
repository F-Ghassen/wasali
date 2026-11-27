import { useEffect, useRef } from 'react';
import type { SavedAddress } from '@/types/models';
import { pickPreferredAddress } from '@/utils/pickupAddress';

interface UsePickupAddressPrefillOptions {
  /** True only when the driver collects the package from the sender. */
  enabled: boolean;
  /** Saved addresses already filtered to the collection city. */
  candidates: SavedAddress[];
  /** The street currently on the form. Prefill never overwrites a typed value. */
  currentStreet: string;
  onPrefill: (address: SavedAddress) => void;
}

/**
 * Prefills the pickup address once per candidate. Clearing the field does not
 * refill it, and a different candidate (e.g. after a city change) is applied.
 */
export function usePickupAddressPrefill({
  enabled,
  candidates,
  currentStreet,
  onPrefill,
}: UsePickupAddressPrefillOptions): void {
  const appliedAddressId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      appliedAddressId.current = null;
      return;
    }

    const preferred = pickPreferredAddress(candidates);
    if (!preferred || currentStreet || appliedAddressId.current === preferred.id) return;

    appliedAddressId.current = preferred.id;
    onPrefill(preferred);
  }, [enabled, candidates, currentStreet, onPrefill]);
}
