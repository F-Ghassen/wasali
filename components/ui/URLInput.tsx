import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Input } from './Input';

interface URLInputProps {
  label?: string;
  value?: string;
  onChangeText: (val: string) => void;
  error?: string;
  placeholder?: string;
}

function isValidURL(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function URLInput({ label, value, onChangeText, error, placeholder }: URLInputProps) {
  const [urlError, setUrlError] = useState<string | undefined>();

  const handleBlur = () => {
    if (value && !isValidURL(value)) {
      setUrlError('URL must start with http:// or https://');
    } else {
      setUrlError(undefined);
    }
  };

  const handlePreview = async () => {
    if (!value) return;
    try {
      const supported = await Linking.canOpenURL(value);
      if (supported) {
        await Linking.openURL(value);
      } else {
        Alert.alert('Cannot open URL', value);
      }
    } catch {
      Alert.alert('Error', 'Could not open this URL');
    }
  };

  const displayError = error ?? urlError;
  const showPreview = !!value && isValidURL(value);

  return (
    <View>
      <Input
        label={label}
        value={value ?? ''}
        onChangeText={onChangeText}
        onBlur={handleBlur}
        error={displayError}
        placeholder={placeholder}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {showPreview && (
        <TouchableOpacity style={styles.previewBtn} onPress={handlePreview} activeOpacity={0.7}>
          <ExternalLink size={12} color={Colors.secondary} />
          <Text style={styles.previewText}>Preview →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  previewText: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
});
