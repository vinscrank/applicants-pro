#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-interview-pro-vincenzo}"
GCP_REGION="${GCP_REGION:-europe-west1}"
IMAGE="europe-west1-docker.pkg.dev/${GCP_PROJECT_ID}/interview/java-backend:latest"

cd "$ROOT_DIR"

echo "Build java (linux/amd64)..."
docker build --platform linux/amd64 -t "$IMAGE" ./java-backend

echo "Push..."
docker push "$IMAGE"

echo "Deploy Cloud Run (env vars esistenti restano)..."
gcloud run deploy interview-java \
  --image="$IMAGE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

URL="$(gcloud run services describe interview-java --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format='value(status.url)')"
echo "OK: ${URL}"
curl -s "${URL}/actuator/health" || true
echo
