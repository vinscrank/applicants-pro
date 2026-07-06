#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMPS_DIR="${DUMPS_DIR:-${ROOT_DIR}/dumps}"

CONTAINER="${CONTAINER:-interview-db}"
DB_NAME="${DB_NAME:-interview}"
DB_USER="${DB_USER:-interview}"

MODE="data"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

usage() {
  cat <<'EOF'
Export PostgreSQL locale (Docker) verso file in ./dumps/

Uso:
  ./scripts/db-export-local.sh              # solo dati (consigliato per Neon dopo Flyway)
  ./scripts/db-export-local.sh --full       # schema + dati (backup completo)
  ./scripts/db-export-local.sh --help

Variabili opzionali:
  CONTAINER   default: interview-db
  DB_NAME     default: interview
  DB_USER     default: interview
  DUMPS_DIR   default: ./dumps
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      MODE="full"
      shift
      ;;
    --data)
      MODE="data"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "Container PostgreSQL non in esecuzione: ${CONTAINER}" >&2
  echo "Avvia prima: docker compose up -d db" >&2
  exit 1
fi

mkdir -p "${DUMPS_DIR}"

if [[ "${MODE}" == "full" ]]; then
  OUT_FILE="${DUMPS_DIR}/interview-full-${TIMESTAMP}.dump"
  echo "Export completo (schema + dati) -> ${OUT_FILE}"
  docker exec "${CONTAINER}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="/tmp/interview-export.dump"
  docker cp "${CONTAINER}:/tmp/interview-export.dump" "${OUT_FILE}"
  docker exec "${CONTAINER}" rm -f /tmp/interview-export.dump
else
  OUT_FILE="${DUMPS_DIR}/interview-data-${TIMESTAMP}.sql"
  echo "Export dati (senza flyway_schema_history) -> ${OUT_FILE}"
  docker exec "${CONTAINER}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --data-only \
    --no-owner \
    --no-acl \
    --column-inserts \
    --exclude-table=flyway_schema_history \
    > "${OUT_FILE}"
fi

MANIFEST="${DUMPS_DIR}/interview-export-${TIMESTAMP}.manifest.txt"
{
  echo "exported_at=${TIMESTAMP}"
  echo "mode=${MODE}"
  echo "container=${CONTAINER}"
  echo "database=${DB_NAME}"
  echo "file=$(basename "${OUT_FILE}")"
  echo
  echo "row_counts_local:"
  docker exec -i "${CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -At <<'SQL'
SELECT 'users=' || COUNT(*) FROM users;
SELECT 'user_profiles=' || COUNT(*) FROM user_profiles;
SELECT 'applications=' || COUNT(*) FROM applications;
SELECT 'job_searches=' || COUNT(*) FROM job_searches;
SELECT 'job_offers=' || COUNT(*) FROM job_offers;
SELECT 'job_applied_offers=' || COUNT(*) FROM job_applied_offers;
SELECT 'job_dismissed_offers=' || COUNT(*) FROM job_dismissed_offers;
SELECT 'monitored_companies=' || COUNT(*) FROM monitored_companies;
SELECT 'llm_usage=' || COUNT(*) FROM llm_usage;
SELECT 'llm_settings=' || COUNT(*) FROM llm_settings;
SELECT 'user_job_preferences=' || COUNT(*) FROM user_job_preferences;
SQL
} > "${MANIFEST}"

echo
echo "Export completato."
echo "  File:     ${OUT_FILE}"
echo "  Manifest: ${MANIFEST}"
echo
echo "Prossimo passo (Neon):"
echo "  1. Crea database su Neon"
echo "  2. Avvia Java una volta contro Neon (Flyway crea lo schema)"
echo "  3. ./scripts/db-import-neon.sh ${OUT_FILE}"
