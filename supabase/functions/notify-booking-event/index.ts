import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email/client.ts';
import { renderTemplate } from '../_shared/email/render.ts';
import type { BookingEmailVariant } from '../_shared/email/templates/BookingEmail.ts';
import { insertEmailLog, updateEmailLog } from '../_shared/email/log.ts';
import { SENDERS } from '../_shared/email/senders.ts';
import { logError, logEvent } from '../_shared/log.ts';

const FN_NAME = 'notify-booking-event';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface BookingRecord {
  id: string;
  status: string;
  route_id: string;
  sender_id: string;
  package_weight_kg: number;
  price_eur: number;
  cancellation_reason: string | null;
}

interface WebhookPayload {
  type: 'UPDATE';
  table: string;
  record: BookingRecord;
  old_record: BookingRecord;
}

type NotificationType =
  | 'new_booking'
  | 'booking_confirmed'
  | 'in_transit'
  | 'delivered'
  | 'booking_cancelled'
  | 'weight_adjusted';

export interface BookingEvent {
  type: NotificationType;
  recipientRole: 'driver' | 'sender';
  message: string;
}

const EVENT_MAP: Record<string, BookingEvent> = {
  pending: {
    type: 'new_booking',
    recipientRole: 'driver',
    message: 'New booking request on your route',
  },
  confirmed: {
    type: 'booking_confirmed',
    recipientRole: 'sender',
    message: 'Driver confirmed your booking',
  },
  in_transit: {
    type: 'in_transit',
    recipientRole: 'sender',
    message: 'Your package has been collected and is on its way',
  },
  delivered: {
    type: 'delivered',
    recipientRole: 'sender',
    message: 'Your package has been delivered',
  },
};

// 'cancelled' has no single recipient/message — both depend on WHY the
// booking was cancelled (bookings.cancellation_reason, migration 049).
// Sender-initiated actions notify the driver; driver/route-initiated ones
// notify the sender.
const CANCELLATION_EVENT_MAP: Record<string, BookingEvent> = {
  sender_cancelled: {
    type: 'booking_cancelled',
    recipientRole: 'driver',
    message: 'Sender cancelled a booking on your route',
  },
  rejected_by_driver: {
    type: 'booking_cancelled',
    recipientRole: 'sender',
    message: 'Driver rejected your booking request',
  },
  route_cancelled: {
    type: 'booking_cancelled',
    recipientRole: 'sender',
    message: 'The driver cancelled the route — your booking was cancelled',
  },
  route_expired: {
    type: 'booking_cancelled',
    recipientRole: 'sender',
    message: 'This route expired before departure — your booking was cancelled',
  },
};

// Weight adjustment (driver mid-pickup correction, see
// stores/driverBookingStore.ts adjustPackageWeight) is always written in a
// separate UPDATE from a status transition — never combined in one write —
// so checking it ahead of the status branch stays unambiguous: a row can
// match at most one of these two paths per webhook invocation.
export function resolveEvent(record: BookingRecord, oldRecord: BookingRecord): BookingEvent | undefined {
  if (record.package_weight_kg !== oldRecord.package_weight_kg) {
    return {
      type: 'weight_adjusted',
      recipientRole: 'sender',
      message: `Driver adjusted package weight from ${oldRecord.package_weight_kg}kg to ${record.package_weight_kg}kg`,
    };
  }

  if (record.status === 'cancelled') {
    return record.cancellation_reason ? CANCELLATION_EVENT_MAP[record.cancellation_reason] : undefined;
  }
  return EVENT_MAP[record.status];
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { record, old_record } = payload;

    const event = resolveEvent(record, old_record);
    if (!event) {
      return new Response(JSON.stringify({ skipped: true, status: record.status }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch route (driver + its stops' cities). Routes have no origin/destination
    // columns — origin = the collection stop's city, destination = the dropoff
    // stop's city (route_stops -> cities). Selecting the dropped origin_city/
    // destination_city columns previously yielded "undefined → undefined".
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('driver_id, route_stops(stop_type, stop_order, cities(name))')
      .eq('id', record.route_id)
      .single();

    if (routeError || !route) {
      logEvent(FN_NAME, 'route_not_found', { bookingId: record.id, routeId: record.route_id });
      return new Response(JSON.stringify({ error: 'Route not found' }), { status: 200 });
    }

    const recipientId = event.recipientRole === 'driver' ? route.driver_id : record.sender_id;

    // Fetch recipient profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, push_token, notification_email, full_name')
      .eq('id', recipientId)
      .single();

    if (profileError || !profile) {
      logEvent(FN_NAME, 'profile_not_found', { bookingId: record.id, recipientId });
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 200 });
    }

    const routeSummary = buildRouteSummary(route.route_stops);

    // Every side effect below is independently isolated: Supabase retries
    // this webhook on any non-2xx response, and the notification insert
    // already happened before a thrown error used to bubble to the outer
    // catch — turning one failed email/push into a 500 risked a duplicate
    // `notifications` row on retry. Each step is soft-failed and logged
    // instead, and the handler always returns 200 once event/route/profile
    // resolution succeeds.
    const result = {
      notification: await tryInsertNotification(supabase, record, recipientId, event),
      push: await trySendPush(profile.push_token, event, record.id),
      email: await tryEmailSend(supabase, profile, event, routeSummary, record.id),
    };

    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200 });
  } catch (err) {
    logError(FN_NAME, 'unhandled_error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 200 });
  }
});

