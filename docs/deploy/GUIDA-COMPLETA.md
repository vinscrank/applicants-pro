# Guida completa — da locale a produzione

Documento unico e riproducibile per migrare il database su Neon, testare in locale, e deployare su GCP + Vercel.

**Legenda step:**

| Badge | Significato |
|-------|-------------|
| **OBBLIGATORIO** | Senza questo step non vai avanti |
| **OPZIONALE** | Puoi saltarlo o farlo dopo |
| **SE SERVE** | Solo se incontri un problema specifico |

**Tu esegui tutto manualmente** — nessuno step è automatico.

---

## Architettura finale

```
Browser
  └── Vercel (Next.js)
        └── Cloud Run Java :8080
              ├── Neon PostgreSQL (pooled)
              └── Cloud Run Python :8001
                    └── Neon PostgreSQL (pooled)
```

---

## File da tenere fuori git

Crea `deploy-notes.txt` nella root del repo (non committare):

```
NEON_DIRECT_URL=postgresql://...
NEON_POOLED_URL=postgresql://...
GCP_PROJECT_ID=interview-pro-vincenzo
GCP_REGION=europe-west1
JAVA_CLOUD_RUN_URL=https://...
PYTHON_CLOUD_RUN_URL=https://...
VERCEL_URL=https://...
JWT_SECRET=...
GEMINI_API_KEY=...   # oppure usa .env esistente
```

---

## Prerequisiti globali

| Tool | Installazione | Obbligatorio |
|------|---------------|--------------|
| Docker Desktop | già usato in dev | Sì (build immagini) |
| `psql` | `brew install libpq` + PATH sotto | Sì (Neon) |
| `gcloud` | `brew install google-cloud-sdk` | Sì (GCP) |
| Account Neon | console.neon.tech | Sì |
| Account GCP + billing | console.cloud.google.com | Sì |
| Account Vercel | vercel.com | Sì (frontend) |

### PATH psql (SE SERVE — macOS)

Se `psql: command not found`:

```bash
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

# FASE 1 — Database locale → Neon

**Obiettivo:** copiare dati da Postgres Docker a Neon.

**Tempo:** ~30 min.

## Cosa succede (3 operazioni)

| # | Operazione | Strumento | Output |
|---|------------|-----------|--------|
| A | Export dati | `scripts/db-export-local.sh` | file `.sql` |
| B | Schema (tabelle vuote) | Flyway via Java | tabelle su Neon |
| C | Import dati | `scripts/db-import-neon.sh` | righe su Neon |

Il dump contiene **solo dati** (INSERT). Le tabelle le crea Flyway **prima** dell'import.

---

### 1.1 Verifica Postgres locale — **OBBLIGATORIO**

```bash
docker ps --filter name=interview-db
```

Se spento:

```bash
cd /path/to/interview
docker compose up -d db
```

---

### 1.2 Export dati — **OBBLIGATORIO** (salta se dump recente esiste)

```bash
cd /path/to/interview
chmod +x scripts/db-export-local.sh scripts/db-import-neon.sh
./scripts/db-export-local.sh
```

Output: `dumps/interview-data-YYYYMMDD-HHMMSS.sql` + manifest con conteggi.

Verifica:

```bash
cat dumps/interview-export-*.manifest.txt
```

---

### 1.3 Crea progetto Neon — **OBBLIGATORIO**

1. [console.neon.tech](https://console.neon.tech) → **New Project**
2. Regione: **EU Frankfurt**
3. PostgreSQL: **16**

---

### 1.4 Copia connection string Direct — **OBBLIGATORIO**

In Neon → **Connect to your database**:

- Branch: `production`
- Database: `neondb`
- Role: `neondb_owner`
- **Connection pooling → OFF** (toggle grigio) ← questo è **Direct**
- Copy snippet

Direct = host **senza** `-pooler`:

```
postgresql://USER:PASS@ep-xxx.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Pooled (host con `-pooler`) → **fase 2+**, non serve ora.

Salva in `deploy-notes.txt` come `NEON_DIRECT_URL`.

---

### 1.5 Test connessione — **OBBLIGATORIO**

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
export NEON_DATABASE_URL='NEON_DIRECT_URL_QUI'

psql "$NEON_DATABASE_URL" -c "SELECT 1;"
```

Atteso: `1`.

---

### 1.6 Flyway — crea schema su Neon — **OBBLIGATORIO**

```bash
cd /path/to/interview/java-backend

