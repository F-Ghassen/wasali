# Wasali — Context Document for User Research & Copywriting

_Generated: 2026-07-26_

---

## Executive Summary

**Wasali** is a peer-to-peer shipping marketplace connecting people in Europe who need to send packages to Tunisia with travelers (drivers) already making the trip. The platform formalizes an existing informal network where diaspora communities ask friends and family to carry items, making it discoverable, reliable, monetized, and trustworthy.

**Core Value Proposition:**
- **For Senders:** Ship packages to Tunisia at €5–€15/kg (vs €40–€80/kg for DHL/FedEx)
- **For Drivers:** Monetize spare luggage capacity on trips they're already taking

**Tagline:** _"Send it with someone going there."_

**Stage:** Pre-launch / Early deployment (web app live at wasali.vercel.app, cash-only payment model)

---

## Market Context

### The Problem

The Tunisia–Europe corridor has a well-established **informal package-carrying economy**. Tunisian diaspora (primarily in France, Germany, Italy, Belgium, UK) regularly need to send items to family:
- Clothing, cosmetics, food, electronics
- Documents (passports, contracts, ID cards, medical certificates)
- Small household items and gifts

**Current pain points:**
1. **Undiscoverable:** You need to know someone making the trip (WhatsApp groups, family networks)
2. **Unreliable:** No commitments, tracking, or recourse if something goes wrong
3. **Unmonetised:** Travelers carry for free as favors, missing income opportunity
4. **Expensive alternatives:** Traditional couriers (DHL, FedEx, Chronopost) cost €40–€80/kg, slow through customs

### The Solution

Wasali transforms this informal network into a **structured marketplace** with:
- Search by origin/destination city + date
- Verified driver profiles with ratings and route history
- Status tracking from collection to delivery
- Escrow protection (future: card payments held until delivery)
- Accountability via ratings and dispute resolution
- Fixed prices set by drivers (typically €5–€15/kg)

---

## User Segments

### Primary: Sender (Package Shipper)

**Demographics:**
- Tunisian diaspora, aged 25–55
- Living in Europe (France, Germany, Italy, Belgium, UK primary markets)
- Sends 2–6 packages per year to family in Tunisia

**Jobs to Be Done:**
- Send personal items (clothing, food, cosmetics, electronics) to family
- Send documents (contracts, passports, ID cards)
- Find reliable carriers without paying courier prices
- Track package end-to-end
- Have recourse if delivery fails

**Pain Points:**
- Courier shipping is prohibitively expensive (€40–€80/kg)
- Traditional mail is slow and unreliable through customs
- Asking friends/family is awkward and limits flexibility
- No visibility once item is handed off
- No protection if package is lost or damaged

**Motivations:**
- Stay connected with family through gifts and essentials
- Save money on shipping costs
- Avoid customs hassles
- Support community (paying drivers within diaspora)

---

### Primary: Driver (Traveler / Carrier)

**Demographics:**
- Frequent traveler between Europe and Tunisia
- Aged 22–45
- Student, worker, expat traveling 3–8 times per year
- May already carry packages informally for friends

**Jobs to Be Done:**
- Monetize spare luggage capacity on trips already planned
- Set own prices, routes, and rules
- Manage bookings and payments in one place
- Build reputation to attract repeat customers
- Earn €100–€500+ per trip depending on capacity

**Pain Points:**
- Lost income opportunity on existing trips
- Informal asks are unpredictable (may not utilize full capacity)
- No payment infrastructure for ad-hoc arrangements
- No platform to advertise availability
- Risk of disputes with no mediation

**Motivations:**
- Earn extra income on trips already booked
- Help community while being compensated fairly
- Flexibility to set own terms (price, logistics, prohibited items)
- Build a side income stream around travel schedule

---

### Secondary: P2P Document Network Users

**Lighter-weight use case** for urgent documents (passports, medical certificates, contracts):
- Near-zero weight, often urgent
- Can be carried by anyone with carry-on luggage
- Often carried for free as community service
- Points system incentivizes free carrying (10–50 pts per delivery)
- Points redeemable for gifts, discounts, partner rewards

---

