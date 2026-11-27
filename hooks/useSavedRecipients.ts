import { useMemo, useCallback } from 'react';
import { useContacts } from '@/hooks/useContacts';
import type { SavedRecipient } from '@/types/contacts';
import { toSavedRecipient } from '@/utils/contacts';

export type { SavedRecipient } from '@/types/contacts';

export interface RecipientUpsert {
  user_id: string;
  name: string;
  phone_country_code: string;
  phone_number: string;
  whatsapp_enabled: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_postal_code?: string | null;
}

/** Booking-facing view of the contacts: prefill candidates plus a save-on-submit. */
export function useSavedRecipients(userId: string | null): {
  recipients: SavedRecipient[];
  isLoading: boolean;
  upsertRecipient: (data: RecipientUpsert) => Promise<void>;
} {
  const { contacts, isLoading, saveFromBooking } = useContacts(userId);

  const recipients = useMemo(() => contacts.map(toSavedRecipient), [contacts]);

  const upsertRecipient = useCallback(
    async (data: RecipientUpsert) => {
      const hasAddress = Boolean(data.address_street || data.address_city);
      await saveFromBooking({
        name: data.name,
        phoneCountryCode: data.phone_country_code,
        phoneNumber: data.phone_number,
        whatsappEnabled: data.whatsapp_enabled,
        address: hasAddress
          ? {
              street: data.address_street ?? '',
              city: data.address_city ?? '',
              postal_code: data.address_postal_code ?? null,
            }
          : null,
      });
    },
    [saveFromBooking],
  );

  return { recipients, isLoading, upsertRecipient };
}