export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-XXX.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='neondb_owner'
export SPRING_DATASOURCE_PASSWORD='TUA_PASSWORD'

./gradlew bootRun
```

**Cosa aspettarsi:** log Flyway `Successfully applied` o `Schema is up to date`.

**Poi Ctrl+C** — ti serve solo Flyway, non tenere Java acceso.

#### SE SERVE — errore "Port 8080 already in use"

Flyway può essere **già completato** prima dell'errore porta. Verifica:

```bash
psql "$NEON_DATABASE_URL" -c "\dt"
```

Se vedi `users`, `applications`, ecc. → **schema ok**, ignora errore porta.

Alternativa: usa porta diversa:

```bash
export SERVER_PORT=8082
./gradlew bootRun
```

Oppure ferma Docker Java: `docker compose stop java-backend`

---

### 1.7 Import dati — **OBBLIGATORIO** (salta se già fatto)

```bash
cd /path/to/interview
export NEON_DATABASE_URL='NEON_DIRECT_URL_QUI'

./scripts/db-import-neon.sh ./dumps/interview-data-YYYYMMDD-HHMMSS.sql --yes
```

Verifica conteggi:

```bash
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM applications;"
cat dumps/neon-import-*.manifest.txt
```

Confronta con manifest export — devono coincidere.

---

### 1.8 Checkpoint Fase 1 — **OBBLIGATORIO**

- [ ] Neon ha stessi conteggi del locale
- [ ] `NEON_DIRECT_URL` salvata
- [ ] Password Neon resettata se condivisa in chat

**Dettaglio:** [01-neon-migrate.md](./01-neon-migrate.md)

---

# FASE 2 — Test locale con Neon

**Obiettivo:** Java + Python + frontend sul Mac, database su Neon (non Docker Postgres).

**Tempo:** ~20 min.

**Perché:** verificare che login, candidature e Discover funzionino prima del deploy cloud.

---

### 2.1 Ferma Docker — **OPZIONALE** (consigliato)

Evita conflitto porte 8080/5435:

```bash
cd /path/to/interview
docker compose down
```

I dati nel volume Docker locale restano sul disco.

---

### 2.2 Variabili Neon pooled — **OBBLIGATORIO**

Su Neon: **Connection pooling → ON** → copia URL (host con `-pooler`).

```bash
export NEON_POOLED_URL='postgresql://USER:PASS@ep-XXX-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'

export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-XXX-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='neondb_owner'
export SPRING_DATASOURCE_PASSWORD='TUA_PASSWORD'
```

---

### 2.3 Terminale 1 — Python — **OBBLIGATORIO**

```bash
cd /path/to/interview/python-ai

source .venv/bin/activate
pip install -r requirements.txt   # SE SERVE — prima volta o ModuleNotFoundError

set -a && source ../.env && set +a   # carica GEMINI_API_KEY da .env root

export DATABASE_URL="$NEON_POOLED_URL"

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### SE SERVE — `python: command not found`

Usa il venv: `source .venv/bin/activate` oppure `.venv/bin/python -m uvicorn ...`

#### SE SERVE — `No module named sqlalchemy`

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Verifica (altro terminale):

```bash
curl -s http://localhost:8001/health
```

---

### 2.4 Terminale 2 — Java — **OBBLIGATORIO**

```bash
cd /path/to/interview/java-backend

export SPRING_PROFILES_ACTIVE=local    # porta 8081, evita conflitto 8080
export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-XXX-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='neondb_owner'
export SPRING_DATASOURCE_PASSWORD='TUA_PASSWORD'

./gradlew bootRun
```

Attendi `Started ...Application`. **Non chiudere.**

Verifica:

```bash
curl -s http://localhost:8081/actuator/health
```

---

### 2.5 Terminale 3 — Frontend — **OBBLIGATORIO**

**Problema comune:** `frontend/.env.local` punta a `8080` ma Java locale usa `8081`.

Modifica `frontend/.env.local`:

```
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8081/graphql
NEXT_PUBLIC_JAVA_API_URL=http://localhost:8081
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_USE_JAVA_APPLICATIONS=true
NEXT_PUBLIC_USE_JAVA_AUTH=true
NEXT_PUBLIC_USE_JAVA_SEARCH=true
```

