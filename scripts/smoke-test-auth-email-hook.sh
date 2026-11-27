#!/usr/bin/env bash
# Smoke-tests auth-send-email-hook against the REAL deployed function and
# GoTrue's live Auth config — not the mocked-fetch unit tests in
# index.test.ts. This is the check that would have caught all three bugs
# found in production on 2026-07-28:
#   1. auth.hook.send_email.uri pointing at an unreachable localhost address
#      (hook never invoked, GoTrue returned a clean 200 to the client anyway)
#   2. SEND_EMAIL_HOOK_SECRET drift between GoTrue's copy and the function's
#      runtime copy (signature verification failing, hook invoked but 500)
#   3. Missing Content-Type: application/json on every Response in
#      index.ts, causing GoTrue to reject even a successful send
#      (hook_payload_invalid_content_type)
#
# Deliberately calls POST /auth/v1/recover (password reset) against an
# EXISTING, already-confirmed user rather than /auth/v1/signup — Resend's
# sandbox mode (no verified custom domain yet, see docs/email-service.md)
# only allows sending to the Resend account owner's own address, and a
# brand-new signup email would just hit that 403 instead of exercising the
# hook wiring this test cares about. Run this after every deploy or
# `supabase config push` that touches the send_email hook.
#
# Requires: SEND_EMAIL_HOOK_SMOKE_TEST_EMAIL set to an existing, confirmed
# user's email that Resend is currently allowed to send to (see
# docs/email-service.md's sandbox-domain note). Reads
# EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY from .env.local.
#
# Usage: SEND_EMAIL_HOOK_SMOKE_TEST_EMAIL=you@example.com ./scripts/smoke-test-auth-email-hook.sh

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "FAIL: ${ENV_FILE} not found." >&2
  exit 1
fi

SUPABASE_URL=$(grep '^EXPO_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
ANON_KEY=$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2-)
TEST_EMAIL="${SEND_EMAIL_HOOK_SMOKE_TEST_EMAIL:-}"

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  echo "FAIL: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not set in ${ENV_FILE}." >&2
  exit 1
fi

if [[ -z "$TEST_EMAIL" ]]; then
  echo "FAIL: set SEND_EMAIL_HOOK_SMOKE_TEST_EMAIL to an existing, confirmed user's email." >&2
  echo "      (Resend sandbox mode only allows sending to the account owner's own address" >&2
  echo "      until a custom domain is verified — see docs/email-service.md.)" >&2
  exit 1
fi

echo "==> Triggering password recovery for ${TEST_EMAIL}"

HTTP_STATUS=$(curl -s -o /tmp/smoke-test-auth-hook-response.json -w "%{http_code}" \
  --request POST "${SUPABASE_URL}/auth/v1/recover" \
  --header "apikey: ${ANON_KEY}" \
  --header 'Content-Type: application/json' \
  --data "{\"email\": \"${TEST_EMAIL}\"}")

RESPONSE=$(cat /tmp/smoke-test-auth-hook-response.json)
rm -f /tmp/smoke-test-auth-hook-response.json

echo "    Response (${HTTP_STATUS}): ${RESPONSE}"

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "FAIL: expected HTTP 200 from /auth/v1/recover, got ${HTTP_STATUS}." >&2
  echo "      A non-200 here means the send_email hook is unreachable, misconfigured," >&2
  echo "      or failing before ever sending — see auth-send-email-hook's logs in the" >&2
  echo "      Supabase dashboard for the exact error." >&2
  exit 1
fi

echo "==> Polling email_log for status='sent' (up to 10s)"
echo "    (requires: supabase CLI linked to this project — run 'supabase link' if this fails)"

STATUS=""
for _ in $(seq 1 10); do
  STATUS=$(npx supabase db query \
    "select status from email_log where recipient_email = '${TEST_EMAIL}' and email_type = 'auth_password_reset' order by created_at desc limit 1;" \
    --linked 2>/dev/null | python3 -c "import json,sys; rows=json.load(sys.stdin).get('rows',[]); print(rows[0]['status'] if rows else '')" 2>/dev/null || true)
  if [[ "$STATUS" == "sent" ]]; then
    break
  fi
  sleep 1
done

echo "    email_log.status = ${STATUS:-<none>}"

if [[ "$STATUS" != "sent" ]]; then
  echo "FAIL: email_log never reached status='sent' for ${TEST_EMAIL} (last seen: '${STATUS:-<none>}')." >&2
  echo "      GoTrue returned 200, but the hook either wasn't invoked, failed before" >&2
  echo "      logging, or Resend rejected the send — check auth-send-email-hook's" >&2
  echo "      dashboard logs for the exact error (this is exactly the failure mode" >&2
  echo "      from 2026-07-28: a client-visible 200 with no email actually sent)." >&2
  exit 1
fi

echo "PASS: auth-send-email-hook smoke test succeeded (real GoTrue call, real hook invocation, real Resend send, email_log confirmed 'sent')"
