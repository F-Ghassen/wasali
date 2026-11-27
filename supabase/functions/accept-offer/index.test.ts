import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  buildRequestSummary,
  tryInsertNotification,
  trySendPush,
  tryEmailSend,
  type RequestCityRef,
} from './index.ts';

function makeMockSupabase(opts: {
  citiesResult?: { data: { id: string; name: string }[] | null };
  notificationInsertError?: unknown;
} = {}) {
  return {
    from(table: string) {
      if (table === 'cities') {
        return {
          select: () => ({
            in: () => Promise.resolve(opts.citiesResult ?? { data: [] }),
          }),
        };
      }
      return {
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

// --- buildRequestSummary ---

Deno.test('buildRequestSummary builds "Origin → Destination" when both city ids are present', async () => {
  const supabase = makeMockSupabase({
    citiesResult: {
      data: [
        { id: 'city_paris', name: 'Paris' },
        { id: 'city_tunis', name: 'Tunis' },
      ],
    },
  });
  const request: RequestCityRef = {
    origin_city_id: 'city_paris',
    destination_city_id: 'city_tunis',
    package_category: 'documents',
  };
  const summary = await buildRequestSummary(supabase, request);
  assertEquals(summary, 'Paris → Tunis');
});

Deno.test('buildRequestSummary falls back to package_category when both city ids are null', async () => {
  const supabase = makeMockSupabase();
  const request: RequestCityRef = {
    origin_city_id: null,
    destination_city_id: null,
    package_category: 'documents',
  };
  const summary = await buildRequestSummary(supabase, request);
  assertEquals(summary, 'documents');
});

// --- Notification / push / email: each independently fault-tolerant ---
// (mirrors notify-booking-event's fix — accept-offer's core mutation must
// never be affected by a notification-side failure, since it has already
// committed by the time these run.)

Deno.test('tryInsertNotification sets request_id and returns true on success', async () => {
  const supabase = makeMockSupabase();
  const ok = await tryInsertNotification(supabase, 'sender_1', 'request_1', 'Your offer was accepted');
  assertEquals(ok, true);
});

Deno.test('tryInsertNotification returns false (does not throw) when the insert fails', async () => {
  const supabase = makeMockSupabase({ notificationInsertError: new Error('db down') });
  const ok = await tryInsertNotification(supabase, 'sender_1', 'request_1', 'Your offer was accepted');
  assertEquals(ok, false);
});

Deno.test('trySendPush returns false without throwing when there is no push token', async () => {
  const ok = await trySendPush(null, 'message', 'request_1');
  assertEquals(ok, false);
});

Deno.test('trySendPush returns false (does not throw) when the Expo push request fails', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response('', { status: 500 }))) as typeof fetch;
  try {
    const ok = await trySendPush('ExponentPushToken[xxx]', 'message', 'request_1');
    assertEquals(ok, false);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('tryEmailSend returns false without throwing when there is no notification_email', async () => {
  const supabase = makeMockSupabase();
  const ok = await tryEmailSend(supabase, { notification_email: null, full_name: 'Sarah' }, 'Paris → Tunis', 'request_1');
  assertEquals(ok, false);
});

Deno.test('tryEmailSend returns true when Resend accepts the send', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const ok = await tryEmailSend(
      supabase,
      { notification_email: 'sarah@example.com', full_name: 'Sarah' },
      'Paris → Tunis',
      'request_1'
    );
    assertEquals(ok, true);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('tryEmailSend returns false (does not throw) when Resend rejects the send', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response('{}', { status: 500 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const ok = await tryEmailSend(
      supabase,
      { notification_email: 'sarah@example.com', full_name: 'Sarah' },
      'Paris → Tunis',
      'request_1'
    );
    assertEquals(ok, false);
  } finally {
    globalThis.fetch = original;
  }
});
