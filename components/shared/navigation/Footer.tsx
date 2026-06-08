import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Twitter, Instagram, Facebook, Linkedin, Mail, Briefcase } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const SOCIAL = [
  { label: 'X / Twitter', icon: Twitter, url: 'https://twitter.com/wasali' },
  { label: 'Instagram',   icon: Instagram, url: 'https://instagram.com/wasali' },
  { label: 'Facebook',    icon: Facebook,  url: 'https://facebook.com/wasali' },
  { label: 'LinkedIn',    icon: Linkedin,  url: 'https://linkedin.com/company/wasali' },
];

const LINKS = [
  { label: 'Contact us', icon: Mail,      url: 'mailto:hello@wasali.com' },
  { label: 'We\'re hiring', icon: Briefcase, url: 'https://wasali.com/careers' },
];

function SocialButton({ icon: Icon, label, url }: { icon: any; label: string; url: string }) {
  return (
    <TouchableOpacity
      style={footerS.socialBtn}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
      accessibilityLabel={label}
    >
      <Icon size={18} color={Colors.text.secondary} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

function LinkButton({ icon: Icon, label, url }: { icon: any; label: string; url: string }) {
  return (
    <TouchableOpacity
      style={footerS.linkBtn}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
    >
      <Icon size={14} color={Colors.text.secondary} strokeWidth={2} />
      <Text style={footerS.linkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <View style={footerS.root}>
      <View style={footerS.inner}>

        {/* Brand */}
        <View style={footerS.brand}>
          <Text style={footerS.brandName}>Wasali</Text>
          <Text style={footerS.brandTagline}>Ship it. Trust it. Done.</Text>
          <Text style={footerS.copyright}>© {year} Wasali · All rights reserved</Text>
        </View>

        {/* Links */}
        <View style={footerS.linksCol}>
          <Text style={footerS.colLabel}>COMPANY</Text>
          {LINKS.map((l) => (
            <LinkButton key={l.label} {...l} />
          ))}
        </View>

        {/* Social */}
        <View style={footerS.linksCol}>
          <Text style={footerS.colLabel}>FOLLOW US</Text>
          <View style={footerS.socialRow}>
            {SOCIAL.map((s) => (
              <SocialButton key={s.label} {...s} />
            ))}
          </View>
        </View>

      </View>
    </View>
  );
}

const footerS = StyleSheet.create({
  root: {
    backgroundColor: Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: Spacing['2xl'],
  },

  // Brand column
  brand: { flex: 1, gap: Spacing.sm },
  brandName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  brandTagline: { fontSize: FontSize.sm, color: Colors.text.secondary },
  copyright: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: Spacing.xs },

  // Link columns
  linksCol: { gap: Spacing.md },
  colLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  linkLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  // Social icons row
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
