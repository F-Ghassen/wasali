import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface UseCountryCardAnimationOptions {
  /** Card's position in the grid/row — drives the staggered entrance delay */
  index: number;
}

interface UseCountryCardAnimationResult {
  /** Apply to the outer card wrapper: entrance fade/slide-up + press/hover scale + hover lift */
  cardStyle: {
    opacity: Animated.Value;
    transform: (
      | { translateY: Animated.Value | Animated.AnimatedAddition<number> }
      | { scale: Animated.Value | Animated.AnimatedMultiplication<number> }
    )[];
  };
  /** Shadow deepens slightly on hover (web only — native ignores hover events) */
  shadowOpacity: Animated.AnimatedInterpolation<number>;
  /** Drives the one-shot diagonal sheen sweep across the flag */
  sheenTranslateX: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
}

const ENTRANCE_STAGGER_MS = 90;
const SHEEN_DELAY_MS = 280;
const HOVER_LIFT_PX = -6;
const HOVER_SCALE = 1.03;
const PRESS_SCALE = 0.96;

/**
 * Animation state for a single country card: staggered entrance (fade + slide-up),
 * a one-shot diagonal sheen sweep once the card has settled, a tactile
 * press-in/press-out scale, and a web hover lift + scale + deeper shadow
 * (onHoverIn/onHoverOut are web-only — react-native-web fires them from real
 * mouse events; native touch simply never calls them). Pure animation state —
 * no data fetching, no navigation.
 */
export function useCountryCardAnimation({
  index,
}: UseCountryCardAnimationOptions): UseCountryCardAnimationResult {
  const opacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(16)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const hoverProgress = useRef(new Animated.Value(0)).current;
  const sheenTranslateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const entranceDelay = index * ENTRANCE_STAGGER_MS;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        delay: entranceDelay,
        useNativeDriver: true,
      }),
      Animated.spring(entranceTranslateY, {
        toValue: 0,
        delay: entranceDelay,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(sheenTranslateX, {
      toValue: 1,
      duration: 900,
      delay: entranceDelay + SHEEN_DELAY_MS,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animated values are stable refs; index only used for delay math
  }, [index]);

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: PRESS_SCALE,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  };

  const onHoverIn = () => {
    Animated.spring(hoverProgress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const onHoverOut = () => {
    Animated.spring(hoverProgress, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const hoverLift = hoverProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, HOVER_LIFT_PX],
  });
  const hoverScale = hoverProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, HOVER_SCALE],
  });
  const shadowOpacity = hoverProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.28],
  });

  return {
    cardStyle: {
      opacity,
      transform: [
        { translateY: Animated.add(entranceTranslateY, hoverLift) },
        { scale: Animated.multiply(pressScale, hoverScale) },
      ],
    },
    shadowOpacity,
    sheenTranslateX,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
  };
}
