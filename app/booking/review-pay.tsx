import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/booking/StepIndicator';
import { formatDate, formatPrice } from '@/utils/formatters';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold]}>{value}</Text>
    </View>
  );
}

export default function ReviewPayScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);

  const { selectedRoute, draft, calculatedPriceEur, createPaymentIntent, confirmBooking, reset } =
    useBookingStore();
  const { session } = useAuthStore();
  const { showToast } = useUIStore();

  const handlePay = async () => {
    if (!session || !selectedRoute) return;
    setIsProcessing(true);

    try {
      const clientSecret = await createPaymentIntent(session.user.id);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Wasali',
        returnURL: 'wasali://booking/complete',
      });

      if (initError) throw new Error(initError.message);

      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') {
          throw new Error(payError.message);
        }
        return;
      }

      // Payment succeeded — confirm booking
      const bookingId = await confirmBooking(clientSecret.split('_secret_')[0]);
      showToast('Booking confirmed! 🎉', 'success');
      reset();
      router.replace(`/bookings/${bookingId}`);
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Please try again'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedRoute) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stepHeader}>
        <StepIndicator currentStep={3} totalSteps={3} labels={['Package', 'Logistics', 'Payment']} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review & Pay</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <SummaryRow label="From" value={`${selectedRoute.origin_city}, ${selectedRoute.origin_country}`} />
          <SummaryRow label="To" value={`${selectedRoute.destination_city}, ${selectedRoute.destination_country}`} />
          <SummaryRow label="Departure" value={formatDate(selectedRoute.departure_date)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Package</Text>
          <SummaryRow label="Weight" value={`${draft.packageWeightKg} kg`} />
          <SummaryRow label="Category" value={draft.packageCategory} />
          <SummaryRow label="Pickup" value={draft.pickupType === 'driver_pickup' ? 'Driver picks up' : 'I drop off'} />
          <SummaryRow label="Delivery" value={draft.dropoffType === 'home_delivery' ? 'Home delivery' : 'Recipient pickup'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <SummaryRow label="Rate" value={`${formatPrice(selectedRoute.price_per_kg_eur)} / kg`} />
          <SummaryRow label="Weight" value={`${draft.packageWeightKg} kg`} />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={formatPrice(calculatedPriceEur)} bold />
        </View>

        <View style={styles.escrowNotice}>
          <Text style={styles.escrowIcon}>🔒</Text>
          <Text style={styles.escrowText}>
            Payment is held in escrow until delivery is confirmed.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={`Pay ${formatPrice(calculatedPriceEur)} Securely`}
          onPress={handlePay}
          isLoading={isProcessing}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  stepHeader: { paddingVertical: Spacing.base, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  content: { padding: Spacing.base, gap: Spacing.base },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  summaryLabel: { fontSize: FontSize.base, color: Colors.text.secondary },
  summaryValue: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text.primary },
  summaryBold: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  escrowNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  escrowIcon: { fontSize: 20 },
  escrowText: { flex: 1, fontSize: FontSize.sm, color: Colors.success, lineHeight: 20 },
  footer: { padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border.light },
});
