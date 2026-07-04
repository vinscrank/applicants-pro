# Refactor Candidature — Java + GraphQL + Apollo (per fasi)

Piano incrementale per imparare Java enterprise su **questo** progetto, mantenendo Python per AI/scraping.
Ogni fase = **branch dedicato**, **testabile da sola**, merge solo quando verde.

**Guide operative per fase (spiegate per chi viene da PHP/Laravel):** [docs/phases/README.md](phases/README.md) — convenzione in [docs/phases/CONVENZIONE-DOC.md](phases/CONVENZIONE-DOC.md)

## Regole del refactor

1. **Un branch per fase** — naming: `refactor/phase-NN-short-name`
2. **main resta sempre deployabile** — niente merge a metà fase
3. **Definition of Done** obbligatoria prima del merge
4. **Python resta attivo** finché Java non sostituisce quel dominio
5. **Nessuna fase** rompe extension, Docker, login o tracker base
6. Dopo ogni merge: tag opzionale `phase-NN` per snapshot portfolio

## Branch map (overview)

| Fase | Branch | Cosa impari | Cosa resta Python |
|------|--------|-------------|-------------------|
| 0 | `refactor/phase-00-baseline` | Baseline, doc, CI smoke | Tutto |
| 1 | `refactor/phase-01-java-scaffold` | Gradle, Spring Boot, Flyway, Testcontainers | Tutto |
| 2 | `refactor/phase-02-schema-flyway` | JPA entities, migrations SQL | Tutto |
| 3 | `refactor/phase-03-health-parallel` | Docker multi-service, profili Spring | Tutto |
| 4 | `refactor/phase-04-auth-java` | Spring Security, JWT, password | Auth Python ancora attivo (dual) |
| 5 | `refactor/phase-05-applications-read` | Service layer, GraphQL Query read-only | Write REST Python |
| 6 | `refactor/phase-06-applications-write` | Mutation GraphQL, @Transactional | Jobs/AI Python |
| 7 | `refactor/phase-07-apollo-read` | Apollo Client, query applications | Jobs REST |
| 8 | `refactor/phase-08-auth-apollo` | Login/register via GraphQL + FE | Jobs REST |
| 9 | `refactor/phase-09-python-ai-service` | Estrazione `python-ai/`, contratto HTTP | Scraper/LLM/vector |
| 10 | `refactor/phase-10-java-orchestrates-search` | RestClient Java → Python, GraphQL search | LLM inside Python |
| 11 | `refactor/phase-11-apollo-jobs` | FE jobs via GraphQL | Python interno |
| 12 | `refactor/phase-12-billing-stats` | Stripe webhooks, stats GraphQL | AI Python |
| 13 | `refactor/phase-13-extension-gateway` | Extension → Java gateway | AI Python |
| 14 | `refactor/phase-14-redis-cache` | Redis read cache | AI Python |
| 15 | `refactor/phase-15-ci-hardening` | GitHub Actions, README portfolio EN | — |
| 16 | `refactor/phase-16-deprecate-python-core` | Rimuovi auth/applications Python | Solo `python-ai/` |

---

## Fase 0 — Baseline e inventario

**Branch:** `refactor/phase-00-baseline`  
**Guida:** [docs/phases/phase-00-baseline.md](phases/phase-00-baseline.md)  
**Obiettivo:** Congelare lo stato attuale, definire cosa migra e come si testa ogni fase. Zero codice Java.

### Cosa fare

- [ ] Inventario API in `docs/phase-00-api-inventory.md`
- [ ] Inventario tabelle PostgreSQL (sezione sotto)
- [ ] Eseguire checklist test manuale baseline
- [ ] Verificare `docker compose up --build` verde
- [ ] PR con solo documentazione → merge in `main`

### Tabelle PostgreSQL (baseline)

