/**
 * tests/integration/tracking-realtime.test.ts
 *
 * Tests the Supabase Realtime subscription used by the tracking screen.
 * Verifies that status changes on the bookings table are received via the
 * postgres_changes channel.
 *
 * Requires `supabase start` with Realtime enabled (default).
 * Run: npx vitest run tests/integration/tracking-realtime.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  adminClient,
  createTestUser,
  cleanupUser,
  seedRoute,
  cleanupRoute,
  TEST_BOOKING_DRAFT,
  type TestUser,
} from '../helpers';
import type { Database } from '../../types/database';

const SKIP = process.env.SKIP_INTEGRATION === 'true';

const LOCAL_URL =
  process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';

const LOCAL_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.UZBKN53oO-hcH6q6YJVJVKDgJp1vmBt2g1MWVQkmCco';

describe.skipIf(SKIP)('Tracking realtime (integration)', () => {
  let driver: TestUser;
  let sender: TestUser;
  let routeId: string;
  let bookingId: string;

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');
    routeId = await seedRoute(driver.userId);

    const { data, error } = await adminClient
      .from('bookings')
      .insert({
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: routeId,
        status: 'confirmed',
      })
      .select('id')
      .single();
    if (error) throw new Error(`booking seed failed: ${error.message}`);
    bookingId = data!.id;
  });

  afterAll(async () => {
    try { await adminClient.from('bookings').delete().eq('id', bookingId); } catch {}
    await cleanupRoute(routeId).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  // ── Helper: wait for a realtime event with a timeout ─────────────────────

  function waitForRealtimeUpdate(
    realtimeClient: ReturnType<typeof createClient<Database>>,
    targetBookingId: string,
    expectedStatus: string,
    timeoutMs = 5000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout: did not receive status=${expectedStatus} within ${timeoutMs}ms`)),
        timeoutMs
      );

      const channel = realtimeClient
        .channel(`booking-tracking-test-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${targetBookingId}`,
          },
          (payload) => {
            const newStatus = (payload.new as { status: string }).status;
            if (newStatus === expectedStatus) {
              clearTimeout(timer);
              realtimeClient.removeChannel(channel);
              resolve(newStatus);
            }
          }
        )
        .subscribe();
    });
  }

  // ── 1. Receive in_transit update ──────────────────────────────────────────

  it('sender tracking subscription receives in_transit status change', async () => {
    const realtimeClient = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { timeout: 5000 },
    });
    await realtimeClient.auth.setSession({
      access_token: (await sender.client.auth.getSession()).data.session!.access_token,
      refresh_token: '',
    });

    const receivedStatus = waitForRealtimeUpdate(realtimeClient, bookingId, 'in_transit');

    // Give the subscription time to connect, then trigger the update
    await new Promise((r) => setTimeout(r, 500));
    await adminClient
      .from('bookings')
      .update({ status: 'in_transit', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    await expect(receivedStatus).resolves.toBe('in_transit');
  });

  // ── 2. Receive delivered update ───────────────────────────────────────────

  it('sender tracking subscription receives delivered status change', async () => {
    const realtimeClient = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { timeout: 5000 },
    });
    await realtimeClient.auth.setSession({
      access_token: (await sender.client.auth.getSession()).data.session!.access_token,
      refresh_token: '',
    });

    const receivedStatus = waitForRealtimeUpdate(realtimeClient, bookingId, 'delivered');

    await new Promise((r) => setTimeout(r, 500));
    await adminClient
      .from('bookings')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    await expect(receivedStatus).resolves.toBe('delivered');
  });

  // ── 3. stepStatus utility — all transitions ───────────────────────────────
  //
  // This is the pure logic extracted from tracking/[bookingId].tsx.
  // Duplicated here so integration test file is self-contained.

  type TrackingStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'rated';
  const STATUS_ORDER: TrackingStatus[] = ['confirmed', 'in_transit', 'delivered', 'rated'];

  function stepStatus(
    stepKey: TrackingStatus,
    currentStatus: TrackingStatus
  ): 'done' | 'current' | 'pending' {
    const stepIdx = STATUS_ORDER.indexOf(stepKey);
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    if (currentStatus === 'pending') return 'pending';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  }

  it('stepStatus reflects confirmed status correctly', () => {
    expect(stepStatus('confirmed', 'confirmed')).toBe('current');
    expect(stepStatus('in_transit', 'confirmed')).toBe('pending');
    expect(stepStatus('delivered', 'confirmed')).toBe('pending');
  });

  it('stepStatus reflects in_transit status correctly', () => {
    expect(stepStatus('confirmed', 'in_transit')).toBe('done');
    expect(stepStatus('in_transit', 'in_transit')).toBe('current');
    expect(stepStatus('delivered', 'in_transit')).toBe('pending');
  });

  it('stepStatus reflects delivered status correctly', () => {
    expect(stepStatus('confirmed', 'delivered')).toBe('done');
    expect(stepStatus('in_transit', 'delivered')).toBe('done');
    expect(stepStatus('delivered', 'delivered')).toBe('current');
    expect(stepStatus('rated', 'delivered')).toBe('pending');
  });
});
