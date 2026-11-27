import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { sendAlertsEmails, type RouteInfo, type AlertMatch } from './index.ts';

function makeRoute(overrides: Partial<RouteInfo> = {}): RouteInfo {
  return {
    id: 'route_1',
    originCityId: 'city_paris',
    destinationCityId: 'city_tunis',
    originCityName: 'Paris',
    destinationCityName: 'Tunis',
    price_per_kg_eur: 4.5,
    departure_date: '2026-08-01',
    driver_id: 'driver_1',
    ...overrides,
  };
}

function makeMockSupabase() {
  return {
    from(_table: string) {
      return {
        insert: (_args: unknown) => {
          const result = { error: null };
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

Deno.test('sendAlertsEmails returns 0 and sends nothing when no alerts have an email', async () => {
  const supabase = makeMockSupabase();
  const alerts: AlertMatch[] = [{ id: 'a1', email: null, user_id: 'u1' }];
  const count = await sendAlertsEmails(supabase, makeRoute(), alerts);
  assertEquals(count, 0);
});

Deno.test('sendAlertsEmails isolates per-recipient failures: one bad send does not block the rest of the batch', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  let call = 0;
  globalThis.fetch = ((_input: string | URL | Request, _init?: RequestInit) => {
    call++;
    // First recipient fails, second and third succeed.
    if (call === 1) {
      return Promise.resolve(new Response('{}', { status: 500 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ id: `msg_${call}` }), { status: 200 }));
  }) as typeof fetch;

  try {
    const supabase = makeMockSupabase();
    const alerts: AlertMatch[] = [
      { id: 'a1', email: 'bad@example.com', user_id: null },
      { id: 'a2', email: 'good1@example.com', user_id: null },
      { id: 'a3', email: 'good2@example.com', user_id: null },
    ];
    const count = await sendAlertsEmails(supabase, makeRoute(), alerts);
    // Only the 2 successful sends are counted — the first recipient's
    // failure didn't stop the loop from attempting the other two.
    assertEquals(count, 2);
    assertEquals(call, 3);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('sendAlertsEmails does not throw when a send attempt itself throws', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const alerts: AlertMatch[] = [{ id: 'a1', email: 'user@example.com', user_id: null }];
    const count = await sendAlertsEmails(supabase, makeRoute(), alerts);
    assertEquals(count, 0);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('sendAlertsEmails only counts recipients whose send succeeded', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const alerts: AlertMatch[] = [
      { id: 'a1', email: 'user1@example.com', user_id: null },
      { id: 'a2', email: 'user2@example.com', user_id: 'u2' },
    ];
    const count = await sendAlertsEmails(supabase, makeRoute(), alerts);
    assertEquals(count, 2);
  } finally {
    globalThis.fetch = original;
  }
});
