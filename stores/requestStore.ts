import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { ShippingRequestWithOffers } from '@/types/models';

interface RequestDraft {
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  packageWeightKg: number;
  packageCategory: string;
  maxBudgetEur: number | null;
  desiredDateFrom: string | null;
  desiredDateTo: string | null;
}

interface RequestState {
  draft: Partial<RequestDraft>;
  activeRequest: ShippingRequestWithOffers | null;
  myRequests: ShippingRequestWithOffers[];
  isLoading: boolean;
}

interface RequestActions {
  setDraftField: <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) => void;
  resetDraft: () => void;
  submitRequest: (senderId: string) => Promise<string>;
  loadRequest: (requestId: string) => Promise<void>;
  loadMyRequests: (senderId: string) => Promise<void>;
  acceptOffer: (offerId: string, requestId: string) => Promise<void>;
  declineOffer: (offerId: string) => Promise<void>;
}

export const useRequestStore = create<RequestState & RequestActions>((set, get) => ({
  draft: {},
  activeRequest: null,
  myRequests: [],
  isLoading: false,

  setDraftField: (key, value) => {
    set((state) => ({ draft: { ...state.draft, [key]: value } }));
  },

  resetDraft: () => set({ draft: {} }),

  submitRequest: async (senderId) => {
    const { draft } = get();
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('shipping_requests')
        .insert({
          sender_id: senderId,
          origin_city: draft.originCity!,
          origin_country: draft.originCountry!,
          destination_city: draft.destinationCity!,
          destination_country: draft.destinationCountry!,
          package_weight_kg: draft.packageWeightKg!,
          package_category: draft.packageCategory!,
          max_budget_eur: draft.maxBudgetEur ?? null,
          desired_date_from: draft.desiredDateFrom ?? null,
          desired_date_to: draft.desiredDateTo ?? null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      set({ draft: {} });
      return (data as unknown as { id: string }).id;
    } finally {
      set({ isLoading: false });
    }
  },

  loadRequest: async (requestId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('shipping_requests')
        .select('*, shipping_request_offers(*)')
        .eq('id', requestId)
        .single();
      if (error) throw error;
      set({ activeRequest: data as ShippingRequestWithOffers });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMyRequests: async (senderId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('shipping_requests')
        .select('*, shipping_request_offers(*)')
        .eq('sender_id', senderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ myRequests: (data as ShippingRequestWithOffers[]) ?? [] });
    } finally {
      set({ isLoading: false });
    }
  },

  acceptOffer: async (offerId, requestId) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.functions.invoke('accept-offer', {
        body: { offerId, requestId },
      });
      if (error) throw error;
      await get().loadRequest(requestId);
    } finally {
      set({ isLoading: false });
    }
  },

  declineOffer: async (offerId) => {
    const { error } = await supabase
      .from('shipping_request_offers')
      .update({ status: 'declined' })
      .eq('id', offerId);
    if (error) throw error;
  },
}));
