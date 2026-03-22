import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useSearchStore } from '@/stores/searchStore';
import { useCitiesStore } from '@/stores/citiesStore';

type CountryData = {
  country: string;
  flag: string;
  routeCount: number;
  cityId?: string;
};

export default function WhereAreYouFrom() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const router = useRouter();
  const { t } = useTranslation();
  const { setFromCity, setToCity, setDepartFromDate } = useSearchStore();
  const { cities, countryFlags, euCountries, isLoading: citiesLoading } = useCitiesStore();

  const [countries, setCountries] = useState<CountryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tunisiaDestinationId, setTunisiaDestinationId] = useState<string>('');

  useEffect(() => {
    if (!citiesLoading && cities.length > 0) {
      fetchCountries();
    }
  }, [citiesLoading, cities]);

  const fetchCountries = async () => {
    try {
      // Find Tunisia destination city (Tunis) from store
      const tunisCity = cities.find((c) => c.country === 'Tunisia' && c.name === 'Tunis');
      if (tunisCity?.id) {
        setTunisiaDestinationId(tunisCity.id);
      }

      // Build city ID map from store for quick lookup
      const cityIdMap: Record<string, string> = {};
      cities.forEach((city) => {
        cityIdMap[`${city.name}-${city.country}`] = city.id;
      });

      // Fetch routes with origin country
      const { data, error } = await supabase
        .from('routes')
        .select('origin_city, origin_country')
        .eq('status', 'active');

      if (error) throw error;

      // Count routes by country and get a sample city
      const countryMap: Record<string, { count: number; city: string }> = {};

      if (data) {
        data.forEach((route: any) => {
          const country = route.origin_country || 'Unknown';
          if (!countryMap[country]) {
            countryMap[country] = { count: 0, city: route.origin_city };
          }
          countryMap[country].count += 1;
        });
      }

      // Build result: Tunisia first, then top 3 EU countries
      const result: CountryData[] = [];

      // Add Tunisia if it exists
      if (countryMap['Tunisia']) {
        const city = countryMap['Tunisia'].city;
        const cityId = cityIdMap[`${city}-Tunisia`];
        result.push({
          country: 'Tunisia',
          flag: countryFlags['Tunisia'] || '🇹🇳',
          routeCount: countryMap['Tunisia'].count,
          cityId,
        });
      }

      // Get top 3 EU countries
      const topEuCountries = Object.entries(countryMap)
        .filter(([country]) => euCountries.includes(country))
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 3);

      topEuCountries.forEach(([country, mapData]) => {
        const city = mapData.city;
        const cityId = cityIdMap[`${city}-${country}`];
        result.push({
          country,
          flag: countryFlags[country] || '🌍',
          routeCount: mapData.count,
          cityId,
        });
      });

      setCountries(result);
      setIsLoading(false);
    } catch (error) {
      console.error('WhereAreYouFrom: Error fetching countries:', error);
      setIsLoading(false);
    }
  };

  const handleCardPress = (country: CountryData) => {
    if (!country.cityId || !tunisiaDestinationId) return;

    // Set from city (departure)
    setFromCity(country.cityId, country.country, country.country);

    // Set to city (Tunisia - Tunis)
    setToCity(tunisiaDestinationId, 'Tunis', 'Tunisia');

    // Set departure date to today
    const today = format(new Date(), 'yyyy-MM-dd');
    setDepartFromDate(today);

    // Navigate to results
    router.push({
      pathname: '/(tabs)/routes/results',
      params: {
        origin_city_id: country.cityId,
        destination_city_id: tunisiaDestinationId,
        depart_from_date: today,
      },
    } as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('home.whereFrom.title')}</Text>
          <Text style={styles.subtitle}>{t('home.whereFrom.subtitle')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (countries.length === 0) {
    // Render header even if no data
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('home.whereFrom.title')}</Text>
          <Text style={styles.subtitle}>{t('home.whereFrom.subtitle')}</Text>
        </View>
        <Text style={styles.emptyText}>No routes available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.whereFrom.title')}</Text>
        <Text style={styles.subtitle}>{t('home.whereFrom.subtitle')}</Text>
      </View>

      {/* Cards Grid */}
      {isWide ? (
        // Desktop: Row layout
        <View style={styles.cardsRowDesktop}>
          {countries.map((country) => (
            <TouchableOpacity
              key={country.country}
              style={styles.countryCard}
              onPress={() => handleCardPress(country)}
              activeOpacity={0.8}
            >
              <Text style={styles.flagEmoji}>{country.flag}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.countryName}>{country.country}</Text>
                <Text style={styles.routeCount}>
                  {country.routeCount} {country.routeCount === 1 ? 'route' : 'routes'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        // Mobile: 2x2 grid
        <View style={styles.cardsGridMobile}>
          {countries.map((country) => (
            <TouchableOpacity
              key={country.country}
              style={styles.countryCardMobile}
              onPress={() => handleCardPress(country)}
              activeOpacity={0.8}
            >
              <Text style={styles.flagEmojiMobile}>{country.flag}</Text>
              <View style={styles.cardContentMobile}>
                <Text style={styles.countryNameMobile}>{country.country}</Text>
                <Text style={styles.routeCountMobile}>
                  {country.routeCount}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* See All CTA */}
      <TouchableOpacity
        style={styles.seeAllCTA}
        onPress={() => router.push('/(tabs)/routes/results' as any)}
        activeOpacity={0.7}
      >
        <Text style={styles.seeAllText}>{t('home.whereFrom.seeAll')}</Text>
        <ArrowRight size={14} color={Colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },

  // ── Desktop Row Layout ───────────────────────────────────────────────────
  cardsRowDesktop: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  countryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  flagEmoji: {
    fontSize: 40,
  },
  cardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  countryName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  routeCount: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  // ── Mobile 2x2 Grid ────────────────────────────────────────────────────
  cardsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  countryCardMobile: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flagEmojiMobile: {
    fontSize: 32,
  },
  cardContentMobile: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  countryNameMobile: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  routeCountMobile: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: '500',
  },

  // ── See All CTA ────────────────────────────────────────────────────────
  seeAllCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ── Loading ────────────────────────────────────────────────────────────
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Empty State ────────────────────────────────────────────────────────
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