| Tabella | Modello | Owner futuro |
|---------|---------|--------------|
| `users` | `User` | Java |
| `user_profiles` | `UserProfile` | Java |
| `applications` | `Application` | Java |
| `job_searches` | `JobSearch` | Java (persist) + Python (search logic) |
| `job_offers` | `JobOfferRow` | Java (persist) + Python (search logic) |
| `job_applied_offers` | `JobAppliedOffer` | Java |
| `job_dismissed_offers` | `JobDismissedOffer` | Java |
| `monitored_companies` | `MonitoredCompany` | Java (CRUD) + Python (scan/discover) |
| `llm_usage` | `LlmUsageRow` | Python |
| `llm_settings` | `LlmSettingsRow` | Python (admin) / Java (read budget) |
| `user_job_preferences` | `UserJobPreferences` | Java |
| `vector_documents` | `VectorDocument` | Python |

### Checklist test manuale (Definition of Done Fase 0)

- [ ] Login / register
- [ ] Lista candidature (kanban)
- [ ] Crea / modifica / elimina candidatura
- [ ] Ricerca jobs con prompt (parse + search)
- [ ] Profile fit su annuncio
- [ ] Profilo + CV upload
- [ ] Extension: widget visibile su pagina job (smoke)
- [ ] `GET http://localhost:8000/api/health` → OK
- [ ] Frontend `http://localhost:3000` carica

### Comandi

```bash
git checkout main
git pull
git checkout -b refactor/phase-00-baseline
git add docs/
git commit -m "docs: baseline refactor Java portfolio (phase 0)"
git push -u origin refactor/phase-00-baseline
```

---

## Fase 1 — Scaffold Java (hello enterprise)

**Branch:** `refactor/phase-01-java-scaffold`  
**Guida:** [docs/phases/phase-01-java-scaffold.md](phases/phase-01-java-scaffold.md)  
**Prerequisito:** Fase 0 merged  
**Impara:** Gradle, Spring Boot 3, package structure, Actuator, JUnit

### Cosa fare

- [ ] Creare `java-backend/` con Gradle Kotlin DSL
- [ ] Package: `com.candidature` → `config`, `domain`, `repository`, `service`, `graphql`, `exception`
- [ ] `GET /actuator/health` → UP
- [ ] Test smoke `@SpringBootTest` (context loads)
- [ ] Non toccare Python, FE, Docker compose produzione

### Definition of Done

```bash
cd java-backend && ./gradlew test && ./gradlew bootRun --args='--spring.profiles.active=local'
curl http://localhost:8081/actuator/health
```

Profilo `local` usa porta **8081** (8080 riservata a fase Docker). Flyway disabilitato fino a fase 2.

Python su :8000 continua a funzionare indipendentemente.

---

## Fase 2 — Flyway + schema V1 (read-only DB)

**Branch:** `refactor/phase-02-schema-flyway`  
**Impara:** Flyway, SQL migrations, JPA `@Entity`, `ddl-auto=validate`

### Cosa fare

- [ ] `V1__extensions.sql` — `CREATE EXTENSION IF NOT EXISTS vector`
- [ ] `V2__users_profiles.sql` — da `User`, `UserProfile`
- [ ] `V3__applications.sql` — da `Application`
- [ ] Entity JPA con stessi nomi tabella/colonne del Python
- [ ] Testcontainers: Flyway applica migrations su PG 16

### Definition of Done

```bash
./gradlew test
```

Schema identico a quello Python su DB nuovo/vuoto. Non migrare dati produzione in questa fase.

---

## Fase 3 — Java in Docker (parallel run)

**Branch:** `refactor/phase-03-health-parallel`  
**Impara:** Spring profiles, Docker Compose multi-service

### Cosa fare

- [ ] `Dockerfile` per `java-backend`
- [ ] `docker-compose.yml`: servizio `java-backend:8080`
- [ ] Profilo `local`: stesso PostgreSQL di Python
- [ ] Python resta default per FE (`BACKEND_URL` invariato)

### Definition of Done

```bash
docker compose up -d --build
curl http://localhost:8080/actuator/health
curl http://localhost:8000/api/health
```

