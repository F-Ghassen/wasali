# Email Service

Consolidated transactional email system for Wasali, built on Resend +
React Email. Supersedes `docs/route-alert-email-setup.md`'s
deployment/troubleshooting content (kept only as a historical alert-matching
reference).

## Deploying changes to this system

No local Supabase/Docker stack exists in this project (see root `CLAUDE.md`),
so every deploy here is a change to production, verified against production —
there is no safe local rehearsal step. In order:

1. `cd supabase/functions && deno task test` — fast, mocked-I/O checks.
   Catches logic bugs; does **not** catch runtime/platform-wiring bugs (see
   the JSX and Content-Type incidents below) since `fetch` and the Deno
   bundler behavior are both stubbed/local here, not the real thing.
2. `supabase functions deploy <name> --no-verify-jwt` (only functions called
   directly by Supabase Auth/webhooks, not by an authenticated client, need
   `--no-verify-jwt`).
3. `./scripts/safe-config-push.sh` instead of a raw `supabase config push`,
   whenever `supabase/config.toml` changed — forces a diff review before
   anything reaches production Auth config.
4. `./scripts/smoke-test-auth-email-hook.sh` (or
   `smoke-test-email-service.sh` for the other functions) — a real HTTP
   call against the deployed function, polling `email_log` for
   `status = 'sent'`, not just an HTTP 200. This is the step that actually
   proves an email was sent, and the one step every incident documented
   below would have been caught by immediately instead of via live,
   manual debugging.

`SEND_EMAIL_HOOK_SECRET` specifically is never set by hand — see
`scripts/sync-hook-secret.sh` below.

## Architecture

```
supabase/functions/_shared/email/
  client.ts          # sendEmail() — thin fetch() wrapper over Resend, never throws
  types.ts            # EmailType, SendEmailInput/Result
  senders.ts          # from/replyTo config per email type
  log.ts               # insertEmailLog() / updateEmailLog()
  render.ts            # renderTemplate(type, props) -> { subject, html }
  templates/
    BookingEmail.ts             # 6 variants (new_booking, booking_confirmed, in_transit,
                                 #   delivered, booking_cancelled, weight_adjusted)
    RouteAlertEmail.ts
    OfferAcceptedEmail.ts
    SignupConfirmationEmail.ts
    PasswordResetEmail.ts
    _components/Layout.ts, styles.ts
```

**All template/render files are `.ts`, not `.tsx`, and use
`React.createElement()` directly — not JSX syntax.** This was a deliberate
correction after production testing: Supabase's *hosted* edge runtime does
not apply a JSX-to-`createElement` transform at deploy time, even though
local `deno run`/`deno test` do (and even with an explicit `import React`
in scope). JSX shipped as-is produced a runtime `ReferenceError: React is
not defined` in production, silently swallowed by `sendEmail()`'s
never-throws contract as `emailsSent: 0` with no error surfaced to the
caller — only visible in the function's own structured logs
(`{"event":"email_attempt_threw","error":"React is not defined"}`). See
"Known limitation: no JSX in this runtime" below.

Four call sites use this core:

| Function | Trigger | Notes |
|---|---|---|
| `notify-booking-event` | Supabase DB webhook on `bookings` UPDATE | All 3 side effects (notification insert, push, email) are independently soft-failed — handler always returns 200 once event/route/profile resolve, so Supabase never retries and never double-inserts a notification. |
| `notify-route-alert` | Direct HTTP call from `stores/driverRouteStore.ts` `publishRoute()` — **not** a DB webhook (a prior doc incorrectly described this as trigger-based) | Per-recipient try/catch — one bad send doesn't block the rest of the batch. |
| `accept-offer` | Client call from `stores/requestStore.ts` `acceptOffer()` | New in this build — previously sent zero notifications. Synchronous/awaited. |
| `auth-send-email-hook` | Supabase Auth `send_email` Hook | New in this build. See "Auth email hook" below. |

