# Fase 3 — Deploy Java su Google Cloud Run

**Obiettivo:** pubblicare il backend Spring Boot su Cloud Run con Docker, collegato a Neon.

**Tempo stimato:** 45–60 minuti (prima volta).

**Prerequisiti:** Fase 1 e 2 ok, account GCP con billing attivo.

---

## Panoramica — cosa faremo

1. Creare progetto GCP e abilitare API
2. Creare repository Docker su Artifact Registry
3. Build immagine Docker in locale
4. Push immagine su GCP
5. Deploy su Cloud Run con variabili d’ambiente
6. Verificare che Java risponda su URL pubblico

---

## Step 3.1 — Installa e configura gcloud CLI

```bash
brew install google-cloud-sdk
gcloud init
```

**Cosa fa `gcloud init`:**
- Apre browser per login Google
- Ti chiede quale **project** usare (o ne crea uno nuovo)
- Imposta regione default (scegli `europe-west1` o `europe-west4`)

Verifica:

```bash
gcloud config list
gcloud auth list
```

Annota in `deploy-notes.txt`:

```
GCP_PROJECT_ID=il-tuo-project-id
GCP_REGION=europe-west1
```

---

## Step 3.2 — Abilita le API necessarie

```bash
export GCP_PROJECT_ID='il-tuo-project-id'
gcloud config set project "$GCP_PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

**Cosa fa ogni API:**
- `run.googleapis.com` — Cloud Run (hosting container)
- `artifactregistry.googleapis.com` — registry immagini Docker
- `cloudbuild.googleapis.com` — build opzionale in cloud (non obbligatorio se buildi in locale)

Attendi ~1–2 minuti. Output: `Operation finished successfully`.

---

## Step 3.3 — Crea repository Docker

```bash
export GCP_REGION='europe-west1'
export AR_REPO='interview'

gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="Interview app containers"
```

**Cosa fa:** crea un “contenitore” per le immagini Docker nel tuo progetto GCP.

**Se esiste già:** ignora l’errore `already exists`.

Configura Docker per push su Artifact Registry:

```bash
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev"
```

**Cosa fa:** aggiunge credenziali a Docker così `docker push` funziona verso GCP.

---

## Step 3.4 — Build immagine Java in locale

```bash
cd /Users/vincenzo/Desktop/websites/interview

export IMAGE_JAVA="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO}/java-backend:latest"

docker build --platform linux/amd64 -t "$IMAGE_JAVA" ./java-backend
```

**Cosa fa ogni parte:**
- `docker build` — legge `java-backend/Dockerfile`, compila con Gradle dentro il container, crea JAR
- `-t "$IMAGE_JAVA"` — tag dell’immagine (nome completo registry)
- `./java-backend` — contesto build (cartella con Dockerfile)

**Tempo:** 3–10 minuti la prima volta.

**Verifica immagine creata:**

```bash
docker images | grep java-backend
```

---

## Step 3.5 — Push immagine su GCP

```bash
docker push "$IMAGE_JAVA"
```

**Cosa fa:** carica i layer dell’immagine su Artifact Registry.

**Output atteso:** progress `Pushed` per vari layer.

**Obbligatorio prima del deploy:** senza push, errore `Image not found`.

---

## Step 3.6 — Verifica architettura (Mac Apple Silicon) — **OBBLIGATORIO**

Cloud Run gira su **linux/amd64**. Se buildi su Mac M1/M2/M3 senza `--platform`, l’immagine su GCP resta **ARM** e Cloud Run logga:

```
exec format error
failed to load /opt/java/openjdk/bin/java
The user-provided container failed to start and listen on the port ... PORT=8080
```

**Fix:** build con `--platform linux/amd64`, push, poi **verifica**:

```bash
docker pull --platform linux/amd64 "$IMAGE_JAVA"
```

| Esito | Azione |
|-------|--------|
| Nessun warning `linux/arm64` | Procedi al deploy |
| Warning `platform (linux/arm64)` | Rifai build amd64 + push |

**Perché il build locale amd64 non basta:** Cloud Run legge l’immagine dal **registry GCP**, non dal Docker locale. Devi pushare dopo ogni build amd64.

---

## Step 3.7 — Prepara variabili d’ambiente per Cloud Run

Java in produzione ha bisogno di:

| Variabile | Valore |
|-----------|--------|
| `SPRING_PROFILES_ACTIVE` | `docker` (usa `application-docker.yml` tranne datasource) |
| `SPRING_DATASOURCE_URL` | JDBC Neon **pooled** |
| `SPRING_DATASOURCE_USERNAME` | user Neon |
| `SPRING_DATASOURCE_PASSWORD` | password Neon |
| `APP_PYTHON_AI_BASE_URL` | URL Python Cloud Run (dopo fase 4) o temporaneo |
| `APP_JWT_SECRET` | stringa random ≥32 caratteri |
| `APP_PUBLIC_URL` | URL Vercel (dopo fase 5) o placeholder |

**Genera JWT secret:**

```bash
openssl rand -base64 32
```

**Nota su Python URL:** al primo deploy Java puoi mettere un placeholder; dopo la fase 4 aggiorni il servizio.

**Errore env vars:** in `--set-env-vars` ogni entry deve essere `CHIAVE=valore`. Non omettere `APP_JWT_SECRET=` prima del secret generato con `openssl rand -base64 32`.

Per datasource in Cloud Run **sovrascrivi** il default di `application-docker.yml` (che punta a `db:5432` interno Docker).

---

## Step 3.8 — Deploy su Cloud Run

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
  --set-env-vars="SPRING_DATASOURCE_URL=jdbc:postgresql://ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require,SPRING_DATASOURCE_USERNAME=neondb_owner,SPRING_DATASOURCE_PASSWORD=LA_PASSWORD,APP_PYTHON_AI_BASE_URL=http://localhost:8001,APP_JWT_SECRET=IL_SECRET_GENERATO,APP_PUBLIC_URL=https://placeholder.vercel.app"
```

