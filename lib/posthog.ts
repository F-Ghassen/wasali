import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const extra = Constants.expoConfig?.extra as
  | { posthogProjectToken?: string; posthogHost?: string }
  | undefined;
const projectToken = extra?.posthogProjectToken;
const host = extra?.posthogHost;
const isPostHogConfigured = Boolean(projectToken && host);

if (!isPostHogConfigured && __DEV__) {
  if (!projectToken) {
    console.error(
      new Error(
        'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured',
      ),
    );
  }

  if (!host) {
    console.error(
      new Error(
        'POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured',
      ),
    );
  }
}

export const posthog = isPostHogConfigured
  ? new PostHog(projectToken!, {
      host: host!,
      captureAppLifecycleEvents: true,
      preloadFeatureFlags: true,
      logs: {
        serviceName: 'wasali-mobile',
      },
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
    })
  : undefined;
