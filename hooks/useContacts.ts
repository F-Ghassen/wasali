import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createPersonAddress,
  deleteAddress,
  setDefaultPersonAddress,
  updateAddress,
} from '@/services/addressService';
import {
  CONTACT_PAGE_SIZE,
  deleteContact,
  fetchContacts,
  saveContact,
  updateContact,
} from '@/services/contactService';
import type { ContactInput, ContactRow } from '@/types/contacts';
import { toAddressRecord } from '@/utils/addressForm';
import type { SavedAddressData } from '@/utils/validators';

export interface UseContactsResult {
  contacts: ContactRow[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  /** Appends the next page of people. */
  loadMore: () => Promise<void>;
  /** Saves a person and returns their id. */
  saveFromBooking: (input: ContactInput) => Promise<string>;
  editContact: (contactId: string, input: ContactInput) => Promise<void>;
  removeContact: (contactId: string) => Promise<void>;
  /** Adds an address to a person, or updates `addressId` when given. */
  savePersonAddress: (contactId: string, values: SavedAddressData, addressId?: string) => Promise<void>;
  setDefaultPersonAddress: (addressId: string) => Promise<void>;
  removePersonAddress: (contactId: string, addressId: string) => Promise<void>;
}

/**
 * The signed-in sender's people, each with their addresses, one page at a time.
 * Mutations refetch the list, so callers see the server's state rather than a
 * local guess. A refetch reloads every page already shown, so the list keeps
 * its length after an edit.
 */
export function useContacts(userId: string | null): UseContactsResult {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Mirrors `contacts.length` so `refresh` can read it without depending on the list.
  const loadedCount = useRef(0);

  const showRows = useCallback((rows: ContactRow[]) => {
    loadedCount.current = rows.length;
    setContacts(rows);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const size = Math.max(CONTACT_PAGE_SIZE, loadedCount.current);
      const rows = await fetchContacts(userId, 0, size - 1);
      showRows(rows);
      setHasMore(rows.length === size);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load contacts'));
      showRows([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, showRows]);

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const from = loadedCount.current;
      const rows = await fetchContacts(userId, from, from + CONTACT_PAGE_SIZE - 1);
      showRows([...contacts, ...rows]);
      setHasMore(rows.length === CONTACT_PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load contacts'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, hasMore, isLoadingMore, isLoading, contacts, showRows]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveFromBooking = useCallback(
    async (input: ContactInput) => {
      if (!userId) throw new Error('Not authenticated');
      const contactId = await saveContact(userId, input);
      await refresh();
      return contactId;
    },
    [userId, refresh],
  );

  const editContact = useCallback(
    async (contactId: string, input: ContactInput) => {
      await updateContact(contactId, input);
      await refresh();
    },
    [refresh],
  );

  const removeContact = useCallback(
    async (contactId: string) => {
      await deleteContact(contactId);
      await refresh();
    },
    [refresh],
  );

  const savePersonAddress = useCallback(
    async (contactId: string, values: SavedAddressData, addressId?: string) => {
      if (!userId) throw new Error('Not authenticated');
      const record = toAddressRecord(values);
      if (addressId) {
        await updateAddress(addressId, record);
      } else {
        // The first address a person gets is their default.
        const person = contacts.find((c) => c.id === contactId);
        await createPersonAddress(userId, contactId, record, (person?.addresses.length ?? 0) === 0);
      }
      await refresh();
    },
    [userId, contacts, refresh],
  );

  const setDefault = useCallback(
    async (addressId: string) => {
      await setDefaultPersonAddress(addressId);
      await refresh();
    },
    [refresh],
  );

  const removePersonAddress = useCallback(
    async (contactId: string, addressId: string) => {
      const person = contacts.find((c) => c.id === contactId);
      const removed = person?.addresses.find((a) => a.id === addressId);
      await deleteAddress(addressId);
      // Removing the default leaves the person without one, so promote the next address.
      const next = person?.addresses.find((a) => a.id !== addressId);
      if (removed?.is_default && next) await setDefaultPersonAddress(next.id);
      await refresh();
    },
    [contacts, refresh],
  );

  return {
    contacts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    saveFromBooking,
    editContact,
    removeContact,
    savePersonAddress,
    setDefaultPersonAddress: setDefault,
    removePersonAddress,
  };
}
