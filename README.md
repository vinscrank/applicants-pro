# Application Pro

Repository: [vinscrank/applicants-pro](https://github.com/vinscrank/applicants-pro)

Tracker candidature e ricerca lavoro — Java GraphQL + Next.js + Python AI.

## Struttura

```
applicants-pro/
├── java-backend/      Spring Boot, GraphQL, PostgreSQL
├── python-ai/         Scraper e AI (Gemini)
├── frontend/          Next.js, Apollo Client
├── docs/
├── scripts/           Deploy prod e migrazione DB
└── docker-compose.yml
```

---

## Sviluppo locale (uso quotidiano)

### 1. Avvia backend e database

```bash
docker compose up -d
```

| Servizio | URL |
|----------|-----|
| Frontend (dev) | http://localhost:3000 |
| Java API / GraphQL | http://localhost:8080 |
| Python AI | http://localhost:8001 |
| Postgres (host) | localhost:5435 |

Verifica Java: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`

### 2. Variabili ambiente locali

| File | Uso |
|------|-----|
| `frontend/.env.local` | Dev — punta a `http://localhost:8080` |
| `.env` (root) | `GEMINI_API_KEY` per Python in Docker |
| `frontend/.env` | Solo riferimento prod (URL Cloud Run); **non** usato in dev se esiste `.env.local` |

`.env.local` ha priorità su `.env` con `npm run dev`. Non committare file `.env*`.

### 3. Avvia frontend

```bash
cd frontend
npm install    # solo la prima volta o dopo cambio dipendenze
npm run dev
```

Apri http://localhost:3000

### 4. Se qualcosa non risponde

```bash
docker compose ps                    # container attivi?
docker compose up -d --build         # rebuild dopo modifiche Java/Python
docker compose logs -f java-backend  # log Java
```

Errore **"Backend unreachable"** in locale → Docker spento oppure `.env.local` non punta a `:8080`.

---

## Produzione — cosa lanciare dopo le modifiche

| Hai modificato… | Cosa fare | Comando |
|-----------------|-----------|---------|
| **Frontend** (`frontend/`) | Push su Git → Vercel fa build e deploy **automatico** | `git push origin main` |
| **Java** (`java-backend/`) | Build immagine + deploy Cloud Run | `./scripts/deploy-java-prod.sh` |
| **Python** (`python-ai/`) | Build immagine + deploy Cloud Run | `./scripts/deploy-python-prod.sh` |
| **Java + Python** | Entrambi | `./scripts/deploy-backend-prod.sh` |
| **Solo env Vercel** (`NEXT_PUBLIC_*`) | Dashboard Vercel → **Redeploy** (obbligatorio) | Vercel UI, non basta il push |
| **DB locale → Neon** | Export + import (raro) | `./scripts/db-export-local.sh` poi `./scripts/db-import-neon.sh` |

**Vercel (Next.js)** non serve script manuale: collegato al repo, ogni push su `main` ridistribuisce il frontend.

**Java e Python** sono su GCP Cloud Run: dopo ogni modifica al codice devi lanciare lo script corrispondente (build Docker `linux/amd64`, push, deploy).

### URL produzione (esempio)

| Servizio | URL |
|----------|-----|
| Java | https://interview-java-932950348509.europe-west1.run.app |
| Python | https://interview-python-932950348509.europe-west1.run.app |
| Frontend | https://tuo-progetto.vercel.app |

Env Vercel (Production): copia le `NEXT_PUBLIC_*` da `frontend/.env`. Poi redeploy.

Prerequisiti script deploy: `gcloud` autenticato, progetto `interview-pro-vincenzo`, Docker avviato.

---

## Prima installazione / migrazione DB

Setup iniziale Neon → GCP → Vercel (una tantum):

- [Guida completa deploy](docs/deploy/GUIDA-COMPLETA.md)
- [Errori deploy reali](docs/deploy/ERRORI-DEPLOY-REALI.md)
- [Indice deploy](docs/deploy/README.md)

---

## Altra documentazione

- [Piano refactor (16 fasi)](docs/refactor-java-portfolio.md)
- [GraphQL API](docs/graphql-schema.md)
- [Migrazione DB locale → Neon](docs/db-migrate-local-to-neon.md)
- [Apollo frontend](frontend/src/graphql/README.md)
