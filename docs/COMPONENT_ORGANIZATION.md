# Component Organization

## Structure Overview

Components are organized by domain (feature) and layer (primitives → composed):

```
components/
├── shared/                      # ← Reusable across all features
│   ├── ui/
│   │   ├── primitives/          # Core UI elements
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ServiceOption.tsx
│   │   │   └── index.ts
│   │   ├── forms/               # Form-specific inputs (built on primitives)
│   │   │   ├── DateInput.tsx
│   │   │   ├── PhoneInput.tsx
│   │   │   ├── CityPickerInput.tsx
│   │   │   ├── AddressFields.tsx
│   │   │   ├── URLInput.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   └── index.ts
│   │   ├── layouts/             # Structural wrappers
│   │   │   ├── EmptyState.tsx
│   │   │   ├── StepProgress.tsx
│   │   │   └── index.ts
│   │   ├── modals/              # Modal components
│   │   │   ├── LanguagePickerModal.tsx
│   │   │   ├── QrScannerModal.tsx
│   │   │   └── index.ts
│   │   └── index.ts             # Re-exports all sub-folders
│   ├── navigation/              # Navigation & layout helpers
│   │   ├── Footer.tsx
│   │   ├── LanguageNavButton.tsx
│   │   └── index.ts
│   └── index.ts                 # Root re-export
├── home/                        # Homepage features
│   ├── Hero.tsx
│   ├── HowItWorks.tsx
│   ├── OriginCountryPicker.tsx
│   ├── RouteAlertSubscription.tsx
│   └── index.ts
├── search/                      # Route search & browsing (sender view)
│   ├── SearchForm.tsx
│   ├── RouteCard.tsx
│   └── index.ts
├── booking/                     # Booking checkout flow
│   └── PaymentOption.tsx
├── driver/                      # Driver-specific features
│   ├── routes/                  # Route management (CRUD)
│   │   ├── DriverRouteCard.tsx
│   │   ├── RouteSummaryCard.tsx
│   │   └── index.ts
│   ├── stats/                   # Dashboard statistics
│   │   ├── StatCard.tsx
│   │   └── index.ts
│   ├── earnings/                # Revenue & earnings
│   │   ├── EarningsSummary.tsx
│   │   ├── RevenueChart.tsx
│   │   └── index.ts
│   └── index.ts                 # Root re-export
├── notifications/               # Alerts & notifications
│   ├── NotificationList.tsx
│   ├── RouteAlertList.tsx
│   ├── DriverBookingCard.tsx
│   └── index.ts
├── request/                     # Shipping request components
│   └── RequestCard.tsx
├── tracking/                    # Post-delivery tracking
│   └── ShipmentLabelModal.tsx
└── dev/                         # Dev tools & debugging
    └── DevRoleSwitcher.tsx
```

## Import Patterns

### From Primitives
```typescript
import { Button, Input, Skeleton } from '@/components/shared/ui/primitives';
```

### From Forms
```typescript
import { DateInput, CityPickerInput } from '@/components/shared/ui/forms';
```

### From a Feature (Barrel Export)
```typescript
import { DriverRouteCard, RouteSummaryCard } from '@/components/driver/routes';
import { EarningsSummary, RevenueChart } from '@/components/driver/earnings';
import { Hero, OriginCountryPicker } from '@/components/home';
```

### From Shared Root
```typescript
import { Button, Footer, LanguageNavButton } from '@/components/shared';
```

## Guidelines

1. **Never import deeply nested paths** — always use barrel exports (index.ts)
   - ❌ `from '@/components/shared/ui/primitives/Button'`
   - ✅ `from '@/components/shared/ui/primitives'` or `from '@/components/shared'`

2. **Primitives are the base layer** — forms, layouts, modals build on them
   - Primitives have no dependencies on other components
   - Forms can use primitives

3. **Feature folders are independent** — importing between driver/home/search is OK but avoid circular dependencies

4. **Shared UI is truly shared** — if a component is only used in one feature, move it to that feature folder

5. **Keep folders under 200 lines per file** — split large files into smaller components with a containing folder

## Adding New Components

1. **Determine the layer**: Is it a primitive, form, layout, modal, or feature-specific?
2. **Choose the folder**: Place in the appropriate directory
3. **Export from index.ts**: Add to the barrel export at that level
4. **Import from the barrel**: Use the short path from other files

## Example: Adding a new form input

```typescript
// Create the component
// components/shared/ui/forms/PhoneInput.tsx
export function PhoneInput(props: PhoneInputProps) { ... }

// Export from the forms barrel
// components/shared/ui/forms/index.ts
export { PhoneInput } from './PhoneInput';

// Use it
import { PhoneInput } from '@/components/shared/ui/forms';
```
