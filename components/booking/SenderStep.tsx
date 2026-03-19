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
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { AddressFields } from '@/components/ui/AddressFields';
import { EU_ORIGIN_CITIES } from '@/constants/cities';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SenderStepProps {
  senderMode: 'own' | 'behalf';
  ownName: string;
  ownCC: string;
  ownPhone: string;
  ownPhoneIsWhatsapp: boolean;
  updateMyProfile: boolean;
  behalfName: string;
  behalfCC: string;
  behalfPhone: string;
  behalfPhoneIsWhatsapp: boolean;
  saveBehalfToRecipients: boolean;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  isValid: boolean;
  onSet: (fields: Record<string, any>) => void;
  onContinue: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SenderStep({
  senderMode,
  ownName, ownCC, ownPhone, ownPhoneIsWhatsapp, updateMyProfile,
  behalfName, behalfCC, behalfPhone, behalfPhoneIsWhatsapp, saveBehalfToRecipients,
  addressStreet, addressCity, addressPostalCode,
  isValid, onSet, onContinue,
}: SenderStepProps) {
  const { t } = useTranslation();
  const [showCityPicker, setShowCityPicker] = useState(false);

  return (
    <View>
      {/* Tooltip */}
      <View style={s.tooltip}>
        <Text style={s.tooltipText}>
          📦 These are your details as the <Text style={s.tooltipBold}>sender</Text> of this shipment.
        </Text>
      </View>

      {/* Mode tabs */}
      <View style={s.tabRow}>
        {(['own', 'behalf'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[s.tab, senderMode === mode && s.tabActive]}
            onPress={() => onSet({ senderMode: mode })}
            activeOpacity={0.75}
          >
            <Text style={[s.tabText, senderMode === mode && s.tabTextActive]}>
              {mode === 'own' ? t('booking.senderMode.own') : t('booking.senderMode.behalf')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {senderMode === 'own' ? (
        <>
          <Text style={s.fieldLabel}>Full name</Text>
          <TextInput
            style={s.input}
            placeholder="Your full name"
            placeholderTextColor={Colors.text.tertiary}
            value={ownName}
            onChangeText={(v) => onSet({ ownName: v })}
          />
          <PhoneInput
            label="Phone number"
            countryCode={ownCC}
            onCountryCodeChange={(v) => onSet({ ownCC: v })}
            phone={ownPhone}
            onPhoneChange={(v) => onSet({ ownPhone: v })}
            isWhatsapp={ownPhoneIsWhatsapp}
            onWhatsappChange={(v) => onSet({ ownPhoneIsWhatsapp: v })}
          />
        </>
      ) : (
        <>
          <Text style={s.fieldLabel}>Full name</Text>
          <TextInput
            style={s.input}
            placeholder="Full name"
            placeholderTextColor={Colors.text.tertiary}
            value={behalfName}
            onChangeText={(v) => onSet({ behalfName: v })}
          />
          <PhoneInput
            label="Phone number"
            countryCode={behalfCC}
            onCountryCodeChange={(v) => onSet({ behalfCC: v })}
            phone={behalfPhone}
            onPhoneChange={(v) => onSet({ behalfPhone: v })}
            isWhatsapp={behalfPhoneIsWhatsapp}
            onWhatsappChange={(v) => onSet({ behalfPhoneIsWhatsapp: v })}
          />
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Save to my recipients list</Text>
              <Text style={s.toggleDesc}>Quickly reuse this person for future shipments</Text>
            </View>
            <Switch
              value={saveBehalfToRecipients}
              onValueChange={(v) => onSet({ saveBehalfToRecipients: v })}
              trackColor={{ false: Colors.border.medium, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </>
      )}

      {/* Address */}
      <AddressFields
        label="Your address"
        street={addressStreet}
        postalCode={addressPostalCode}
        city={addressCity}
        cityOptions={EU_ORIGIN_CITIES}
        onChange={(field, value) => {
          if (field === 'street') onSet({ senderAddressStreet: value });
          else if (field === 'postalCode') onSet({ senderAddressPostalCode: value });
          else if (field === 'city') onSet({ senderAddressCity: value });
        }}
        onCityPickerOpen={() => setShowCityPicker(true)}
      />

      {/* City picker modal */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCityPicker(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select your city</Text>
            <FlatList
              data={EU_ORIGIN_CITIES}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.sheetItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSet({ senderAddressCity: item.name });
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={s.sheetItemFlag}>{item.flag}</Text>
                  <View>
                    <Text style={s.sheetItemName}>{item.name}</Text>
                    <Text style={s.sheetItemCountry}>{item.country}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Update profile toggle */}
      {senderMode === 'own' && (
        <View style={[s.toggleRow, { marginTop: Spacing.base }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>Update my profile</Text>
            <Text style={s.toggleDesc}>Save phone & address changes to your account</Text>
          </View>
          <Switch
            value={updateMyProfile}
            onValueChange={(v) => onSet({ updateMyProfile: v })}
            trackColor={{ false: Colors.border.medium, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
      )}

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

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  tabActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  tabTextActive: { color: Colors.text.primary, fontWeight: '700' },

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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.base,
  },
  toggleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  toggleDesc: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  privacyNote: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

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
  sheetItemCountry: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
});
