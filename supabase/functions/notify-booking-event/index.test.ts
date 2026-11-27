import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  resolveEvent,
  buildRouteSummary,
  tryInsertNotification,
  trySendPush,
  tryEmailSend,
  type BookingRecord,
} from './index.ts';

function makeRecord(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: 'booking_1',
    status: 'pending',
    route_id: 'route_1',
    sender_id: 'sender_1',
    package_weight_kg: 5,
    price_eur: 20,
    cancellation_reason: null,
    ...overrides,
  };
}

// --- resolveEvent: table-driven over every status/cancellation-reason key ---

Deno.test('resolveEvent maps every EVENT_MAP status to its event', () => {
  const cases: [string, string][] = [
    ['pending', 'new_booking'],
    ['confirmed', 'booking_confirmed'],
    ['in_transit', 'in_transit'],
    ['delivered', 'delivered'],
  ];
  for (const [status, expectedType] of cases) {
    const record = makeRecord({ status });
    const old = makeRecord({ status: 'other' });
    const event = resolveEvent(record, old);
    assertEquals(event?.type, expectedType);
  }
});

Deno.test('resolveEvent maps every CANCELLATION_EVENT_MAP reason to its event', () => {
  const cases: [string, 'driver' | 'sender'][] = [
    ['sender_cancelled', 'driver'],
    ['rejected_by_driver', 'sender'],
    ['route_cancelled', 'sender'],
    ['route_expired', 'sender'],
  ];
  for (const [reason, recipientRole] of cases) {
    const record = makeRecord({ status: 'cancelled', cancellation_reason: reason });
    const old = makeRecord({ status: 'pending' });
    const event = resolveEvent(record, old);
    assertEquals(event?.type, 'booking_cancelled');
    assertEquals(event?.recipientRole, recipientRole);
  }
});

Deno.test('resolveEvent returns weight_adjusted when package_weight_kg changes, ahead of status branch', () => {
  const record = makeRecord({ status: 'confirmed', package_weight_kg: 6 });
  const old = makeRecord({ status: 'confirmed', package_weight_kg: 5 });
  const event = resolveEvent(record, old);
  assertEquals(event?.type, 'weight_adjusted');
});

Deno.test('resolveEvent returns undefined for cancelled with no reason', () => {
  const record = makeRecord({ status: 'cancelled', cancellation_reason: null });
  const old = makeRecord({ status: 'pending' });
  assertEquals(resolveEvent(record, old), undefined);
});

Deno.test('resolveEvent returns undefined for an unrecognized status', () => {
  const record = makeRecord({ status: 'some_future_status' });
  const old = makeRecord({ status: 'pending' });
  assertEquals(resolveEvent(record, old), undefined);
});

// --- buildRouteSummary ---

Deno.test('buildRouteSummary builds "Origin → Destination" from collection/dropoff stops', () => {
  const summary = buildRouteSummary([
    { stop_type: 'collection', stop_order: 0, cities: { name: 'Paris' } },
    { stop_type: 'dropoff', stop_order: 1, cities: { name: 'Tunis' } },
  ]);
  assertEquals(summary, 'Paris → Tunis');
});

Deno.test('buildRouteSummary degrades gracefully when stops are missing', () => {
  assertEquals(buildRouteSummary(null), 'Your shipment');
  assertEquals(buildRouteSummary([]), 'Your shipment');
});

// --- Error isolation regression test: the bug this build fixes ---
// notify-booking-event previously threw on any failed side effect, which
// 500'd the DB webhook and risked Supabase retrying the whole handler —
// re-inserting a notification row that had already succeeded before the
// throw. Each side effect must now be independently soft-failed.

function makeMockSupabase(opts: { notificationInsertError?: unknown }) {
  return {
    from(_table: string) {
      return {
        // Mirrors supabase-js's real builder shape: insert(...) is itself
        // thenable (so `await supabase.from('notifications').insert(...)`
        // works as notify-booking-event uses it), and also exposes
        // .select().single() for insertEmailLog's chained usage.
        insert: (_args: unknown) => {
          const result = { error: opts.notificationInsertError ?? null };
          return {
            then: (resolve: (v: typeof result) => void) => resolve(result),
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'log_1' }, error: null }),
            }),
          };
        },
        update: (_args: unknown) => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    },
    // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test('tryInsertNotification returns false (does not throw) when the insert fails', async () => {
  const supabase = makeMockSupabase({ notificationInsertError: new Error('db down') });
  const record = makeRecord();
  const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
  const ok = await tryInsertNotification(supabase, record, 'recipient_1', event);
  assertEquals(ok, false);
});

Deno.test('tryInsertNotification returns true on success', async () => {
  const supabase = makeMockSupabase({});
  const record = makeRecord();
  const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
  const ok = await tryInsertNotification(supabase, record, 'recipient_1', event);
  assertEquals(ok, true);
});

Deno.test('trySendPush returns false without throwing when there is no push token', async () => {
  const record = makeRecord();
  const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
  const ok = await trySendPush(null, event, record.id);
  assertEquals(ok, false);
});

Deno.test('trySendPush returns false (does not throw) when the Expo push request fails', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response('', { status: 500 }))) as typeof fetch;
  try {
    const record = makeRecord();
    const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
    const ok = await trySendPush('ExponentPushToken[xxx]', event, record.id);
    assertEquals(ok, false);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('trySendPush returns false (does not throw) when fetch itself rejects', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch;
  try {
    const record = makeRecord();
    const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
    const ok = await trySendPush('ExponentPushToken[xxx]', event, record.id);
    assertEquals(ok, false);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('tryEmailSend returns false without throwing when there is no notification_email', async () => {
  const supabase = makeMockSupabase({});
  const record = makeRecord();
  const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
  const ok = await tryEmailSend(supabase, { notification_email: null, full_name: 'Ghassen' }, event, 'A → B', record.id);
  assertEquals(ok, false);
});

Deno.test('tryEmailSend returns false (does not throw) when Resend rejects the send', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response('{}', { status: 500 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase({});
    const record = makeRecord();
    const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
    const ok = await tryEmailSend(
      supabase,
      { notification_email: 'user@example.com', full_name: 'Ghassen' },
      event,
      'A → B',
      record.id
    );
    assertEquals(ok, false);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('tryEmailSend returns true when Resend accepts the send', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase({});
    const record = makeRecord();
    const event = resolveEvent(record, makeRecord({ status: 'other' }))!;
    const ok = await tryEmailSend(
      supabase,
      { notification_email: 'user@example.com', full_name: 'Ghassen' },
      event,
      'A → B',
      record.id
    );
    assertEquals(ok, true);
  } finally {
    globalThis.fetch = original;
  }
});
