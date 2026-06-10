import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useCitiesStore } from '@/stores/citiesStore';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useRouteData } from '@/hooks/useRouteData';
import { useBookingForm, computeTotalPrice } from '@/hooks/useBookingForm';
import { useSavedRecipients } from '@/hooks/useSavedRecipients';

import { ItineraryStep } from '@/components/booking/creation/ItineraryStep';
import { LogisticsStep } from '@/components/booking/creation/LogisticsStep';
import { SenderStep } from '@/components/booking/creation/SenderStep';
import { RecipientStep } from '@/components/booking/creation/RecipientStep';
import { PackageStep } from '@/components/booking/creation/PackageStep';
import { PaymentStep } from '@/components/booking/creation/PaymentStep';
import { OrderSummary } from '@/components/booking/creation/OrderSummary';

import { StepCard } from '@/components/booking/creation/StepCard';
import { BookingHeader } from '@/components/booking/creation/BookingHeader';
import { DraftBanner } from '@/components/booking/creation/DraftBanner';
import { useBookingSteps } from './hooks/useBookingSteps';
import { useBookingSubmit } from './hooks/useBookingSubmit';
import {
  getItinerarySummary,
  getLogisticsSummary,
  getSenderSummary,
  getPackageSummary,
  getRecipientSummary,
} from './utils/bookingSummaries';

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routeId?: string }>();
  const { profile } = useAuthStore();
  const { selectedRoute: route } = useBookingStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const cities = useCitiesStore((s) => s.cities);

  const routeId =
    route?.id ||
    (params.routeId
      ? Array.isArray(params.routeId)
        ? params.routeId[0]
        : params.routeId
      : null);

  const {
    route: routeData,
    collectionStops,
    dropoffStops,
    collectionServicesForStop,
    deliveryServices,
    paymentMethods,
    isLoading: isRouteLoading,
    error: routeError,
    retry,
  } = useRouteData(routeId);

  const form = useBookingForm(
    routeId,
    profile?.full_name ?? '',
    profile?.phone ?? '',
    routeData?.max_single_package_kg,
  );
  const {
    state: fs,
    set: setField,
    stepValidity,
    hasDraft,
    clearDraft,
    resetLogistics,
    resetSenderAddress,
    buildSubmitPayload,
  } = form;

  const { recipients: savedRecipients, upsertRecipient } = useSavedRecipients(
    profile?.id ?? null,
  );

  const {
    currentStep,
    setCurrentStep,
    showDraftPrompt,
    setShowDraftPrompt,
    stopServices,
    handleSelectCollectionStop,
    handleSelectDropoffStop,
    handleSelectCollectionService,
    handleSelectDeliveryService,
  } = useBookingSteps({
    cities,
    collectionStops,
    dropoffStops,
    collectionServicesForStop,
    deliveryServices,
    fs,
    setField,
    resetLogistics,
    resetSenderAddress,
    hasDraft,
  });

  const weightNum = parseFloat(fs.weight) || 0;
  const totalPrice = routeData
    ? computeTotalPrice(
        weightNum,
        routeData,
        fs.collectionServicePrice,
        fs.deliveryServicePrice,
      )
    : 0;

  const { isSubmitting, handleSubmit } = useBookingSubmit({
    profile,
    routeData,
    fs,
    weightNum,
    totalPrice,
    stepValidity,
    buildSubmitPayload,
    upsertRecipient,
    clearDraft,
    setCurrentStep,
  });

  // ── Guard states ────────────────────────────────────────────────────────────

  if (!routeId) {
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
    const msg =
      {
        not_found: 'This route could not be found.',
        route_full: 'This route is fully booked.',
        route_departed: 'This route has already departed.',
        network: 'Network error. Please check your connection.',
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={[bk.retryBtn, { marginTop: 0 }]}
          >
            <Text style={bk.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Summaries ────────────────────────────────────────────────────────────────

  const itinerarySummary = getItinerarySummary(
    fs.collectionStopCity,
    fs.dropoffStopCity,
  );
  const logisticsSummary = getLogisticsSummary(
    stopServices,
    deliveryServices,
    fs.collectionServiceId,
    fs.deliveryServiceId,
  );
  const senderSummary = getSenderSummary(
    fs.senderMode,
    fs.senderName,
    fs.senderCC,
    fs.senderPhone,
    fs.behalfName,
    fs.behalfCC,
    fs.behalfPhone,
  );
  const packageSummary = getPackageSummary(fs.weight, fs.packageTypes);
  const recipientSummary = getRecipientSummary(
    fs.recipientName,
    fs.recipientCC,
    fs.recipientPhone,
  );

  // ── Form content ─────────────────────────────────────────────────────────────

  const formContent = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={f.scrollContent}
    >
      {showDraftPrompt && (
        <DraftBanner
          onContinue={() => setShowDraftPrompt(false)}
          onStartFresh={() => {
            clearDraft();
            form.reset();
            setShowDraftPrompt(false);
          }}
        />
      )}

      <StepCard
        stepNum={0}
        title="Itinerary"
        isActive={currentStep === 0}
        isCompleted={currentStep > 0}
        isLocked={false}
        summary={itinerarySummary}
        onEdit={() => setCurrentStep(0)}
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

      <StepCard
        stepNum={1}
        title="Logistics"
        isActive={currentStep === 1}
        isCompleted={currentStep > 1}
        isLocked={currentStep < 1}
        summary={logisticsSummary}
        onEdit={() => setCurrentStep(1)}
      >
        {fs.collectionStopId && fs.dropoffStopId ? (
          <LogisticsStep
            collectionStop={collectionStops.find(
              (s) => s.id === fs.collectionStopId,
            )!}
            dropoffStop={dropoffStops.find(
              (s) => s.id === fs.dropoffStopId,
            )!}
            collectionServices={stopServices}
            deliveryServices={deliveryServices}
            selectedCollectionServiceId={fs.collectionServiceId}
            selectedDeliveryServiceId={fs.deliveryServiceId}
            isValid={stepValidity[1]}
            onSelectCollection={handleSelectCollectionService}
            onSelectDelivery={handleSelectDeliveryService}
            onContinue={() => setCurrentStep(2)}
          />
        ) : (
          <Text style={f.hint}>Complete itinerary first.</Text>
        )}
      </StepCard>

      <StepCard
        stepNum={2}
        title="Your Details"
        isActive={currentStep === 2}
        isCompleted={currentStep > 2}
        isLocked={currentStep < 2}
        summary={senderSummary}
        onEdit={() => setCurrentStep(2)}
      >
        <SenderStep
          senderMode={fs.senderMode}
          senderName={fs.senderName}
          senderCC={fs.senderCC}
          senderPhone={fs.senderPhone}
          senderWhatsapp={fs.senderWhatsapp}
          updateMyProfile={fs.updateMyProfile}
          behalfName={fs.behalfName}
          behalfCC={fs.behalfCC}
          behalfPhone={fs.behalfPhone}
          behalfWhatsapp={fs.behalfWhatsapp}
          saveBehalfToContacts={fs.saveBehalfToContacts}
          collectionServiceType={fs.collectionServiceType}
          collectionStopLocationName={fs.collectionStopLocationName}
          addressStreet={fs.senderAddressStreet}
          addressCity={fs.senderAddressCity}
          addressPostalCode={fs.senderAddressPostalCode}
          isValid={stepValidity[2]}
          onSet={setField}
          onContinue={() => setCurrentStep(3)}
        />
      </StepCard>

      <StepCard
        stepNum={3}
        title="Recipient"
        isActive={currentStep === 3}
        isCompleted={currentStep > 3}
        isLocked={currentStep < 3}
        summary={recipientSummary}
        onEdit={() => setCurrentStep(3)}
      >
        <RecipientStep
          recipientName={fs.recipientName}
          recipientCC={fs.recipientCC}
          recipientPhone={fs.recipientPhone}
          recipientWhatsapp={fs.recipientWhatsapp}
          recipientAddressStreet={fs.recipientAddressStreet}
          recipientAddressCity={fs.recipientAddressCity}
          recipientAddressPostalCode={fs.recipientAddressPostalCode}
          saveRecipient={fs.saveRecipient}
          driverNotes={fs.driverNotes}
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

      <StepCard
        stepNum={4}
        title="Package"
        isActive={currentStep === 4}
        isCompleted={currentStep > 4}
        isLocked={currentStep < 4}
        summary={packageSummary}
        onEdit={() => setCurrentStep(4)}
      >
        <PackageStep
          weight={fs.weight}
          packageTypes={fs.packageTypes}
          otherDesc={fs.otherDesc}
          packageDesc={fs.packageDesc}
          photos={fs.photos}
          maxWeight={routeData?.max_single_package_kg}
          isValid={stepValidity[4]}
          onWeightChange={(v) => setField({ weight: v })}
          onTogglePackageType={(key) =>
            setField({
              packageTypes: fs.packageTypes.includes(key)
                ? fs.packageTypes.filter((t: string) => t !== key)
                : [...fs.packageTypes, key],
            })
          }
          onOtherDescChange={(v) => setField({ otherDesc: v })}
          onPackageDescChange={(v) => setField({ packageDesc: v })}
          onPhotosChange={(uris) => setField({ photos: uris })}
          onContinue={() => setCurrentStep(5)}
        />
      </StepCard>

      <StepCard
        stepNum={5}
        title="Payment"
        isActive={currentStep === 5}
        isCompleted={false}
        isLocked={currentStep < 5}
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
      <BookingHeader
        currentStep={currentStep}
        routeData={routeData}
        onBack={() =>
          currentStep > 0 ? setCurrentStep((s) => s - 1) : router.back()
        }
      />

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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.base,
    color: Colors.text.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.base,
  },

  wideBody: { flex: 1, flexDirection: 'row' },
  formArea: { flex: 1 },
  summaryArea: {
    width: 320,
    backgroundColor: Colors.background.secondary,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border.light,
  },
});

const f = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
