# Route Detail Screen - Enhanced Design

## Available Data from Database

### Route Data
- ✅ `departure_date` — when route leaves
- ✅ `estimated_arrival_date` — when it arrives
- ✅ `price_per_kg_eur` — cost per kilogram
- ✅ `available_weight_kg` — remaining capacity
- ✅ `total_weight_kg` — total capacity
- ✅ `vehicle_type` — car, van, truck, etc.
- ✅ `payment_methods[]` — accepted payment methods
- ✅ `prohibited_items[]` — banned items
- ✅ `min_weight_kg` — minimum booking size
- ✅ `max_single_package_kg` — max per package
- ✅ `logistics_options` — JSON of available services
- ✅ `notes` — driver notes about the route
- ✅ `promotion_active` / `promotion_percentage` / `promo_label` / `promo_expires_at` — promo details
- ✅ `is_featured` — highlighted route
- ✅ `status` — draft, active, full, cancelled, completed

### Driver Data (Joined)
- ✅ `full_name`
- ✅ `phone`
- ✅ `phone_verified`
- ✅ `avatar_url`
- ✅ `rating`
- ✅ `completed_trips`
- ✅ `stripe_connect_account_id` (for identity verification)

### Route Stops Data
- ✅ `city_id` — pickup/delivery location
- ✅ `stop_order` — sequence on the route
- ✅ `arrival_date` — when driver arrives
- ✅ `is_pickup_available` — can pickup here
- ✅ `is_dropoff_available` — can dropoff here
- ✅ `meeting_point_url` — pickup location details

---

## Proposed Enhanced Design

### Section 1: Header with Quick Info
```
┌─────────────────────────────────────────────────────────────┐
│                     Route Details                      [X]   │
├─────────────────────────────────────────────────────────────┤
│ Lyon → Monastir                        €3.50/kg [Featured] │
│ Tue, Jun 16, 2026 - Thu, Jun 18, 2026                    │
│ ⭐ 4.8 (42 trips) | Verified | Van                       │
│ Fathallah                                            [msg] │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- 🏆 "Featured" badge if `is_featured: true`
- 📱 Contact button (message driver)
- Route duration (2 days in this case)
- Verification status

---

### Section 2: Promo Banner (If Active)
```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 LIMITED TIME: 20% OFF                                   │
│    Save €0.70/kg | Expires Jun 20, 2026                   │
│    Original: €3.50  →  Now: €2.80/kg                       │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- Promo label from `promo_label`
- Savings calculation
- Expiration countdown
- Visual before/after pricing

---

### Section 3: Capacity & Constraints
```
┌─────────────────────────────────────────────────────────────┐
│ CAPACITY & LIMITS                                         │
├─────────────────────────────────────────────────────────────┤
│ Available Weight: 1000 kg                                 │
│ [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 35% filled │
│                                                            │
│ Per Booking Limits:                                       │
│   Min: 5 kg  |  Max Single Package: 50 kg                │
│                                                            │
│ ⚠ This route is 65% full                                 │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- Detailed capacity bar with % filled
- Min/max package constraints
- Capacity warning/status

---

### Section 4: Route Map Timeline
```
┌─────────────────────────────────────────────────────────────┐
│ ROUTE TIMELINE                                            │
├─────────────────────────────────────────────────────────────┤
│ ● PICKUP                                                   │
│   ├─ Lyon (France)        Mon, Jun 16 @ 10:00             │
│   └─ Marseille (France)   Mon, Jun 16 @ 14:00             │
│                                                            │
│ ✈ IN TRANSIT (2 days)                                    │
│                                                            │
│ ● DELIVERY                                                 │
│   ├─ Tunis (Tunisia)      Wed, Jun 18 @ 08:00             │
│   └─ Monastir (Tunisia)   Wed, Jun 18 @ 12:00             │
│                                                            │
│ Est. Total Duration: 2 days, 2 hours                      │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- All pickup stops with times
- All delivery stops with times
- Est. travel duration
- Visual transit indicator

---

