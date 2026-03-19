#!/usr/bin/env bash
set -euo pipefail

required=(
  "BSTACK_USERNAME"
  "BSTACK_ACCESS_KEY"
)

optional=(
  "BSTACK_MASTER_KEY"
  "BSTACK_BASE_URL"
  "BSTACK_HTTP_TIMEOUT_MS"
)

missing=0

echo "Required:"
for var in "${required[@]}"; do
  if [ -n "${!var:-}" ]; then
    echo "  [ok] $var"
  else
    echo "  [missing] $var"
    missing=1
  fi
done

echo
echo "Optional:"
for var in "${optional[@]}"; do
  if [ -n "${!var:-}" ]; then
    echo "  [set] $var"
  else
    echo "  [unset] $var"
  fi
done

exit "$missing"
