import { useState, useEffect, useCallback } from 'react';
import {
  createAddress,
  deleteAddress,
  fetchSavedAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/services/addressService';
import type { SavedAddress } from '@/types/models';
import { toAddressRecord } from '@/utils/addressForm';
import type { SavedAddressData } from '@/utils/validators';

export interface UseSavedAddressesResult {
  addresses: SavedAddress[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  /** Creates the address when `addressId` is omitted, otherwise updates it. */
  saveAddress: (values: SavedAddressData, addressId?: string) => Promise<void>;
  setDefault: (addressId: string) => Promise<void>;
  removeAddress: (addressId: string) => Promise<void>;
}

/** The sender's address book with its mutations. Each mutation refetches the list. */
export function useSavedAddresses(userId: string | null): UseSavedAddressesResult {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      setAddresses(await fetchSavedAddresses(userId));
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load addresses'));
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveAddress = useCallback(
    async (values: SavedAddressData, addressId?: string) => {
      if (!userId) throw new Error('Not authenticated');
      const record = toAddressRecord(values);
      if (addressId) await updateAddress(addressId, record);
      else await createAddress(userId, record);
      await refresh();
    },
    [userId, refresh],
  );

  const setDefault = useCallback(
    async (addressId: string) => {
      await setDefaultAddress(addressId);
      await refresh();
    },
    [refresh],
  );

  const removeAddress = useCallback(
    async (addressId: string) => {
      await deleteAddress(addressId);
      await refresh();
    },
    [refresh],
  );

  return { addresses, isLoading, error, refresh, saveAddress, setDefault, removeAddress };
}