### Section 5: Payment & Services
```
┌─────────────────────────────────────────────────────────────┐
│ PAYMENT & SERVICES                                        │
├─────────────────────────────────────────────────────────────┤
│ Accepted Payment Methods:                                 │
│   💳 Credit Card  |  🏦 Bank Transfer  |  📱 Mobile Pay  │
│                                                            │
│ Available Services:                                       │
│   ✓ Driver Pickup (included)                             │
│   ✓ Home Delivery (+€5)                                  │
│   ✓ Insurance Available (+2%)                            │
│   ✗ Cold Storage (unavailable)                           │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- Payment method icons
- Service options with pricing
- Availability status for each service

---

### Section 6: Restrictions & Safety
```
┌─────────────────────────────────────────────────────────────┐
│ PROHIBITED ITEMS                                          │
├─────────────────────────────────────────────────────────────┤
│ ⛔ Not Accepted:                                          │
│    • Live animals                                         │
│    • Electronics > €500                                   │
│    • Counterfeit goods                                    │
│    • Weapons & explosives                                 │
│                                                            │
│ 💡 Need to ship restricted items?                         │
│    Contact driver for custom arrangement                  │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- Better visual hierarchy for restrictions
- CTA to contact driver for exceptions
- Icons for each item type

---

### Section 7: Driver Profile Card
```
┌─────────────────────────────────────────────────────────────┐
│ DRIVER INFORMATION                                        │
├─────────────────────────────────────────────────────────────┤
│ [Avatar] Fathallah                                        │
│          ⭐ 4.8 (42 completed trips)                      │
│          ✓ Phone Verified  | 🚐 Van                      │
│          📍 Based in Lyon, France                         │
│                                                            │
│ About: Reliable driver, careful handling, professional    │
│        service. 5 years experience in EU-Africa routes.   │
│                                                            │
│ [📞 Message]  [📋 View Reviews]  [🚩 Report]             │
└─────────────────────────────────────────────────────────────┘
```

**New Elements:**
- Driver bio/notes from `notes` field
- Location info
- Action buttons for contact & reviews

---

## Design Improvements Over Current

| Element | Current | Enhanced |
|---------|---------|----------|
| **Promo** | Hidden in price | Dedicated banner |
| **Driver** | Basic card | Full profile card |
| **Capacity** | Single bar | Detailed with constraints |
| **Stops** | List only | Timeline with durations |
| **Services** | Text only | Visual with icons & pricing |
| **Restrictions** | Alert style | Detailed with CTA |
| **Duration** | Not shown | Calculated & displayed |
| **Status** | None | Featured badge, urgency |
| **Contact** | None | Message driver button |
| **Features** | None | Payment methods visible |

---

## Data Fields to Add to Route Query

Current query likely fetches:
```typescript
routes
  .select(`*, 
    driver(*),
    route_stops(*),
    promo_label,
    payment_methods,
    logistics_options
  `)
```

Ensure query includes:
- ✅ `vehicle_type`
- ✅ `is_featured`
- ✅ `min_weight_kg`
- ✅ `max_single_package_kg`
- ✅ `promo_expires_at` (to calculate countdown)
- ✅ `notes` (driver bio)
- ✅ `payment_methods[]`
- ✅ `prohibited_items[]`
- ✅ `logistics_options` (JSON services)
- ✅ `driver.avatar_url`
- ✅ `driver.rating`
- ✅ `driver.completed_trips`

---

## Implementation Priority

### Phase 1 (MVP)
1. Promo banner if active
2. Route timeline with all stops
3. Capacity detail with constraints
4. Driver profile expansion

### Phase 2 (Polish)
5. Payment methods display
6. Logistics options with pricing
7. Countdown timer for promos

### Phase 3 (Enhanced)
8. Driver reviews & rating details
9. Insurance options
10. Temperature/handling preferences
11. Damage protection options

---

## Booking Summary Component (Separate)

The booking summary calculator is now a **standalone component** that lives below the route details section (in the booking creation flow). See `docs/BOOKING_SUMMARY_COMPONENT.md` for that design.
