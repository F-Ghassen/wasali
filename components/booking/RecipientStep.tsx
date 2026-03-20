import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch, StyleSheet,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { AddressFields } from '@/components/ui/AddressFields';
import type { SavedRecipient } from '@/hooks/useSavedRecipients';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecipientStepProps {
  recipientName: string;
  recipientCC: string;
  recipientPhone: string;
  recipientWhatsapp: boolean;
  recipientAddressStreet: string;
  recipientAddressCity: string;
  recipientAddressPostalCode: string;
  saveRecipient: boolean;
  driverNotes: string;
  savedRecipients: SavedRecipient[];
  deliveryServiceType: string | null;
  dropoffStopLocationName: string | null;
  dropoffStopLocationAddress: string | null;
  dropoffStopCity: string;
  isValid: boolean;
  onSet: (fields: Record<string, any>) => void;
  onContinue: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipientStep({
  recipientName, recipientCC, recipientPhone, recipientWhatsapp,
  recipientAddressStreet, recipientAddressCity, recipientAddressPostalCode,
  saveRecipient, driverNotes, savedRecipients,
  deliveryServiceType, dropoffStopLocationName, dropoffStopLocationAddress, dropoffStopCity,
  isValid, onSet, onContinue,
}: RecipientStepProps) {

  const isRecipientCollects = deliveryServiceType === 'recipient_collects';
  const isDoorDelivery      = deliveryServiceType === 'driver_delivery';

  const addressLabel = isDoorDelivery
    ? 'Delivery address'
    : "Recipient's address (optional)";

  function fillFromRecipient(r: SavedRecipient) {
    onSet({
      recipientName:               r.name,
      recipientPhone:              r.phone.replace(/^\+\d+/, ''),
      recipientWhatsapp:           r.whatsapp_enabled,
      recipientAddressStreet:      r.address_street ?? '',
      recipientAddressCity:        r.address_city ?? '',
      recipientAddressPostalCode:  r.address_postal_code ?? '',
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

      {/* Saved recipients chips */}
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
        isWhatsapp={recipientWhatsapp}
        onWhatsappChange={(v) => onSet({ recipientWhatsapp: v })}
      />

      {/* Drop-off location (when recipient self-collects) */}
      {isRecipientCollects && (dropoffStopLocationName || dropoffStopCity) ? (
        <View style={s.locationBanner}>
          <MapPin size={13} color={Colors.secondary} strokeWidth={2.5} />
          <View style={{ flex: 1 }}>
            <Text style={s.locationBannerLabel}>Collection point</Text>
            <Text style={s.locationBannerValue}>
              {dropoffStopLocationName ?? dropoffStopCity}
            </Text>
            {dropoffStopLocationAddress ? (
              <Text style={s.locationBannerAddr}>{dropoffStopLocationAddress}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Address */}
      <Text style={[s.fieldLabel, { marginTop: Spacing.base }]}>{addressLabel}</Text>
      <AddressFields
        label=""
        street={recipientAddressStreet}
        postalCode={recipientAddressPostalCode}
        city={recipientAddressCity}
        readOnlyCity
        onChange={(field, value) => {
          if (field === 'street') onSet({ recipientAddressStreet: value });
          else if (field === 'postalCode') onSet({ recipientAddressPostalCode: value });
        }}
      />

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

      {/* Save recipient toggle */}
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

      {!isValid && (
        <View style={s.debugHint}>
          {recipientName.trim().length === 0 && <Text style={s.debugLine}>• Full name required</Text>}
          {recipientPhone.trim().length < 5 && <Text style={s.debugLine}>• Phone number required (min 5 digits)</Text>}
          {isDoorDelivery && recipientAddressStreet.trim().length === 0 && <Text style={s.debugLine}>• Delivery street address required</Text>}
          {isDoorDelivery && recipientAddressCity.trim().length === 0 && <Text style={s.debugLine}>• Delivery city required</Text>}
        </View>
      )}

      <TouchableOpacity
        style={[s.continueBtn, !isValid && s.continueBtnDisabled]}
        onPress={() => isValid && onContinue()}
        activeOpacity={0.85}
        disabled={!isValid}
      >
        <Text style={s.continueBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  tooltip: {
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.base,
  },
  tooltipText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  tooltipBold: { fontWeight: '700', color: Colors.text.primary },

  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '800', color: Colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },
  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  savedChip: {
    borderWidth: 1, borderColor: Colors.border.light, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white,
  },
  savedChipActive:     { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  savedChipText:       { fontSize: FontSize.sm, color: Colors.text.secondary },
  savedChipTextActive: { color: Colors.primary, fontWeight: '700' },

  fieldLabel: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary,
    marginBottom: Spacing.xs, marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1, borderColor: Colors.border.light, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    fontSize: FontSize.base, color: Colors.text.primary, backgroundColor: Colors.white,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  locationBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: 'rgba(39,110,241,0.07)',
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.base,
    borderWidth: 1, borderColor: 'rgba(39,110,241,0.2)',
  },
  locationBannerLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.secondary, textTransform: 'uppercase' },
  locationBannerValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary, marginTop: 2 },
  locationBannerAddr:  { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light,
    gap: Spacing.base, marginTop: Spacing.sm,
  },
  toggleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  toggleDesc:  { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  continueBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
  debugHint: { marginTop: Spacing.base, padding: Spacing.md, backgroundColor: '#FFF3CD', borderRadius: BorderRadius.md, gap: 4 },
  debugLine: { fontSize: FontSize.xs, color: '#856404' },
});
