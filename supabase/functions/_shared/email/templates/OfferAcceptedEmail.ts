import React from 'npm:react@19';
import { Button, Text } from 'npm:@react-email/components@0.0.31';
import { Layout } from './_components/Layout.ts';
import { bodyTextStyle, buttonStyle, greetingStyle, headlineStyle } from './_components/styles.ts';

export interface OfferAcceptedEmailProps {
  recipientName: string;
  requestSummary: string;
  offerUrl: string;
}

// createElement, not JSX — see Layout.ts for why.
export function OfferAcceptedEmail({ recipientName, requestSummary, offerUrl }: OfferAcceptedEmailProps) {
  const e = React.createElement;
  return e(
    Layout,
    { footerNote: "You're receiving this because you have an active shipping request on Wasali." },
    e(Text, { style: greetingStyle }, `Hi ${recipientName},`),
    e(Text, { style: headlineStyle }, 'Your offer was accepted!'),
    e(Text, { style: bodyTextStyle }, 'Request: ', e('strong', null, requestSummary)),
    e(Button, { href: offerUrl, style: buttonStyle }, 'View request →')
  );
}
