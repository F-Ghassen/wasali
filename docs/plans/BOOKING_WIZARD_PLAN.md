# Booking Wizard Plan — End-to-End

_Date: 2026-03-19 | Status: Awaiting approval_

---

## Audit Summary

### Existing files — what they do today

| File | Lines | useState | What it does | Supabase connected? | Issues / gaps |
|---|---|---|---|---|---|
| `app/(tabs)/booking/index.tsx` | 501 | 5 | Accordion wizard shell, fetches services & payment methods, builds pickupOptions/dropoffOptions, calls `useBookingForm`, delegates to step components | ✅ route_services, route_payment_methods, recipients fetches | Step order wrong (Logistics before Sender), no itinerary step, city chosen by chips (no stop ID captured), no draft persistence, no loading/guard state |
| `components/booking/OrderSummary.tsx` | 171 | 0 | Summary sidebar with route info, service prices, weight × rate | ❌ all props passed in | Service labels hardcoded; no platform fee line; no collection/dropoff stop dates |
| `stores/bookingStore.ts` | 220 | 0 | Zustand store: holds selectedRoute, draft (44 fields), computePrice, submitBooking | ✅ bookings INSERT | No stop IDs in draft; price_eur wrong field name for total; sender_name/phone missing from insert |
| `hooks/useBookingForm.ts` | 171 | 0 | useReducer managing 50 form fields, stepValidity per step, buildSubmitPayload | ❌ pure UI state | Step numbers 1–5 don't match new 0–5 spec; no itinerary/stop state; no AsyncStorage; stops tracked as city strings not UUIDs |
| `components/booking/LogisticsStep.tsx` | 338 | 0 | Collection/dropoff city chips + service radio cards | ❌ | City chips from route_stops — correct approach, but no estimated_collection_date picker; step-0 itinerary now separate |
| `components/booking/SenderStep.tsx` | 306 | 1 | Toggle own/behalf, address fields, WhatsApp | ❌ | Address section always visible regardless of collection method; city picker modal exists but unused |
| `components/booking/RecipientStep.tsx` | 311 | 1 | Recipient fields, saved recipients chips, address | ❌ | Address label doesn't adapt to delivery method; no drop-off stop location display |
| `components/booking/PackageStep.tsx` | 260 | 0 | Weight, package types, photos | ❌ | **DO NOT MODIFY** |
| `components/booking/PaymentStep.tsx` | 148 | 0 | Radio cards for payment methods | ✅ reads route_payment_methods | No "coming soon" badges; no escrow info banner |
| `components/ui/PhoneInput.tsx` | 181 | 1 | Country code picker + phone input | — | Exists and usable |
| `components/ui/AddressFields.tsx` | 114 | 0 | Street / city / postal code | — | Exists and usable |
| `app/(tabs)/booking/confirmation.tsx` | 231 | 0 | Animated check, booking reference, summary card | ❌ hardcoded | No WhatsApp button; summary uses generic fields not stop-specific data |

### Current DB schema gaps vs requirements

**route_stops** — currently has: `id, city, country, arrival_date, is_pickup_available, is_dropoff_available, meeting_point_url, route_id, stop_order, stop_type`
- Missing: `location_name text`, `location_address text`, `stop_date date` (arrival_date serves this role but should be explicit), `city_id uuid FK cities`

**route_services** — currently has: `id, route_id, service_type, price_eur, location_name, location_address, instructions, created_at`
- Missing: `route_stop_id uuid FK route_stops NULLABLE` (null = country-wide delivery, set = city-specific collection)

**bookings** — currently has most fields but missing: `collection_stop_id`, `dropoff_stop_id`, `sender_name`, `sender_phone`, `sender_whatsapp`, `recipient_whatsapp`

---

## a. Data Flow Diagram