Riavvia frontend:

```bash
pkill -f "next dev" 2>/dev/null   # SE SERVE — "Another next dev server is already running"

cd /path/to/interview/frontend
npm run dev
```

Apri http://localhost:3000

#### SE SERVE — "Backend unreachable. Check that Docker is running"

Cause:
1. Java/Python non accesi → riavvia terminali 1 e 2
2. Frontend punta a 8080 → aggiorna `.env.local` a 8081
3. Verifica: `curl http://localhost:8081/actuator/health`

---

### 2.6 Checklist browser — **OBBLIGATORIO**

- [ ] Login utente migrato
- [ ] Candidature visibili (~190)
- [ ] Profilo account ok
- [ ] Discover (search/careers) — **OPZIONALE** ma consigliato

---

### 2.7 Checkpoint Fase 2 — **OBBLIGATORIO**

Fase 2 ok → puoi procedere al deploy GCP.

**Dettaglio:** [02-neon-locale-test.md](./02-neon-locale-test.md)

---

# FASE 3 — Deploy Java su GCP Cloud Run

**Obiettivo:** backend Spring Boot pubblico su internet, DB Neon.

**Tempo:** ~45 min (prima volta).

---

### 3.1 Installa gcloud — **OBBLIGATORIO**

```bash
brew install google-cloud-sdk
gcloud auth login
```

---

### 3.2 Crea progetto GCP — **OBBLIGATORIO**

Scegli un project id univoco (minuscole, trattini):

```bash
gcloud projects create interview-pro-vincenzo --name="Interview Pro"
gcloud config set project interview-pro-vincenzo
```

Se `already exists` → usa altro id o salta create e solo `config set`.

---

### 3.3 Collega billing — **OBBLIGATORIO**

```bash
gcloud billing accounts list
gcloud billing projects link interview-pro-vincenzo --billing-account=ACCOUNT_ID
```

Senza billing Cloud Run non funziona.

---

### 3.4 Regione e API — **OBBLIGATORIO**

```bash
export GCP_PROJECT_ID='interview-pro-vincenzo'
export GCP_REGION='europe-west1'

gcloud config set run/region "$GCP_REGION"
gcloud config set artifacts/location "$GCP_REGION"

gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

Verifica:

```bash
gcloud config list
```

Atteso:

```
project = interview-pro-vincenzo
[run] region = europe-west1
[artifacts] location = europe-west1
```

---

### 3.5 Repository Docker — **OBBLIGATORIO**

```bash
gcloud artifacts repositories create interview \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Interview app containers"

gcloud auth configure-docker europe-west1-docker.pkg.dev
```

`already exists` → ok, continua.

---

### 3.6 Build immagine Java — **OBBLIGATORIO**

**Mac Apple Silicon (M1/M2/M3):** Cloud Run usa `linux/amd64`. Senza `--platform` ottieni `exec format error` al deploy.

```bash
cd /path/to/interview

export IMAGE_JAVA="europe-west1-docker.pkg.dev/${GCP_PROJECT_ID}/interview/java-backend:latest"

docker build --platform linux/amd64 -t "$IMAGE_JAVA" ./java-backend
```

Tempo: 10–15 min su Mac ARM (emulazione amd64).

---

### 3.7 Push immagine — **OBBLIGATORIO**

```bash
docker push "$IMAGE_JAVA"
```

Attendi fino a `latest: digest: sha256:... size: ...` — se interrompi prima, GCP resta con immagine vecchia.

---

### 3.8 Verifica architettura su GCP — **OBBLIGATORIO** (Mac ARM)

**Perché:** build amd64 in locale **non basta**. Se pushi per sbaglio ARM (o non pushi), Cloud Run fallisce con:

```
exec format error
failed to load /opt/java/openjdk/bin/java
Container failed to listen on PORT=8080
```

```bash
docker pull --platform linux/amd64 "$IMAGE_JAVA"
```

| Esito pull | Significato |
|------------|-------------|
| Nessun warning `linux/arm64` | Immagine GCP ok → puoi deployare |
| Warning `platform (linux/arm64)` | Registry ha ancora ARM → rifai 3.6 + 3.7 |

---

### 3.9 JWT secret — **OBBLIGATORIO**

```bash
openssl rand -base64 32
```

In `--set-env-vars` ogni variabile deve avere **nome=valore**. Errore comune:

```
...,APP_PYTHON_AI_BASE_URL=http://localhost:8001,oUeXEZuN0ndt+...,APP_PUBLIC_URL=...
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              manca APP_JWT_SECRET= prima del valore
```

Formato corretto: `APP_JWT_SECRET=IL_TUO_SECRET`

---

### 3.10 Deploy Cloud Run Java — **OBBLIGATORIO**

Ordine obbligatorio: **3.6 build → 3.7 push → 3.8 verifica pull → 3.10 deploy**

```bash
gcloud run deploy interview-java \
  --image="$IMAGE_JAVA" \
  --region="$GCP_REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --timeout=300 \
  --cpu-boost \
  --set-env-vars="SPRING_DATASOURCE_URL=jdbc:postgresql://ep-XXX-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require,SPRING_DATASOURCE_USERNAME=neondb_owner,SPRING_DATASOURCE_PASSWORD=TUA_PASSWORD,APP_PYTHON_AI_BASE_URL=http://localhost:8001,APP_JWT_SECRET=TUO_JWT_SECRET,APP_PUBLIC_URL=https://placeholder.vercel.app"
