import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteService {
  id: string;
  service_type: string;
  price_eur: number;
  location_name: string | null;
  location_address: string | null;
  instructions: string | null;
}

interface CityOption {
  city: string;
  country: string;
  date: string;
}

export interface LogisticsStepProps {
  collectionServices: RouteService[];
  deliveryServices: RouteService[];
  selectedCollectionId: string | null;
  selectedDeliveryId: string | null;
  collectionCity: string;
  collectionCityDate: string;
  dropoffCity: string;
  dropoffCityDate: string;
  pickupOptions: CityOption[];
  dropoffOptions: CityOption[];
  isValid: boolean;
  onSelectCollection: (id: string | null) => void;
  onSelectDelivery: (id: string | null) => void;
  onSelectCollectionCity: (city: string, date: string) => void;
  onSelectDropoffCity: (city: string, date: string) => void;
  onContinue: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serviceLabel(type: string): string {
  const map: Record<string, string> = {
    sender_dropoff:     'Drop-off at meeting point',
    driver_pickup:      'Driver picks up from you',
    recipient_collects: 'Recipient self-collects',
    driver_delivery:    'Driver delivers to door',
    local_post:         'Local post / courier',
  };
  return map[type] ?? type;
}

function serviceDesc(type: string): string {
  const map: Record<string, string> = {
    sender_dropoff:     "You bring the package to the driver's agreed location.",
    driver_pickup:      'The driver comes to your address to pick up.',
    recipient_collects: "Recipient comes to the driver's location to collect.",
    driver_delivery:    "Driver delivers directly to the recipient's door.",
    local_post:         'Driver hands over to local post or courier.',
  };
  return map[type] ?? '';
}

// ─── RadioCard ────────────────────────────────────────────────────────────────

function RadioCard({
  label, desc, price, selected, onPress,
}: {
  label: string; desc: string; price: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.radioCard, selected && s.radioCardActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.radioRow}>
        <View style={[s.radio, selected && s.radioActive]}>
          {selected && <View style={s.radioInner} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.radioTopRow}>
            <Text style={s.radioLabel}>{label}</Text>
            <Text style={[s.radioPrice, selected && s.radioPriceActive]}>{price}</Text>
          </View>
          <Text style={s.radioDesc}>{desc}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── CityChips ────────────────────────────────────────────────────────────────

function CityChips({
  options,
  selectedCity,
  onSelect,
}: {
  options: CityOption[];
  selectedCity: string;
  onSelect: (city: string, date: string) => void;
}) {
  if (options.length === 0) {
    return <Text style={s.emptyNote}>No cities configured by driver.</Text>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipsRow}
    >
      {options.map((opt, i) => {
        const isSelected = opt.city === selectedCity;
        return (
          <TouchableOpacity
            key={i}
            style={[s.chip, isSelected && s.chipActive]}
            onPress={() => onSelect(opt.city, opt.date)}
            activeOpacity={0.75}
          >
            <MapPin
              size={11}
              color={isSelected ? Colors.white : Colors.text.tertiary}
              strokeWidth={2.5}
            />
            <View>
              <Text style={[s.chipCity, isSelected && s.chipCityActive]}>
                {opt.city}
              </Text>
              {opt.date ? (
                <Text style={[s.chipDate, isSelected && s.chipDateActive]}>
                  {formatDateShort(opt.date)}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogisticsStep({
  collectionServices, deliveryServices,
  selectedCollectionId, selectedDeliveryId,
  collectionCity, dropoffCity,
  pickupOptions, dropoffOptions,
  isValid,
  onSelectCollection, onSelectDelivery,
  onSelectCollectionCity, onSelectDropoffCity,
  onContinue,
}: LogisticsStepProps) {

  // Auto-select when only one option available
  useEffect(() => {
    if (pickupOptions.length === 1 && !collectionCity) {
      onSelectCollectionCity(pickupOptions[0].city, pickupOptions[0].date);
    }
  }, [pickupOptions.length]);

  useEffect(() => {
    if (dropoffOptions.length === 1 && !dropoffCity) {
      onSelectDropoffCity(dropoffOptions[0].city, dropoffOptions[0].date);
    }
  }, [dropoffOptions.length]);

  return (
    <View>
      {/* ── Collection city ─────────────────────────────────────── */}
      <Text style={s.sectionTitle}>Collection city</Text>
      <CityChips
        options={pickupOptions}
        selectedCity={collectionCity}
        onSelect={onSelectCollectionCity}
      />

      {/* ── Drop-off city ────────────────────────────────────────── */}
      <Text style={[s.sectionTitle, { marginTop: Spacing.base }]}>Drop-off city</Text>
      <CityChips
        options={dropoffOptions}
        selectedCity={dropoffCity}
        onSelect={onSelectDropoffCity}
      />

      {/* ── Collection services ─────────────────────────────────── */}
      <Text style={[s.sectionTitle, { marginTop: Spacing.base }]}>Collection method</Text>
      {collectionServices.length === 0 ? (
        <Text style={s.emptyNote}>No options configured by driver.</Text>
      ) : (
        collectionServices.map((svc) => (
          <RadioCard
            key={svc.id}
            label={serviceLabel(svc.service_type)}
            desc={[serviceDesc(svc.service_type), svc.instructions].filter(Boolean).join(' — ')}
            price={svc.price_eur === 0 ? 'Free' : `+€${svc.price_eur}`}
            selected={selectedCollectionId === svc.id}
            onPress={() => onSelectCollection(selectedCollectionId === svc.id ? null : svc.id)}
          />
        ))
      )}

      {/* ── Delivery services ───────────────────────────────────── */}
      <Text style={[s.sectionTitle, { marginTop: Spacing.base }]}>Delivery method</Text>
      {deliveryServices.length === 0 ? (
        <Text style={s.emptyNote}>No options configured by driver.</Text>
      ) : (
        deliveryServices.map((svc) => (
          <RadioCard
            key={svc.id}
            label={serviceLabel(svc.service_type)}
            desc={[serviceDesc(svc.service_type), svc.instructions].filter(Boolean).join(' — ')}
            price={svc.price_eur === 0 ? 'Free' : `+€${svc.price_eur}`}
            selected={selectedDeliveryId === svc.id}
            onPress={() => onSelectDelivery(selectedDeliveryId === svc.id ? null : svc.id)}
          />
        ))
      )}

      {/* ── Continue ─────────────────────────────────────────────── */}
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
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  emptyNote: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },

  // City chips
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipCity: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  chipCityActive: { color: Colors.white },
  chipDate: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  chipDateActive: { color: 'rgba(255,255,255,0.75)' },

  // RadioCard
  radioCard: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  radioCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  radioRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: { borderColor: Colors.primary },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  radioLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  radioPrice: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  radioPriceActive: { color: Colors.primary },
  radioDesc: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4, lineHeight: 18 },

  continueBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
