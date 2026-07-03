# Fase 0 — Inventario API (baseline)

Snapshot al refactor phase 0. Backend Python FastAPI su porta **8000**. Frontend Next.js su **3000**.

Legenda owner futuro:

- **Java** — migrato a Spring Boot + GraphQL (o REST dove serve, es. Stripe webhook)
- **Python** — resta in `python-ai/` (scraper, LLM, vector)
- **Java→Python** — Java espone GraphQL/REST pubblico, delega a Python interno

---

## Core (`main.py`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| GET | `/api/health` | Java | Health check gateway |
| GET | `/api/stats` | Java | Statistiche candidature |
| GET | `/api/applications/company-names` | Java | Autocomplete aziende |
| GET | `/api/companies` | Java | Alias legacy company names |
| GET | `/api/tasks` | Java | Task/follow-up da applications |
| GET | `/api/applications` | Java | Lista candidature |
| GET | `/api/applications/match-page` | Java→Python | Match URL pagina job (extension) |
| POST | `/api/applications/sync-session` | Java | Sync extension apply session |
| GET | `/api/applications/{id}` | Java | Dettaglio candidatura |
| POST | `/api/applications` | Java | Crea candidatura |
| PUT | `/api/applications/{id}` | Java | Aggiorna candidatura |
| DELETE | `/api/applications/{id}` | Java | Elimina candidatura |
| GET | `/api/export` | Java | Export JSON candidature |
| POST | `/api/import` | Java | Import JSON candidature |

---

## Auth (`/api/auth`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| POST | `/api/auth/register` | Java | Registrazione + JWT |
| POST | `/api/auth/login` | Java | Login + JWT |
| GET | `/api/auth/me` | Java | User + profile summary |
| PUT | `/api/auth/profile` | Java | Aggiorna profilo |
| POST | `/api/auth/profile/cv` | Java | Upload CV |
| GET | `/api/auth/profile/cv` | Java | Download CV |
| DELETE | `/api/auth/profile/cv` | Java | Rimuovi CV |
| POST | `/api/auth/forgot-password` | Java | Reset email |
| POST | `/api/auth/reset-password` | Java | Reset con token |

---

## Billing (`/api/billing`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| GET | `/api/billing/plans` | Java | Piani Stripe |
| GET | `/api/billing/status` | Java | Stato abbonamento |
| POST | `/api/billing/checkout` | Java | Session checkout |
| POST | `/api/billing/portal` | Java | Customer portal |
| POST | `/api/billing/webhook` | Java | Webhook Stripe (REST, no GraphQL) |

---

## Offerte / Search (`/api/offerte`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| GET | `/api/offerte/search/default` | Java→Python | Prompt default |
| POST | `/api/offerte/search/parse` | Java→Python | Parse prompt LLM |
| PUT | `/api/offerte/llm/controls` | Python | Toggle operazioni LLM |
| GET | `/api/offerte/llm/stats` | Python | Usage/budget stats |
| PUT | `/api/offerte/llm/budget` | Python | Budget mensile |
| GET | `/api/offerte/preferences` | Java | Preferenze search utente |
| PUT | `/api/offerte/preferences` | Java | Salva preferenze |
| POST | `/api/offerte/search` | Java→Python | Esegue ricerca (long timeout) |
| GET | `/api/offerte/searches/latest` | Java | Ultima search persistita |
| GET | `/api/offerte/searches` | Java | Storico search |
| GET | `/api/offerte/searches/{id}` | Java | Dettaglio search + offers |
| PUT | `/api/offerte/offers/{id}/applied` | Java | Segna applicata |
| PUT | `/api/offerte/offers/{id}/dismissed` | Java | Escludi offerta |
| POST | `/api/offerte/offers/{id}/track` | Java | Crea/aggiorna candidatura da offerta |
| POST | `/api/offerte/analyze-url` | Java→Python | Analisi annuncio URL |
| GET | `/api/offerte/page-embed` | Java→Python | HTML embed annuncio |
| POST | `/api/offerte/analyze-url/track` | Java→Python | Track da URL analizzato |
| GET | `/api/offerte/companies` | Java | Lista companies monitorate |
| GET | `/api/offerte/companies/{id}` | Java | Dettaglio company |
| POST | `/api/offerte/companies` | Java | Crea company |
| PUT | `/api/offerte/companies/{id}` | Java | Aggiorna company |
| DELETE | `/api/offerte/companies/{id}` | Java | Elimina company |
| POST | `/api/offerte/companies/{id}/scan` | Java→Python | Scan careers page |
| POST | `/api/offerte/companies/scan-all-recent` | Java→Python | Scan batch recenti |
| POST | `/api/offerte/companies/scan-all-search` | Java→Python | Scan batch by title |
| POST | `/api/offerte/companies/discover-url` | Java→Python | Discover da URL |
| POST | `/api/offerte/companies/discover-name` | Java→Python | Discover da nome |
| POST | `/api/offerte/companies/auto-discover` | Java→Python | Auto discovery LLM |

---

## Apply / AI fit (`/api/apply`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| POST | `/api/apply/page-fit` | Java→Python | Profile fit AI (extension + app) |
| POST | `/api/apply/map-form` | Python | Mappa form candidatura |
| POST | `/api/apply/learn-summary` | Python | Apprendimento summary |

---

## Vector / RAG (`/api/vector`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| GET | `/api/vector/status` | Python | Stato indice vector |
| POST | `/api/vector/reindex` | Python | Reindex embeddings |
| POST | `/api/vector/assistant/ask` | Java→Python | Assistant RAG |
| GET | `/api/vector/similar-jobs` | Java→Python | Job simili per profilo |

---

## Data backup (`/api/data`)

| Metodo | Path | Owner futuro | Note |
|--------|------|--------------|------|
| GET | `/api/data/export` | Java | Dump SQL database |
| POST | `/api/data/import` | Java | Import dump SQL |

---

## Porte e servizi (baseline)

| Servizio | Porta host | Path |
|----------|------------|------|
| Frontend Next.js | 3000 | `/` |
| Backend Python | 8000 | `/api/*` |
| PostgreSQL + pgvector | 5434 | — |
| Java backend | — | Non presente (fase 1+) |

---

## Frontend → API (moduli principali)

| Modulo FE | Client HTTP | Prefix |
|-----------|-------------|--------|
| Auth | `authFetch` | `/api/auth` |
| Applications | `authFetch` | `/api/applications`, `/api/stats`, `/api/tasks` |
| Offerte | `offerteFetch` | `/api/offerte` |
| Vector | `authFetch` | `/api/vector` |
| Billing | `authFetch` | `/api/billing` |
| Data backup | `fetch` | `/api/data` |
| Extension | `fetch` | `/api/applications`, `/api/apply`, `/api/offerte` |

Timeout lunghi definiti in `frontend/src/auth/http.ts` per search, analyze-url, vector, company scan.

---

## Extension Chrome

| Flusso | Endpoint attuale |
|--------|------------------|
| Page fit | `POST /api/apply/page-fit` |
| Sync session | `POST /api/applications/sync-session` |
| Match page | `GET /api/applications/match-page` |

Target fase 13: extension punta a Java gateway (8080 o reverse proxy unico).
