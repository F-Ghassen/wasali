# Wasali — Product

_Last updated: 2026-03-20_

---

## What is Wasali?

Wasali is a peer-to-peer shipping marketplace connecting people in Europe who need to send packages to Tunisia with travellers (drivers) who are already making the trip.

Instead of paying courier rates of €40–€80/kg, senders pay €5–€15/kg to a private individual who happens to be travelling. Drivers earn money on trips they were already taking.

**tagline:** _Send it with someone going there._

---

## The Problem

The Tunisia–Europe corridor has a well-established informal package-carrying economy. People already ask friends, family, and acquaintances to carry items on trips. But this network is:

- **Undiscoverable** — you need to know someone making the trip
- **Unreliable** — no commitments, no tracking, no recourse
- **Unmonetised** — travellers carry for free as a favour, missing income

Traditional couriers (DHL, FedEx, Chronopost) are expensive, slow through customs, and often impractical for personal goods (clothing, food, cosmetics, electronics).

---

## The Solution

Wasali formalises the existing informal network:

| Without Wasali | With Wasali |
|---|---|
| Ask around in WhatsApp groups | Search available routes by date and city |
| Hope someone is travelling | Browse verified drivers with departure dates |
| No price agreement | Fixed price per kg, set by the driver |
| No tracking | Status timeline from collection to delivery |
| No protection | Escrow payment released only on delivery |
| No accountability | Ratings, disputes, verified identities |

---

## User Roles

### Sender

A person in Europe (primarily France, Germany, Italy, Belgium, UK) who needs to send a package to Tunisia.

**Jobs to be done:**
- Send clothes, food, cosmetics, electronics to family in Tunisia
- Send documents (contracts, passports, ID cards)
- Find a reliable carrier without paying courier prices
- Track the package end-to-end

**Typical profile:** Tunisian diaspora, 25–55 years old, sends 2–6 packages per year.

---

### Driver (Traveller / Carrier)

A person already travelling from Europe to Tunisia (or within the corridor) who wants to earn money by carrying packages.

**Jobs to be done:**
- Monetise spare luggage capacity on a trip they're already taking
- Set their own price, route, and rules
- Manage bookings and payments in one place
- Build a reputation to attract more bookings

**Typical profile:** Frequent traveller (student, worker, expat), 22–45 years old, travels 3–8 times per year.

---

## Core Features

### For Senders

| Feature | Description |
|---|---|
| **Route search** | Search by EU origin city + TN destination city + date |
| **Driver profiles** | See driver rating, route history, prohibited items |
| **6-step booking wizard** | Guided flow: itinerary → logistics → sender → recipient → package → payment |
| **Logistics options** | Choose: drop-off at meeting point / driver pickup; recipient self-collect / door delivery / local post |
| **Meeting point display** | Logistics step shows driver-set location name and Google Maps link for each option |
| **Payment methods** | Cash on collection / cash on delivery (enabled); card & PayPal visible, coming soon |
| **Escrow protection** | Card payments held until delivery confirmed |
| **Package tracking** | Real-time status timeline with push notifications |
| **Ratings & disputes** | Rate driver after delivery; open dispute if issues |
| **Shipping requests** | Post a request; let drivers come to you with offers |
| **P2P document network** | Lightweight flow for documents (passport, contracts, letters) |

### For Drivers

| Feature | Description |
|---|---|
| **5-step route wizard** | Collection stops → drop-off stops → notes & rules → services → pricing |
| **Multi-stop routes** | Up to 8 collection stops + 8 drop-off stops per route |
| **Stop location fields** | Set location name + Google Maps meeting point URL per stop (shown to senders in booking) |
| **Service pricing** | Set fees for home pickup, home delivery (collection/recipient-collect is free) |
| **Prohibited items** | Select from presets (drugs, weapons, alcohol…) or add custom |
| **Promo pricing** | Discount %, optional expiry date, custom label ("Early bird") |
| **Route templates** | Save a route config for reuse on future trips |
| **Booking management** | Accept/reject → collected → delivered workflow |
| **Live earnings estimate** | Route summary shows transport + service earnings range |
| **Multiple payment methods** | Accept cash, bank transfer, PayPal — configurable per route |
| **Draft persistence** | Wizard draft auto-saved, recoverable within 48h |

