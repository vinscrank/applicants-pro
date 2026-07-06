# Fase 2 — Test locale con Neon

**Obiettivo:** far girare Java e Python sul tuo Mac puntando a Neon (non al Postgres Docker) e verificare che l’app veda i dati migrati.

**Tempo stimato:** 15–30 minuti.

**Prerequisiti:** Fase 1 completata, dati su Neon verificati.

---

## Step 2.1 — Ferma lo stack Docker completo (opzionale)

Se hai `docker compose up` con db + java + python, fermalo:

```bash
cd /Users/vincenzo/Desktop/websites/interview
docker compose down
```

**Cosa fa:** spegne tutti i container del compose. I dati nel volume Docker `interview_pgdata` restano sul disco (non li perdi).

Per questa fase **non serve** il Postgres locale: useremo Neon.

---

## Step 2.2 — Prepara le variabili Neon

Apri un terminale e imposta (sostituisci con i tuoi valori da `deploy-notes.txt`):

```bash
export NEON_POOLED_URL='postgresql://neondb_owner:PASSWORD@ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'

export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='neondb_owner'
export SPRING_DATASOURCE_PASSWORD='PASSWORD'

export DATABASE_URL="$NEON_POOLED_URL"
```

**Perché pooled anche in locale per il test:** simula il comportamento produzione. Per debug DB puoi usare la direct.

**Nota JDBC vs libpq:**
- Java usa JDBC: `jdbc:postgresql://host/db?sslmode=require` (senza credenziali nell’URL, le passa username/password separati)
- Python usa: `postgresql://user:pass@host/db?sslmode=require`

---

## Step 2.3 — Avvia Python AI contro Neon

**Terminale 1:**

```bash
cd /Users/vincenzo/Desktop/websites/interview/python-ai

export DATABASE_URL='postgresql://neondb_owner:PASSWORD@ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export GEMINI_API_KEY='la_tua_chiave'

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Cosa fa ogni parte:**
- `python -m uvicorn` — avvia server ASGI FastAPI
- `app.main:app` — modulo `app/main.py`, oggetto `app`
- `--port 8001` — stessa porta del Docker
- `--reload` — ricarica al save (solo dev)

**Se non hai venv:**

```bash
cd python-ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Verifica health:**

```bash
curl -s http://localhost:8001/health | head
```

Output atteso: JSON con status ok.

---

## Step 2.4 — Avvia Java contro Neon

**Terminale 2** (nuovo):

```bash
cd /Users/vincenzo/Desktop/websites/interview/java-backend

export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='neondb_owner'
export SPRING_DATASOURCE_PASSWORD='PASSWORD'

export SPRING_PROFILES_ACTIVE=local

./gradlew bootRun
```

**Perché `SPRING_PROFILES_ACTIVE=local`:**
- Usa `application-local.yml` come override
- Porta **8081** invece di 8080 (vedi `application-local.yml`)
- Python resta su 8001; Java chiama Python su `localhost:8001` (default in `application.yml`)

**Verifica health Java:**

```bash
curl -s http://localhost:8081/actuator/health
```

Output atteso: `{"status":"UP"}` o simile.

---

## Step 2.5 — Avvia frontend

**Terminale 3:**

```bash
cd /Users/vincenzo/Desktop/websites/interview/frontend

export NEXT_PUBLIC_BACKEND_URL='http://localhost:8081'

npm run dev
```

**Cosa fa `NEXT_PUBLIC_BACKEND_URL`:**
- Variabile letta da `frontend/src/lib/env.ts`
- Il browser chiama Java su quella URL per `/api/*` e GraphQL

Apri [http://localhost:3000](http://localhost:3000) (o la porta indicata da Next, es. 3001).

---

## Step 2.6 — Checklist funzionale nel browser

Verifica manualmente:

| Azione | Cosa conferma |
|--------|----------------|
| Login con utente esistente | `users` su Neon ok |
| Dashboard / Today | API Java → Neon ok |
| Lista candidature (Applications) | `applications` su Neon ok |
| Discover → Careers | Java → Python → Neon ok |
| Profilo account | `user_profiles` su Neon ok |

Se il login funziona e vedi le **190 candidature** (o il tuo numero), la migrazione è validata end-to-end.

---

## Step 2.7 — (Opzionale) Test con Docker solo backend + Neon

Alternativa: avviare Java/Python in Docker ma DB su Neon.

Crea un file **locale non committato** `.env.neon` nella root del repo:

```bash
# .env.neon — NON committare
SPRING_DATASOURCE_URL=jdbc:postgresql://ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
SPRING_DATASOURCE_USERNAME=neondb_owner
SPRING_DATASOURCE_PASSWORD=PASSWORD
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-XXX-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=...
```

Poi avvia **senza** il servizio `db`:

```bash
docker compose up --build java-backend python-ai
```

**Nota:** `docker-compose.yml` attuale non legge `.env.neon` per il datasource Java. Per farlo funzionare dovresti passare env a mano:

```bash
docker compose run --rm \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://..." \
  -e SPRING_DATASOURCE_USERNAME="..." \
  -e SPRING_DATASOURCE_PASSWORD="..." \
  -p 8080:8080 \
  java-backend
```

Per semplicità, nella prima volta usa **Terminale 1/2/3** (senza Docker) come sopra.

---

## Step 2.8 — Checkpoint ✅

- [ ] Python risponde su `:8001/health`
- [ ] Java risponde su `:8081/actuator/health`
- [ ] Frontend su `:3000` o `:3001`
- [ ] Login ok con utente migrato
- [ ] Candidature e profilo visibili

**Prossimo passo:** [03-gcp-cloud-run-java.md](./03-gcp-cloud-run-java.md)

---

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| `Connection refused` Java | Controlla porta 8081 vs 8080 |
| Login fallisce | Verifica `users` su Neon con psql |
| Search/Careers errore 502 | Python non avviato o `GEMINI_API_KEY` mancante |
| CORS error | Normale se frontend punta a URL sbagliata; usa `NEXT_PUBLIC_BACKEND_URL=http://localhost:8081` |
| `Too many connections` su Neon | Usa URL pooled, chiudi sessioni psql aperte |
