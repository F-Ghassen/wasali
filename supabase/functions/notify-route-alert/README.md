# notify-route-alert Edge Function

Serverless function that sends email and in-app notifications when routes are published.

## Overview

When a driver publishes a new route:
1. Function is triggered automatically
2. Finds all matching route alerts
3. Sends HTML emails to all users (via Resend)
4. Creates in-app notifications for signed-in users

## Deployment

### Prerequisites
```bash
# Have Supabase CLI installed
# Have RESEND_API_KEY from Resend dashboard
```

### Deploy Function
```bash
# Deploy the function
supabase functions deploy notify-route-alert

# Set environment variables
supabase secrets set RESEND_API_KEY=your_api_key

# View logs
supabase functions logs notify-route-alert --tail
```

### Test Locally
```bash
# Start Supabase
supabase start

# Invoke function
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/notify-route-alert' \
  --header 'Authorization: Bearer <jwt-token>' \
  --header 'Content-Type: application/json' \
  --data '{ "routeId": "550e8400-e29b-41d4-a716-446655440000" }'
```

## API

### Request
```typescript
POST /functions/v1/notify-route-alert

{
  "routeId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response (Success)
```json
{
  "message": "Alerts sent successfully",
  "emailsSent": 15,
  "alertsMatched": 15
}
```

### Response (No Matches)
```json
{
  "message": "No matching alerts found"
}
```

### Response (Error)
```json
{
  "error": "Route not found or not active"
}
```

## How It Works

### Step 1: Get Route Details
```sql
SELECT id, origin_city, destination_city, price_per_kg_eur, departure_date
FROM routes
WHERE id = $1 AND status = 'active'
```

### Step 2: Find Matching Alerts
```sql
SELECT id, email, user_id
FROM route_alerts
WHERE origin_city = $1
  AND destination_city = $2
  AND (date_from IS NULL OR date_from <= $3)
```

**Date Matching Logic:**
- If route has no departure_date: match alerts with no date restriction
- If route has departure_date: match alerts with date_from ≤ departure_date

### Step 3: Send Emails
Using Resend API:
```typescript
POST https://api.resend.com/emails

{
  "from": "alerts@wasali.app",
  "to": "user@example.com",
  "subject": "🚚 New Route: Paris → Tunis",
  "html": "<html>...</html>"
}
```

### Step 4: Create Notifications
For signed-in users only:
```sql
INSERT INTO notifications (user_id, type, message)
VALUES ($1, 'route_alert_match', $2)
```

## Configuration

### Email Sender
Update in `index.ts` line 140:
```typescript
from: "alerts@wasali.app", // Change this
```

### Email Template
Customize in `formatEmailContent()` function (line 200+)

### Notification Type
Update in `createUserNotifications()` (line 175):
```typescript
type: "route_alert_match", // Change type if needed
```

### Matching Logic
Adjust in `findMatchingAlerts()` (line 64+)

## Error Handling

### Request Validation
```typescript
if (req.method !== "POST") // 405 Method not allowed
if (!routeId) // 400 Missing routeId
```

### Route Validation
```typescript
if (!route) // 404 Route not found or not active
```

### Email Service
```typescript
if (!resendApiKey) // 500 RESEND_API_KEY not set
// Errors logged, continue with next email
```

## Logging

All operations logged to console:
```typescript
// Route found
console.log(`Found route: ${route.origin_city} → ${route.destination_city}`);

// Matching alerts
console.log(`Found ${matchedAlerts.length} matching alerts`);

// Email sent
console.log(`Email sent to ${alert.email}`);

// Error
console.error("Error in notify-route-alert:", error);
```

View logs:
```bash
supabase functions logs notify-route-alert --tail
```

## Performance

### Single Route
- Get route: ~50ms
- Find alerts (1000): ~100ms
- Send emails (15): ~3000ms (200ms each)
- Create notifications: ~100ms
- **Total: ~3.2 seconds**

### Optimization Tips
1. Batch email requests (currently sequential)
2. Cache frequently searched cities
3. Index on (origin_city, destination_city)
4. Limit alerts returned (paginate if needed)

## Testing

### Manual Test 1: Valid Request
```bash
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/notify-route-alert' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --header 'Content-Type: application/json' \
  --data '{ "routeId": "550e8400-e29b-41d4-a716-446655440000" }'
