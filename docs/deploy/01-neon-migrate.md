# Fase 1 — Migrazione dati locale → Neon

**Obiettivo:** spostare utenti, candidature, aziende monitorate e tutto il resto dal Postgres Docker sul tuo Mac al database Neon in cloud.

**Tempo stimato:** 20–40 minuti.

**Prerequisiti:** Docker con container `interview-db` avviato (o export già fatto).

---

## Cosa stiamo facendo (visione d’insieme)

Oggi i tuoi dati vivono **solo sul Mac**, dentro il container Docker `interview-db`.  
In produzione il database sarà **Neon** (PostgreSQL gestito in cloud). Questa fase fa il trasloco.

Non copiamo “tutto il Docker”: copiamo **solo il database** — tabelle e righe.

```
  PRIMA                              DOPO
┌─────────────────┐                ┌─────────────────┐
│  Mac (Docker)   │   migrazione   │  Neon (cloud)   │
│  interview-db   │  ───────────►  │  neondb         │
│  porta 5435     │                │  EU Frankfurt │
└─────────────────┘                └─────────────────┘
        │                                    │
   Java/Python                         Java/Python
   (in locale)                    (poi su Cloud Run)
```

### Le tre operazioni (in ordine obbligatorio)

| # | Operazione | Strumento | Cosa produce |
|---|------------|-----------|--------------|
| **A** | **Export** | `db-export-local.sh` | File `.sql` con i **dati** (righe) |
| **B** | **Schema** | Flyway via Java | **Tabelle vuote** su Neon (struttura) |
| **C** | **Import** | `db-import-neon.sh` | Dati dal file `.sql` → dentro le tabelle |

**Perché in questo ordine?**

- Il file `.sql` contiene solo **INSERT** (dati), non `CREATE TABLE`.
- Le tabelle devono esistere **prima** dell’import → le crea **Flyway** (migration Java in `db/migration/`).
- Flyway è la “fonte di verità” dello schema: in prod non creiamo tabelle a mano.

Analogia: Flyway costruisce la casa (stanze vuote), l’import ci mette dentro i mobili (dati).

### Cosa NON facciamo in questa fase

- Non deployiamo ancora su GCP o Vercel
- Non spegniamo il Postgres Docker (resta backup)
- Non migriamo i file CV sul disco (volume Docker separato)

---

## Step 1.1 — Verifica Postgres locale

```bash
docker ps --filter name=interview-db
```

**Cosa fa:** controlla se il container del database locale è acceso.

**Perché:** l’export legge i dati da lì. Se il container è spento, non c’è nulla da copiare.

**Output atteso:** riga con `interview-db` e stato `Up`.

Se manca:

```bash
cd /Users/vincenzo/Desktop/websites/interview
docker compose up -d db
```

---

## Step 1.2 — Export dati dal locale

```bash
cd /Users/vincenzo/Desktop/websites/interview
chmod +x scripts/db-export-local.sh scripts/db-import-neon.sh
./scripts/db-export-local.sh
```

**Cosa fa lo script (in parole semplici):**

1. Entra nel container Postgres locale
2. Esegue `pg_dump --data-only` → estrae **solo le righe**, non la struttura tabelle
3. Salva un file `.sql` in `dumps/interview-data-YYYYMMDD-HHMMSS.sql`
4. Scrive un manifest con i conteggi (es. `users=4`, `applications=190`)

**Perché `--data-only`:** lo schema su Neon lo crea Flyway (step 1.5), così resta allineato al codice Java.

**Se hai già un export recente** (es. `interview-data-20260706-094954.sql`), puoi **saltare** questo step.

Verifica conteggi:

```bash
cat dumps/interview-export-*.manifest.txt
```

Annotati il nome del file `.sql` per lo step 1.6.

---

## Step 1.3 — Crea progetto su Neon

