import { PostHog } from 'posthog-react-native';
import type { AnalyticsEventMap, AnalyticsEventName } from '@/utils/analyticsEvents';

/**
 * The only module that talks to PostHog. The SDK is constructed only after the
 * user opts in, so nothing leaves the device (SDK config, flags, events, identity
 * or crash reports) before consent. Identity is the Supabase user id only.
 */

let client: PostHog | null = null;
let consented = false;

function getClient(): PostHog | null {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
      captureAppLifecycleEvents: false,
      preloadFeatureFlags: false,
      errorTracking: {
        autocapture: { uncaughtExceptions: true, unhandledRejections: true },
      },
    });
  }
  return client;
}

/**
 * Applies the user's consent. Opting in starts the SDK. Opting out stops it and
 * clears the identity. If the SDK was never started, there is nothing to stop.
 */
export async function setConsent(granted: boolean): Promise<void> {
  consented = granted;
  if (granted) {
    await getClient()?.optIn();
    return;
  }
  if (client) {
    await client.optOut();
    client.reset();
  }
}

/** Identifies by Supabase user id. No email, name or role is sent. */
export function identify(userId: string): void {
  if (!consented) return;
  getClient()?.identify(userId);
}

export function track<E extends AnalyticsEventName>(
  event: E,
  properties?: AnalyticsEventMap[E],
): void {
  if (!consented) return;
  getClient()?.capture(event, properties);
}

/** Test hook: lets unit tests reset module state between cases. */
export function __resetAnalyticsForTests(): void {
  client = null;
  consented = false;
}
