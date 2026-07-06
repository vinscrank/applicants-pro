# Fase 5 — Deploy frontend su Vercel

**Obiettivo:** pubblicare Next.js su Vercel collegato al backend Java su Cloud Run.

**Prerequisiti:** Fase 3 e 4 ok. Java e Python rispondono UP su Cloud Run.

**URL produzione esempio (deploy reale):**

| Servizio | URL |
|----------|-----|
| Java | `https://interview-java-932950348509.europe-west1.run.app` |
| Python | `https://interview-python-932950348509.europe-west1.run.app` |

---

## Step 5.1 — CORS Java — **OBBLIGATORIO**

File: `java-backend/src/main/java/com/interview/config/CorsConfig.java`

Deve includere:

```java
config.setAllowedOriginPatterns(List.of(
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.vercel.app"));
```

**Perché:** il browser su `*.vercel.app` chiama Java su `*.run.app` — senza CORS vedi errori in F12.

**Redeploy Java dopo modifica CORS:**

```bash
./scripts/deploy-java-prod.sh
```

---

## Step 5.2 — Progetto Vercel — **OBBLIGATORIO**

1. [vercel.com/new](https://vercel.com/new) → import repo GitHub
2. **Root Directory:** `frontend` — **OBBLIGATORIO**

Il repo è un monorepo: `package.json` sta solo in `frontend/`, non nella root.

| Root Directory | Risultato |
|----------------|-----------|
| `frontend` | Corretto |
| vuota / root repo | Build fallisce o **404 NOT_FOUND** in browser |

3. Framework: **Next.js** (auto-detect)
4. File `frontend/vercel.json` presente nel repo (framework nextjs)

---

## Step 5.3 — Env variables Vercel — **OBBLIGATORIO**

**Settings → Environment Variables** (Production + Preview):

| Nome | Valore |
|------|--------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://interview-java-932950348509.europe-west1.run.app` |
| `NEXT_PUBLIC_JAVA_API_URL` | stesso URL Java |
| `NEXT_PUBLIC_GRAPHQL_URL` | `https://interview-java-932950348509.europe-west1.run.app/graphql` |

**Non** committare queste URL in `.env.local` — `.env.local` resta per dev (`localhost:8080`).

---

## Step 5.4 — Dipendenza `rxjs` — **OBBLIGATORIO**

**Errore build Vercel visto in deploy reale:**

```
Module not found: Can't resolve 'rxjs'
> import { map, shareReplay } from "rxjs";
    ./node_modules/@apollo/client/...
```

**Causa:** Apollo Client 4 richiede `rxjs` come peer dependency. In locale può funzionare per caso; su Vercel il build fallisce.

**Fix:** in `frontend/package.json` deve esserci:

```json
"rxjs": "^7.8.2"
```

Verifica locale:

```bash
cd frontend && npm run build
```

Poi commit + push → Vercel rebuild.

---

## Step 5.5 — Deploy — **OBBLIGATORIO**

Push su `main` (se auto-deploy) o **Deploy** da dashboard.

**Build locale di prova prima del push:**

```bash
cd frontend
export NEXT_PUBLIC_BACKEND_URL='https://interview-java-932950348509.europe-west1.run.app'
npm run build
```

---

## Step 5.6 — Errore 404 Vercel — **SE SERVE**

**Sintomo in browser (schermata bianca Vercel):**

```
404: NOT_FOUND
Code: NOT_FOUND
ID: dub1::44kj6-1783335241981-ae188b1c24e0
```

**Cosa significa:** pagina di **Vercel**, non della tua app. Nessun deploy valido su quell’URL.

| Causa | Fix |
|-------|-----|
| Build fallita (es. `rxjs`) | Fix build → push → attendi deploy **Ready** |
| Root Directory non è `frontend` | Settings → General → Root Directory = `frontend` |
| URL vecchio / preview fallita | Usa URL del deploy **Ready** (verde) |
| Env mancanti | Step 5.3 |

**Checklist:**

1. Vercel → **Deployments** → ultimo = **Ready** (verde)?
2. Root Directory = `frontend`?
3. Apri URL produzione del deploy Ready, es. `https://tuo-progetto.vercel.app`
4. Prova `/login` — deve mostrare la pagina login, non 404 Vercel

---

## Step 5.7 — Aggiorna Java con URL Vercel — **OBBLIGATORIO**

Dopo deploy Vercel avrai es. `https://interview-xxx.vercel.app`.

**Usa `--update-env-vars`, NON `--set-env-vars`:**

```bash
gcloud run services update interview-java \
  --region=europe-west1 \
  --update-env-vars="APP_PUBLIC_URL=https://tuo-progetto.vercel.app"
```

---

## Step 5.8 — Verifica produzione — **OBBLIGATORIO**

| Test | Atteso |
|------|--------|
| `/` o `/login` | Pagina app, non 404 Vercel |
| Login utente Neon | ok |
| Candidature | dati da Neon |
| F12 Console | nessun errore CORS |

**Errore CORS:**

```
blocked by CORS policy ... vercel.app ... run.app
```

→ Redeploy Java con CORS `https://*.vercel.app` (step 5.1).

---

## Step 5.9 — Checkpoint

- [ ] Build Vercel **Ready**
- [ ] `rxjs` in package.json
- [ ] Root Directory = `frontend`
- [ ] Env `NEXT_PUBLIC_*` su Vercel
- [ ] Java redeployato con CORS
- [ ] `APP_PUBLIC_URL` aggiornato con `--update-env-vars`
- [ ] Login ok in produzione

**Prossimo:** [06-post-deploy-checklist.md](./06-post-deploy-checklist.md)

---

## Sviluppo locale dopo deploy prod

Prod e locale sono **separati**:

| | Locale dev | Produzione |
|--|------------|------------|
| Frontend | `npm run dev` + `.env.local` → `:8080` | Vercel |
| Java/Python | `docker compose up -d` | Cloud Run |
| DB | Postgres Docker `:5435` | Neon |

Riavvio stack locale:

```bash
docker compose up -d
```

`.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_JAVA_API_URL=http://localhost:8080
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql
```
