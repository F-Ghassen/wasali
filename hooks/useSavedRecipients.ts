import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SavedRecipient {
  id: string;
  name: string;
  phone: string;
  whatsapp_enabled: boolean;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
}

interface RecipientUpsert {
  user_id: string;
  name: string;
  phone: string;
  whatsapp_enabled: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_postal_code?: string | null;
}

export function useSavedRecipients(userId: string | null): {
  recipients: SavedRecipient[];
  isLoading: boolean;
  upsertRecipient: (data: RecipientUpsert) => Promise<void>;
} {
  const [recipients, setRecipients] = useState<SavedRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    supabase
      .from('recipients')
      .select('id, name, phone, whatsapp_enabled, address_street, address_city, address_postal_code')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setIsLoading(false);
        if (data) setRecipients(data as SavedRecipient[]);
      });
  }, [userId]);

  const upsertRecipient = useCallback(async (data: RecipientUpsert) => {
    await supabase
      .from('recipients')
      .upsert(data, { onConflict: 'user_id,phone' });

    // Refresh list
    if (!data.user_id) return;
    const { data: updated } = await supabase
      .from('recipients')
      .select('id, name, phone, whatsapp_enabled, address_street, address_city, address_postal_code')
      .eq('user_id', data.user_id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (updated) setRecipients(updated as SavedRecipient[]);
  }, []);

  return { recipients, isLoading, upsertRecipient };
}
