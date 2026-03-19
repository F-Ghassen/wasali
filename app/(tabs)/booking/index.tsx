import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, Lock } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { OrderSummary } from '@/components/booking/OrderSummary';
import { PackageStep } from '@/components/booking/PackageStep';
import { LogisticsStep, type RouteService } from '@/components/booking/LogisticsStep';
import { SenderStep } from '@/components/booking/SenderStep';
import { RecipientStep } from '@/components/booking/RecipientStep';
import { PaymentStep } from '@/components/booking/PaymentStep';
import { useBookingForm } from '@/hooks/useBookingForm';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

type RoutePaymentMethod = Tables<'route_payment_methods'>;
type Recipient = Tables<'recipients'>;

// ─── Step labels ──────────────────────────────────────────────────────────────

const BOOKING_STEPS = [
  { num: 1, key: 'logistics', label: 'Logistics' },
  { num: 2, key: 'sender',    label: 'Your Details' },
  { num: 3, key: 'package',   label: 'Package' },
  { num: 4, key: 'recipient', label: 'Recipient' },
  { num: 5, key: 'payment',   label: 'Payment' },
];

// ─── UUID guard — synthetic IDs (legacy-*, default-*) are not real DB rows ────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isRealUuid(id: string | null | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

// ─── Helpers to synthesise services from legacy logistics_options ─────────────

