import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

// ─── Types & mock data ────────────────────────────────────────────────────────

type Urgency = 'normal' | 'soon' | 'urgent';

interface P2PRequest {
  id: string;
  fromCity: string;
  toCity: string;
  docType: string;
  urgency: Urgency;
  description: string;
  offerEur: number | null;
  points: number;
  postedAt: string;
  posterInitials: string;
}

const MOCK_REQUESTS: P2PRequest[] = [
  {
    id: '1',
    fromCity: 'Berlin',
    toCity: 'Tunis',
    docType: 'Official letter',
    urgency: 'soon',
    description: 'A4 envelope, sealed. Needs to arrive before end of month.',
    offerEur: 15,
    points: 25,
    postedAt: 'Mar 15',
    posterInitials: 'AB',
  },
  {
    id: '2',
    fromCity: 'Paris',
    toCity: 'Tunis',
    docType: 'Contract',
    urgency: 'urgent',
    description: 'Business contract, two pages, envelope provided.',
    offerEur: null,
    points: 50,
    postedAt: 'Mar 16',
    posterInitials: 'MK',
  },
  {
    id: '3',
    fromCity: 'Milan',
    toCity: 'Sfax',
    docType: 'Medical doc',
    urgency: 'normal',
    description: 'Lab results for family member.',
    offerEur: 10,
    points: 10,
    postedAt: 'Mar 14',
    posterInitials: 'SR',
  },
  {
    id: '4',
    fromCity: 'Brussels',
    toCity: 'Sousse',
    docType: 'Passport / ID',
    urgency: 'urgent',
    description: 'Renewed passport for spouse.',
    offerEur: 20,
    points: 50,
    postedAt: 'Mar 16',
    posterInitials: 'FH',
  },
];

const URGENCY_COLORS: Record<Urgency, { bg: string; text: string }> = {
  normal: { bg: Colors.background.tertiary, text: Colors.text.secondary },
  soon:   { bg: Colors.secondaryLight,      text: Colors.secondary      },
  urgent: { bg: Colors.errorLight,          text: Colors.error          },
};

const URGENCY_LABELS: Record<Urgency, string> = {
  normal: 'Normal',
  soon:   'Soon',
  urgent: '🔥 Urgent',
};

// ─── Offer modal ─────────────────────────────────────────────────────────────