---

## Package Categories

| Category | Notes |
|---|---|
| Electronics | Phones, laptops, small appliances |
| Clothing & Textiles | Clothes, fabrics, accessories |
| Food & Groceries | Non-perishable food items |
| Cosmetics & Personal Care | Skincare, makeup, hygiene products |
| Documents & Books | Passports, contracts, books |
| Household Items | Small home goods, gifts |
| Medical Supplies | Non-controlled medication, medical devices |
| Other | Anything else that is allowed |

Perishables, liquids > 1 L, and controlled substances are examples of items drivers can mark as prohibited.

---

## Pricing Model

### How prices work

Drivers set a **price per kg** (typically €5–€15/kg). Senders pay:

```
Base price = package weight (kg) × driver's price/kg
+ Collection surcharge (if driver home pickup)
+ Delivery surcharge (if driver home delivery)
= Total
```

Optional: driver offers a **promotional rate** (% discount, with optional expiry date).

### Revenue model (platform fee — future)

Wasali takes a platform commission on completed bookings (not yet implemented). The escrow model (manual Stripe capture) already enables this: the platform can take a fee before releasing funds to the driver.

### Driver earnings estimate

The Route Summary Card shows drivers an estimate before publishing:

```
Transport      = weight × price/kg
Services       = +20% to +40% of transport (optional service fees)
Total estimate = €X – €Y  (range across expected bookings)
```

---

## P2P Document Network

A lighter-weight layer on top of the core marketplace specifically for documents.

**Why separate?** Documents (passports, ID copies, contracts, medical certificates) have different dynamics:
- Near-zero weight (below minimum billing threshold)
- Often urgent
- Can be carried by anyone with carry-on luggage
- Often carried as a favour (for free) — community/social motivation

The P2P network uses a **points system** to incentivise free carrying:
- Normal urgency → 10 pts per delivery
- Soon → 25 pts
- Urgent → 50 pts
- Points redeemable for gifts, discounts, and partner rewards

---

## Booking Lifecycle

```
pending          Created. Driver notified.
confirmed        Driver accepted. Sender notified.
in_transit       Driver collected the package. Sender notified.
delivered        Driver marked delivered. Sender notified.
                 → Sender rates driver → escrow released
cancelled        Cancelled by driver or sender before collection.
disputed         Sender opened a dispute after delivery.
```

Escrow: card payments are **authorized** at booking time and **captured** only when the driver marks delivered and the sender confirms. This protects both parties.

---

## Supported Corridors

**Current scope:** Europe → Tunisia (one-way)

**European origin cities:**
Paris, Lyon, Marseille, Berlin, Munich, Frankfurt, Milan, Rome, Madrid, Barcelona, Brussels, Amsterdam, London, Zurich, Stockholm, Vienna, Lisbon, Geneva, Düsseldorf

**Tunisian destination cities:**
Tunis, Sfax, Sousse, Gabès, Bizerte, Kairouan, Monastir, Nabeul, Hammamet, Gafsa

Future corridors (roadmap): Tunisia → Europe (return trips), North Africa cross-border, diaspora corridors (Morocco, Algeria, Senegal).

---

## Platform Constraints & Rules

Drivers configure prohibited items per route. Platform-level prohibited items (always banned):
- Weapons, ammunition
- Controlled substances (drugs)
- Explosives, flammables
- Counterfeit goods
- Cash above declaration threshold

Per-route prohibited items (driver choice): alcohol, tobacco, live animals, perishables, medication, high-value electronics.

---

## Notifications

| Event | Channel |
|---|---|
| New booking on route | Push (driver) |
| Booking confirmed/rejected | Push (sender) |
| Package collected | Push (sender) |
| Package delivered | Push (sender) |
| New offer on request | Push (sender) |
| P2P carry offer | Push (document sender) |
| Offer accepted | Push (driver) |
| Auth (OTP, reset) | Email via Resend |

---

## Roadmap

