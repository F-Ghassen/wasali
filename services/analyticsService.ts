import { PostHog } from 'posthog-react-native';
import type { AnalyticsEventMap, AnalyticsEventName } from '@/utils/analyticsEvents';

/**
 * The only module that talks to PostHog. Nothing is sent unless the user has
 * opted in (setConsent(true)), and nothing is created without an API key.
 */

let client: PostHog | null = null;
let consented = false;

function getClient(): PostHog | null {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new PostHog(apiKey, { host: process.env.EXPO_PUBLIC_POSTHOG_HOST });
  }
  return client;
}

/** Applies the user's consent. Opting out also clears the identity on this device. */
export async function setConsent(granted: boolean): Promise<void> {
  consented = granted;
  const ph = getClient();
  if (!ph) return;
  if (granted) {
    await ph.optIn();
  } else {
    await ph.optOut();
    ph.reset();
  }
}

export function identify(userId: string): void {
  if (!consented) return;
  getClient()?.identify(userId);
}

export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (!consented) return;
  getClient()?.capture(event, properties);
}

/** Forgets the device identity, for example on sign-out. */
export function resetAnalytics(): void {
  client?.reset();
}

/** Test hook: lets unit tests reset module state between cases. */
export function __resetAnalyticsForTests(): void {
  client = null;
  consented = false;
}
