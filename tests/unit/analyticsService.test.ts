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
  resetAnalytics,
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
    track('search_performed', { origin_country: 'FR', destination_country: 'TN', has_date: true });

    expect(ph.capture).not.toHaveBeenCalled();
  });

  it('sends events after opt-in', async () => {
    await setConsent(true);
    track('booking_started', { route_id: 'r1' });

    expect(ph.optIn).toHaveBeenCalledTimes(1);
    expect(ph.capture).toHaveBeenCalledWith('booking_started', { route_id: 'r1' });
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
    track('booking_started', { route_id: 'r1' });

    expect(ph.optOut).toHaveBeenCalledTimes(1);
    expect(ph.reset).toHaveBeenCalledTimes(1);
    expect(ph.capture).not.toHaveBeenCalled();
  });
});

describe('analyticsService without an API key', () => {
  it('never creates the SDK client', async () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    await setConsent(true);
    track('booking_started', { route_id: 'r1' });
    identify('user-1');
    resetAnalytics();

    expect(PostHogCtor).not.toHaveBeenCalled();
  });
});

describe('analyticsService client', () => {
  it('creates one client with the EU host', async () => {
    await setConsent(true);
    track('booking_started', { route_id: 'r1' });

    expect(PostHogCtor).toHaveBeenCalledTimes(1);
    expect(PostHogCtor).toHaveBeenCalledWith(KEY, { host: 'https://eu.i.posthog.com' });
  });
});
