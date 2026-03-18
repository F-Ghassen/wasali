import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Check, ArrowLeft, Plus, Trash2, GripVertical, Info, Lock, X,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { URLInput } from '@/components/ui/URLInput';
import { CityPickerInput } from '@/components/ui/CityPickerInput';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useUIStore } from '@/stores/uiStore';
import { supabase } from '@/lib/supabase';
import { EU_ORIGIN_CITIES, TN_DESTINATION_CITIES } from '@/constants/cities';
import { RouteSummaryCard } from '@/components/driver/RouteSummaryCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectionStop {
  city: string;
  country: string;
  collection_date: string;
  meeting_point_url: string;
}

interface DropoffStop {
  city: string;
  country: string;
  estimated_arrival_date: string;
  meeting_point_url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, key: 'collection', label: 'Collect' },
  { num: 2, key: 'dropoff',    label: 'Drop-off' },
  { num: 3, key: 'notes',      label: 'Notes' },
  { num: 4, key: 'services',   label: 'Services' },
  { num: 5, key: 'pricing',    label: 'Pricing' },
];

const PAYMENT_METHODS = ['cash_sender', 'cash_recipient', 'paypal', 'bank_transfer'];
const PAYMENT_LABELS: Record<string, string> = {
  cash_sender:    'Cash (sender pays on collection)',
  cash_recipient: 'Cash (recipient pays on delivery)',
  paypal:         'PayPal',
  bank_transfer:  'Bank transfer',
};

const DRAFT_KEY_PREFIX = 'wasali:route:wizard:draft:';
const QUEUE_KEY = 'wasali:route:queue';
const DRAFT_TTL_MS = 48 * 3600 * 1000;

// ─── Logistics constants ───────────────────────────────────────────────────────

interface LogisticsOpt {
  key: string;
  enabled: boolean;
  price: string;
}

const COLLECTION_LOGISTICS: { key: string; label: string; desc: string; free?: boolean }[] = [
  {
    key: 'drop_off',
    label: 'Drop-off at collection point',
    desc: 'Sender brings packages to an agreed meeting point before departure.',
    free: true,
  },
  {
    key: 'home_pickup',
    label: 'Home pick-up by driver',
    desc: 'You collect the package directly from the sender\'s address.',
  },
];

const DELIVERY_LOGISTICS: { key: string; label: string; desc: string; free?: boolean }[] = [
  {
    key: 'recipient_collect',
    label: 'Recipient collects',
    desc: 'Recipient picks up from a drop-off point in the destination city.',
    free: true,
  },
  {
    key: 'home_delivery',
    label: 'Home delivery by driver',
    desc: 'You deliver the package directly to the recipient\'s door.',
  },
];

const COLLECTION_DEFAULTS: LogisticsOpt[] = [
  { key: 'drop_off',    enabled: true,  price: '0' },
  { key: 'home_pickup', enabled: false, price: '8' },
];

const DELIVERY_DEFAULTS: LogisticsOpt[] = [
  { key: 'recipient_collect', enabled: true,  price: '0'  },
  { key: 'home_delivery',     enabled: false, price: '10' },
];

