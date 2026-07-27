import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useHoverable } from '@/hooks/useHoverable';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const { isHovered, hoverHandlers } = useHoverable();

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      {...hoverHandlers}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isHovered && !isDisabled && styles[`${variant}Hover`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    transitionProperty: 'background-color, border-color, box-shadow, transform',
    transitionDuration: '160ms',
    transitionTimingFunction: 'ease-out',
    cursor: 'pointer',
  } as unknown as ViewStyle,
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5, cursor: 'not-allowed' } as unknown as ViewStyle,

  primary: { backgroundColor: Colors.primary },
  primaryHover: { backgroundColor: Colors.primaryHover },
  secondary: { backgroundColor: Colors.secondary },
  secondaryHover: { backgroundColor: Colors.secondaryHover },
  outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineHover: { backgroundColor: Colors.primaryLight },
  ghost: { backgroundColor: Colors.transparent },
  ghostHover: { backgroundColor: Colors.primaryLight },
  destructive: { backgroundColor: Colors.error },
  destructiveHover: { backgroundColor: Colors.errorHover },

  size_sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.base },
  size_lg: { paddingVertical: Spacing.base, paddingHorizontal: Spacing.xl },

  text: { fontWeight: '600' },
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.white },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },
  text_destructive: { color: Colors.white },

  textSize_sm: { fontSize: FontSize.sm },
  textSize_md: { fontSize: FontSize.base },
  textSize_lg: { fontSize: FontSize.md },
});
