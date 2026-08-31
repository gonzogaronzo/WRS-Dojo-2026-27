#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="wrs-firebase"
CONFIG_FILE="firebase.standalone.json"

printf 'Building standalone WRS Dojo...\n'
npm run build:standalone

printf 'Deploying standalone-dist to Firebase Hosting project %s...\n' "$PROJECT_ID"
npx firebase-tools@latest deploy \
  --only hosting \
  --config "$CONFIG_FILE" \
  --project "$PROJECT_ID"

printf 'Firebase Hosting deploy complete: https://wrs-firebase.web.app\n'