const PROHIBITED_PRESETS = [
  'Weapons', 'Drugs', 'Explosives', 'Live animals',
  'Perishable food', 'Flammable liquids', 'Cash & banknotes',
  'Counterfeit goods', 'Tobacco', 'Alcohol', 'Medication',
  'Electronics > €500',
];

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View style={si.root}>
      {STEPS.map((step, i) => {
        const done   = currentStep > step.num;
        const active = currentStep === step.num;
        return (
          <React.Fragment key={step.key}>
            <View style={si.item}>
              <View style={[si.dot, done && si.dotDone, active && si.dotActive]}>
                {done
                  ? <Check size={10} color={Colors.white} strokeWidth={3} />
                  : <Text style={[si.dotNum, (active || done) && si.dotNumActive]}>{step.num}</Text>
                }
              </View>
              <Text style={[si.label, active && si.labelActive, done && si.labelDone]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[si.line, done && si.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({
  stepNum, title, isActive, isCompleted, isLocked,
  summary, onEdit, children,
}: {
  stepNum: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  summary?: string;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={[sc.card, isLocked && sc.cardLocked]}>
      <View style={sc.header}>
        <View style={[sc.badge, isCompleted && sc.badgeDone, isActive && sc.badgeActive]}>
          {isCompleted
            ? <Check size={11} color={Colors.white} strokeWidth={3} />
            : isLocked
              ? <Lock size={10} color={Colors.text.tertiary} />
              : <Text style={[sc.badgeNum, isActive && sc.badgeNumActive]}>{stepNum}</Text>
          }
        </View>
        <Text style={[sc.title, isLocked && sc.titleLocked]}>{title}</Text>
        {isCompleted && !isActive && onEdit && (
          <TouchableOpacity onPress={onEdit} style={sc.editBtn} activeOpacity={0.7}>
            <Text style={sc.editText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {isCompleted && !isActive && summary ? (
        <Text style={sc.summary} numberOfLines={2}>{summary}</Text>
      ) : null}

      {isActive ? <View style={sc.body}>{children}</View> : null}
    </View>
  );
}

// ─── LogisticsOptionCard ──────────────────────────────────────────────────────

function LogisticsOptionCard({
  label, desc, free, enabled, price, onToggle, onChangePrice,
}: {
  label: string; desc: string; free?: boolean; enabled: boolean; price: string;
  onToggle: () => void; onChangePrice: (v: string) => void;
}) {
  return (
    <View style={[lg.card, enabled && lg.cardActive]}>
      <TouchableOpacity style={lg.row} onPress={onToggle} activeOpacity={0.75}>
        <View style={[lg.check, enabled && lg.checkActive]}>
          {enabled && <Check size={10} color={Colors.white} strokeWidth={3} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[lg.label, !enabled && lg.labelMuted]}>{label}</Text>
          <Text style={lg.desc}>{desc}</Text>
        </View>
        {free && enabled && (
          <View style={lg.freeBadge}>
            <Text style={lg.freeBadgeText}>Free</Text>
          </View>
        )}
      </TouchableOpacity>
      {enabled && !free && (
        <View style={lg.priceRow}>
          <Text style={lg.priceLabel}>Your fee per booking</Text>
          <View style={lg.priceInputWrap}>
            <Text style={lg.priceSymbol}>€</Text>
            <TextInput
              style={lg.priceInput}
              value={price}
              onChangeText={onChangePrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── NewRouteScreen ───────────────────────────────────────────────────────────

export default function NewRouteScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { createRoute, isLoading, routes } = useDriverRouteStore();
  const { showToast } = useUIStore();

  const [currentStep, setCurrentStep] = useState(1);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // ── Step 1: Collection (departure date lives here) ─────────────────────────
  const [departureDate, setDepartureDate] = useState('');

  // ── Step 1: Collection stops ───────────────────────────────────────────────
  const [collectionStops, setCollectionStops] = useState<CollectionStop[]>([]);

  // ── Step 2: Drop-off stops ─────────────────────────────────────────────────
  const [dropoffStops, setDropoffStops] = useState<DropoffStop[]>([]);

  // ── Step 3: Notes & Rules ──────────────────────────────────────────────────
  const [notes,            setNotes]            = useState('');
  const [prohibitedItems,  setProhibitedItems]  = useState<string[]>([]);
  const [customItemInput,  setCustomItemInput]  = useState('');

  // ── Step 5: Pricing ────────────────────────────────────────────────────────
  const [weightKg,         setWeightKg]         = useState('20');
  const [pricePerKg,       setPricePerKg]       = useState('5');
  const [promoEnabled,     setPromoEnabled]     = useState(false);
  const [promoDiscountPct, setPromoDiscountPct] = useState('');
  const [promoExpiresAt,   setPromoExpiresAt]   = useState('');
  const [promoLabel,       setPromoLabel]       = useState('');
  const [paymentMethods,   setPaymentMethods]   = useState<string[]>([
    'cash_sender', 'cash_recipient', 'paypal', 'bank_transfer',
  ]);
  const [saveAsTemplate,   setSaveAsTemplate]   = useState(true);
  const [templateName,     setTemplateName]     = useState('');

  // ── Step 4: Logistics services ─────────────────────────────────────────────
  const [collectionOptions, setCollectionOptions] = useState<LogisticsOpt[]>(COLLECTION_DEFAULTS);
  const [deliveryOptions,   setDeliveryOptions]   = useState<LogisticsOpt[]>(DELIVERY_DEFAULTS);

  // ── Draft recovery ─────────────────────────────────────────────────────────
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const pendingDraftRef = useRef<any>(null);
  const draftKey = profile ? `${DRAFT_KEY_PREFIX}${profile.id}` : null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draftKey) return;
    AsyncStorage.getItem(draftKey).then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (Date.now() - draft.savedAt < DRAFT_TTL_MS) {
          pendingDraftRef.current = draft;
          setShowDraftBanner(true);
        }
      } catch { /* ignore */ }
    });
  }, [draftKey]);

  const saveDraft = useCallback(() => {
    if (!draftKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify({
        departureDate,
        collectionStops, dropoffStops,
        notes, prohibitedItems,
        weightKg, pricePerKg,
        promoEnabled, promoDiscountPct, promoExpiresAt, promoLabel,
        paymentMethods, saveAsTemplate, templateName,
        collectionOptions, deliveryOptions,
        currentStep, savedAt: Date.now(),
      }));
    }, 500);
  }, [
    draftKey, departureDate, collectionStops, dropoffStops,
    notes, prohibitedItems, weightKg, pricePerKg, promoEnabled, promoDiscountPct,
    promoExpiresAt, promoLabel, paymentMethods, saveAsTemplate, templateName,
    collectionOptions, deliveryOptions, currentStep,
  ]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const restoreDraft = () => {
    const d = pendingDraftRef.current;
    if (!d) return;
    if (d.departureDate)       setDepartureDate(d.departureDate);
    if (d.collectionStops)     setCollectionStops(d.collectionStops);
    if (d.dropoffStops)        setDropoffStops(d.dropoffStops);
    if (d.notes)               setNotes(d.notes);
    if (d.prohibitedItems)     setProhibitedItems(d.prohibitedItems);
    if (d.weightKg)            setWeightKg(d.weightKg);
    if (d.pricePerKg)          setPricePerKg(d.pricePerKg);
    if (d.promoEnabled != null) setPromoEnabled(d.promoEnabled);
    if (d.promoDiscountPct)    setPromoDiscountPct(d.promoDiscountPct);
    if (d.promoExpiresAt)      setPromoExpiresAt(d.promoExpiresAt);
    if (d.promoLabel)          setPromoLabel(d.promoLabel);
    if (d.paymentMethods)      setPaymentMethods(d.paymentMethods);
    if (d.saveAsTemplate != null) setSaveAsTemplate(d.saveAsTemplate);
    if (d.templateName)        setTemplateName(d.templateName);
    if (d.collectionOptions)   setCollectionOptions(d.collectionOptions);
    if (d.deliveryOptions)     setDeliveryOptions(d.deliveryOptions);
    if (d.currentStep)         setCurrentStep(d.currentStep);
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    if (draftKey) AsyncStorage.removeItem(draftKey);
    setShowDraftBanner(false);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const step1Valid = collectionStops.some(s => s.city && s.country) && !!departureDate;
  const step2Valid = dropoffStops.some(s => s.city && s.country);
  const step4Valid = collectionOptions.some((o) => o.enabled) && deliveryOptions.some((o) => o.enabled);
  const step5Valid = parseFloat(weightKg) > 0 && parseFloat(pricePerKg) > 0 && paymentMethods.length > 0;

  // ── Summaries ──────────────────────────────────────────────────────────────
  const step1Summary = collectionStops.filter(s => s.city).length > 0 && departureDate
    ? `${collectionStops.filter(s => s.city).map(s => s.city).join(', ')}  ·  ${format(new Date(departureDate), 'MMM d, yyyy')}`
    : '';
  const step2Summary = dropoffStops.filter((s) => s.city).length > 0
    ? `${dropoffStops.filter((s) => s.city).length} stop(s): ${dropoffStops.filter((s) => s.city).map((s) => s.city).join(', ')}`
    : 'No drop-off stops';
  const step3Summary = (() => {
    const parts: string[] = [];
    if (notes) parts.push(notes.slice(0, 40) + (notes.length > 40 ? '…' : ''));
    if (prohibitedItems.length > 0) parts.push(`${prohibitedItems.length} prohibited item${prohibitedItems.length > 1 ? 's' : ''}`);
    return parts.join('  ·  ') || 'No restrictions';
  })();

  const step4Summary = (() => {
    const coll = collectionOptions.filter((o) => o.enabled).map((o) => COLLECTION_LOGISTICS.find((l) => l.key === o.key)?.label.split(' ')[0]).filter(Boolean).join(', ');
    const delv = deliveryOptions.filter((o) => o.enabled).map((o) => DELIVERY_LOGISTICS.find((l) => l.key === o.key)?.label.split(' ')[0]).filter(Boolean).join(', ');
    return coll || delv ? `Collection: ${coll || '—'}  ·  Delivery: ${delv || '—'}` : '';
  })();

  const step5Summary = weightKg && pricePerKg
    ? `${weightKg} kg  ·  €${pricePerKg}/kg`
    : '';

  // ── Logistics helpers ───────────────────────────────────────────────────────
  const toggleCollOpt = (key: string) =>
    setCollectionOptions((prev) => prev.map((o) => o.key === key ? { ...o, enabled: !o.enabled } : o));
  const updateCollPrice = (key: string, price: string) =>
    setCollectionOptions((prev) => prev.map((o) => o.key === key ? { ...o, price } : o));
  const toggleDelOpt = (key: string) =>
    setDeliveryOptions((prev) => prev.map((o) => o.key === key ? { ...o, enabled: !o.enabled } : o));
  const updateDelPrice = (key: string, price: string) =>
    setDeliveryOptions((prev) => prev.map((o) => o.key === key ? { ...o, price } : o));

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleBack = () => {
    const hasData = collectionStops.length > 0 || dropoffStops.length > 0 || !!departureDate;
    if (hasData) {
      Alert.alert(
        'Leave?',
        'Your draft is saved and you can continue later.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // ── Collection stops helpers ───────────────────────────────────────────────
  const addCollectionStop = () => {
    if (collectionStops.length >= 8) return;
    setCollectionStops((p) => [...p, { city: '', country: '', collection_date: '', meeting_point_url: '' }]);
  };
  const removeCollectionStop = (i: number) =>
    setCollectionStops((p) => p.filter((_, idx) => idx !== i));
  const updateCollectionStop = (i: number, patch: Partial<CollectionStop>) =>
    setCollectionStops((p) => p.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  // ── Drop-off stops helpers ─────────────────────────────────────────────────
  const addDropoffStop = () => {
    if (dropoffStops.length >= 8) return;
    setDropoffStops((p) => [...p, { city: '', country: '', estimated_arrival_date: '', meeting_point_url: '' }]);
  };
  const removeDropoffStop = (i: number) =>
    setDropoffStops((p) => p.filter((_, idx) => idx !== i));
  const updateDropoffStop = (i: number, patch: Partial<DropoffStop>) =>
    setDropoffStops((p) => p.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  // ── Prohibited items helpers ───────────────────────────────────────────────
  const toggleProhibitedItem = (item: string) =>
    setProhibitedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  const addCustomProhibitedItem = () => {
    const trimmed = customItemInput.trim();
    if (!trimmed || prohibitedItems.includes(trimmed)) return;
    setProhibitedItems(prev => [...prev, trimmed]);
    setCustomItemInput('');
  };
  const removeProhibitedItem = (item: string) =>
    setProhibitedItems(prev => prev.filter(i => i !== item));

  // ── Payment method toggle ──────────────────────────────────────────────────
  const togglePayment = (method: string) => {
    setPaymentMethods((prev) => {
      if (prev.includes(method)) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== method);
      }
      return [...prev, method];
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile) return;
    if (!step5Valid) { showToast('Please fill in all pricing fields', 'error'); return; }

    const derivedOriginCity = collectionStops.find(s => s.city)?.city ?? '';
    const derivedDestCity   = dropoffStops.find(s => s.city)?.city ?? '';

    const { data: existing } = await supabase
      .from('routes')
      .select('id')
      .eq('driver_id', profile.id)
      .eq('origin_city', derivedOriginCity)
      .eq('destination_city', derivedDestCity)
      .eq('departure_date', departureDate)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existing) {
      Alert.alert(
        'Duplicate Route',
        'You already have a route on this corridor for this date.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Anyway', onPress: () => doCreate() },
        ]
      );
      return;
    }
    await doCreate();
  };

  const doCreate = async () => {
    if (!profile) return;
    try {
      const collStops = collectionStops
        .filter((s) => s.city && s.country)
        .map((s, i) => ({
          city: s.city,
          country: s.country,
          stop_order: i + 1,
          stop_type: 'collection' as const,
          arrival_date: s.collection_date || null,
          meeting_point_url: s.meeting_point_url || null,
          is_pickup_available: true,
          is_dropoff_available: false,
        }));

      const dropStops = dropoffStops
        .filter((s) => s.city && s.country)
        .map((s, i) => ({
          city: s.city,
          country: s.country,
          stop_order: collStops.length + i + 1,
          stop_type: 'dropoff' as const,
          arrival_date: s.estimated_arrival_date || null,
          meeting_point_url: s.meeting_point_url || null,
          is_pickup_available: false,
          is_dropoff_available: true,
        }));

      const pct = promoEnabled && promoDiscountPct ? parseInt(promoDiscountPct) : null;

      const origin_city    = collStops[0]?.city    ?? '';
      const origin_country = collStops[0]?.country ?? '';
      const dest_city      = dropStops[0]?.city    ?? '';
      const dest_country   = dropStops[0]?.country ?? '';

      await createRoute(profile.id, {
        origin_city,
        origin_country,
        destination_city: dest_city,
        destination_country: dest_country,
        departure_date: departureDate,
        estimated_arrival_date: dropStops[0]?.arrival_date ?? null,
        available_weight_kg: parseFloat(weightKg),
        price_per_kg_eur: parseFloat(pricePerKg),
        notes: notes || null,
        payment_methods: paymentMethods,
        promo_discount_pct: pct,
        promo_expires_at: promoEnabled && promoExpiresAt ? promoExpiresAt : null,
        promo_label: promoEnabled && promoLabel ? promoLabel : null,
        stops: [...collStops, ...dropStops],
        logistics_options: [
          ...collectionOptions.filter((o) => o.enabled).map((o) => ({ type: 'collection' as const, key: o.key, price_eur: parseFloat(o.price) || 0 })),
          ...deliveryOptions.filter((o) => o.enabled).map((o) => ({ type: 'delivery' as const, key: o.key, price_eur: parseFloat(o.price) || 0 })),
        ],
        prohibited_items: prohibitedItems,
        save_as_template: saveAsTemplate,
        template_name: saveAsTemplate ? (templateName || `${origin_city} → ${dest_city}`) : undefined,
      });

      if (draftKey) await AsyncStorage.removeItem(draftKey);
      showToast('Route created successfully!', 'success');
      router.back();
    } catch {
      try {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify({
          departureDate, weightKg, pricePerKg,
          notes, paymentMethods, promoEnabled, promoDiscountPct,
          promoExpiresAt, promoLabel, collectionStops, dropoffStops,
          profileId: profile.id,
        }));
        showToast('No connection — route saved locally.', 'info');
      } catch {
        showToast('Failed to create route. Please try again.', 'error');
      }
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const today = new Date();
  const departureDateObj = departureDate ? new Date(departureDate) : undefined;
  const isFirstRoute = routes.length === 0;
  const discountedPrice = promoEnabled && pricePerKg && promoDiscountPct
    ? (parseFloat(pricePerKg) * (1 - parseInt(promoDiscountPct) / 100)).toFixed(2)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Route</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Wide: form left + summary right. Narrow: form full-width + bottom bar */}
      <View style={[{ flex: 1 }, isWide && styles.wideBody]}>
        <KeyboardAvoidingView
          style={isWide ? styles.formArea : { flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[0]}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={f.scrollContent}
          >
            {/* ── Sticky step indicator ────────────────────── */}
            <StepIndicator currentStep={currentStep} />

          {/* Draft recovery */}
          {showDraftBanner && (
            <View style={f.draftBanner}>
              <Text style={f.draftBannerText}>You have an unsaved route draft.</Text>
              <View style={f.draftBannerActions}>
                <TouchableOpacity onPress={restoreDraft}>
                  <Text style={f.draftContinue}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={discardDraft}>
                  <Text style={f.draftDiscard}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════════════
              Step 1 — Collection Stops
          ════════════════════════════════════════════════ */}
          <StepCard
            stepNum={1} title="Collection Stops"
            isActive={currentStep === 1}
            isCompleted={currentStep > 1}
            isLocked={false}
            summary={step1Summary}
            onEdit={() => setCurrentStep(1)}
          >
            {isFirstRoute && (
              <View style={f.tooltip}>
                <Text style={f.tooltipText}>
                  Senders browse your route and book space. You confirm each booking and earn money on trips you already make.
                </Text>
              </View>
            )}

            <Text style={f.stepDesc}>
              Add cities where you will collect packages from senders.
            </Text>

            <Text style={f.fieldLabel}>Departure date</Text>
            <DateInput
              value={departureDate}
              onChange={setDepartureDate}
              minDate={today}
              placeholder="Select date"
            />

            {collectionStops.map((stop, idx) => (
              <View key={idx} style={f.stopCard}>
                <View style={f.stopHeader}>
                  <View style={f.stopHandleRow}>
                    <GripVertical size={14} color={Colors.text.tertiary} />
                    <Text style={f.stopNum}>Stop {idx + 1}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeCollectionStop(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={15} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={f.fieldLabel}>City</Text>
                <CityPickerInput
                  value={stop.city}
                  country={stop.country}
                  cities={EU_ORIGIN_CITIES}
                  placeholder="Select collection city"
                  onChange={(city, country) => updateCollectionStop(idx, { city, country })}
                />
                <Text style={f.fieldLabel}>Collection date (optional)</Text>
                <DateInput
                  value={stop.collection_date}
                  onChange={(v) => updateCollectionStop(idx, { collection_date: v })}
                  minDate={today}
                  placeholder="Optional"
                />
                <Text style={f.fieldLabel}>Meeting point link (optional)</Text>
                <URLInput
                  value={stop.meeting_point_url}
                  onChangeText={(t) => updateCollectionStop(idx, { meeting_point_url: t })}
                  placeholder="https://maps.app.goo.gl/…"
                />
              </View>
            ))}

            <TouchableOpacity
              style={[f.addStopRow, collectionStops.length >= 8 && f.addStopRowDisabled]}
              onPress={addCollectionStop}
              disabled={collectionStops.length >= 8}
            >
              <Plus size={15} color={collectionStops.length >= 8 ? Colors.text.tertiary : Colors.primary} />
              <Text style={[f.addStopText, collectionStops.length >= 8 && f.addStopTextDisabled]}>
                {collectionStops.length >= 8 ? 'Maximum 8 stops' : 'Add collection stop'}
              </Text>
            </TouchableOpacity>

            <Button
              label="Continue"
              onPress={() => {
                if (!step1Valid) {
                  showToast('Add at least one collection stop and set a departure date', 'error');
                  return;
                }
                setCurrentStep(2);
              }}
              size="lg"
              style={f.continueBtn}
            />
          </StepCard>

          {/* ════════════════════════════════════════════════
              Step 2 — Drop-off Stops
          ════════════════════════════════════════════════ */}
          <StepCard
            stepNum={2} title="Drop-off Stops"
            isActive={currentStep === 2}
            isCompleted={currentStep > 2}
            isLocked={currentStep < 2}
            summary={step2Summary}
            onEdit={() => setCurrentStep(2)}
          >
            <View style={f.estimateNote}>
              <Info size={13} color={Colors.secondary} />
              <Text style={f.estimateNoteText}>
                Arrival dates are estimates. Senders will see these as guidelines, not guarantees.
              </Text>
            </View>

            {dropoffStops.map((stop, idx) => (
              <View key={idx} style={f.stopCard}>
                <View style={f.stopHeader}>
                  <View style={f.stopHandleRow}>
                    <GripVertical size={14} color={Colors.text.tertiary} />
                    <Text style={f.stopNum}>Stop {idx + 1}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeDropoffStop(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={15} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={f.fieldLabel}>City</Text>
                <CityPickerInput
                  value={stop.city}
                  country={stop.country}
                  cities={TN_DESTINATION_CITIES}
                  placeholder="Select drop-off city"
                  onChange={(city, country) => updateDropoffStop(idx, { city, country })}
                />
                <Text style={f.fieldLabel}>Estimated arrival (optional)</Text>
                <DateInput
                  value={stop.estimated_arrival_date}
                  onChange={(v) => updateDropoffStop(idx, { estimated_arrival_date: v })}
                  minDate={departureDateObj ?? today}
                  placeholder="Optional"
                />
                <Text style={f.fieldLabel}>Meeting point link (optional)</Text>
                <URLInput
                  value={stop.meeting_point_url}
                  onChangeText={(t) => updateDropoffStop(idx, { meeting_point_url: t })}
                  placeholder="https://maps.app.goo.gl/…"
                />
              </View>
            ))}

            <TouchableOpacity
              style={[f.addStopRow, dropoffStops.length >= 8 && f.addStopRowDisabled]}
              onPress={addDropoffStop}
              disabled={dropoffStops.length >= 8}
            >
              <Plus size={15} color={dropoffStops.length >= 8 ? Colors.text.tertiary : Colors.primary} />
              <Text style={[f.addStopText, dropoffStops.length >= 8 && f.addStopTextDisabled]}>
                {dropoffStops.length >= 8 ? 'Maximum 8 stops' : 'Add drop-off stop'}
              </Text>
            </TouchableOpacity>

            <Button
              label="Continue"
              onPress={() => {
                if (!step2Valid) {
                  showToast('Add at least one drop-off stop with city and country', 'error');
                  return;
                }
                setCurrentStep(3);
              }}
              size="lg"
              style={f.continueBtn}
            />
          </StepCard>

          {/* ════════════════════════════════════════════════
              Step 3 — Notes & Rules
          ════════════════════════════════════════════════ */}
          <StepCard
            stepNum={3} title="Notes & Rules"
            isActive={currentStep === 3}
            isCompleted={currentStep > 3}
            isLocked={currentStep < 3}
            summary={step3Summary}
            onEdit={() => setCurrentStep(3)}
          >
            <Text style={f.stepDesc}>
              Let senders know what to expect and what you won't accept.
            </Text>

            {/* Notes */}
            <Text style={f.fieldLabel}>Notes for senders (optional)</Text>
            <TextInput
              style={[f.input, f.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional info for senders…"
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={3}
            />

            {/* Prohibited items */}
            <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>Prohibited items</Text>
            <Text style={f.stepDesc}>
              Select items you won't transport. Senders see this before booking.
            </Text>

            <View style={f.chipsGrid}>
              {PROHIBITED_PRESETS.map((item) => {
                const active = prohibitedItems.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[f.presetChip, active && f.presetChipActive]}
                    onPress={() => toggleProhibitedItem(item)}
                    activeOpacity={0.7}
                  >
                    {active && <X size={10} color={Colors.error} strokeWidth={3} />}
                    <Text style={[f.presetChipText, active && f.presetChipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom items (not in presets) */}
            {prohibitedItems.filter(i => !PROHIBITED_PRESETS.includes(i)).length > 0 && (
              <View style={f.customChipsRow}>
                {prohibitedItems.filter(i => !PROHIBITED_PRESETS.includes(i)).map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={f.customChip}
                    onPress={() => removeProhibitedItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={f.customChipText}>{item}</Text>
                    <X size={10} color={Colors.error} strokeWidth={3} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Add custom item */}
            <View style={f.customItemRow}>
              <TextInput
                style={[f.input, { flex: 1, marginBottom: 0 }]}
                value={customItemInput}
                onChangeText={setCustomItemInput}
                placeholder="Add custom item…"
                placeholderTextColor={Colors.text.tertiary}
                onSubmitEditing={addCustomProhibitedItem}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[f.addItemBtn, !customItemInput.trim() && f.addItemBtnDisabled]}
                onPress={addCustomProhibitedItem}
                disabled={!customItemInput.trim()}
              >
                <Plus size={16} color={customItemInput.trim() ? Colors.white : Colors.text.tertiary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Button
              label="Continue"
              onPress={() => setCurrentStep(4)}
              size="lg"
              style={f.continueBtn}
            />
          </StepCard>

          {/* ════════════════════════════════════════════════
              Step 4 — Services
          ════════════════════════════════════════════════ */}
          <StepCard
            stepNum={4} title="Services"
            isActive={currentStep === 4}
            isCompleted={currentStep > 4}
            isLocked={currentStep < 4}
            summary={step4Summary}
            onEdit={() => setCurrentStep(4)}
          >
            <Text style={f.stepDesc}>
              Choose what services you offer and set your fee for each. Senders see these options when booking.
            </Text>

            <Text style={f.sectionSubtitle}>Collection</Text>
            {COLLECTION_LOGISTICS.map((opt) => {
              const state = collectionOptions.find((o) => o.key === opt.key)!;
              return (
                <LogisticsOptionCard
                  key={opt.key}
                  label={opt.label}
                  desc={opt.desc}
                  free={opt.free}
                  enabled={state.enabled}
                  price={state.price}
                  onToggle={() => toggleCollOpt(opt.key)}
                  onChangePrice={(v) => updateCollPrice(opt.key, v)}
                />
              );
            })}

            <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>Delivery</Text>
            {DELIVERY_LOGISTICS.map((opt) => {
              const state = deliveryOptions.find((o) => o.key === opt.key)!;
              return (
                <LogisticsOptionCard
                  key={opt.key}
                  label={opt.label}
                  desc={opt.desc}
                  free={opt.free}
                  enabled={state.enabled}
                  price={state.price}
                  onToggle={() => toggleDelOpt(opt.key)}
                  onChangePrice={(v) => updateDelPrice(opt.key, v)}
                />
              );
            })}

            <Button
              label="Continue"
              onPress={() => {
                if (!step4Valid) {
                  showToast('Enable at least one collection and one delivery option', 'error');
                  return;
                }
                setCurrentStep(5);
              }}
              size="lg"
              style={f.continueBtn}
            />
          </StepCard>

          {/* ════════════════════════════════════════════════
              Step 5 — Pricing & Settings
          ════════════════════════════════════════════════ */}
          <StepCard
            stepNum={5} title="Pricing & Settings"
            isActive={currentStep === 5}
            isCompleted={false}
            isLocked={currentStep < 5}
            summary={step5Summary}
            onEdit={() => setCurrentStep(5)}
          >
            {/* Capacity */}
            <Text style={f.sectionSubtitle}>Capacity</Text>
            <Text style={f.fieldLabel}>Available weight (kg)</Text>
            <TextInput
              style={f.input}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="20"
              placeholderTextColor={Colors.text.tertiary}
            />
            <View style={f.tipRow}>
              <Info size={11} color={Colors.text.tertiary} />
              <Text style={f.tipText}>
                Capacity decreases automatically as bookings are accepted.
              </Text>
            </View>

            {/* Pricing */}
            <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>Base Price</Text>
            <Text style={f.fieldLabel}>Price per kg (€)</Text>
            <TextInput
              style={f.input}
              value={pricePerKg}
              onChangeText={setPricePerKg}
              keyboardType="decimal-pad"
              placeholder="5"
              placeholderTextColor={Colors.text.tertiary}
            />

            {/* Promo toggle */}
            <View style={f.toggleRow}>
              <Switch
                value={promoEnabled}
                onValueChange={setPromoEnabled}
                trackColor={{ true: Colors.primary }}
              />
              <Text style={f.toggleLabel}>Offer a promotional rate</Text>
            </View>

            {promoEnabled && (
              <View style={f.collapsibleContent}>
                <Text style={f.fieldLabel}>Discount %</Text>
                <TextInput
                  style={f.input}
                  value={promoDiscountPct}
                  onChangeText={setPromoDiscountPct}
                  keyboardType="number-pad"
                  placeholder="e.g. 15"
                  placeholderTextColor={Colors.text.tertiary}
                />
                {discountedPrice && (
                  <View style={f.liveCalcRow}>
                    <Text style={f.liveCalcText}>
                      Senders pay <Text style={f.liveCalcPrice}>€{discountedPrice}/kg</Text>
                    </Text>
                  </View>
                )}
                <Text style={f.fieldLabel}>Offer expires (optional)</Text>
                <DateInput
                  value={promoExpiresAt}
                  onChange={setPromoExpiresAt}
                  minDate={new Date(Date.now() + 86400000)}
                  placeholder="Optional"
                />
                <Text style={f.fieldLabel}>Promo label (optional)</Text>
                <TextInput
                  style={f.input}
                  value={promoLabel}
                  onChangeText={setPromoLabel}
                  placeholder="e.g. Early bird, Summer special"
                  placeholderTextColor={Colors.text.tertiary}
                  maxLength={30}
                />
              </View>
            )}

            {/* Payment methods */}
            <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>
              How will senders pay you?
            </Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={f.paymentRow}
                onPress={() => togglePayment(method)}
                activeOpacity={0.7}
              >
                <View style={[f.checkbox, paymentMethods.includes(method) && f.checkboxChecked]}>
                  {paymentMethods.includes(method) && (
                    <Text style={f.checkboxTick}>✓</Text>
                  )}
                </View>
                <Text style={f.paymentLabel}>{PAYMENT_LABELS[method]}</Text>
              </TouchableOpacity>
            ))}

            {/* Template toggle */}
            <View style={[f.toggleRow, { marginTop: Spacing.base }]}>
              <Switch
                value={saveAsTemplate}
                onValueChange={setSaveAsTemplate}
                trackColor={{ true: Colors.primary }}
              />
              <Text style={f.toggleLabel}>Save as route template</Text>
            </View>

            {saveAsTemplate && (
              <View style={f.collapsibleContent}>
                <Text style={f.fieldLabel}>Template name</Text>
                <TextInput
                  style={f.input}
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder={collectionStops.find(s => s.city)?.city && dropoffStops.find(s => s.city)?.city ? `${collectionStops.find(s => s.city)?.city} → ${dropoffStops.find(s => s.city)?.city}` : 'Template name'}
                  placeholderTextColor={Colors.text.tertiary}
                  maxLength={60}
                />
                <Text style={f.templateHint}>
                  Reuse this setup for future trips on the same corridor
                </Text>
              </View>
            )}

            {/* On narrow screens: inline route summary before submit */}
            {!isWide && (
              <RouteSummaryCard
                originCity={collectionStops.find(s => s.city)?.city ?? ''}
                originCountry={collectionStops.find(s => s.city)?.country ?? ''}
                destinationCity={dropoffStops.find(s => s.city)?.city ?? ''}
                destinationCountry={dropoffStops.find(s => s.city)?.country ?? ''}
                departureDate={departureDate}
                estimatedArrivalDate={dropoffStops.find(s => s.estimated_arrival_date)?.estimated_arrival_date ?? ''}
                weightKg={weightKg}
                pricePerKg={pricePerKg}
                promoEnabled={promoEnabled}
                promoDiscountPct={promoDiscountPct}
                promoLabel={promoLabel}
                paymentMethods={paymentMethods}
                collectionStops={collectionStops.map(s => ({ city: s.city, country: s.country }))}
                dropoffStops={dropoffStops.map(s => ({ city: s.city, country: s.country }))}
                prohibitedItems={prohibitedItems}
              />
            )}

            <Button
              label={isLoading ? 'Creating…' : 'Create Route'}
              onPress={handleSubmit}
              isLoading={isLoading}
              size="lg"
              style={f.continueBtn}
            />
          </StepCard>
          </ScrollView>

          {/* Mobile bottom summary bar — narrow screens only */}
          {!isWide && collectionStops.some(s => s.city) && currentStep < 5 && (
            <View style={styles.mobileSummaryBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mobileSummaryRoute} numberOfLines={1}>
                  {collectionStops.find(s => s.city)?.city} → {dropoffStops.find(s => s.city)?.city || '…'}
                </Text>
                <Text style={styles.mobileSummaryMeta}>
                  {departureDate ? format(new Date(departureDate), 'MMM d, yyyy') : 'No date set'}
                  {pricePerKg ? `  ·  €${pricePerKg}/kg` : ''}
                </Text>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        {/* Summary sidebar — wide screens only */}
        {isWide && (
          <ScrollView style={styles.summarySidebar} showsVerticalScrollIndicator={false}>
            <RouteSummaryCard
              originCity={collectionStops.find(s => s.city)?.city ?? ''}
              originCountry={collectionStops.find(s => s.city)?.country ?? ''}
              destinationCity={dropoffStops.find(s => s.city)?.city ?? ''}
              destinationCountry={dropoffStops.find(s => s.city)?.country ?? ''}
              departureDate={departureDate}
              estimatedArrivalDate={dropoffStops.find(s => s.estimated_arrival_date)?.estimated_arrival_date ?? ''}
              weightKg={weightKg}
              pricePerKg={pricePerKg}
              promoEnabled={promoEnabled}
              promoDiscountPct={promoDiscountPct}
              promoLabel={promoLabel}
              paymentMethods={paymentMethods}
              collectionStops={collectionStops.map(s => ({ city: s.city, country: s.country }))}
              dropoffStops={dropoffStops.map(s => ({ city: s.city, country: s.country }))}
              prohibitedItems={prohibitedItems}
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  wideBody: {
    flex: 1,
    flexDirection: 'row',
  },
  formArea: {
    flex: 2,
  },
  summarySidebar: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
  },
  mobileSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  mobileSummaryRoute: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  mobileSummaryMeta: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});

// Logistics option card
const lg = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  check: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: Colors.border.medium,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, marginBottom: 2 },
  labelMuted: { color: Colors.text.secondary },
  desc: { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  priceLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, flex: 1 },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    height: 36,
    gap: 2,
  },
  priceSymbol: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },
  priceInput: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  freeBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  freeBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.success },
});

// Step indicator
const si = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  item: { alignItems: 'center', gap: 4 },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border.medium,
  },
  dotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotDone:   { backgroundColor: Colors.success,  borderColor: Colors.success },
  dotNum:    { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary },
  dotNumActive: { color: Colors.white },
  label:     { fontSize: 10, fontWeight: '500', color: Colors.text.tertiary },
  labelActive: { color: Colors.text.primary, fontWeight: '700' },
  labelDone:   { color: Colors.success },
  line: {
    flex: 1, height: 1.5,
    backgroundColor: Colors.border.light,
    marginBottom: 14,
  },
  lineDone: { backgroundColor: Colors.success },
});

// Step card
const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLocked: { opacity: 0.55 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.background.tertiary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border.medium,
  },
  badgeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  badgeDone:   { backgroundColor: Colors.success,  borderColor: Colors.success },
  badgeNum:    { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary },
  badgeNumActive: { color: Colors.white },
  title:       { flex: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  titleLocked: { color: Colors.text.tertiary },
  editBtn:  { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  editText: { fontSize: FontSize.sm, color: Colors.secondary, fontWeight: '600' },
  summary:  { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.sm, marginLeft: 38 },
  body:     { marginTop: Spacing.base },
});

// Form elements
const f = StyleSheet.create({
  scrollContent: { paddingBottom: Spacing['4xl'] },

  // Draft banner
  draftBanner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  draftBannerText: { fontSize: FontSize.sm, color: Colors.text.primary, marginBottom: Spacing.sm },
  draftBannerActions: { flexDirection: 'row', gap: Spacing.base },
  draftContinue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.secondary },
  draftDiscard:  { fontSize: FontSize.sm, color: Colors.text.secondary },

  // Tooltip
  tooltip: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tooltipText: { fontSize: FontSize.sm, color: Colors.secondary, lineHeight: 20 },

  // Field labels
  fieldLabel: {
    fontSize: FontSize.xs, fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 4, marginTop: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm, fontWeight: '700',
    color: Colors.text.primary, marginBottom: Spacing.sm,
  },
  stepDesc: {
    fontSize: FontSize.sm, color: Colors.text.secondary,
    marginBottom: Spacing.base, lineHeight: 20,
  },

  // Inputs
  input: {
    height: 44,
    borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.base, color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  inputMultiline: { height: 80, paddingTop: Spacing.sm, textAlignVertical: 'top' },

  // Tip row
  tipRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.xs, marginTop: -Spacing.xs, marginBottom: Spacing.sm,
  },
  tipText: { fontSize: FontSize.xs, color: Colors.text.tertiary, flex: 1 },

  // Stop cards
  stopCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stopHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stopHandleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stopNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },

  // Add stop button
  addStopRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.sm, marginBottom: Spacing.sm,
  },
  addStopRowDisabled: { opacity: 0.5 },
  addStopText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  addStopTextDisabled: { color: Colors.text.tertiary },

  // Estimate note
  estimateNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.base,
  },
  estimateNoteText: { fontSize: FontSize.xs, color: Colors.text.secondary, flex: 1 },

  // Toggle row
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.xs,
  },
  toggleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  collapsibleContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },

  // Promo live calc
  liveCalcRow: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  liveCalcText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  liveCalcPrice: { fontWeight: '700', color: Colors.success },

  // Payment methods
  paymentRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border.light,
  },
  checkbox: {
    width: 22, height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2, borderColor: Colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxTick: { fontSize: 12, color: Colors.text.inverse, fontWeight: '700' },
  paymentLabel: { fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },

  // Template
  templateHint: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: -Spacing.xs },

  // Prohibited items
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.full ?? 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background.secondary,
  },
  presetChipActive: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  presetChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  presetChipTextActive: {
    color: Colors.error,
  },
  customChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.full ?? 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.errorLight,
  },
  customChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.error,
  },
  customItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  addItemBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtnDisabled: {
    backgroundColor: Colors.border.light,
  },

  // Route preview card
  routePreview: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: Spacing.sm,
  },
  routePreviewRow: { gap: 2 },
  routePreviewCities: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  routePreviewCountries: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  routePreviewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  routePreviewChip: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  // Continue button
  continueBtn: { marginTop: Spacing.lg },
});