```
RouteCard → user taps "Book slot →"
  └─ router.push('/booking', { route_id, [context params: driver name, cities, date] })

BookingScreen mounts
  ├─ Show route context bar immediately (from nav params)
  ├─ Show skeleton below
  └─ useRouteData(routeId) → parallel Supabase fetches:
       ├─ Route + stops + services + payment_methods
       ├─ User profile (sender pre-fill)
       └─ Saved recipients
            │
            ▼
       Check AsyncStorage key "booking_draft_{routeId}"
       │                    │
       Draft found          No draft
       ▼                    ▼
       Prompt: Continue     Open Step 0
       or start fresh?

Step 0 — Itinerary ────────────────────────────────────────────────────────────
  User picks collectionStop (from route_stops WHERE stop_type='collection')
  User picks dropoffStop    (from route_stops WHERE stop_type='dropoff')
  → form.collectionStopId, form.dropoffStopId set
  → Step 1 unlocked

Step 1 — Logistics ─────────────────────────────────────────────────────────────
  Collection services = route_services WHERE route_stop_id = collectionStop.id
  Delivery services   = route_services WHERE route_stop_id IS NULL
  User picks collectionServiceId, deliveryServiceId
  User picks estimated_collection_date (≤ stop_date)
  → Step 2 unlocked; if collectionMethod changes → reset sender address

Step 2 — Sender ─────────────────────────────────────────────────────────────────
  Own details (pre-filled from profile) OR behalf of someone
  Address shown only if driver_pickup selected
  → Step 3 unlocked

Step 3 — Recipient ──────────────────────────────────────────────────────────────
  Saved recipients chips → autofill
  Address required (label adapts to delivery method)
  If recipient_collects → show dropoff stop location + recipient address
  → Step 4 unlocked

Step 4 — Package ────────────────────────────────────────────────────────────────
  Existing PackageStep (unchanged) — weight, types, photos
  → Step 5 unlocked; total price updates in summary

Step 5 — Payment ────────────────────────────────────────────────────────────────
  Cash on collection (enabled) + coming-soon methods
  → Confirm button in OrderSummary becomes active

Confirm tapped ─────────────────────────────────────────────────────────────────
  Validate all steps → highlight first error
  INSERT bookings (all fields)
  IF saveRecipient → UPSERT recipients
  IF updateMyProfile → UPDATE profiles
  Clear AsyncStorage draft
  decrement_route_capacity(route_id, weight_kg) [existing RPC]
  → Navigate: /(tabs)/booking/confirmation?bookingId={id}

Confirmation screen ─────────────────────────────────────────────────────────────
  Animated check · Reference #BOOK-XXXXXXXX
  Summary card: stops, dates, package, services, recipient, payment, driver
  "Contact Driver on WhatsApp" deep link
  "View My Bookings" | "Back to Search"
```

---

## b. Schema Changes — Migration 018

**File: `supabase/migrations/018_booking_wizard.sql`**

