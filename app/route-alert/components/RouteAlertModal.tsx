import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { format } from 'date-fns';
import { Bell, X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useCities } from '@/hooks/useCities';
import { CityPickerModal } from './CityPickerModal';
import { InlineDatePicker } from './InlineDatePicker';
import { createRouteAlert, createAlertNotification } from '../services/routeAlertService';
import type { RouteAlertModalProps } from '../types';

export function RouteAlertModal({
  visible,
  initialFrom = '',
  initialTo = '',
  profile,
  onClose,
}: RouteAlertModalProps) {
  const { citiesByCountry } = useCities();
  const [fromCity, setFromCity] = useState(initialFrom);
  const [fromCityId, setFromCityId] = useState('');
  const [toCity, setToCity] = useState(initialTo);
  const [toCityId, setToCityId] = useState('');
  const [email, setEmail] = useState(profile?.email || '');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFromCity(initialFrom);
      setToCity(initialTo);
      setEmail(profile?.email || '');
      setSubmitted(false);
      setError(null);
    }
  }, [visible, initialFrom, initialTo, profile?.email]);

  const canSubmit = !!fromCity && !!toCity && !!email && (!!profile || !!email);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createRouteAlert({
        userId: profile?.id || null,
        email: email || '',
        originCity: fromCity,
        originCityId: fromCityId || null,
        destinationCity: toCity,
        destinationCityId: toCityId || null,
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
      });

      const dateLabel = dateFrom ? ` from ${format(dateFrom, 'MMM d, yyyy')}` : '';
      if (profile?.id) {
        await createAlertNotification({
          userId: profile.id,
          message: `Alert saved: you'll be notified when a ${fromCity} → ${toCity} route is published${dateLabel}.`,
        });
      }

      setSubmitted(true);
    } catch {
      setError('Could not save alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={s.root}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Bell size={20} color={Colors.primary} strokeWidth={2} />
              <Text style={s.headerTitle}>Route Alert</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color={Colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            /* Success state */
            <View style={s.successRoot}>
              <View style={s.successIcon}>
                <Check size={32} color={Colors.white} strokeWidth={2.5} />
              </View>
              <Text style={s.successTitle}>Alert saved!</Text>
              <Text style={s.successDesc}>
                We'll notify you as soon as a driver publishes a route from{' '}
                <Text style={s.successBold}>{fromCity}</Text> to{' '}
                <Text style={s.successBold}>{toCity}</Text>.
              </Text>
              <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Form */
            <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
              <Text style={s.desc}>
                We'll send you an Email and a push notification when a driver publishes a matching route. You can change the cities below.
              </Text>

              <Text style={s.label}>FROM</Text>
              <TouchableOpacity
                style={s.field}
                onPress={() => setShowFromPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={fromCity ? s.fieldValue : s.fieldPlaceholder}>
                  {fromCity || 'Select origin city'}
                </Text>
                <Text style={s.fieldChevron}>›</Text>
              </TouchableOpacity>

              <Text style={[s.label, { marginTop: Spacing.md }]}>TO</Text>
              <TouchableOpacity
                style={s.field}
                onPress={() => setShowToPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={toCity ? s.fieldValue : s.fieldPlaceholder}>
                  {toCity || 'Select destination city'}
                </Text>
                <Text style={s.fieldChevron}>›</Text>
              </TouchableOpacity>

              <Text style={[s.label, { marginTop: Spacing.lg }]}>FROM DATE</Text>
              <Text style={s.dateHint}>
                {dateFrom
                  ? `Alert me for routes departing from ${format(dateFrom, 'EEE, MMM d yyyy')}`
                  : 'Alert me for any upcoming date'}
              </Text>
              <InlineDatePicker selected={dateFrom} onSelect={setDateFrom} />

              {!profile && (
                <>
                  <Text style={[s.label, { marginTop: Spacing.lg }]}>EMAIL</Text>
                  <TextInput
                    style={s.emailInput}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.text.tertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </>
              )}

              {error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[s.submitBtn, (!canSubmit || isSubmitting) && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                activeOpacity={0.85}
              >
                <Bell size={16} color={Colors.white} strokeWidth={2} />
                <Text style={s.submitBtnText}>
                  {isSubmitting ? 'Saving…' : 'Notify me'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <CityPickerModal
        visible={showFromPicker}
        title="Select origin city"
        citiesByCountry={citiesByCountry}
        onSelect={(c: any) => {
          setFromCity(c.name);
          setFromCityId(c.id);
        }}
        onClose={() => setShowFromPicker(false)}
      />
      <CityPickerModal
        visible={showToPicker}
        title="Select destination city"
        citiesByCountry={citiesByCountry}
        onSelect={(c: any) => {
          setToCity(c.name);
          setToCityId(c.id);
        }}
        onClose={() => setShowToPicker(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  body: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  desc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  fieldValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  fieldPlaceholder: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
  },
  fieldChevron: {
    fontSize: 20,
    color: Colors.text.secondary,
  },
  dateHint: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.md,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.text.tertiary,
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
  },
  successRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successBold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  doneBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
});
