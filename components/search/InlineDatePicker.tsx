import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, addDays, isBefore, subMonths, addMonths, isToday, isSameDay,
} from 'date-fns';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildWeeks(month: Date): (Date | null)[][] {
  const monthStart = startOfMonth(month);
  const monthEnd   = endOfMonth(month);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 0 });
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

interface Props {
  selected: Date | null;
  onSelect: (d: Date | null) => void;
}

export function InlineDatePicker({ selected, onSelect }: Props) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(today));
  const weeks = buildWeeks(viewMonth);
  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(today));

  return (
    <View style={s.root}>
      <View style={s.monthNav}>
        <TouchableOpacity
          style={[s.navBtn, !canGoPrev && s.navBtnOff]}
          onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
          activeOpacity={0.7}
        >
          <Text style={[s.navArrow, !canGoPrev && s.navArrowOff]}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity style={s.navBtn} onPress={() => setViewMonth((m) => addMonths(m, 1))} activeOpacity={0.7}>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={s.dowRow}>
        {DOW.map((d, i) => <Text key={i} style={s.dowLabel}>{d}</Text>)}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={s.week}>
          {week.map((d, di) => {
            if (!d) return <View key={di} style={s.cell} />;
            const isPast   = isBefore(d, today) && !isToday(d);
            const isSel    = !!selected && isSameDay(d, selected);
            const isTodayD = isToday(d);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[s.cell, isSel && s.cellSel, isTodayD && !isSel && s.cellToday]}
                onPress={() => !isPast && onSelect(isSel ? null : d)}
                activeOpacity={isPast ? 1 : 0.75}
                disabled={isPast}
              >
                <Text style={[
                  s.cellNum,
                  isPast   && s.cellNumPast,
                  isSel    && s.cellNumSel,
                  isTodayD && !isSel && s.cellNumToday,
                ]}>
                  {format(d, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {selected && (
        <TouchableOpacity style={s.anyTime} onPress={() => onSelect(null)} activeOpacity={0.7}>
          <Text style={s.anyTimeText}>Any date  ✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border.light,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs, marginBottom: Spacing.xs,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: BorderRadius.md,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
  },
  navBtnOff: { opacity: 0.3 },
  navArrow: { fontSize: 20, color: Colors.text.primary, lineHeight: 24 },
  navArrowOff: { color: Colors.text.tertiary },
  monthLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  dowRow: { flexDirection: 'row', marginBottom: 2 },
  dowLabel: {
    flex: 1, textAlign: 'center', fontSize: 10,
    fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.3,
  },
  week: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  cellSel: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellNum: { fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  cellNumPast: { color: Colors.text.tertiary },
  cellNumSel: { color: Colors.white },
  cellNumToday: { fontWeight: '800' },
  anyTime: {
    alignSelf: 'center', marginTop: Spacing.sm,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, backgroundColor: Colors.background.tertiary,
  },
  anyTimeText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
});
