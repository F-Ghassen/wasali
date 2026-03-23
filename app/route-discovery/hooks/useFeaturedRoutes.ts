import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { fetchFeaturedRoutes } from '@/app/route-discovery/services/featuredRoutesService';
import type { FeaturedRoute } from '@/app/route-discovery/types/featured-route';

export function useFeaturedRoutes() {
  const [routes, setRoutes]     = useState<FeaturedRoute[]>([]);
  const [isLoading, setLoading] = useState(false);

  const slideY  = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFeaturedRoutes();
      setRoutes(data);
    } catch (err) {
      console.error('useFeaturedRoutes: fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (routes.length === 0) return;
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 55,
        friction: 8,
        delay: 300,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
        delay: 300,
      }),
    ]).start();
  }, [routes.length]);

  return { routes, isLoading, slideY, opacity };
}
