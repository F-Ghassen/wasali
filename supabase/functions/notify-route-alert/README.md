# notify-route-alert Edge Function

Sends email + in-app notifications to matching `route_alerts` when a driver
publishes a route (invoked directly by `driverRouteStore.publishRoute()`,
not a Postgres/DB webhook — see the correction in `docs/email-service.md`).

Email sending, templating, and observability (`email_log`) are handled by
the shared `supabase/functions/_shared/email/` module — see
[`docs/email-service.md`](../../../docs/email-service.md) for the full
architecture, deployment steps, and troubleshooting guide. This file
previously duplicated that content against the pre-refactor implementation
and has been superseded to avoid drifting out of sync.
