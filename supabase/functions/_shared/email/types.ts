export type EmailType =
  | 'booking_event'
  | 'route_alert'
  | 'offer_accepted'
  | 'auth_signup_confirmation'
  | 'auth_password_reset';

export interface SendEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerMessageId: string | null;
  errorDetail: string | null;
}

export interface EmailLogRef {
  userId?: string | null;
  bookingId?: string | null;
  routeAlertId?: string | null;
  requestId?: string | null;
}
