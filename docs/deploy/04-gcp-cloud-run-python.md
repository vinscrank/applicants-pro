# Fase 4 — Deploy Python AI su Google Cloud Run

**Obiettivo:** pubblicare il servizio FastAPI (search, scrape, LLM) su Cloud Run, collegato a Neon.

**Tempo stimato:** 30–45 minuti.

**Prerequisiti:** Fase 3 completata, `JAVA_CLOUD_RUN_URL` annotata.

---

## Python locale — spegnilo?

**Sì, puoi spegnerlo** (Ctrl+C su `uvicorn` in Terminale 1).

| Ambiente | Cosa usa |
|----------|----------|
| Fase 2 (test locale) | Python `:8001` sul Mac |
| Fase 4 (deploy cloud) | Immagine Docker pushata su GCP |

Il deploy Cloud Run **non** usa il processo Python sul tuo Mac. Serve solo:

1. `docker build --platform linux/amd64`
2. `docker push`
3. `gcloud run deploy interview-python`

**GEMINI_API_KEY:** nel file `.env` alla root del repo (stesso usato in Fase 2).

---

## Panoramica

Python:
- **Non** è esposto direttamente al browser
- Viene chiamato solo da Java (`PythonJobsClient` → `http://python-ai:8001` in Docker, URL Cloud Run in prod)
- Ha bisogno di `DATABASE_URL` (Neon) e `GEMINI_API_KEY`

Ordine: puoi deployare Python **prima o dopo** Java, ma alla fine devi **aggiornare Java** con l’URL Python reale.

---

## Step 4.1 — Variabili già impostate

Assicurati di avere nel terminale:

```bash
export GCP_PROJECT_ID='il-tuo-project-id'
export GCP_REGION='europe-west1'
export AR_REPO='interview'
```

---

## Step 4.2 — Build immagine Python

```bash
cd /Users/vincenzo/Desktop/websites/interview

export IMAGE_PYTHON="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/python-ai:latest"

docker build --platform linux/amd64 -t "$IMAGE_PYTHON" ./python-ai
```

**Cosa fa il Dockerfile Python:**
1. Base `python:3.12-slim`
2. `pip install -r requirements.txt`
3. Copia codice `scraper/`, `app/`, ecc.
4. Avvia `uvicorn` sulla porta **8001**

**Verifica:**

```bash
docker images | grep python-ai
```

---

## Step 4.3 — (Opzionale) Test immagine in locale

Prima del push, puoi provare il container:

```bash
docker run --rm -p 8001:8001 \
  -e DATABASE_URL='postgresql://neondb_owner:PASS@ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
  -e GEMINI_API_KEY='tua_chiave' \
  "$IMAGE_PYTHON"
```

In un altro terminale:

```bash
curl -s http://localhost:8001/health
```

Premi `Ctrl+C` per fermare.

---

## Step 4.4 — Push immagine

```bash
docker push "$IMAGE_PYTHON"
```

---

## Step 4.5 — Verifica architettura (Mac ARM) — **OBBLIGATORIO**

```bash
docker pull --platform linux/amd64 "$IMAGE_PYTHON"
```

Stesso fix della Fase 3: nessun warning `linux/arm64` prima del deploy.

---

## Step 4.6 — Deploy su Cloud Run

```bash
gcloud run deploy interview-python \
  --image="$IMAGE_PYTHON" \
  --region="$GCP_REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8001 \
  --memory=1Gi \
  --timeout=900 \
  --min-instances=0 \
  --max-instances=2 \
  --set-env-vars="DATABASE_URL=postgresql://neondb_owner:PASS@ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
  --set-env-vars="GEMINI_API_KEY=LA_TUA_CHIAVE" \
  --set-env-vars="JOB_SEARCH_MODE=scrape" \
  --set-env-vars="SEARCH_MAX_COMPANIES=277"
```

**Perché `--timeout=900` (15 min):**
- Le search e careers scan possono durare diversi minuti
- Cloud Run default è 300s; Python spesso ha bisogno di più

**Perché `--allow-unauthenticated`:**
- Java chiama Python via HTTP pubblico (semplice da configurare)
- In produzione “seria” potresti usare IAM/service-to-service (fase avanzata)

**Output atteso:**

```
Service URL: https://interview-python-xxxxx-ew.a.run.app
```

Salva come `PYTHON_CLOUD_RUN_URL` in `deploy-notes.txt`.

---

## Step 4.7 — Verifica Python su Cloud Run

```bash
export PYTHON_CLOUD_RUN_URL='https://interview-python-xxxxx-ew.a.run.app'

curl -s "${PYTHON_CLOUD_RUN_URL}/health"
```

Output atteso: JSON status ok.

---

## Step 4.8 — Collega Java → Python

**Usa `--update-env-vars`, NON `--set-env-vars`:**

`--set-env-vars` con una sola chiave **cancella** tutte le altre (Neon, JWT, …) e Java non parte più:

```
Failed to configure a DataSource: 'url' attribute is not specified
```

```bash
gcloud run services update interview-java \
  --region=europe-west1 \
  --update-env-vars="APP_PYTHON_AI_BASE_URL=https://interview-python-xxxxx.europe-west1.run.app"
```

### SE SERVE — env già cancellate (redeploy completo)

Ripristina **tutte** le env in un unico deploy:

```bash
gcloud run deploy interview-java \
  --image=europe-west1-docker.pkg.dev/interview-pro-vincenzo/interview/java-backend:latest \
  --region=europe-west1 \
  --set-env-vars="SPRING_DATASOURCE_URL=jdbc:postgresql://ep-XXX-pooler.../neondb?sslmode=require,SPRING_DATASOURCE_USERNAME=neondb_owner,SPRING_DATASOURCE_PASSWORD=PASS,APP_PYTHON_AI_BASE_URL=https://interview-python-XXX.run.app,APP_JWT_SECRET=TUO_JWT,APP_PUBLIC_URL=https://placeholder.vercel.app"
```

---

## Step 4.9 — Log e debug

```bash
gcloud run services logs read interview-python --region="$GCP_REGION" --limit=50
```

| Errore log | Causa |
|------------|-------|
| `could not connect to server` | `DATABASE_URL` errata |
| `GEMINI_API_KEY` / 403 | chiave mancante o invalida |
| `Timeout` | aumenta `--timeout` o riduci `SEARCH_MAX_COMPANIES` |

---

## Step 4.10 — Redeploy Python (iterazione)

```bash
docker build --platform linux/amd64 -t "$IMAGE_PYTHON" ./python-ai
docker push "$IMAGE_PYTHON"
gcloud run deploy interview-python --image="$IMAGE_PYTHON" --region="$GCP_REGION"
```

---

## Step 4.11 — Checkpoint

- [ ] `interview-python` deployato e `/health` ok
- [ ] `PYTHON_CLOUD_RUN_URL` salvata
- [ ] Java aggiornato con `APP_PYTHON_AI_BASE_URL`
- [ ] Test search/careers da frontend (locale → Java cloud) funziona

**Prossimo passo:** [05-vercel-frontend.md](./05-vercel-frontend.md)

---

## Sicurezza (opzionale, dopo MVP)

Per nascondere Python al pubblico:
1. Rimuovi `--allow-unauthenticated` da Python
2. Configura Java con service account IAM per chiamate autenticate

Per il primo go-live la versione pubblica è accettabile se non esponi Python nel frontend.
