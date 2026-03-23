import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface RouteData {
  id: string;
  origin_city: string;
  destination_city: string;
  price_per_kg_eur: number | null;
  departure_date: string | null;
  driver_id: string;
}

interface AlertMatch {
  id: string;
  email: string;
  user_id: string | null;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { routeId } = await req.json();

    if (!routeId) {
      return new Response(
        JSON.stringify({ error: "routeId is required" }),
        { status: 400 }
      );
    }

    // Get the published route
    const { data: route, error: routeError } = await supabase
      .from("routes")
      .select(
        "id, origin_city, destination_city, price_per_kg_eur, departure_date, driver_id"
      )
      .eq("id", routeId)
      .eq("status", "active")
      .single();

    if (routeError || !route) {
      console.log("Route not found or not active:", routeId);
      return new Response(
        JSON.stringify({ error: "Route not found or not active" }),
        { status: 404 }
      );
    }

    console.log(`Found route: ${route.origin_city} → ${route.destination_city}`);

    // Find matching alerts
    const matchedAlerts = await findMatchingAlerts(
      route as RouteData
    );

    if (matchedAlerts.length === 0) {
      console.log("No matching alerts found");
      return new Response(
        JSON.stringify({ message: "No matching alerts found" }),
        { status: 200 }
      );
    }

    console.log(`Found ${matchedAlerts.length} matching alerts`);

    // Send emails
    const emailsSent = await sendAlertsEmails(route as RouteData, matchedAlerts);

    // Create notifications for signed-in users
    await createUserNotifications(route as RouteData, matchedAlerts);

    return new Response(
      JSON.stringify({
        message: "Alerts sent successfully",
        emailsSent,
        alertsMatched: matchedAlerts.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in notify-route-alert:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

/**
 * Find all route alerts matching the published route
 */
async function findMatchingAlerts(
  route: RouteData
): Promise<AlertMatch[]> {
  // Base query: match origin and destination cities
  let query = supabase
    .from("route_alerts")
    .select("id, email, user_id");

  query = query
    .eq("origin_city", route.origin_city)
    .eq("destination_city", route.destination_city);

  // If route has a departure date, only match alerts that either:
  // 1. Have no date restriction (null)
  // 2. Have the same departure date or earlier
  if (route.departure_date) {
    query = query.or(
      `date_from.is.null,date_from.lte.${route.departure_date}`
    );
  } else {
    // Route has no specific date, match all alerts for these cities
    query = query.is("date_from", null);
  }

  const { data: alerts, error } = await query;

  if (error) {
    console.error("Error fetching matching alerts:", error);
    throw error;
  }

  return alerts || [];
}

/**
 * Send emails to all matched users
 */
async function sendAlertsEmails(
  route: RouteData,
  alerts: AlertMatch[]
): Promise<number> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set");
    throw new Error("Email service not configured");
  }

  let emailsSent = 0;

  for (const alert of alerts) {
    try {
      const emailContent = formatEmailContent(route);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "alerts@wasali.app",
          to: alert.email,
          subject: `🚚 New Route: ${route.origin_city} → ${route.destination_city}`,
          html: emailContent,
          replyTo: "support@wasali.app",
        }),
      });

      if (response.ok) {
        emailsSent++;
        console.log(`Email sent to ${alert.email}`);
      } else {
        const error = await response.text();
        console.error(`Failed to send email to ${alert.email}:`, error);
      }
    } catch (error) {
      console.error(`Error sending email to ${alert.email}:`, error);
    }
  }

  return emailsSent;
}

/**
 * Create in-app notifications for signed-in users
 */
async function createUserNotifications(
  route: RouteData,
  alerts: AlertMatch[]
): Promise<void> {
  const userAlerts = alerts.filter((a) => a.user_id);

  if (userAlerts.length === 0) {
    return;
  }

  const notifications = userAlerts.map((alert) => ({
    user_id: alert.user_id,
    type: "route_alert_match",
    message: `A new route from ${route.origin_city} to ${route.destination_city} was just published!${
      route.price_per_kg_eur ? ` Price: €${route.price_per_kg_eur}/kg` : ""
    }`,
  }));

  const { error } = await supabase
    .from("notifications")
    .insert(notifications);

  if (error) {
    console.error("Error creating notifications:", error);
  } else {
    console.log(`Created ${notifications.length} notifications`);
  }
}

/**
 * Format email HTML content
 */
function formatEmailContent(route: RouteData): string {
  const priceText = route.price_per_kg_eur
    ? `<p style="font-size: 16px; color: #22c55e;"><strong>€${route.price_per_kg_eur.toFixed(2)}/kg</strong></p>`
    : "";

  const dateText = route.departure_date
    ? `<p><strong>Departure:</strong> ${new Date(route.departure_date).toLocaleDateString()}</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">🚚 New Route Available!</h1>
          </div>

          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <div style="font-size: 18px; margin-bottom: 12px;">
              <span style="font-weight: 600;">${route.origin_city}</span>
              <span style="margin: 0 8px;">→</span>
              <span style="font-weight: 600;">${route.destination_city}</span>
            </div>
            ${priceText}
            ${dateText}
          </div>

          <p style="color: #6b7280; margin-bottom: 24px;">
            A driver just published a matching route for your saved alert. Check it out now and book if interested!
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://wasali.app/routes?from=${encodeURIComponent(route.origin_city)}&to=${encodeURIComponent(route.destination_city)}"
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Route
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            You received this email because you subscribed to route alerts on Wasali.
            <br>
            <a href="https://wasali.app/settings/alerts" style="color: #3b82f6; text-decoration: none;">Manage your alerts</a>
          </p>

        </div>
      </body>
    </html>
  `;
}