FE login + search ancora OK via Python.

---

## Fase 4 — Auth Java (dual stack)

**Branch:** `refactor/phase-04-auth-java`  
**Impara:** Spring Security, JWT, BCrypt, filter chain

### Cosa fare

- [ ] `UserDetailsService`, login/register REST interno Java (`/api/v2/auth/*` temporaneo)
- [ ] JWT access token (header `Authorization: Bearer` compatibile)
- [ ] Test integration: register → login → me
- [ ] Python auth ancora attivo — FE non switcha

### Definition of Done

```bash
curl -X POST localhost:8080/api/v2/auth/register ...
curl -H "Authorization: Bearer ..." localhost:8080/api/v2/auth/me
./gradlew test
```

---

## Fase 5 — GraphQL read: applications

**Branch:** `refactor/phase-05-applications-read`  
**Impara:** Spring GraphQL, schema, thin resolver, service layer

### Cosa fare

- [ ] `schema.graphqls`: `Query { me, applications }`
- [ ] `ApplicationService.listForUser(userId)`
- [ ] Security context da JWT
- [ ] FE ancora REST Python per applications

### Definition of Done

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ applications { id companyName jobTitle status } }"}'
```

---

## Fase 6 — GraphQL write: applications CRUD

**Branch:** `refactor/phase-06-applications-write`  
**Impara:** Mutation, `@Transactional`, Bean Validation, error mapping GraphQL

### Cosa fare

- [ ] Mutation: `createApplication`, `updateApplication`, `deleteApplication`
- [ ] Portare logica da `crud.py` / `main.py`
- [ ] Testcontainers E2E GraphQL CRUD
- [ ] Feature flag FE: `NEXT_PUBLIC_USE_JAVA_APPLICATIONS=false` (default)

### Definition of Done

- Test automatici Java verdi
- Con flag `true` (dev): CRUD da GraphQL funziona
- Con flag `false`: app invariata via Python

---

## Fase 7 — Apollo Client (read applications)

**Branch:** `refactor/phase-07-apollo-read`  
**Impara:** Apollo Client, cache, Next.js App Router provider

### Cosa fare

- [ ] `@apollo/client` + provider in layout app
- [ ] Sostituire fetch applications solo lettura (lista/kanban)
- [ ] Loading/error states

### Definition of Done

- Kanban carica da GraphQL Java
- Creazione candidatura ancora funziona
- Nessuna regressione jobs

---

## Fase 8 — Auth + Apollo end-to-end

**Branch:** `refactor/phase-08-auth-apollo`  
**Impara:** Token storage, auth link Apollo, protected routes

### Cosa fare

- [ ] Login/register FE → Java GraphQL mutation o REST Java
- [ ] Apollo `authLink` con JWT
- [ ] Disabilitare login Python nel FE

### Definition of Done

- Flusso: register → login → kanban GraphQL → logout
- Extension: token format compatibile

---

## Fase 9 — Estrazione `python-ai/`

**Branch:** `refactor/phase-09-python-ai-service`  
**Impara:** Bounded context, contratto API interno, Docker service rename

### Cosa fare

- [ ] Spostare scraper, apply, vector → `python-ai/`
- [ ] Slim FastAPI: solo router AI/scraper
- [ ] Compose: servizio `python-ai:8001`

### Definition of Done

```bash
docker compose up -d
curl http://localhost:8001/docs
```

Search jobs funziona. Applications via Java.

---

## Fase 10 — Java orchestrator per search

**Branch:** `refactor/phase-10-java-orchestrates-search`  
**Impara:** RestClient, timeout, GraphQL mutation long-running

### Cosa fare

- [ ] Java `JobsService` → proxy verso Python
- [ ] GraphQL: `parseSearchPrompt`, `runJobSearch`
- [ ] Auth + billing check in Java prima di chiamare Python
- [ ] Feature flag `NEXT_PUBLIC_USE_JAVA_SEARCH`

### Definition of Done

- Search end-to-end: FE → Java GraphQL → Python → Java → FE

---

## Fase 11 — Apollo per jobs

**Branch:** `refactor/phase-11-apollo-jobs`  
**Impara:** Mutation async, cache update, pagination GraphQL

### Cosa fare

- [ ] Migrare `JobsView` a Apollo
- [ ] Python non esposto pubblicamente (solo rete Docker interna)

### Definition of Done

- Ricerca jobs via GraphQL Java

---

## Fase 12 — Billing, stats, data export

**Branch:** `refactor/phase-12-billing-stats`  
**Impara:** Stripe webhooks Spring, file upload CV

### Cosa fare

- [ ] Portare billing, stats, export/import DB
- [ ] CV upload su Java (stesso volume)

### Definition of Done

- Checkout Stripe + export/import DB funzionanti

---

## Fase 13 — Extension → Java gateway

**Branch:** `refactor/phase-13-extension-gateway`  
**Impara:** CORS, API gateway, sync-session

### Cosa fare

- [ ] Extension → base URL Java
- [ ] `sync-session`, `page-fit` (Java → Python)

### Definition of Done

- Extension su LinkedIn: fit + sync session OK

---

## Fase 14 — Redis cache

**Branch:** `refactor/phase-14-redis-cache`  
**Impara:** Spring Cache, Redis, TTL

### Cosa fare

- [ ] Redis in docker-compose
- [ ] Cache search / classify (TTL breve)

### Definition of Done

- Seconda search identica più veloce o degrade documentato

---

## Fase 15 — CI + portfolio README

**Branch:** `refactor/phase-15-ci-hardening`  
**Impara:** GitHub Actions, README EN

### Cosa fare

- [ ] Workflow CI: Java + Python smoke + FE build
- [ ] README EN + `docs/architecture.md` con ADR

### Definition of Done

- PR verde su GitHub Actions

---

## Fase 16 — Cleanup Python legacy

**Branch:** `refactor/phase-16-deprecate-python-core`  
**Impara:** Deprecation, monorepo hygiene

### Cosa fare

- [ ] Rimuovere `backend/` legacy (auth, crud, main applications)
- [ ] Solo `java-backend/` + `python-ai/` + `frontend/` + `extension/`
- [ ] Tag release `v2.0.0-portfolio`

### Definition of Done

- Checklist Fase 0 ancora verde

---

## Template branch (ogni fase)

```bash
git checkout main
git pull
git checkout -b refactor/phase-NN-nome
git push -u origin refactor/phase-NN-nome
gh pr create --title "refactor(phase-NN): descrizione breve"
```

## Feature flags consigliati (frontend)

| Flag | Fase | Default |
|------|------|---------|
| `NEXT_PUBLIC_USE_JAVA_APPLICATIONS` | 6–7 | `false` → `true` fase 7 |
| `NEXT_PUBLIC_USE_JAVA_AUTH` | 8 | `false` → `true` |
| `NEXT_PUBLIC_USE_JAVA_SEARCH` | 10–11 | `false` → `true` |
| `NEXT_PUBLIC_GRAPHQL_URL` | 5+ | `http://localhost:8080/graphql` |

## Struttura repo target (fine fase 16)

```
candidature/
├── java-backend/
├── python-ai/
├── frontend/
├── extension/
├── docs/
│   ├── refactor-java-portfolio.md
│   ├── phase-00-api-inventory.md
│   └── architecture.md
├── docker-compose.yml
└── .github/workflows/
```

## Stack portfolio (narrativa colloquio)

| Layer | Tecnologia |
|-------|------------|
| Core API | Java 25, Spring Boot 3, Spring GraphQL, JPA, Flyway |
| AI / scraping | Python FastAPI, Gemini, pgvector |
| Frontend | React, Next.js, Apollo Client, TypeScript |
| DB | PostgreSQL 16 + pgvector |
| Cache | Redis (fase 14) |
| Quality | Testcontainers, JUnit, GitHub Actions |
| Extra | Chrome extension |
