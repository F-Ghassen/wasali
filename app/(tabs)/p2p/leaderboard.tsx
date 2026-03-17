import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

// ─── Mock data ────────────────────────────────────────────────────────────────

interface Leader {
  rank: number;
  initials: string;
  name: string;
  city: string;
  points: number;
  trips: number;
  isMe?: boolean;
}

const MOCK_LEADERS: Leader[] = [
  { rank: 1,  initials: 'KH', name: 'Khalil H.',     city: 'Berlin',    points: 2840, trips: 63 },
  { rank: 2,  initials: 'SB', name: 'Sonia B.',      city: 'Paris',     points: 2510, trips: 57 },
  { rank: 3,  initials: 'MK', name: 'Mehdi K.',      city: 'Lyon',      points: 1990, trips: 44 },
  { rank: 4,  initials: 'AB', name: 'Amira B.',       city: 'Brussels',  points: 1740, trips: 38 },
  { rank: 5,  initials: 'RB', name: 'Rania B.',       city: 'Amsterdam', points: 1380, trips: 31 },
  { rank: 6,  initials: 'FH', name: 'Farouk H.',      city: 'Milan',     points: 1120, trips: 26 },
  { rank: 7,  initials: 'LM', name: 'Leila M.',       city: 'Madrid',    points:  870, trips: 20 },
  { rank: 8,  initials: 'WT', name: 'Walid T.',       city: 'London',    points:  640, trips: 15 },
  { rank: 9,  initials: 'NS', name: 'Nadia S.',       city: 'Frankfurt', points:  420, trips: 10 },
  { rank: 10, initials: 'YB', name: 'You',            city: 'Berlin',    points:  310, trips: 7, isMe: true },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function formatPts(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ─── Podium (top 3) ───────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: Leader[] }) {
  // Display order: 2nd, 1st, 3rd
  const order = [top3[1], top3[0], top3[2]];
  const heights = [72, 96, 60];
  const sizes   = [FontSize.sm, FontSize.base, FontSize.sm];

  return (
    <View style={pod.wrap}>
      {order.map((leader, i) => (
        <View key={leader.rank} style={pod.col}>
          <Text style={pod.medal}>{MEDALS[leader.rank - 1]}</Text>
          <View style={[pod.avatar, leader.rank === 1 && pod.avatarFirst]}>
            <Text style={[pod.avatarText, { fontSize: sizes[i] }]}>{leader.initials}</Text>
          </View>
          <Text style={pod.name} numberOfLines={1}>{leader.name.split(' ')[0]}</Text>
          <Text style={pod.pts}>{formatPts(leader.points)} pts</Text>
          <View style={[pod.bar, { height: heights[i] }]} />
        </View>
      ))}
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function LeaderRow({ item }: { item: Leader }) {
  return (
    <View style={[row.wrap, item.isMe && row.wrapMe]}>
      <Text style={[row.rank, item.rank <= 3 && row.rankTop]}>{item.rank}</Text>
      <View style={[row.avatar, item.isMe && row.avatarMe]}>
        <Text style={[row.avatarText, item.isMe && row.avatarTextMe]}>{item.initials}</Text>
      </View>
      <View style={row.info}>
        <Text style={[row.name, item.isMe && row.nameMe]}>
          {item.name}{item.isMe ? ' (you)' : ''}
        </Text>
        <Text style={row.city}>{item.city} · {item.trips} trips</Text>
      </View>
      <View style={row.ptsCol}>
        <View style={row.ptsPill}>
          <Zap size={10} color={Colors.gold} strokeWidth={2.5} />
          <Text style={row.ptsText}>{formatPts(item.points)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── LeaderboardScreen ────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const router   = useRouter();
  const top3     = MOCK_LEADERS.slice(0, 3);
  const rest     = MOCK_LEADERS.slice(3);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Carrier board</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={rest}
        keyExtractor={(item) => String(item.rank)}
        renderItem={({ item }) => <LeaderRow item={item} />}
        ListHeaderComponent={
          <>
            {/* Points explainer */}
            <View style={s.explainer}>
              <Zap size={14} color={Colors.gold} strokeWidth={2.5} />
              <Text style={s.explainerText}>
                Earn points by carrying documents for free. Redeem for gifts, discounts, and partner rewards.
              </Text>
            </View>

            {/* Podium */}
            <Podium top3={top3} />

            <View style={s.listHeader}>
              <Text style={s.listHeaderText}>Rank</Text>
              <Text style={[s.listHeaderText, { flex: 1, marginLeft: 44 + Spacing.sm }]}>Carrier</Text>
              <Text style={s.listHeaderText}>Points</Text>
            </View>
          </>
        }
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pod = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.base,
  },
  col:        { alignItems: 'center', flex: 1, gap: 4 },
  medal:      { fontSize: 22 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFirst: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(201,162,39,0.15)',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarText:  { fontWeight: '700', color: Colors.text.primary },
  name:        { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.primary, textAlign: 'center' },
  pts:         { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gold },
  bar:         { width: '100%', backgroundColor: Colors.background.tertiary, borderRadius: BorderRadius.sm },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  wrapMe:      { backgroundColor: Colors.secondaryLight },
  rank:        { width: 24, fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.tertiary, textAlign: 'center' },
  rankTop:     { color: Colors.text.primary, fontWeight: '800' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMe:    { backgroundColor: Colors.secondaryLight, borderWidth: 2, borderColor: Colors.secondary },
  avatarText:  { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  avatarTextMe: { color: Colors.secondary },
  info:        { flex: 1 },
  name:        { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  nameMe:      { color: Colors.secondary, fontWeight: '700' },
  city:        { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 1 },
  ptsCol:      { alignItems: 'flex-end' },
  ptsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(201,162,39,0.10)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  ptsText:     { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gold },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn:     { width: 40, padding: Spacing.xs },
  backText:    { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },

  explainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(201,162,39,0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: Spacing.base,
    marginBottom: 0,
  },
  explainerText: { flex: 1, fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  listHeaderText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  list: { paddingBottom: Spacing['3xl'] },
  sep:  { height: 1, backgroundColor: Colors.border.light },
});