```sql
-- ─── 1. route_stops — add location fields + city FK ─────────────────────────

ALTER TABLE route_stops
  ADD COLUMN IF NOT EXISTS location_name    text,
  ADD COLUMN IF NOT EXISTS location_address text,
  -- stop_date mirrors arrival_date but is the canonical booking-facing field
  ADD COLUMN IF NOT EXISTS stop_date        date
    GENERATED ALWAYS AS (arrival_date::date) STORED,
  ADD COLUMN IF NOT EXISTS city_id          uuid
    REFERENCES cities(id) ON DELETE SET NULL;

-- stop_type values: 'collection' | 'dropoff'
-- is_pickup_available / is_dropoff_available kept for backwards compat

-- ─── 2. route_services — add route_stop_id FK ───────────────────────────────

ALTER TABLE route_services
  ADD COLUMN IF NOT EXISTS route_stop_id uuid
    REFERENCES route_stops(id) ON DELETE CASCADE;

-- NULL route_stop_id = country-wide delivery service
-- Non-NULL route_stop_id = city-specific collection service

CREATE INDEX IF NOT EXISTS route_services_stop_idx
  ON route_services (route_stop_id);
CREATE INDEX IF NOT EXISTS route_services_route_null_stop_idx
  ON route_services (route_id) WHERE route_stop_id IS NULL;

-- ─── 3. bookings — add missing columns ──────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS collection_stop_id uuid
    REFERENCES route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_stop_id    uuid
    REFERENCES route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_name        text,
  ADD COLUMN IF NOT EXISTS sender_phone       text,
  ADD COLUMN IF NOT EXISTS sender_whatsapp    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recipient_whatsapp boolean NOT NULL DEFAULT false,
  -- total_price is the canonical computed total (weight × rate + surcharges)
  -- price_eur kept for backwards compat; new code writes both
  ADD COLUMN IF NOT EXISTS total_price        float;

-- Ensure status constraint covers all states
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_transit','delivered','rated','cancelled'));

-- Ensure payment_status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid','paid','captured','refunded','failed'));

-- ─── 4. recipients — ensure table + all columns exist ───────────────────────

CREATE TABLE IF NOT EXISTS recipients (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  phone               text        NOT NULL,
  whatsapp_enabled    boolean     NOT NULL DEFAULT false,
  address_street      text,
  address_city        text,
  address_postal_code text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipients_user_phone_key UNIQUE (user_id, phone)
);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipients_user_all" ON recipients;
CREATE POLICY "recipients_user_all" ON recipients
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 5. RLS policies for new booking columns ────────────────────────────────
-- Existing bookings RLS covers the new columns automatically
-- (policies are row-level, not column-level in Postgres)

-- ─── 6. Useful indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bookings_collection_stop_idx ON bookings (collection_stop_id);
CREATE INDEX IF NOT EXISTS bookings_dropoff_stop_idx    ON bookings (dropoff_stop_id);
CREATE INDEX IF NOT EXISTS route_stops_route_type_idx
  ON route_stops (route_id, stop_type, stop_order);
```

---

## c. Supabase Query Spec

### On wizard mount — fetch everything in parallel

```typescript
// 1. Route + stops + services + payment methods
const { data: routeData } = await supabase
  .from('routes')
  .select(`
    id, origin_city, origin_country, destination_city, destination_country,
    departure_date, estimated_arrival_date,
    available_weight_kg, price_per_kg_eur,
    promotion_percentage, promotion_active,
    driver:profiles!driver_id(
      id, full_name, phone, phone_verified, rating, completed_trips
    ),
    route_stops(
      id, city, country, arrival_date, stop_date, stop_type, stop_order,
      location_name, location_address, is_pickup_available, is_dropoff_available
    ),
    route_services(
      id, route_stop_id, service_type, price_eur,
      location_name, location_address, instructions
    ),
    route_payment_methods(id, payment_type, enabled)
  `)
  .eq('id', routeId)
  .single();

// 2. User profile (for sender pre-fill)
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, phone')
  .eq('id', userId)
  .single();

// 3. Saved recipients
const { data: recipients } = await supabase
  .from('recipients')
  .select('id, name, phone, whatsapp_enabled, address_street, address_city, address_postal_code')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20);
```

### TypeScript interfaces for fetched data

```typescript
interface FetchedStop {
  id: string;
  city: string;
  country: string;
  arrival_date: string | null;
  stop_date: string | null;       // generated column (arrival_date::date)
  stop_type: 'collection' | 'dropoff' | string;
  stop_order: number;
  location_name: string | null;
  location_address: string | null;
  is_pickup_available: boolean;
  is_dropoff_available: boolean;
}

interface FetchedService {
  id: string;
  route_stop_id: string | null;   // null = delivery; set = collection
  service_type: 'sender_dropoff' | 'driver_pickup' | 'recipient_collects' | 'driver_delivery' | 'local_post';
  price_eur: number;
  location_name: string | null;
  location_address: string | null;
  instructions: string | null;
}

interface FetchedPaymentMethod {
  id: string;
  payment_type: 'cash_on_collection' | 'cash_on_delivery' | 'credit_debit_card' | 'paypal';
  enabled: boolean;
}

interface FetchedRoute {
  id: string;
  origin_city: string; origin_country: string;
  destination_city: string; destination_country: string;
  departure_date: string;
  estimated_arrival_date: string | null;
  available_weight_kg: number;
  price_per_kg_eur: number;
  promotion_percentage: number | null;
  promotion_active: boolean;
  driver: { id: string; full_name: string | null; phone: string | null; phone_verified: boolean; rating: number; completed_trips: number; } | null;
  route_stops: FetchedStop[];
  route_services: FetchedService[];
  route_payment_methods: FetchedPaymentMethod[];
}
```

