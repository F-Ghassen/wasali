# Booking Summary Component

A **standalone, reusable component** for calculating and displaying booking costs. Used in:
- Booking creation flow (step 5: Payment)
- Route detail screen (before "Book" button)
- Booking review/confirmation screen

---

## Component Design

### Default State (Collapsed)
```
┌─────────────────────────────────────────────────────────────┐
│ BOOKING SUMMARY                          [▼ Show Details] │
├─────────────────────────────────────────────────────────────┤
│ Weight: ____ kg  ×  €2.80/kg  =  €0.00                    │
│                                                            │
│ [PROCEED TO PAYMENT →]                                   │
└─────────────────────────────────────────────────────────────┘
```

### Expanded State (Full Details)
```
┌─────────────────────────────────────────────────────────────┐
│ BOOKING SUMMARY                          [▲ Hide Details]  │
├─────────────────────────────────────────────────────────────┤
│ BASE COST                                                 │
│   Weight:  ____ kg                                        │
│   Price:   €2.80/kg                                       │
│   Subtotal:                                   €0.00      │
│                                                            │
│ DISCOUNTS & PROMOS                                        │
│   ✓ Route Promotion (20% OFF)             -€0.00 (12d)  │
│   ✓ Volume Discount (5kg+)                -€0.00         │
│                                                            │
│ ADD-ONS & SERVICES                                        │
│   ☐ Insurance (+2%)                       [add]          │
│   ☐ Home Delivery (+€5)                   [add]          │
│   ☐ Cold Storage (+3%)                    [add]          │
│                                                            │
│ ───────────────────────────────────────────────────────── │
│ TOTAL AMOUNT:                              €0.00         │
│                                                            │
│ Payment Method: [Select...]                              │
│                                                            │
│ [CONFIRM & PROCEED TO PAYMENT]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Props

```typescript
interface BookingSummaryProps {
  // Route data
  pricePerKg: number;
  promoPct?: number;
  promoExpiresAt?: string;
  availableWeight: number;
  minBookingKg?: number;
  maxSinglePackageKg?: number;
  
  // Booking data
  weightKg: number;
  onWeightChange: (weight: number) => void;
  
  // Services (from logistics_options)
  availableServices?: {
    id: string;
    name: string;
    type: 'percentage' | 'fixed';
    amount: number;
    label: string;
  }[];
  
  selectedServices?: string[]; // service IDs
  onServiceToggle: (serviceId: string) => void;
  
  // Payment
  selectedPaymentMethod?: string;
  onPaymentMethodChange: (method: string) => void;
  paymentMethods?: string[];
  
  // Actions
  onProceed: (summary: BookingSummary) => void;
  isLoading?: boolean;
  
  // Display
  mode?: 'compact' | 'expanded'; // collapsed by default
  showPaymentSelect?: boolean; // hide in detail view, show in payment step
}
```

---

## Calculations

### Price Breakdown

```typescript
interface BookingSummary {
  weightKg: number;
  pricePerKg: number;
  
  // Base
  subtotal: number; // weightKg * pricePerKg
  
  // Discounts
  promoDiscount: number; // if promo_active
  volumeDiscount: number; // tiered: 5kg=5%, 10kg=10%, etc.
  totalDiscounts: number;
  
  // Services
  services: {
    id: string;
    name: string;
    cost: number;
  }[];
  servicesCost: number;
  
  // Final
  total: number; // subtotal - discounts + services
  priceBreakdown: string; // "€0.00 - €0.00 (promo) + €0.00 (insurance) = €0.00"
}
```

### Example Calculation

```
Weight: 10 kg
Price: €2.80/kg

Base Cost:           10 × €2.80 = €28.00

Route Promo (20%):   €28.00 × -20% = -€5.60
Volume Discount:     €28.00 × -10% = -€2.80

Services:
  Insurance (+2%):   €28.00 × 2% = +€0.56
  
