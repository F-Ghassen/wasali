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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Plus, Trash2, GripVertical, Info, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepProgress } from '@/components/ui/StepProgress';
import { DateInput } from '@/components/ui/DateInput';
import { URLInput } from '@/components/ui/URLInput';
import { useAuthStore } from '@/stores/authStore';
import { useDriverRouteStore } from '@/stores/driverRouteStore';
import { useUIStore } from '@/stores/uiStore';
import { supabase } from '@/lib/supabase';
import {
  wizardStep1Schema,
  wizardStep4Schema,
  type WizardStep1Values,
  type CollectionStop,
  type DropoffStop,
  type WizardStep4Values,
} from '@/utils/validators';

const DRAFT_KEY_PREFIX = 'wasali:route:wizard:draft:';
const QUEUE_KEY = 'wasali:route:queue';
const DRAFT_TTL_MS = 48 * 3600 * 1000;

const STEP_LABELS = ['Route', 'Collection', 'Drop-off', 'Pricing'];

const DEFAULT_STEP1: WizardStep1Values = {
  origin_city: '',
  origin_country: '',
  destination_city: '',
  destination_country: '',
  departure_date: '',
  estimated_arrival_date: undefined,
};

const DEFAULT_STEP4: WizardStep4Values = {
  available_weight_kg: 20,
  price_per_kg_eur: 5,
  promo_enabled: false,
  payment_methods: ['cash_sender', 'cash_recipient', 'paypal', 'bank_transfer'],
  save_as_template: true,
  template_name: '',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_sender: 'Cash (sender pays you on collection)',
  cash_recipient: 'Cash (recipient pays on delivery)',
  paypal: 'PayPal',
  bank_transfer: 'Bank transfer',
};

const PAYMENT_METHODS = ['cash_sender', 'cash_recipient', 'paypal', 'bank_transfer'];

