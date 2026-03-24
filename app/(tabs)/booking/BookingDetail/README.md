# Booking Detail Screen

Refactored following SoC (Separation of Concerns) architecture with clear layer boundaries.

## Structure

```
app/bookings/
├── [id].tsx                    # Screen component (routing + layout only)
├── components/
│   └── TimelineStep.tsx        # Reusable timeline step component
├── hooks/
│   ├── useBookingDetail.ts     # Data fetching + realtime subscriptions
│   └── useBookingActions.ts    # User interactions (WhatsApp, call)
├── utils/
│   ├── routeCities.ts          # Derive origin/destination from route_stops
│   ├── stepState.ts            # Timeline step state logic
│   └── stepSubtitle.ts         # Step subtitle text formatting
├── types/
│   └── index.ts                # TypeScript types + constants
└── README.md
```

## Layers

### Components (`components/`)
- **Responsibility**: Rendering only
- **TimelineStep.tsx**: Displays a single timeline step with state-based styling
- No business logic, no API calls

### Hooks (`hooks/`)
- **Responsibility**: Data fetching & side effects
- **useBookingDetail.ts**: Fetches booking data, subscribes to realtime updates
- **useBookingActions.ts**: Event handlers (WhatsApp, call driver)

### Utils (`utils/`)
- **Responsibility**: Pure functions, no side effects
- **routeCities.ts**: Derives origin/destination city names from route_stops array
- **stepState.ts**: Maps booking status to timeline step state
- **stepSubtitle.ts**: Formats step subtitle text

### Types (`types/`)
- **index.ts**: Type definitions & constants shared across the module

## Key Features

1. **Data Fetching**: `useBookingDetail` handles Supabase queries and realtime subscriptions
2. **Realtime Updates**: Listens to booking changes via Supabase postgres_changes
3. **City Resolution**: Computes origin/destination from `route_stops` (not from non-existent route columns)
4. **Timeline UI**: Reusable TimelineStep component with state-driven styling
5. **User Actions**: WhatsApp messaging and phone calls via `useBookingActions`

## Usage

```tsx
import BookingDetailScreen from '@/app/bookings/[id]'
```

The screen automatically loads when navigating to `/bookings/[id]` route via Expo Router.
