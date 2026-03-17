import React, { useState } from 'react';
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
  useWindowDimensions,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check, ChevronDown, X, Plus, CreditCard, Lock,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { OrderSummary } from '@/components/booking/OrderSummary';

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionMethod = 'dropoff' | 'pickup';
type DeliveryMethod   = 'collect' | 'home' | 'post';
type SenderMode       = 'own' | 'behalf';
type PaymentMethod    = 'card' | 'paypal' | 'cash';

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { flag: '🇩🇪', code: '+49',  name: 'Germany' },
  { flag: '🇫🇷', code: '+33',  name: 'France' },
  { flag: '🇮🇹', code: '+39',  name: 'Italy' },
  { flag: '🇧🇪', code: '+32',  name: 'Belgium' },
  { flag: '🇳🇱', code: '+31',  name: 'Netherlands' },
  { flag: '🇪🇸', code: '+34',  name: 'Spain' },
  { flag: '🇬🇧', code: '+44',  name: 'United Kingdom' },
  { flag: '🇹🇳', code: '+216', name: 'Tunisia' },
  { flag: '🇺🇸', code: '+1',   name: 'United States' },
];

const PACKAGE_TYPES = [
  { key: 'clothing',    label: 'Clothing' },
  { key: 'food',        label: 'Food' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'documents',   label: 'Documents' },
  { key: 'mixed',       label: 'Mixed' },
  { key: 'other',       label: 'Other' },
];

const WEIGHT_CHIPS = [2, 7, 15, 25];

const COLLECTION_OPTIONS: { key: CollectionMethod; label: string; desc: string; price: string }[] = [
  {
    key: 'dropoff',
    label: 'Drop-off point',
    desc: 'Bring to a shared collection point. Exact address & time confirmed after booking.',
    price: '+€0',
  },
  {
    key: 'pickup',
    label: 'Driver picks up',
    desc: 'Driver collects from your door. Your address from sender info will be used.',
    price: '+€8',
  },
];

const DELIVERY_OPTIONS: { key: DeliveryMethod; label: string; desc: string; price: string }[] = [
  {
    key: 'collect',
    label: 'Recipient collects',
    desc: 'Pick up from shared point in drop-off city. Exact address & time confirmed after booking.',
    price: '+€0',
  },
  {
    key: 'home',
    label: 'Home delivery by driver',
    desc: 'Driver delivers to the door. Recipient address required.',
    price: '+€10',
  },
  {
    key: 'post',
    label: 'Post delivery',
    desc: 'Driver hands to local post. Tracking number shared with recipient.',
    price: '+€6',
  },
];

const STEPS = [
  { num: 1, key: 'details',   label: 'Details' },
  { num: 2, key: 'logistics', label: 'Logistics' },
  { num: 3, key: 'package',   label: 'Package' },
  { num: 4, key: 'recipient', label: 'Recipient' },
  { num: 5, key: 'payment',   label: 'Payment' },
];

// ─── CountryCodePicker ────────────────────────────────────────────────────────

