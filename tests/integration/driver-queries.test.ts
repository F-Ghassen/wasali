/**
 * tests/integration/driver-queries.test.ts
 *
 * Validates every Supabase query executed by the driver-side stores and screens.
 * Each test runs the exact select string used in production and asserts:
 *   1. The query does not error (no dropped/renamed columns)
 *   2. The returned shape contains the fields the UI actually reads
 *
 * This test suite was created after a bug where fetchBookings selected
 * `origin_city, destination_city` on routes — columns dropped in migration 023 —
 * causing the entire bookings list to silently return empty.
 *
 * ── Running modes ──────────────────────────────────────────────────────────
 *
 *  Local (Docker):
 *    supabase start
 *    npx vitest run tests/integration/driver-queries.test.ts
 *
 *  Remote (no Docker):
 *    TEST_DRIVER_EMAIL=you@example.com \
 *    TEST_DRIVER_PASSWORD=yourpassword \
 *    SUPABASE_URL=https://xxx.supabase.co \
 *    SUPABASE_ANON_KEY=eyJ... \
 *    SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *    npx vitest run tests/integration/driver-queries.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import {
  adminClient,
  createTestUser,
  cleanupUser,
  seedRoute,
  cleanupRoute,
  TEST_BOOKING_DRAFT,
  type TestUser,
} from '../helpers';

const SKIP = process.env.SKIP_INTEGRATION === 'true';

// ── Remote credential mode ────────────────────────────────────────────────────
// When TEST_DRIVER_EMAIL is set, skip user creation and sign in instead.
// This is needed for Supabase cloud projects that restrict the auth admin API.

const REMOTE_DRIVER_EMAIL    = process.env.TEST_DRIVER_EMAIL;
const REMOTE_DRIVER_PASSWORD = process.env.TEST_DRIVER_PASSWORD;
const SUPABASE_URL  = process.env.SUPABASE_URL  ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.UZBKN53oO-hcH6q6YJVJVKDgJp1vmBt2g1MWVQkmCco';

async function getDriverClient(): Promise<{ client: ReturnType<typeof createClient<Database>>; userId: string; managed: false } | (TestUser & { managed: true })> {
  if (REMOTE_DRIVER_EMAIL && REMOTE_DRIVER_PASSWORD) {
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: REMOTE_DRIVER_EMAIL,
      password: REMOTE_DRIVER_PASSWORD,
    });
    if (error) throw new Error(`Remote sign-in failed: ${error.message}`);
    return { client, userId: data.user!.id, managed: false };
  }
  const user = await createTestUser('driver');
  return { ...user, managed: true };
}

// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(SKIP)('Driver Supabase queries', () => {
  let driverClient: ReturnType<typeof createClient<Database>>;
  let driverUserId: string;
  let managedDriver: TestUser | null = null;
  let managedSender: TestUser | null = null;
  let routeId: string;
  let bookingId: string;
  let ownedRoute = false; // true when we seeded the route ourselves

  beforeAll(async () => {
    // Set up driver
    const driverSetup = await getDriverClient();
    driverClient = driverSetup.client;
    driverUserId = driverSetup.userId;
    if ('managed' in driverSetup && driverSetup.managed) {
      managedDriver = driverSetup as TestUser;
    }

    // Use the driver client itself to find routes (works under RLS)
    const { data: existingRoutes } = await driverClient
      .from('routes')
      .select('id')
      .eq('driver_id', driverUserId)
      .eq('status', 'active')
      .limit(1);

    if (existingRoutes && existingRoutes.length > 0) {
      routeId = existingRoutes[0].id;
      ownedRoute = false;
    } else {
      routeId = await seedRoute(driverUserId, { available_weight_kg: 50, price_per_kg_eur: 8 });
      ownedRoute = true;
    }

    // Find an existing booking on this driver's route via the driver client (RLS allows it after migration 041)
    const { data: existingBookings } = await driverClient
      .from('bookings')
      .select('id')
      .eq('route_id', routeId)
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      bookingId = existingBookings[0].id;
    } else {
      // No bookings exist — create one using the same account (same user is both sender and driver in dev)
      const { data, error } = await driverClient
        .from('bookings')
        .insert({
          ...TEST_BOOKING_DRAFT,
          sender_id: driverUserId,
          route_id: routeId,
          payment_type: 'cash_on_collection',
          payment_status: 'unpaid',
        })
        .select('id')
        .single();
      if (error) throw new Error(`seed booking: ${error.message}`);
      bookingId = data!.id;
      // Mark for cleanup
      managedSender = { userId: driverUserId, email: '', password: '', client: driverClient };
    }
  });

  afterAll(async () => {
    // Only delete the booking if we created it (managedSender is set)
    if (managedSender) {
      await driverClient.from('bookings').delete().eq('id', bookingId).then(() => {}, () => {});
      // Only delete the user if it's a separately managed test user (not the same account as driver)
      if (managedSender.userId !== driverUserId) {
        await cleanupUser(managedSender.userId).catch(() => {});
      }
    }
    if (ownedRoute) await cleanupRoute(routeId).catch(() => {});
    if (managedDriver) await cleanupUser(managedDriver.userId).catch(() => {});
  });

  // ── driverBookingStore.fetchBookings — Step 1 ────────────────────────────

  it('fetchBookings step 1: routes.select(id).eq(driver_id) returns route IDs', async () => {
    const { data, error } = await driverClient
      .from('routes')
      .select('id')
      .eq('driver_id', driverUserId);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.map((r) => r.id)).toContain(routeId);
  });

  // ── driverBookingStore.fetchBookings — Step 2 (the query that broke) ─────

  it('fetchBookings step 2: bookings join with sender + route uses only valid columns', async () => {
    const { data, error } = await driverClient
      .from('bookings')
      .select(
        '*, sender:profiles!sender_id(id, full_name, phone, avatar_url), route:routes!route_id(id, departure_date, estimated_arrival_date)',
      )
      .in('route_id', [routeId])
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);

    const booking = data![0];
    expect(booking).toHaveProperty('id');
    expect(booking).toHaveProperty('status');
    expect(booking).toHaveProperty('route_id');
    expect(booking).toHaveProperty('payment_type');
    expect(booking).toHaveProperty('payment_status');
    expect(booking.sender).toHaveProperty('id');
    expect(booking.sender).toHaveProperty('full_name');
    expect(booking.route).toHaveProperty('id');
    expect(booking.route).toHaveProperty('departure_date');
    // Explicitly assert the dropped columns are absent from the result
    expect(booking.route).not.toHaveProperty('origin_city');
    expect(booking.route).not.toHaveProperty('destination_city');
    expect(booking.route).not.toHaveProperty('origin_country');
    expect(booking.route).not.toHaveProperty('destination_country');
  });

  // ── driverBookingStore.confirmBooking ────────────────────────────────────

  it('confirmBooking: select(route_id, package_weight_kg) on booking returns expected fields', async () => {
    const { data, error } = await driverClient
      .from('bookings')
      .select('route_id, package_weight_kg')
      .eq('id', bookingId)
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('route_id', routeId);
    expect(data).toHaveProperty('package_weight_kg');
    expect(typeof data!.package_weight_kg).toBe('number');
  });

  // ── driverBookingStore.updateBookingStatus ───────────────────────────────

  it('updateBookingStatus: driver can update status on a booking belonging to their route', async () => {
    const { error } = await driverClient
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('status')
      .eq('id', bookingId)
      .single();
    expect(data!.status).toBe('confirmed');

    // Reset for other tests
    await adminClient
      .from('bookings')
      .update({ status: 'pending' })
      .eq('id', bookingId);
  });

  // ── driverBookingStore.markPaid ──────────────────────────────────────────

  it('markPaid: driver can set payment_status=paid and paid_at on a booking', async () => {
    const now = new Date().toISOString();
    const { error } = await driverClient
      .from('bookings')
      .update({ payment_status: 'paid', paid_at: now, updated_at: now })
      .eq('id', bookingId);

    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('payment_status, paid_at')
      .eq('id', bookingId)
      .single();
    expect(data!.payment_status).toBe('paid');
    expect(data!.paid_at).not.toBeNull();

    // Reset
    await adminClient
      .from('bookings')
      .update({ payment_status: 'unpaid', paid_at: null })
      .eq('id', bookingId);
  });

  // ── driverRouteStore.fetchRoutes ─────────────────────────────────────────

  it('fetchRoutes: routes join with route_stops, route_services, route_payment_methods is valid', async () => {
    const { data, error } = await driverClient
      .from('routes')
      .select('*, route_stops(*), route_services(*), route_payment_methods(*)')
      .eq('driver_id', driverUserId);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    const route = data!.find((r) => r.id === routeId);
    expect(route).toBeDefined();
    expect(Array.isArray(route!.route_stops)).toBe(true);
    expect(Array.isArray(route!.route_services)).toBe(true);
    expect(Array.isArray(route!.route_payment_methods)).toBe(true);
    // Confirm dropped columns are absent
    expect(route).not.toHaveProperty('origin_city');
    expect(route).not.toHaveProperty('destination_city');
  });

  // ── Sender booking list query ────────────────────────────────────────────

  it('sender booking list: select with nested route_stops + cities join is valid', async () => {
    const senderClient = managedSender?.client ?? driverClient; // reuse driver client if no managed sender
    const senderId = managedSender?.userId ?? driverUserId;

    const { data, error } = await senderClient
      .from('bookings')
      .select(
        '*, route:routes(*, route_stops(*, city:cities(id, name, flag_emoji, country_code)))',
      )
      .eq('sender_id', senderId)
      .order('created_at', { ascending: false })
      .range(0, 9);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  // ── Sender booking detail query ──────────────────────────────────────────

  it('sender booking detail: select with driver profile join is valid', async () => {
    const senderClient = managedSender?.client ?? driverClient;

    const { data, error } = await senderClient
      .from('bookings')
      .select(
        '*, route:routes(*, route_stops(*, city:cities(id, name, flag_emoji, country_code)), driver:profiles!driver_id(full_name, phone))',
      )
      .eq('id', bookingId)
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('id', bookingId);
  });

  // ── Column regression guards ─────────────────────────────────────────────
  // These fail fast if a dropped column is re-added to a query.

  it('regression: routes.origin_city does not exist (dropped in migration 023)', async () => {
    const { error } = await driverClient
      .from('routes')
      .select('id, origin_city')
      .eq('id', routeId)
      .single();

    expect(error).not.toBeNull();
    expect(error!.code).toBe('42703'); // PostgreSQL: undefined_column
  });

  it('regression: routes.destination_city does not exist (dropped in migration 023)', async () => {
    const { error } = await driverClient
      .from('routes')
      .select('id, destination_city')
      .eq('id', routeId)
      .single();

    expect(error).not.toBeNull();
    expect(error!.code).toBe('42703');
  });

  it('regression: routes.origin_country does not exist (dropped in migration 024)', async () => {
    const { error } = await driverClient
      .from('routes')
      .select('id, origin_country')
      .eq('id', routeId)
      .single();

    expect(error).not.toBeNull();
    expect(error!.code).toBe('42703');
  });

  it('schema: routes has departure_date and estimated_arrival_date', async () => {
    const { data, error } = await driverClient
      .from('routes')
      .select('id, departure_date, estimated_arrival_date')
      .eq('id', routeId)
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('departure_date');
    expect(data).toHaveProperty('estimated_arrival_date');
  });

  it('schema: bookings has paid_at column (added in migration 040)', async () => {
    const { data, error } = await driverClient
      .from('bookings')
      .select('id, paid_at, payment_status')
      .eq('id', bookingId)
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('paid_at');
    expect(data).toHaveProperty('payment_status');
  });

  it('schema: bookings has payment_type column', async () => {
    const { data, error } = await driverClient
      .from('bookings')
      .select('id, payment_type')
      .eq('id', bookingId)
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('payment_type');
  });
});
