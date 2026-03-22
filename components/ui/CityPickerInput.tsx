import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { City } from '@/stores/citiesStore';

interface CityPickerInputProps {
  label?: string;
  value?: string;       // city name
  country?: string;     // country name (displayed in trigger when set)
  onChange: (city: City) => void;
  cities: City[];
  placeholder?: string;
  error?: string;
}

export function CityPickerInput({
  label,
  value,
  country,
  onChange,
  cities,
  placeholder = 'Select city',
  error,
}: CityPickerInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Group by country, filtered by search query
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? cities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q)
        )
      : cities;

    const map = new Map<string, City[]>();
    for (const city of filtered) {
      const list = map.get(city.country) ?? [];
      list.push(city);
      map.set(city.country, list);
    }
    return map;
  }, [cities, query]);

  // Find flag for the selected city
  const selectedCity = value ? cities.find((c) => c.name === value) : null;

  const handleSelect = (city: City) => {
    onChange(city);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={[styles.trigger, !!error && styles.triggerError]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, !value && styles.placeholder]}>
            {selectedCity
              ? `${selectedCity.flag_emoji}  ${selectedCity.name}`
              : placeholder}
          </Text>
          {country && value ? (
            <Text style={styles.countryChip}>{country}</Text>
          ) : null}
          <ChevronDown size={16} color={Colors.text.tertiary} />
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => { setOpen(false); setQuery(''); }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => { setOpen(false); setQuery(''); }}
          />
          <View style={styles.sheet}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? 'Select city'}</Text>
              <TouchableOpacity
                onPress={() => { setOpen(false); setQuery(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Search size={16} color={Colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city or country…"
                placeholderTextColor={Colors.text.tertiary}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <X size={14} color={Colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {grouped.size === 0 && (
                <Text style={styles.empty}>No cities found</Text>
              )}
              {Array.from(grouped.entries()).map(([countryName, citiesInCountry]) => (
                <View key={countryName}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupHeaderText}>
                      {citiesInCountry[0].flag_emoji}  {countryName}
                    </Text>
                  </View>
                  {citiesInCountry.map((city) => {
                    const isSelected = city.name === value;
                    return (
                      <TouchableOpacity
                        key={city.id}
                        style={[styles.item, isSelected && styles.itemSelected]}
                        onPress={() => handleSelect(city)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                          {city.name}
                        </Text>
                        {isSelected && (
                          <Text style={styles.tick}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={{ height: Spacing['3xl'] }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    minHeight: 52,
    paddingHorizontal: Spacing.base,
  },
  triggerError: { borderColor: Colors.error },
  triggerText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  placeholder: { color: Colors.text.tertiary },
  countryChip: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  // Modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '75%',
    paddingTop: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sheetTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.base,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  groupHeader: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background.secondary,
  },
  groupHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  itemSelected: { backgroundColor: Colors.primaryLight },
  itemName: {
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  itemNameSelected: { fontWeight: '700' },
  tick: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing['2xl'],
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
  },
});