### Route guard checks (after fetch)

```typescript
// Route not found
if (!routeData) → show error "Route not found" + back button

// Route full
if (routeData.available_weight_kg <= 0) → show "Route is full" + back button

// Route departed
if (new Date(routeData.departure_date) < startOfDay(new Date())) → show "Route has departed" + back button
```

### Insert booking

```typescript
const { data: booking, error } = await supabase
  .from('bookings')
  .insert({
    route_id:                      routeId,
    sender_id:                     senderId,
    collection_stop_id:            form.collectionStopId,
    dropoff_stop_id:               form.dropoffStopId,
    collection_service_id:         form.collectionServiceId,
    delivery_service_id:           form.deliveryServiceId,
    estimated_collection_date:     form.estimatedCollectionDate,   // ISO date
    sender_name:                   form.senderName,
    sender_phone:                  form.senderFullPhone,            // CC + number
    sender_whatsapp:               form.senderWhatsapp,
    sender_address_street:         form.senderAddressStreet || null,
    sender_address_city:           form.senderAddressCity || null,
    sender_address_postal_code:    form.senderAddressPostalCode || null,
    recipient_name:                form.recipientName,
    recipient_phone:               form.recipientFullPhone,
    recipient_whatsapp:            form.recipientWhatsapp,
    recipient_address_street:      form.recipientAddressStreet,
    recipient_address_city:        form.recipientAddressCity,
    recipient_address_postal_code: form.recipientAddressPostalCode,
    package_weight_kg:             form.weightKg,
    package_category:              form.packageTypes[0] ?? 'general',
    package_photos:                form.photos,
    driver_notes:                  form.driverNotes || null,
    payment_type:                  form.paymentType,   // 'cash_on_collection'
    price_eur:                     totalPrice,
    total_price:                   totalPrice,
    status:                        'pending',
    payment_status:                'unpaid',
    pickup_type:                   collectionService?.service_type ?? 'sender_dropoff',
    dropoff_type:                  deliveryService?.service_type ?? 'recipient_collects',
  })
  .select('id')
  .single();
```

### Upsert recipient (when saveRecipient toggled)

```typescript
await supabase.from('recipients').upsert({
  user_id:             senderId,
  name:                form.recipientName,
  phone:               form.recipientFullPhone,
  whatsapp_enabled:    form.recipientWhatsapp,
  address_street:      form.recipientAddressStreet || null,
  address_city:        form.recipientAddressCity || null,
  address_postal_code: form.recipientAddressPostalCode || null,
}, { onConflict: 'user_id,phone' });
```

### Update profile (when updateMyProfile toggled)

```typescript
await supabase.from('profiles').update({
  full_name: form.senderName,
  phone:     form.senderFullPhone,
}).eq('id', senderId);
```

---

## d. File-by-File Change List

### Existing files that change