## Core Features by User Role

### Sender Journey

1. **Search Routes**
   - Search by EU origin city → TN destination city + departure date
   - Results show driver profiles, ratings, trip counts, price/kg
   - Filter: capacity, price range, top-rated drivers
   - Sort: earliest departure, cheapest, top-rated

2. **6-Step Booking Wizard**
   - Step 0 — **Itinerary:** Select collection stop and drop-off stop
   - Step 1 — **Logistics:** Collection method (drop-off at meeting point / driver home pickup) + delivery method (recipient self-collects / door delivery / local post)
   - Step 2 — **Sender Details:** Name, phone, address (if driver pickup)
   - Step 3 — **Recipient:** Name, phone, address; save recipient option
   - Step 4 — **Package:** Weight, category, photos (up to 5)
   - Step 5 — **Payment:** Cash on collection / cash on delivery (launch), card/PayPal (coming soon)

3. **Track Shipment**
   - Real-time status timeline: pending → confirmed → in_transit → delivered
   - Push notifications at each status change
   - WhatsApp deep link to contact driver
   - Print shipping label / QR code

4. **Post-Delivery**
   - Rate driver (1–5 stars + review)
   - Open dispute if needed
   - View booking history

5. **Shipping Requests** (Alternative Flow)
   - Post a request: origin, destination, date range, weight, max budget
   - Drivers bid with offers
   - Accept offer → convert to booking

---

### Driver Journey

1. **Create Route** (5-Step Wizard)
   - Step 1 — **Collection Stops:** Up to 8 EU cities with dates and meeting points
   - Step 2 — **Drop-off Stops:** Up to 8 TN cities with estimated arrivals
   - Step 3 — **Notes & Rules:** Prohibited items (preset + custom), notes for senders
   - Step 4 — **Services:** Collection (drop-off free, home pickup € fee) + delivery (recipient collects free, home delivery € fee)
   - Step 5 — **Pricing:** Capacity (kg), price/kg, promo discount, payment methods (cash, PayPal, bank transfer)

2. **Manage Bookings**
   - View pending requests
   - Confirm or reject bookings
   - Mark collected (QR scan optional)
   - Mark delivered
   - See earnings per route

3. **Dashboard**
   - Stat cards: active routes, pending bookings, confirmed bookings
   - Earnings summary (this month, total)
   - Revenue chart (6-month history)

4. **Route Templates**
   - Save frequently-traveled routes as templates
   - Reuse config (capacity, price, logistics options) on future trips

---

## Booking Lifecycle (State Machine)

```
pending ──▶ confirmed ──▶ in_transit ──▶ delivered ──▶ [rated]
   │            │                             │
   │            └──▶ cancelled                └──▶ disputed
   └──▶ cancelled
```

**Status Definitions:**
- **pending:** Booking created, driver notified
- **confirmed:** Driver accepted, sender notified, route capacity decremented
- **in_transit:** Driver collected package (QR-verified optional), sender notified
- **delivered:** Driver marked delivered, sender notified; triggers rating prompt
- **cancelled:** Cancelled by driver or sender before collection
- **disputed:** Sender opened dispute after delivery (admin review)

**Payment Model (Launch):**
- Cash-only: handed directly to driver at collection or delivery
- "Mark as Paid" is bookkeeping flag (no platform escrow at launch)
- Card / PayPal visible as "Coming soon" (Stripe integration pending)

---

## Pricing Model

### How It Works

Drivers set a **price per kg** (typically €5–€15/kg). Senders pay:

```
Base price = package weight (kg) × driver's price/kg
+ Collection surcharge (if driver home pickup)
+ Delivery surcharge (if driver home delivery)
= Total
```

**Optional:** Driver offers promotional rate (% discount, with optional expiry date and custom label like "Early bird")

### Revenue Model (Future)

Platform commission on completed bookings (not yet implemented). The escrow model (manual Stripe capture) already enables this: platform can take fee before releasing funds to driver.

### Driver Earnings Estimate

Route summary shows estimate before publishing:
```
Transport      = weight × price/kg
Services       = +20% to +40% of transport (optional service fees)
Total estimate = €X – €Y  (range across expected bookings)
```

