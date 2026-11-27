import React from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { CountryCodeSelect } from '@/components/shared/ui/forms/CountryCodeSelect';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  isWhatsapp: boolean;
  onWhatsappChange: (v: boolean) => void;
  label?: string;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhoneInput({
  countryCode, onCountryCodeChange, phone, onPhoneChange,
  isWhatsapp, onWhatsappChange, label, error,
}: PhoneInputProps) {
  return (
    <View style={s.root}>
      {label && <Text style={s.label}>{label}</Text>}

      <View style={s.row}>
        <CountryCodeSelect value={countryCode} onChange={onCountryCodeChange} />
        <TextInput
          style={[s.input, error && s.inputError]}
          placeholder="Phone number"
          placeholderTextColor={Colors.text.tertiary}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={onPhoneChange}
        />
      </View>

      {error && <Text style={s.errorText}>{error}</Text>}

      <View style={s.whatsappRow}>
        <Switch
          value={isWhatsapp}
          onValueChange={onWhatsappChange}
          trackColor={{ false: Colors.border.medium, true: '#25D366' }}
          thumbColor={Colors.white}
          style={s.switch}
        />
        <Text style={s.whatsappLabel}>This is a WhatsApp number</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 4 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  inputError: { borderColor: Colors.error },
  errorText: { fontSize: FontSize.xs, color: Colors.error },
  whatsappRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  switch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  whatsappLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