```

### Manual Test 2: Missing Route ID
```bash
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/notify-route-alert' \
  --header 'Authorization: Bearer ...' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

Response: `400 Bad Request`

### Manual Test 3: Non-existent Route
```bash
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/notify-route-alert' \
  --header 'Authorization: Bearer ...' \
  --header 'Content-Type: application/json' \
  --data '{ "routeId": "00000000-0000-0000-0000-000000000000" }'
```

Response: `404 Not Found`

## Security

### Authentication
- Uses Supabase JWT token
- Service role key for database access
- CORS enabled for frontend

### Data Protection
- No sensitive data in logs
- Emails not stored in response
- Route details only used for matching

### Rate Limiting
- Not yet implemented
- Could add per-route rate limit
- Could add per-email rate limit

## Monitoring

### Key Metrics
- Emails sent per day
- Email delivery rate
- Function execution time
- Error rate by type

### Alerts to Set Up
1. High error rate (>5%)
2. Long execution time (>10s)
3. No matching alerts (<5/day could indicate issue)

### Logs to Review
```bash
# View recent invocations
supabase functions list

# Stream live logs
supabase functions logs notify-route-alert --tail

# Search for errors
supabase functions logs notify-route-alert --tail | grep error
```

## Troubleshooting

### Problem: "RESEND_API_KEY not set"
**Solution**: Set the environment variable
```bash
supabase secrets set RESEND_API_KEY=your_api_key
supabase secrets list  # Verify
```

### Problem: "Route not found or not active"
**Possible Causes:**
- Route ID is incorrect
- Route status is not 'active'
- Route was deleted
- Wrong project/database

**Solution:**
- Verify route exists: `SELECT * FROM routes WHERE id = '...'`
- Check status: `SELECT status FROM routes WHERE id = '...'`

### Problem: "Email service not configured"
**Possible Causes:**
- RESEND_API_KEY not set
- Invalid API key
- Resend service down

**Solution:**
- Verify API key: `supabase secrets list`
- Test Resend directly: `curl https://api.resend.com/emails ...`
- Check Resend status page

### Problem: Emails not sent but no errors
**Possible Causes:**
- Email address invalid
- Sender not verified in Resend
- Rate limited by Resend
- Network issue

**Solution:**
- Check logs for specific errors
- Verify email format in alerts
- Check Resend dashboard
- Review Resend rate limits

## Cost Estimation

### Resend Pricing
- $20/month: up to 100K emails
- Additional: $20 per 100K emails

### Usage Example
```
10 routes/day × 50 alerts/route × 30 days = 15K emails/month
→ Well under free tier (100K)

100 routes/day × 50 alerts/route × 30 days = 150K emails/month
→ $30/month for email service
```

## Future Enhancements

1. **Batch Notifications**
   - Send one email summarizing all daily routes
   - Let users choose immediate or daily digest

2. **Email Verification**
   - Verify emails before sending
   - Reduce bounce rate

3. **Smart Scheduling**
   - Send emails at preferred time zones
   - Reduce delivery failures

4. **Template Variations**
   - A/B test different templates
   - Track open/click rates

5. **Advanced Filtering**
   - Filter by price range
   - Filter by weight capacity
   - Custom preferences

## Related Files

- **Service Wrapper**: `app/route-alert/services/routeNotificationService.ts`
- **Route Store**: `stores/driverRouteStore.ts` (publishRoute method)
- **Route Alert Feature**: `app/route-alert/README.md`
- **Setup Guide**: `docs/route-alert-email-setup.md`

## Support & Documentation

- [Route Alert Feature Documentation](../../app/route-alert/README.md)
- [Email Setup & Deployment Guide](../../docs/route-alert-email-setup.md)
- [Resend API Documentation](https://resend.com/docs)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
