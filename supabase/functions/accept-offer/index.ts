import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    return new Response(
      JSON.stringify({ success: true, offer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
