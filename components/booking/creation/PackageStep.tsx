import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { uploadImage } from '@/utils/imageUpload';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PackageStepProps {
  weight: string;
  packageTypes: string[];
  otherDesc: string;
  packageDesc: string;
  /** Local device URIs for instant preview. */
  photos: string[];
  /** Uploaded storage paths, aligned by index with `photos` (null = still uploading/failed). */
  photoPaths: (string | null)[];
  /** Uploads write to `package-photos/{userId}/...` — required to upload at all. */
  userId: string;
  maxWeight?: number | null;
  isValid: boolean;
  onWeightChange: (v: string) => void;
  onTogglePackageType: (key: string) => void;
  onOtherDescChange: (v: string) => void;
  onPackageDescChange: (v: string) => void;
  onPhotosChange: (uris: string[], paths: (string | null)[]) => void;
  onContinue: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEIGHT_CHIPS = [2, 7, 15, 25];
const MAX_PHOTOS = 5;

// ─── Component ────────────────────────────────────────────────────────────────

export function PackageStep({
  weight, packageTypes, otherDesc, packageDesc, photos, photoPaths, userId,
  maxWeight, isValid,
  onWeightChange, onTogglePackageType, onOtherDescChange,
  onPackageDescChange, onPhotosChange, onContinue,
}: PackageStepProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const PACKAGE_TYPES = [
    { key: 'clothing',    label: t('booking.packageTypes.clothing') },
    { key: 'food',        label: t('booking.packageTypes.food') },
    { key: 'electronics', label: t('booking.packageTypes.electronics') },
    { key: 'documents',   label: t('booking.packageTypes.documents') },
    { key: 'mixed',       label: t('booking.packageTypes.mixed') },
    { key: 'other',       label: t('booking.packageTypes.other') },
  ];

  const handleAddPhoto = async () => {
    if (photos.length >= MAX_PHOTOS || isUploading) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;

    const assets = result.assets.slice(0, MAX_PHOTOS - photos.length);
    const newUris = assets.map((a) => a.uri);
    // Instant local preview — the sender sees their picked photos immediately,
    // independent of upload progress.
    onPhotosChange([...photos, ...newUris].slice(0, MAX_PHOTOS), [...photoPaths, ...newUris.map(() => null)].slice(0, MAX_PHOTOS));

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await Promise.all(
        assets.map((a, i) => {
          const ext = a.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const path = `${userId}/${Date.now()}-${photos.length + i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          return uploadImage('package-photos', path, a.uri, a.base64);
        }),
      );
      if (uploaded.some((p) => p == null)) {
        setUploadError(t('booking.package.uploadPartialError'));
      }
      onPhotosChange([...photos, ...newUris].slice(0, MAX_PHOTOS), [...photoPaths, ...uploaded].slice(0, MAX_PHOTOS));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (isUploading) return;
    onPhotosChange(photos.filter((_, j) => j !== index), photoPaths.filter((_, j) => j !== index));
  };

  return (
    <View>
      {/* Weight */}
      <Text style={s.fieldLabel}>Declared weight (kg)</Text>
      {maxWeight != null && (
        <Text style={s.fieldNote}>Max single package: {maxWeight} kg</Text>
      )}
      {maxWeight != null && parseFloat(weight) > maxWeight && (
        <Text style={s.weightError}>Exceeds maximum of {maxWeight} kg per package</Text>
      )}
      <View style={s.weightRow}>
        <TextInput
          style={[s.input, s.weightInput]}
          placeholder="0.0"
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.text.tertiary}
          value={weight}
          onChangeText={onWeightChange}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.weightChips}
        >
          {WEIGHT_CHIPS.map((w) => (
            <TouchableOpacity
              key={w}
              style={s.weightChip}
              onPress={() => onWeightChange(String(w))}
              activeOpacity={0.75}
            >
              <Text style={s.weightChipText}>~{w} kg</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <Text style={s.fieldNote}>Final weight confirmed at collection.</Text>

      {/* Package type */}
      <Text style={[s.fieldLabel, { marginTop: Spacing.base }]}>Package type</Text>
      <View style={s.chipGrid}>
        {PACKAGE_TYPES.map((pt) => {
          const active = packageTypes.includes(pt.key);
          return (
            <TouchableOpacity
              key={pt.key}
              style={[s.typeChip, active && s.typeChipActive]}
              onPress={() => onTogglePackageType(pt.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{pt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {packageTypes.includes('other') && (
        <TextInput
          style={[s.input, { marginTop: Spacing.sm }]}
          placeholder="Describe the item(s)…"
          placeholderTextColor={Colors.text.tertiary}
          value={otherDesc}
          onChangeText={onOtherDescChange}
        />
      )}

      {/* Description */}
      <Text style={[s.fieldLabel, { marginTop: Spacing.base }]}>Description (optional)</Text>
      <TextInput
        style={[s.input, s.textArea]}
        placeholder="Any extra details about your package…"
        placeholderTextColor={Colors.text.tertiary}
        multiline
        numberOfLines={3}
        value={packageDesc}
        onChangeText={onPackageDescChange}
      />

      {/* Photos */}
      <Text style={[s.fieldLabel, { marginTop: Spacing.base }]}>Package photos</Text>
      <View style={s.photoGrid}>
        {photos.map((uri, i) => (
          <View key={i} style={s.photoThumb}>
            <Image source={{ uri }} style={s.photoImg} />
            {photoPaths[i] == null && (
              <View style={s.photoUploadingOverlay}>
                <ActivityIndicator size="small" color={Colors.white} />
              </View>
            )}
            <TouchableOpacity
              style={s.photoRemove}
              onPress={() => handleRemovePhoto(i)}
              disabled={isUploading}
            >
              <X size={10} color={Colors.white} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity style={s.photoAdd} onPress={handleAddPhoto} activeOpacity={0.75} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator size="small" color={Colors.text.tertiary} />
            ) : (
              <Plus size={20} color={Colors.text.tertiary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {uploadError && <Text style={s.weightError}>{uploadError}</Text>}
      <Text style={s.fieldNote}>Up to 5 photos. Shared with driver only after booking is confirmed.</Text>

      {/* Continue */}
      <TouchableOpacity
        style={[s.continueBtn, (!isValid || isUploading) && s.continueBtnDisabled]}
        onPress={() => isValid && !isUploading && onContinue()}
        activeOpacity={0.85}
        disabled={!isValid || isUploading}
      >
        <Text style={s.continueBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  fieldNote: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  weightError: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 4,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
  },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  weightInput: { width: 90 },
  weightChips: { gap: Spacing.xs },
  weightChip: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  weightChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeChipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.secondary },
  typeChipTextActive: { color: Colors.primary, fontWeight: '700' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoThumb: {
    width: 72, height: 72, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoUploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 72, height: 72, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border.light,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  continueBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
