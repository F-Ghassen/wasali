import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { Webhook } from 'npm:standardwebhooks@1';
import {
  verifyPayload,
  handleVerifiedPayload,
  buildActionUrl,
  SUPPORTED_ACTIONS,
  type SendEmailHookPayload,
} from './index.ts';

const TEST_SECRET_BASE64 = 'MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'; // arbitrary base64, test-only
const HOOK_SECRET = `v1,whsec_${TEST_SECRET_BASE64}`;

function makePayload(overrides: Partial<SendEmailHookPayload['email_data']> = {}): SendEmailHookPayload {
  return {
    user: { id: 'user_1', email: 'user@example.com' },
    email_data: {
      token: '123456',
      token_hash: 'hash_abc',
      redirect_to: 'https://wasali.app/',
      email_action_type: 'signup',
      site_url: 'https://cxlxlisfvbfqtysgnklu.supabase.co',
      token_new: '',
      token_hash_new: '',
      ...overrides,
    },
  };
}

function signPayload(payload: SendEmailHookPayload): { body: string; headers: Record<string, string> } {
  const wh = new Webhook(TEST_SECRET_BASE64);
  const body = JSON.stringify(payload);
  const id = 'msg_test_1';
  const timestamp = new Date();
  const signature = wh.sign(id, timestamp, body);
  return {
    body,
    headers: {
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'webhook-signature': signature,
    },
  };
}

// --- Signature verification ---

Deno.test('verifyPayload accepts a validly-signed payload', () => {
  const payload = makePayload();
  const { body, headers } = signPayload(payload);
  const verified = verifyPayload(HOOK_SECRET, body, headers);
  assertEquals(verified?.user.email, 'user@example.com');
  assertEquals(verified?.email_data.email_action_type, 'signup');
});

Deno.test('verifyPayload rejects a payload with no signature headers', () => {
  const payload = makePayload();
  const body = JSON.stringify(payload);
  const verified = verifyPayload(HOOK_SECRET, body, {});
  assertEquals(verified, null);
});

Deno.test('verifyPayload rejects a payload signed with the wrong secret', () => {
  const payload = makePayload();
  const wrongWh = new Webhook('differentSecretBase64ThatWontMatch12');
  const body = JSON.stringify(payload);
  const id = 'msg_test_2';
  const timestamp = new Date();
  const signature = wrongWh.sign(id, timestamp, body);
  const verified = verifyPayload(HOOK_SECRET, body, {
    'webhook-id': id,
    'webhook-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
    'webhook-signature': signature,
  });
  assertEquals(verified, null);
});

Deno.test('verifyPayload rejects a tampered body even with a signature present', () => {
  const payload = makePayload();
  const { headers } = signPayload(payload);
  const tamperedBody = JSON.stringify({ ...payload, user: { ...payload.user, email: 'attacker@evil.com' } });
  const verified = verifyPayload(HOOK_SECRET, tamperedBody, headers);
  assertEquals(verified, null);
});

// --- Action type dispatch ---

function makeMockSupabase() {
  return {
    from(_table: string) {
      return {
        insert: (_args: unknown) => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'log_1' }, error: null }),
          }),
        }),
        update: (_args: unknown) => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    },
    // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test('SUPPORTED_ACTIONS covers signup and recovery', () => {
  assertEquals(SUPPORTED_ACTIONS.signup, 'auth_signup_confirmation');
  assertEquals(SUPPORTED_ACTIONS.recovery, 'auth_password_reset');
});

Deno.test('handleVerifiedPayload dispatches signup to the confirmation template and returns 200 on success', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const res = await handleVerifiedPayload(supabase, makePayload({ email_action_type: 'signup' }));
    assertEquals(res.status, 200);
    // GoTrue rejects hook responses whose Content-Type isn't application/json
    // (error_code: hook_payload_invalid_content_type) and Response defaults
    // to text/plain when only a stringified body is passed — this went
    // unasserted on every response path here until a production signup/
    // recovery email silently failed to ever be reported as sent (2026-07-28).
    assertStringIncludes(res.headers.get('content-type') ?? '', 'application/json');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('handleVerifiedPayload dispatches recovery to the password reset template and returns 200 on success', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const res = await handleVerifiedPayload(supabase, makePayload({ email_action_type: 'recovery' }));
    assertEquals(res.status, 200);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('handleVerifiedPayload fails closed (400, no send attempted) for an unsupported action type', async () => {
  const supabase = makeMockSupabase();
  const res = await handleVerifiedPayload(supabase, makePayload({ email_action_type: 'magiclink' }));
  assertEquals(res.status, 400);
  assertStringIncludes(res.headers.get('content-type') ?? '', 'application/json');
  const body = await res.json();
  assertStringIncludes(body.error, 'magiclink');
});

Deno.test('handleVerifiedPayload returns 500 when the send itself fails', async () => {
  Deno.env.set('RESEND_API_KEY', 'test-key');
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response('{}', { status: 500 }))) as typeof fetch;
  try {
    const supabase = makeMockSupabase();
    const res = await handleVerifiedPayload(supabase, makePayload({ email_action_type: 'signup' }));
    assertEquals(res.status, 500);
    assertStringIncludes(res.headers.get('content-type') ?? '', 'application/json');
  } finally {
    globalThis.fetch = original;
  }
});

// --- buildActionUrl ---

Deno.test('buildActionUrl builds a verify URL with token_hash, type, and redirect_to', () => {
  const url = buildActionUrl({
    token: '123456',
    token_hash: 'hash_abc',
    redirect_to: 'https://wasali.app/',
    email_action_type: 'signup',
    site_url: 'https://cxlxlisfvbfqtysgnklu.supabase.co',
    token_new: '',
    token_hash_new: '',
  });
  assertStringIncludes(url, 'https://cxlxlisfvbfqtysgnklu.supabase.co/auth/v1/verify?');
  assertStringIncludes(url, 'token_hash=hash_abc');
  assertStringIncludes(url, 'type=signup');
});
