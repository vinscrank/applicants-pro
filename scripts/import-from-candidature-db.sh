#!/usr/bin/env bash
set -euo pipefail

SOURCE_CONTAINER="${SOURCE_CONTAINER:-candidature-db}"
TARGET_CONTAINER="${TARGET_CONTAINER:-interview-db}"
SOURCE_DB="${SOURCE_DB:-candidature}"
SOURCE_USER="${SOURCE_USER:-candidature}"
TARGET_DB="${TARGET_DB:-interview}"
TARGET_USER="${TARGET_USER:-interview}"

dump_table() {
  local source_table="$1"
  local target_table="$2"
  shift 2
  local extra_seds=("$@")

  echo "Importing ${source_table} -> ${target_table}..."
  local pipeline="docker exec ${SOURCE_CONTAINER} pg_dump -U ${SOURCE_USER} -d ${SOURCE_DB} --data-only --no-owner --no-acl -t ${source_table}"
  pipeline="${pipeline} | sed 's/${source_table}/${target_table}/g'"
  pipeline="${pipeline} | sed 's/${source_table}_id_seq/${target_table}_id_seq/g'"
  if ((${#extra_seds[@]})); then
    for s in "${extra_seds[@]}"; do
      pipeline="${pipeline} | sed '${s}'"
    done
  fi
  pipeline="${pipeline} | docker exec -i ${TARGET_CONTAINER} psql -U ${TARGET_USER} -d ${TARGET_DB} -v ON_ERROR_STOP=1"
  eval "${pipeline}"
}

echo "Clearing interview database before import..."
docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 <<'SQL'
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

dump_table users users
dump_table user_profiles user_profiles
dump_table offerte_searches job_searches
echo "Skipping offerte_offers -> job_offers (offers are not stored in this database)."
dump_table offerte_applied_offers job_applied_offers
dump_table offerte_dismissed_offers job_dismissed_offers
dump_table user_offerte_preferences user_job_preferences
dump_table applications applications "s/'offerte_live'/'live_jobs'/g"
dump_table monitored_companies monitored_companies
dump_table llm_usage llm_usage
dump_table llm_settings llm_settings

echo "Resetting sequences..."
docker exec -i "${TARGET_CONTAINER}" psql -U "${TARGET_USER}" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 <<'SQL'
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('job_searches_id_seq', COALESCE((SELECT MAX(id) FROM job_searches), 1));
SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1));
SELECT setval('monitored_companies_id_seq', COALESCE((SELECT MAX(id) FROM monitored_companies), 1));
SELECT setval('llm_usage_id_seq', COALESCE((SELECT MAX(id) FROM llm_usage), 1));
SELECT setval('llm_settings_id_seq', COALESCE((SELECT MAX(id) FROM llm_settings), 1));
SQL

echo "Import completed."
