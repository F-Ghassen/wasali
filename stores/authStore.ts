import { create } from 'zustand';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/models';

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
  signUp: (email: string, password: string, fullName: string, role?: 'sender' | 'driver') => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

  signUp: async (email, password, fullName, role = 'sender') => {
    set({ isLoading: true });
    try {
      const redirectTo = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.origin : '')
        : Linking.createURL('/');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
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
    if (!result) return;
    const { data, error } = result as Awaited<typeof query>;
    if (!error && data) set({ profile: data as Profile });
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
}));
