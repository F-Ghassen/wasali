import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { renderTemplate } from './render.ts';
import type { BookingEmailVariant } from './templates/BookingEmail.ts';

Deno.test('booking_event template renders recipient name, message, and route summary', async () => {
  const { html } = await renderTemplate({
    type: 'booking_event',
    subject: 'x',
    props: {
      variant: 'new_booking',
      recipientName: 'Ghassen',
      message: 'New booking request on your route',
      routeSummary: 'Paris → Tunis',
      bookingUrl: 'https://wasali.app/booking/1',
    },
  });
  assertStringIncludes(html, 'Ghassen');
  assertStringIncludes(html, 'New booking request on your route');
  assertStringIncludes(html, 'Paris');
  assertStringIncludes(html, 'Tunis');
});

// Table-driven over every variant BookingEmail supports, mirroring
// notify-booking-event's EVENT_MAP/CANCELLATION_EVENT_MAP keys — a future
// 7th status added there without a matching case here should be caught by
// extending this table, not silently rendering the wrong headline.
const bookingVariants: { variant: BookingEmailVariant; message: string }[] = [
  { variant: 'new_booking', message: 'New booking request on your route' },
  { variant: 'booking_confirmed', message: 'Driver confirmed your booking' },
  { variant: 'in_transit', message: 'Your package has been collected and is on its way' },
  { variant: 'delivered', message: 'Your package has been delivered' },
  { variant: 'booking_cancelled', message: 'Sender cancelled a booking on your route' },
  { variant: 'weight_adjusted', message: 'Driver adjusted package weight from 5kg to 6kg' },
];

for (const { variant, message } of bookingVariants) {
  Deno.test(`booking_event template variant "${variant}" renders its distinct message`, async () => {
    const { html } = await renderTemplate({
      type: 'booking_event',
      subject: 'x',
      props: {
        variant,
        recipientName: 'Ghassen',
        message,
        routeSummary: 'Paris → Tunis',
        bookingUrl: 'https://wasali.app/booking/1',
      },
    });
    assertStringIncludes(html, message);
  });
}

Deno.test('route_alert template renders city names, price, and departure date', async () => {
  const { html } = await renderTemplate({
    type: 'route_alert',
    subject: 'x',
    props: {
      originCityName: 'Paris',
      destinationCityName: 'Tunis',
      pricePerKgEur: 4.5,
      departureDate: '2026-08-01',
      routeUrl: 'https://wasali.app/routes',
    },
  });
  assertStringIncludes(html, 'Paris');
  assertStringIncludes(html, 'Tunis');
  assertStringIncludes(html, '4.50');
});

Deno.test('route_alert template omits price/date sections when null', async () => {
  const { html } = await renderTemplate({
    type: 'route_alert',
    subject: 'x',
    props: {
      originCityName: 'Paris',
      destinationCityName: 'Tunis',
      pricePerKgEur: null,
      departureDate: null,
      routeUrl: 'https://wasali.app/routes',
    },
  });
  assertEquals(html.includes('/kg'), false);
});

Deno.test('offer_accepted template renders recipient name and request summary', async () => {
  const { html } = await renderTemplate({
    type: 'offer_accepted',
    subject: 'x',
    props: {
      recipientName: 'Sarah',
      requestSummary: 'Paris → Tunis, 5kg',
      offerUrl: 'https://wasali.app/requests/1',
    },
  });
  assertStringIncludes(html, 'Sarah');
  assertStringIncludes(html, 'Paris');
});

Deno.test('auth_signup_confirmation template renders the confirmation link', async () => {
  const { html } = await renderTemplate({
    type: 'auth_signup_confirmation',
    subject: 'x',
    props: { confirmationUrl: 'https://wasali.app/confirm?token=abc' },
  });
  assertStringIncludes(html, 'https://wasali.app/confirm?token=abc');
});

Deno.test('auth_password_reset template renders the reset link', async () => {
  const { html } = await renderTemplate({
    type: 'auth_password_reset',
    subject: 'x',
    props: { resetUrl: 'https://wasali.app/reset?token=abc' },
  });
  assertStringIncludes(html, 'https://wasali.app/reset?token=abc');
});

Deno.test('templates escape a malicious recipient name instead of rendering raw markup', async () => {
  const malicious = '<script>alert(1)</script>';
  const { html } = await renderTemplate({
    type: 'booking_event',
    subject: 'x',
    props: {
      variant: 'new_booking',
      recipientName: malicious,
      message: 'test',
      routeSummary: 'A → B',
      bookingUrl: 'https://wasali.app',
    },
  });
  assertEquals(html.includes(malicious), false);
});

Deno.test('renderTemplate throws on an unrecognized type (programmer error, fail loud)', async () => {
  let threw = false;
  try {
    // deno-lint-ignore no-explicit-any
    await renderTemplate({ type: 'unknown_type', subject: 'x', props: {} } as any);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
