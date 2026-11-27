/**
 * Typed PostHog events. Every event name and its properties are declared here,
 * so a typo or a missing property fails at compile time.
 * Properties must never contain PII: no names, phones, emails or addresses.
 */
export interface AnalyticsEventMap {
  user_signed_up: { role: 'sender' | 'driver'; acquisition_source?: string };
  email_verified: Record<string, never>;
  search_performed: { origin_country: string; destination_country: string; has_date: boolean };
  route_viewed: { route_id: string; origin_country: string; destination_country: string };
  booking_started: { route_id: string };
  booking_step_completed: { step: number };
  booking_submitted: { route_id: string; weight_kg: number; payment_type: string };
  booking_cancelled: { status_before: string; reason?: string };
  payment_completed: { amount_bucket: string; payment_type: string };
  delivery_confirmed: { route_id: string };
  contact_saved: { has_address: boolean };
  profile_completed: { fields_filled: number };
  language_changed: { from: string; to: string };
  notification_permission: { granted: boolean };
  nps_submitted: { score: number };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;
