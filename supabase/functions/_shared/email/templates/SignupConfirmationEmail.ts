import React from 'npm:react@19';
import { Button, Text } from 'npm:@react-email/components@0.0.31';
import { Layout } from './_components/Layout.ts';
import { bodyTextStyle, buttonStyle, greetingStyle, headlineStyle } from './_components/styles.ts';

export interface SignupConfirmationEmailProps {
  confirmationUrl: string;
}

// createElement, not JSX — see Layout.ts for why.
export function SignupConfirmationEmail({ confirmationUrl }: SignupConfirmationEmailProps) {
  const e = React.createElement;
  return e(
    Layout,
    {
      footerNote:
        "You're receiving this because you signed up for Wasali. If you didn't, you can ignore this email.",
    },
    e(Text, { style: greetingStyle }, 'Welcome to Wasali,'),
    e(Text, { style: headlineStyle }, 'Confirm your email address'),
    e(Text, { style: bodyTextStyle }, 'Tap the button below to confirm your email and finish signing up.'),
    e(Button, { href: confirmationUrl, style: buttonStyle }, 'Confirm email →')
  );
}
