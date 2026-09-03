#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-wrs-firebase}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-wrs-curriculum-compiler}"
BUCKET_NAME="${BUCKET_NAME:-${PROJECT_ID}-wrs-curriculum-private}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-wrs-curriculum-compiler}"
EXPECTED_RELEASE_ID="${EXPECTED_RELEASE_ID:-WRS-CURRICULUM-1.0.1-2026-09-02}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://wrs-firebase.web.app}"
DATABASE_OBJECT="${DATABASE_OBJECT:-releases/1.0.1/WRS_Curriculum_Release_1.0.1.sqlite}"
DATABASE_PATH="${1:-}"

if [[ -z "$DATABASE_PATH" || ! -f "$DATABASE_PATH" ]]; then
  echo "Usage: bash scripts/deploy-curriculum-compiler.sh /absolute/path/to/WRS_Curriculum_Release_1.0.1.sqlite" >&2
  exit 2
fi

for command in gcloud; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "$command is required on the deployment machine." >&2
    exit 2
  fi
done

SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
GCS_URI="gs://${BUCKET_NAME}/${DATABASE_OBJECT}"

echo "Using project: ${PROJECT_ID}"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com

if ! gcloud storage buckets describe "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
  echo "Creating private curriculum bucket gs://${BUCKET_NAME}..."
  gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --location="$REGION" \
    --uniform-bucket-level-access
fi

echo "Uploading Release 1.0.1 SQLite database to ${GCS_URI}..."
gcloud storage cp "$DATABASE_PATH" "$GCS_URI"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" >/dev/null 2>&1; then
  echo "Creating compiler service account ${SERVICE_ACCOUNT}..."
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="WRS Curriculum Compiler"
fi

echo "Granting the compiler read-only access to the private curriculum bucket..."
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectViewer" >/dev/null

echo "Deploying Cloud Run service..."
gcloud run deploy "$SERVICE_NAME" \
  --source=curriculum-compiler \
  --region="$REGION" \
  --service-account="$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --set-env-vars="WRS_DATABASE_GCS_URI=${GCS_URI},EXPECTED_RELEASE_ID=${EXPECTED_RELEASE_ID},ALLOWED_ORIGINS=${ALLOWED_ORIGINS}"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')"

echo
echo "Compiler deployed: ${SERVICE_URL}"
echo "Next: put this exact value into .env.local as:"
echo "VITE_WRS_COMPILER_URL=${SERVICE_URL}"
echo
echo "Health check:"
echo "curl ${SERVICE_URL}/healthz"
