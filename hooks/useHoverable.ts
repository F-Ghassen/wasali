import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

interface Hoverable {
  isHovered: boolean;
  hoverHandlers: {
    onHoverIn?: () => void;
    onHoverOut?: () => void;
  };
}

const isWeb = Platform.OS === 'web';

export function useHoverable(): Hoverable {
  const [isHovered, setIsHovered] = useState(false);

  const onHoverIn = useCallback(() => setIsHovered(true), []);
  const onHoverOut = useCallback(() => setIsHovered(false), []);

  return {
    isHovered: isWeb && isHovered,
    hoverHandlers: isWeb ? { onHoverIn, onHoverOut } : {},
  };
}
