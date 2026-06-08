import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Switch,
  StyleSheet,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

// ─── Country codes ────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { flag: '🇩🇪', code: '+49',  name: 'Germany' },
  { flag: '🇫🇷', code: '+33',  name: 'France' },
  { flag: '🇮🇹', code: '+39',  name: 'Italy' },
  { flag: '🇧🇪', code: '+32',  name: 'Belgium' },
  { flag: '🇳🇱', code: '+31',  name: 'Netherlands' },
  { flag: '🇪🇸', code: '+34',  name: 'Spain' },
  { flag: '🇬🇧', code: '+44',  name: 'United Kingdom' },
  { flag: '🇹🇳', code: '+216', name: 'Tunisia' },
  { flag: '🇺🇸', code: '+1',   name: 'United States' },
];

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];

  return (
    <View style={s.root}>
      {label && <Text style={s.label}>{label}</Text>}

      <View style={s.row}>
        <TouchableOpacity style={s.ccBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={s.ccText}>{selected.flag} {selected.code}</Text>
          <ChevronDown size={12} color={Colors.text.tertiary} />
        </TouchableOpacity>
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

      {/* Country code picker */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select country code</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.sheetItem, item.code === countryCode && s.sheetItemActive]}
                  onPress={() => { onCountryCodeChange(item.code); setPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.sheetItemName}>{item.flag}  {item.name}</Text>
                  <Text style={s.sheetItemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  ccBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  ccText: { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '500' },
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

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  sheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sheetItemActive: { backgroundColor: Colors.primaryLight },
  sheetItemName: { fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '500' },
  sheetItemCode: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