### Shipped (2026-03-20)
- [x] 6-step booking wizard (Itinerary → Logistics → Sender → Recipient → Package → Payment)
- [x] Read-only city fields auto-filled from itinerary stop selection
- [x] Human-readable logistics labels in completed-step summary
- [x] Stop-level location name + meeting point URL (driver sets, sender sees)
- [x] Payment step: cash enabled, card/PayPal gated as "Coming soon"
- [x] Booking confirmation: tracking timeline, WhatsApp deep link to driver, ShipmentLabelModal
- [x] Web deployment at https://wasali.vercel.app (auto-builds on push)

### Near-term
- [ ] Stripe Connect onboarding UI for drivers
- [ ] Platform fee capture before driver payout
- [ ] Driver identity verification (document upload)
- [ ] In-app messaging (sender ↔ driver)
- [ ] Route duplication ("Create similar route")
- [ ] Advanced route filters (price range, rating, logistics options)
- [ ] Card / PayPal payment enablement (remove "Coming soon" gates)

### Medium-term
- [ ] Tunisia → Europe reverse corridor
- [ ] Group shipments (multiple senders on same booking)
- [ ] Bulk discount pricing tiers
- [ ] Insurance option (opt-in per booking)
- [ ] Driver earnings dashboard with payout history
- [ ] Referral programme

### Long-term
- [ ] North Africa cross-border corridors (Morocco, Algeria)
- [ ] API for business senders (SME import/export)
- [ ] Customs documentation assistance
- [ ] Partner network (travel agencies, airlines)

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo SDK 55 |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Payments | Stripe (PaymentIntents + Connect) |
| Email | Resend (via Supabase SMTP) |
| Push | Expo Push Notifications |
| Forms | react-hook-form + Zod v4 |
| Icons | Lucide React Native |

---

## Booking Wizard — Product Design Decisions

_Added: 2026-03-19_

### Why 6 steps (not the previous 5)?

The previous 5-step wizard (Logistics → Sender → Package → Recipient → Payment) had two problems:

1. **Logistics step was conflated.** It combined city selection (itinerary) with service selection (logistics options). These are logically distinct: first the sender picks *where* they'll hand off, then *how* the handoff happens. Splitting them clarifies the mental model.

2. **City selection had no stop ID.** The old wizard captured city *names* as strings but not the stop UUID. This meant the booking couldn't be linked to a specific `route_stop`, which is required for per-city collection services and location display.

The new order: **Itinerary → Logistics → Sender → Recipient → Package → Payment**. Package stays last before payment to match driver-focused flow (driver needs to know what's coming before sender fills in package details).

_Wait — Package is Step 4 in the current spec (unchanged component). Order: 0 Itinerary, 1 Logistics, 2 Sender, 3 Recipient, 4 Package, 5 Payment._

### Multi-stop model

A route has:
- **Collection stops** (`stop_type = 'collection'`): cities in Europe where the driver will pick up packages
- **Drop-off stops** (`stop_type = 'dropoff'`): cities in Tunisia where the driver will deliver/meet recipients
- Each collection stop can have its own **collection services** (linked via `route_stop_id`)
- Delivery services are country-wide (no stop binding — `route_stop_id IS NULL`)

This allows a driver doing Paris → Lyon → Tunis → Sfax to offer different pickup times and methods in each European city, while delivery options apply uniformly.

### Step reset logic rationale

- **Changing collection stop resets logistics:** Services are bound to specific stops; changing the stop means the previously-selected service may not apply to the new stop.
- **Changing collection method from `driver_pickup` resets sender address:** If the sender switches away from driver pickup, their address is no longer relevant. Keeping it silently would result in stale address in the booking.
- **Changing delivery method does NOT reset recipient address:** The address fields are the same regardless of whether the driver delivers or the recipient collects; only the label changes.

### Launch limitations

| Feature | Status |
|---------|--------|
| Cash on collection | ✅ Launch |
| Cash on delivery | 🚧 Coming soon (backend ready, UI disabled) |
| Card / PayPal | 🚧 Coming soon (Stripe integration pending) |
| Estimated collection date picker | ✅ Launch |
| Package photos | ✅ Launch |
| Draft persistence | ✅ Launch |
| Multi-package bookings | ❌ Out of scope — one package per booking |
| Customs declaration | ❌ Out of scope — future |
| Insurance | ❌ Out of scope — future |

### Platform service fee

Currently €0 (free for launch). An "Included · Free" line item appears in `OrderSummary` as a placeholder. The fee model will be defined before charging begins.

