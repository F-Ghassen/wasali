import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
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

interface InlineDatePickerProps {
  selected: Date | null;
  onSelect: (d: Date | null) => void;
}

export function InlineDatePicker({
  selected,
  onSelect,
}: InlineDatePickerProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(today));
  const weeks = buildWeeks(viewMonth);
  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(today));

  return (
    <View style={s.root}>
      {/* Month nav */}
      <View style={s.monthNav}>
        <TouchableOpacity
          style={[s.navBtn, !canGoPrev && s.navBtnOff]}
          onPress={() => canGoPrev && setViewMonth((m) => subMonths(m, 1))}
          activeOpacity={0.7}
        >
          <Text style={[s.navArrow, !canGoPrev && s.navArrowOff]}>‹</Text>
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

      {/* Day-of-week row */}
      <View style={s.dowRow}>
        {DOW.map((d, i) => (
          <Text key={i} style={s.dowLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar */}
      {weeks.map((week, wi) => (
        <View key={wi} style={s.week}>
          {week.map((d, di) => {
            if (!d) return <View key={di} style={s.cell} />;
            const isPast    = isBefore(d, today) && !isToday(d);
            const isSel     = !!selected && isSameDay(d, selected);
            const isToday_  = isToday(d);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[s.cell, isSel && s.cellSel, isToday_ && !isSel && s.cellToday]}
                onPress={() => !isPast && onSelect(isSel ? null : d)}
                activeOpacity={isPast ? 1 : 0.75}
                disabled={isPast}
              >
                <Text style={[
                  s.cellNum,
                  isPast   && s.cellNumPast,
                  isSel    && s.cellNumSel,
                  isToday_ && !isSel && s.cellNumToday,
                ]}
                >
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  navBtn: { padding: Spacing.sm },
  navBtnOff: { opacity: 0.4 },
  navArrow: { fontSize: FontSize.lg, color: Colors.text.primary, fontWeight: '600' },
  navArrowOff: { color: Colors.text.tertiary },
  monthLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  dowRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  week: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  cell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.lg },
  cellSel: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 2, borderColor: Colors.primary },
  cellNum: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.primary },
  cellNumPast: { color: Colors.text.tertiary, opacity: 0.5 },
  cellNumSel: { color: Colors.white, fontWeight: '600' },
  cellNumToday: { color: Colors.primary, fontWeight: '600' },
});
