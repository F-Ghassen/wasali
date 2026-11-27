import React from 'npm:react@19';
import { Button, Text } from 'npm:@react-email/components@0.0.31';
import { Layout } from './_components/Layout.ts';
import { bodyTextStyle, buttonStyle, greetingStyle, headlineStyle } from './_components/styles.ts';

export type BookingEmailVariant =
  | 'new_booking'
  | 'booking_confirmed'
  | 'in_transit'
  | 'delivered'
  | 'booking_cancelled'
  | 'weight_adjusted';

export interface BookingEmailProps {
  variant: BookingEmailVariant;
  recipientName: string;
  message: string;
  routeSummary: string;
  bookingUrl: string;
}

// createElement, not JSX — see Layout.ts for why.
export function BookingEmail({ recipientName, message, routeSummary, bookingUrl }: BookingEmailProps) {
  const e = React.createElement;
  return e(
    Layout,
    { footerNote: "You're receiving this because you have an active shipment on Wasali." },
    e(Text, { style: greetingStyle }, `Hi ${recipientName},`),
    e(Text, { style: headlineStyle }, message),
    e(Text, { style: bodyTextStyle }, 'Route: ', e('strong', null, routeSummary)),
    e(Button, { href: bookingUrl, style: buttonStyle }, 'View shipment →')
  );
}
