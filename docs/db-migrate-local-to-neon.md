# Migrazione PostgreSQL locale → Neon

Procedura standard per esportare i dati dal Postgres Docker locale e importarli su Neon.

## Prerequisiti

- Docker con `interview-db` in esecuzione (`docker compose up -d db`)
- Client PostgreSQL locale: `psql` e `pg_restore`
  - macOS: `brew install libpq` poi `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`
- Progetto Neon creato (regione EU consigliata, es. Frankfurt)

## Flusso consigliato (schema Flyway + dati)

Flyway (Java) crea lo schema su Neon; importi solo i dati dal locale.

### 1. Export dal locale

```bash
cd /path/to/interview
chmod +x scripts/db-export-local.sh scripts/db-import-neon.sh

./scripts/db-export-local.sh
```

Genera in `./dumps/`:

- `interview-data-YYYYMMDD-HHMMSS.sql` — dump dati
- `interview-export-YYYYMMDD-HHMMSS.manifest.txt` — conteggi righe per verifica

Backup completo opzionale (schema + dati):

```bash
./scripts/db-export-local.sh --full
```

### 2. Crea database su Neon

1. [console.neon.tech](https://console.neon.tech) → New project
2. Copia la **connection string direct** (non pooled) per import/migrazioni
3. Aggiungi `?sslmode=require` se assente

### 3. Crea schema su Neon (Flyway)

Avvia Java puntando a Neon (una sola volta):

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='...'
export SPRING_DATASOURCE_PASSWORD='...'

cd java-backend
./gradlew bootRun
```

Oppure con Docker Compose temporaneo sovrascrivendo `spring.datasource.url`.

Flyway applica `V1`…`V6` e crea tutte le tabelle vuote.

### 4. Import dati su Neon

```bash
export NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require'

./scripts/db-import-neon.sh ./dumps/interview-data-YYYYMMDD-HHMMSS.sql
```

Conferma con `y` oppure usa `--yes` per CI/script.

### 5. Verifica

Confronta i conteggi nel manifest export vs manifest import:

```bash
cat dumps/interview-export-*.manifest.txt
cat dumps/neon-import-*.manifest.txt
```

Test rapido:

```bash
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM applications;"
```

### 6. Collega i servizi a Neon

**Java** (`application-prod.yml` o env):

```yaml
spring:
  datasource:
    url: jdbc:postgresql://ep-xxx.neon.tech/neondb?sslmode=require
    username: ...
    password: ...
```

**Python**:

```bash
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

Per runtime produzione usa il **pooler Neon** (`-pooler` nell'host). Per import usa sempre la URL **direct**.

## Flusso alternativo (database Neon completamente vuoto)

Se Neon è vuoto e non vuoi passare da Flyway prima:

```bash
./scripts/db-export-local.sh --full
./scripts/db-import-neon.sh --full ./dumps/interview-full-YYYYMMDD-HHMMSS.dump
```

Nota: sovrascrive schema e dati. Preferisci il flusso Flyway + data-only per allineare le migration.

## Tabelle migrate

| Tabella | Contenuto |
|---------|-----------|
| `users` | Account |
| `user_profiles` | Profili |
| `applications` | Tracker candidature |
| `job_searches` | Ricerche salvate |
| `job_offers` | Offerte per ricerca |
| `job_applied_offers` | Offerte segnate applicate |
| `job_dismissed_offers` | Offerte ignorate |
| `monitored_companies` | Aziende careers |
| `llm_usage` | Usage LLM |
| `llm_settings` | Budget LLM |
| `user_job_preferences` | Preferenze search |

Non incluso: `flyway_schema_history` (gestito da Flyway su Neon).

## Cosa non migra con questa procedura

- **CV upload** in volume Docker (`interview_cv_uploads`) — copia separata su GCS o volume
- **sessionStorage / cache frontend** — non è nel DB
- **Stripe** — customer ID restano nel dump utenti; webhook URL va aggiornato in prod

## Troubleshooting

| Errore | Soluzione |
|--------|-----------|
| `Container PostgreSQL non in esecuzione` | `docker compose up -d db` |
| `relation "users" does not exist` | Esegui Flyway su Neon prima dell'import dati |
| `duplicate key` | Riesegui import: lo script fa TRUNCATE prima dei dati |
| `connection timeout` | Usa URL direct Neon, non pooler |
| `psql not found` | Installa libpq (vedi prerequisiti) |

## Ripetibilità

La stessa procedura funziona per:

- backup periodico locale (`db-export-local.sh --full`)
- refresh staging Neon da locale
- migrazione futura Neon → Cloud SQL (`pg_dump` / `pg_restore` identici)