| File | What changes | What stays |
|---|---|---|
| `app/(tabs)/booking/index.tsx` | Full rewrite: use `useRouteData`, new 6-step accordion (0–5), loading/guard state, AsyncStorage draft, route context bar, wide-screen sidebar | Colors, typography, spacing |
| `hooks/useBookingForm.ts` | Full rewrite: 6-step state (add itinerary fields: collectionStopId, dropoffStopId), new step order, AsyncStorage persistence, cascade reset logic, new computed values | useReducer pattern, SET/RESET actions |
| `stores/bookingStore.ts` | Slim down: remove computePrice (moves to hook), remove draft shape (managed by hook), keep `selectedRoute`, `submitBooking`, `isLoading`, `submitError`, `reset` | Supabase insert logic (updated payload) |
| `components/booking/LogisticsStep.tsx` | Replace city chips with read-only context from Step 0; add estimated_collection_date date picker; services now filtered by stop ID not city name | RadioCard component, styles |
| `components/booking/SenderStep.tsx` | Address section conditional on `collectionMethod === 'driver_pickup'`; show read-only drop-off point when `sender_dropoff`; add `sender_name` field (currently missing); fix city picker (remove unused modal) | PhoneInput usage, own/behalf toggle |
| `components/booking/RecipientStep.tsx` | Address section label adapts to delivery method; show drop-off stop location when `recipient_collects`; add `recipient_whatsapp` field sync; adapt info note per method | Saved recipients chips, PhoneInput |
| `components/booking/PaymentStep.tsx` | Add "coming soon" badge on card/PayPal options; add escrow info banner; read `route_payment_methods` to determine enabled methods | RadioCard layout |
| `components/booking/OrderSummary.tsx` | Accept `collectionStopLabel`, `dropoffStopLabel`, `collectionStopDate`, `dropoffStopDate` props; add "Platform service fee · Free" line item; remove any hardcoded surcharge values | All existing line items, layout, width handling |
| `app/(tabs)/booking/confirmation.tsx` | Add WhatsApp deep link button using driver phone; use `collection_stop` / `dropoff_stop` city names; read booking data from `bookingStore.lastBooking` (set after successful submit) + `bookingId` param for reference display — no re-fetch | Animation, reference display, summary card |
| `types/database.ts` | Add new bookings columns; add route_services.route_stop_id; add route_stops.location_name, location_address, stop_date, city_id | All existing type definitions |

### Existing files that do NOT change

| File | Reason |
|---|---|
| `components/booking/PackageStep.tsx` | **DO NOT MODIFY** — per spec |
| `components/ui/PhoneInput.tsx` | Already correct |
| `components/ui/AddressFields.tsx` | Already correct |
| `constants/colors.ts`, `spacing.ts`, `typography.ts` | **DO NOT CHANGE** |
| All other stores, hooks, screens | Unrelated |

---

## e. New Files to Create

### `hooks/useRouteData.ts`

**Purpose:** Fetch all route data needed for the wizard on mount. Handles loading, error, and guard states.

**Params:** `routeId: string | null`

**Returns:**
```typescript
{
  route: FetchedRoute | null;
  collectionStops: FetchedStop[];       // stop_type = 'collection', ordered by stop_order
  dropoffStops: FetchedStop[];          // stop_type = 'dropoff', ordered by stop_order
  collectionServicesForStop: (stopId: string) => FetchedService[];  // filter by route_stop_id
  deliveryServices: FetchedService[];   // route_stop_id IS NULL
  paymentMethods: FetchedPaymentMethod[];
  isLoading: boolean;
  error: 'not_found' | 'route_full' | 'route_departed' | 'network' | null;
  retry: () => void;
}
```

### `hooks/useSavedRecipients.ts`

**Purpose:** Fetch and manage saved recipients for the logged-in user.

**Params:** `userId: string | null`

**Returns:**
```typescript
{
  recipients: FetchedRecipient[];
  isLoading: boolean;
  upsertRecipient: (data: RecipientUpsert) => Promise<void>;
}
```

### `hooks/useBookingForm.ts` _(full rewrite)_

**Purpose:** Single source of truth for all 6 wizard steps. useReducer + AsyncStorage persistence.

**Params:** `routeId: string, profileName?: string, profilePhone?: string`

**Full state shape:** See §f below.

**Returns:**
```typescript
{
  state: BookingFormState;
  set: (payload: Partial<BookingFormState>) => void;
  reset: () => void;
  stepValidity: Record<0 | 1 | 2 | 3 | 4 | 5, boolean>;
  totalPrice: number;        // computed: weight × rate + collection surcharge + delivery surcharge
  buildSubmitPayload: (senderId: string, route: FetchedRoute) => BookingInsert;
  hasDraft: boolean;
  clearDraft: () => void;
}
```

### `components/booking/ItineraryStep.tsx`

**Purpose:** Step 0 — pick collection stop + drop-off stop.

