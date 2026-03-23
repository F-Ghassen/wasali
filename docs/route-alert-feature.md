# Route Alert Feature

## Overview
The route alert feature allows both signed-in and non-signed-in users to subscribe to notifications when drivers publish matching routes.

## Architecture

### File Structure
```
app/route-alert/
├── components/
│   ├── RouteAlertModal.tsx          # Main modal component
│   ├── CityPickerModal.tsx          # City selection modal
│   └── InlineDatePicker.tsx         # Date picker component
├── services/
│   └── routeAlertService.ts         # Supabase API layer
└── types/
    └── index.ts                     # TypeScript interfaces
```

### Key Components

#### RouteAlertModal.tsx (365 lines)
- Main modal for creating route alerts
- Handles form state and validation
- Displays different UI for signed-in vs. non-signed-in users
- Manages city and date selection
- Handles alert submission and success state

#### CityPickerModal.tsx (106 lines)
- Reusable city selection modal
- Supports search functionality
- Groups cities by country with flags
- Shows only available cities (filters `coming_soon`)

#### InlineDatePicker.tsx (130 lines)
- Calendar date picker
- Prevents selection of past dates
- Shows current month with navigation
- Supports optional date selection

#### routeAlertService.ts (42 lines)
- `createRouteAlert()` - Saves alert to database
- `createAlertNotification()` - Creates in-app notification for signed-in users
- Clean separation of API logic from components

## User Flows

### Non-Signed-In User
1. Click "Set up alerts" on home page
2. Select origin and destination cities
3. **Enter email address** (required field)
4. Optionally select departure date
5. Submit to create alert
6. Alert saved with `user_id: null, email: provided`

### Signed-In User
1. Click "Set up alerts" on home page
2. Select origin and destination cities
3. Email auto-filled from profile (hidden)
4. Optionally select departure date
5. Submit to create alert
6. Alert saved with `user_id: uuid, email: profile email`
7. In-app notification created

## Database Schema

### route_alerts table
```sql
{
  id: uuid,
  user_id: uuid | null,           -- null for non-signed-in users
  email: string | null,            -- required, always populated
  origin_city: string,
  origin_city_id: uuid | null,
  destination_city: string,
  destination_city_id: uuid | null,
  date_from: date | null,          -- optional departure date
  created_at: timestamp
}
```

### Unique Constraint
- Either `user_id` OR `email` must be provided (not both required)
- Allow duplicates by design (users can have multiple alerts)

## Internationalization

### Translations Available
- **English** (en)
- **French** (fr)

### Locale Keys
All translations under `routeAlertModal`:
- `title` - Modal header
- `description` - Alert explanation
- `fromLabel`, `toLabel` - City labels
- `emailLabel`, `emailPlaceholder` - Email field
- `dateLabel`, `dateHint`, `dateSelected` - Date picker
- `notifyBtn`, `savingBtn` - Button states
- `successTitle`, `successDesc`, `successWithDate` - Success messages
- `doneBtn` - Done button
- `errorMsg` - Error message
- `cityPicker.originTitle`, `cityPicker.destinationTitle` - City picker titles
- `cityPicker.searchPlaceholder` - City search placeholder

## Testing

### Unit Tests (tests/unit/route-alert.test.ts)
- ✅ 8 passing tests
- Tests payload preparation and validation
- No database dependency

### Integration Tests (tests/integration/route-alert.test.ts)
- Requires running `supabase start`
- Tests actual Supabase operations
- Tests both signed-in and non-signed-in flows

### Run Tests
```bash
# Unit tests only
npm test -- tests/unit/route-alert.test.ts

# Integration tests (requires Supabase running)
npm test -- tests/integration/route-alert.test.ts
```

## Usage

### In Components
```tsx
import { RouteAlertModal } from '@/app/route-alert/components/RouteAlertModal';

// In your component
const [alertVisible, setAlertVisible] = useState(false);

<RouteAlertModal
  visible={alertVisible}
  profile={profile}  // { id, email } | null
  onClose={() => setAlertVisible(false)}
/>
```

### Service Layer
```tsx
import { createRouteAlert } from '@/app/route-alert/services/routeAlertService';

await createRouteAlert({
  userId: user?.id || null,
  email: user?.email || guestEmail,
  originCity: 'Paris',
  originCityId: null,
  destinationCity: 'Tunis',
  destinationCityId: null,
  dateFrom: null,
});
```

## Design Principles

### Separation of Concerns
- **Components**: UI rendering only
- **Services**: Database operations
- **Types**: Shared interfaces
- **No business logic in JSX**

### Reusability
- `CityPickerModal` - Can be used in other features
- `InlineDatePicker` - Can be reused for any date selection
- `routeAlertService` - Can be called from API routes or other services

### File Size Compliance
- All components under 400 lines
- Maximum complexity per file maintained
- Easy to understand and maintain

## Error Handling

### Submission Errors
- Displays error message: "Could not save alert. Please try again."
- User can retry without losing form data
- Error clears on new submission attempt

### Validation
- Required fields: `fromCity`, `toCity`, `email` (if not signed in)
- Optional: `dateFrom`, `originCityId`, `destinationCityId`
- Form submission disabled until requirements met

## Future Enhancements

1. **Email Verification**
   - Send verification link to non-signed-in users
   - Only notify after verification

2. **Alert Management**
   - View active alerts
   - Edit alert preferences
   - Delete alerts

3. **Smart Matching**
   - Filter by price range
   - Filter by weight capacity
   - Custom notification preferences

4. **Analytics**
   - Track alert creation by source
   - Monitor conversion to bookings