export default function NewRouteScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { createRoute, isLoading, routes } = useDriverRouteStore();
  const { showToast } = useUIStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 2 & 3 state
  const [collectionStops, setCollectionStops] = useState<CollectionStop[]>([]);
  const [dropoffStops, setDropoffStops] = useState<DropoffStop[]>([]);

  // Step 4 toggle state
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [templateExpanded, setTemplateExpanded] = useState(true);

  // Draft recovery
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const draftKey = profile ? `${DRAFT_KEY_PREFIX}${profile.id}` : null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftRef = useRef<any>(null);

  // Forms
  const step1Form = useForm<WizardStep1Values>({
    resolver: zodResolver(wizardStep1Schema),
    defaultValues: DEFAULT_STEP1,
  });

  const step4Form = useForm<WizardStep4Values>({
    resolver: zodResolver(wizardStep4Schema),
    defaultValues: DEFAULT_STEP4,
  });

  const step1Values = step1Form.watch();
  const step4Values = step4Form.watch();

  // Load draft on mount
  useEffect(() => {
    if (!draftKey) return;
    AsyncStorage.getItem(draftKey).then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (Date.now() - draft.savedAt < DRAFT_TTL_MS) {
          setShowDraftBanner(true);
          // Store parsed draft for potential restore
          pendingDraftRef.current = draft;
        }
      } catch {
        // ignore corrupt draft
      }
    });
  }, [draftKey]);

  // Auto-save draft
  const saveDraft = useCallback(() => {
    if (!draftKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draft = {
        step1: step1Values,
        step2: collectionStops,
        step3: dropoffStops,
        step4: step4Values,
        currentStep,
        completedSteps,
        savedAt: Date.now(),
      };
      AsyncStorage.setItem(draftKey, JSON.stringify(draft));
    }, 500);
  }, [draftKey, step1Values, collectionStops, dropoffStops, step4Values, currentStep, completedSteps]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const restoreDraft = () => {
    const draft = pendingDraftRef.current;
    if (!draft) return;
    if (draft.step1) step1Form.reset(draft.step1);
    if (draft.step4) step4Form.reset(draft.step4);
    if (draft.step2) setCollectionStops(draft.step2);
    if (draft.step3) setDropoffStops(draft.step3);
    if (draft.currentStep !== undefined) setCurrentStep(draft.currentStep);
    if (draft.completedSteps) setCompletedSteps(draft.completedSteps);
    if (draft.step4?.promo_enabled) setPromoExpanded(true);
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    if (draftKey) AsyncStorage.removeItem(draftKey);
    setShowDraftBanner(false);
  };

  const handleBack = () => {
    const hasData = step1Values.origin_city || collectionStops.length > 0 || dropoffStops.length > 0;
    if (hasData) {
      Alert.alert(
        'Discard Draft?',
        'You have unsaved changes. The draft will be saved and you can continue later.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // ─── Step 1 submission ───────────────────
  const handleStep1Next = step1Form.handleSubmit(() => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 0])));
    setCurrentStep(1);
  });

  // ─── Step 2 helpers ───────────────────────
  const addCollectionStop = () => {
    if (collectionStops.length >= 8) return;
    setCollectionStops((prev) => [
      ...prev,
      { city: '', country: '', collection_date: '', meeting_point_url: '' },
    ]);
  };

  const removeCollectionStop = (idx: number) => {
    setCollectionStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCollectionStop = (idx: number, patch: Partial<CollectionStop>) => {
    setCollectionStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const handleStep2Next = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
    setCurrentStep(2);
  };

  // ─── Step 3 helpers ───────────────────────
  const addDropoffStop = () => {
    if (dropoffStops.length >= 8) return;
    setDropoffStops((prev) => [
      ...prev,
      { city: '', country: '', estimated_arrival_date: '', meeting_point_url: '' },
    ]);
  };

  const removeDropoffStop = (idx: number) => {
    setDropoffStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDropoffStop = (idx: number, patch: Partial<DropoffStop>) => {
    setDropoffStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const handleStep3Next = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));
    setCurrentStep(3);
  };

  // ─── Step 4 + Final submit ─────────────────
  const togglePaymentMethod = (method: string, currentMethods: string[], onChange: (v: string[]) => void) => {
    if (currentMethods.includes(method)) {
      if (currentMethods.length === 1) return; // must keep at least 1
      onChange(currentMethods.filter((m) => m !== method));
    } else {
      onChange([...currentMethods, method]);
    }
  };

  const handleSubmit = step4Form.handleSubmit(async (step4) => {
    if (!profile) return;

    // Check for duplicate route
    const s1 = step1Form.getValues();
    const { data: existing } = await supabase
      .from('routes')
      .select('id')
      .eq('driver_id', profile.id)
      .eq('origin_city', s1.origin_city)
      .eq('destination_city', s1.destination_city)
      .eq('departure_date', s1.departure_date)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existing) {
      Alert.alert(
        'Duplicate Route',
        'You already have a route on this corridor for this date.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Anyway',
            onPress: () => submitRoute(s1, step4),
          },
        ]
      );
      return;
    }

    await submitRoute(s1, step4);
  });

  const submitRoute = async (s1: WizardStep1Values, step4: WizardStep4Values) => {
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

      await createRoute(profile.id, {
        ...s1,
        available_weight_kg: step4.available_weight_kg,
        price_per_kg_eur: step4.price_per_kg_eur,
        notes: step4.notes,
        payment_methods: step4.payment_methods,
        promo_discount_pct: step4.promo_enabled ? step4.promo_discount_pct : null,
        promo_expires_at: step4.promo_enabled ? step4.promo_expires_at : null,
        promo_label: step4.promo_enabled ? step4.promo_label : null,
        stops: [...collStops, ...dropStops],
        save_as_template: step4.save_as_template,
        template_name: step4.save_as_template ? step4.template_name : undefined,
      });

      if (draftKey) await AsyncStorage.removeItem(draftKey);
      showToast('Route created successfully!', 'success');
      router.back();
    } catch {
      // Offline queue
      try {
        const s1 = step1Form.getValues();
        const queueItem = { step1: s1, step2: collectionStops, step3: dropoffStops, step4, profileId: profile.id };
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queueItem));
        showToast('No connection — route saved locally. Will submit when you reconnect.', 'info');
      } catch {
        showToast('Failed to create route. Please try again.', 'error');
      }
    }
  };

  const today = new Date();
  const s1 = step1Form.watch();
  const departureDate = s1.departure_date ? new Date(s1.departure_date) : undefined;
  const isFirstRoute = routes.length === 0;

  const s4 = step4Form.watch();
  const discountedPrice =
    s4.price_per_kg_eur && s4.promo_discount_pct
      ? (s4.price_per_kg_eur * (1 - s4.promo_discount_pct / 100)).toFixed(2)
      : null;

  const hasCashPayment = s4.payment_methods?.some((m) =>
    m === 'cash_sender' || m === 'cash_recipient'
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Route</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step progress */}
      <StepProgress
        steps={STEP_LABELS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepPress={(i) => setCurrentStep(i)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Draft recovery banner */}
          {showDraftBanner && (
            <View style={styles.draftBanner}>
              <Text style={styles.draftBannerText}>
                You have an unsaved route draft.
              </Text>
              <View style={styles.draftBannerActions}>
                <TouchableOpacity onPress={restoreDraft} style={styles.draftBannerBtn}>
                  <Text style={styles.draftBannerContinue}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={discardDraft}>
                  <Text style={styles.draftBannerDiscard}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─── STEP 1 ─────────────────────────── */}
          {currentStep === 0 && (
            <View>
              {isFirstRoute && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxTitle}>How routes work</Text>
                  <Text style={styles.infoBoxItem}>• Senders browse your route and book space</Text>
                  <Text style={styles.infoBoxItem}>• You confirm or reject each booking</Text>
                  <Text style={styles.infoBoxItem}>• Earn money delivering packages on trips you already make</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Origin</Text>
              <View style={styles.row2}>
                <View style={styles.flex}>
                  <Controller
                    control={step1Form.control}
                    name="origin_city"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="City"
                        placeholder="Paris"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value}
                        error={step1Form.formState.errors.origin_city?.message}
                      />
                    )}
                  />
                </View>
                <View style={styles.flex}>
                  <Controller
                    control={step1Form.control}
                    name="origin_country"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Country"
                        placeholder="France"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value}
                        error={step1Form.formState.errors.origin_country?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Destination</Text>
              <View style={styles.row2}>
                <View style={styles.flex}>
                  <Controller
                    control={step1Form.control}
                    name="destination_city"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="City"
                        placeholder="Tunis"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value}
                        error={step1Form.formState.errors.destination_city?.message}
                      />
                    )}
                  />
                </View>
                <View style={styles.flex}>
                  <Controller
                    control={step1Form.control}
                    name="destination_country"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Country"
                        placeholder="Tunisia"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value}
                        error={step1Form.formState.errors.destination_country?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Dates</Text>
              <Controller
                control={step1Form.control}
                name="departure_date"
                render={({ field: { onChange, value } }) => (
                  <DateInput
                    label="Departure date"
                    value={value}
                    onChange={onChange}
                    minDate={today}
                    error={step1Form.formState.errors.departure_date?.message}
                  />
                )}
              />
              <Controller
                control={step1Form.control}
                name="estimated_arrival_date"
                render={({ field: { onChange, value } }) => (
                  <DateInput
                    label="Estimated arrival (optional)"
                    value={value}
                    onChange={onChange}
                    minDate={departureDate ?? today}
                    placeholder="Optional"
                    error={step1Form.formState.errors.estimated_arrival_date?.message}
                  />
                )}
              />

              <Button
                label="Next: Collection Stops"
                onPress={handleStep1Next}
                size="lg"
                style={styles.nextBtn}
              />
            </View>
          )}

          {/* ─── STEP 2 ─────────────────────────── */}
          {currentStep === 1 && (
            <View>
              <Text style={styles.stepIntro}>
                Add intermediate cities where you will collect packages from senders.
              </Text>

              {collectionStops.map((stop, idx) => (
                <View key={idx} style={styles.stopCard}>
                  <View style={styles.stopCardHeader}>
                    <View style={styles.stopHandleRow}>
                      <GripVertical size={16} color={Colors.text.tertiary} />
                      <Text style={styles.stopLabel}>Stop {idx + 1}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeCollectionStop(idx)}>
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row2}>
                    <View style={styles.flex}>
                      <Input
                        label="City"
                        placeholder="Rome"
                        value={stop.city}
                        onChangeText={(t) => updateCollectionStop(idx, { city: t })}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Input
                        label="Country"
                        placeholder="Italy"
                        value={stop.country}
                        onChangeText={(t) => updateCollectionStop(idx, { country: t })}
                      />
                    </View>
                  </View>
                  <DateInput
                    label="Collection date (optional)"
                    value={stop.collection_date}
                    onChange={(v) => updateCollectionStop(idx, { collection_date: v })}
                    minDate={today}
                    placeholder="Optional"
                  />
                  <URLInput
                    label="Meeting point link (optional)"
                    value={stop.meeting_point_url}
                    onChangeText={(t) => updateCollectionStop(idx, { meeting_point_url: t })}
                    placeholder="https://maps.app.goo.gl/…"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addStopBtn, collectionStops.length >= 8 && styles.addStopBtnDisabled]}
                onPress={addCollectionStop}
                disabled={collectionStops.length >= 8}
              >
                <Plus size={16} color={collectionStops.length >= 8 ? Colors.text.tertiary : Colors.primary} />
                <Text style={[styles.addStopText, collectionStops.length >= 8 && styles.addStopTextDisabled]}>
                  {collectionStops.length >= 8 ? 'Maximum 8 stops' : 'Add collection stop'}
                </Text>
              </TouchableOpacity>

              <View style={styles.stepNavRow}>
                <Button
                  label="← Back"
                  variant="outline"
                  size="md"
                  onPress={() => setCurrentStep(0)}
                  style={styles.backStepBtn}
                />
                <Button
                  label="Next: Drop-off Stops"
                  size="md"
                  onPress={handleStep2Next}
                  style={styles.flex}
                />
              </View>
            </View>
          )}

          {/* ─── STEP 3 ─────────────────────────── */}
          {currentStep === 2 && (
            <View>
              <View style={styles.estimateNote}>
                <Info size={14} color={Colors.secondary} />
                <Text style={styles.estimateNoteText}>
                  Arrival dates are estimates, not guarantees. Senders will see these as guidelines.
                </Text>
              </View>

              {dropoffStops.map((stop, idx) => (
                <View key={idx} style={styles.stopCard}>
                  <View style={styles.stopCardHeader}>
                    <View style={styles.stopHandleRow}>
                      <GripVertical size={16} color={Colors.text.tertiary} />
                      <Text style={styles.stopLabel}>Stop {idx + 1}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeDropoffStop(idx)}>
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row2}>
                    <View style={styles.flex}>
                      <Input
                        label="City"
                        placeholder="Sfax"
                        value={stop.city}
                        onChangeText={(t) => updateDropoffStop(idx, { city: t })}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Input
                        label="Country"
                        placeholder="Tunisia"
                        value={stop.country}
                        onChangeText={(t) => updateDropoffStop(idx, { country: t })}
                      />
                    </View>
                  </View>
                  <DateInput
                    label="Estimated arrival (optional)"
                    value={stop.estimated_arrival_date}
                    onChange={(v) => updateDropoffStop(idx, { estimated_arrival_date: v })}
                    minDate={departureDate ?? today}
                    placeholder="Optional"
                  />
                  <URLInput
                    label="Meeting point link (optional)"
                    value={stop.meeting_point_url}
                    onChangeText={(t) => updateDropoffStop(idx, { meeting_point_url: t })}
                    placeholder="https://maps.app.goo.gl/…"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addStopBtn, dropoffStops.length >= 8 && styles.addStopBtnDisabled]}
                onPress={addDropoffStop}
                disabled={dropoffStops.length >= 8}
              >
                <Plus size={16} color={dropoffStops.length >= 8 ? Colors.text.tertiary : Colors.primary} />
                <Text style={[styles.addStopText, dropoffStops.length >= 8 && styles.addStopTextDisabled]}>
                  {dropoffStops.length >= 8 ? 'Maximum 8 stops' : 'Add drop-off stop'}
                </Text>
              </TouchableOpacity>

              <View style={styles.stepNavRow}>
                <Button
                  label="← Back"
                  variant="outline"
                  size="md"
                  onPress={() => setCurrentStep(1)}
                  style={styles.backStepBtn}
                />
                <Button
                  label="Next: Pricing"
                  size="md"
                  onPress={handleStep3Next}
                  style={styles.flex}
                />
              </View>
            </View>
          )}

          {/* ─── STEP 4 ─────────────────────────── */}
          {currentStep === 3 && (
            <View>
              {/* Capacity */}
              <Text style={styles.sectionTitle}>Capacity</Text>
              <Controller
                control={step4Form.control}
                name="available_weight_kg"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Input
                      label="Available weight (kg)"
                      placeholder="20"
                      onChangeText={(t) => onChange(parseFloat(t) || 0)}
                      onBlur={onBlur}
                      value={value?.toString() ?? ''}
                      error={step4Form.formState.errors.available_weight_kg?.message}
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.tipRow}>
                      <Info size={12} color={Colors.text.tertiary} />
                      <Text style={styles.tipText}>
                        Capacity decreases automatically as bookings are accepted.
                      </Text>
                    </View>
                  </View>
                )}
              />

              {/* Base price */}
              <Text style={styles.sectionTitle}>Base Price</Text>
              <Controller
                control={step4Form.control}
                name="price_per_kg_eur"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Price per kg (€)"
                    placeholder="5"
                    onChangeText={(t) => onChange(parseFloat(t) || 0)}
                    onBlur={onBlur}
                    value={value?.toString() ?? ''}
                    error={step4Form.formState.errors.price_per_kg_eur?.message}
                    keyboardType="decimal-pad"
                  />
                )}
              />

              {/* Notes */}
              <Controller
                control={step4Form.control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Notes (optional)"
                    placeholder="Any info for senders…"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value ?? ''}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />

              {/* Promo section */}
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setPromoExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Controller
                  control={step4Form.control}
                  name="promo_enabled"
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      value={value}
                      onValueChange={(v) => { onChange(v); setPromoExpanded(v); }}
                      trackColor={{ true: Colors.primary }}
                    />
                  )}
                />
                <Text style={styles.collapsibleLabel}>Offer a promotional rate</Text>
                {promoExpanded ? (
                  <ChevronUp size={16} color={Colors.text.secondary} />
                ) : (
                  <ChevronDown size={16} color={Colors.text.secondary} />
                )}
              </TouchableOpacity>

              {promoExpanded && step4Form.watch('promo_enabled') && (
                <View style={styles.collapsibleContent}>
                  <Controller
                    control={step4Form.control}
                    name="promo_discount_pct"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Discount %"
                        placeholder="e.g. 15"
                        onChangeText={(t) => onChange(parseInt(t) || undefined)}
                        onBlur={onBlur}
                        value={value?.toString() ?? ''}
                        error={step4Form.formState.errors.promo_discount_pct?.message}
                        keyboardType="number-pad"
                      />
                    )}
                  />
                  {discountedPrice && (
                    <View style={styles.liveCalcRow}>
                      <Text style={styles.liveCalcText}>
                        Senders pay <Text style={styles.liveCalcPrice}>€{discountedPrice}/kg</Text>
                      </Text>
                    </View>
                  )}
                  <Controller
                    control={step4Form.control}
                    name="promo_expires_at"
                    render={({ field: { onChange, value } }) => (
                      <DateInput
                        label="Offer expires (optional)"
                        value={value}
                        onChange={onChange}
                        minDate={new Date(Date.now() + 86400000)}
                        placeholder="Optional"
                      />
                    )}
                  />
                  <Controller
                    control={step4Form.control}
                    name="promo_label"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Promo label (optional)"
                        placeholder="e.g. Early bird, Summer special"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value ?? ''}
                        maxLength={30}
                        error={step4Form.formState.errors.promo_label?.message}
                      />
                    )}
                  />
                </View>
              )}

              {/* Payment methods */}
              <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
                How will senders pay you?
              </Text>
              <Controller
                control={step4Form.control}
                name="payment_methods"
                render={({ field: { onChange, value } }) => (
                  <View>
                    {PAYMENT_METHODS.map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={styles.paymentRow}
                        onPress={() => togglePaymentMethod(method, value, onChange)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            value.includes(method) && styles.checkboxChecked,
                          ]}
                        >
                          {value.includes(method) && (
                            <Text style={styles.checkboxTick}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.paymentLabel}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {step4Form.formState.errors.payment_methods && (
                      <Text style={styles.fieldError}>
                        {step4Form.formState.errors.payment_methods.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              {hasCashPayment && (
                <View style={styles.cashWarning}>
                  <Info size={14} color={Colors.warning} />
                  <Text style={styles.cashWarningText}>
                    Cash payments are not covered by Wasali escrow. Commission is not applied to cash transactions.
                  </Text>
                </View>
              )}

              {/* Save as template */}
              <TouchableOpacity
                style={[styles.collapsibleHeader, { marginTop: Spacing.lg }]}
                onPress={() => setTemplateExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Controller
                  control={step4Form.control}
                  name="save_as_template"
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      value={value}
                      onValueChange={(v) => { onChange(v); setTemplateExpanded(v); }}
                      trackColor={{ true: Colors.primary }}
                    />
                  )}
                />
                <Text style={styles.collapsibleLabel}>Save as route template</Text>
                {templateExpanded ? (
                  <ChevronUp size={16} color={Colors.text.secondary} />
                ) : (
                  <ChevronDown size={16} color={Colors.text.secondary} />
                )}
              </TouchableOpacity>

              {templateExpanded && step4Form.watch('save_as_template') && (
                <View style={styles.collapsibleContent}>
                  <Controller
                    control={step4Form.control}
                    name="template_name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Template name"
                        placeholder={`${s1.origin_city || 'Origin'} → ${s1.destination_city || 'Destination'}`}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={value ?? ''}
                        maxLength={60}
                        error={step4Form.formState.errors.template_name?.message}
                      />
                    )}
                  />
                  <Text style={styles.templateSubtext}>
                    Reuse this setup for future trips on the same corridor
                  </Text>
                </View>
              )}

              <View style={styles.stepNavRow}>
                <Button
                  label="← Back"
                  variant="outline"
                  size="md"
                  onPress={() => setCurrentStep(2)}
                  style={styles.backStepBtn}
                />
                <Button
                  label={isLoading ? 'Creating…' : 'Create Route'}
                  size="md"
                  onPress={handleSubmit}
                  isLoading={isLoading}
                  style={styles.flex}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },

  // Draft banner
  draftBanner: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  draftBannerText: { fontSize: FontSize.sm, color: Colors.text.primary, marginBottom: Spacing.sm },
  draftBannerActions: { flexDirection: 'row', gap: Spacing.base },
  draftBannerBtn: {},
  draftBannerContinue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.secondary },
  draftBannerDiscard: { fontSize: FontSize.sm, color: Colors.text.secondary },

  // First-time info box
  infoBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.xs,
  },
  infoBoxTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.xs },
  infoBoxItem: { fontSize: FontSize.sm, color: Colors.text.secondary },

  // Steps
  stepIntro: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.base,
    lineHeight: FontSize.sm * 1.5,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },

  row2: { flexDirection: 'row', gap: Spacing.sm },

  // Stop cards
  stopCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stopHandleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stopLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary },

  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  addStopBtnDisabled: { opacity: 0.5 },
  addStopText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  addStopTextDisabled: { color: Colors.text.tertiary },

  // Estimate note
  estimateNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  estimateNoteText: { fontSize: FontSize.sm, color: Colors.text.secondary, flex: 1 },

  // Navigation
  nextBtn: { marginTop: Spacing.xl },
  stepNavRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  backStepBtn: { width: 90 },

  // Pricing
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.base,
  },
  tipText: { fontSize: FontSize.xs, color: Colors.text.tertiary, flex: 1 },

  // Collapsible sections
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  collapsibleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  collapsibleContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // Promo
  liveCalcRow: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.base,
  },
  liveCalcText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  liveCalcPrice: { fontWeight: '700', color: Colors.success },

  // Payment methods
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxTick: { fontSize: 12, color: Colors.text.inverse, fontWeight: '700' },
  paymentLabel: { fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },
  fieldError: { fontSize: FontSize.xs, color: Colors.error, marginTop: Spacing.xs },

  cashWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  cashWarningText: { fontSize: FontSize.xs, color: Colors.text.secondary, flex: 1 },

  // Template
  templateSubtext: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: -Spacing.sm },
});
