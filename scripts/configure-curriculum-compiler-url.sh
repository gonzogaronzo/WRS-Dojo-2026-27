#!/usr/bin/env bash
set -euo pipefail

COMPILER_URL="${1:-}"
if [[ -z "$COMPILER_URL" ]]; then
  echo "Usage: bash scripts/configure-curriculum-compiler-url.sh https://YOUR-CLOUD-RUN-URL" >&2
  exit 2
fi

cat > .env.local <<EOF
VITE_WRS_COMPILER_URL=${COMPILER_URL%/}
EOF

echo "Wrote .env.local with VITE_WRS_COMPILER_URL=${COMPILER_URL%/}"
echo ".env.local is already excluded by the repository's .env* ignore rule."
