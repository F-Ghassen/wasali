import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError } from '../log.ts';
import type { EmailLogRef, EmailType, SendEmailResult } from './types.ts';

export interface InsertEmailLogInput extends EmailLogRef {
  emailType: EmailType;
  recipientEmail: string;
}

// Insert a `queued` row before calling sendEmail() so a mid-flight crash
// (network partition, function killed) still leaves an observable record
// of the attempt, instead of silent data loss. Returns null (never throws)
// if the insert itself fails — the caller proceeds with the send regardless,
// since a broken log must never block a real email from going out.
export async function insertEmailLog(
  supabase: SupabaseClient,
  input: InsertEmailLogInput
): Promise<string | null> {
  const { data, error } = await supabase
    .from('email_log')
    .insert({
      email_type: input.emailType,
      recipient_email: input.recipientEmail,
      user_id: input.userId ?? null,
      booking_id: input.bookingId ?? null,
      route_alert_id: input.routeAlertId ?? null,
      request_id: input.requestId ?? null,
      status: 'queued',
    })
    .select('id')
    .single();

  if (error || !data) {
    logError('insertEmailLog', 'insert_failed', error);
    return null;
  }
  return data.id as string;
}

// Updates a queued row to its final state. Never throws — a logging
// failure must not surface as an email-send failure to the caller.
export async function updateEmailLog(
  supabase: SupabaseClient,
  logId: string | null,
  result: SendEmailResult
): Promise<void> {
  if (!logId) return;

  const { error } = await supabase
    .from('email_log')
    .update({
      status: result.ok ? 'sent' : 'failed',
      provider_message_id: result.providerMessageId,
      error_detail: result.errorDetail,
      sent_at: result.ok ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId);

  if (error) {
    logError('updateEmailLog', 'update_failed', error, { logId });
  }
}