**Props:**
```typescript
{
  collectionStops: FetchedStop[];
  dropoffStops: FetchedStop[];
  selectedCollectionStopId: string | null;
  selectedDropoffStopId: string | null;
  onSelectCollection: (stop: FetchedStop) => void;
  onSelectDropoff: (stop: FetchedStop) => void;
  isValid: boolean;
  onContinue: () => void;
}
```

**Renders:** Two `StopRadioCard` sections. Each card shows: city, date, location_name, location_address.

### `components/booking/LogisticsStep.tsx` _(rewrite)_

**Purpose:** Step 1 — collection method + delivery method + estimated collection date.

**Props:**
```typescript
{
  collectionStop: FetchedStop;          // selected from Step 0
  dropoffStop: FetchedStop;             // selected from Step 0
  collectionServices: FetchedService[]; // filtered for collectionStop.id
  deliveryServices: FetchedService[];   // route_stop_id IS NULL
  selectedCollectionServiceId: string | null;
  selectedDeliveryServiceId: string | null;
  dropoffStopLocation: string | null;   // for recipient_collects display
  estimatedCollectionDate: string;      // ISO date
  maxCollectionDate: string;            // collectionStop.stop_date
  onSelectCollection: (id: string) => void;
  onSelectDelivery: (id: string) => void;
  onDateChange: (date: string) => void;
  isValid: boolean;
  onContinue: () => void;
}
```

### `components/ui/ServiceOption.tsx`

**Purpose:** Reusable radio card for a single route service option.

**Props:**
```typescript
{
  serviceType: string;
  price: number;
  locationName: string | null;
  locationAddress: string | null;
  instructions: string | null;
  selected: boolean;
  readOnly?: boolean;         // auto-selected (single option)
  onPress: () => void;
}
```

### `components/ui/PaymentOption.tsx`

**Purpose:** Reusable radio card for a payment method with optional "coming soon" badge.

**Props:**
```typescript
{
  type: 'cash_on_collection' | 'credit_debit_card' | 'paypal' | string;
  selected: boolean;
  comingSoon?: boolean;
  onPress: () => void;
}
```

---

## f. State Management Spec

### Full `BookingFormState` shape

```typescript
interface BookingFormState {
  // ── Step 0: Itinerary ──────────────────────────────────────────────────────
  collectionStopId:   string | null;
  collectionStopCity: string;          // denormalised for display
  collectionStopDate: string;          // ISO date
  collectionStopLocationName:    string | null;
  collectionStopLocationAddress: string | null;
  dropoffStopId:      string | null;
  dropoffStopCity:    string;
  dropoffStopDate:    string;
  dropoffStopLocationName:    string | null;
  dropoffStopLocationAddress: string | null;

  // ── Step 1: Logistics ──────────────────────────────────────────────────────
  collectionServiceId:    string | null;
  collectionServiceType:  string | null;   // 'sender_dropoff' | 'driver_pickup'
  collectionServicePrice: number;
  deliveryServiceId:      string | null;
  deliveryServiceType:    string | null;   // 'recipient_collects' | 'driver_delivery' | 'local_post'
  deliveryServicePrice:   number;
  estimatedCollectionDate: string;         // ISO date, default = stop_date - 1 day

  // ── Step 2: Sender ─────────────────────────────────────────────────────────
  senderMode:             'own' | 'behalf';
  senderName:             string;
  senderCC:               string;          // e.g. '+49'
  senderPhone:            string;
  senderWhatsapp:         boolean;
  updateMyProfile:        boolean;
  behalfName:             string;
  behalfCC:               string;
  behalfPhone:            string;
  behalfWhatsapp:         boolean;
  saveBehalfToContacts:   boolean;
  senderAddressStreet:    string;          // only if driver_pickup
  senderAddressCity:      string;
  senderAddressPostalCode: string;

  // ── Step 3: Recipient ──────────────────────────────────────────────────────
  recipientName:               string;
  recipientCC:                 string;
  recipientPhone:              string;
  recipientWhatsapp:           boolean;
  recipientAddressStreet:      string;
  recipientAddressCity:        string;
  recipientAddressPostalCode:  string;
  saveRecipient:               boolean;
  driverNotes:                 string;

  // ── Step 4: Package ────────────────────────────────────────────────────────
  weight:       string;            // string for text input
  packageTypes: string[];
  otherDesc:    string;
  packageDesc:  string;
  photos:       string[];

  // ── Step 5: Payment ────────────────────────────────────────────────────────
  paymentType: 'cash_on_collection' | 'cash_on_delivery' | 'credit_debit_card' | 'paypal';
}
```

