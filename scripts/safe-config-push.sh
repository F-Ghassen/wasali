#!/usr/bin/env bash
# Wraps `supabase config push` with the review step that was skipped on
# 2026-07-27: config.toml was edited locally (auth.hook.send_email.uri set
# to an unreachable localhost address) and pushed straight to production
# with no diff review, no commit — the comment above the line even claimed
# a different, correct value was live, while the line itself said
# otherwise. Nothing caught the mismatch because nothing looked.
#
# This script refuses to push if supabase/config.toml has uncommitted
# changes, unless you explicitly acknowledge the diff first. It does not
# replace judgement — it just guarantees the diff gets read once before
# it goes to a real Auth config that real users depend on.
#
# Usage: ./scripts/safe-config-push.sh [-- <extra supabase config push args>]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="supabase/config.toml"

cd "$REPO_ROOT"

if ! git diff --quiet -- "$CONFIG_FILE" || ! git diff --cached --quiet -- "$CONFIG_FILE"; then
  echo "==> Uncommitted changes to ${CONFIG_FILE}:"
  echo
  git --no-pager diff HEAD -- "$CONFIG_FILE"
  echo
  echo "This is what 'supabase config push' will apply to production Auth config."
  read -r -p "Push this exact diff to production? [y/N] " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted. Commit or revert ${CONFIG_FILE} before pushing." >&2
    exit 1
  fi
else
  echo "==> ${CONFIG_FILE} has no uncommitted changes (pushing committed state)."
fi

echo "==> Running: supabase --experimental config push $*"
npx supabase --experimental config push "$@"