```

`APP_PYTHON_AI_BASE_URL=http://localhost:8001` è **temporaneo** fino a Fase 4.

**Esempio reale (deploy riuscito):**

```
JAVA_CLOUD_RUN_URL=https://interview-java-932950348509.europe-west1.run.app
curl .../actuator/health → {"status":"UP"}
```

Salva **Service URL** → `JAVA_CLOUD_RUN_URL`.

---

### 3.11 Verifica — **OBBLIGATORIO**

```bash
curl -s "$JAVA_CLOUD_RUN_URL/actuator/health"
```

---

### 3.12 Checkpoint Fase 3 — **OBBLIGATORIO**

- [ ] Push completato (non solo build locale)
- [ ] `docker pull --platform linux/amd64` senza warning ARM
- [ ] `/actuator/health` → `UP`
- [ ] `JAVA_CLOUD_RUN_URL` salvata

#### Errori GCP Java — riepilogo fix

| Errore | Causa | Fix |
|--------|-------|-----|
| `Image not found` | Mai fatto push | `docker push` dopo build |
| `exec format error` | Immagine ARM su registry | `--platform linux/amd64` + push + verifica pull |
| `Port 8080` timeout + exec error | Stesso problema ARM | Idem sopra |
| Env vars malformate | Manca `APP_JWT_SECRET=` | Controlla ogni chiave in `--set-env-vars` |

**Dettaglio:** [03-gcp-cloud-run-java.md](./03-gcp-cloud-run-java.md)

---

### Prima della Fase 4 — Python/Java locale — **OPZIONALE**

Puoi **spegnere** i terminali locali (Python `:8001`, Java `:8081`, `npm run dev`):

- **Non servono** per deploy Python su Cloud Run
- Cloud Run usa immagini Docker + Neon, non il tuo Mac
- Tienili accesi solo se vuoi continuare a devare in locale

```bash
# OPZIONALE — Ctrl+C sui terminali uvicorn, bootRun, next dev
```

---

# FASE 4 — Deploy Python su GCP Cloud Run

**Obiettivo:** servizio AI/search/scrape su Cloud Run. Java in cloud lo chiama via `APP_PYTHON_AI_BASE_URL`.

**Tempo:** ~30 min.

**Python locale:** puoi **spegnerlo** (Ctrl+C su uvicorn). Per Fase 4 serve solo Docker + `gcloud`, non il processo `:8001` sul Mac.

**GEMINI_API_KEY:** nel file root `.env` del progetto (caricalo nel deploy, non committare).

---

### 4.1 Build — **OBBLIGATORIO**

Stesse regole Mac ARM: **`--platform linux/amd64`** + push + verifica pull.

```bash
cd /path/to/interview
export GCP_PROJECT_ID='interview-pro-vincenzo'
export IMAGE_PYTHON="europe-west1-docker.pkg.dev/${GCP_PROJECT_ID}/interview/python-ai:latest"

docker build --platform linux/amd64 -t "$IMAGE_PYTHON" ./python-ai
docker push "$IMAGE_PYTHON"

docker pull --platform linux/amd64 "$IMAGE_PYTHON"
```

Nessun warning `arm64` → ok.

---

### 4.2 Deploy — **OBBLIGATORIO**

