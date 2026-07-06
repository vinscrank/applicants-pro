# Errori deploy reali — cosa abbiamo visto e come risolverli

Riferimento rapido agli errori incontrati durante il primo deploy (progetto `interview-pro-vincenzo`).

Dettaglio completo: [GUIDA-COMPLETA.md](./GUIDA-COMPLETA.md)

---

## GCP Cloud Run — Java

### `Image not found`

```
ERROR: Image 'europe-west1-docker.pkg.dev/.../java-backend:latest' not found.
```

**Causa:** deploy senza `docker push` prima.

**Fix:** build → push → deploy.

---

### `exec format error` / container non parte su PORT=8080

Log Cloud Run:

```
failed to load /opt/java/openjdk/bin/java: exec format error
The user-provided container failed to start and listen on the port ... PORT=8080
```

**Causa:** immagine buildata su **Mac ARM** senza `--platform linux/amd64`. Su Artifact Registry resta ARM; Cloud Run usa amd64.

**Fix:**

```bash
docker build --platform linux/amd64 -t IMAGE ./java-backend
docker push IMAGE
docker pull --platform linux/amd64 IMAGE   # nessun warning arm64
gcloud run deploy ...
```

---

### `Failed to configure a DataSource: 'url' attribute is not specified`

**Causa:** usato `--set-env-vars="APP_PYTHON_AI_BASE_URL=..."` per aggiornare **una sola** variabile. `--set-env-vars` **sostituisce tutte** le env — cancella Neon, JWT, ecc.

**Fix redeploy completo** con tutte le env, oppure in futuro:

```bash
gcloud run services update interview-java \
  --update-env-vars="APP_PYTHON_AI_BASE_URL=https://..."
```

| Flag | Comportamento |
|------|---------------|
| `--set-env-vars` | Sostituisce **tutto** |
| `--update-env-vars` | Aggiorna **solo** le chiavi indicate |

---

## Vercel — Frontend

### Build: `Can't resolve 'rxjs'`

```
Module not found: Can't resolve 'rxjs'
import { map, shareReplay } from "rxjs";
./node_modules/@apollo/client/...
```

**Causa:** Apollo Client 4 peer dependency mancante in `frontend/package.json`.

**Fix:** `npm install rxjs` → commit `package.json` + `package-lock.json` → push.

---

### Browser: 404 NOT_FOUND (pagina bianca Vercel)

```
404: NOT_FOUND
Code: NOT_FOUND
ID: dub1::44kj6-1783335241981-ae188b1c24e0
```

**Aspetto:** box grigio Vercel, non la tua UI.

**Cause tipiche:**

1. Ultimo deploy **Failed** (es. per rxjs) — nessuna produzione valida
2. **Root Directory** non impostata su `frontend`
3. URL di un deploy fallito o preview scaduta

**Fix:** Deployments → Ready (verde) → apri URL produzione. Root Directory = `frontend`.

---

### CORS in browser (dopo deploy riuscito)

```
Access to fetch ... run.app ... blocked by CORS ... vercel.app
```

**Fix:** aggiungi `https://*.vercel.app` in `CorsConfig.java` → `./scripts/deploy-java-prod.sh`

---

## Locale — sviluppo

### `Backend unreachable. Check that Docker is running`

**Causa:** `.env.local` punta a `:8081` (test Neon) ma Docker Java è su `:8080`, oppure container spenti.

**Fix:** `.env.local` → `8080` + `docker compose up -d`

### `Port 8080 already in use` (Flyway / bootRun)

Flyway può essere **già ok** prima dell’errore. Verifica con `psql` → `\dt`. Oppure `SPRING_PROFILES_ACTIVE=local` (porta 8081) o ferma Docker Java.

### `python: command not found` / `No module named sqlalchemy`

```bash
cd python-ai && source .venv/bin/activate && pip install -r requirements.txt
```

---

## Redeploy veloce (dopo prima configurazione)

| Cosa modifichi | Comando |
|----------------|---------|
| Java (CORS, codice) | `./scripts/deploy-java-prod.sh` |
| Python | `./scripts/deploy-python-prod.sh` |
| Frontend | `git push origin main` |
| Una env GCP | `gcloud run services update ... --update-env-vars="KEY=value"` |

---

## URL produzione (esempio sessione deploy)

```
GCP_PROJECT_ID=interview-pro-vincenzo
GCP_REGION=europe-west1
JAVA_CLOUD_RUN_URL=https://interview-java-932950348509.europe-west1.run.app
PYTHON_CLOUD_RUN_URL=https://interview-python-932950348509.europe-west1.run.app
VERCEL_URL=https://tuo-progetto.vercel.app   # dopo deploy Vercel Ready
```