function CountryCodePicker({
  value, onChange,
}: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRY_CODES.find((c) => c.code === value) ?? COUNTRY_CODES[0];

  return (
    <>
      <TouchableOpacity style={pk.ccBtn} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={pk.ccBtnText}>{selected.flag} {selected.code}</Text>
        <ChevronDown size={12} color={Colors.text.tertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={pk.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={pk.sheet}>
            <Text style={pk.sheetTitle}>Select country code</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[pk.item, item.code === value && pk.itemActive]}
                  onPress={() => { onChange(item.code); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={pk.itemName}>{item.flag}  {item.name}</Text>
                  <Text style={pk.itemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── CityPickerModal ──────────────────────────────────────────────────────────

function CityPickerModal({
  visible, title, options, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: { city: string; country: string; date: string }[];
  onSelect: (city: string, date: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pk.overlay} activeOpacity={1} onPress={onClose}>
        <View style={pk.sheet}>
          <Text style={pk.sheetTitle}>{title}</Text>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={pk.item}
              onPress={() => { onSelect(opt.city, opt.date); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={pk.itemName}>{opt.city}, {opt.country}</Text>
              {opt.date ? <Text style={pk.itemCode}>{formatDateShort(opt.date)}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

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
  stepNum, title, isActive, isCompleted, isLocked, summary, onEdit, children,
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
            : <Text style={[sc.badgeNum, (isActive || isCompleted) && sc.badgeNumActive]}>{stepNum}</Text>
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

// ─── RadioCard ────────────────────────────────────────────────────────────────

function RadioCard({
  label, desc, price, selected, onPress,
}: {
  label: string; desc: string; price: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[f.radioCard, selected && f.radioCardActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={f.radioRow}>
        <View style={[f.radio, selected && f.radioActive]}>
          {selected && <View style={f.radioInner} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={f.radioTopRow}>
            <Text style={f.radioLabel}>{label}</Text>
            <Text style={[f.radioPrice, selected && f.radioPriceActive]}>{price}</Text>
          </View>
          <Text style={f.radioDesc}>{desc}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── BookingScreen ────────────────────────────────────────────────────────────

export default function BookingScreen() {
  const router   = useRouter();
  const { profile }        = useAuthStore();
  const bookingStore = useBookingStore();
  const { selectedRoute: route, isLoading: isSubmitting } = bookingStore;
  const { width } = useWindowDimensions();
  const isWide   = width >= 768;

  const [currentStep, setCurrentStep] = useState(1);

  // ── Step 1: Sender details ─────────────────────────────────────────────────
  const [senderMode, setSenderMode]             = useState<SenderMode>('own');
  // "own" editable fields
  const [ownCC, setOwnCC]                       = useState('+49');
  const [ownPhone, setOwnPhone]                 = useState(profile?.phone ?? '');
  const [ownPhoneIsWhatsapp, setOwnPhoneIsWhatsapp] = useState(false);
  const [updateMyProfile, setUpdateMyProfile]   = useState(true);
  // "on behalf" fields
  const [behalfName, setBehalfName]             = useState('');
  const [behalfCC, setBehalfCC]                 = useState('+49');
  const [behalfPhone, setBehalfPhone]           = useState('');
  const [behalfPhoneIsWhatsapp, setBehalfPhoneIsWhatsapp] = useState(false);
  const [saveBehalfToRecipients, setSaveBehalfToRecipients] = useState(true);
  // address (shared, always visible in step 1)
  const [street, setStreet]                     = useState('');
  const [postalCode, setPostalCode]             = useState('');
  const [addressCity, setAddressCity]           = useState('');
  const [addressCountry, setAddressCountry]     = useState('');

  // ── Step 2: Logistics ──────────────────────────────────────────────────────
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>('dropoff');
  const [deliveryMethod,   setDeliveryMethod]   = useState<DeliveryMethod>('collect');
  const [collectionCity,     setCollectionCity]   = useState('');
  const [collectionCityDate, setCollectionCityDate] = useState('');
  const [dropoffCity,        setDropoffCity]      = useState('');
  const [dropoffCityDate,    setDropoffCityDate]  = useState('');
  const [showCollPicker, setShowCollPicker] = useState(false);
  const [showDropPicker, setShowDropPicker] = useState(false);

  // ── Step 3: Package ────────────────────────────────────────────────────────
  const [weight,           setWeight]           = useState('');
  const [packageTypes,     setPackageTypes]     = useState<string[]>([]);
  const [otherDesc,        setOtherDesc]        = useState('');
  const [packageDesc,      setPackageDesc]      = useState('');
  const [photos,           setPhotos]           = useState<string[]>([]);

  // ── Step 4: Recipient ──────────────────────────────────────────────────────
  const [recipientName,    setRecipientName]    = useState('');
  const [recipientCC,      setRecipientCC]      = useState('+216');
  const [recipientPhone,   setRecipientPhone]   = useState('');
  const [recipientPhoneIsWhatsapp, setRecipientPhoneIsWhatsapp] = useState(false);
  const [recipientAddrLine1, setRecipientAddrLine1] = useState('');
  const [recipientAddrLine2, setRecipientAddrLine2] = useState('');
  const [saveRecipient,    setSaveRecipient]    = useState(true);
  const [driverNotes,      setDriverNotes]      = useState('');

  // ── Step 5: Payment ────────────────────────────────────────────────────────
  const [paymentMethod,    setPaymentMethod]    = useState<PaymentMethod>('card');

  // ── Derived ────────────────────────────────────────────────────────────────
  const weightNum         = parseFloat(weight) || 0;
  const pickupSurcharge   = collectionMethod === 'pickup' ? 8 : 0;
  const deliverySurcharge = deliveryMethod === 'home' ? 10 : deliveryMethod === 'post' ? 6 : 0;
  const total             = weightNum * (route?.price_per_kg_eur ?? 0) + pickupSurcharge + deliverySurcharge;

  const myName = profile?.full_name ?? '';

  // ── Per-step validation ────────────────────────────────────────────────────
  const step1Valid = senderMode === 'own'
    ? ownPhone.trim().length > 0
    : behalfName.trim().length > 0 && behalfPhone.trim().length > 0;
  const step2Valid = collectionCity.trim().length > 0 && dropoffCity.trim().length > 0;
  const step3Valid = weightNum > 0;
  const step4Valid = recipientName.trim().length > 0 && recipientPhone.trim().length > 0;

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!profile) return;

    const senderName = senderMode === 'own' ? myName : behalfName;

    // Sync entire form state into the store before submitting
    bookingStore.setDraft({
      senderMode,
      senderPhoneCC: ownCC,
      senderPhone: ownPhone,
      senderPhoneIsWhatsapp: ownPhoneIsWhatsapp,
      senderStreet: street,
      senderPostalCode: postalCode,
      senderCity: addressCity,
      senderCountry: addressCountry,
      behalfName,
      behalfPhoneCC: behalfCC,
      behalfPhone,
      collectionMethod,
      collectionCity,
      collectionCityDate,
      deliveryMethod,
      dropoffCity,
      dropoffCityDate,
      packageWeightKg: weightNum,
      packageTypes,
      packagePhotos: photos,
      recipientName,
      recipientPhoneCC: recipientCC,
      recipientPhone,
      recipientPhoneIsWhatsapp,
      recipientAddressLine1: recipientAddrLine1,
      recipientAddressLine2: recipientAddrLine2,
      driverNotes,
      paymentMethod: paymentMethod === 'paypal' ? 'card' : paymentMethod,
    });
    bookingStore.computePrice();

    try {
      const bookingId = await bookingStore.submitBooking(profile.id, senderName);
      router.push(`/tracking/${bookingId}` as any);
    } catch {
      // submitBooking never throws (has fallback), but guard just in case
    }
  }

  // Route stop options
  const pickupOptions = route ? [
    { city: route.origin_city, country: route.origin_country, date: route.departure_date },
    ...route.route_stops
      .filter((s) => s.is_pickup_available)
      .map((s) => ({ city: s.city, country: s.country, date: s.arrival_date ?? '' })),
  ] : [];

  const dropoffOptions = route ? [
    { city: route.destination_city, country: route.destination_country, date: route.estimated_arrival_date ?? '' },
    ...route.route_stops
      .filter((s) => s.is_dropoff_available)
      .map((s) => ({ city: s.city, country: s.country, date: s.arrival_date ?? '' })),
  ] : [];

  // Step summaries
  const senderSummary = senderMode === 'own'
    ? `${myName || '—'} · ${ownCC} ${ownPhone || 'no phone'}`
    : `${behalfName} · ${behalfCC} ${behalfPhone}`;
  const logisticsSummary = `${COLLECTION_OPTIONS.find((o) => o.key === collectionMethod)?.label} · ${DELIVERY_OPTIONS.find((o) => o.key === deliveryMethod)?.label}`;
  const packageSummary   = weight ? `${weight} kg · ${packageTypes.join(', ') || '—'}` : '';
  const recipientSummary = recipientName ? `${recipientName} · ${recipientCC} ${recipientPhone}` : '';

  const handleAddPhoto = async () => {
    if (photos.length >= 5) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const togglePackageType = (key: string) =>
    setPackageTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );

  // ── Shared form ScrollView ─────────────────────────────────────────────────
  const formContent = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
      contentContainerStyle={f.scrollContent}
    >
      {/* ── Sticky step indicator ──────────────────────── */}
      <StepIndicator currentStep={currentStep} />

      {/* ════════════════════════════════════════════════
          Step 1 — Your Details
      ════════════════════════════════════════════════ */}
      <StepCard
        stepNum={1} title="Your Details"
        isActive={currentStep === 1} isCompleted={currentStep > 1} isLocked={false}
        summary={senderSummary} onEdit={() => setCurrentStep(1)}
      >
        {/* Tooltip */}
        <View style={f.tooltip}>
          <Text style={f.tooltipText}>
            📦 These are your details as the <Text style={f.tooltipBold}>sender</Text> of this shipment.
          </Text>
        </View>

        {/* Sender mode tabs */}
        <View style={f.tabRow}>
          {(['own', 'behalf'] as SenderMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[f.tab, senderMode === mode && f.tabActive]}
              onPress={() => setSenderMode(mode)}
              activeOpacity={0.75}
            >
              <Text style={[f.tabText, senderMode === mode && f.tabTextActive]}>
                {mode === 'own' ? 'My details' : 'On behalf of someone'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {senderMode === 'own' ? (
          <>
            {/* Full name — read-only */}
            <Text style={f.fieldLabel}>Full name</Text>
            <View style={f.readOnlyInput}>
              <Text style={myName ? f.readOnlyValue : f.selectPlaceholder}>
                {myName || 'Not set in profile'}
              </Text>
            </View>

            {/* Phone — editable */}
            <Text style={f.fieldLabel}>Phone number</Text>
            <View style={f.phoneRow}>
              <CountryCodePicker value={ownCC} onChange={setOwnCC} />
              <TextInput
                style={[f.input, f.phoneInput]}
                placeholder="123 456 789"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
                value={ownPhone} onChangeText={setOwnPhone}
              />
            </View>
            <View style={f.inlineToggle}>
              <Switch
                value={ownPhoneIsWhatsapp} onValueChange={setOwnPhoneIsWhatsapp}
                trackColor={{ false: Colors.border.medium, true: '#25D366' }}
                thumbColor={Colors.white} style={f.inlineToggleSwitch}
              />
              <Text style={f.inlineToggleLabel}>This is my WhatsApp number</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={f.fieldLabel}>Full name</Text>
            <TextInput
              style={f.input} placeholder="Full name"
              placeholderTextColor={Colors.text.tertiary}
              value={behalfName} onChangeText={setBehalfName}
            />
            <Text style={f.fieldLabel}>Phone number</Text>
            <View style={f.phoneRow}>
              <CountryCodePicker value={behalfCC} onChange={setBehalfCC} />
              <TextInput
                style={[f.input, f.phoneInput]}
                placeholder="123 456 789"
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="phone-pad"
                value={behalfPhone} onChangeText={setBehalfPhone}
              />
            </View>
            <View style={f.inlineToggle}>
              <Switch
                value={behalfPhoneIsWhatsapp} onValueChange={setBehalfPhoneIsWhatsapp}
                trackColor={{ false: Colors.border.medium, true: '#25D366' }}
                thumbColor={Colors.white} style={f.inlineToggleSwitch}
              />
              <Text style={f.inlineToggleLabel}>This is my WhatsApp number</Text>
            </View>
            <View style={f.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={f.toggleLabel}>Save to my recipients list</Text>
                <Text style={f.toggleDesc}>Quickly reuse this person for future shipments</Text>
              </View>
              <Switch
                value={saveBehalfToRecipients} onValueChange={setSaveBehalfToRecipients}
                trackColor={{ false: Colors.border.medium, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          </>
        )}

        {/* Address — always visible */}
        <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>Address</Text>
        <Text style={f.fieldLabel}>Street address</Text>
        <TextInput style={f.input} placeholder="e.g. 12 Hauptstraße" placeholderTextColor={Colors.text.tertiary} value={street} onChangeText={setStreet} />
        <View style={f.twoCol}>
          <View style={f.twoColLeft}>
            <Text style={f.fieldLabel}>Postal code</Text>
            <TextInput style={f.input} placeholder="10115" placeholderTextColor={Colors.text.tertiary} keyboardType="numeric" value={postalCode} onChangeText={setPostalCode} />
          </View>
          <View style={f.twoColRight}>
            <Text style={f.fieldLabel}>City</Text>
            <TextInput style={f.input} placeholder="Berlin" placeholderTextColor={Colors.text.tertiary} value={addressCity} onChangeText={setAddressCity} />
          </View>
        </View>
        <Text style={f.fieldLabel}>Country</Text>
        <TextInput style={f.input} placeholder="Germany" placeholderTextColor={Colors.text.tertiary} value={addressCountry} onChangeText={setAddressCountry} />

        {/* Update profile toggle (own mode only) */}
        {senderMode === 'own' && (
          <View style={f.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={f.toggleLabel}>Update my profile</Text>
              <Text style={f.toggleDesc}>Save phone & address changes to your account</Text>
            </View>
            <Switch
              value={updateMyProfile} onValueChange={setUpdateMyProfile}
              trackColor={{ false: Colors.border.medium, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        )}

        <Text style={f.privacyNote}>
          🔒 Your contact details are only shared directly with the driver.
        </Text>
        <TouchableOpacity
          style={[f.continueBtn, !step1Valid && f.continueBtnDisabled]}
          onPress={() => step1Valid && setCurrentStep(2)}
          activeOpacity={0.85}
          disabled={!step1Valid}
        >
          <Text style={f.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
      </StepCard>

      {/* ════════════════════════════════════════════════
          Step 2 — Logistics
      ════════════════════════════════════════════════ */}
      <StepCard
        stepNum={2} title="Logistics"
        isActive={currentStep === 2} isCompleted={currentStep > 2} isLocked={currentStep < 2}
        summary={logisticsSummary} onEdit={() => setCurrentStep(2)}
      >
        <Text style={f.sectionSubtitle}>Collection method</Text>
        {COLLECTION_OPTIONS.map((opt) => (
          <RadioCard
            key={opt.key} label={opt.label} desc={opt.desc} price={opt.price}
            selected={collectionMethod === opt.key}
            onPress={() => setCollectionMethod(opt.key)}
          />
        ))}

        <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>Delivery method</Text>
        {DELIVERY_OPTIONS.map((opt) => (
          <RadioCard
            key={opt.key} label={opt.label} desc={opt.desc} price={opt.price}
            selected={deliveryMethod === opt.key}
            onPress={() => setDeliveryMethod(opt.key)}
          />
        ))}

        <Text style={[f.sectionSubtitle, { marginTop: Spacing.base }]}>Collection city</Text>
        <TouchableOpacity style={f.selectBtn} onPress={() => setShowCollPicker(true)} activeOpacity={0.75}>
          <Text style={collectionCity ? f.selectValue : f.selectPlaceholder}>
            {collectionCity
              ? `${collectionCity}${collectionCityDate ? ` · ${formatDateShort(collectionCityDate)}` : ''}`
              : 'Select collection city'}
          </Text>
          <ChevronDown size={16} color={Colors.text.tertiary} />
        </TouchableOpacity>

        <Text style={[f.sectionSubtitle, { marginTop: Spacing.sm }]}>Drop-off city</Text>
        <TouchableOpacity style={f.selectBtn} onPress={() => setShowDropPicker(true)} activeOpacity={0.75}>
          <Text style={dropoffCity ? f.selectValue : f.selectPlaceholder}>
            {dropoffCity
              ? `${dropoffCity}${dropoffCityDate ? ` · ${formatDateShort(dropoffCityDate)}` : ''}`
              : 'Select drop-off city'}
          </Text>
          <ChevronDown size={16} color={Colors.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[f.continueBtn, !step2Valid && f.continueBtnDisabled]}
          onPress={() => step2Valid && setCurrentStep(3)}
          activeOpacity={0.85}
          disabled={!step2Valid}
        >
          <Text style={f.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
      </StepCard>

      {/* ════════════════════════════════════════════════
          Step 3 — Package
      ════════════════════════════════════════════════ */}
      <StepCard
        stepNum={3} title="Package"
        isActive={currentStep === 3} isCompleted={currentStep > 3} isLocked={currentStep < 3}
        summary={packageSummary} onEdit={() => setCurrentStep(3)}
      >
        {/* Weight */}
        <Text style={f.fieldLabel}>Declared weight (kg)</Text>
        <View style={f.weightRow}>
          <TextInput
            style={[f.input, f.weightInput]}
            placeholder="0.0" keyboardType="decimal-pad"
            placeholderTextColor={Colors.text.tertiary}
            value={weight} onChangeText={setWeight}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={f.weightChips}>
            {WEIGHT_CHIPS.map((w) => (
              <TouchableOpacity
                key={w} style={f.weightChip}
                onPress={() => setWeight(String(w))} activeOpacity={0.75}
              >
                <Text style={f.weightChipText}>~{w} kg</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <Text style={f.fieldNote}>Final weight confirmed at collection.</Text>

        {/* Package type */}
        <Text style={[f.fieldLabel, { marginTop: Spacing.base }]}>Package type</Text>
        <View style={f.chipGrid}>
          {PACKAGE_TYPES.map((pt) => {
            const active = packageTypes.includes(pt.key);
            return (
              <TouchableOpacity
                key={pt.key}
                style={[f.typeChip, active && f.typeChipActive]}
                onPress={() => togglePackageType(pt.key)}
                activeOpacity={0.75}
              >
                <Text style={[f.typeChipText, active && f.typeChipTextActive]}>{pt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {packageTypes.includes('other') && (
          <TextInput
            style={[f.input, { marginTop: Spacing.sm }]}
            placeholder="Describe the item(s)…"
            placeholderTextColor={Colors.text.tertiary}
            value={otherDesc} onChangeText={setOtherDesc}
          />
        )}

        {/* Description */}
        <Text style={[f.fieldLabel, { marginTop: Spacing.base }]}>Description (optional)</Text>
        <TextInput
          style={[f.input, f.textArea]}
          placeholder="Any extra details about your package…"
          placeholderTextColor={Colors.text.tertiary}
          multiline numberOfLines={3}
          value={packageDesc} onChangeText={setPackageDesc}
        />

        {/* Photos */}
        <Text style={[f.fieldLabel, { marginTop: Spacing.base }]}>Package photos</Text>
        <View style={f.photoGrid}>
          {photos.map((uri, i) => (
            <View key={i} style={f.photoThumb}>
              <Image source={{ uri }} style={f.photoImg} />
              <TouchableOpacity
                style={f.photoRemove}
                onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
              >
                <X size={10} color={Colors.white} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={f.photoAdd} onPress={handleAddPhoto} activeOpacity={0.75}>
              <Plus size={20} color={Colors.text.tertiary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={f.fieldNote}>Up to 5 photos. Shared with driver only after booking is confirmed.</Text>

        <TouchableOpacity
          style={[f.continueBtn, !step3Valid && f.continueBtnDisabled]}
          onPress={() => step3Valid && setCurrentStep(4)}
          activeOpacity={0.85}
          disabled={!step3Valid}
        >
          <Text style={f.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
      </StepCard>

      {/* ════════════════════════════════════════════════
          Step 4 — Recipient
      ════════════════════════════════════════════════ */}
      <StepCard
        stepNum={4} title="Recipient"
        isActive={currentStep === 4} isCompleted={currentStep > 4} isLocked={currentStep < 4}
        summary={recipientSummary} onEdit={() => setCurrentStep(4)}
      >
        <View style={f.tooltip}>
          <Text style={f.tooltipText}>
            📬 This is the <Text style={f.tooltipBold}>destination contact</Text> — the person who will receive the package at the drop-off location.
          </Text>
        </View>

        <Text style={f.fieldLabel}>Full name</Text>
        <TextInput
          style={f.input} placeholder="Recipient's full name"
          placeholderTextColor={Colors.text.tertiary}
          value={recipientName} onChangeText={setRecipientName}
        />

        <Text style={f.fieldLabel}>Phone number</Text>
        <View style={f.phoneRow}>
          <CountryCodePicker value={recipientCC} onChange={setRecipientCC} />
          <TextInput
            style={[f.input, f.phoneInput]}
            placeholder="20 123 456"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="phone-pad"
            value={recipientPhone} onChangeText={setRecipientPhone}
          />
        </View>
        <View style={f.inlineToggle}>
          <Switch
            value={recipientPhoneIsWhatsapp} onValueChange={setRecipientPhoneIsWhatsapp}
            trackColor={{ false: Colors.border.medium, true: '#25D366' }}
            thumbColor={Colors.white} style={f.inlineToggleSwitch}
          />
          <Text style={f.inlineToggleLabel}>This is their WhatsApp number</Text>
        </View>

        {/* Delivery address */}
        <Text style={f.fieldLabel}>Delivery address <Text style={f.fieldLabelOpt}>(optional)</Text></Text>
        <TextInput
          style={f.input}
          placeholder="Street, apartment…"
          placeholderTextColor={Colors.text.tertiary}
          value={recipientAddrLine1}
          onChangeText={setRecipientAddrLine1}
        />
        <TextInput
          style={f.input}
          placeholder="City, postal code"
          placeholderTextColor={Colors.text.tertiary}
          value={recipientAddrLine2}
          onChangeText={setRecipientAddrLine2}
        />

        {/* Drop-off city (read-only) */}
        <Text style={f.fieldLabel}>Drop-off city</Text>
        <View style={f.readOnlyInput}>
          <Text style={dropoffCity ? f.readOnlyValue : f.selectPlaceholder}>
            {dropoffCity || 'Set in logistics step'}
          </Text>
        </View>

        {/* Notes for driver */}
        <Text style={f.fieldLabel}>Notes for driver (optional)</Text>
        <TextInput
          style={[f.input, f.textArea]}
          placeholder={`e.g. "Call before arriving" · "Fragile items inside"`}
          placeholderTextColor={Colors.text.tertiary}
          multiline numberOfLines={3}
          value={driverNotes} onChangeText={setDriverNotes}
        />

        {/* Save recipient */}
        <View style={f.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={f.toggleLabel}>Save for next time</Text>
            <Text style={f.toggleDesc}>Save this recipient to your address book</Text>
          </View>
          <Switch
            value={saveRecipient} onValueChange={setSaveRecipient}
            trackColor={{ false: Colors.border.medium, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <TouchableOpacity
          style={[f.continueBtn, !step4Valid && f.continueBtnDisabled]}
          onPress={() => step4Valid && setCurrentStep(5)}
          activeOpacity={0.85}
          disabled={!step4Valid}
        >
          <Text style={f.continueBtnText}>Review & pay →</Text>
        </TouchableOpacity>
      </StepCard>

      {/* ════════════════════════════════════════════════
          Step 5 — Payment
      ════════════════════════════════════════════════ */}
      <StepCard
        stepNum={5} title="Payment"
        isActive={currentStep === 5} isCompleted={false} isLocked={currentStep < 5}
      >
        {([
          { key: 'card',   label: '💳  Credit / Debit card' },
          { key: 'paypal', label: '🅿️  PayPal' },
          { key: 'cash',   label: '💵  Cash to driver' },
        ] as { key: PaymentMethod; label: string }[]).map((pm) => (
          <TouchableOpacity
            key={pm.key}
            style={[f.radioCard, paymentMethod === pm.key && f.radioCardActive]}
            onPress={() => setPaymentMethod(pm.key)}
            activeOpacity={0.75}
          >
            <View style={f.radioRow}>
              <View style={[f.radio, paymentMethod === pm.key && f.radioActive]}>
                {paymentMethod === pm.key && <View style={f.radioInner} />}
              </View>
              <Text style={f.radioLabel}>{pm.label}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {paymentMethod === 'card' && (
          <View style={f.stripeBlock}>
            <Text style={f.stripeNote}>Secure payment powered by Stripe</Text>
            <View style={f.stripePlaceholder}>
              <CreditCard size={18} color={Colors.text.tertiary} strokeWidth={1.5} />
              <Text style={f.stripePlaceholderText}>Card number  ·  MM/YY  ·  CVC</Text>
            </View>
          </View>
        )}

        <View style={f.escrowNote}>
          <Lock size={13} color={Colors.text.secondary} strokeWidth={2} />
          <Text style={f.escrowText}>
            Escrow protection — Payment released only on confirmed delivery (coming soon)
          </Text>
        </View>

        <TouchableOpacity
          style={[f.payBtn, isSubmitting && f.payBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={f.payBtnText}>Confirm & pay →</Text>
          }
        </TouchableOpacity>
      </StepCard>

      <View style={{ height: Spacing['2xl'] }} />
    </ScrollView>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={bk.root}>
      {/* Header */}
      <View style={bk.header}>
        <TouchableOpacity onPress={() => currentStep > 1 ? setCurrentStep((s) => s - 1) : router.back()} style={bk.backBtn}>
          <Text style={bk.backText}>‹</Text>
        </TouchableOpacity>
        <View style={bk.headerCenter}>
          <Text style={bk.headerTitle}>Book shipment</Text>
          {route && (
            <Text style={bk.headerRoute}>{route.origin_city} → {route.destination_city}</Text>
          )}
        </View>
      </View>

      {isWide ? (
        /* ── Wide: form + summary sidebar ─────────────── */
        <View style={bk.wideBody}>
          <View style={bk.formArea}>{formContent}</View>
          <View style={bk.summaryArea}>
            <OrderSummary
              route={route}
              collectionCity={collectionCity}
              dropoffCity={dropoffCity}
              collectionCityDate={collectionCityDate}
              dropoffCityDate={dropoffCityDate}
              weightKg={weightNum}
              collectionMethod={collectionMethod}
              deliveryMethod={deliveryMethod}
            />
          </View>
        </View>
      ) : (
        /* ── Mobile: form + bottom summary bar ─────────── */
        <View style={{ flex: 1 }}>
          {formContent}
          {weightNum > 0 && route && (
            <View style={bk.mobileSummaryBar}>
              <View>
                <Text style={bk.mobileSummaryTotal}>€{total.toFixed(2)}</Text>
                <Text style={bk.mobileSummaryLabel}>
                  {weightNum} kg · {route.origin_city} → {route.destination_city}
                </Text>
              </View>
              {currentStep < 5 && (
                <TouchableOpacity
                  style={bk.mobileSummaryBtn}
                  onPress={() => setCurrentStep((s) => Math.min(s + 1, 5))}
                  activeOpacity={0.85}
                >
                  <Text style={bk.mobileSummaryBtnText}>Continue →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* City picker modals */}
      <CityPickerModal
        visible={showCollPicker}
        title="Select collection city"
        options={pickupOptions}
        onSelect={(city, date) => { setCollectionCity(city); setCollectionCityDate(date); }}
        onClose={() => setShowCollPicker(false)}
      />
      <CityPickerModal
        visible={showDropPicker}
        title="Select drop-off city"
        options={dropoffOptions}
        onSelect={(city, date) => { setDropoffCity(city); setDropoffCityDate(date); }}
        onClose={() => setShowDropPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Booking screen layout
const bk = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: 28, color: Colors.text.primary, lineHeight: 32 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  headerRoute: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  wideBody:   { flex: 1, flexDirection: 'row' },
  formArea:   { flex: 2 },
  summaryArea: { flex: 1, borderLeftWidth: 1, borderLeftColor: Colors.border.light },
  mobileSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  mobileSummaryTotal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text.primary },
  mobileSummaryLabel: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },
  mobileSummaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  mobileSummaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
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
  scrollContent: { paddingBottom: Spacing.xl },

  // Tooltip
  tooltip: {
    backgroundColor: 'rgba(39,110,241,0.08)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tooltipText: { fontSize: FontSize.sm, color: Colors.secondary, lineHeight: 20 },
  tooltipBold: { fontWeight: '700' },

  // Inline WhatsApp toggle
  inlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  inlineToggleSwitch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  inlineToggleLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '500' },

  // Tabs
  tabRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.base },
  tab: {
    flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary, alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText:   { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary, textAlign: 'center' },
  tabTextActive: { color: Colors.white },

  // Read-only field
  readOnlyLabel: { fontSize: FontSize.sm, color: Colors.text.secondary },
  readOnlyValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  readOnlyInput: {
    height: 44, borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md, backgroundColor: Colors.background.tertiary,
    paddingHorizontal: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.sm,
  },

  // Fields
  fieldGroup: { gap: Spacing.xs, marginBottom: Spacing.sm },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.secondary, marginTop: Spacing.sm, marginBottom: 4 },
  sectionSubtitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.sm },
  input: {
    height: 44, borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md, backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm, fontSize: FontSize.base, color: Colors.text.primary,
    marginBottom: Spacing.xs,
    ...Platform.select({ web: { outlineWidth: 0 } as any }),
  },
  textArea: { height: 88, textAlignVertical: 'top', paddingTop: Spacing.sm },
  twoCol:   { flexDirection: 'row', gap: Spacing.sm },
  twoColLeft: { flex: 1 },
  twoColRight: { flex: 2 },
  phoneRow:  { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.xs },
  phoneInput: { flex: 1, marginBottom: 0 },

  // Select button
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md, backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm, marginBottom: Spacing.xs,
  },
  selectValue:       { fontSize: FontSize.base, color: Colors.text.primary, fontWeight: '500' },
  selectPlaceholder: { fontSize: FontSize.base, color: Colors.text.tertiary },

  // Privacy note
  privacyNote: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginVertical: Spacing.sm },
  fieldNote:   { fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: Spacing.sm },

  // Continue button
  continueBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  continueBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
  continueBtnDisabled: { opacity: 0.35 },

  // Weight
  weightRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  weightInput: { width: 90, marginBottom: 0 },
  weightChips: { flexDirection: 'row', gap: Spacing.xs },
  weightChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  weightChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text.secondary },

  // Package type chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText:   { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text.secondary },
  typeChipTextActive: { color: Colors.white, fontWeight: '700' },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xs },
  photoThumb: {
    width: 72, height: 72, borderRadius: BorderRadius.md,
    overflow: 'hidden', position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 72, height: 72, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border.medium,
    borderStyle: 'dashed', backgroundColor: Colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Radio card
  radioCard: {
    borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, backgroundColor: Colors.background.secondary,
  },
  radioCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  radioRow:  { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  radioTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: Colors.border.medium, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  radioActive: { borderColor: Colors.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  radioLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.primary, flex: 1 },
  radioDesc:  { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  radioPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.tertiary },
  radioPriceActive: { color: Colors.primary },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border.light,
    marginTop: Spacing.sm,
  },
  toggleLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  toggleDesc:  { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 2 },

  // Stripe
  stripeBlock: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    marginTop: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  stripeNote: { fontSize: FontSize.xs, color: Colors.text.secondary, fontWeight: '500' },
  stripePlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    height: 44, borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white,
  },
  stripePlaceholderText: { fontSize: FontSize.sm, color: Colors.text.tertiary },

  // Escrow
  escrowNote: {
    flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start',
    marginTop: Spacing.sm, marginBottom: Spacing.base,
  },
  escrowText: { flex: 1, fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },

  // Pay button
  payBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  payBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '800' },
  payBtnDisabled: { opacity: 0.5 },
});

// Country / city picker
const pk = StyleSheet.create({
  ccBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, height: 44,
    borderWidth: 1, borderColor: Colors.border.light,
    borderRadius: BorderRadius.md, backgroundColor: Colors.background.secondary,
  },
  ccBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.primary },
  overlay: {
    flex: 1, backgroundColor: Colors.overlay,
    justifyContent: 'center', alignItems: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    width: '100%', maxWidth: 360,
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.base, maxHeight: 400,
  },
  sheetTitle: {
    fontSize: FontSize.base, fontWeight: '800',
    color: Colors.text.primary, marginBottom: Spacing.md,
  },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.light,
  },
  itemActive: { backgroundColor: Colors.primaryLight },
  itemName:   { fontSize: FontSize.base, color: Colors.text.primary },
  itemCode:   { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '600' },
});
