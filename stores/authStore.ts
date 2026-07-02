import { create } from 'zustand';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '@/lib/notifications';
import type { Profile, UserRole } from '@/types/models';

export interface SavedAddressInput {
  label: string;
  street: string;
  city: string;
  country: string;
  postalCode?: string | null;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isOtpPending: boolean;
  pendingEmail: string | null;
}

interface AuthActions {
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: () => void;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Update the authenticated user's password. Throws on failure. */
  updatePassword: (newPassword: string) => Promise<{ userId: string }>;
  /** Persist a new saved address for the current user. Throws on failure. */
  saveAddress: (address: SavedAddressInput) => Promise<void>;
  /** Bootstrap session from storage. Resolves when done (max 5 s). */
  initSession: () => Promise<void>;
  /** Subscribe to Supabase auth state changes. Returns the unsubscribe fn. */
  subscribeToAuthChanges: (
    onEvent: (event: string, userId: string | null) => void
  ) => () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  session: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  isOtpPending: false,
  pendingEmail: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitialized: () => set({ isInitialized: true }),

  signUp: async (email, password, fullName, role: UserRole = 'sender') => {
    set({ isLoading: true });
    try {
      const redirectTo = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.origin : '')
        : Linking.createURL('/');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
      // If confirmation is disabled, Supabase returns a session immediately
      if (data.session) {
        // Session will be picked up by the onAuthStateChange listener — no OTP needed
        return;
      }
      set({ isOtpPending: true, pendingEmail: email });
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (email, token) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      set({ isOtpPending: false, pendingEmail: null });
    } finally {
      set({ isLoading: false });
    }
  },

  resendVerification: async (email) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: Platform.OS === 'web'
            ? (typeof window !== 'undefined' ? window.location.origin : '')
            : Linking.createURL('/'),
        },
      });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ session: null, profile: null, isOtpPending: false, pendingEmail: null });
    } finally {
      set({ isLoading: false });
    }
  },

  loadProfile: async (userId) => {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
    const query = supabase.from('profiles').select('*').eq('id', userId).single();
    const result = await Promise.race([query, timeout]);
    if (!result) {
      console.warn('[loadProfile] timed out for', userId);
      return;
    }
    const { data, error } = result as Awaited<typeof query>;
    if (error) {
      console.warn('[loadProfile] error:', error.message);
      return;
    }
    if (data) {
      set({ profile: data as Profile });
      // Register push token in the background (non-blocking)
      registerForPushNotificationsAsync()
        .then((token) => { if (token) savePushToken(userId, token); })
        .catch(() => {});
    }
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString(), ...updates } as any)
        .eq('id', session.user.id)
        .select()
        .single();
      if (error) throw error;
      set({ profile: data as Profile });
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'wasali://auth/reset-password',
    });
    if (error) throw error;
  },

  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { userId: data.user.id };
  },

  saveAddress: async (address) => {
    const { session } = get();
    if (!session) throw new Error('Not authenticated');
    const { error } = await supabase.from('saved_addresses').insert({
      user_id: session.user.id,
      label: address.label,
      street: address.street,
      city: address.city,
      country: address.country,
      postal_code: address.postalCode ?? null,
      is_default: false,
    });
    if (error) throw error;
  },

  initSession: async () => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    const { setSession, loadProfile, setInitialized } = get();
    await Promise.race([supabase.auth.getSession(), timeout])
      .then(async ({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) await loadProfile(s.user.id);
      })
      .catch(() => {})
      .finally(() => { setInitialized(); });
  },

  subscribeToAuthChanges: (onEvent) => {
    const { setSession, loadProfile } = get();
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
        await loadProfile(s.user.id);
      }
      onEvent(event, s?.user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  },
}));
