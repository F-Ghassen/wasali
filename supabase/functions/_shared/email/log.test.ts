import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { insertEmailLog, updateEmailLog } from './log.ts';

interface MockCall {
  method: 'insert' | 'update';
  args: unknown;
}

function makeMockSupabase(opts: {
  insertResult?: { data: { id: string } | null; error: unknown };
  updateResult?: { error: unknown };
}) {
  const calls: MockCall[] = [];
  const client = {
    from(_table: string) {
      return {
        insert(args: unknown) {
          calls.push({ method: 'insert', args });
          return {
            select() {
              return {
                single: () =>
                  Promise.resolve(opts.insertResult ?? { data: { id: 'log_1' }, error: null }),
              };
            },
          };
        },
        update(args: unknown) {
          calls.push({ method: 'update', args });
          return {
            eq: () => Promise.resolve(opts.updateResult ?? { error: null }),
          };
        },
      };
    },
  };
  return { client: client as unknown as Parameters<typeof insertEmailLog>[0], calls };
}

Deno.test('insertEmailLog writes a queued row and returns its id', async () => {
  const { client, calls } = makeMockSupabase({});
  const id = await insertEmailLog(client, {
    emailType: 'booking_event',
    recipientEmail: 'user@example.com',
    bookingId: 'booking_1',
  });

  assertEquals(id, 'log_1');
  assertEquals(calls.length, 1);
  const insertArgs = calls[0].args as Record<string, unknown>;
  assertEquals(insertArgs.status, 'queued');
  assertEquals(insertArgs.email_type, 'booking_event');
  assertEquals(insertArgs.recipient_email, 'user@example.com');
  assertEquals(insertArgs.booking_id, 'booking_1');
  assertEquals(insertArgs.route_alert_id, null);
  assertEquals(insertArgs.request_id, null);
});

Deno.test('insertEmailLog returns null (never throws) when the insert fails', async () => {
  const { client } = makeMockSupabase({ insertResult: { data: null, error: new Error('db down') } });
  const id = await insertEmailLog(client, {
    emailType: 'route_alert',
    recipientEmail: 'user@example.com',
  });
  assertEquals(id, null);
});

Deno.test('updateEmailLog transitions queued to sent with providerMessageId and sentAt set', async () => {
  const { client, calls } = makeMockSupabase({});
  await updateEmailLog(client, 'log_1', {
    ok: true,
    providerMessageId: 'msg_123',
    errorDetail: null,
  });

  const updateArgs = calls[0].args as Record<string, unknown>;
  assertEquals(updateArgs.status, 'sent');
  assertEquals(updateArgs.provider_message_id, 'msg_123');
  assertEquals(updateArgs.error_detail, null);
  assertEquals(typeof updateArgs.sent_at, 'string');
});

Deno.test('updateEmailLog transitions queued to failed with error_detail set and sent_at null', async () => {
  const { client, calls } = makeMockSupabase({});
  await updateEmailLog(client, 'log_1', {
    ok: false,
    providerMessageId: null,
    errorDetail: 'Resend rejected the request',
  });

  const updateArgs = calls[0].args as Record<string, unknown>;
  assertEquals(updateArgs.status, 'failed');
  assertEquals(updateArgs.error_detail, 'Resend rejected the request');
  assertEquals(updateArgs.sent_at, null);
});

Deno.test('updateEmailLog is a no-op when logId is null', async () => {
  const { client, calls } = makeMockSupabase({});
  await updateEmailLog(client, null, { ok: true, providerMessageId: 'x', errorDetail: null });
  assertEquals(calls.length, 0);
});

Deno.test('updateEmailLog does not throw when the underlying update call fails', async () => {
  const { client } = makeMockSupabase({ updateResult: { error: new Error('db down') } });
  await updateEmailLog(client, 'log_1', { ok: true, providerMessageId: 'x', errorDetail: null });
  // No assertion needed beyond "did not throw" — awaited above without a catch.
});
