import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { RequestCard } from '@/components/request/RequestCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useRequestStore } from '@/stores/requestStore';
import { useAuthStore } from '@/stores/authStore';

export default function RequestsScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { myRequests, isLoading, loadMyRequests } = useRequestStore();

  useEffect(() => {
    if (session) loadMyRequests(session.user.id);
  }, [session]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Requests</Text>
        <Button
          label="+ New Request"
          onPress={() => router.push('/shipping-requests/new')}
          variant="outline"
          size="sm"
          fullWidth={false}
        />
      </View>
      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={myRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => session && loadMyRequests(session.user.id)}
            />
          }
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onPress={() => router.push(`/shipping-requests/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title="No shipping requests"
              description="Post a request and let drivers come to you with offers"
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
    justifyContent: 'space-between',
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary },
  list: { padding: Spacing.base, flexGrow: 1 },
});
