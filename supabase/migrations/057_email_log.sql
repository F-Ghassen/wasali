-- Migration 057: email_log table + notifications.request_id
--
-- Consolidates email observability across the four send call sites
-- (notify-booking-event, notify-route-alert, accept-offer, auth send_email
-- hook) into one table: one row per send attempt, queued before the Resend
-- call and updated to sent/failed after, so a mid-flight crash still leaves
-- an observable record instead of silent data loss.
--
-- Also adds notifications.request_id so accept-offer's new notification
-- coverage can link back to the shipping request it was triggered by,
-- following the same dedicated-nullable-FK-column precedent as the
-- existing booking_id column (no polymorphic entity_type/entity_id).

CREATE TABLE IF NOT EXISTS email_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type           text NOT NULL,  -- 'booking_event' | 'route_alert' | 'offer_accepted' | 'auth_signup_confirmation' | 'auth_password_reset'
  recipient_email      text NOT NULL,
  user_id              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  booking_id           uuid REFERENCES bookings(id) ON DELETE SET NULL,
  route_alert_id       uuid REFERENCES route_alerts(id) ON DELETE SET NULL,
  request_id           uuid REFERENCES shipping_requests(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'queued',  -- 'queued' | 'sent' | 'failed'
  provider_message_id  text,
  error_detail         text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  sent_at              timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
-- No policies: service-role (edge functions) bypasses RLS automatically.
-- This table is write-only infra, not a user-facing feature.

CREATE INDEX IF NOT EXISTS email_log_recipient_created_idx
  ON email_log (recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS email_log_status_created_idx
  ON email_log (status, created_at DESC);

CREATE INDEX IF NOT EXISTS email_log_provider_message_id_idx
  ON email_log (provider_message_id);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES shipping_requests(id) ON DELETE SET NULL;
