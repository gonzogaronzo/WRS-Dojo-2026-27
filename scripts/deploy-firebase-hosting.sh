#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="wrs-firebase"
CONFIG_FILE="firebase.standalone.json"
EXPECTED_BRANCH="independent-hosting"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
  printf 'Refusing deploy: current branch is %s, expected %s.\n' "$CURRENT_BRANCH" "$EXPECTED_BRANCH" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Refusing deploy: working tree has uncommitted or untracked source changes.\n' >&2
  git status --short >&2
  exit 1
fi

printf 'Checking that local %s matches origin...\n' "$EXPECTED_BRANCH"
git fetch origin "$EXPECTED_BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$EXPECTED_BRANCH")"
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  printf 'Refusing deploy: local %s is not current.\n' "$EXPECTED_BRANCH" >&2
  printf 'Local:  %s\nRemote: %s\n' "$LOCAL_SHA" "$REMOTE_SHA" >&2
  printf 'Run: git pull --ff-only origin %s\n' "$EXPECTED_BRANCH" >&2
  exit 1
fi

printf 'Verifying current 2026-27 roster invariant...\n'
node --import tsx --test tests/current-roster.test.ts

printf 'Building standalone WRS Dojo...\n'
npm run build:standalone

printf 'Deploying standalone-dist to Firebase Hosting project %s...\n' "$PROJECT_ID"
npx firebase-tools@latest deploy \
  --only hosting \
  --config "$CONFIG_FILE" \
  --project "$PROJECT_ID"

printf 'Firebase Hosting deploy complete: https://wrs-firebase.web.app\n'