1. Vai su [console.neon.tech](https://console.neon.tech)
2. **New Project**
3. Nome: es. `interview-prod`
4. Regione: **AWS Europe (Frankfurt) eu-central-1**
5. PostgreSQL: **16** (come il Docker locale)

**Cosa ottieni:** un database PostgreSQL vuoto in cloud, raggiungibile via internet con user/password.

Neon crea di default:
- Database: `neondb`
- User: `neondb_owner`
- Branch: `production` (o `main`)

---

## Step 1.4 — Copia la connection string Direct

### Dove cliccare in Neon

1. Apri il progetto → **Connect** / **Connection details**
2. Si apre **Connect to your database**
3. Lascia: Branch `production`, Database `neondb`, Role `neondb_owner`
4. **Connection pooling → OFF** (toggle grigio)

> Neon non ha un menu “Direct / Pooled” separato:  
> **pooling OFF** = Direct · **pooling ON** = Pooled (`-pooler` nel host)

5. Tipo: **Connection string**
6. **Show password** → **Copy snippet**

### Come riconoscere Direct vs Pooled

| Tipo | Host contiene | Quando usarla |
|------|---------------|---------------|
| **Direct** | `ep-xxx.c-4.eu-central-1...` (senza `-pooler`) | **Ora:** import, Flyway, `psql` |
| **Pooled** | `ep-xxx-pooler.c-4...` | **Dopo:** Java/Python sempre accesi (fase 2+) |

**In questa fase ti basta salvare solo la Direct** in `deploy-notes.txt` (file locale, **non committare**):

```
NEON_DIRECT_URL=postgresql://neondb_owner:PASSWORD@ep-xxx.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

La Pooled la copierai quando collegherai l’app in esecuzione (fase 2).

### Test connessione

```bash
export NEON_DATABASE_URL='incolla_qui_la_stringa_direct'

psql "$NEON_DATABASE_URL" -c "SELECT 1;"
```

**Cosa fa:** prova a parlare con Neon dal tuo Mac.

**Atteso:** una riga con `1`.  
**Se `psql` manca:** `brew install libpq` e aggiungi al PATH.

---

## Step 1.5 — Crea lo schema su Neon (Flyway + Java)

**Cosa stiamo facendo:** avviamo Java **una volta** puntato a Neon. All’avvio, Flyway legge i file SQL in `java-backend/src/main/resources/db/migration/` e crea le tabelle vuote (`users`, `applications`, ecc.).

**Perché Java e non a mano:** lo schema in prod deve coincidere con quello che il codice si aspetta. Flyway è integrato in Spring Boot e gira ad ogni deploy futuro.

```bash
cd /Users/vincenzo/Desktop/websites/interview/java-backend

export SPRING_DATASOURCE_URL='jdbc:postgresql://ep-XXX.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export SPRING_DATASOURCE_USERNAME='neondb_owner'
export SPRING_DATASOURCE_PASSWORD='LA_TUA_PASSWORD'

./gradlew bootRun
```

**Nota JDBC vs URL Neon:**

| Tool | Formato connessione |
|------|---------------------|
| `psql`, script import | `postgresql://user:pass@host/neondb?...` |
| Java (Spring) | `jdbc:postgresql://host/neondb?...` + user/password **separati** |

**Cosa aspettarsi nei log:**
- `Flyway ... Successfully applied` oppure `Schema is up to date`
- Poi `Started ...Application`

**Ferma Java:** `Ctrl+C` (ti serve solo Flyway, non tenere il server acceso).

### Verifica: tabelle create

```bash
psql "$NEON_DATABASE_URL" -c "\dt"
```

**Atteso:** lista tabelle (`users`, `applications`, `job_searches`, …).  
**Le tabelle sono vuote** — è normale, i dati arrivano allo step successivo.

---

## Step 1.6 — Import dati su Neon

**Cosa stiamo facendo:** riempiamo le tabelle vuote con le righe esportate dal Mac (step 1.2).

```bash
cd /Users/vincenzo/Desktop/websites/interview

export NEON_DATABASE_URL='postgresql://neondb_owner:PASSWORD@ep-XXX.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'

./scripts/db-import-neon.sh ./dumps/interview-data-YYYYMMDD-HHMMSS.sql
```

Sostituisci `YYYYMMDD-HHMMSS` con il tuo file export.

**Cosa fa lo script:**

1. Chiede conferma (`y`)
2. `TRUNCATE` — svuota le tabelle dati su Neon (schema Flyway resta)
3. Esegue il file `.sql` con `psql` → inserisce tutte le righe
4. Riallinea le sequence (es. prossimo `users.id` corretto)
5. Scrive manifest di verifica in `dumps/neon-import-*.manifest.txt`

**Perché TRUNCATE prima:** se ripeti l’import, evita errori “duplicate key”.

---

## Step 1.7 — Verifica dati su Neon

**Cosa stiamo facendo:** confermiamo che Neon ha gli stessi dati del locale.

```bash
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) AS users FROM users;"
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) AS applications FROM applications;"
psql "$NEON_DATABASE_URL" -c "SELECT email FROM users LIMIT 5;"
```

Confronta i numeri:

```bash
cat dumps/interview-export-*.manifest.txt
cat dumps/neon-import-*.manifest.txt
```

Devono coincidere (es. `users=4`, `applications=190`).

---

## Step 1.8 — Checkpoint

- [ ] Progetto Neon creato
- [ ] Connection string **Direct** salvata (pooling OFF)
- [ ] Flyway eseguito → tabelle presenti
- [ ] Import completato → conteggi uguali al locale
- [ ] Password Neon **resettata** se l’hai condivisa in chat

**Prossimo passo:** [02-neon-locale-test.md](./02-neon-locale-test.md) — avvii Java/Python in locale puntati a Neon e controlli login e candidature nel browser.

---

## Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `psql: command not found` | Client PG assente | `brew install libpq` |
| `relation "users" does not exist` | Flyway non eseguito | Ripeti step 1.5 |
| `duplicate key` | Import parziale | Riesegui import (fa TRUNCATE) |
| `connection timeout` | URL pooled per import | Pooling OFF → Direct |
| Vedo solo URL con `-pooler` | Pooling ON | Spegni toggle Connection pooling |
| Conteggi diversi | Dump vecchio | Rifai export locale |

---

## Glossario rapido

| Termine | Significato |
|---------|-------------|
| **Schema** | Struttura DB: nomi tabelle, colonne, vincoli |
| **Dati** | Righe dentro le tabelle (utenti, candidature, …) |
| **Flyway** | Tool che applica migration SQL all’avvio Java |
| **Direct** | Connessione diretta a Postgres (migrazioni) |
| **Pooled** | Connessione via pooler (app in esecuzione continua) |
| **pg_dump** | Comando PostgreSQL per esportare |
| **psql** | Client PostgreSQL a riga di comando |