`sendEmail()` never throws — every call site treats a failed send as data
(`{ ok: false, errorDetail }`), not an exception. This is what fixes
`notify-booking-event`'s original bug: a thrown error inside the handler
used to 500 the whole webhook, causing Supabase to retry it — and the
`notifications` insert (which had already succeeded before the throw) would
fire a second time.

## `email_log` table

One row per send attempt, inserted `queued` before the Resend call and
updated to `sent`/`failed` after (migration `057_email_log.sql`). This
means a mid-flight crash still leaves an observable record instead of
silent data loss. Columns: `email_type`, `recipient_email`, nullable FKs
(`user_id`, `booking_id`, `route_alert_id`, `request_id`), `status`,
`provider_message_id` (Resend's `id`), `error_detail`, timestamps.

RLS is enabled with no policies — service-role (edge functions) only, since
this is write-only observability infra, not a user-facing feature.

A stuck `queued` row (crash before the update) is detectable with:

```sql
SELECT * FROM email_log WHERE status = 'queued' AND created_at < now() - interval '1 hour';
```

Resend's delivery/bounce webhooks (`email.delivered`, `email.bounced`,
`email.complained`) are **not** consumed yet — `queued`/`sent`/`failed`
already covers debugging on an unverified sandbox domain. `provider_message_id`
is stored specifically so a future `resend-webhook` function can update
rows by that column with zero schema change.

## Adding a new email type ("plug-and-play" contract)

To add a new transactional email (e.g. a payment receipt), touch exactly:

1. A new template file in `_shared/email/templates/`.
2. An entry in `senders.ts` if it needs a distinct `from`/`replyTo`.
3. A new free-text `email_type` string — no migration needed, the column is
   deliberately not an enum.
4. A 4-line call at the trigger site: `renderTemplate(...)` →
   `insertEmailLog(...)` → `sendEmail(...)` → `updateEmailLog(...)`.

Do **not** touch `client.ts`, `log.ts`, `render.ts`, the `057_email_log.sql`
migration, or any existing template.

**New templates must use `React.createElement()`, not JSX syntax** — see
"Known limitation: no JSX in this runtime" below. Copy an existing
template's structure rather than writing `<Tag>...</Tag>` markup.

## Known limitation: no JSX in this runtime

Supabase's hosted edge runtime does not transform JSX at deploy time.
`deno.json`'s `jsx`/`jsxImportSource` compiler options, and local
`deno run`/`deno test`, both handle JSX correctly — this is a difference
between the local Deno CLI and Supabase's own bundling/execution
pipeline specifically, confirmed by deploying and invoking the function in
production (not caught by 66 passing local Deno tests, since those exercise
the same local-CLI JSX handling that masked the bug).

Every template and `render.ts` uses `React.createElement()` (aliased `e`)
instead of JSX. This works identically regardless of whether a JSX
transform is applied, so it's portable across local testing and the
deployed runtime. If you see `<Tag>` syntax reintroduced in a `.tsx` file
under `_shared/email/`, that's a regression — it will pass local tests and
`deno run`, then silently fail (`ok: false`, no email sent) only once
deployed. There is no compiler flag fix for this; avoid JSX in this
directory entirely.

## Auth email hook

Supabase Auth's own SMTP relay (already pointed at Resend, see
`[auth.email.smtp]` in `config.toml`) sends unstyled default emails with no
observability. To route signup confirmation and password reset through the
same templates + `email_log`, this build registers Supabase's **`send_email`
Auth Hook** (`supabase/functions/auth-send-email-hook`), which fully
replaces Supabase's default send for the action types it handles.

- Supabase signs the hook payload per the Standard Webhooks spec (HMAC),
  verified in `verifyPayload()` using `npm:standardwebhooks`.
- The hook secret (`SEND_EMAIL_HOOK_SECRET`, format `v1,whsec_<base64>`) is
  a **separate secret from `RESEND_API_KEY`**, provisioned the same way
  (`supabase secrets set`) — see `terraform/TERRAFORM.md` step 7.
