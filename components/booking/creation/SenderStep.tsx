import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch, StyleSheet,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PhoneInput } from '@/components/shared/ui/forms/PhoneInput';
import { AddressFields } from '@/components/shared/ui/forms/AddressFields';
import { SavedPickupChips } from '@/components/booking/creation/SavedPickupChips';
import type { SavedAddress } from '@/types/models';
import { toSenderPickupFields } from '@/utils/pickupAddress';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SenderStepProps {
  senderName: string;
  senderCC: string;
  senderPhone: string;
  senderWhatsapp: boolean;
  updateMyProfile: boolean;
  // Address — only required when driver_pickup
  collectionServiceType: string | null;
  collectionStopLocationName: string | null;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  /** Saved addresses in the collection city, offered as one-tap pickup choices. */
  pickupCandidates: SavedAddress[];
  isValid: boolean;
  onSet: (fields: Record<string, any>) => void;
  onContinue: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SenderStep({
  senderName, senderCC, senderPhone, senderWhatsapp, updateMyProfile,
  collectionServiceType, collectionStopLocationName,
  addressStreet, addressCity, addressPostalCode,
  pickupCandidates,
  isValid, onSet, onContinue,
}: SenderStepProps) {
  const isDriverPickup = collectionServiceType === 'driver_pickup';
  const isSenderDropoff = collectionServiceType === 'sender_dropoff';

  return (
    <View>
      {/* Tooltip */}
      <View style={s.tooltip}>
        <Text style={s.tooltipText}>
          📦 These are your details as the <Text style={s.tooltipBold}>sender</Text> of this shipment.
        </Text>
      </View>

      <Text style={s.fieldLabel}>Full name</Text>
      <TextInput
        style={s.input}
        placeholder="Your full name"
        placeholderTextColor={Colors.text.tertiary}
        value={senderName}
        onChangeText={(v) => onSet({ senderName: v })}
      />
      <PhoneInput
        label="Phone number"
        countryCode={senderCC}
        onCountryCodeChange={(v) => onSet({ senderCC: v })}
        phone={senderPhone}
        onPhoneChange={(v) => onSet({ senderPhone: v })}
        isWhatsapp={senderWhatsapp}
        onWhatsappChange={(v) => onSet({ senderWhatsapp: v })}
      />

      {/* Collection method context */}
      {isSenderDropoff && collectionStopLocationName ? (
        <View style={s.locationBanner}>
          <MapPin size={13} color={Colors.secondary} strokeWidth={2.5} />
          <View style={{ flex: 1 }}>
            <Text style={s.locationBannerLabel}>Drop-off point</Text>
            <Text style={s.locationBannerValue}>{collectionStopLocationName}</Text>
          </View>
        </View>
      ) : null}

      {/* Address — only when driver pickup */}
      {isDriverPickup && (
        <>
          <Text style={[s.fieldLabel, { marginTop: Spacing.base }]}>Your pickup address</Text>
          <Text style={s.addressHint}>The driver will come to this address to collect your package.</Text>
          <SavedPickupChips
            addresses={pickupCandidates}
            selectedStreet={addressStreet}
            onSelect={(address) => onSet(toSenderPickupFields(address))}
          />
          <AddressFields
            label=""
            street={addressStreet}
            postalCode={addressPostalCode}
            city={addressCity}
            readOnlyCity
            onChange={(field, value) => {
              if (field === 'street') onSet({ senderAddressStreet: value });
              else if (field === 'postalCode') onSet({ senderAddressPostalCode: value });
            }}
          />
        </>
      )}

      {/* Update profile toggle */}
      <View style={[s.toggleRow, { marginTop: Spacing.base }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleLabel}>Update my profile</Text>
          <Text style={s.toggleDesc}>Save phone & name changes to your account</Text>
        </View>
        <Switch
          value={updateMyProfile}
          onValueChange={(v) => onSet({ updateMyProfile: v })}
          trackColor={{ false: Colors.border.medium, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      <Text style={s.privacyNote}>
        🔒 Your contact details are only shared directly with the driver.
      </Text>

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
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  tooltipText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  tooltipBold: { fontWeight: '700', color: Colors.text.primary },

  fieldLabel: {
    fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary,
    marginBottom: Spacing.xs, marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1, borderColor: Colors.border.light, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    fontSize: FontSize.base, color: Colors.text.primary, backgroundColor: Colors.white,
  },

  locationBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: 'rgba(39,110,241,0.07)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.base,
    borderWidth: 1, borderColor: 'rgba(39,110,241,0.2)',
  },
  locationBannerLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.secondary, textTransform: 'uppercase' },
  locationBannerValue: { fontSize: FontSize.sm, color: Colors.text.primary, marginTop: 2 },

  addressHint: {
    fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: Spacing.sm,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light,
    gap: Spacing.base,
  },
  toggleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  toggleDesc: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  privacyNote: {
    fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: Spacing.md, marginBottom: Spacing.sm,
  },

  continueBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