function getServicesFromRoute(route: any): { collection: RouteService[]; delivery: RouteService[] } {
  const opts: any[] = Array.isArray(route.logistics_options) ? route.logistics_options : [];
  const collection: RouteService[] = [];
  const delivery: RouteService[]   = [];

  for (const opt of opts) {
    if (opt.type === 'collection') {
      collection.push({
        id: `legacy-${opt.key}`,
        service_type: opt.key === 'drop_off' ? 'sender_dropoff' : 'driver_pickup',
        price_eur: opt.price_eur ?? 0,
        location_name: null, location_address: null, instructions: null,
      });
    } else if (opt.type === 'delivery') {
      delivery.push({
        id: `legacy-${opt.key}`,
        service_type: opt.key === 'recipient_collect' ? 'recipient_collects' : 'driver_delivery',
        price_eur: opt.price_eur ?? 0,
        location_name: null, location_address: null, instructions: null,
      });
    }
  }

  // Fallback if no logistics_options: offer basic drop-off + self-collect
  if (collection.length === 0) {
    collection.push({ id: 'default-dropoff', service_type: 'sender_dropoff', price_eur: 0, location_name: null, location_address: null, instructions: null });
  }
  if (delivery.length === 0) {
    delivery.push({ id: 'default-collect', service_type: 'recipient_collects', price_eur: 0, location_name: null, location_address: null, instructions: null });
  }
  return { collection, delivery };
}

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
  const router      = useRouter();
  const { t }       = useTranslation();
  const { profile } = useAuthStore();
  const bookingStore = useBookingStore();
  const { selectedRoute: route, isLoading: isSubmitting } = bookingStore;
  const { width }   = useWindowDimensions();
  const isWide      = width >= 768;

  const form = useBookingForm(profile?.full_name ?? '', profile?.phone ?? '');
  const { state: fs, set: setField, stepValidity } = form;

  const [currentStep, setCurrentStep] = useState(1);
  const [collectionServices, setCollectionServices] = useState<RouteService[]>([]);
  const [deliveryServices,   setDeliveryServices]   = useState<RouteService[]>([]);
  const [routePaymentMethods, setRoutePaymentMethods] = useState<RoutePaymentMethod[]>([]);
  const [savedRecipients, setSavedRecipients]         = useState<Recipient[]>([]);
  // Fetch route services + payment methods on mount
  useEffect(() => {
    if (!route) return;

    supabase
      .from('route_services' as any)
      .select('*')
      .eq('route_id', route.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const services = data as unknown as RouteService[];
          setCollectionServices(services.filter((s) =>
            ['sender_dropoff', 'driver_pickup'].includes(s.service_type)
          ));
          setDeliveryServices(services.filter((s) =>
            ['recipient_collects', 'driver_delivery', 'local_post'].includes(s.service_type)
          ));
        } else {
          const { collection, delivery } = getServicesFromRoute(route);
          setCollectionServices(collection);
          setDeliveryServices(delivery);
        }
      });

    supabase
      .from('route_payment_methods' as any)
      .select('*')
      .eq('route_id', route.id)
      .then(({ data }) => {
        if (data) setRoutePaymentMethods(data as unknown as RoutePaymentMethod[]);
      });
  }, [route?.id]);

  // Fetch saved recipients
  useEffect(() => {
    if (!profile) return;
    supabase
      .from('recipients' as any)
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setSavedRecipients(data as unknown as Recipient[]);
      });
  }, [profile?.id]);

  const pickupOptions = route ? [
    { city: route.origin_city, country: route.origin_country, date: route.departure_date },
    ...route.route_stops
      .filter((s) => s.is_pickup_available && s.city !== route.origin_city)
      .map((s) => ({ city: s.city, country: s.country, date: s.arrival_date ?? '' })),
  ] : [];

  const dropoffOptions = route ? [
    { city: route.destination_city, country: route.destination_country, date: route.estimated_arrival_date ?? '' },
    ...route.route_stops
      .filter((s) => s.is_dropoff_available && s.city !== route.destination_city)
      .map((s) => ({
      city: s.city, country: s.country, date: s.arrival_date ?? '',
    })),
  ] : [];

  // Look up selected service prices
  const selectedCollSvc = collectionServices.find((s) => s.id === fs.collectionServiceId);
  const selectedDelSvc  = deliveryServices.find((s) => s.id === fs.deliveryServiceId);
  const weightNum = parseFloat(fs.weight) || 0;

  async function handleSubmit() {
    if (!profile || !route) return;

    bookingStore.setDraft({
      packageWeightKg:           weightNum,
      packageTypes:              fs.packageTypes,
      packagePhotos:             fs.photos,
      pickupType:                fs.collectionServiceId ? 'driver_pickup' : 'sender_dropoff',
      pickupAddress:             fs.senderAddressStreet
                                   ? `${fs.senderAddressStreet}, ${fs.senderAddressPostalCode} ${fs.senderAddressCity}`
                                   : '',
      dropoffType:               fs.deliveryServiceId ? 'home_delivery' : 'recipient_pickup',
      dropoffAddress:            fs.recipientAddressStreet
                                   ? `${fs.recipientAddressStreet}, ${fs.recipientAddressPostalCode} ${fs.recipientAddressCity}`
                                   : '',
      collectionServiceId:       isRealUuid(fs.collectionServiceId) ? fs.collectionServiceId : null,
      deliveryServiceId:         isRealUuid(fs.deliveryServiceId)   ? fs.deliveryServiceId   : null,
      collectionServicePriceEur: selectedCollSvc?.price_eur ?? 0,
      deliveryServicePriceEur:   selectedDelSvc?.price_eur ?? 0,
      senderAddressStreet:       fs.senderAddressStreet,
      senderAddressCity:         fs.senderAddressCity,
      senderAddressPostalCode:   fs.senderAddressPostalCode,
      recipientName:             fs.recipientName,
      recipientPhoneCC:          fs.recipientCC,
      recipientPhone:            fs.recipientPhone,
      recipientPhoneIsWhatsapp:  fs.recipientPhoneIsWhatsapp,
      recipientAddressStreet:    fs.recipientAddressStreet,
      recipientAddressCity:      fs.recipientAddressCity,
      recipientAddressPostalCode: fs.recipientAddressPostalCode,
      driverNotes:               fs.driverNotes,
      paymentType:               fs.paymentType,
    });
    bookingStore.computePrice();

    try {
      const bookingId = await bookingStore.submitBooking(profile.id);

      // Optionally save recipient
      if (fs.saveRecipient && fs.recipientName && fs.recipientPhone) {
        await supabase.from('recipients' as any).upsert({
          user_id: profile.id,
          name: fs.recipientName,
          phone: `${fs.recipientCC}${fs.recipientPhone}`,
          whatsapp_enabled: fs.recipientPhoneIsWhatsapp,
          address_street: fs.recipientAddressStreet || null,
          address_city: fs.recipientAddressCity || null,
          address_postal_code: fs.recipientAddressPostalCode || null,
        }, { onConflict: 'user_id,phone' });
      }

      router.push(`/(tabs)/booking/confirmation?bookingId=${bookingId}` as any);
    } catch (err) {
      Alert.alert(
        t('booking.error.title'),
        err instanceof Error ? err.message : t('booking.error.fallback'),
      );
    }
  }

  // ── Summaries for completed steps ──────────────────────────────────────────

  const logisticsSummary = [
    selectedCollSvc ? `${fs.collectionCity}` : fs.collectionCity,
    selectedDelSvc  ? `${fs.dropoffCity}`    : fs.dropoffCity,
  ].filter(Boolean).join(' → ');

  const senderSummary = fs.senderMode === 'own'
    ? `${fs.ownName || '—'} · ${fs.ownCC} ${fs.ownPhone || 'no phone'}`
    : `${fs.behalfName} · ${fs.behalfCC} ${fs.behalfPhone}`;

  const packageSummary = fs.weight ? `${fs.weight} kg · ${fs.packageTypes.join(', ') || '—'}` : '';
  const recipientSummary = fs.recipientName ? `${fs.recipientName} · ${fs.recipientCC} ${fs.recipientPhone}` : '';

  // ── Form content ───────────────────────────────────────────────────────────

  const formContent = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={f.scrollContent}>

      {/* Step 1 — Logistics */}
      <StepCard
        stepNum={1} title="Logistics"
        isActive={currentStep === 1} isCompleted={currentStep > 1} isLocked={false}
        summary={logisticsSummary} onEdit={() => setCurrentStep(1)}
      >
        <LogisticsStep
          collectionServices={collectionServices}
          deliveryServices={deliveryServices}
          selectedCollectionId={fs.collectionServiceId}
          selectedDeliveryId={fs.deliveryServiceId}
          collectionCity={fs.collectionCity}
          collectionCityDate={fs.collectionCityDate}
          dropoffCity={fs.dropoffCity}
          dropoffCityDate={fs.dropoffCityDate}
          pickupOptions={pickupOptions}
          dropoffOptions={dropoffOptions}
          isValid={stepValidity[2]}
          onSelectCollection={(id) => setField({ collectionServiceId: id })}
          onSelectDelivery={(id)   => setField({ deliveryServiceId: id })}
          onSelectCollectionCity={(city, date) => setField({ collectionCity: city, collectionCityDate: date })}
          onSelectDropoffCity={(city, date)    => setField({ dropoffCity: city, dropoffCityDate: date })}
          onContinue={() => setCurrentStep(2)}
        />
      </StepCard>

      {/* Step 2 — Sender */}
      <StepCard
        stepNum={2} title="Your Details"
        isActive={currentStep === 2} isCompleted={currentStep > 2} isLocked={currentStep < 2}
        summary={senderSummary} onEdit={() => setCurrentStep(2)}
      >
        <SenderStep
          senderMode={fs.senderMode}
          ownName={fs.ownName} ownCC={fs.ownCC} ownPhone={fs.ownPhone}
          ownPhoneIsWhatsapp={fs.ownPhoneIsWhatsapp} updateMyProfile={fs.updateMyProfile}
          behalfName={fs.behalfName} behalfCC={fs.behalfCC} behalfPhone={fs.behalfPhone}
          behalfPhoneIsWhatsapp={fs.behalfPhoneIsWhatsapp} saveBehalfToRecipients={fs.saveBehalfToRecipients}
          addressStreet={fs.senderAddressStreet} addressCity={fs.senderAddressCity}
          addressPostalCode={fs.senderAddressPostalCode}
          isValid={stepValidity[1]}
          onSet={setField}
          onContinue={() => setCurrentStep(3)}
        />
      </StepCard>

      {/* Step 3 — Package */}
      <StepCard
        stepNum={3} title="Package"
        isActive={currentStep === 3} isCompleted={currentStep > 3} isLocked={currentStep < 3}
        summary={packageSummary} onEdit={() => setCurrentStep(3)}
      >
        <PackageStep
          weight={fs.weight}
          packageTypes={fs.packageTypes}
          otherDesc={fs.otherDesc}
          packageDesc={fs.packageDesc}
          photos={fs.photos}
          maxWeight={(route as any)?.max_single_package_kg}
          isValid={stepValidity[3]}
          onWeightChange={(v) => setField({ weight: v })}
          onTogglePackageType={(key) => setField({
            packageTypes: fs.packageTypes.includes(key)
              ? fs.packageTypes.filter((t) => t !== key)
              : [...fs.packageTypes, key],
          })}
          onOtherDescChange={(v) => setField({ otherDesc: v })}
          onPackageDescChange={(v) => setField({ packageDesc: v })}
          onPhotosChange={(uris) => setField({ photos: uris })}
          onContinue={() => setCurrentStep(4)}
        />
      </StepCard>

      {/* Step 4 — Recipient */}
      <StepCard
        stepNum={4} title="Recipient"
        isActive={currentStep === 4} isCompleted={currentStep > 4} isLocked={currentStep < 4}
        summary={recipientSummary} onEdit={() => setCurrentStep(4)}
      >
        <RecipientStep
          recipientName={fs.recipientName} recipientCC={fs.recipientCC}
          recipientPhone={fs.recipientPhone} recipientPhoneIsWhatsapp={fs.recipientPhoneIsWhatsapp}
          recipientAddressStreet={fs.recipientAddressStreet} recipientAddressCity={fs.recipientAddressCity}
          recipientAddressPostalCode={fs.recipientAddressPostalCode}
          saveRecipient={fs.saveRecipient} driverNotes={fs.driverNotes}
          savedRecipients={savedRecipients}
          deliveryServiceType={selectedDelSvc?.service_type}
          dropoffCity={fs.dropoffCity}
          isValid={stepValidity[4]}
          onSet={setField}
          onContinue={() => setCurrentStep(5)}
        />
      </StepCard>

      {/* Step 5 — Payment */}
      <StepCard
        stepNum={5} title="Payment"
        isActive={currentStep === 5} isCompleted={false} isLocked={currentStep < 5}
      >
        <PaymentStep
          routePaymentMethods={routePaymentMethods}
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
          onPress={() => currentStep > 1 ? setCurrentStep((s) => s - 1) : router.back()}
          style={bk.backBtn}
        >
          <Text style={bk.backText}>‹</Text>
        </TouchableOpacity>
        <View style={bk.headerCenter}>
          <Text style={bk.headerTitle}>Book shipment</Text>
          {route && (
            <Text style={bk.headerRoute}>
              {route.driver?.full_name} · {route.origin_city} → {route.destination_city} · {formatDateShort(route.departure_date)}
            </Text>
          )}
        </View>
      </View>

      {isWide ? (
        <View style={bk.wideBody}>
          <View style={bk.formArea}>{formContent}</View>
          <View style={bk.summaryArea}>
            <OrderSummary
              route={route}
              collectionCity={fs.collectionCity}
              dropoffCity={fs.dropoffCity}
              collectionCityDate={fs.collectionCityDate}
              dropoffCityDate={fs.dropoffCityDate}
              weightKg={weightNum}
              collectionServiceLabel={selectedCollSvc ? `Collection · ${selectedCollSvc.service_type}` : undefined}
              collectionServicePrice={selectedCollSvc?.price_eur}
              deliveryServiceLabel={selectedDelSvc ? `Delivery · ${selectedDelSvc.service_type}` : undefined}
              deliveryServicePrice={selectedDelSvc?.price_eur}
            />
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text.primary },
  headerRoute: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  wideBody: { flex: 1, flexDirection: 'row' },
  formArea: { flex: 1 },
  summaryArea: {
    width: 320,
    backgroundColor: Colors.background.secondary,
    borderLeftWidth: 1, borderLeftColor: Colors.border.light,
  },
});

const f = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, gap: Spacing.sm },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLocked: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeDone: { backgroundColor: Colors.success },
  badgeActive: { backgroundColor: Colors.primary },
  badgeNum: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  badgeNumActive: { color: Colors.white },
  title: { flex: 1, fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary },
  titleLocked: { color: Colors.text.tertiary },
  editBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  editText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  summary: { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: Spacing.xs, marginLeft: 32 },
  body: { marginTop: Spacing.base },
});

