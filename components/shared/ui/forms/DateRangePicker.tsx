import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  format,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isBefore,
  isSameMonth,
  isToday,
  isAfter,
} from 'date-fns';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendarWeeks(month: Date): (Date | null)[][] {
  const monthStart = startOfMonth(month);
  const monthEnd   = endOfMonth(month);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 0 });

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface DateRangePickerProps {
  visible: boolean;
  dateFrom: Date | null;
  dateTo: Date | null;
  onSelect: (from: Date | null, to: Date | null) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DateRangePicker({
  visible, dateFrom, dateTo, onSelect, onClose,
}: DateRangePickerProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(today));
  // local draft state — committed on "Apply"
  const [selFrom, setSelFrom] = useState<Date | null>(dateFrom);
  const [selTo,   setSelTo]   = useState<Date | null>(dateTo);
  // 'from' = picking start, 'to' = picking end
  const [picking, setPicking] = useState<'from' | 'to'>('from');

  const weeks     = buildCalendarWeeks(viewMonth);
  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(today));

  function handleDayPress(d: Date) {
    if (picking === 'from') {
      setSelFrom(d);
      setSelTo(null);
      setPicking('to');
    } else {
      if (selFrom && isBefore(d, selFrom)) {
        // Selected an earlier date — treat as new start
        setSelFrom(d);
        setSelTo(null);
        setPicking('to');
      } else {
        setSelTo(d);
        setPicking('from');
      }
    }
  }

  function isInRange(d: Date): boolean {
    return !!selFrom && !!selTo && isAfter(d, selFrom) && isBefore(d, selTo);
  }

  function handleApply() {
    onSelect(selFrom, selTo);
    onClose();
  }

  function handleClear() {
    setSelFrom(null);
    setSelTo(null);
    setPicking('from');
    onSelect(null, null);
    onClose();
  }

  const hasSelection = !!selFrom;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Select dates</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Range hint */}
        <View style={s.rangeHint}>
          <View style={[s.hintChip, picking === 'from' && s.hintChipActive]}>
            <Text style={[s.hintLabel, picking === 'from' && s.hintLabelActive]}>FROM</Text>
            <Text style={s.hintValue}>
              {selFrom ? format(selFrom, 'MMM d') : 'Any'}
            </Text>
          </View>
          <Text style={s.hintArrow}>→</Text>
          <View style={[s.hintChip, picking === 'to' && s.hintChipActive]}>
            <Text style={[s.hintLabel, picking === 'to' && s.hintLabelActive]}>TO</Text>
            <Text style={s.hintValue}>
              {selTo ? format(selTo, 'MMM d') : 'Any'}
            </Text>
          </View>
        </View>

        {/* Month navigation */}
        <View style={s.monthNav}>
          <TouchableOpacity
            style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}
            onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
            activeOpacity={0.7}
          >
            <Text style={[s.navArrow, !canGoPrev && s.navArrowDisabled]}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setViewMonth((m) => addMonths(m, 1))}
            activeOpacity={0.7}
          >
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={s.dowRow}>
          {DOW_LABELS.map((d) => (
            <Text key={d} style={s.dowLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <ScrollView contentContainerStyle={s.grid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={s.week}>
              {week.map((d, di) => {
                if (!d) return <View key={di} style={s.cell} />;
                const isPast      = isBefore(d, today) && !isToday(d);
                const isFromSel   = !!selFrom && isSameDay(d, selFrom);
                const isToSel     = !!selTo   && isSameDay(d, selTo);
                const inRange     = isInRange(d);
                const todayCell   = isToday(d);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      s.cell,
                      inRange && s.cellRange,
                      (isFromSel || isToSel) && s.cellEndpoint,
                      todayCell && !isFromSel && !isToSel && s.cellToday,
                    ]}
                    onPress={() => !isPast && handleDayPress(d)}
                    activeOpacity={isPast ? 1 : 0.75}
                    disabled={isPast}
                  >
                    <Text
                      style={[
                        s.cellNum,
                        isPast && s.cellNumPast,
                        (isFromSel || isToSel) && s.cellNumEndpoint,
                        todayCell && !isFromSel && !isToSel && s.cellNumToday,
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

        {/* Footer actions */}
        <View style={s.footer}>
          {hasSelection && (
            <TouchableOpacity style={s.clearBtn} onPress={handleClear} activeOpacity={0.7}>
              <Text style={s.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <Text style={s.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
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

  rangeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  hintChip: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  hintChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  hintLabel: { fontSize: 9, fontWeight: '800', color: Colors.text.tertiary, letterSpacing: 0.8 },
  hintLabelActive: { color: Colors.primary },
  hintValue: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  hintArrow: { fontSize: 18, color: Colors.text.tertiary },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 22, color: Colors.text.primary, lineHeight: 26 },
  navArrowDisabled: { color: Colors.text.tertiary },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },

  dowRow: { flexDirection: 'row', paddingHorizontal: Spacing.base, marginBottom: Spacing.xs },
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
  cellRange: { backgroundColor: Colors.primaryLight, borderRadius: 0 },
  cellEndpoint: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellNum: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  cellNumPast: { color: Colors.text.tertiary },
  cellNumToday: { fontWeight: '800' },
  cellNumEndpoint: { color: Colors.white },

  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  clearText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.secondary },
  applyBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  applyText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
