import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface BookingRecord {
  id: string;
  status: string;
  route_id: string;
  sender_id: string;
  package_weight_kg: number;
  price_eur: number;
}

interface WebhookPayload {
  type: 'UPDATE';
  table: string;
  record: BookingRecord;
  old_record: BookingRecord;
}

type NotificationType = 'new_booking' | 'booking_confirmed' | 'in_transit' | 'delivered';

const EVENT_MAP: Record<string, { type: NotificationType; recipientRole: 'driver' | 'sender'; message: string }> = {
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

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { record } = payload;
    const newStatus = record.status;

    const event = EVENT_MAP[newStatus];
    if (!event) {
      return new Response(JSON.stringify({ skipped: true, status: newStatus }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch route to get driver_id
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('driver_id, origin_city, destination_city')
      .eq('id', record.route_id)
      .single();

    if (routeError || !route) {
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
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 200 });
    }

    const routeSummary = `${route.origin_city_id} → ${route.destination_city_id}`;

    // Insert in-app notification
    await supabase.from('notifications').insert({
      user_id: recipientId,
      booking_id: record.id,
      type: event.type,
      message: event.message,
    });

    // Send push notification (native users)
    if (profile.push_token) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.push_token,
          title: 'Wasali',
          body: event.message,
          data: { bookingId: record.id },
        }),
      });
    }

    // Send email (web users or those with notification_email)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailTo = profile.notification_email;
    if (resendKey && emailTo) {
      const bookingUrl = `https://wasali.app/bookings/${record.id}`;
      const html = buildEmailHtml({
        recipientName: profile.full_name ?? 'User',
        message: event.message,
        routeSummary,
        bookingUrl,
      });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Wasali <notifications@wasali.app>',
          to: [emailTo],
          subject: event.message,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('notify-booking-event error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function buildEmailHtml({
  recipientName,
  message,
  routeSummary,
  bookingUrl,
}: {
  recipientName: string;
  message: string;
  routeSummary: string;
  bookingUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f6f6;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#000;padding:24px 32px;">
      <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">Wasali</span>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:16px;color:#545454">Hi ${recipientName},</p>
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#000">${message}</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#545454">Route: <strong>${routeSummary}</strong></p>
      <a href="${bookingUrl}"
        style="display:inline-block;background:#000;color:#fff;padding:12px 28px;border-radius:100px;font-size:15px;font-weight:600;text-decoration:none">
        View shipment →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e5e5">
      <p style="margin:0;font-size:12px;color:#adadad">You're receiving this because you have an active shipment on Wasali.</p>
    </div>
  </div>
</body>
</html>`;
}
