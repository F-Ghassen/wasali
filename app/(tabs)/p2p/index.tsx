import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Trophy, FileText, Star, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

// ─── Mock recent activity ─────────────────────────────────────────────────────

type ActivityKind = 'send' | 'carry';
interface ActivityItem {
  id: string;
  kind: ActivityKind;
  route: string;
  docType: string;
  status: string;
  statusColor: string;
  date: string;
  points?: number;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    kind: 'carry',
    route: 'Berlin → Tunis',
    docType: 'Official letter',
    status: 'Delivered',
    statusColor: Colors.success,
    date: 'Mar 12',
    points: 25,
  },
  {
    id: '2',
    kind: 'send',
    route: 'Paris → Tunis',
    docType: 'Contract',
    status: 'In transit',
    statusColor: Colors.secondary,
    date: 'Mar 14',
  },
];

// ─── P2PHub ───────────────────────────────────────────────────────────────────

export default function P2PHub() {
  const router  = useRouter();
  const { width } = useWindowDimensions();
  const isWide  = width >= 768;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>P2P Documents</Text>
          <Text style={s.headerSub}>Send or carry documents between travellers</Text>
        </View>
        <TouchableOpacity
          style={s.leaderboardBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/p2p/leaderboard')}
        >
          <Trophy size={16} color={Colors.gold} strokeWidth={2} />
          <Text style={s.leaderboardBtnText}>Board</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, isWide && s.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Action cards ────────────────────────────────── */}
        <Text style={s.sectionTitle}>What do you need?</Text>

        {/* Send card */}
        <TouchableOpacity
          style={s.sendCard}
          activeOpacity={0.88}
          onPress={() => router.push('/(tabs)/p2p/send')}
        >
          <View style={s.cardIconWrap}>
            <FileText size={28} color={Colors.white} strokeWidth={1.8} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.sendCardTitle}>Send a document</Text>
            <Text style={s.sendCardDesc}>
              Post a request — a traveller on the same route will carry it for you.
            </Text>
          </View>
          <ArrowRight size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Carry card */}
        <TouchableOpacity
          style={s.carryCard}
          activeOpacity={0.88}
          onPress={() => router.push('/(tabs)/p2p/carry')}
        >
          <View style={s.cardIconWrapGold}>
            <Star size={28} color={Colors.gold} strokeWidth={1.8} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.carryCardTitle}>Carry a document</Text>
            <Text style={s.carryCardDesc}>
              Help fellow expats on your corridor. Earn points, climb the board, and redeem gifts.
            </Text>
            <View style={s.pointsBadge}>
              <Zap size={11} color={Colors.gold} strokeWidth={2.5} />
              <Text style={s.pointsBadgeText}>Up to 50 pts per delivery</Text>
            </View>
          </View>
          <ArrowRight size={20} color={Colors.text.primary} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* ── Recent activity ──────────────────────────────── */}
        {MOCK_ACTIVITY.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>Recent activity</Text>
            <View style={s.activityCard}>
              {MOCK_ACTIVITY.map((item, i) => (
                <React.Fragment key={item.id}>
                  <View style={s.activityRow}>
                    <View style={[
                      s.activityKindBadge,
                      item.kind === 'carry' ? s.kindCarry : s.kindSend,
                    ]}>
                      <Text style={[
                        s.activityKindText,
                        item.kind === 'carry' ? s.kindCarryText : s.kindSendText,
                      ]}>
                        {item.kind === 'carry' ? 'Carry' : 'Send'}
                      </Text>
                    </View>
                    <View style={s.activityMeta}>
                      <Text style={s.activityRoute}>{item.route}</Text>
                      <Text style={s.activityDoc}>{item.docType} · {item.date}</Text>
                    </View>
                    <View style={s.activityRight}>
                      <Text style={[s.activityStatus, { color: item.statusColor }]}>
                        {item.status}
                      </Text>
                      {item.points !== undefined && (
                        <Text style={s.activityPoints}>+{item.points} pts</Text>
                      )}
                    </View>
                  </View>
                  {i < MOCK_ACTIVITY.length - 1 && <View style={s.divider} />}
                </React.Fragment>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text.primary },
  headerSub:   { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },

  leaderboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(201,162,39,0.10)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  leaderboardBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gold },

  scroll:     { padding: Spacing.base, gap: Spacing.md },
  scrollWide: { maxWidth: 600, alignSelf: 'center', width: '100%' },

  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },

  // Send card — dark
  sendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody:       { flex: 1, gap: 4 },
  sendCardTitle:  { fontSize: FontSize.base, fontWeight: '800', color: Colors.white },
  sendCardDesc:   { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },

  // Carry card — light with gold accent
  carryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,39,0.30)',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconWrapGold: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(201,162,39,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carryCardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text.primary },
  carryCardDesc:  { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 17 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(201,162,39,0.10)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pointsBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.gold },

  // Activity
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  activityKindBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  kindCarry:     { backgroundColor: 'rgba(201,162,39,0.10)' },
  kindSend:      { backgroundColor: Colors.primaryLight },
  activityKindText: { fontSize: 11, fontWeight: '700' },
  kindCarryText: { color: Colors.gold },
  kindSendText:  { color: Colors.text.primary },
  activityMeta:  { flex: 1 },
  activityRoute: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  activityDoc:   { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 1 },
  activityRight: { alignItems: 'flex-end', gap: 2 },
  activityStatus: { fontSize: FontSize.xs, fontWeight: '700' },
  activityPoints: { fontSize: 11, fontWeight: '700', color: Colors.gold },
  divider: { height: 1, backgroundColor: Colors.border.light, marginHorizontal: Spacing.base },
});
