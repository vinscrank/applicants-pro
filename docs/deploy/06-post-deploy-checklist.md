# Fase 6 — Checklist post-deploy e iterazione

**Obiettivo:** confermare che tutto funziona in produzione e sapere come aggiornare da lì in poi.

---

## Architettura finale

```
https://tuo-app.vercel.app          ← Frontend (Vercel)
        │
        ▼
https://interview-java-xxx.run.app   ← Java API + GraphQL (Cloud Run)
        │
        ├──► Neon PostgreSQL (pooled)
        │
        └──► https://interview-python-xxx.run.app  ← Python AI (Cloud Run)
                    │
                    └──► Neon PostgreSQL (pooled)
```

---

## Checklist funzionale completa

### Auth e profilo
- [ ] Registrazione nuovo utente
- [ ] Login utente migrato da locale
- [ ] Logout
- [ ] Modifica profilo salvata su Neon
- [ ] Reset password (se configurato SMTP)

### Tracker
- [ ] Lista candidature (`applications`)
- [ ] Creazione nuova candidatura
- [ ] Cambio stato pipeline
- [ ] Quick Add da URL

### Discover
- [ ] Live Jobs search (Java → Python → LLM)
- [ ] Careers scan watchlist
- [ ] Profile fit badge visibile
- [ ] Filtro Strong matches
- [ ] Apply & track

### Today
- [ ] Top Matches
- [ ] Profile Readiness widget
- [ ] Alert nuovi match (dopo careers scan)

### Billing (se attivo)
- [ ] Stripe checkout
- [ ] Webhook Stripe punta a Java Cloud Run (non Vercel)
- [ ] Portal billing

---

## Verifica infrastruttura

```bash
# Java health
curl -s "${JAVA_CLOUD_RUN_URL}/actuator/health"

# Python health
curl -s "${PYTHON_CLOUD_RUN_URL}/health"

# Conteggi DB (da Mac, URL Neon direct)
psql "$NEON_DIRECT_URL" -c "SELECT COUNT(*) FROM applications;"
```

---

## Cosa NON è ancora in produzione

| Elemento | Stato | Azione futura |
|----------|-------|---------------|
| CV upload | Volume Docker locale | Migrare su Google Cloud Storage + aggiornare Java |
| Postgres locale | Ancora su Docker | Puoi spegnerlo; Neon è source of truth |
| Secret in plain env | Env vars Cloud Run | Migrare a Secret Manager GCP |
| Python pubblico | `--allow-unauthenticated` | IAM service-to-service (opzionale) |
| Monitoring | Base | Cloud Logging già attivo; aggiungi alert |
| CI/CD | Manuale | GitHub Actions → build → deploy (opzionale) |

---

## Workflow di aggiornamento (da ora in poi)

### Cambi codice Java (es. CORS)

```bash
./scripts/deploy-java-prod.sh
```

Mantiene env vars Cloud Run esistenti.

### Cambi codice Python

```bash
./scripts/deploy-python-prod.sh
```

### Cambi frontend

```bash
git push origin main
```

Vercel redeploy automatico. Verifica build **Ready** (rxjs, Root Directory `frontend`).

### Cambi solo env GCP

```bash
gcloud run services update interview-java \
  --region=europe-west1 \
  --update-env-vars="APP_PUBLIC_URL=https://tuo-progetto.vercel.app"
```

**Mai** `--set-env-vars` con una sola chiave — vedi [ERRORI-DEPLOY-REALI.md](./ERRORI-DEPLOY-REALI.md).

### Torni a sviluppare in locale

```bash
docker compose up -d
```

`.env.local` → `localhost:8080`. DB = Postgres Docker, non Neon.

---

## Workflow manuale (alternativa)

### Cambi schema DB

1. Aggiungi migration Flyway in `java-backend/src/main/resources/db/migration/V7__....sql`
2. Deploy Java → Flyway applica su Neon all’avvio
3. **Non** editare schema a mano su Neon

### Sync dati locale → Neon (se lavori in locale un po’)

```bash
./scripts/db-export-local.sh
./scripts/db-import-neon.sh ./dumps/interview-data-ULTIMO.sql --yes
```

Attenzione: sovrascrive dati su Neon con quelli locali.

---

## Comandi utili GCP

```bash
# Lista servizi Cloud Run
gcloud run services list --region="$GCP_REGION"

# Dettaglio env vars Java
gcloud run services describe interview-java --region="$GCP_REGION" --format='yaml(spec.template.spec.containers[0].env)'

# Log live Java
gcloud run services logs tail interview-java --region="$GCP_REGION"

# Log live Python
gcloud run services logs tail interview-python --region="$GCP_REGION"
```

**Cosa fa `logs tail`:** stream log in tempo reale (utile durante debug search).

---

## Costi mensili indicativi (traffico basso)

| Servizio | Stima |
|----------|-------|
| Neon free/pro | €0–19 |
| Cloud Run Java + Python | €0–10 |
| Artifact Registry | < €1 |
| Vercel hobby/pro | €0–20 |
| **Totale MVP** | **~€5–50/mese** |

---

## Rollback rapido

Cloud Run mantiene revisioni precedenti:

```bash
gcloud run revisions list --service=interview-java --region="$GCP_REGION"

gcloud run services update-traffic interview-java \
  --region="$GCP_REGION" \
  --to-revisions=REVISION_NAME=100
```

Sostituisci `REVISION_NAME` con la revisione stabile precedente.

---

## Supporto e documentazione interna

| Doc | Contenuto |
|-----|-----------|
| [README deploy](./README.md) | Indice + URL prod + script |
| [GUIDA-COMPLETA](./GUIDA-COMPLETA.md) | Procedura end-to-end |
| [ERRORI-DEPLOY-REALI](./ERRORI-DEPLOY-REALI.md) | 404 Vercel, rxjs, exec format, env GCP |
| [05-vercel-frontend](./05-vercel-frontend.md) | Vercel dettagliato |

---

## Sei in produzione ✅

Da questo punto:
1. Neon = database unico
2. Cloud Run = backend
3. Vercel = frontend
4. Iteri con push git + redeploy container quando serve

Per domande su un passo specifico, apri il file MD della fase e seguilo uno step alla volta.
