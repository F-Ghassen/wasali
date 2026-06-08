import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MapPin, ExternalLink } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const SERVICE_LABEL: Record<string, string> = {
  sender_dropoff:     'Drop-off at meeting point',
  driver_pickup:      'Driver picks up from you',
  recipient_collects: 'Recipient self-collects',
  driver_delivery:    'Driver delivers to door',
  local_post:         'Local post / courier',
};

const SERVICE_DESC: Record<string, string> = {
  sender_dropoff:     "You bring the package to the driver's agreed location.",
  driver_pickup:      'The driver comes to your address to pick up.',
  recipient_collects: "Recipient comes to the driver's location to collect.",
  driver_delivery:    "Driver delivers directly to the recipient's door.",
  local_post:         'Driver hands over to local post or courier.',
};

interface ServiceOptionProps {
  serviceType: string;
  price: number;
  locationName?: string | null;
  locationAddress?: string | null;
  instructions?: string | null;
  selected: boolean;
  readOnly?: boolean;
  onPress: () => void;
}

export function ServiceOption({
  serviceType, price, locationName, locationAddress,
  instructions, selected, readOnly, onPress,
}: ServiceOptionProps) {
  const label    = SERVICE_LABEL[serviceType] ?? serviceType;
  const baseDesc = SERVICE_DESC[serviceType] ?? '';
  const priceStr = price === 0 ? 'Free' : `+€${price}`;

  const isUrl = !!locationAddress && locationAddress.startsWith('http');

  return (
    <TouchableOpacity
      style={[s.card, selected && s.cardActive, readOnly && s.cardReadOnly]}
      onPress={() => !readOnly && onPress()}
      activeOpacity={readOnly ? 1 : 0.75}
    >
      <View style={s.row}>
        {!readOnly && (
          <View style={[s.radio, selected && s.radioActive]}>
            {selected && <View style={s.radioInner} />}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={s.topRow}>
            <Text style={s.label}>{label}</Text>
            <Text style={[s.price, selected && s.priceActive]}>{priceStr}</Text>
          </View>
          {baseDesc ? <Text style={s.desc}>{baseDesc}</Text> : null}
          {instructions ? <Text style={s.desc}>{instructions}</Text> : null}
          {locationName ? (
            <View style={s.locationRow}>
              <MapPin size={11} color={Colors.text.secondary} strokeWidth={2.5} />
              <Text style={s.locationName}>{locationName}</Text>
            </View>
          ) : null}
          {locationAddress ? (
            isUrl ? (
              <TouchableOpacity
                style={s.mapLinkRow}
                onPress={() => Linking.openURL(locationAddress!)}
                activeOpacity={0.7}
              >
                <ExternalLink size={11} color={Colors.primary} strokeWidth={2.5} />
                <Text style={s.mapLink}>View on map</Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.desc}>{locationAddress}</Text>
            )
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  cardActive:   { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cardReadOnly: { opacity: 0.85 },
  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: { borderColor: Colors.primary },
  radioInner:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  label:       { flex: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  price:       { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  priceActive: { color: Colors.primary },
  desc:        { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4, lineHeight: 18 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  locationName: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  mapLinkRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  mapLink:     { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
});
