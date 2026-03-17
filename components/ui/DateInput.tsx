import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Input } from './Input';

interface DateInputProps {
  label?: string;
  value?: string;
  onChange: (val: string) => void;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
  placeholder?: string;
}

export function DateInput({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  error,
  placeholder = 'Select date',
}: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const dateValue = value ? parseISO(value) : new Date();
  const displayValue = value ? format(parseISO(value), 'MMM d, yyyy') : '';

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      onChange(format(selected, 'yyyy-MM-dd'));
    }
  };

  // Web: use a native date input
  if (Platform.OS === 'web') {
    return (
      <Input
        label={label}
        value={value ?? ''}
        onChangeText={onChange}
        error={error}
        placeholder={placeholder}
        // @ts-ignore — web-only prop
        type="date"
      />
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.row, !!error && styles.errorBorder]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.valueText, !value && styles.placeholder]}>
          {displayValue || placeholder}
        </Text>
        <Calendar size={18} color={Colors.text.tertiary} />
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    minHeight: 52,
    paddingHorizontal: Spacing.base,
  },
  errorBorder: { borderColor: Colors.error },
  valueText: {
    fontSize: FontSize.base,
    color: Colors.text.primary,
    flex: 1,
  },
  placeholder: { color: Colors.text.tertiary },
  error: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xs,
  },
  doneBtnText: {
    fontSize: FontSize.base,
    color: Colors.primary,
    fontWeight: '600',
  },
});
