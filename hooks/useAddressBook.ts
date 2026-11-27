import { useCallback } from 'react';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { useContacts } from '@/hooks/useContacts';
import type { ContactInput, ContactRow } from '@/types/contacts';
import type { SavedAddress } from '@/types/models';
import type { SavedAddressData } from '@/utils/validators';

export interface UseAddressBookResult {
  places: SavedAddress[];
  people: ContactRow[];
  hasMorePeople: boolean;
  isLoadingMorePeople: boolean;
  loadMorePeople: () => Promise<void>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  savePlace: (values: SavedAddressData, placeId?: string) => Promise<void>;
  setDefaultPlace: (placeId: string) => Promise<void>;
  removePlace: (placeId: string) => Promise<void>;
  /** Saves a person and returns their id. */
  savePerson: (input: ContactInput, personId?: string) => Promise<string>;
  removePerson: (personId: string) => Promise<void>;
  savePersonAddress: (personId: string, values: SavedAddressData, addressId?: string) => Promise<void>;
  setDefaultPersonAddress: (addressId: string) => Promise<void>;
  removePersonAddress: (personId: string, addressId: string) => Promise<void>;
}

/**
 * The Address Book is two lists: places (saved addresses) and people (contacts,
 * each with their own addresses). This hook only composes the two existing hooks;
 * fetching and writes stay in them.
 */
export function useAddressBook(userId: string | null): UseAddressBookResult {
  const places = useSavedAddresses(userId);
  const people = useContacts(userId);

  const refresh = useCallback(async () => {
    await Promise.all([places.refresh(), people.refresh()]);
  }, [places.refresh, people.refresh]);

  const savePlace = useCallback(
    (values: SavedAddressData, placeId?: string) => places.saveAddress(values, placeId),
    [places.saveAddress],
  );

  const savePerson = useCallback(
    async (input: ContactInput, personId?: string) => {
      if (!personId) return people.saveFromBooking(input);
      await people.editContact(personId, input);
      return personId;
    },
    [people.editContact, people.saveFromBooking],
  );

  return {
    places: places.addresses,
    people: people.contacts,
    hasMorePeople: people.hasMore,
    isLoadingMorePeople: people.isLoadingMore,
    loadMorePeople: people.loadMore,
    isLoading: places.isLoading || people.isLoading,
    refresh,
    savePlace,
    setDefaultPlace: places.setDefault,
    removePlace: places.removeAddress,
    savePerson,
    removePerson: people.removeContact,
    savePersonAddress: people.savePersonAddress,
    setDefaultPersonAddress: people.setDefaultPersonAddress,
    removePersonAddress: people.removePersonAddress,
  };
}