---

## Key Platform Differentiators

| Feature | Wasali | Traditional Couriers | Informal Network |
|---------|--------|---------------------|------------------|
| **Price** | €5–€15/kg | €40–€80/kg | Free (favor) |
| **Discovery** | Search by city + date | Call/website | WhatsApp groups, asking around |
| **Reliability** | Ratings, tracking, escrow | High | Depends on relationship |
| **Speed** | Same as traveler's trip | 5–10 days | Same as traveler's trip |
| **Protection** | Ratings, disputes, escrow (future) | Insurance, guarantees | None |
| **Flexibility** | Multi-stop routes, logistics options | Fixed service tiers | Ad-hoc arrangements |
| **Community** | Diaspora-focused, peer-to-peer | Corporate | Social network only |

---

## Supported Corridors

**Current Scope:** Europe → Tunisia (one-way)

**European Origin Cities (19):**
Paris, Lyon, Marseille, Berlin, Munich, Frankfurt, Milan, Rome, Madrid, Barcelona, Brussels, Amsterdam, London, Zurich, Stockholm, Vienna, Lisbon, Geneva, Düsseldorf

**Tunisian Destination Cities (10):**
Tunis, Sfax, Sousse, Gabès, Bizerte, Kairouan, Monastir, Nabeul, Hammamet, Gafsa

**Future Roadmap:**
- Tunisia → Europe (return trips)
- North Africa cross-border (Morocco, Algeria)
- Other diaspora corridors (Senegal, etc.)

---

## Package Categories

| Category | Examples |
|----------|----------|
| **Electronics** | Phones, laptops, small appliances |
| **Clothing & Textiles** | Clothes, fabrics, accessories |
| **Food & Groceries** | Non-perishable food items |
| **Cosmetics & Personal Care** | Skincare, makeup, hygiene products |
| **Documents & Books** | Passports, contracts, books |
| **Household Items** | Small home goods, gifts |
| **Medical Supplies** | Non-controlled medication, medical devices |
| **Other** | Anything else allowed |

**Platform-Level Prohibited Items** (always banned):
- Weapons, ammunition
- Controlled substances (drugs)
- Explosives, flammables
- Counterfeit goods
- Cash above declaration threshold

**Per-Route Prohibited Items** (driver choice):
- Alcohol, tobacco
- Live animals
- Perishables
- Medication
- High-value electronics (>€500)

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 55 + React Native |
| **Navigation** | Expo Router (file-based routing) |
| **State** | Zustand v5 |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| **Payments** | Stripe (PaymentIntents + Connect) — pending integration |
| **Forms** | react-hook-form + Zod v4 |
| **i18n** | i18next — 4 locales: English, French, Arabic, Darija |
| **Testing** | Vitest (unit/integration) + Maestro (E2E mobile) |
| **Deployment** | Vercel (web SPA) |

---

## Current Stage & Roadmap

### Shipped (As of 2026-03-20)
- ✅ 6-step booking wizard with logistics options
- ✅ Multi-stop route creation (up to 8 collection + 8 drop-off)
- ✅ Route search with tier-1 (exact city) and tier-2 (country match)
- ✅ Booking lifecycle tracking with push notifications
- ✅ QR-verified package handoff
- ✅ Rating system (bidirectional)
- ✅ Web deployment (wasali.vercel.app)
- ✅ Cash-only payment at launch

### Near-Term (Q3 2026)
- [ ] Stripe Connect onboarding UI for drivers
- [ ] Card / PayPal payment enablement (escrow model)
- [ ] Platform fee capture before driver payout
- [ ] Driver identity verification (document upload)
- [ ] In-app messaging (sender ↔ driver)
- [ ] Advanced route filters (price range, rating, logistics)

### Medium-Term (Q4 2026)
- [ ] Tunisia → Europe reverse corridor
- [ ] Group shipments (multiple senders, one booking)
- [ ] Bulk discount pricing tiers
- [ ] Insurance option (opt-in per booking)
- [ ] Driver earnings dashboard with payout history
- [ ] Referral programme

