import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { supabase } from '@/lib/supabase';

const SIGNED_URL_TTL_SECONDS = 3600;

interface PackagePhotoGalleryProps {
  /** Storage paths in the private `package-photos` bucket (bookings.package_photos). */
  paths: string[];
}

/**
 * `package-photos` is a private bucket (matches `dispute-evidence`'s privacy
 * level — deliberately not public like `avatars`), so `bookings.package_photos`
 * stores object paths, not URLs. Resolves fresh signed URLs on each view
 * rather than persisting one, since a driver may open this screen days after
 * the photos were uploaded.
 */
export function PackagePhotoGallery({ paths }: PackagePhotoGalleryProps) {
  const { t } = useTranslation();
  const [urls, setUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (paths.length === 0) {
      setUrls([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    supabase.storage
      .from('package-photos')
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
      .then(({ data }) => {
        if (cancelled) return;
        setUrls((data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [paths.join(',')]);

  if (paths.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.photos')}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <View style={styles.grid}>
          {urls.map((url, i) => (
            <TouchableOpacity key={url} onPress={() => setPreviewIndex(i)} activeOpacity={0.8}>
              <Image source={{ uri: url }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={previewIndex != null} transparent animationType="fade" onRequestClose={() => setPreviewIndex(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewIndex(null)}>
            <X size={26} color={Colors.white} />
          </TouchableOpacity>
          {previewIndex != null && (
            <Image source={{ uri: urls[previewIndex] }} style={styles.previewImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: BorderRadius.md },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  previewClose: { position: 'absolute', top: 48, right: 24, zIndex: 1 },
  previewImg: { width: '100%', height: '80%' },
});
