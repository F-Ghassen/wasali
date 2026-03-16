import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { useSearchStore } from '@/stores/searchStore';
import { EU_ORIGIN_CITIES, TN_DESTINATION_CITIES, type City } from '@/constants/cities';

function CityPicker({
  visible,
  cities,
  onSelect,
  onClose,
  title,
}: {
  visible: boolean;
  cities: City[];
  onSelect: (city: City) => void;
  onClose: () => void;
  title: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.country.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={picker.container}>
        <View style={picker.header}>
          <Text style={picker.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={picker.close}>
            <Text style={picker.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={picker.search}
          placeholder="Search city or country..."
          placeholderTextColor={Colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={picker.item}
              onPress={() => {
                onSelect(item);
                onClose();
                setQuery('');
              }}
            >
              <Text style={picker.flag}>{item.flag}</Text>
              <View>
                <Text style={picker.cityName}>{item.name}</Text>
                <Text style={picker.countryName}>{item.country}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const picker = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  close: { padding: Spacing.sm },
  closeText: { fontSize: FontSize.lg, color: Colors.text.secondary },
  search: {
    margin: Spacing.base,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  flag: { fontSize: 28 },
  cityName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary },
  countryName: { fontSize: FontSize.sm, color: Colors.text.secondary },
});

export default function HomeScreen() {
  const router = useRouter();
  const { fromCity, fromCountry, toCity, toCountry, setFromCity, setToCity, isSearching } =
    useSearchStore();
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const canSearch = !!fromCity && !!toCity;

  const handleSearch = () => {
    if (!canSearch) return;
    router.push('/routes/results');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.title}>Where are you shipping from?</Text>
        </View>

        <View style={styles.card}>
          {/* From */}
          <TouchableOpacity style={styles.cityRow} onPress={() => setShowFrom(true)}>
            <View style={styles.cityIcon}>
              <Text style={styles.directionLabel}>FROM</Text>
            </View>
            <View style={styles.cityInfo}>
              {fromCity ? (
                <>
                  <Text style={styles.cityName}>{fromCity}</Text>
                  <Text style={styles.cityCountry}>{fromCountry}</Text>
                </>
              ) : (
                <Text style={styles.placeholder}>Select origin city</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* To */}
          <TouchableOpacity style={styles.cityRow} onPress={() => setShowTo(true)}>
            <View style={styles.cityIcon}>
              <Text style={styles.directionLabel}>TO</Text>
            </View>
            <View style={styles.cityInfo}>
              {toCity ? (
                <>
                  <Text style={styles.cityName}>{toCity}</Text>
                  <Text style={styles.cityCountry}>{toCountry}</Text>
                </>
              ) : (
                <Text style={styles.placeholder}>Select destination city</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Button
          label={isSearching ? 'Searching...' : 'Search Available Drivers'}
          onPress={handleSearch}
          isLoading={isSearching}
          disabled={!canSearch}
          size="lg"
          style={styles.searchButton}
        />

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        <TouchableOpacity
          style={styles.requestBanner}
          onPress={() => router.push('/shipping-requests/new')}
        >
          <Text style={styles.requestIcon}>📋</Text>
          <View>
            <Text style={styles.requestTitle}>Post a shipping request</Text>
            <Text style={styles.requestSubtitle}>Let drivers come to you with offers</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <CityPicker
        visible={showFrom}
        cities={EU_ORIGIN_CITIES}
        title="Select Origin City"
        onSelect={(c) => setFromCity(c.name, c.country)}
        onClose={() => setShowFrom(false)}
      />
      <CityPicker
        visible={showTo}
        cities={TN_DESTINATION_CITIES}
        title="Select Destination City"
        onSelect={(c) => setToCity(c.name, c.country)}
        onClose={() => setShowTo(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { padding: Spacing.base },
  header: { marginBottom: Spacing.xl },
  greeting: { fontSize: FontSize.base, color: Colors.text.secondary },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  cityIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionLabel: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  cityInfo: { flex: 1 },
  cityName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  cityCountry: { fontSize: FontSize.sm, color: Colors.text.secondary },
  placeholder: { fontSize: FontSize.base, color: Colors.text.tertiary },
  chevron: { fontSize: 20, color: Colors.text.tertiary },
  divider: { height: 1, backgroundColor: Colors.border.light, marginHorizontal: Spacing.base },
  searchButton: { marginBottom: Spacing.base },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.base,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border.light },
  orText: { fontSize: FontSize.sm, color: Colors.text.tertiary },
  requestBanner: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  requestIcon: { fontSize: 32 },
  requestTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  requestSubtitle: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
