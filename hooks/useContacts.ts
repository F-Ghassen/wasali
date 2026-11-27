import { useState, useEffect, useCallback } from 'react';
import {
  deleteContact,
  fetchContacts,
  saveContact,
  updateContact,
} from '@/services/contactService';
import type { ContactInput, ContactRow } from '@/types/contacts';

export interface UseContactsResult {
  contacts: ContactRow[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  saveFromBooking: (input: ContactInput) => Promise<void>;
  editContact: (contactId: string, input: ContactInput) => Promise<void>;
  removeContact: (contactId: string) => Promise<void>;
}

/**
 * The signed-in sender's contacts. Mutations refetch the list, so callers see
 * the server's state rather than a local guess.
 */
export function useContacts(userId: string | null): UseContactsResult {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      setContacts(await fetchContacts(userId));
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load contacts'));
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveFromBooking = useCallback(
    async (input: ContactInput) => {
      if (!userId) throw new Error('Not authenticated');
      await saveContact(userId, input);
      await refresh();
    },
    [userId, refresh],
  );

  const editContact = useCallback(
    async (contactId: string, input: ContactInput) => {
      if (!userId) throw new Error('Not authenticated');
      await updateContact(userId, contactId, input);
      await refresh();
    },
    [userId, refresh],
  );

  const removeContact = useCallback(
    async (contactId: string) => {
      await deleteContact(contactId);
      await refresh();
    },
    [refresh],
  );

  return { contacts, isLoading, error, refresh, saveFromBooking, editContact, removeContact };
}