**Deploy riuscito (esempio):** `https://interview-java-932950348509.europe-west1.run.app` → `{"status":"UP"}`.

**Cosa fa ogni flag:**
| Flag | Significato |
|------|-------------|
| `deploy interview-java` | nome servizio Cloud Run |
| `--image` | immagine da Artifact Registry |
| `--region` | datacenter EU |
| `--allow-unauthenticated` | URL pubblico (necessario per Vercel) |
| `--port=8080` | porta del container (EXPOSE nel Dockerfile) |
| `--memory=1Gi` | RAM (Java Spring ha bisogno di almeno 512Mi–1Gi) |
| `--timeout=300` | max 5 min per request (search possono essere lunghe via proxy) |
| `--min-instances=0` | scale to zero = costi bassi quando idle |
| `--set-env-vars` | variabili ambiente passate al container |

**Output atteso:**

```
Service [interview-java] revision [...] has been deployed
Service URL: https://interview-java-xxxxx-ew.a.run.app
```

**Salva la Service URL** in `deploy-notes.txt` come `JAVA_CLOUD_RUN_URL`.

---

## Step 3.9 — Verifica deploy Java

```bash
export JAVA_CLOUD_RUN_URL='https://interview-java-xxxxx-ew.a.run.app'

curl -s "${JAVA_CLOUD_RUN_URL}/actuator/health"
```

Output atteso: `"status":"UP"`.

Test autenticazione (opzionale):

```bash
curl -s -o /dev/null -w "%{http_code}" "${JAVA_CLOUD_RUN_URL}/api/jobs/searches"
```

401 o 403 = servizio ok, richiede login (normale).

---

## Step 3.10 — Leggi i log se qualcosa fallisce

```bash
gcloud run services logs read interview-java --region="$GCP_REGION" --limit=50
```

**Cosa cercare:**
- `Flyway ... Success` — schema ok
- `Connection refused` verso Neon — URL/credenziali sbagliate
- `OutOfMemoryError` — aumenta `--memory=2Gi`

---

## Step 3.11 — Aggiornare dopo modifiche (redeploy)

Quando cambi codice Java:

```bash
docker build --platform linux/amd64 -t "$IMAGE_JAVA" ./java-backend
docker push "$IMAGE_JAVA"
gcloud run deploy interview-java --image="$IMAGE_JAVA" --region="$GCP_REGION"
```

Le env vars restano quelle del deploy precedente.

Per cambiare solo env:

```bash
gcloud run services update interview-java \
  --region="$GCP_REGION" \
  --set-env-vars="APP_PYTHON_AI_BASE_URL=https://interview-python-xxxxx.run.app"
```

---

## Step 3.12 — Checkpoint

- [ ] Immagine Docker buildata e pushata
- [ ] Cloud Run `interview-java` in stato Ready
- [ ] `/actuator/health` risponde UP
- [ ] `JAVA_CLOUD_RUN_URL` salvata

**Prossimo passo:** [04-gcp-cloud-run-python.md](./04-gcp-cloud-run-python.md)

---

## Alternative più semplice (senza docker build locale)

Cloud Run può buildare da sorgente:

```bash
gcloud run deploy interview-java \
  --source=./java-backend \
  --region="$GCP_REGION" \
  --allow-unauthenticated \
  --port=8080
```

**Pro:** non serve `docker push` manuale.  
**Contro:** meno controllo sulla build; prima volta più lenta.

Usa il flusso Docker manuale (step 3.4–3.7) se vuoi capire ogni passaggio.

---

## Costi indicativi

Cloud Run scale-to-zero: spesso **€0–5/mese** con traffico basso.  
Artifact Registry: pochi centesimi per GB immagine.