export async function tryInsertNotification(
  supabase: SupabaseClient,
  record: BookingRecord,
  recipientId: string,
  event: BookingEvent
): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: recipientId,
      booking_id: record.id,
      type: event.type,
      message: event.message,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    logError(FN_NAME, 'notification_insert_failed', err, { bookingId: record.id, recipientId });
    return false;
  }
}

export async function trySendPush(
  pushToken: string | null,
  event: BookingEvent,
  bookingId: string
): Promise<boolean> {
  if (!pushToken) return false;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: 'Wasali',
        body: event.message,
        data: { bookingId },
      }),
    });
    if (!res.ok) throw new Error(`Expo push responded ${res.status}`);
    return true;
  } catch (err) {
    logError(FN_NAME, 'push_send_failed', err, { bookingId });
    return false;
  }
}

export interface RecipientProfile {
  notification_email: string | null;
  full_name: string | null;
}

export async function tryEmailSend(
  supabase: SupabaseClient,
  profile: RecipientProfile,
  event: BookingEvent,
  routeSummary: string,
  bookingId: string
): Promise<boolean> {
  const emailTo = profile.notification_email;
  if (!emailTo) return false;

  let logId: string | null = null;
  try {
    const bookingUrl = `https://wasali.app/booking/bookingDetail/${bookingId}`;
    const variant: BookingEmailVariant = event.type;
    const { subject, html } = await renderTemplate({
      type: 'booking_event',
      subject: event.message,
      props: {
        variant,
        recipientName: profile.full_name ?? 'User',
        message: event.message,
        routeSummary,
        bookingUrl,
      },
    });

    logId = await insertEmailLog(supabase, {
      emailType: 'booking_event',
      recipientEmail: emailTo,
      bookingId,
    });

    const result = await sendEmail({
      from: SENDERS.booking_event.from,
      to: emailTo,
      subject,
      html,
    });

    await updateEmailLog(supabase, logId, result);

    if (!result.ok) {
      logError(FN_NAME, 'email_send_failed', new Error(result.errorDetail ?? 'unknown'), { bookingId });
    }
    return result.ok;
  } catch (err) {
    logError(FN_NAME, 'email_attempt_threw', err, { bookingId });
    return false;
  }
}

interface RouteStopCity {
  stop_type: string;
  stop_order: number;
  cities: { name: string } | { name: string }[] | null;
}

// Origin = earliest collection stop's city; destination = latest dropoff stop's city.
// Returns a "Origin → Destination" label, gracefully degrading if stops are missing.
export function buildRouteSummary(stops: RouteStopCity[] | null): string {
  const cityName = (stop: RouteStopCity | undefined): string | null => {
    if (!stop || !stop.cities) return null;
    const c = Array.isArray(stop.cities) ? stop.cities[0] : stop.cities;
    return c?.name ?? null;
  };

  const byOrder = (a: RouteStopCity, b: RouteStopCity) => a.stop_order - b.stop_order;
  const collections = (stops ?? []).filter((s) => s.stop_type === 'collection').sort(byOrder);
  const dropoffs = (stops ?? []).filter((s) => s.stop_type === 'dropoff').sort(byOrder);

  const origin = cityName(collections[0]);
  const destination = cityName(dropoffs[dropoffs.length - 1]);

  if (origin && destination) return `${origin} → ${destination}`;
  return origin ?? destination ?? 'Your shipment';
}
