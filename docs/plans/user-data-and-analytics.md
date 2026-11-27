# User data and product analytics

Status: draft, awaiting approval
Decisions: PostHog (EU cloud), opt-in consent, profile fields added to Edit Profile.

## 1. Consent (opt-in)

Nothing is tracked until the user opts in. Consent is asked once after sign-up and can be changed in Profile → Privacy.

| Field (profiles)            | Type        | Meaning                                  |
|-----------------------------|-------------|------------------------------------------|
| `analytics_consent_at`      | timestamptz | Set when the user opts in to analytics. Null = not consented. |
| `marketing_consent_at`      | timestamptz | Set when the user opts in to marketing emails. |
| `terms_version`             | text        | Version of terms/privacy accepted at sign-up. |
| `terms_accepted_at`         | timestamptz | When terms were accepted.                |

Rules:
- PostHog is initialised, and `identify()` is called, only when `analytics_consent_at` is set.
- Opting out calls `posthog.optOut()` and `reset()`, and clears the consent timestamp.
- No PII in event properties: no names, phone numbers, emails, or addresses. Use IDs and coarse values (city, country, role).
- Session replay and autocapture of inputs stay off.

## 2. Profile fields for segmentation

| Field               | Type        | Set by                 | Used for                          |
|---------------------|-------------|------------------------|-----------------------------------|
| `country_code`      | text        | Edit Profile (ISO-3166 alpha-2) | Residence segmentation, pricing region |
| `preferred_locale`  | text        | Language sheet         | Language usage (en, fr, ar, darija) |
| `acquisition_source`| text        | Sign-up (optional question) | Channel attribution          |
| `last_active_at`    | timestamptz | App foreground (throttled to 1/day) | Retention                  |

Edit Profile gains: residence country and marketing opt-in toggle. Language moves from AsyncStorage to `preferred_locale`.

## 3. Event tracking (PostHog)

Start with these 15 events. Each one answers a specific product question.

| Event                       | Properties                                 | Question it answers |
|-----------------------------|--------------------------------------------|---------------------|
| `user_signed_up`            | role, acquisition_source                   | Sign-up volume by source |
| `email_verified`            | —                                          | Verification drop-off |
| `search_performed`          | origin_country, destination_country, has_date | Demand by corridor |
| `route_viewed`              | route_id, origin, destination              | Search-to-interest |
| `booking_started`           | route_id                                   | Wizard entry rate |
| `booking_step_completed`    | step (1–6)                                 | Wizard drop-off by step |
| `booking_submitted`         | route_id, weight_kg, payment_type          | Conversion |
| `booking_cancelled`         | status_before, reason                      | Why users cancel |
| `payment_completed`         | amount_bucket, payment_type                | Revenue funnel |
| `delivery_confirmed`        | route_id                                   | Completion rate |
| `contact_saved`            | has_address                                | Address-book adoption |
| `profile_completed`         | fields_filled                              | Onboarding quality |
| `language_changed`          | from, to                                   | Locale usage |
| `notification_permission`   | granted                                    | Push opt-in rate |
| `nps_submitted`             | score (0–10)                               | Satisfaction (after first delivery) |

Super-properties on every event: `app_version`, `platform`, `role`, `country_code` (if consented).

## 4. Implementation outline

- Dependency: `posthog-react-native` (+ `expo-file-system` peer if needed).
- Env: `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` (EU host).
- Layers (per CLAUDE.md):
  - `services/analyticsService.ts`: the only file that imports PostHog. Exposes `track(event, props)`, `identify(userId)`, `optIn()`, `optOut()`.
  - `utils/analyticsEvents.ts`: typed event names and property shapes (pure).
  - `hooks/useConsent.ts`: reads and writes consent on `profiles`.
  - Screens call `track` via the hook layer, never PostHog directly.
- Tests: unit tests on `analyticsEvents` typing and on the consent gate (track is a no-op without consent).

## 5. Migration (proposed 061, not yet written or pushed)

- Adds the columns in sections 1 and 2 to `profiles`.
- Backfill: `terms_version` = current version and `terms_accepted_at` = `created_at` for existing users. Consent fields stay null, so existing users are opted out until they opt in.
- Requires explicit approval before `supabase db push` to production.

## Open items

- Confirm the terms version string and the privacy policy URL.
- Confirm the EU PostHog project and key.
- Confirm the sign-up acquisition question wording (or skip it in v1).
