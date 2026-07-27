import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Phone, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useUIStore } from '@/stores/uiStore';

interface RecipientInfoCardProps {
  name: string | null | undefined;
  phone: string | null | undefined;
  whatsapp?: boolean | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
}

export function RecipientInfoCard({
  name, phone, whatsapp, addressStreet, addressCity, addressPostalCode,
}: RecipientInfoCardProps) {
  const { t } = useTranslation();
  const { showToast } = useUIStore();

  if (!name && !phone) return null;

  const address = addressStreet
    ? `${addressStreet}, ${addressPostalCode ?? ''} ${addressCity ?? ''}`.trim()
    : null;

  const handleWhatsApp = () => {
    if (!phone) return;
    const normalised = phone.replace(/\s+/g, '');
    // Bug fix: previously fell back to Alert.alert(...) on failure, a no-op
    // on web — showToast works cross-platform.
    Linking.openURL(`whatsapp://send?phone=${normalised}`).catch(() =>
      showToast(t('bookingDetail.alerts.whatsappUnavailableMsg'), 'error')
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('bookingDetail.sections.recipient')}</Text>
      <Text style={styles.recipientName}>{name ?? '—'}</Text>
      {address && <Text style={styles.addressText}>{address}</Text>}
      {phone && (
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
            <Phone size={14} color={Colors.secondary} />
            <Text style={styles.contactText}>{phone}</Text>
          </TouchableOpacity>
          {whatsapp && (
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
              <MessageCircle size={14} color={Colors.success} />
              <Text style={styles.whatsappText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  recipientName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  addressText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  contactRow: { flexDirection: 'row', gap: Spacing.md },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  contactText: { fontSize: FontSize.base, color: Colors.secondary, fontWeight: '500' },
  whatsappBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  whatsappText: { fontSize: FontSize.base, color: Colors.success, fontWeight: '500' },
});
