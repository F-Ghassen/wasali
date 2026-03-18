// Polyfill fetch for node environment
import { vi } from 'vitest';

// Suppress React Native module import errors in tests
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
  },
}));
