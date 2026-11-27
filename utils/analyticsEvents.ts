/**
 * Typed PostHog events. Every event name and its properties are declared here,
 * so a typo or a missing property fails at compile time.
 * Properties must never contain PII: no names, phones, emails, addresses or free text.
 */
export interface AnalyticsEventMap {
  booking_created: { package_weight_kg: number; payment_type: string; total_price: number };
  dispute_submitted: { reason: string };
  booking_confirmed: { package_weight_kg: number };
  booking_rejected: { was_previously_confirmed: boolean };
  booking_marked_in_transit: Record<string, never>;
  booking_delivered: Record<string, never>;
  manual_payment_recorded: { payment_type: string };
  package_weight_adjusted: { previous_weight_kg: number; package_weight_kg: number };
  route_created: {
    available_weight_kg: number;
    has_promotion: boolean;
    payment_type_count: number;
    stop_count: number;
  };
  route_published: Record<string, never>;
  route_cancelled: Record<string, never>;
  shipping_request_created: {
    has_max_budget: boolean;
    package_category: string;
    package_weight_kg: number;
  };
  shipping_offer_accepted: Record<string, never>;
  shipping_offer_declined: Record<string, never>;
  language_changed: { from: string; to: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;