```bash
gcloud run deploy interview-python \
  --image="$IMAGE_PYTHON" \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8001 \
  --memory=1Gi \
  --timeout=900 \
  --set-env-vars="DATABASE_URL=postgresql://neondb_owner:PASS@ep-XXX-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require,GEMINI_API_KEY=KEY_DA_.env,JOB_SEARCH_MODE=scrape,SEARCH_MAX_COMPANIES=277"
```

Salva **Service URL** → `PYTHON_CLOUD_RUN_URL`.

---

### 4.3 Collega Java → Python — **OBBLIGATORIO**

**Usa `--update-env-vars`, NON `--set-env-vars` da solo** (altrimenti cancelli Neon, JWT, ecc.).

```bash
gcloud run services update interview-java \
  --region=europe-west1 \
  --update-env-vars="APP_PYTHON_AI_BASE_URL=https://interview-python-XXXXX.europe-west1.run.app"
```

**SE SERVE** — se env già cancellate, redeploy con tutte le variabili (vedi Fase 3 step 3.10).

---

### 4.4 Verifica — **OBBLIGATORIO**

```bash
curl -s "$PYTHON_CLOUD_RUN_URL/health"
```

**Dettaglio:** [04-gcp-cloud-run-python.md](./04-gcp-cloud-run-python.md)

---

# FASE 5 — Deploy frontend su Vercel

**Obiettivo:** Next.js pubblico che chiama Java Cloud Run.

---

### 5.1 CORS Java — **OBBLIGATORIO** (prima di Vercel)

File: `java-backend/src/main/java/com/interview/config/CorsConfig.java`

Aggiungi:

```java
"https://*.vercel.app",
"https://tuodominio.com"   // OPZIONALE — dominio custom
```

Poi **rebuild e redeploy Java** (step 3.6–3.9).

---

### 5.2 Progetto Vercel — **OBBLIGATORIO**

