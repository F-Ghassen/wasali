/**
 * tests/integration/route-expiry-cascade.test.ts
 *
 * The nightly `expire-routes` cron (migration 048) flips active/full routes
 * with a past departure_date to status='expired'. Migration 049 adds a
 * cascade trigger so that transition also auto-cancels the route's
 * pending/confirmed bookings, tagging cancellation_reason='route_expired'
 * and restoring capacity for any that were confirmed.
 *
 * This test runs the exact UPDATE the cron body executes (not the cron
 * scheduler itself) to verify the cascade fires identically for that path.
 *
 * Run: npx vitest run tests/integration/route-expiry-cascade.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  adminClient,
  createTestUser,
  cleanupUser,
  cleanupRoute,
  seedRoute,
  TEST_BOOKING_DRAFT,
  type TestUser,
} from '../helpers';

const SKIP = process.env.SKIP_INTEGRATION === 'true';

describe.skipIf(SKIP)('Route expiry cascade (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  const routeIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');
  });

  afterAll(async () => {
    for (const id of routeIds) await cleanupRoute(id).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  it('the expire-routes cron body cascades pending/confirmed bookings with reason=route_expired', async () => {
    const routeId = await seedRoute(driver.userId, {
      available_weight_kg: 50,
      departure_date: '2020-01-01', // well in the past
    });
    routeIds.push(routeId);

    const { data: pendingBooking } = await adminClient
      .from('bookings')
      .insert({ ...TEST_BOOKING_DRAFT, sender_id: sender.userId, route_id: routeId, status: 'pending', package_weight_kg: 4 })
      .select('id')
      .single();
    const { data: confirmedBooking } = await adminClient
      .from('bookings')
      .insert({ ...TEST_BOOKING_DRAFT, sender_id: sender.userId, route_id: routeId, status: 'confirmed', package_weight_kg: 6 })
      .select('id')
      .single();
    await adminClient.rpc('decrement_route_capacity', { p_route_id: routeId, p_weight_kg: 6 });

    // Exact body of the expire-routes cron job (migration 048).
    const { error } = await adminClient
      .from('routes')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('status', ['active', 'full'])
      .lt('departure_date', new Date().toISOString().slice(0, 10));

    expect(error).toBeNull();

    const { data: routeAfter } = await adminClient
      .from('routes')
      .select('status, available_weight_kg')
      .eq('id', routeId)
      .single();
    expect(routeAfter!.status).toBe('expired');
    expect(routeAfter!.available_weight_kg).toBe(50); // 6kg restored

    const { data: bookingsAfter } = await adminClient
      .from('bookings')
      .select('id, status, cancellation_reason')
      .in('id', [pendingBooking!.id, confirmedBooking!.id]);

    for (const b of bookingsAfter!) {
      expect(b.status).toBe('cancelled');
      expect(b.cancellation_reason).toBe('route_expired');
    }
  });

  it('a route with no departure in the past is left untouched by the expiry sweep', async () => {
    const routeId = await seedRoute(driver.userId, {
      available_weight_kg: 20,
      departure_date: '2099-01-01', // future
    });
    routeIds.push(routeId);

    const { data: booking } = await adminClient
      .from('bookings')
      .insert({ ...TEST_BOOKING_DRAFT, sender_id: sender.userId, route_id: routeId, status: 'pending', package_weight_kg: 2 })
      .select('id')
      .single();

    await adminClient
      .from('routes')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('status', ['active', 'full'])
      .lt('departure_date', new Date().toISOString().slice(0, 10));

    const { data: routeAfter } = await adminClient
      .from('routes')
      .select('status')
      .eq('id', routeId)
      .single();
    expect(routeAfter!.status).toBe('active'); // unaffected

    const { data: bookingAfter } = await adminClient
      .from('bookings')
      .select('status, cancellation_reason')
      .eq('id', booking!.id)
      .single();
    expect(bookingAfter!.status).toBe('pending');
    expect(bookingAfter!.cancellation_reason).toBeNull();
  });
});
