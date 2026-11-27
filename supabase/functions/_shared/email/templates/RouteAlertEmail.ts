import React from 'npm:react@19';
import { Button, Section, Text } from 'npm:@react-email/components@0.0.31';
import { Layout } from './_components/Layout.ts';
import { bodyTextStyle, buttonStyle, colors, headlineStyle } from './_components/styles.ts';

export interface RouteAlertEmailProps {
  originCityName: string;
  destinationCityName: string;
  pricePerKgEur: number | null;
  departureDate: string | null;
  routeUrl: string;
}

const routeCardStyle = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: colors.white,
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
};

// createElement, not JSX — see Layout.ts for why.
export function RouteAlertEmail({
  originCityName,
  destinationCityName,
  pricePerKgEur,
  departureDate,
  routeUrl,
}: RouteAlertEmailProps) {
  const e = React.createElement;

  const routeCardChildren = [
    e(
      Text,
      { key: 'route', style: { fontSize: '18px', fontWeight: 600, color: colors.white, margin: 0 } },
      `${originCityName} → ${destinationCityName}`
    ),
  ];
  if (pricePerKgEur != null) {
    routeCardChildren.push(
      e(
        Text,
        { key: 'price', style: { fontSize: '16px', color: colors.white, margin: '8px 0 0' } },
        `€${pricePerKgEur.toFixed(2)}/kg`
      )
    );
  }
  if (departureDate) {
    routeCardChildren.push(
      e(
        Text,
        { key: 'date', style: { fontSize: '14px', color: colors.white, margin: '4px 0 0' } },
        `Departure: ${new Date(departureDate).toLocaleDateString()}`
      )
    );
  }

  return e(
    Layout,
    { footerNote: 'You received this email because you subscribed to route alerts on Wasali.' },
    e(Text, { style: headlineStyle }, '🚚 New Route Available!'),
    e(Section, { style: routeCardStyle }, ...routeCardChildren),
    e(
      Text,
      { style: bodyTextStyle },
      'A driver just published a matching route for your saved alert. Check it out now and book if interested!'
    ),
    e(Button, { href: routeUrl, style: buttonStyle }, 'View Route')
  );
}
