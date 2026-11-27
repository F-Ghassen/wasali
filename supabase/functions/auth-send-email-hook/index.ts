import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Webhook } from 'npm:standardwebhooks@1';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email/client.ts';
import { renderTemplate } from '../_shared/email/render.ts';
import { insertEmailLog, updateEmailLog } from '../_shared/email/log.ts';
import { SENDERS } from '../_shared/email/senders.ts';
import { logError, logEvent } from '../_shared/log.ts';
import type { EmailType } from '../_shared/email/types.ts';

const FN_NAME = 'auth-send-email-hook';

// GoTrue rejects hook responses whose Content-Type isn't application/json
// (error_code: hook_payload_invalid_content_type) — Response defaults to
// text/plain when only a stringified body is passed, so every reply here
// needs this header set explicitly, including on the success path.
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface SendEmailHookPayload {
  user: {
    id: string;
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
}

// Supabase calls this hook instead of sending its own email once
// [auth.hook.send_email] is registered — this maps each action type this
// build supports to a rendered template. Unrecognized action types fail
// closed (no silent drop of an auth email Supabase expected to be sent).
export const SUPPORTED_ACTIONS: Record<string, EmailType> = {
  signup: 'auth_signup_confirmation',
  recovery: 'auth_password_reset',
};

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  if (!hookSecret) {
    logError(FN_NAME, 'hook_secret_not_configured', new Error('SEND_EMAIL_HOOK_SECRET not set'));
    return jsonResponse({ error: 'Hook not configured' }, 500);
  }

  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  const verified = verifyPayload(hookSecret, payloadText, headers);
  if (!verified) {
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  return await handleVerifiedPayload(supabase, verified);
});

// Isolated from the handler so a signature-verification unit test doesn't
// need to construct a real HTTP Request or stand up a Supabase client.
export function verifyPayload(
  hookSecret: string,
  payloadText: string,
  headers: Record<string, string>
): SendEmailHookPayload | null {
  try {
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''));
    return wh.verify(payloadText, headers) as SendEmailHookPayload;
  } catch (err) {
    logError(FN_NAME, 'signature_verification_failed', err);
    return null;
  }
}

export async function handleVerifiedPayload(
  supabase: SupabaseClient,
  verified: SendEmailHookPayload
): Promise<Response> {
  const { user, email_data } = verified;
  const emailType = SUPPORTED_ACTIONS[email_data.email_action_type];

  if (!emailType) {
    logError(
      FN_NAME,
      'unsupported_action_type',
      new Error(`No template registered for email_action_type: ${email_data.email_action_type}`),
      { actionType: email_data.email_action_type }
    );
    return jsonResponse(
      { error: `Unsupported email_action_type: ${email_data.email_action_type}` },
      400
    );
  }

  const actionUrl = buildActionUrl(email_data);

  try {
    const { subject, html } = await renderTemplate(
      emailType === 'auth_signup_confirmation'
        ? { type: 'auth_signup_confirmation', subject: 'Confirm your email', props: { confirmationUrl: actionUrl } }
        : { type: 'auth_password_reset', subject: 'Reset your password', props: { resetUrl: actionUrl } }
    );

    const logId = await insertEmailLog(supabase, {
      emailType,
      recipientEmail: user.email,
      userId: user.id,
    });

    const result = await sendEmail({
      from: SENDERS[emailType].from,
      to: user.email,
      subject,
      html,
    });

    await updateEmailLog(supabase, logId, result);

    if (!result.ok) {
      logError(FN_NAME, 'email_send_failed', new Error(result.errorDetail ?? 'unknown'), {
        actionType: email_data.email_action_type,
      });
      return jsonResponse({ error: 'Failed to send email' }, 500);
    }

    logEvent(FN_NAME, 'email_sent', { actionType: email_data.email_action_type });
    return jsonResponse({}, 200);
  } catch (err) {
    logError(FN_NAME, 'unhandled_error', err, { actionType: email_data.email_action_type });
    return jsonResponse({ error: 'Internal error' }, 500);
  }
}

export function buildActionUrl(emailData: SendEmailHookPayload['email_data']): string {
  const params = new URLSearchParams({
    // GoTrue's GET /verify reads the hash from `token` (not `token_hash`) —
    // the same param name Supabase's own default templates use. Sending
    // `token_hash` returns 400 "Verify requires a token or a token hash".
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  });
  // GoTrue sends site_url with the /auth/v1 prefix already included in some
  // setups, so strip it before appending the verify path — otherwise the
  // link becomes /auth/v1/auth/v1/verify and 404s.
  const projectUrl = emailData.site_url.replace(/\/+$/, '').replace(/\/auth\/v1$/, '');
  return `${projectUrl}/auth/v1/verify?${params.toString()}`;
}
