#!/usr/bin/env bash
# Syncs SEND_EMAIL_HOOK_SECRET to both places that need it, from one source
# value, in one command — this secret is self-invented (not issued by
# Supabase), so nothing keeps its two copies consistent on its own:
#   1. GoTrue's copy, set via `supabase config push` (auth.hook.send_email.secrets
#      in supabase/config.toml, using env(SEND_EMAIL_HOOK_SECRET))
#   2. auth-send-email-hook's own runtime copy, set via `supabase secrets set`
#
# GoTrue uses its copy to SIGN outgoing webhook calls; the function uses its
# copy to VERIFY that signature. Running these as two separate commands at
# different times let the two drift apart in production on 2026-07-27,
# producing a generic signature-verification failure with no indication two
# secrets even existed to compare. This script makes them unable to drift:
# there is exactly one value, read once, pushed to both — via
# safe-config-push.sh so the config diff still gets reviewed before it
# reaches production Auth config.
#
# Usage: ./scripts/sync-hook-secret.sh [project-ref]
# Defaults to the linked project (supabase/.temp/project-ref) if omitted.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "FAIL: ${ENV_FILE} not found." >&2
  exit 1
fi

SECRET=$(grep '^SEND_EMAIL_HOOK_SECRET=' "$ENV_FILE" | cut -d= -f2-)

if [[ -z "$SECRET" ]]; then
  echo "FAIL: SEND_EMAIL_HOOK_SECRET not set in ${ENV_FILE}." >&2
  exit 1
fi

PROJECT_REF="${1:-}"
PROJECT_REF_ARGS=()
if [[ -n "$PROJECT_REF" ]]; then
  PROJECT_REF_ARGS=(--project-ref "$PROJECT_REF")
fi

echo "==> Setting SEND_EMAIL_HOOK_SECRET on auth-send-email-hook (function runtime copy)"
npx supabase secrets set SEND_EMAIL_HOOK_SECRET="$SECRET" "${PROJECT_REF_ARGS[@]}"

echo "==> Pushing auth config so GoTrue's copy (used to sign webhook calls) matches"
"${REPO_ROOT}/scripts/safe-config-push.sh" "${PROJECT_REF_ARGS[@]}"

echo "==> Redeploying auth-send-email-hook so it picks up the new runtime secret"
npx supabase functions deploy auth-send-email-hook "${PROJECT_REF_ARGS[@]}" --no-verify-jwt

echo "PASS: SEND_EMAIL_HOOK_SECRET synced to both GoTrue and auth-send-email-hook from ${ENV_FILE}."
