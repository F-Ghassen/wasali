import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Modal,
  FlatList,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useCitiesStore } from '@/stores/citiesStore';

type DocType = 'passport_id' | 'letter' | 'contract' | 'medical' | 'other';
const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: 'passport_id', label: '🪪 Passport / ID' },
  { key: 'letter',      label: '✉️  Official letter' },
  { key: 'contract',    label: '📋 Contract' },
  { key: 'medical',     label: '🏥 Medical doc' },
  { key: 'other',       label: '📄 Other' },
];

type Urgency = 'normal' | 'soon' | 'urgent';
const URGENCY_OPTIONS: { key: Urgency; label: string; pts: number; desc: string }[] = [
  { key: 'normal',  label: 'Normal',  pts: 10, desc: '1–2 weeks' },
  { key: 'soon',    label: 'Soon',    pts: 25, desc: '3–7 days'  },
  { key: 'urgent',  label: 'Urgent',  pts: 50, desc: '1–2 days'  },
];

// ─── CityPicker ───────────────────────────────────────────────────────────────

function CityPicker({
  label, value, cities, onChange,
}: {
  label: string;
  value: string;
  cities: string[];
  onChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={cp.btn} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <MapPin size={14} color={value ? Colors.text.secondary : Colors.text.tertiary} strokeWidth={2} />
        <Text style={[cp.btnText, !value && cp.placeholder]}>
          {value || label}
        </Text>
        <ChevronDown size={14} color={Colors.text.tertiary} strokeWidth={2} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={cp.modal}>
          <View style={cp.modalHeader}>
            <Text style={cp.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={cp.modalClose}>
              <Text style={cp.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={cities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[cp.cityRow, item === value && cp.cityRowSelected]}
                onPress={() => { onChange(item); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[cp.cityText, item === value && cp.cityTextSelected]}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={cp.sep} />}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── SendScreen ───────────────────────────────────────────────────────────────

export default function SendScreen() {
  const router = useRouter();
  const { citiesByCountry } = useCitiesStore();

  const [fromCity,    setFromCity]    = useState('');
  const [toCity,      setToCity]      = useState('');
  const [earliestDate, setEarliest]   = useState('');
  const [latestDate,  setLatest]      = useState('');
  const [docType,     setDocType]     = useState<DocType | null>(null);
  const [description, setDescription] = useState('');
  const [urgency,     setUrgency]     = useState<Urgency>('normal');
  const [offerMoney,  setOfferMoney]  = useState(false);
  const [offerAmount, setOfferAmount] = useState('');

  // Build dynamic city lists from store
  const euCities = useMemo(
    () => Object.values(citiesByCountry)
      .flat()
      .filter(c => !['Tunisia'].includes(c.country))
      .map(c => c.name)
      .sort(),
    [citiesByCountry]
  );

  const tnCities = useMemo(
    () => (citiesByCountry['Tunisia'] || [])
      .map(c => c.name)
      .sort(),
    [citiesByCountry]
  );

  const canSubmit = fromCity && toCity && docType;

  function handleSubmit() {
    // In production: insert into p2p_requests table
    router.replace('/(tabs)/p2p');
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Send a document</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Route ─────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Route</Text>
            <View style={s.routeRow}>
              <View style={s.cityCol}>
                <Text style={s.fieldLabel}>From (EU)</Text>
                <CityPicker label="Select city" value={fromCity} cities={euCities} onChange={setFromCity} />
              </View>
              <Text style={s.arrow}>→</Text>
              <View style={s.cityCol}>
                <Text style={s.fieldLabel}>To (TN)</Text>
                <CityPicker label="Select city" value={toCity} cities={tnCities} onChange={setToCity} />
              </View>
            </View>
          </View>

          {/* ── Dates ─────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Window</Text>
            <View style={s.datesRow}>
              <View style={s.dateCol}>
                <Text style={s.fieldLabel}>Earliest</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Mar 20"
                  placeholderTextColor={Colors.text.tertiary}
                  value={earliestDate}
                  onChangeText={setEarliest}
                />
              </View>
              <View style={s.dateCol}>
                <Text style={s.fieldLabel}>Latest</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Apr 5"
                  placeholderTextColor={Colors.text.tertiary}
                  value={latestDate}
                  onChangeText={setLatest}
                />
              </View>
            </View>
          </View>

          {/* ── Document type ──────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Document type</Text>
            <View style={s.chips}>
              {DOC_TYPES.map((dt) => (
                <TouchableOpacity
                  key={dt.key}
                  style={[s.chip, docType === dt.key && s.chipSelected]}
                  onPress={() => setDocType(dt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, docType === dt.key && s.chipTextSelected]}>
                    {dt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Description ────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Description <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Brief note for the carrier — size, weight, any special instructions…"
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* ── Urgency ────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Urgency</Text>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.urgencyRow, urgency === opt.key && s.urgencyRowSelected]}
                onPress={() => setUrgency(opt.key)}
                activeOpacity={0.75}
              >
                <View style={s.urgencyLeft}>
                  <Text style={[s.urgencyLabel, urgency === opt.key && s.urgencyLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={s.urgencyDesc}>{opt.desc}</Text>
                </View>
                <View style={s.ptsBadge}>
                  <Text style={s.ptsBadgeText}>+{opt.pts} pts for carrier</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Offer money ────────────────────────────────── */}
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.cardTitle}>Offer payment</Text>
                <Text style={s.toggleDesc}>Optionally tip the carrier</Text>
              </View>
              <Switch
                value={offerMoney}
                onValueChange={setOfferMoney}
                trackColor={{ true: Colors.primary, false: Colors.border.medium }}
                thumbColor={Colors.white}
              />
            </View>
            {offerMoney && (
              <View style={s.amountRow}>
                <Text style={s.currencySign}>€</Text>
                <TextInput
                  style={[s.input, s.amountInput]}
                  placeholder="0"
                  placeholderTextColor={Colors.text.tertiary}
                  keyboardType="decimal-pad"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                />
              </View>
            )}
          </View>

          {/* ── Submit ─────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Text style={s.submitBtnText}>Post request</Text>
          </TouchableOpacity>

          <View style={{ height: Spacing['2xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cp = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  btnText:    { flex: 1, fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '600' },
  placeholder: { color: Colors.text.tertiary, fontWeight: '400' },
  modal:       { flex: 1, backgroundColor: Colors.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle:     { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  modalClose:     { padding: Spacing.xs },
  modalCloseText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.secondary },
  cityRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  cityRowSelected: { backgroundColor: Colors.primaryLight },
  cityText:        { fontSize: FontSize.base, color: Colors.text.primary },
  cityTextSelected: { fontWeight: '700' },
  sep:             { height: 1, backgroundColor: Colors.border.light },
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

  scroll: { padding: Spacing.base, gap: Spacing.md },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle:  { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  optional:   { fontSize: FontSize.sm, color: Colors.text.tertiary, fontWeight: '400' },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.tertiary, marginBottom: Spacing.xs },

  routeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  cityCol:  { flex: 1 },
  arrow:    { fontSize: FontSize.base, color: Colors.text.tertiary, marginBottom: 10, fontWeight: '700' },

  datesRow: { flexDirection: 'row', gap: Spacing.md },
  dateCol:  { flex: 1 },

  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  textArea: {
    minHeight: 72,
    paddingTop: Spacing.sm,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  chipSelected:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:         { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.white, fontWeight: '700' },

  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
  },
  urgencyRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  urgencyLeft:          { gap: 2 },
  urgencyLabel:         { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary },
  urgencyLabelSelected: { color: Colors.text.primary },
  urgencyDesc:          { fontSize: FontSize.xs, color: Colors.text.tertiary },
  ptsBadge: {
    backgroundColor: 'rgba(201,162,39,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  ptsBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.gold },

  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleDesc: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  amountRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  currencySign: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.secondary },
  amountInput:  { width: 100 },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
