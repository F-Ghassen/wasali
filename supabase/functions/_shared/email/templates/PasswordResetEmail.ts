import React from 'npm:react@19';
import { Button, Text } from 'npm:@react-email/components@0.0.31';
import { Layout } from './_components/Layout.ts';
import { bodyTextStyle, buttonStyle, greetingStyle, headlineStyle } from './_components/styles.ts';

export interface PasswordResetEmailProps {
  resetUrl: string;
}

// createElement, not JSX — see Layout.ts for why.
export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  const e = React.createElement;
  return e(
    Layout,
    {
      footerNote:
        "You're receiving this because a password reset was requested for your Wasali account. If you didn't request this, you can ignore this email.",
    },
    e(Text, { style: greetingStyle }, 'Hi,'),
    e(Text, { style: headlineStyle }, 'Reset your password'),
    e(Text, { style: bodyTextStyle }, 'Tap the button below to choose a new password.'),
    e(Button, { href: resetUrl, style: buttonStyle }, 'Reset password →')
  );
}