### Action types

```typescript
type Action =
  | { type: 'SET'; payload: Partial<BookingFormState> }
  | { type: 'RESET' }
  | { type: 'RESET_LOGISTICS' }           // Step 0 changed → clear Step 1 selections
  | { type: 'RESET_SENDER_ADDRESS' }      // collection method changed → clear sender address
  | { type: 'LOAD_DRAFT'; state: BookingFormState };
```

### Step validity rules

```typescript
stepValidity = {
  0: !!collectionStopId && !!dropoffStopId,
  1: !!collectionServiceId && !!deliveryServiceId && !!estimatedCollectionDate,
  2: (senderMode === 'own'
       ? senderName.trim().length > 0 && senderPhone.trim().length >= 5
       : behalfName.trim().length > 0 && behalfPhone.trim().length >= 5)
     && (collectionServiceType !== 'driver_pickup'
       || (senderAddressStreet.trim().length > 0
         && senderAddressCity.trim().length > 0
         && senderAddressPostalCode.trim().length > 0)),
  3: recipientName.trim().length > 0
       && recipientPhone.trim().length >= 5
       && recipientAddressStreet.trim().length > 0
       && recipientAddressCity.trim().length > 0
       && recipientAddressPostalCode.trim().length > 0,
  4: parseFloat(weight) > 0 && packageTypes.length > 0,
  5: true,
};
```

### Computed values

```typescript
const effectiveRate = route.promotion_active && route.promotion_percentage
  ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
  : route.price_per_kg_eur;

const totalPrice = Math.round(
  ((parseFloat(weight) || 0) * effectiveRate
  + collectionServicePrice
  + deliveryServicePrice) * 100
) / 100;   // round to 2dp
```

### AsyncStorage persistence

- Key: `booking_draft_{routeId}`
- Persist on every `SET` action (debounced 500ms)
- Load on wizard mount, after route data is ready
- Clear on successful submit
- Discard if `routeId` doesn't match (stale draft from different route)

---

## g. Edge Cases

| Case | Handling |
|---|---|
| Route has only 1 collection stop | Auto-select in Step 0; show as read-only card, no radio indicator |
| Route has only 1 drop-off stop | Auto-select in Step 0; read-only |
| Route has only 1 collection service for selected stop | Auto-select in Step 1; show as read-only service option |
| Route has only 1 delivery service | Auto-select in Step 1; read-only |
| User changes collection stop after completing Step 1 | Dispatch `RESET_LOGISTICS` — clear collectionServiceId, deliveryServiceId (services differ per stop) |
| User changes collection method after completing Step 2 | Dispatch `RESET_SENDER_ADDRESS` — if switching away from driver_pickup, clear sender address fields |
| User changes delivery method after completing Step 3 | Re-show Step 3 with updated address label; don't clear address values |
| Draft resume — wrong route_id | `routeId !== draft.routeId` → silently discard draft, start fresh |
| Route becomes full between mount and submit | Supabase insert fails or `decrement_route_capacity` returns error → show "Route just became full" + back |
| Driver deletes route between mount and submit | Supabase insert returns FK violation → show "Route no longer available" + back |
| Network error on submit | Show retry button; form state preserved; prevent double-submit via `isSubmitting` flag |
| `recipient_collects` selected | In Step 1: show drop-off stop location_name/address; in Step 3: show read-only pickup point + recipient address section |
| `sender_dropoff` selected | In Step 2: hide address fields; show read-only: "Drop off at: [collection stop location_name]" |
| No route_services for selected collection stop | Fall back to legacy `getServicesFromRoute()` helper (existing) |
| No route_payment_methods in DB | Render the launch default set (cash only + coming soon for rest) |
| `stop_date` generated column absent (older rows) | Fall back to `arrival_date`; guard with `?? ''` |
| Promo discount on route | Apply to `effectiveRate` in totalPrice computation; show strikethrough in summary |
| "On behalf of someone" — no saved contacts | Show empty state: "No saved contacts yet" with manual entry below |
| Estimated collection date = stop_date (same day) | Allowed; warn if past |
| Photos upload fails mid-submit | Continue with empty photos array; log warning |

