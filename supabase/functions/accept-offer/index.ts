import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email/client.ts';
import { renderTemplate } from '../_shared/email/render.ts';
import { insertEmailLog, updateEmailLog } from '../_shared/email/log.ts';
import { SENDERS } from '../_shared/email/senders.ts';
import { logError, logEvent } from '../_shared/log.ts';

const FN_NAME = 'accept-offer';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { offerId, requestId } = await req.json();

    // 1. Mark accepted offer
    const { data: offer, error: offerError } = await supabase
      .from('shipping_request_offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();

    if (offerError) throw offerError;

    // 2. Decline all other pending offers for this request
    await supabase
      .from('shipping_request_offers')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('request_id', requestId)
      .eq('status', 'pending')
      .neq('id', offerId);

    // 3. Mark request as offer_accepted
    await supabase
      .from('shipping_requests')
      .update({ status: 'offer_accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    // 4. Notify the requester. Soft-failed and awaited synchronously (same
    // shape as notify-booking-event's fix) — a failed notification must
    // never roll back or fail the offer-acceptance mutation itself, which
    // has already committed above.
    await notifyRequester(supabase, requestId, offer.proposed_price_eur);

    return new Response(
      JSON.stringify({ success: true, offer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError(FN_NAME, 'unhandled_error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function notifyRequester(
  supabase: SupabaseClient,
  requestId: string,
  proposedPriceEur: number
): Promise<void> {
  try {
    const { data: request, error: requestError } = await supabase
      .from('shipping_requests')
      .select('sender_id, origin_city_id, destination_city_id, package_category')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      logEvent(FN_NAME, 'request_not_found_for_notification', { requestId });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, push_token, notification_email, full_name')
      .eq('id', request.sender_id)
      .single();

    if (profileError || !profile) {
      logEvent(FN_NAME, 'profile_not_found_for_notification', { requestId, senderId: request.sender_id });
      return;
    }

    const requestSummary = await buildRequestSummary(supabase, request);
    const message = `Your offer of €${proposedPriceEur.toFixed(2)} was accepted for ${requestSummary}`;

    await tryInsertNotification(supabase, request.sender_id, requestId, message);
    await trySendPush(profile.push_token, message, requestId);
    await tryEmailSend(supabase, profile, requestSummary, requestId);
  } catch (err) {
    logError(FN_NAME, 'notify_requester_failed', err, { requestId });
  }
}

export interface RequestCityRef {
  origin_city_id: string | null;
  destination_city_id: string | null;
  package_category: string;
}

export async function buildRequestSummary(
  supabase: SupabaseClient,
  request: RequestCityRef
): Promise<string> {
  const cityIds = [request.origin_city_id, request.destination_city_id].filter(
    (id): id is string => Boolean(id)
  );
  if (cityIds.length === 0) return request.package_category;

  const { data: cities } = await supabase.from('cities').select('id, name').in('id', cityIds);
  const originName = cities?.find((c) => c.id === request.origin_city_id)?.name ?? 'Unknown';
  const destinationName = cities?.find((c) => c.id === request.destination_city_id)?.name ?? 'Unknown';

  return `${originName} → ${destinationName}`;
}

export async function tryInsertNotification(
  supabase: SupabaseClient,
  senderId: string,
  requestId: string,
  message: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: senderId,
      request_id: requestId,
      type: 'offer_accepted',
      message,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    logError(FN_NAME, 'notification_insert_failed', err, { requestId, senderId });
    return false;
  }
}

export async function trySendPush(
  pushToken: string | null,
  message: string,
  requestId: string
): Promise<boolean> {
  if (!pushToken) return false;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: 'Wasali',
        body: message,
        data: { requestId },
      }),
    });
    if (!res.ok) throw new Error(`Expo push responded ${res.status}`);
    return true;
  } catch (err) {
    logError(FN_NAME, 'push_send_failed', err, { requestId });
    return false;
  }
}

export interface RecipientProfile {
  notification_email: string | null;
  full_name: string | null;
}

export async function tryEmailSend(
  supabase: SupabaseClient,
  profile: RecipientProfile,
  requestSummary: string,
  requestId: string
): Promise<boolean> {
  const emailTo = profile.notification_email;
  if (!emailTo) return false;

  let logId: string | null = null;
  try {
    const offerUrl = `https://wasali.app/requests/${requestId}`;
    const { subject, html } = await renderTemplate({
      type: 'offer_accepted',
      subject: 'Your offer was accepted!',
      props: {
        recipientName: profile.full_name ?? 'User',
        requestSummary,
        offerUrl,
      },
    });

    logId = await insertEmailLog(supabase, {
      emailType: 'offer_accepted',
      recipientEmail: emailTo,
      requestId,
    });

    const result = await sendEmail({
      from: SENDERS.offer_accepted.from,
      to: emailTo,
      subject,
      html,
    });

    await updateEmailLog(supabase, logId, result);

    if (!result.ok) {
      logError(FN_NAME, 'email_send_failed', new Error(result.errorDetail ?? 'unknown'), { requestId });
    }
    return result.ok;
  } catch (err) {
    logError(FN_NAME, 'email_attempt_threw', err, { requestId });
    return false;
  }
}
