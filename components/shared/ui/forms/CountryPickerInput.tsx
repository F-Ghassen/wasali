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

interface CountryPickerInputProps {
  label?: string;
  value?: string;                       // country name
  countries: string[];
  flags: Record<string, string>;        // country name → flag emoji
  onChange: (country: string) => void;
  placeholder?: string;
  error?: string;
}

/** Picks one country from a searchable list. Used to narrow a city picker. */
export function CountryPickerInput({
  label,
  value,
  countries,
  flags,
  onChange,
  placeholder = 'Select country',
  error,
}: CountryPickerInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? countries.filter((c) => c.toLowerCase().includes(q)) : countries;
  }, [countries, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (country: string) => {
    onChange(country);
    close();
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
            {value ? `${flags[value] ?? ''}  ${value}` : placeholder}
          </Text>
          <ChevronDown size={16} color={Colors.text.tertiary} />
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? 'Select country'}</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Search size={16} color={Colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country…"
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

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filtered.length === 0 && <Text style={styles.empty}>No countries found</Text>}
              {filtered.map((country) => {
                const isSelected = country === value;
                return (
                  <TouchableOpacity
                    key={country}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => handleSelect(country)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                      {flags[country] ?? ''}  {country}
                    </Text>
                    {isSelected && <Text style={styles.tick}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
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
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.primary, marginBottom: Spacing.xs },
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
  triggerText: { flex: 1, fontSize: FontSize.base, color: Colors.text.primary },
  placeholder: { color: Colors.text.tertiary },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: Spacing.xs },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
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
  sheetTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary },
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
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.text.primary },
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
  itemName: { fontSize: FontSize.base, color: Colors.text.primary },
  itemNameSelected: { fontWeight: '700' },
  tick: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  empty: { textAlign: 'center', padding: Spacing['2xl'], fontSize: FontSize.sm, color: Colors.text.tertiary },
});