---

## h. Dependency Order

Tasks to implement one at a time:

```
Task 1 — Migration 018
  File: supabase/migrations/018_booking_wizard.sql
  Blocks: everything below

Task 2 — Types update
  File: types/database.ts
  Add: route_stops.location_name/address/stop_date/city_id, route_services.route_stop_id,
       bookings new columns
  Depends on: Task 1

Task 3 — useRouteData hook
  File: hooks/useRouteData.ts (new)
  Parallel fetches, guard logic, collectionServicesForStop helper
  Depends on: Task 2

Task 4 — useBookingForm hook rewrite
  File: hooks/useBookingForm.ts
  New state shape, 6 steps, RESET_LOGISTICS/RESET_SENDER_ADDRESS actions,
  AsyncStorage persistence, totalPrice computed, buildSubmitPayload
  Depends on: Task 2

Task 5 — useSavedRecipients hook
  File: hooks/useSavedRecipients.ts (new)
  Depends on: Task 2

Task 6 — ServiceOption component
  File: components/ui/ServiceOption.tsx (new)
  Depends on: nothing

Task 7 — PaymentOption component
  File: components/ui/PaymentOption.tsx (new)
  Depends on: nothing

Task 8 — ItineraryStep component
  File: components/booking/ItineraryStep.tsx (new)
  Depends on: Task 3

Task 9 — LogisticsStep rewrite
  File: components/booking/LogisticsStep.tsx
  Depends on: Task 6, Task 4

Task 10 — SenderStep update
  File: components/booking/SenderStep.tsx
  Depends on: Task 4

Task 11 — RecipientStep update
  File: components/booking/RecipientStep.tsx
  Depends on: Task 4, Task 5

Task 12 — PaymentStep update
  File: components/booking/PaymentStep.tsx
  Depends on: Task 7

Task 13 — OrderSummary update
  File: components/booking/OrderSummary.tsx
  Add props, platform fee line, stop dates
  Depends on: Task 4

Task 14 — bookingStore update
  File: stores/bookingStore.ts
  Updated submitBooking payload (new columns)
  Depends on: Task 4

Task 15 — booking/index.tsx rewrite
  File: app/(tabs)/booking/index.tsx
  Wire all hooks + components, 6-step accordion, loading/guard, draft resume prompt
  Depends on: Tasks 3, 4, 5, 8–13

Task 16 — confirmation.tsx update
  File: app/(tabs)/booking/confirmation.tsx
  WhatsApp button, stop city names, driver phone
  Depends on: Task 15
```

---

## Verification Checklist

After all tasks complete:

1. `npx expo start` — 0 TypeScript errors
2. Tap "Book" on RouteCard → wizard opens, route context bar shows immediately
3. Route with 1 collection stop → auto-selected, read-only in Step 0
4. Select collection stop → Step 1 shows only services for that stop
5. `recipient_collects` → Step 3 shows drop-off stop address read-only
6. `driver_pickup` → Step 2 shows sender address fields
7. `sender_dropoff` → Step 2 shows "Drop off at: [location]" read-only
8. Kill app mid-wizard → resume prompt on next open
9. Change collection stop after completing logistics → logistics reset
10. Total price updates live: weight × rate + collection surcharge + delivery surcharge
11. Confirm → bookings row in Supabase with all new columns populated
12. Confirmation screen shows driver WhatsApp link
13. Route full guard → shown before wizard loads
14. Network error on submit → retry button, no double insert