- Only `signup` and `recovery` action types are handled
  (`SUPPORTED_ACTIONS` in `auth-send-email-hook/index.ts`); any other
  action type (`magiclink`, `email_change`, `invite`, `reauthentication`)
  fails closed with a 400 rather than silently dropping the email —
  extend `SUPPORTED_ACTIONS` + add a template if those are needed later.
- **Must be deployed with JWT verification disabled at the gateway**
  (`[functions.auth-send-email-hook] verify_jwt = false` in `config.toml`,
  or `supabase functions deploy auth-send-email-hook --no-verify-jwt`).
  Supabase Auth calls this hook directly with its own Standard Webhooks
  signature — not a client JWT — so with the gateway's default JWT check
  left on, every call 401s with `UNAUTHORIZED_NO_AUTH_HEADER` **before it
  ever reaches this function's own signature verification**. This is a
  real trap: the function looks correctly deployed (`ACTIVE`, no errors)
  and passes its own unit tests, but silently never fires for real
  signups. Confirmed by testing a real signup in production — no email,
  no `email_log` row, and a raw `curl` to the function URL returned the
  gateway's 401 rather than the function's own `{"error":"Invalid
  signature"}`. Fixed by redeploying with `--no-verify-jwt` and adding the
  `[functions.auth-send-email-hook]` block to `config.toml` so it isn't a
  flag someone has to remember on every future deploy.

### Local vs. production

`enable_confirmations = true` and `[auth.hook.send_email]` are enabled in
**local `config.toml` only**. Production stays `enable_confirmations = false`
until a custom domain is verified (SPF/DKIM/DMARC) — Resend's shared
sandbox domain risks real users' confirmation emails landing in spam or
being rejected outright. Turning on confirmations without fixing
deliverability first would make the exact flow being enabled unreliable in
production. Do not flip this in `terraform/supabase.tf` /
`supabase_settings.auth` until that follow-up lands.

`auth.rate_limit.email_sent` was bumped from the default `2`/hour to `30`
in local `config.toml` — the default is unusable for manually testing
signup/reset more than once. Production has no equivalent knob in the
current Terraform `supabase_settings.auth` schema (dashboard-only);
verify the live value before enabling confirmations there.

## Configuration

- **Secrets**: `RESEND_API_KEY` (existing, reused) and `SEND_EMAIL_HOOK_SECRET`
  (new). Both set via `supabase secrets set` per `terraform/TERRAFORM.md`.
  `RESEND_API_KEY` has two independent provisioning paths that must stay in
  sync: a Terraform var feeding Auth SMTP (`terraform/supabase.tf`), and a
  CLI-set Edge Function secret.
- **`RESEND_API_KEY_TEST`** — a separate GitHub Actions repo secret (Settings
  → Secrets and variables → Actions), distinct from the production
  `RESEND_API_KEY` above. Used only by the CI smoke test (see Testing
  section) so PR runs never touch the production Resend key. A free-tier
  Resend key is sufficient.
- **Sender addresses**: centralized in `senders.ts`, not env vars — these
  are branding/routing decisions, not secrets, and a future domain
  migration changes all of them at once (one file, not N env vars across
  environments).
- **React Email tooling**: `supabase/functions/deno.json` sets
  `jsx: "react-jsx"` / `jsxImportSource: "npm:react@19"` for local
  type-checking/testing convenience — it has no effect on the deployed
  runtime (see "Known limitation: no JSX in this runtime" above; templates
  use `React.createElement()`, not JSX, specifically because this config
  doesn't carry through to production). React is pinned to v19 because
  `@react-email/render`'s current version depends on `react-dom@19`.
- **Sending domain**: still Resend's shared sandbox — `wasali.app` is
  **not verified** in Resend as of this build. Every `@wasali.app` send
  gets a 403 (`"The wasali.app domain is not verified"`). `senders.ts` is
  currently pointed at Resend's own verified sandbox sender
  (`onboarding@resend.dev`) for all 5 email types as a stopgap so sends
  succeed at all — confirmed via a real production test (`notify-route-alert`
  and `accept-offer` both delivered real emails end-to-end with this
  sender). Switch `senders.ts`'s `USING_TEMP_SANDBOX_SENDER` flag to `false`
  once `wasali.app` is verified in the Resend dashboard (Domains → Add
  Domain → add the SPF/DKIM DNS records at your registrar) — this was
  already a known pre-launch blocker (see Risks section below), just
  confirmed concretely by testing rather than only inferred from Resend's
  general domain-verification requirement.

## Testing

Edge function code uses Deno-native imports (`https://`, `npm:`) that
Vitest/Node cannot resolve, so these are **Deno tests**, not Vitest —
colocated with each function as `*.test.ts`:

```bash
cd supabase/functions
deno task test   # deno test --no-check --allow-env --allow-read --allow-net .
```

`--no-check` is required: the Deno type-checker has a known false-positive
with `npm:react`'s JSX runtime resolution under `npm:` specifiers (confirmed
via direct `deno run` — templates render correctly at runtime; only static
analysis is affected). This does not indicate a real type error.

