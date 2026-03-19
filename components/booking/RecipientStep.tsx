import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { AddressFields } from '@/components/ui/AddressFields';
import { TN_DESTINATION_CITIES } from '@/constants/cities';
import type { Tables } from '@/types/database';

type Recipient = Tables<'recipients'>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecipientStepProps {
  recipientName: string;
  recipientCC: string;
  recipientPhone: string;
  recipientPhoneIsWhatsapp: boolean;
  recipientAddressStreet: string;
  recipientAddressCity: string;
  recipientAddressPostalCode: string;
  saveRecipient: boolean;
  driverNotes: string;
  savedRecipients: Recipient[];
  deliveryServiceType?: string;
  dropoffCity: string;
  isValid: boolean;
  onSet: (fields: Record<string, any>) => void;
  onContinue: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipientStep({
  recipientName, recipientCC, recipientPhone, recipientPhoneIsWhatsapp,
  recipientAddressStreet, recipientAddressCity, recipientAddressPostalCode,
  saveRecipient, driverNotes, savedRecipients, deliveryServiceType, dropoffCity,
  isValid, onSet, onContinue,
}: RecipientStepProps) {
  const [showCityPicker, setShowCityPicker] = useState(false);
  const showAddressSection = deliveryServiceType === 'driver_delivery';

  function fillFromRecipient(r: Recipient) {
    onSet({
      recipientName: r.name,
      recipientPhone: r.phone.replace(/^\+\d+/, ''),
      recipientPhoneIsWhatsapp: r.whatsapp_enabled,
      recipientAddressStreet: r.address_street ?? '',
      recipientAddressCity: r.address_city ?? '',
      recipientAddressPostalCode: r.address_postal_code ?? '',
    });
  }

  return (
    <View>
      {/* Tooltip */}
      <View style={s.tooltip}>
        <Text style={s.tooltipText}>
          📬 This is the <Text style={s.tooltipBold}>destination contact</Text> — the person receiving the package.
        </Text>
      </View>

      {/* Saved recipients */}
      {savedRecipients.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Saved recipients</Text>
          <View style={s.savedRow}>
            {savedRecipients.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[s.savedChip, recipientName === r.name && s.savedChipActive]}
                onPress={() => fillFromRecipient(r)}
                activeOpacity={0.75}
              >
                <Text style={[s.savedChipText, recipientName === r.name && s.savedChipTextActive]}>
                  {r.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Name */}
      <Text style={s.fieldLabel}>Full name</Text>
      <TextInput
        style={s.input}
        placeholder="Recipient's full name"
        placeholderTextColor={Colors.text.tertiary}
        value={recipientName}
        onChangeText={(v) => onSet({ recipientName: v })}
      />

      {/* Phone */}
      <PhoneInput
        label="Phone number"
        countryCode={recipientCC}
        onCountryCodeChange={(v) => onSet({ recipientCC: v })}
        phone={recipientPhone}
        onPhoneChange={(v) => onSet({ recipientPhone: v })}
        isWhatsapp={recipientPhoneIsWhatsapp}
        onWhatsappChange={(v) => onSet({ recipientPhoneIsWhatsapp: v })}
      />

      {/* Address */}
      {showAddressSection && (
        <>
          <AddressFields
            label="Delivery address"
            street={recipientAddressStreet}
            postalCode={recipientAddressPostalCode}
            city={recipientAddressCity}
            cityOptions={TN_DESTINATION_CITIES}
            onChange={(field, value) => {
              if (field === 'street') onSet({ recipientAddressStreet: value });
              else if (field === 'postalCode') onSet({ recipientAddressPostalCode: value });
              else if (field === 'city') onSet({ recipientAddressCity: value });
            }}
            onCityPickerOpen={() => setShowCityPicker(true)}
          />
          <Modal visible={showCityPicker} transparent animationType="slide">
            <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCityPicker(false)}>
              <View style={s.sheet}>
                <Text style={s.sheetTitle}>Select city</Text>
                <FlatList
                  data={TN_DESTINATION_CITIES}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={s.sheetItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        onSet({ recipientAddressCity: item.name });
                        setShowCityPicker(false);
                      }}
                    >
                      <Text style={s.sheetItemFlag}>{item.flag}</Text>
                      <Text style={s.sheetItemName}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      {/* Drop-off city read-only */}
      <Text style={s.fieldLabel}>Drop-off city</Text>
      <View style={s.readOnly}>
        <Text style={dropoffCity ? s.readOnlyValue : s.readOnlyPlaceholder}>
          {dropoffCity || 'Set in logistics step'}
        </Text>
      </View>

      {/* Driver notes */}
      <Text style={[s.fieldLabel, { marginTop: Spacing.base }]}>Notes for driver (optional)</Text>
      <TextInput
        style={[s.input, s.textArea]}
        placeholder={`e.g. "Call before arriving" · "Fragile items inside"`}
        placeholderTextColor={Colors.text.tertiary}
        multiline
        numberOfLines={3}
        value={driverNotes}
        onChangeText={(v) => onSet({ driverNotes: v })}
      />

      {/* Save recipient */}
      <View style={s.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleLabel}>Save for next time</Text>
          <Text style={s.toggleDesc}>Save this recipient to your address book</Text>
        </View>
        <Switch
          value={saveRecipient}
          onValueChange={(v) => onSet({ saveRecipient: v })}
          trackColor={{ false: Colors.border.medium, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      <TouchableOpacity
        style={[s.continueBtn, !isValid && s.continueBtnDisabled]}
        onPress={() => isValid && onContinue()}
        activeOpacity={0.85}
        disabled={!isValid}
      >
        <Text style={s.continueBtnText}>Review & Pay →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  tooltip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  tooltipText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  tooltipBold: { fontWeight: '700', color: Colors.text.primary },

  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  savedChip: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  savedChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  savedChipText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  savedChipTextActive: { color: Colors.primary, fontWeight: '700' },

  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  readOnly: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.secondary,
  },
  readOnlyValue: { fontSize: FontSize.base, color: Colors.text.primary },
  readOnlyPlaceholder: { fontSize: FontSize.base, color: Colors.text.tertiary },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.base,
    marginTop: Spacing.sm,
  },
  toggleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  toggleDesc: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  continueBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    maxHeight: '60%',
  },
  sheetTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.md },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sheetItemFlag: { fontSize: 20 },
  sheetItemName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
});
