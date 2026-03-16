import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice, formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';
import { useRequestStore } from '@/stores/requestStore';

export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRequest, isLoading, loadRequest, acceptOffer } = useRequestStore();

  useEffect(() => { loadRequest(id); }, [id]);

  const handleAccept = (offerId: string) => {
    Alert.alert('Accept Offer', 'Accept this offer and create a booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            await acceptOffer(offerId, id);
            router.push('/(tabs)/bookings');
          } catch {
            Alert.alert('Error', 'Could not accept offer. Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!activeRequest) return null;

  const offers = activeRequest.shipping_request_offers ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={styles.info}>
            <Text style={styles.route}>{activeRequest.origin_city} → {activeRequest.destination_city}</Text>
            <Text style={styles.meta}>{activeRequest.package_weight_kg} kg · {activeRequest.package_category}</Text>
            {activeRequest.max_budget_eur && (
              <Text style={styles.budget}>Budget: {formatPrice(activeRequest.max_budget_eur)}</Text>
            )}
            <Text style={styles.offersTitle}>{offers.length} Offer{offers.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.offerCard}>
            <View style={styles.offerRow}>
              <Text style={styles.offerPrice}>{formatPrice(item.proposed_price_eur)}</Text>
              {item.proposed_pickup_date && (
                <Text style={styles.offerDate}>{formatDate(item.proposed_pickup_date)}</Text>
              )}
            </View>
            {item.message && <Text style={styles.offerMessage}>{item.message}</Text>}
            {item.status === 'pending' && (
              <Button
                label="Accept Offer"
                onPress={() => handleAccept(item.id)}
                size="sm"
                style={styles.acceptButton}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="⏳"
            title="No offers yet"
            description="Drivers will send you offers soon. Check back later."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  info: { padding: Spacing.base },
  route: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary, marginBottom: 4 },
  meta: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: 4 },
  budget: { fontSize: FontSize.base, fontWeight: '600', color: Colors.primary, marginBottom: Spacing.md },
  offersTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.sm },
  list: { flexGrow: 1 },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  offerPrice: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  offerDate: { fontSize: FontSize.sm, color: Colors.text.secondary },
  offerMessage: { fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: Spacing.sm, lineHeight: 20 },
  acceptButton: { marginTop: Spacing.sm },
});