Covered: `_shared/email/client.test.ts`, `log.test.ts`, `templates.test.ts`,
and one `index.test.ts` per call site (`notify-booking-event`,
`notify-route-alert`, `accept-offer`, `auth-send-email-hook`) — 66 tests
total as of this build. `fetch` is stubbed throughout — these tests never
perform a real Resend send, and **that is exactly why they didn't catch
the 2026-07-27 production bug**: the templates used JSX syntax, which
passed all 66 mocked tests (mocked `fetch` never exercises template
rendering against Supabase's actual deployed bundler) but produced
`ReferenceError: React is not defined` once genuinely invoked in
production. These tests prove the *logic* is correct under mocked I/O;
they do not prove the code runs at all on the real edge runtime. See the
CI smoke test below for the check that catches that class of bug.

App-side Vitest integration tests (`tests/integration/email-service.test.ts`)
assert directly against `email_log`/`notifications` tables via
`tests/helpers.ts`'s `adminClient`, rather than invoking deployed edge
functions over HTTP — that would trigger a real Resend call. Requires
`supabase start`.

### CI smoke test — real edge runtime, real Resend send

`.github/workflows/ci.yml`'s `email-service-smoke-test` job is the one
check in this whole suite that would have caught the JSX bug automatically,
because it's the only one that runs the actual code path Supabase's hosted
runtime executes end to end:

1. Only runs on PRs that touch `supabase/functions/_shared/email/**` or one
   of the 4 call sites (path-filtered via `dorny/paths-filter`) — it does a
   real Resend send every time it runs, so it's scoped rather than
   always-on.
2. Boots a full local Supabase stack (`supabase start`, same Docker-backed
   stack the `integration` job already uses) and runs
   `supabase functions serve` — this is the real Deno-based edge runtime,
   not `deno test`/`deno run` against the local Deno CLI. That distinction
   is the entire point: local `deno run` applied a JSX transform that
   Supabase's hosted bundler does not, and only running against the actual
   served function surfaces that gap.
3. `scripts/smoke-test-email-service.sh` seeds a throwaway driver/route/
   route-stops/route-alert directly via `psql` against the local DB,
   invokes `notify-route-alert` over real HTTP, then **polls `email_log`
   for `status = 'sent'`** — not just an HTTP 200. This is the second
   critical detail: `notify-route-alert` returned `200
   {"emailsSent":0}` throughout the actual production incident, a
   plausible-looking response that only a `status='sent'` assertion
   against `email_log` would catch.
4. Requires a **`RESEND_API_KEY_TEST`** repo secret — a real Resend API
   key (a free/test-tier key is fine; it is deliberately not the
   production key) — so the send genuinely reaches Resend's API. The
   recipient defaults to `delivered@resend.dev`, one of
   [Resend's documented test addresses](https://resend.com/docs/dashboard/emails/send-test-emails)
   that accept and acknowledge real API calls without delivering anywhere
   or counting against production sending reputation.
5. Cleans up its seeded fixtures on both the pass and fail path.

To run the same check locally (needs Docker/Colima, `psql`, and a real
Resend key exported as `RESEND_API_KEY`):

```bash
supabase start
supabase functions serve --env-file <(echo "RESEND_API_KEY=$RESEND_API_KEY") &
./scripts/smoke-test-email-service.sh
```

## Manual verification

No local Docker/Supabase stack was available when this was built and
tested, so verification happened directly against the linked production
project (`cxlxlisfvbfqtysgnklu`) via the REST API + direct function
invocation, using throwaway test accounts/data (created and cleaned up
via `curl` against `/auth/v1/signup` and `/rest/v1/*`, not through the app).
If a local stack becomes available later, the equivalent local flow is:

```bash
supabase functions serve

# notify-route-alert
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/notify-route-alert' \
  --header 'Authorization: Bearer <jwt>' \
  --header 'Content-Type: application/json' \
  --data '{ "routeId": "<uuid>" }'
```

Confirmed working end-to-end in production (real email delivered, correct
`email_log`/`notifications` rows):
- **`notify-route-alert`** — created a route + matching `route_alerts` row
  directly via REST, invoked the function with the route id, received the
  `RouteAlertEmail`.
- **`accept-offer`** — created a shipping request + offer via REST,
  invoked `accept-offer`, received the `OfferAcceptedEmail`.

**Not yet confirmed: `notify-booking-event`.** Its DB webhook (Dashboard →
Database → Webhooks → `notify-booking-event`, on `bookings` UPDATE) is
correctly configured — table/event/target function/headers all verified
correct in the dashboard — but updating a real test booking's `status`
never invoked the function at all (no log entry, not even a rejected
request). This means the webhook is failing to fire/deliver at the
Postgres `pg_net` level, before reaching the edge function — a layer this
session had no access to inspect (no service-role/direct-DB access, and
the CLI in use here has no `functions logs` command). The function's own
code is the same shared core already confirmed working in the other two
functions, so this is very unlikely to be a code bug — treat as a distinct
infrastructure issue. Next step: query `net._http_response` /
`pg_net.http_request_queue` directly via the SQL Editor for delivery
attempts/errors, or try recreating the webhook from scratch.

For the auth hook (once a domain is verified and it's safe to test):
sign up a test user with `enable_confirmations = true` and the hook
registered, confirm the styled template (not Supabase's default) renders,
and an `email_log` row with `email_type = 'auth_signup_confirmation'`
appears. **Do not register this hook in production** without also
verifying it end-to-end — during this build it was briefly registered in
production with a **mismatched secret** (the hook's `secrets` field is
provisioned separately from the edge function's own `RESEND_API_KEY`-style
secrets, via `supabase config push`'s `env(SEND_EMAIL_HOOK_SECRET)`
resolution against the *local shell environment*, not `.env.local` — if
that var isn't actually exported in the shell running the CLI, the push
silently registers an empty/wrong secret). This caused Supabase Auth to
call the hook with **zero** Standard Webhooks signature headers
(`"Missing required headers"`), so real signups silently never got a
confirmation email. It was disabled again via the dashboard once found.
Also confirmed separately: `supabase config push` pushes the *entire*
`config.toml`, not just the hook fields — pushing it once already
side-effected unrelated production Auth settings (`site_url`, `otp_length`,
sender branding, MFA TOTP) that had drifted from what's in this repo. If
registering this hook in production again, prefer a surgical
`PATCH https://api.supabase.com/v1/projects/{ref}/config/auth` call for
just `hook_send_email_*` fields (Management API, needs a
`SUPABASE_ACCESS_TOKEN`) over a full `config push`.

## 2026-07-28 incident: auth-send-email-hook silently not firing in production

Follow-up to the mismatched-secret incident described above. The hook was
tested again in production and still didn't deliver — three separate,
compounding bugs, found by working backwards from `email_log` (zero rows
ever for `auth_signup_confirmation`/`auth_password_reset`) and live test
calls against `/auth/v1/signup` and `/auth/v1/recover`:

1. **`auth.hook.send_email.uri` was `http://127.0.0.1:54321/...`** in the
   `config.toml` actually pushed to production — unreachable from
   Supabase's hosted infra, which has no way to reach a developer's
   laptop. `supabase config push --linked` confirmed the *live* remote
   value was `enabled = false, uri = ""`, contradicting an in-file comment
   that claimed the hook was already correctly pointed at production.
   Fixed by setting `uri` to the real
   `https://<project-ref>.supabase.co/functions/v1/auth-send-email-hook`
   and pushing via the reviewed flow below.
2. **`SEND_EMAIL_HOOK_SECRET` drift** between GoTrue's copy (set via
   `config push`) and the function's runtime copy (set via
   `supabase secrets set`) — two independent commands, no built-in
   consistency check, so nothing catches them silently diverging over
   time. Symptom: hook reachable (500 propagated to the client instead of
   silence) but zero `email_log` rows, meaning it failed before
   `insertEmailLog` — i.e. in signature verification.
3. **Every `Response` in `auth-send-email-hook/index.ts` was missing
   `Content-Type: application/json`**, defaulting to `text/plain`, which
   GoTrue rejects outright (`hook_payload_invalid_content_type`) —
   including on the 200 success path. This meant no signup/recovery email
   could ever have been reported as delivered to GoTrue, even when Resend
   successfully sent it. Fixed via a shared `jsonResponse()` helper in
   `index.ts`; regression-covered by a `Content-Type` assertion added to
   `index.test.ts`'s existing response-path tests.

None of these were caught by the 66 mocked-`fetch` Deno unit tests, for the
same structural reason as the 2026-07-27 JSX bug above: mocked tests
exercise application logic, not the actual HTTP contract between GoTrue and
the deployed function. Closing that gap:

- **`scripts/smoke-test-auth-email-hook.sh`** — calls the real
  `/auth/v1/recover` endpoint (not `/signup`, since Resend's unverified
  sandbox domain only accepts sends to the account owner's own address —
  see "Known follow-ups" below) and polls `email_log` for
  `status = 'sent'`, the same real-runtime-real-send pattern as
  `smoke-test-email-service.sh`. Run this after any deploy or config push
  that touches the hook.
- **`scripts/safe-config-push.sh`** — wraps `supabase config push` with a
  mandatory diff review of `supabase/config.toml` before it goes to
  production Auth config. The localhost-URI bug above was an uncommitted
  local edit pushed straight to prod with nothing showing what would
  actually change; this makes that diff impossible to miss.
- **`scripts/sync-hook-secret.sh`** — the only supported way to change
  `SEND_EMAIL_HOOK_SECRET`. Reads it once from `.env.local` and pushes it
  to both GoTrue (via `safe-config-push.sh`) and the function's runtime
  secrets, then redeploys the function so the new value actually takes
  effect (a secret change alone does not update an already-deployed
  function without a fresh deploy).

## Known follow-ups (out of scope for this build)

- **Custom domain verification (blocking)** — `wasali.app` is not verified
  in Resend; every real send from an `@wasali.app` address 403s. Confirmed
  concretely during production testing, not just inferred. Blocks both
  reverting `senders.ts` off the temporary sandbox sender and enabling
  `enable_confirmations` in production.
- **`notify-booking-event`'s DB webhook delivery** — configured correctly
  in the dashboard but not observed to fire in testing; needs direct
  Postgres/`pg_net` access to diagnose further (see above).
- Resend delivery/bounce webhook consumer — additive, no schema change
  needed when built (see `email_log`'s `status`/`provider_message_id`
  columns above).
- Terraform rate-limit parity check for `auth.rate_limit.email_sent` in
  production.
- `terraform/supabase.tf` does not reflect `enable_confirmations` or
  `[auth.hook.send_email]` — both were only ever applied ad hoc via
  `supabase config push`/dashboard toggles during testing, not Terraform.
  Decide the real production posture for these (keep off until domain
  verification, per the plan) and encode it in Terraform once decided, so
  a future `terraform apply` has a correct, intentional value rather than
  reverting an untracked manual change.