### Long-Term (2027+)
- [ ] North Africa cross-border corridors (Morocco, Algeria)
- [ ] API for business senders (SME import/export)
- [ ] Customs documentation assistance
- [ ] Partner network (travel agencies, airlines)

---

## Key Messaging & Copy Themes

### For Senders

**Primary Messages:**
- "Send it with someone going there" — trust, community, simplicity
- "Ship packages to Tunisia at courier prices" — value, savings
- "Track every step of the way" — reliability, transparency
- "Pay only when delivered" — safety, risk-free (future escrow)

**Emotional Triggers:**
- Connection to family and home
- Frustration with expensive/slow couriers
- Trust in community vs corporate
- Ease and convenience

**Voice & Tone:**
- Warm, reassuring, community-focused
- Clear, no-jargon explanations
- Confidence-building (ratings, tracking, protection)
- Friendly but professional

---

### For Drivers

**Primary Messages:**
- "Earn money on trips you're already taking" — easy income, no extra effort
- "Set your own price, route, and rules" — flexibility, control
- "Help your community and get paid for it" — purpose + profit
- "Build your reputation, grow your earnings" — long-term opportunity

**Emotional Triggers:**
- Lost income on existing trips
- Desire to help community while being compensated
- Entrepreneurial control (be your own boss)
- Social proof (ratings, completed trips)

