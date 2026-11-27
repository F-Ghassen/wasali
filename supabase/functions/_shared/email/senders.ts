import type { EmailType } from './types.ts';

interface SenderConfig {
  from: string;
  replyTo?: string;
}

// Centralized so a future domain migration (see docs/email-service.md) is a
// one-file change instead of hunting through every call site.
//
// TEMP (2026-07-27): wasali.app is not yet verified in Resend (every
// @wasali.app send gets a 403 "domain is not verified"), so this is
// temporarily pointed at Resend's own verified sandbox sender
// (onboarding@resend.dev) purely to manually test the 3 notification
// flows end-to-end. REVERT to the @wasali.app addresses below once
// wasali.app is verified in Resend — do not ship this to real users.
const USING_TEMP_SANDBOX_SENDER = true;
const REAL_SENDERS: Record<EmailType, SenderConfig> = {
  booking_event: { from: 'Wasali <notifications@wasali.app>' },
  route_alert: { from: 'Wasali <alerts@wasali.app>', replyTo: 'support@wasali.app' },
  offer_accepted: { from: 'Wasali <notifications@wasali.app>' },
  auth_signup_confirmation: { from: 'Wasali <noreply@wasali.app>' },
  auth_password_reset: { from: 'Wasali <noreply@wasali.app>' },
};

const TEMP_SANDBOX_SENDERS: Record<EmailType, SenderConfig> = {
  booking_event: { from: 'onboarding@resend.dev' },
  route_alert: { from: 'onboarding@resend.dev' },
  offer_accepted: { from: 'onboarding@resend.dev' },
  auth_signup_confirmation: { from: 'onboarding@resend.dev' },
  auth_password_reset: { from: 'onboarding@resend.dev' },
};

export const SENDERS: Record<EmailType, SenderConfig> = USING_TEMP_SANDBOX_SENDER
  ? TEMP_SANDBOX_SENDERS
  : REAL_SENDERS;
