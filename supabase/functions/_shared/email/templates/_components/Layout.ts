import React, { type ReactNode } from 'npm:react@19';
import { Body, Container, Head, Html, Section, Text } from 'npm:@react-email/components@0.0.31';
import {
  bodyStyle,
  containerStyle,
  contentStyle,
  footerStyle,
  footerTextStyle,
  headerStyle,
  logoStyle,
} from './styles.ts';

interface LayoutProps {
  footerNote: string;
  children: ReactNode;
}

// Uses React.createElement() instead of JSX syntax — Supabase's hosted edge
// runtime does not apply a JSX-to-createElement transform at deploy time
// (confirmed: JSX passed through untransformed produced a runtime
// `React is not defined` error, even with an explicit React import and a
// working local `deno run`/`deno test`). createElement calls work
// identically regardless of whether a JSX transform is applied.
export function Layout({ footerNote, children }: LayoutProps) {
  const e = React.createElement;
  return e(
    Html,
    null,
    e(Head, null),
    e(
      Body,
      { style: bodyStyle },
      e(
        Container,
        { style: containerStyle },
        e(Section, { style: headerStyle }, e(Text, { style: logoStyle }, 'Wasali')),
        e(Section, { style: contentStyle }, children),
        e(Section, { style: footerStyle }, e(Text, { style: footerTextStyle }, footerNote))
      )
    )
  );
}