1. [vercel.com/new](https://vercel.com/new) → import repo
2. **Root Directory:** `frontend`
3. Env variables:

| Variabile | Valore |
|-----------|--------|
| `NEXT_PUBLIC_BACKEND_URL` | `JAVA_CLOUD_RUN_URL` |
| `NEXT_PUBLIC_JAVA_API_URL` | `JAVA_CLOUD_RUN_URL` |
| `NEXT_PUBLIC_GRAPHQL_URL` | `JAVA_CLOUD_RUN_URL/graphql` |

4. Deploy

---

### 5.3 Aggiorna Java con URL Vercel — **OBBLIGATORIO**

```bash
gcloud run services update interview-java \
  --region=europe-west1 \
  --update-env-vars="APP_PUBLIC_URL=https://tuo-progetto.vercel.app"
```

**Mai** `--set-env-vars` con una sola chiave (cancella Neon/JWT).

---

### 5.4 Dipendenza rxjs — **OBBLIGATORIO**

Apollo Client 4 → aggiungi `rxjs` in `frontend/package.json`. Senza, build Vercel fallisce:

`Module not found: Can't resolve 'rxjs'`

---

### 5.5 Errore 404 Vercel — **SE SERVE**

Schermata bianca:

```
404: NOT_FOUND
Code: NOT_FOUND
ID: dub1::...
```

→ Deploy non Ready, Root Directory ≠ `frontend`, o URL sbagliato. Vedi [ERRORI-DEPLOY-REALI.md](./ERRORI-DEPLOY-REALI.md).

---

### 5.6 Verifica produzione — **OBBLIGATORIO**

- [ ] Login su Vercel URL
- [ ] Candidature da Neon
- [ ] Nessun errore CORS in console browser (F12)

**Dettaglio:** [05-vercel-frontend.md](./05-vercel-frontend.md)

---

# FASE 6 — Post-deploy

**Dettaglio:** [06-post-deploy-checklist.md](./06-post-deploy-checklist.md)

| Item | Obbligatorio |
|------|--------------|
| Health Java + Python cloud | Sì |
| Login + candidature prod | Sì |
| Stripe webhook URL → Java | OPZIONALE (se billing attivo) |
| CV upload su GCS | OPZIONALE |
| Secret Manager GCP al posto di env plain | OPZIONALE |
| Dominio custom Vercel | OPZIONALE |

---

# Sviluppo locale vs produzione

Dopo il deploy cloud, in **locale** continui con Docker (non Neon):

```bash
docker compose up -d
```

| | Locale | Produzione |
|--|--------|------------|
| Frontend | `npm run dev`, `.env.local` → `:8080` | Vercel |
| Java | Docker `:8080` | Cloud Run |
| Python | Docker `:8001` | Cloud Run |
| DB | Postgres Docker `:5435` | Neon |

Modifiche DB locale **non** sincronizzano Neon (e viceversa) senza export/import script.

---

# Redeploy rapido (dopo la prima volta)

### Modifica solo Java (es. CORS) — **1 comando**

```bash
./scripts/deploy-java-prod.sh
```

Fa: build amd64 → push → `gcloud run deploy` ( **mantiene le env vars già su Cloud Run** ).

### Modifica solo Python — **1 comando**

```bash
./scripts/deploy-python-prod.sh
```

### Modifica entrambi

```bash
./scripts/deploy-backend-prod.sh
```

### Frontend (Next.js)

Push su `main` → Vercel redeploy automatico (se repo collegato).

```bash
git push origin main
```

### Cambiare solo una env var (senza rebuild)

```bash
gcloud run services update interview-java \
  --region=europe-west1 \
  --update-env-vars="APP_PUBLIC_URL=https://tuo-progetto.vercel.app"
```

**Mai** `--set-env-vars` con una sola chiave — cancella tutte le altre.

---

# Redeploy manuale (dettaglio)

### Java

```bash
docker build -t "$IMAGE_JAVA" ./java-backend && docker push "$IMAGE_JAVA"
gcloud run deploy interview-java --image="$IMAGE_JAVA" --region=europe-west1
```

### Python

```bash
docker build -t "$IMAGE_PYTHON" ./python-ai && docker push "$IMAGE_PYTHON"
gcloud run deploy interview-python --image="$IMAGE_PYTHON" --region=europe-west1
```

### Frontend

```bash
git push origin main   # Vercel auto-deploy se collegato
```

### Re-sync DB locale → Neon

```bash
./scripts/db-export-local.sh
./scripts/db-import-neon.sh ./dumps/interview-data-ULTIMO.sql --yes
```

**OPZIONALE** — sovrascrive Neon con dati locali.

---

# Troubleshooting rapido

| Sintomo | Causa | Fix |
|---------|-------|-----|
| `psql not found` | PATH | Sezione prerequisiti PATH |
| `python not found` | macOS | `source .venv/bin/activate` |
| `No module named sqlalchemy` | venv vuoto | `pip install -r requirements.txt` |
| Flyway ok ma port 8080 busy | Docker Java acceso | Ignora se `\dt` ok, o `SERVER_PORT=8082` |
| Backend unreachable (frontend) | Java spento o `.env.local` su 8080 | Java su 8081 + aggiorna `.env.local` |
| Next già in esecuzione | PID vecchio | `pkill -f "next dev"` |
| Import già fatto | manifest neon-import esiste | Salta re-import |
| CORS su Vercel | CorsConfig | Fase 5.1 + redeploy Java |
| Search timeout cloud | Cloud Run timeout | Python `--timeout=900` |
| `exec format error` Cloud Run | Immagine ARM su registry | `--platform linux/amd64` + push + verifica pull |
| `404 NOT_FOUND` Vercel (dub1::) | Build fallita / root sbagliata | Root `frontend`, fix rxjs, deploy Ready |
| `Can't resolve rxjs` | Peer dep Apollo 4 | `npm install rxjs` in frontend |
| `DataSource url not specified` | `--set-env-vars` una chiave | Redeploy tutte env o `--update-env-vars` |
| Backend unreachable locale | `.env.local` su 8081, Docker off | `.env.local` → 8080, `docker compose up -d` |

**Dettaglio errori:** [ERRORI-DEPLOY-REALI.md](./ERRORI-DEPLOY-REALI.md)

---

# Riepilogo step obbligatori

```
FASE 1: export → Flyway → import → verifica conteggi
FASE 2: Python:8001 + Java:8081 + .env.local:8081 → login ok
FASE 3: gcloud project → build → push → deploy Java → health UP
FASE 4: build → push → deploy Python → update Java URL
FASE 5: CORS → Vercel env → deploy → APP_PUBLIC_URL
```

Tutto il resto è **OPZIONALE** o **SE SERVE**.
