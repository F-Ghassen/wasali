import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LanguagePickerModal } from './LanguagePickerModal';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

const FLAG: Record<string, string> = { en: '🇬🇧', fr: '🇫🇷' };

export function LanguageNavButton() {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const lang = i18n.language ?? 'en';

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.wrapper, { top: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={styles.pill}
          onPress={() => setVisible(true)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.flag}>{FLAG[lang] ?? '🌐'}</Text>
          <Text style={styles.code}>{lang.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <LanguagePickerModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: Spacing.base,
    zIndex: 9999,
    elevation: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  flag: { fontSize: 14 },
  code: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
});
