#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  cat <<'EOF'
Import dump PostgreSQL su Neon.

Uso:
  export NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  ./scripts/db-import-neon.sh ./dumps/interview-data-YYYYMMDD-HHMMSS.sql
  ./scripts/db-import-neon.sh --full ./dumps/interview-full-YYYYMMDD-HHMMSS.dump

Opzioni:
  --full    restore dump custom (schema + dati) su database vuoto
  --yes     salta conferma interattiva

Prerequisiti:
  - psql e pg_restore installati localmente (PostgreSQL client)
  - Per import dati: schema gia creato da Flyway su Neon
  - Usa la connection string DIRECT di Neon (non il pooler) per import bulk

Variabili:
  NEON_DATABASE_URL   obbligatoria
EOF
  exit 1
fi

MODE="data"
ASSUME_YES=0
DUMP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      MODE="full"
      shift
      ;;
    --yes)
      ASSUME_YES=1
      shift
      ;;
    -h|--help)
      exit 0
      ;;
    *)
      DUMP_FILE="$1"
      shift
      ;;
  esac
done

if [[ -z "${DUMP_FILE}" ]]; then
  echo "Specifica il file dump." >&2
  exit 1
fi

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "File non trovato: ${DUMP_FILE}" >&2
  exit 1
fi

if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
  echo "NEON_DATABASE_URL non impostata." >&2
  echo "Esempio: export NEON_DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql non trovato. Installa PostgreSQL client (brew install libpq)." >&2
  exit 1
fi

if [[ "${MODE}" == "full" ]] && ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore non trovato. Installa PostgreSQL client (brew install libpq)." >&2
  exit 1
fi

echo "Target: Neon (${NEON_DATABASE_URL%%@*}@...)"
echo "File:   ${DUMP_FILE}"
echo "Mode:   ${MODE}"
echo

if [[ "${ASSUME_YES}" -ne 1 ]]; then
  read -r -p "Procedere con l'import? [y/N] " reply
  if [[ ! "${reply}" =~ ^[Yy]$ ]]; then
    echo "Annullato."
    exit 0
  fi
fi

if [[ "${MODE}" == "full" ]]; then
  echo "Restore completo su database vuoto..."
  pg_restore \
    --dbname="${NEON_DATABASE_URL}" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    "${DUMP_FILE}"
else
  echo "Pulizia dati esistenti (schema Flyway invariato)..."
  psql "${NEON_DATABASE_URL}" -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE
  job_applied_offers,
  job_dismissed_offers,
  job_offers,
  job_searches,
  applications,
  user_job_preferences,
  llm_usage,
  llm_settings,
  monitored_companies,
  user_profiles,
  users
RESTART IDENTITY CASCADE;
SQL

  echo "Import dati..."
  psql "${NEON_DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${DUMP_FILE}"

  echo "Allineamento sequence..."
  psql "${NEON_DATABASE_URL}" -v ON_ERROR_STOP=1 <<'SQL'
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('job_searches_id_seq', COALESCE((SELECT MAX(id) FROM job_searches), 1));
SELECT setval('job_offers_id_seq', COALESCE((SELECT MAX(id) FROM job_offers), 1));
SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1));
SELECT setval('monitored_companies_id_seq', COALESCE((SELECT MAX(id) FROM monitored_companies), 1));
SELECT setval('llm_usage_id_seq', COALESCE((SELECT MAX(id) FROM llm_usage), 1));
SELECT setval('llm_settings_id_seq', COALESCE((SELECT MAX(id) FROM llm_settings), 1));
SQL
fi

VERIFY_FILE="${ROOT_DIR}/dumps/neon-import-$(date +%Y%m%d-%H%M%S).manifest.txt"
{
  echo "imported_at=$(date +%Y%m%d-%H%M%S)"
  echo "mode=${MODE}"
  echo "source=$(basename "${DUMP_FILE}")"
  echo
  echo "row_counts_neon:"
  psql "${NEON_DATABASE_URL}" -At <<'SQL'
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
} > "${VERIFY_FILE}"

echo
echo "Import completato."
echo "  Verifica: ${VERIFY_FILE}"
echo
echo "Confronta row_counts con il manifest dell'export locale."
