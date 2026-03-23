# Route Alert Email Notifications - Setup & Deployment

## Overview
This document covers the email notification system for route alerts. When a driver publishes a route, all users with matching alerts receive:
- **Email notification** (for all users)
- **In-app notification** (for signed-in users only)

## Architecture

### Components
1. **Edge Function** (`notify-route-alert`)
   - Triggered when route status becomes 'active'
   - Finds matching alerts
   - Sends emails via Resend
   - Creates in-app notifications

2. **Notification Service** (`routeNotificationService.ts`)
   - Wraps edge function invocation
   - Provides error handling
   - Can be called from client or server

3. **Driver Route Store** (`driverRouteStore.ts`)
   - Calls notification service on route publish
   - Non-blocking (doesn't wait for notifications)

## Deployment Steps

### 1. Set Environment Variables
Add to your `.env.local`:
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
```

### 2. Deploy Edge Function
```bash
# Deploy the notify-route-alert function
supabase functions deploy notify-route-alert
```

To test locally:
```bash
# Start Supabase locally
supabase start

# Test the function
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/notify-route-alert' \
  --header 'Authorization: Bearer <your-jwt-token>' \
  --header 'Content-Type: application/json' \
  --data '{ "routeId": "550e8400-e29b-41d4-a716-446655440000" }'
```

### 3. Enable Network Requests (Supabase)
The edge function makes HTTP requests to Resend. Ensure your Supabase project allows outbound requests:
1. Go to Supabase Dashboard → Project Settings → Network
2. Verify "Realtime" is enabled
3. Add Resend's API endpoint to allowed domains if using allowlist

### 4. Set Up Email Domain
Use Resend to configure your sender email:
```typescript
// Current: from: "alerts@wasali.app"
// Update in notify-route-alert/index.ts line 140
```

To send from your domain:
1. Go to Resend Dashboard → Domains
2. Add and verify your domain
3. Update sender email in edge function

### 5. Verify Resend Integration
```bash
# Test email sending directly
curl https://api.resend.com/emails \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -d '{
    "from": "alerts@wasali.app",
    "to": "test@example.com",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

## How It Works

### Flow Diagram
```
Driver publishes route
         ↓
publishRoute() in driverRouteStore
         ↓
notifyRouteAlerts(routeId)
         ↓
Edge Function: notify-route-alert
         ├── Get route details
         ├── Find matching alerts
         ├── Send emails (Resend API)
         └── Create notifications (signed-in users only)
         ↓
Returns: { emailsSent, alertsMatched }
```

### Alert Matching Logic

Routes match alerts when:
1. **City Match**: `origin_city` and `destination_city` are the same
2. **Date Match**: (if route has departure_date)
   - Alert has no date restriction (date_from IS NULL), OR
   - Alert date is on or before route date (date_from ≤ departure_date)

```sql
-- Query logic
WHERE origin_city = 'Paris'
  AND destination_city = 'Tunis'
  AND (date_from IS NULL OR date_from <= '2026-06-15')
```

### Example Scenarios

**Scenario 1: No date restriction on alert**
- Alert: Paris → Tunis (no date)
- Route: Paris → Tunis, departs 2026-06-15
- Result: ✅ Match

**Scenario 2: Alert with specific date**
- Alert: Paris → Tunis, from 2026-06-10
- Route: Paris → Tunis, departs 2026-06-15
- Result: ✅ Match (alert date is before route date)

**Scenario 3: Alert date is too late**
- Alert: Paris → Tunis, from 2026-06-20
- Route: Paris → Tunis, departs 2026-06-15
- Result: ❌ No match

**Scenario 4: Non-signed-in user**
- Alert: Paris → Tunis (email: guest@example.com, user_id: NULL)
- Route: Paris → Tunis published
- Result: ✅ Email sent (no in-app notification)

## Email Template

The email includes:
- Route summary (origin → destination)
- Departure date (if available)
- Price per kg (if available)
- Link to view the route
- Unsubscribe link

Preview in `notify-route-alert/index.ts` line 200+

## Testing

### Unit Tests
```bash
npm test -- tests/unit/route-notification.test.ts
# ✅ 14 passing tests
# - Alert matching logic
# - Email content formatting
# - Notification creation
# - Error scenarios
```

### Integration Tests
```bash
npm test -- tests/integration/route-alert.test.ts
# Requires: supabase start
```

### Manual Testing

**Test 1: Non-signed-in user alert**
1. Create alert with email only: guest@example.com
2. Publish a matching route
3. Check: Email received from alerts@wasali.app

**Test 2: Signed-in user alert**
1. Create alert while signed in
2. Publish a matching route
3. Check: Email received + In-app notification created

**Test 3: Date filtering**
1. Create alert: Paris → Tunis, from 2026-06-20
2. Publish route: Paris → Tunis, departs 2026-06-15
3. Check: No email sent (date mismatch)

**Test 4: Edge function error handling**
1. Publish route with invalid ID
2. Check: Error logged, notifications still process other routes

## Monitoring

### Logs
Monitor edge function logs:
```bash
# View recent invocations
supabase functions list

# View specific function logs
supabase functions logs notify-route-alert --tail
```

### Metrics to Track
- Emails sent per day
- Notification success rate
- Average response time
- Error rate by type

### Alerting Setup
1. Go to Supabase Dashboard → Edge Functions
2. Set up alerts for:
   - Function errors
   - High response times
   - Invocation spikes

## Troubleshooting

### Problem: "RESEND_API_KEY not set"
**Solution**: Add `RESEND_API_KEY` to Supabase environment variables
```bash
supabase secrets set RESEND_API_KEY=your_key
```

### Problem: "Route not found or not active"
**Solution**: Ensure route status is 'active' before edge function runs
- Check: `routes.status = 'active'`
- Note: `publishRoute()` sets status to 'active'

### Problem: Emails not sent but no errors
**Solution**:
- Check Resend API key is valid
- Verify sender email is configured in Resend
- Check email address format is valid
- Review function logs: `supabase functions logs notify-route-alert`

### Problem: Duplicate emails sent
**Solution**:
- Ensure `publishRoute()` is only called once
- Check for duplicate alerts in `route_alerts` table
- Verify edge function is idempotent

## Configuration

### Email Sender
Edit in `notify-route-alert/index.ts`:
```typescript
// Line 140
from: "alerts@wasali.app", // Change this
```

### Email Template
Customize in `formatEmailContent()` function (line 200+)

### Notification Type
Change in `createUserNotifications()` (line 175):
```typescript
type: "route_alert_match", // Change to your type
```

### Matching Logic
Adjust date filtering in `findMatchingAlerts()` (line 64+)

## Performance Considerations

### Bulk Operations
For routes with 100+ matching alerts:
- Emails sent sequentially
- Each email takes ~200-500ms
- Total time: 20-50 seconds
- Runs asynchronously (doesn't block route publish)

### Database Queries
- Finding matching alerts: O(n) where n = total alerts
- Creating notifications: O(m) where m = signed-in users

### Optimization Ideas
1. Batch email sending (currently sequential)
2. Cache city-based alert counts
3. Implement alert deduplication
4. Add rate limiting per email

## Cost Estimation

### Resend Pricing
- $20/month for up to 100K emails
- Additional $20 per 100K emails
- Free: SMTP integration

### Calculation
```
10 routes/day × 50 alerts/route × 30 days
= 15,000 emails/month ✅ (within free tier)

100 routes/day × 50 alerts/route × 30 days
= 150,000 emails/month = $30/month
```

## Future Enhancements

1. **Email Verification**
   - Send verification link to non-signed-in users
   - Only notify after verification

2. **Smart Batching**
   - Send one email per day summarizing all new routes
   - Option for immediate or daily digest

3. **Preference Center**
   - Let users control notification frequency
   - Select preferred notification channels (email, push, SMS)

4. **A/B Testing**
   - Test different email templates
   - Track click-through rates

5. **Scheduled Notifications**
   - Queue notifications for off-peak hours
   - Improve deliverability

## Related Files

- **Edge Function**: `supabase/functions/notify-route-alert/index.ts`
- **Notification Service**: `app/route-alert/services/routeNotificationService.ts`
- **Route Store**: `stores/driverRouteStore.ts` (publishRoute method)
- **Route Alert Feature**: `docs/route-alert-feature.md`
- **Tests**: `tests/unit/route-notification.test.ts`
