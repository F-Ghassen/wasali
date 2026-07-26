import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Lock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { STOP_TYPE } from '@/constants/stopTypes';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useSearchStore } from '@/stores/searchStore';
import { useCitiesStore } from '@/stores/citiesStore';
import { Skeleton } from '@/components/shared/ui/primitives/Skeleton';
import { CountryCard } from './CountryCard';

type CountryData = {
  country: string;
  flag: string;
  routeCount: number;
  cityId?: string;
};

// Always show at least this many country cards, even when fewer countries
// currently have active routes — falls back to these (with routeCount: 0)
// so the section never looks sparse/empty on a quiet day.
const MIN_VISIBLE_COUNTRIES = 4;
const FALLBACK_COUNTRIES = ['Tunisia', 'Germany', 'France', 'Italy'];

export default function OriginCountryPicker() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Add side padding on large screens to center cards
  const containerStyle = isWide && width > 1200
    ? { ...styles.container, paddingHorizontal: (width - 1200) / 2 }
    : styles.container;
  const router = useRouter();
  const { t } = useTranslation();
  const { setFromCity, setToCity, setDepartFromDate } = useSearchStore();
  const { cities, countryFlags, euCountries, isLoading: citiesLoading } = useCitiesStore();

  const [countries, setCountries] = useState<CountryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!citiesLoading) {
      fetchCountries();
    }
  }, [citiesLoading]);

  const fetchCountries = async () => {
    try {

      // Build city ID map from store for quick lookup
      const cityIdMap: Record<string, string> = {};
      cities.forEach((city) => {
        cityIdMap[`${city.name}-${city.country}`] = city.id;
      });

      // Fetch routes with their stops - only routes still available for collection
      // with future departure dates (matching search results filter)
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('routes')
        .select('id, route_stops(city_id, stop_type)')
        .eq('status', 'active')
        .gt('available_weight_kg', 0)
        .gte('departure_date', today);

      if (error) throw error;

      // Count routes by country and get a sample city
      const countryMap: Record<string, { count: number; city: string }> = {};

      if (data) {
        data.forEach((route: any) => {
          // Get origin city from pickup stop
          const pickupStop = route.route_stops?.find((s: any) => s.stop_type === STOP_TYPE.COLLECTION);
          if (pickupStop?.city_id) {
            const city = cities.find((c) => c.id === pickupStop.city_id);
            if (city) {
              const country = city.country;
              if (!countryMap[country]) {
                countryMap[country] = { count: 0, city: city.name };
              }
              countryMap[country].count += 1;
            }
          }
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

      // Backfill with the static fallback list so the section always shows at
      // least MIN_VISIBLE_COUNTRIES cards, even with 0 routes on a quiet day.
      const shownCountries = new Set(result.map((c) => c.country));
      for (const country of FALLBACK_COUNTRIES) {
        if (result.length >= MIN_VISIBLE_COUNTRIES) break;
        if (shownCountries.has(country)) continue;
        result.push({
          country,
          flag: countryFlags[country] || '🌍',
          routeCount: countryMap[country]?.count ?? 0,
        });
        shownCountries.add(country);
      }

      setCountries(result);
      setIsLoading(false);
    } catch (error) {
      console.error('OriginCountryPicker: Error fetching countries:', error);
      setIsLoading(false);
    }
  };

  const handleCardPress = (country: CountryData) => {
    // Set from country (departure) - any city from this country
    // Leave city name/id empty to show routes from ANY city in the country
    setFromCity('', '', country.country);

    // Set to city - empty to show all destinations
    setToCity('', '', '');

    // Set departure date to today
    const today = format(new Date(), 'yyyy-MM-dd');
    setDepartFromDate(today);

    // Navigate to results - show all destinations from any city in this country
    router.push({
      pathname: '/(sender)/routes/results',
      params: {
        origin_country: country.country,
        depart_from_date: today,
        // Note: no city or destination params, so it shows routes from any city in the country to any destination
      },
    } as any);
  };

  if (isLoading) {
    return (
      <View style={containerStyle}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('home.whereFrom.title')}</Text>
          <Text style={styles.subtitle}>{t('home.whereFrom.subtitle')}</Text>
        </View>

        {/* Skeleton Loading */}
        {isWide ? (
          <View style={styles.cardsRowDesktop}>
            <Skeleton style={styles.skeletonCard} />
            <Skeleton style={styles.skeletonCard} />
            <Skeleton style={styles.skeletonCard} />
          </View>
        ) : (
          <View style={styles.cardsGridMobile}>
            <Skeleton style={styles.skeletonCardMobile} />
            <Skeleton style={styles.skeletonCardMobile} />
            <Skeleton style={styles.skeletonCardMobile} />
            <Skeleton style={styles.skeletonCardMobile} />
          </View>
        )}
      </View>
    );
  }

  if (countries.length === 0) {
    return (
      <View style={containerStyle}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('home.whereFrom.title')}</Text>
          <Text style={styles.subtitle}>{t('home.whereFrom.subtitle')}</Text>
        </View>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Lock size={48} color={Colors.text.secondary} />
          </View>
          <Text style={styles.emptyStateText}>No routes available yet</Text>
          <Text style={styles.emptyText}>Check back soon for new destinations</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.whereFrom.title')}</Text>
        <Text style={styles.subtitle}>{t('home.whereFrom.subtitle')}</Text>
      </View>

      {/* Cards Grid */}
      {isWide ? (
        // Desktop: Row layout
        <View style={styles.cardsRowDesktop}>
          {countries.map((country, index) => (
            <CountryCard
              key={country.country}
              country={country.country}
              routeCount={country.routeCount}
              index={index}
              variant="desktop"
              onPress={() => handleCardPress(country)}
            />
          ))}
        </View>
      ) : (
        // Mobile: 2x2 grid
        <View style={styles.cardsGridMobile}>
          {countries.map((country, index) => (
            <CountryCard
              key={country.country}
              country={country.country}
              routeCount={country.routeCount}
              index={index}
              variant="mobile"
              onPress={() => handleCardPress(country)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 480,
    fontWeight: '500',
  },

  // ── Desktop Row Layout ───────────────────────────────────────────────────
  // Card sizing/appearance now lives in CountryCard.tsx
  cardsRowDesktop: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },

  // ── Mobile 2x2 Grid ────────────────────────────────────────────────────
  cardsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    justifyContent: 'space-between',
  },

  // ── See All CTA ────────────────────────────────────────────────────────
  seeAllCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  seeAllLeft: {},
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  seeAllSub: {},
  seeAllArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Skeleton Loading ────────────────────────────────────────────────────
  skeletonCard: {
    flex: 1,
    height: 80,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.lg,
  },
  skeletonCardMobile: {
    width: '48%',
    height: 120,
    borderRadius: BorderRadius['2xl'],
  },

  // ── Empty State ────────────────────────────────────────────────────────
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
  },
  emptyStateIcon: {
    marginBottom: Spacing.lg,
  },
  emptyStateText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