function OfferModal({
  request,
  onClose,
}: {
  request: P2PRequest | null;
  onClose: () => void;
}) {
  const [message,  setMessage]  = useState('');
  const [forFree,  setForFree]  = useState(true);
  const [feeAmount, setFeeAmount] = useState('');

  if (!request) return null;

  function handleSend() {
    // In production: insert into p2p_carries with message + fee
    setMessage('');
    setFeeAmount('');
    setForFree(true);
    onClose();
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={om.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={om.header}>
            <Text style={om.title}>Offer to carry</Text>
            <TouchableOpacity onPress={onClose} style={om.closeBtn}>
              <Text style={om.closeTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={om.body}>
            {/* Request summary */}
            <View style={om.summaryRow}>
              <Text style={om.summaryRoute}>
                {request.fromCity} → {request.toCity}
              </Text>
              <Text style={om.summaryDoc}>{request.docType}</Text>
            </View>

            {/* Free / fee toggle */}
            <View style={om.section}>
              <Text style={om.sectionTitle}>Compensation</Text>
              <TouchableOpacity
                style={[om.feeOption, forFree && om.feeOptionSelected]}
                onPress={() => setForFree(true)}
                activeOpacity={0.75}
              >
                <View style={om.feeOptionLeft}>
                  <Text style={[om.feeOptionLabel, forFree && om.feeOptionLabelSelected]}>
                    Carry for free
                  </Text>
                  <View style={om.ptsRow}>
                    <Zap size={11} color={Colors.gold} strokeWidth={2.5} />
                    <Text style={om.ptsText}>Earn +{request.points} pts → leaderboard</Text>
                  </View>
                </View>
                <View style={[om.radio, forFree && om.radioSelected]}>
                  {forFree && <View style={om.radioDot} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[om.feeOption, !forFree && om.feeOptionSelected]}
                onPress={() => setForFree(false)}
                activeOpacity={0.75}
              >
                <View style={om.feeOptionLeft}>
                  <Text style={[om.feeOptionLabel, !forFree && om.feeOptionLabelSelected]}>
                    Carry for a fee
                  </Text>
                  <Text style={om.feeOptionDesc}>You set the price, sender accepts</Text>
                </View>
                <View style={[om.radio, !forFree && om.radioSelected]}>
                  {!forFree && <View style={om.radioDot} />}
                </View>
              </TouchableOpacity>

              {!forFree && (
                <View style={om.feeInputRow}>
                  <Text style={om.currency}>€</Text>
                  <TextInput
                    style={om.feeInput}
                    placeholder="Amount"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="decimal-pad"
                    value={feeAmount}
                    onChangeText={setFeeAmount}
                  />
                </View>
              )}
            </View>

            {/* Message */}
            <View style={om.section}>
              <Text style={om.sectionTitle}>Message to sender <Text style={om.optional}>(optional)</Text></Text>
              <TextInput
                style={om.msgInput}
                placeholder="Introduce yourself, mention your travel dates…"
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={3}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={om.footer}>
            <TouchableOpacity style={om.sendBtn} onPress={handleSend} activeOpacity={0.85}>
              <Text style={om.sendBtnText}>Send offer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  item,
  onOffer,
}: {
  item: P2PRequest;
  onOffer: () => void;
}) {
  const urg = URGENCY_COLORS[item.urgency];

  return (
    <View style={rc.card}>
      <View style={rc.top}>
        <View style={rc.routeBlock}>
          <Text style={rc.route}>{item.fromCity} → {item.toCity}</Text>
          <Text style={rc.doc}>{item.docType}</Text>
        </View>
        <View style={[rc.urgBadge, { backgroundColor: urg.bg }]}>
          <Text style={[rc.urgText, { color: urg.text }]}>{URGENCY_LABELS[item.urgency]}</Text>
        </View>
      </View>

      {item.description !== '' && (
        <Text style={rc.desc} numberOfLines={2}>{item.description}</Text>
      )}

      <View style={rc.bottom}>
        <View style={rc.meta}>
          {item.offerEur !== null ? (
            <Text style={rc.offer}>Offers €{item.offerEur}</Text>
          ) : (
            <Text style={rc.free}>Free carry</Text>
          )}
          <View style={rc.ptsPill}>
            <Zap size={10} color={Colors.gold} strokeWidth={2.5} />
            <Text style={rc.ptsText}>+{item.points} pts</Text>
          </View>
          <Text style={rc.posted}>· {item.postedAt}</Text>
        </View>

        <TouchableOpacity style={rc.offerBtn} onPress={onOffer} activeOpacity={0.8}>
          <Text style={rc.offerBtnText}>Offer to carry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── CarryScreen ──────────────────────────────────────────────────────────────

type Filter = 'all' | 'eu_tn' | 'urgent';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',    label: 'All requests' },
  { key: 'eu_tn',  label: '🇪🇺 → 🇹🇳 only'  },
  { key: 'urgent', label: '🔥 Urgent first' },
];

export default function CarryScreen() {
  const router  = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedRequest, setSelectedRequest] = useState<P2PRequest | null>(null);

  const filtered = MOCK_REQUESTS.filter((r) => {
    if (filter === 'urgent') return r.urgency === 'urgent';
    return true;
  }).sort((a, b) => {
    if (filter === 'urgent') {
      const order: Record<Urgency, number> = { urgent: 0, soon: 1, normal: 2 };
      return order[a.urgency] - order[b.urgency];
    }
    return 0;
  });

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Carry a document</Text>
          <Text style={s.headerSub}>{filtered.length} open request{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard item={item} onOffer={() => setSelectedRequest(item)} />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No requests match this filter.</Text>
          </View>
        }
      />

      <OfferModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  top:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  routeBlock: { gap: 2 },
  route:      { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  doc:        { fontSize: FontSize.sm, color: Colors.text.secondary },
  urgBadge:   { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  urgText:    { fontSize: 11, fontWeight: '700' },
  desc:       { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 19 },
  bottom:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  offer:      { fontSize: FontSize.sm, fontWeight: '700', color: Colors.success },
  free:       { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary },
  ptsPill:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ptsText:    { fontSize: 11, fontWeight: '700', color: Colors.gold },
  posted:     { fontSize: FontSize.xs, color: Colors.text.tertiary },
  offerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  offerBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});

const om = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title:    { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  closeBtn: { padding: Spacing.xs },
  closeTxt: { fontSize: FontSize.base, color: Colors.text.secondary, fontWeight: '600' },
  body:     { flex: 1, padding: Spacing.base, gap: Spacing.lg },
  summaryRow: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryRoute: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  summaryDoc:   { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  section:      { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary },
  optional:     { fontWeight: '400', color: Colors.text.tertiary },
  feeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
  },
  feeOptionSelected:      { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  feeOptionLeft:          { flex: 1, gap: 4 },
  feeOptionLabel:         { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  feeOptionLabelSelected: { color: Colors.text.primary, fontWeight: '700' },
  feeOptionDesc:          { fontSize: FontSize.xs, color: Colors.text.tertiary },
  ptsRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ptsText:  { fontSize: 11, fontWeight: '700', color: Colors.gold },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  feeInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  currency:    { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.secondary },
  feeInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  msgInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 80,
  },
  footer:      { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.light },
  sendBtn:     { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, alignItems: 'center' },
  sendBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background.secondary },
  header:  {
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerSub:   { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 1 },

  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterChip: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:      { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },
  filterChipTextActive: { color: Colors.white },

  list:  { padding: Spacing.base, gap: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing['3xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.text.tertiary },
});
