import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { RouteCard } from '@/components/route/RouteCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSearchStore } from '@/stores/searchStore';
import { useBookingStore } from '@/stores/bookingStore';
import type { RouteWithStops } from '@/types/models';

export default function ResultsScreen() {
  const router = useRouter();
  const { fromCity, toCity, results, isSearching, search } = useSearchStore();
  const { setRoute } = useBookingStore();

  useEffect(() => {
    search();
  }, []);

  const handleSelectRoute = (route: RouteWithStops) => {
    setRoute(route);
    router.push(`/routes/${route.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.route}>{fromCity} → {toCity}</Text>
          {!isSearching && (
            <Text style={styles.count}>{results.length} route{results.length !== 1 ? 's' : ''} found</Text>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RouteCard route={item} onPress={() => handleSelectRoute(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No routes found"
              description="No drivers are scheduled for this route yet. Try a different date or post a shipping request."
              actionLabel="Post a Request"
              onAction={() => router.push('/shipping-requests/new')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
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
  route: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  count: { fontSize: FontSize.sm, color: Colors.text.secondary },
  list: { padding: Spacing.base, flexGrow: 1 },
});
