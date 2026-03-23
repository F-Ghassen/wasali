import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ArrowRight, Lock, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useSearchStore } from '@/stores/searchStore';
import { useCitiesStore } from '@/stores/citiesStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { getFlagImageUrl } from '@/lib/flagImages';

type CountryData = {
  country: string;
  flag: string;
  routeCount: number;
  cityId?: string;
};

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
    if (!citiesLoading && cities.length > 0) {
      fetchCountries();
    }
  }, [citiesLoading, cities]);

  const fetchCountries = async () => {
    try {

      // Build city ID map from store for quick lookup
      const cityIdMap: Record<string, string> = {};
      cities.forEach((city) => {
        cityIdMap[`${city.name}-${city.country}`] = city.id;
      });

      // Fetch routes with origin city ID - only routes still available for collection
      // with future departure dates (matching search results filter)
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('routes')
        .select('origin_city_id')
        .eq('status', 'active')
        .gt('available_weight_kg', 0)
        .gte('departure_date', today);

      if (error) throw error;

      // Count routes by country and get a sample city
      const countryMap: Record<string, { count: number; city: string }> = {};

      if (data) {
        data.forEach((route: any) => {
          // Look up city from store using city_id
          const city = cities.find((c) => c.id === route.origin_city_id);
          if (city) {
            const country = city.country;
            if (!countryMap[country]) {
              countryMap[country] = { count: 0, city: city.name };
            }
            countryMap[country].count += 1;
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
      pathname: '/(tabs)/routes/results',
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
          {countries.map((country) => (
            <TouchableOpacity
              key={country.country}
              style={styles.countryCard}
              onPress={() => handleCardPress(country)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: getFlagImageUrl(country.country) }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.cardGradient}
              />
              <View style={styles.cardContent}>
                <Text style={styles.countryName}>{country.country}</Text>
                <View style={styles.routeMeta}>
                  <Package size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                  <Text style={styles.routeCount}>
                    {country.routeCount} {country.routeCount === 1 ? 'route' : 'routes'}
                  </Text>
                </View>
              </View>
              <View style={styles.arrowChip}>
                <ArrowRight size={12} color={Colors.white} strokeWidth={2.5} />
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
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: getFlagImageUrl(country.country) }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.cardGradient}
              />
              <View style={styles.cardContent}>
                <Text style={styles.countryName}>{country.country}</Text>
                <View style={styles.routeMeta}>
                  <Package size={10} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                  <Text style={styles.routeCount}>{country.routeCount} routes</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* See All CTA */}
      <TouchableOpacity
        style={styles.seeAllCTA}
        onPress={() => router.push({
          pathname: '/(tabs)/routes/results',
          params: { depart_from_date: format(new Date(), 'yyyy-MM-dd') },
        } as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.seeAllText}>{t('home.whereFrom.seeAll')}</Text>
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
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },

  // ── Desktop Row Layout ───────────────────────────────────────────────────
  cardsRowDesktop: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  countryCard: {
    flex: 1,
    height: 160,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.background.secondary,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // ── Mobile 2x2 Grid ────────────────────────────────────────────────────
  cardsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  countryCardMobile: {
    width: '48%',
    height: 150,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.background.secondary,
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // ── Shared card internals ───────────────────────────────────────────────
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: 4,
  },
  countryName: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeCount: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
  arrowChip: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
