import React from 'npm:react@19';
import { render as renderToHtml } from 'npm:@react-email/render@1.0.1';
import { BookingEmail, type BookingEmailProps } from './templates/BookingEmail.ts';
import { RouteAlertEmail, type RouteAlertEmailProps } from './templates/RouteAlertEmail.ts';
import { OfferAcceptedEmail, type OfferAcceptedEmailProps } from './templates/OfferAcceptedEmail.ts';
import {
  SignupConfirmationEmail,
  type SignupConfirmationEmailProps,
} from './templates/SignupConfirmationEmail.ts';
import { PasswordResetEmail, type PasswordResetEmailProps } from './templates/PasswordResetEmail.ts';

export interface RenderedEmail {
  subject: string;
  html: string;
}

interface TemplateMap {
  booking_event: { props: BookingEmailProps; subject: string };
  route_alert: { props: RouteAlertEmailProps; subject: string };
  offer_accepted: { props: OfferAcceptedEmailProps; subject: string };
  auth_signup_confirmation: { props: SignupConfirmationEmailProps; subject: string };
  auth_password_reset: { props: PasswordResetEmailProps; subject: string };
}

export type RenderInput = {
  [K in keyof TemplateMap]: { type: K; props: TemplateMap[K]['props']; subject: string };
}[keyof TemplateMap];

// Central dispatcher — the one place that maps an email_type to its
// template. Adding a new type means adding one case here and a new
// template file; nothing else in the shared core changes (see
// docs/email-service.md's plug-and-play contract).
export async function renderTemplate(input: RenderInput): Promise<RenderedEmail> {
  const html = await renderComponent(input);
  return { subject: input.subject, html };
}

// createElement, not JSX — Supabase's hosted edge runtime does not apply a
// JSX transform at deploy time (see templates/_components/Layout.ts).
function renderComponent(input: RenderInput): Promise<string> {
  const e = React.createElement;
  switch (input.type) {
    case 'booking_event':
      return renderToHtml(e(BookingEmail, input.props));
    case 'route_alert':
      return renderToHtml(e(RouteAlertEmail, input.props));
    case 'offer_accepted':
      return renderToHtml(e(OfferAcceptedEmail, input.props));
    case 'auth_signup_confirmation':
      return renderToHtml(e(SignupConfirmationEmail, input.props));
    case 'auth_password_reset':
      return renderToHtml(e(PasswordResetEmail, input.props));
    default: {
      const exhaustiveCheck: never = input;
      throw new Error(`Unknown email template type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
