import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView,
} from 'react-native';
import { format } from 'date-fns';
import { Bell, BellOff, X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useCities } from '@/hooks/useCities';
import { useCreateRouteAlert } from '@/hooks/useCreateRouteAlert';
import { CityPickerModal } from './CityPickerModal';
import { InlineDatePicker } from './InlineDatePicker';

interface Props {
  visible: boolean;
  initialFrom: string;
  initialTo: string;
  profile: { id: string } | null;
  onClose: () => void;
}

export function RouteAlertSheet({ visible, initialFrom, initialTo, profile, onClose }: Props) {
  const { citiesByCountry } = useCities();
  const alert = useCreateRouteAlert();

  const [fromCity, setFromCity]     = useState(initialFrom);
  const [fromCityId, setFromCityId] = useState('');
  const [toCity, setToCity]         = useState(initialTo);
  const [toCityId, setToCityId]     = useState('');
  const [dateFrom, setDateFrom]     = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);

  useEffect(() => {
    if (visible) {
      setFromCity(initialFrom);
      setToCity(initialTo);
      setDateFrom(null);
      alert.reset();
    }
  }, [visible, initialFrom, initialTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = !!fromCity && !!toCity && !!profile;

  const handleSubmit = () => {
    if (!canSubmit) return;
    alert.submit({
      userId: profile!.id,
      fromCity,
      fromCityId: fromCityId || null,
      toCity,
      toCityId: toCityId || null,
      dateFrom,
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={s.root}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Bell size={20} color={Colors.primary} strokeWidth={2} />
              <Text style={s.headerTitle}>Route Alert</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color={Colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {alert.submitted ? (
            <View style={s.successRoot}>
              <View style={s.successIcon}>
                <Check size={32} color={Colors.white} strokeWidth={2.5} />
              </View>
              <Text style={s.successTitle}>Alert saved!</Text>
              <Text style={s.successDesc}>
                We'll notify you as soon as a driver publishes a route from{' '}
                <Text style={s.successBold}>{fromCity}</Text> to{' '}
                <Text style={s.successBold}>{toCity}</Text>
                {dateFrom && (
                  <Text> departing from <Text style={s.successBold}>{format(dateFrom, 'MMM d, yyyy')}</Text></Text>
                )}.
              </Text>
              <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
              <Text style={s.desc}>
                We'll send you a push notification when a driver publishes a matching route. You can change the cities below.
              </Text>

              <Text style={s.label}>FROM</Text>
              <TouchableOpacity style={s.field} onPress={() => setShowFromPicker(true)} activeOpacity={0.7}>
                <Text style={fromCity ? s.fieldValue : s.fieldPlaceholder}>{fromCity || 'Select origin city'}</Text>
                <Text style={s.fieldChevron}>›</Text>
              </TouchableOpacity>

              <Text style={[s.label, { marginTop: Spacing.md }]}>TO</Text>
              <TouchableOpacity style={s.field} onPress={() => setShowToPicker(true)} activeOpacity={0.7}>
                <Text style={toCity ? s.fieldValue : s.fieldPlaceholder}>{toCity || 'Select destination city'}</Text>
                <Text style={s.fieldChevron}>›</Text>
              </TouchableOpacity>

              <Text style={[s.label, { marginTop: Spacing.xl }]}>FROM DATE</Text>
              <Text style={s.dateHint}>
                {dateFrom
                  ? `Alert me for routes departing from ${format(dateFrom, 'EEE, MMM d yyyy')}`
                  : 'Alert me for any upcoming date'}
              </Text>
              <InlineDatePicker selected={dateFrom} onSelect={setDateFrom} />

              {!profile && (
                <View style={s.loginNotice}>
                  <BellOff size={14} color={Colors.text.tertiary} strokeWidth={2} />
                  <Text style={s.loginNoticeText}>Sign in to save alerts</Text>
                </View>
              )}

              {alert.error && (
                <View style={s.errorRow}>
                  <Text style={s.errorText}>{alert.error}</Text>
                  <TouchableOpacity onPress={handleSubmit} activeOpacity={0.7}>
                    <Text style={s.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[s.submitBtn, (!canSubmit || alert.isSubmitting) && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit || alert.isSubmitting}
                activeOpacity={0.85}
              >
                <Bell size={16} color={Colors.white} strokeWidth={2} />
                <Text style={s.submitBtnText}>{alert.isSubmitting ? 'Saving…' : 'Notify me'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <CityPickerModal
        visible={showFromPicker} title="Select origin city"
        citiesByCountry={citiesByCountry}
        onSelect={(c) => { setFromCity(c.name); setFromCityId(c.id); }}
        onClose={() => setShowFromPicker(false)}
      />
      <CityPickerModal
        visible={showToPicker} title="Select destination city"
        citiesByCountry={citiesByCountry}
        onSelect={(c) => { setToCity(c.name); setToCityId(c.id); }}
        onClose={() => setShowToPicker(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border.light,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.sm },
  body: { padding: Spacing.base, gap: 0 },
  desc: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 22, marginBottom: Spacing.xl, marginTop: Spacing.md },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.base,
    borderWidth: 1, borderColor: Colors.border.light,
  },
  fieldValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  fieldPlaceholder: { fontSize: FontSize.base, color: Colors.text.tertiary },
  fieldChevron: { fontSize: 22, color: Colors.text.tertiary },
  loginNotice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  loginNoticeText: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  dateHint: { fontSize: FontSize.xs, color: Colors.text.secondary, marginBottom: Spacing.sm, fontStyle: 'italic' },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  errorText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
  retryText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base, marginTop: Spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
  successRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
  },
  successTitle: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.md },
  successDesc: { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing['2xl'] },
  successBold: { fontWeight: '700', color: Colors.text.primary },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.base, paddingHorizontal: Spacing['2xl'] },
  doneBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
