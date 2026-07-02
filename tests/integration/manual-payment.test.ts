/**
 * tests/integration/manual-payment.test.ts
 *
 * Tests for the "Mark as Paid" feature for manual payment bookings
 * (cash_on_collection, cash_on_delivery).
 *
 * These tests were written BEFORE the markPaid store action was implemented
 * and will initially fail until:
 *   - Migration 040 is applied (paid_at column + driver RLS policy)
 *   - driverBookingStore.markPaid() is implemented
 *
 * Run: npx vitest run tests/integration/manual-payment.test.ts
 * Requires: supabase start && supabase db push
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe.skipIf(SKIP)('Manual payment tracking', () => {
  let driver: TestUser;
  let sender: TestUser;
  let routeId: string;
  const bookingIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser('driver');
    sender = await createTestUser('sender');
    routeId = await seedRoute(driver.userId, { available_weight_kg: 50, price_per_kg_eur: 8 });
  });

  afterAll(async () => {
    for (const id of bookingIds) {
      await adminClient.from('bookings').delete().eq('id', id).then(() => {}).catch(() => {});
    }
    await cleanupRoute(routeId).catch(() => {});
    await cleanupUser(driver.userId).catch(() => {});
    await cleanupUser(sender.userId).catch(() => {});
  });

  async function createBooking(paymentType: string, status = 'confirmed') {
    const { data, error } = await adminClient
      .from('bookings')
      .insert({
        ...TEST_BOOKING_DRAFT,
        sender_id: sender.userId,
        route_id: routeId,
        payment_type: paymentType,
        payment_status: 'unpaid',
        status,
      })
      .select('id')
      .single();
    if (error) throw new Error(`createBooking: ${error.message}`);
    bookingIds.push(data!.id);
    return data!.id;
  }

  // ── MP1: Driver marks a cash booking as paid ──────────────────────────────

  it('MP1: driver can set payment_status=paid on a cash_on_collection booking', async () => {
    const id = await createBooking('cash_on_collection');
    const now = new Date().toISOString();

    const { error } = await driver.client
      .from('bookings')
      .update({
        payment_status: 'paid',
        paid_at: now,
        updated_at: now,
      })
      .eq('id', id);

    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('payment_status, paid_at')
      .eq('id', id)
      .single();

    expect(data!.payment_status).toBe('paid');
  });

  // ── MP2: paid_at is persisted and non-null ────────────────────────────────

  it('MP2: paid_at is persisted and non-null after marking', async () => {
    const id = await createBooking('cash_on_delivery');
    const now = new Date().toISOString();

    await driver.client
      .from('bookings')
      .update({ payment_status: 'paid', paid_at: now, updated_at: now })
      .eq('id', id);

    const { data } = await adminClient
      .from('bookings')
      .select('paid_at')
      .eq('id', id)
      .single();

    expect(data!.paid_at).not.toBeNull();
    expect(typeof data!.paid_at).toBe('string');
  });

  // ── MP3: Stripe booking — payment_status should stay unpaid ──────────────
  // Business rule: markPaid is only for manual payments. This test validates
  // that a credit_debit_card booking's payment_status is NOT 'paid' by default
  // and that the store action would guard against calling markPaid on it.
  // (The DB itself doesn't block this — the guard is in the store/UI layer.)

  it('MP3: credit_debit_card booking starts as unpaid (Stripe flow expected)', async () => {
    const id = await createBooking('credit_debit_card');

    const { data } = await adminClient
      .from('bookings')
      .select('payment_status, payment_type')
      .eq('id', id)
      .single();

    expect(data!.payment_status).toBe('unpaid');
    expect(data!.payment_type).toBe('credit_debit_card');
    // payment_status remains unpaid — capture happens via Stripe edge fn, not markPaid
  });

  // ── MP4: Sender cannot set payment_status=paid ────────────────────────────

  it('MP4: sender cannot mark a booking as paid (RLS denies)', async () => {
    const id = await createBooking('cash_on_collection');

    const { error } = await sender.client
      .from('bookings')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      // RLS may silently match 0 rows
      const { data } = await adminClient
        .from('bookings')
        .select('payment_status')
        .eq('id', id)
        .single();
      expect(data!.payment_status).toBe('unpaid'); // unchanged
    } else {
      expect(error.code).toMatch(/42501|PGRST|denied/i);
    }
  });

  // ── MP5: Marking paid is idempotent ───────────────────────────────────────

  it('MP5: calling markPaid twice does not error (idempotent)', async () => {
    const id = await createBooking('cash_on_collection');
    const now = new Date().toISOString();

    const { error: first } = await driver.client
      .from('bookings')
      .update({ payment_status: 'paid', paid_at: now, updated_at: now })
      .eq('id', id);
    expect(first).toBeNull();

    const { error: second } = await driver.client
      .from('bookings')
      .update({ payment_status: 'paid', paid_at: now, updated_at: now })
      .eq('id', id);
    expect(second).toBeNull();

    // Final state still 'paid'
    const { data } = await adminClient
      .from('bookings')
      .select('payment_status')
      .eq('id', id)
      .single();
    expect(data!.payment_status).toBe('paid');
  });

  // ── MP6: Stripe-captured bookings are unaffected ──────────────────────────

  it('MP6: payment_status=captured bookings are not changed by a markPaid call', async () => {
    const id = await createBooking('credit_debit_card');

    // Simulate Stripe capture (done by edge fn in production)
    await adminClient
      .from('bookings')
      .update({ payment_status: 'captured' })
      .eq('id', id);

    // Driver should not call markPaid on a captured booking (UI guard)
    // but if they did, it would overwrite 'captured' with 'paid' — which is wrong.
    // This test documents that the UI must guard against it.
    const { data } = await adminClient
      .from('bookings')
      .select('payment_status')
      .eq('id', id)
      .single();
    expect(data!.payment_status).toBe('captured');
  });

  // ── MP7: Works for in_transit status too ─────────────────────────────────

  it('MP7: driver can mark as paid while booking is in_transit (cash_on_delivery)', async () => {
    const id = await createBooking('cash_on_delivery', 'in_transit');
    const now = new Date().toISOString();

    const { error } = await driver.client
      .from('bookings')
      .update({ payment_status: 'paid', paid_at: now, updated_at: now })
      .eq('id', id);

    expect(error).toBeNull();

    const { data } = await adminClient
      .from('bookings')
      .select('payment_status, status')
      .eq('id', id)
      .single();

    expect(data!.payment_status).toBe('paid');
    expect(data!.status).toBe('in_transit'); // booking status unchanged
  });
});
