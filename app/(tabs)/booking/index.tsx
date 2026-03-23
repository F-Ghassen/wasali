import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, Lock, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useCitiesStore } from '@/stores/citiesStore';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';

import { useRouteData } from '@/hooks/useRouteData';
import { useBookingForm, computeTotalPrice } from '@/hooks/useBookingForm';
import { useSavedRecipients } from '@/hooks/useSavedRecipients';

import { ItineraryStep }  from '@/components/booking/ItineraryStep';
import { LogisticsStep }  from '@/components/booking/LogisticsStep';
import { SenderStep }     from '@/components/booking/SenderStep';
import { RecipientStep }  from '@/components/booking/RecipientStep';
import { PackageStep }    from '@/components/booking/PackageStep';
import { PaymentStep }    from '@/components/booking/PaymentStep';
import { OrderSummary }   from '@/components/booking/OrderSummary';

import type { FetchedStop } from '@/hooks/useRouteData';

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({
  stepNum, title, isActive, isCompleted, isLocked, summary, onEdit, children,
}: {
  stepNum: number; title: string;
  isActive: boolean; isCompleted: boolean; isLocked: boolean;
  summary?: string; onEdit?: () => void; children?: React.ReactNode;
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

// ─── BookingScreen ────────────────────────────────────────────────────────────

export default function BookingScreen() {
  const router        = useRouter();
  const params        = useLocalSearchParams<{ routeId?: string }>();
  const { profile }   = useAuthStore();
  const bookingStore  = useBookingStore();
  const { selectedRoute: route } = bookingStore;
  const { width }     = useWindowDimensions();
  const isWide        = width >= 768;
  const cities        = useCitiesStore((s) => s.cities);

  // Helper to get city name by ID
  const getCityName = useMemo(() => (cityId: string) => {
    return cities.find((c) => c.id === cityId)?.name || cityId;
  }, [cities]);

  // Determine route ID from either store or URL parameter
  const routeId = route?.id || (params.routeId ? (Array.isArray(params.routeId) ? params.routeId[0] : params.routeId) : null);

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { route: routeData, collectionStops, dropoffStops,
    collectionServicesForStop, deliveryServices, paymentMethods,
    isLoading: isRouteLoading, error: routeError, retry,
  } = useRouteData(routeId);

  const form = useBookingForm(
    route?.id ?? null,
    profile?.full_name ?? '',
    profile?.phone ?? '',
  );
  const { state: fs, set: setField, stepValidity, hasDraft,
    clearDraft, resetLogistics, resetSenderAddress, buildSubmitPayload,
  } = form;

  const { recipients: savedRecipients, upsertRecipient } = useSavedRecipients(profile?.id ?? null);

  // ── Step state ──────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show draft prompt once after form loads
  useEffect(() => {
    if (hasDraft) setShowDraftPrompt(true);
  }, [hasDraft]);

  // Auto-select single collection stop
  useEffect(() => {
    if (collectionStops.length === 1 && !fs.collectionStopId) {
      handleSelectCollectionStop(collectionStops[0]);
    }
  }, [collectionStops.length]);

  // Auto-select single dropoff stop (also seeds recipientAddressCity)
  useEffect(() => {
    if (dropoffStops.length === 1 && !fs.dropoffStopId) {
      handleSelectDropoffStop(dropoffStops[0]);
    }
  }, [dropoffStops.length]);

  // Keep senderAddressCity locked to the selected collection city.
  // Depends on both values so it re-runs if a draft load resets senderAddressCity to ''
  // while collectionStopCity is already populated (value unchanged → effect skipped bug).
  useEffect(() => {
    if (fs.collectionStopCity && fs.senderAddressCity !== fs.collectionStopCity) {
      setField({ senderAddressCity: fs.collectionStopCity });
    }
  }, [fs.collectionStopCity, fs.senderAddressCity]);

  // Keep recipientAddressCity locked to the selected dropoff city.
  // Same draft-load guard as above.
  useEffect(() => {
    if (fs.dropoffStopCity && fs.recipientAddressCity !== fs.dropoffStopCity) {
      setField({ recipientAddressCity: fs.dropoffStopCity });
    }
  }, [fs.dropoffStopCity, fs.recipientAddressCity]);

  // Auto-select single collection service for selected stop
  const stopServices = fs.collectionStopId ? collectionServicesForStop(fs.collectionStopId) : [];
  useEffect(() => {
    if (stopServices.length === 1 && !fs.collectionServiceId) {
      setField({
        collectionServiceId:    stopServices[0].id,
        collectionServiceType:  stopServices[0].service_type,
        collectionServicePrice: stopServices[0].price_eur,
      });
    }
  }, [fs.collectionStopId, stopServices.length]);

  // Auto-select single delivery service
  useEffect(() => {
    if (deliveryServices.length === 1 && !fs.deliveryServiceId) {
      setField({
        deliveryServiceId:    deliveryServices[0].id,
        deliveryServiceType:  deliveryServices[0].service_type,
        deliveryServicePrice: deliveryServices[0].price_eur,
      });
    }
  }, [deliveryServices.length]);

  // ── Stop selection ──────────────────────────────────────────────────────────

  function handleSelectCollectionStop(stop: FetchedStop) {
    const prevStopId = fs.collectionStopId;
    const cityName = getCityName(stop.city_id);
    setField({
      collectionStopId:              stop.id,
      collectionStopCity:            cityName,
      collectionStopDate:            stop.arrival_date ?? '',
      collectionStopLocationName:    stop.location_name,
      collectionStopLocationAddress: stop.location_address,
      senderAddressCity:             cityName,
    });
    if (prevStopId && prevStopId !== stop.id) resetLogistics();
  }

  function handleSelectDropoffStop(stop: FetchedStop) {
    const cityName = getCityName(stop.city_id);
    setField({
      dropoffStopId:              stop.id,
      dropoffStopCity:            cityName,
      dropoffStopDate:            stop.arrival_date ?? '',
      dropoffStopLocationName:    stop.location_name,
      dropoffStopLocationAddress: stop.location_address,
      recipientAddressCity:       cityName,
    });
  }

  // ── Computed values ─────────────────────────────────────────────────────────

  const weightNum  = parseFloat(fs.weight) || 0;
  const totalPrice = routeData
    ? computeTotalPrice(weightNum, routeData, fs.collectionServicePrice, fs.deliveryServicePrice)
    : 0;

  // ── Summaries for completed steps ───────────────────────────────────────────

  const itinerarySummary = fs.collectionStopCity && fs.dropoffStopCity
    ? `${fs.collectionStopCity} → ${fs.dropoffStopCity}`
    : '';

  const SERVICE_TYPE_LABEL: Record<string, string> = {
    sender_dropoff:     'Drop-off at meeting point',
    driver_pickup:      'Driver pickup',
    recipient_collects: 'Recipient self-collects',
    driver_delivery:    'Door delivery',
    local_post:         'Local post',
  };

  const logisticsSummary = (() => {
    const coll = stopServices.find((s) => s.id === fs.collectionServiceId);
    const delv = deliveryServices.find((s) => s.id === fs.deliveryServiceId);
    return [
      coll?.service_type ? (SERVICE_TYPE_LABEL[coll.service_type] ?? coll.service_type) : null,
      delv?.service_type ? (SERVICE_TYPE_LABEL[delv.service_type] ?? delv.service_type) : null,
    ].filter(Boolean).join(' · ');
  })();

  const senderSummary = fs.senderMode === 'own'
    ? `${fs.senderName || '—'} · ${fs.senderCC} ${fs.senderPhone || ''}`
    : `${fs.behalfName} · ${fs.behalfCC} ${fs.behalfPhone}`;

  const packageSummary = fs.weight
    ? `${fs.weight} kg · ${fs.packageTypes.join(', ') || '—'}`
    : '';

  const recipientSummary = fs.recipientName
    ? `${fs.recipientName} · ${fs.recipientCC} ${fs.recipientPhone}`
    : '';

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!profile || !routeData) return;

    // Validate all steps
    const firstInvalid = ([0, 1, 2, 3, 4] as const).find((s) => !stepValidity[s]);
    if (firstInvalid !== undefined) {
      setCurrentStep(firstInvalid);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildSubmitPayload(profile.id, routeData, totalPrice);
      const bookingId = await bookingStore.submitBooking(payload as any);

      // Optionally save recipient
      if (fs.saveRecipient && fs.recipientName && fs.recipientPhone) {
        await upsertRecipient({
          user_id:             profile.id,
          name:                fs.recipientName,
          phone:               `${fs.recipientCC}${fs.recipientPhone}`,
          whatsapp_enabled:    fs.recipientWhatsapp,
          address_street:      fs.recipientAddressStreet || null,
          address_city:        fs.recipientAddressCity || null,
          address_postal_code: fs.recipientAddressPostalCode || null,
        });
      }

      // Optionally update profile
      if (fs.senderMode === 'own' && fs.updateMyProfile) {
        await supabase.from('profiles').update({
          full_name: fs.senderName,
          phone:     `${fs.senderCC}${fs.senderPhone}`,
        }).eq('id', profile.id);
      }

      // Store last booking snapshot for confirmation screen
      bookingStore.setLastBooking({
        id:                    bookingId,
        totalPrice,
        collectionStopCity:    fs.collectionStopCity,
        dropoffStopCity:       fs.dropoffStopCity,
        collectionStopDate:    fs.collectionStopDate,
        dropoffStopDate:       fs.dropoffStopDate,
        collectionServiceType: fs.collectionServiceType,
        deliveryServiceType:   fs.deliveryServiceType,
        senderName:            fs.senderMode === 'own' ? fs.senderName : fs.behalfName,
        recipientName:         fs.recipientName,
        recipientPhone:        `${fs.recipientCC}${fs.recipientPhone}`,
        packageWeightKg:       weightNum,
        packageTypes:          fs.packageTypes,
        paymentType:           fs.paymentType,
        driverName:            routeData.driver?.full_name ?? null,
        driverPhone:           routeData.driver?.phone ?? null,
      });

      clearDraft();
      router.push(`/(tabs)/booking/confirmation?bookingId=${bookingId}` as any);
    } catch (err) {
      Alert.alert(
        'Booking failed',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Guard states ────────────────────────────────────────────────────────────

  if (!route) {
    return (
      <SafeAreaView style={bk.root}>
        <View style={bk.center}>
          <Text style={bk.errorText}>No route selected.</Text>
          <TouchableOpacity onPress={() => router.back()} style={bk.retryBtn}>
            <Text style={bk.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isRouteLoading) {
    return (
      <SafeAreaView style={bk.root}>
        <View style={bk.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={bk.loadingText}>Loading route details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (routeError) {
    const msg = {
      not_found:      'This route could not be found.',
      route_full:     'This route is fully booked.',
      route_departed: 'This route has already departed.',
      network:        'Network error. Please check your connection.',
    }[routeError] ?? 'Something went wrong.';

    return (
      <SafeAreaView style={bk.root}>
        <View style={bk.center}>
          <AlertCircle size={40} color={Colors.error} strokeWidth={1.5} />
          <Text style={bk.errorText}>{msg}</Text>
          {routeError === 'network' && (
            <TouchableOpacity onPress={retry} style={bk.retryBtn}>
              <Text style={bk.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()} style={[bk.retryBtn, { marginTop: 0 }]}>
            <Text style={bk.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form content ────────────────────────────────────────────────────────────

  const formContent = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={f.scrollContent}>

      {/* Draft resume prompt */}
      {showDraftPrompt && (
        <View style={bk.draftBanner}>
          <Text style={bk.draftText}>You have an unfinished booking. Continue where you left off?</Text>
          <View style={bk.draftBtns}>
            <TouchableOpacity
              onPress={() => setShowDraftPrompt(false)}
              style={bk.draftBtnPrimary}
            >
              <Text style={bk.draftBtnPrimaryText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { clearDraft(); form.reset(); setShowDraftPrompt(false); }}
              style={bk.draftBtnGhost}
            >
              <Text style={bk.draftBtnGhostText}>Start fresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 0 — Itinerary */}
      <StepCard
        stepNum={0} title="Itinerary"
        isActive={currentStep === 0} isCompleted={currentStep > 0} isLocked={false}
        summary={itinerarySummary} onEdit={() => setCurrentStep(0)}
      >
        <ItineraryStep
          collectionStops={collectionStops}
          dropoffStops={dropoffStops}
          selectedCollectionStopId={fs.collectionStopId}
          selectedDropoffStopId={fs.dropoffStopId}
          onSelectCollection={handleSelectCollectionStop}
          onSelectDropoff={handleSelectDropoffStop}
          isValid={stepValidity[0]}
          onContinue={() => setCurrentStep(1)}
        />
      </StepCard>

      {/* Step 1 — Logistics */}
      <StepCard
        stepNum={1} title="Logistics"
        isActive={currentStep === 1} isCompleted={currentStep > 1} isLocked={currentStep < 1}
        summary={logisticsSummary} onEdit={() => setCurrentStep(1)}
      >
        {fs.collectionStopId && fs.dropoffStopId ? (
          <LogisticsStep
            collectionStop={collectionStops.find((s) => s.id === fs.collectionStopId)!}
            dropoffStop={dropoffStops.find((s) => s.id === fs.dropoffStopId)!}
            collectionServices={stopServices}
            deliveryServices={deliveryServices}
            selectedCollectionServiceId={fs.collectionServiceId}
            selectedDeliveryServiceId={fs.deliveryServiceId}
            isValid={stepValidity[1]}
            onSelectCollection={(id) => {
              const svc = stopServices.find((s) => s.id === id);
              const prevType = fs.collectionServiceType;
              setField({
                collectionServiceId:    id,
                collectionServiceType:  svc?.service_type ?? null,
                collectionServicePrice: svc?.price_eur ?? 0,
              });
              if (prevType === 'driver_pickup' && svc?.service_type !== 'driver_pickup') {
                resetSenderAddress();
              }
            }}
            onSelectDelivery={(id) => {
              const svc = deliveryServices.find((s) => s.id === id);
              setField({
                deliveryServiceId:    id,
                deliveryServiceType:  svc?.service_type ?? null,
                deliveryServicePrice: svc?.price_eur ?? 0,
              });
            }}
            onContinue={() => setCurrentStep(2)}
          />
        ) : (
          <Text style={f.hint}>Complete itinerary first.</Text>
        )}
      </StepCard>

      {/* Step 2 — Sender */}
      <StepCard
        stepNum={2} title="Your Details"
        isActive={currentStep === 2} isCompleted={currentStep > 2} isLocked={currentStep < 2}
        summary={senderSummary} onEdit={() => setCurrentStep(2)}
      >
        <SenderStep
          senderMode={fs.senderMode}
          senderName={fs.senderName} senderCC={fs.senderCC} senderPhone={fs.senderPhone}
          senderWhatsapp={fs.senderWhatsapp} updateMyProfile={fs.updateMyProfile}
          behalfName={fs.behalfName} behalfCC={fs.behalfCC} behalfPhone={fs.behalfPhone}
          behalfWhatsapp={fs.behalfWhatsapp} saveBehalfToContacts={fs.saveBehalfToContacts}
          collectionServiceType={fs.collectionServiceType}
          collectionStopLocationName={fs.collectionStopLocationName}
          addressStreet={fs.senderAddressStreet} addressCity={fs.senderAddressCity}
          addressPostalCode={fs.senderAddressPostalCode}
          isValid={stepValidity[2]}
          onSet={setField}
          onContinue={() => setCurrentStep(3)}
        />
      </StepCard>

      {/* Step 3 — Recipient */}
      <StepCard
        stepNum={3} title="Recipient"
        isActive={currentStep === 3} isCompleted={currentStep > 3} isLocked={currentStep < 3}
        summary={recipientSummary} onEdit={() => setCurrentStep(3)}
      >
        <RecipientStep
          recipientName={fs.recipientName} recipientCC={fs.recipientCC}
          recipientPhone={fs.recipientPhone} recipientWhatsapp={fs.recipientWhatsapp}
          recipientAddressStreet={fs.recipientAddressStreet}
          recipientAddressCity={fs.recipientAddressCity}
          recipientAddressPostalCode={fs.recipientAddressPostalCode}
          saveRecipient={fs.saveRecipient} driverNotes={fs.driverNotes}
          savedRecipients={savedRecipients}
          deliveryServiceType={fs.deliveryServiceType}
          dropoffStopLocationName={fs.dropoffStopLocationName}
          dropoffStopLocationAddress={fs.dropoffStopLocationAddress}
          dropoffStopCity={fs.dropoffStopCity}
          isValid={stepValidity[3]}
          onSet={setField}
          onContinue={() => setCurrentStep(4)}
        />
      </StepCard>

      {/* Step 4 — Package */}
      <StepCard
        stepNum={4} title="Package"
        isActive={currentStep === 4} isCompleted={currentStep > 4} isLocked={currentStep < 4}
        summary={packageSummary} onEdit={() => setCurrentStep(4)}
      >
        <PackageStep
          weight={fs.weight}
          packageTypes={fs.packageTypes}
          otherDesc={fs.otherDesc}
          packageDesc={fs.packageDesc}
          photos={fs.photos}
          maxWeight={(route as any)?.max_single_package_kg}
          isValid={stepValidity[4]}
          onWeightChange={(v) => setField({ weight: v })}
          onTogglePackageType={(key) => setField({
            packageTypes: fs.packageTypes.includes(key)
              ? fs.packageTypes.filter((t) => t !== key)
              : [...fs.packageTypes, key],
          })}
          onOtherDescChange={(v) => setField({ otherDesc: v })}
          onPackageDescChange={(v) => setField({ packageDesc: v })}
          onPhotosChange={(uris) => setField({ photos: uris })}
          onContinue={() => setCurrentStep(5)}
        />
      </StepCard>

      {/* Step 5 — Payment */}
      <StepCard
        stepNum={5} title="Payment"
        isActive={currentStep === 5} isCompleted={false} isLocked={currentStep < 5}
      >
        <PaymentStep
          paymentMethods={paymentMethods}
          selectedType={fs.paymentType}
          isSubmitting={isSubmitting}
          onSelectType={(type) => setField({ paymentType: type })}
          onSubmit={handleSubmit}
        />
      </StepCard>

      <View style={{ height: Spacing['2xl'] }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={bk.root}>
      {/* Header */}
      <View style={bk.header}>
        <TouchableOpacity
          onPress={() => currentStep > 0 ? setCurrentStep((s) => s - 1) : router.back()}
          style={bk.backBtn}
        >
          <Text style={bk.backText}>‹</Text>
        </TouchableOpacity>
        <View style={bk.headerCenter}>
          <Text style={bk.headerTitle}>Book shipment</Text>
          {routeData && (
            <Text style={bk.headerRoute}>
              {routeData.driver?.full_name} · Origin → Destination · {formatDateShort(routeData.departure_date)}
            </Text>
          )}
        </View>
      </View>

      {isWide ? (
        <View style={bk.wideBody}>
          <View style={bk.formArea}>{formContent}</View>
          <View style={bk.summaryArea}>
            {routeData && (
              <OrderSummary
                routeOriginCity="Origin"
                routeDestinationCity="Destination"
                pricePerKgEur={routeData.price_per_kg_eur}
                promotionActive={routeData.promotion_active}
                promotionPercentage={routeData.promotion_percentage}
                collectionStopCity={fs.collectionStopCity}
                collectionStopDate={fs.collectionStopDate}
                dropoffStopCity={fs.dropoffStopCity}
                dropoffStopDate={fs.dropoffStopDate}
                weightKg={weightNum}
                collectionServiceLabel={fs.collectionServiceType ?? undefined}
                collectionServicePrice={fs.collectionServicePrice}
                deliveryServiceLabel={fs.deliveryServiceType ?? undefined}
                deliveryServicePrice={fs.deliveryServicePrice}
                totalPrice={totalPrice}
              />
            )}
          </View>
        </View>
      ) : (
        formContent
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const bk = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.base },
  loadingText: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.sm },
  errorText:   { fontSize: FontSize.base, color: Colors.text.primary, textAlign: 'center', fontWeight: '600' },
  retryBtn:    { marginTop: Spacing.base, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg },
  retryText:   { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
  },
  backBtn:      { padding: Spacing.xs },
  backText:     { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: FontSize.md, fontWeight: '800', color: Colors.text.primary },
  headerRoute:  { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  draftBanner: {
    backgroundColor: 'rgba(39,110,241,0.08)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1, borderColor: 'rgba(39,110,241,0.2)',
    marginBottom: Spacing.sm,
  },
  draftText:        { fontSize: FontSize.sm, color: Colors.text.primary, fontWeight: '600', marginBottom: Spacing.sm },
  draftBtns:        { flexDirection: 'row', gap: Spacing.sm },
  draftBtnPrimary:  { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  draftBtnPrimaryText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  draftBtnGhost:    { flex: 1, borderWidth: 1, borderColor: Colors.border.medium, borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  draftBtnGhostText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },

  wideBody:    { flex: 1, flexDirection: 'row' },
  formArea:    { flex: 1 },
  summaryArea: { width: 320, backgroundColor: Colors.background.secondary, borderLeftWidth: 1, borderLeftColor: Colors.border.light },
});

const f = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, gap: Spacing.sm },
  hint: { fontSize: FontSize.sm, color: Colors.text.tertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: Spacing.md },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLocked:   { opacity: 0.6 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeDone:       { backgroundColor: Colors.success },
  badgeActive:     { backgroundColor: Colors.primary },
  badgeNum:        { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  badgeNumActive:  { color: Colors.white },
  title:           { flex: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  titleLocked:     { color: Colors.text.tertiary },
  editBtn:         { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  editText:        { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  summary:         { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs, marginLeft: 32 },
  body:            { marginTop: Spacing.base },
});
