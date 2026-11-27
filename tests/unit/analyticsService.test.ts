import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { ph, PostHogCtor } = vi.hoisted(() => {
  const ph = {
    optIn: vi.fn(async () => {}),
    optOut: vi.fn(async () => {}),
    reset: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
  };
  return { ph, PostHogCtor: vi.fn(function PostHog() { return ph; }) };
});

vi.mock('posthog-react-native', () => ({ PostHog: PostHogCtor }));

import {
  __resetAnalyticsForTests,
  identify,
  setConsent,
  track,
} from '@/services/analyticsService';

const KEY = 'phc_test';

beforeEach(() => {
  __resetAnalyticsForTests();
  vi.clearAllMocks();
  process.env.EXPO_PUBLIC_POSTHOG_KEY = KEY;
  process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
  delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
});

describe('analyticsService consent gate', () => {
  it('drops events until the user has opted in', () => {
    track('route_published');

    expect(ph.capture).not.toHaveBeenCalled();
  });

  it('sends events after opt-in', async () => {
    await setConsent(true);
    track('booking_delivered');

    expect(ph.optIn).toHaveBeenCalledTimes(1);
    expect(ph.capture).toHaveBeenCalledWith('booking_delivered', undefined);
  });

  it('sends typed properties unchanged', async () => {
    await setConsent(true);
    track('booking_confirmed', { package_weight_kg: 12 });

    expect(ph.capture).toHaveBeenCalledWith('booking_confirmed', { package_weight_kg: 12 });
  });

  it('identifies only after opt-in', async () => {
    identify('user-1');
    expect(ph.identify).not.toHaveBeenCalled();

    await setConsent(true);
    identify('user-1');
    expect(ph.identify).toHaveBeenCalledWith('user-1');
  });

  it('stops sending and clears identity on opt-out', async () => {
    await setConsent(true);
    await setConsent(false);
    track('route_cancelled');

    expect(ph.reset).toHaveBeenCalledTimes(1);
    expect(ph.capture).not.toHaveBeenCalled();
  });
});

describe('analyticsService client', () => {
  it('does not start the SDK without opt-in, so nothing is sent before consent', async () => {
    await setConsent(false);
    track('route_published');
    identify('user-1');

    expect(PostHogCtor).not.toHaveBeenCalled();
    expect(ph.optOut).not.toHaveBeenCalled();
  });

  it('starts the SDK on opt-in', async () => {
    await setConsent(true);

    expect(PostHogCtor).toHaveBeenCalledTimes(1);
    expect(ph.optIn).toHaveBeenCalledTimes(1);
  });

  it('opts out and clears identity when the user withdraws after opting in', async () => {
    await setConsent(true);
    vi.clearAllMocks();
    await setConsent(false);

    expect(ph.optOut).toHaveBeenCalledTimes(1);
    expect(ph.reset).toHaveBeenCalledTimes(1);
  });

  it('uses the EU host and enables error tracking without lifecycle events', async () => {
    await setConsent(true);

    expect(PostHogCtor).toHaveBeenCalledWith(KEY, {
      host: 'https://eu.i.posthog.com',
      captureAppLifecycleEvents: false,
      preloadFeatureFlags: false,
      errorTracking: {
        autocapture: { uncaughtExceptions: true, unhandledRejections: true },
      },
    });
  });
});

describe('analyticsService without an API key', () => {
  it('never creates the SDK client', async () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    await setConsent(true);
    track('route_published');
    identify('user-1');

    expect(PostHogCtor).not.toHaveBeenCalled();
  });
});
