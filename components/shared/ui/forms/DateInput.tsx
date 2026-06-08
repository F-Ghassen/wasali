import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
} from 'date-fns';
import { Calendar } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendarWeeks(month: Date): (Date | null)[][] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: (Date | null)[][] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isSameMonth(day, month) ? new Date(day) : null);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

interface DateInputProps {
  label?: string;
  value?: string;        // YYYY-MM-DD
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
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parseISO(value) : null;
  const displayValue = selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : '';

  const effectiveMin = minDate ?? startOfDay(new Date());

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={[styles.row, !!error && styles.errorBorder]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.valueText, !value && styles.placeholder]}>
            {displayValue || placeholder}
          </Text>
          <Calendar size={18} color={Colors.text.tertiary} />
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <CalendarModal
        visible={open}
        selected={selectedDate}
        minDate={effectiveMin}
        maxDate={maxDate}
        title={label ?? 'Select date'}
        onSelect={(d) => {
          onChange(format(d, 'yyyy-MM-dd'));
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ─── CalendarModal (same pattern as sender home screen) ─────────────────────

function CalendarModal({
  visible,
  selected,
  minDate,
  maxDate,
  title,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Date | null;
  minDate: Date;
  maxDate?: Date;
  title: string;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(
    startOfMonth(selected ?? minDate)
  );

  const weeks = buildCalendarWeeks(viewMonth);
  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(minDate));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={cal.root}>
        {/* Header */}
        <View style={cal.header}>
          <Text style={cal.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={cal.closeBtn}>
            <Text style={cal.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Month navigation */}
        <View style={cal.monthNav}>
          <TouchableOpacity
            style={[cal.navBtn, !canGoPrev && cal.navBtnDisabled]}
            onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
            activeOpacity={0.7}
          >
            <Text style={[cal.navArrow, !canGoPrev && cal.navArrowDisabled]}>‹</Text>
          </TouchableOpacity>

          <Text style={cal.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>

          <TouchableOpacity
            style={cal.navBtn}
            onPress={() => setViewMonth((m) => addMonths(m, 1))}
            activeOpacity={0.7}
          >
            <Text style={cal.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={cal.dowRow}>
          {DOW_LABELS.map((d) => (
            <Text key={d} style={cal.dowLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <ScrollView
          contentContainerStyle={cal.grid}
          showsVerticalScrollIndicator={false}
        >
          {weeks.map((week, wi) => (
            <View key={wi} style={cal.week}>
              {week.map((d, di) => {
                if (!d) return <View key={di} style={cal.cell} />;
                const disabled =
                  isBefore(d, startOfDay(minDate)) ||
                  (maxDate != null && isBefore(maxDate, d));
                const isSelected = !!selected && isSameDay(d, selected);
                const todayCell = isToday(d);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      cal.cell,
                      isSelected && cal.cellSelected,
                      todayCell && !isSelected && cal.cellToday,
                    ]}
                    onPress={() => !disabled && onSelect(d)}
                    activeOpacity={disabled ? 1 : 0.75}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        cal.cellNum,
                        disabled && cal.cellNumDisabled,
                        isSelected && cal.cellTextSelected,
                        todayCell && !isSelected && cal.cellNumToday,
                      ]}
                    >
                      {format(d, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
});

const cal = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },
  closeText: { fontSize: FontSize.lg, color: Colors.text.secondary },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 22, color: Colors.text.primary, lineHeight: 26 },
  navArrowDisabled: { color: Colors.text.tertiary },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },

  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  grid: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl, gap: 4 },
  week: { flexDirection: 'row', gap: 4 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellNum: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  cellNumDisabled: { color: Colors.text.tertiary },
  cellNumToday: { fontWeight: '800' },
  cellTextSelected: { color: Colors.white },
});