**Voice & Tone:**
- Empowering, opportunity-focused
- Straightforward and business-like
- Supportive (we're here to help you succeed)
- Transparent about earnings potential

---

## User Research Focus Areas

### Senders

**Discovery:**
- How do senders currently find carriers? (WhatsApp, family, friends?)
- What prompts a shipping need? (seasonal patterns, life events?)
- What items are most commonly sent?

**Trust & Safety:**
- What factors build trust in a driver? (ratings, profile completeness, trip count?)
- What concerns prevent using peer-to-peer shipping? (loss, damage, delays?)
- How important is insurance vs escrow vs ratings?

**Pricing:**
- What price point feels fair vs too cheap (sketchy) vs too expensive?
- How do they perceive courier prices? (necessary evil, rip-off, unavoidable?)
- Are they willing to pay extra for home pickup/delivery?

**Logistics:**
- Preference for drop-off vs home pickup?
- Preference for recipient self-collect vs door delivery?
- How important is meeting point location (driver's neighborhood vs city center)?

**Communication:**
- Do they want to message drivers before booking? During transit?
- Is WhatsApp deep link sufficient or do they want in-app chat?

---

### Drivers

**Motivation:**
- Primary motivation: income, community, both?
- What earnings level makes it worth the effort? (€50? €200? €500?)
- Do they already carry packages informally? What's the experience?

**Logistics:**
- How far will they travel to pick up/deliver within a city?
- Preferred meeting point (airport, train station, home, public place)?
- Comfort level with home pickup/delivery vs meeting point only?

**Risk:**
- What concerns do they have about carrying for strangers? (liability, prohibited items, disputes?)
- How important are prohibited item controls?
- Do they want platform insurance/protection?

**Route Creation:**
- Is the 5-step wizard too complex or just right?
- Do they want more pricing automation (suggested price based on corridor)?
- Is route template feature valuable?

---

### Both Segments

**Platform Trust:**
- What makes Wasali feel trustworthy vs sketchy?
- How important are verified identities (ID upload, selfie)?
- Role of reviews/ratings in decision-making

**Onboarding:**
- Is the value proposition immediately clear?
- What causes friction in sign-up or first booking/route creation?
- Do they understand the dual-role model (sender vs driver)?

**Retention:**
- What brings users back? (seasonal needs, good experience, referrals?)
- What causes churn? (bad experience, complexity, lack of options?)

---

## Competitive Landscape

### Direct Competitors

**None at scale.** The informal network is the primary "competitor" — friends, family, WhatsApp groups. No platform currently serves this market in a structured way.

### Indirect Competitors

| Player | Model | Strengths | Weaknesses |
|--------|-------|-----------|------------|
| **DHL, FedEx, Chronopost** | Traditional courier | Reliable, insured, global | Expensive (€40–€80/kg), slow customs |
| **Informal network** | Friends/family | Free, trusted | Undiscoverable, unreliable, no recourse |
| **La Poste Colissimo** | National postal | Cheaper than couriers | Still expensive, slow, lost packages |
| **BlaBlaCar (packages)** | Rideshare model | Proven P2P trust model | Not optimized for packages, different use case |

### Unique Position

Wasali is the **only platform** formalizing the Tunisia–Europe diaspora shipping corridor with:
- Escrow protection (future)
- Package-specific features (weight, categories, photos)
- Multi-stop route modeling
- Community-first positioning (diaspora helping diaspora)

---

## Open Questions for Research

1. **Sender willingness to pay:** At what price point does Wasali feel like a "good deal" vs "too cheap to trust" vs "might as well use DHL"?

2. **Driver earnings threshold:** What's the minimum earning per trip to make drivers create routes consistently?

3. **Trust signals:** What specific signals (ID verification, past trips, ratings count) most impact booking conversion?

4. **Logistics preferences:** Do senders prefer convenience (home pickup/delivery) or cost savings (meeting point)?

5. **Seasonal patterns:** Are there predictable spikes (holidays, Ramadan, summer travel) that should shape marketing?

6. **Retention drivers:** What makes a user come back for a second/third booking or route?

7. **Geographic expansion:** Which corridors should be prioritized after Tunisia? (Morocco? Algeria? Senegal?)

8. **B2B opportunity:** Is there demand from small businesses (importers, gift shops) for regular shipments?

---

## Copywriting Priorities

### Homepage Hero
- Headline that immediately communicates value ("Ship to Tunisia at €5–€15/kg")
- Subheadline that addresses trust ("Verified travelers, tracked packages, cash on delivery")
- Clear CTAs for both roles ("Find a driver" / "Become a driver")

### Onboarding
- Role selection that clarifies sender vs driver
- Benefit-focused copy (not feature lists)
- Social proof early (number of routes, packages delivered, avg rating)

### Booking Wizard
- Step titles that describe outcome, not just field names
- Inline help text for unfamiliar concepts (meeting point, drop-off types)
- Progress indicators and estimates (total cost, estimated delivery date)

### Driver Route Creation
- Earnings calculator visible throughout wizard
- Examples of successful routes (copy, not just empty forms)
- Reassurance about control (you set the rules, we handle the rest)

### Trust & Safety Messaging
- Escrow explanation (when card payments launch)
- Rating system benefits (both directions)
- Dispute resolution process
- Platform guarantees (what we cover, what we don't)

---

## Key Metrics to Track (for Research)

**Acquisition:**
- Landing page → sign-up conversion
- Sign-up → first booking (sender) or first route (driver)
- Traffic source (organic, referral, ads, word-of-mouth)

**Engagement:**
- Booking conversion rate (search → booking confirmed)
- Route fill rate (driver capacity utilization)
- Average bookings per route
- Repeat booking rate (30, 60, 90 days)

**Trust:**
- Percentage of bookings with ratings (both sides)
- Average rating (sender to driver, driver to sender)
- Dispute rate
- Cancellation rate by stage (pending, confirmed, in-transit)

**Monetization (Future):**
- Average booking value
- Platform fee per transaction
- Driver payout vs platform revenue split

---

## Final Notes for Research & Copywriting

**Wasali is not just a logistics platform** — it's a **community enabler** that formalizes an existing trust-based economy. The emotional core is connection to home, supporting diaspora, and making the informal formal.

**Tone should balance:**
- Warmth (community, family, home) with professionalism (trust, reliability, safety)
- Simplicity (easy to use) with transparency (how it works, what's protected)
- Aspiration (better than asking favors) with pragmatism (save money, earn money)

**Target both segments simultaneously** — the marketplace only works if both sides are active. Messaging should:
- Make senders feel confident and protected
- Make drivers feel empowered and fairly compensated
- Emphasize the win-win (senders save, drivers earn, community strengthens)

---

**Generated for:** User research and copywriting planning  
**Last Updated:** 2026-07-26  
**Status:** Pre-launch, cash-only model, web app live
