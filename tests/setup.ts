// Polyfill fetch for node environment
import { vi } from 'vitest';

// Suppress React Native module import errors in tests
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
  },
}));

// The PostHog SDK ships React Native source that Node can't parse; unit tests that
// import stores reach it through analyticsService, so stub it everywhere.
vi.mock('posthog-react-native', () => ({ PostHog: vi.fn() }));
