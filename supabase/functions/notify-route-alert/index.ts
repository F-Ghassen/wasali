import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email/client.ts";
import { renderTemplate } from "../_shared/email/render.ts";
import { insertEmailLog, updateEmailLog } from "../_shared/email/log.ts";
import { SENDERS } from "../_shared/email/senders.ts";
import { logError, logEvent } from "../_shared/log.ts";

const FN_NAME = "notify-route-alert";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface RouteInfo {
  id: string;
  originCityId: string;
  destinationCityId: string;
  originCityName: string;
  destinationCityName: string;
  price_per_kg_eur: number | null;
  departure_date: string | null;
  driver_id: string;
}

export interface AlertMatch {
  id: string;
  email: string | null;
  user_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { routeId } = await req.json();

    if (!routeId) {
      return new Response(
        JSON.stringify({ error: "routeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const route = await loadRouteInfo(supabase, routeId);

    if (!route) {
      logEvent(FN_NAME, "route_not_found_or_inactive", { routeId });
      return new Response(
        JSON.stringify({ error: "Route not found or not active" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logEvent(FN_NAME, "route_loaded", {
      routeId,
      origin: route.originCityName,
      destination: route.destinationCityName,
    });

    const matchedAlerts = await findMatchingAlerts(supabase, route);

    if (matchedAlerts.length === 0) {
      logEvent(FN_NAME, "no_matching_alerts", { routeId });
      return new Response(
        JSON.stringify({ message: "No matching alerts found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logEvent(FN_NAME, "alerts_matched", { routeId, count: matchedAlerts.length });

    const emailsSent = await sendAlertsEmails(supabase, route, matchedAlerts);
    await createUserNotifications(supabase, route, matchedAlerts);

    return new Response(
      JSON.stringify({
        message: "Alerts sent successfully",
        emailsSent,
        alertsMatched: matchedAlerts.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logError(FN_NAME, "unhandled_error", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Load the published route plus its origin/destination city IDs and names,
// derived from route_stops (routes itself has no city columns).
export async function loadRouteInfo(
  supabase: SupabaseClient,
  routeId: string
): Promise<RouteInfo | null> {
  const { data: route, error: routeError } = await supabase
    .from("routes")
    .select("id, price_per_kg_eur, departure_date, driver_id, status")
    .eq("id", routeId)
    .eq("status", "active")
    .single();

  if (routeError || !route) {
    return null;
  }

  const { data: stops, error: stopsError } = await supabase
    .from("route_stops")
    .select("city_id, stop_type")
    .eq("route_id", routeId);

  if (stopsError || !stops) {
    return null;
  }

  const originCityId = stops.find((s) => s.stop_type === "collection")?.city_id;
  const destinationCityId = stops.find((s) => s.stop_type === "dropoff")?.city_id;

  if (!originCityId || !destinationCityId) {
    return null;
  }

  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .in("id", [originCityId, destinationCityId]);

  const originCityName = cities?.find((c) => c.id === originCityId)?.name ?? "Unknown";
  const destinationCityName = cities?.find((c) => c.id === destinationCityId)?.name ?? "Unknown";

  return {
    id: route.id,
    originCityId,
    destinationCityId,
    originCityName,
    destinationCityName,
    price_per_kg_eur: route.price_per_kg_eur,
    departure_date: route.departure_date,
    driver_id: route.driver_id,
  };
}

// Find all route alerts matching the published route
export async function findMatchingAlerts(
  supabase: SupabaseClient,
  route: RouteInfo
): Promise<AlertMatch[]> {
  let query = supabase
    .from("route_alerts")
    .select("id, email, user_id")
    .eq("origin_city_id", route.originCityId)
    .eq("destination_city_id", route.destinationCityId);

  // If route has a departure date, only match alerts that either:
  // 1. Have no date restriction (null)
  // 2. Have the same departure date or earlier
  if (route.departure_date) {
    query = query.or(
      `date_from.is.null,date_from.lte.${route.departure_date}`
    );
  } else {
    query = query.is("date_from", null);
  }

  const { data: alerts, error } = await query;

  if (error) {
    logError(FN_NAME, "find_matching_alerts_failed", error);
    throw error;
  }

  return alerts || [];
}

// Send emails to matched alerts that have an email on file. Each recipient
// is isolated in its own try/catch and gets its own email_log row, so one
// bad address/send failure never blocks the rest of the batch.
export async function sendAlertsEmails(
  supabase: SupabaseClient,
  route: RouteInfo,
  alerts: AlertMatch[]
): Promise<number> {
  const emailAlerts = alerts.filter((a) => a.email);

  if (emailAlerts.length === 0) {
    return 0;
  }

  let emailsSent = 0;

  for (const alert of emailAlerts) {
    const recipientEmail = alert.email!;
    let logId: string | null = null;
    try {
      const { subject, html } = await renderTemplate({
        type: "route_alert",
        subject: `🚚 New Route: ${route.originCityName} → ${route.destinationCityName}`,
        props: {
          originCityName: route.originCityName,
          destinationCityName: route.destinationCityName,
          pricePerKgEur: route.price_per_kg_eur,
          departureDate: route.departure_date,
          routeUrl: `https://wasali.app/routes?from=${encodeURIComponent(route.originCityName)}&to=${encodeURIComponent(route.destinationCityName)}`,
        },
      });

      logId = await insertEmailLog(supabase, {
        emailType: "route_alert",
        recipientEmail,
        userId: alert.user_id,
        routeAlertId: alert.id,
      });

      const result = await sendEmail({
        from: SENDERS.route_alert.from,
        replyTo: SENDERS.route_alert.replyTo,
        to: recipientEmail,
        subject,
        html,
      });

      await updateEmailLog(supabase, logId, result);

      if (result.ok) {
        emailsSent++;
        logEvent(FN_NAME, "email_sent", { recipientEmail });
      } else {
        logError(FN_NAME, "email_send_failed", new Error(result.errorDetail ?? "unknown"), {
          recipientEmail,
        });
      }
    } catch (error) {
      logError(FN_NAME, "email_attempt_threw", error, { recipientEmail });
    }
  }

  return emailsSent;
}

// Create in-app notifications for signed-in users (notifications.user_id is NOT NULL)
export async function createUserNotifications(
  supabase: SupabaseClient,
  route: RouteInfo,
  alerts: AlertMatch[]
): Promise<void> {
  const userAlerts = alerts.filter((a) => a.user_id);

  if (userAlerts.length === 0) {
    return;
  }

  const notifications = userAlerts.map((alert) => ({
    user_id: alert.user_id,
    type: "route_alert_match",
    message: `A new route from ${route.originCityName} to ${route.destinationCityName} was just published!${
      route.price_per_kg_eur ? ` Price: €${route.price_per_kg_eur}/kg` : ""
    }`,
  }));

  const { error } = await supabase
    .from("notifications")
    .insert(notifications);

  if (error) {
    logError(FN_NAME, "create_notifications_failed", error);
  } else {
    logEvent(FN_NAME, "notifications_created", { count: notifications.length });
  }
}
