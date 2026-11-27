import { logError } from '../log.ts';
import type { SendEmailInput, SendEmailResult } from './types.ts';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const MAX_ERROR_DETAIL_LENGTH = 2000;

// Never throws — callers treat a failed send as data (ok: false), not an
// exception, so one bad send can't take down an otherwise-successful
// handler (see notify-booking-event's duplicate-notification bug).
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return { ok: false, providerMessageId: null, errorDetail: 'RESEND_API_KEY not configured' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      }),
    });

    const body = await res.json().catch(() => ({}) as Record<string, unknown>);

    if (!res.ok) {
      const errorDetail = JSON.stringify(body).slice(0, MAX_ERROR_DETAIL_LENGTH);
      logError('sendEmail', 'resend_error_response', new Error(errorDetail), {
        status: res.status,
      });
      return { ok: false, providerMessageId: null, errorDetail };
    }

    const providerMessageId = typeof body.id === 'string' ? body.id : null;
    return { ok: true, providerMessageId, errorDetail: null };
  } catch (err) {
    logError('sendEmail', 'fetch_failed', err);
    return {
      ok: false,
      providerMessageId: null,
      errorDetail: err instanceof Error ? err.message.slice(0, MAX_ERROR_DETAIL_LENGTH) : 'Unknown error',
    };
  }
}
