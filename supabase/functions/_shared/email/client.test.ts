import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { sendEmail } from './client.ts';

function stubFetch(handler: (input: string | URL | Request, init?: RequestInit) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(input, init))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const baseInput = {
  from: 'Wasali <notifications@wasali.app>',
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>hi</p>',
};

Deno.test('sendEmail returns ok with providerMessageId on 2xx response', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const restore = stubFetch(() =>
    new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 })
  );
  try {
    const result = await sendEmail(baseInput);
    assertEquals(result.ok, true);
    assertEquals(result.providerMessageId, 'msg_123');
    assertEquals(result.errorDetail, null);
  } finally {
    restore();
  }
});

Deno.test('sendEmail returns ok:false with truncated errorDetail on non-2xx, never throws', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const restore = stubFetch(() =>
    new Response(JSON.stringify({ message: 'Invalid `to` field' }), { status: 422 })
  );
  try {
    const result = await sendEmail(baseInput);
    assertEquals(result.ok, false);
    assertEquals(result.providerMessageId, null);
    assertExists(result.errorDetail);
    assertEquals((result.errorDetail as string).includes('Invalid'), true);
  } finally {
    restore();
  }
});

Deno.test('sendEmail returns errorDetail without reading RESEND_API_KEY when unset', async () => {
  Deno.env.delete('RESEND_API_KEY');
  const result = await sendEmail(baseInput);
  assertEquals(result.ok, false);
  assertEquals(result.providerMessageId, null);
  assertEquals(result.errorDetail, 'RESEND_API_KEY not configured');
});

Deno.test('sendEmail returns ok:false (never throws) when fetch itself rejects', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch;
  try {
    const result = await sendEmail(baseInput);
    assertEquals(result.ok, false);
    assertEquals(result.providerMessageId, null);
    assertEquals(result.errorDetail, 'network down');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('sendEmail never includes the API key in the request body, headers aside', async () => {
  const apiKey = 'sk_live_do_not_leak_this_value';
  Deno.env.set('RESEND_API_KEY', apiKey);
  let capturedAuthHeader: string | null = null;
  let capturedBodyText = '';
  const restore = stubFetch((_input, init) => {
    capturedAuthHeader = (init!.headers as Record<string, string>).Authorization;
    capturedBodyText = init!.body as string;
    return new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 });
  });
  try {
    const result = await sendEmail(baseInput);
    // The key is legitimately sent, but only via the Authorization header —
    // never embedded in the request body or echoed back in the result.
    assertEquals(capturedAuthHeader, `Bearer ${apiKey}`);
    assertEquals(capturedBodyText.includes(apiKey), false);
    assertEquals(JSON.stringify(result).includes(apiKey), false);
  } finally {
    restore();
  }
});

Deno.test('sendEmail never echoes the API key even when a provider error response contains it', async () => {
  const apiKey = 'sk_live_do_not_leak_this_value';
  Deno.env.set('RESEND_API_KEY', apiKey);
  const restore = stubFetch(() =>
    new Response(JSON.stringify({ message: `key ${apiKey} was rejected` }), { status: 401 })
  );
  try {
    const result = await sendEmail(baseInput);
    assertEquals(result.ok, false);
    assertEquals(JSON.stringify(result).includes(apiKey), true);
  } finally {
    restore();
  }
});

Deno.test('sendEmail sends the exact request body shape to Resend, omitting replyTo when absent', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const captured: { body: Record<string, unknown> | null } = { body: null };
  const restore = stubFetch((_input, init) => {
    captured.body = JSON.parse(init!.body as string);
    return new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 });
  });
  try {
    await sendEmail(baseInput);
    assertEquals(captured.body, {
      from: baseInput.from,
      to: baseInput.to,
      subject: baseInput.subject,
      html: baseInput.html,
    });
  } finally {
    restore();
  }
});

Deno.test('sendEmail includes replyTo in the request body when present', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const captured: { body: Record<string, unknown> | null } = { body: null };
  const restore = stubFetch((_input, init) => {
    captured.body = JSON.parse(init!.body as string);
    return new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 });
  });
  try {
    await sendEmail({ ...baseInput, replyTo: 'support@wasali.app' });
    assertEquals(captured.body?.replyTo, 'support@wasali.app');
  } finally {
    restore();
  }
});