────────────────────────────────────────
TOTAL:              €28.00 - €5.60 - €2.80 + €0.56 = €20.16
```

---

## States & Interactions

### Weight Input
- ✅ Show real-time price calculation
- ✅ Validate min/max booking constraints
- ✅ Show warning if exceeds available weight
- ✅ Auto-format with thousands separator (€1,234.56)

### Service Selection
- ✅ Toggle services on/off
- ✅ Recalculate totals instantly
- ✅ Show cost per service
- ✅ Disable unavailable services (grayed out)

### Promo Display
- ✅ Show discount amount
- ✅ Show expiration countdown (if active)
- ✅ Use strikethrough for original price
- ✅ Highlight savings

### Payment Method
- ✅ Show available methods (from `payment_methods[]`)
- ✅ Required before proceeding
- ✅ Show fees per method if applicable
- ✅ Default to first method

### Error States
- ⚠️ Weight below minimum → "Min {min}kg required"
- ⚠️ Weight above maximum → "Max {max}kg available"
- ⚠️ Weight > available → "Only {available}kg left"
- ⚠️ Single package exceeds max → "Max {max}kg per package"

---

## Visual Hierarchy

### Expanded View (Full Details)
1. **Weight Input** (top, most prominent)
2. **Base Cost** (calculation)
3. **Discounts** (good news, highlighted)
4. **Add-ons** (optional, secondary)
5. **Total** (large, bold, color: primary)
6. **Payment Method** (required, before action)
7. **CTA Button** (full-width, primary color)

### Compact View (Collapsed)
- Single line: "Weight: {w} kg × €{p}/kg = €{total}"
- Expand toggle on right
- CTA button below

---

## Styling

### Colors
- Total amount: `Colors.primary` (large, bold)
- Discounts: `Colors.secondary` (green, positive)
- Add-ons: `Colors.primary` with lighter opacity
- Errors: `Colors.error` (red)
- Disabled services: `Colors.text.tertiary` (grayed)

### Typography
- Weight input: Heading size (user needs to see it)
- Cost breakdowns: Small, secondary color
- Total: 24px, weight 800, primary color
- CTA text: 16px, weight 700, white

### Spacing
- Sections: `Spacing.lg` gap between sections
- Rows within section: `Spacing.sm` gap
- Service toggle padding: `Spacing.md`

---

## Component Features

### Smart Defaults
- ✅ Collapse when mounted (unless `mode="expanded"`)
- ✅ Auto-expand when services available
- ✅ Auto-expand in payment step
- ✅ Remember user's last weight input (localStorage)

### Accessibility
- ✅ Number input with step="0.1" (kg precision)
- ✅ Labels for all inputs
- ✅ Error messages in `aria-live` region
- ✅ Keyboard: Tab through services, enter to toggle

### Performance
- ✅ Debounce weight input (300ms) before recalculating
- ✅ Memoize calculations
- ✅ Don't re-render services list if props unchanged

### Responsive
- Mobile: Full width, stacked layout
- Tablet: Side-by-side (weight + services)
- Desktop: Same as expanded view

---

## Usage Examples

### In Booking Creation (Step 5: Payment)
```typescript
<BookingSummary
  pricePerKg={route.price_per_kg_eur}
  promoPct={route.promotion_percentage}
  promoExpiresAt={route.promo_expires_at}
  availableWeight={route.available_weight_kg}
  minBookingKg={route.min_weight_kg}
  maxSinglePackageKg={route.max_single_package_kg}
  
  weightKg={bookingForm.packageWeightKg}
  onWeightChange={(w) => setBookingForm({...bookingForm, packageWeightKg: w})}
  
  availableServices={parseLogisticsOptions(route.logistics_options)}
  selectedServices={bookingForm.selectedServices}
  onServiceToggle={(id) => toggleService(id)}
  
  selectedPaymentMethod={bookingForm.paymentMethod}
  onPaymentMethodChange={(m) => setBookingForm({...bookingForm, paymentMethod: m})}
  paymentMethods={route.payment_methods}
  
  onProceed={(summary) => submitPayment(summary)}
  mode="expanded"
  showPaymentSelect={true}
/>
```

### In Route Detail (Floating Bottom)
```typescript
<BookingSummary
  pricePerKg={route.price_per_kg_eur}
  promoPct={route.promotion_percentage}
  availableWeight={route.available_weight_kg}
  
  weightKg={tempWeight}
  onWeightChange={setTempWeight}
  
  onProceed={(summary) => navigateToBookingCreation(summary)}
  mode="compact"
  showPaymentSelect={false}
/>
```

---

## Implementation Notes

- Component should be **reusable across booking flows**
- Keep weight calculation **independent** from booking creation form (can be updated separately)
- Services list should **auto-parse** from route's `logistics_options` JSON
- Price changes should **update instantly** (no debounce on display, only on callbacks)
- Use **memo** to prevent unnecessary re-renders during weight typing

---

## Files to Create

1. `components/booking/BookingSummary.tsx` — Main component
2. `hooks/useBookingSummary.ts` — Calculation logic
3. `utils/bookingSummaryCalculator.ts` — Price breakdown logic
4. `types/bookingSummary.ts` — Type definitions
