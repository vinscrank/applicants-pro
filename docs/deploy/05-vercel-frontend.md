# Fase 5 — Deploy frontend su Vercel

**Obiettivo:** pubblicare Next.js su Vercel collegato al backend Java su Cloud Run.

**Tempo stimato:** 20–30 minuti.

**Prerequisiti:** Fase 3 e 4 ok, `JAVA_CLOUD_RUN_URL` funzionante.

---

## Step 5.1 — Modifica CORS in Java (obbligatorio)

Oggi Java accetta richieste browser **solo da localhost** (`CorsConfig.java`).

Prima del deploy Vercel devi aggiungere il dominio Vercel. Apri:

`java-backend/src/main/java/com/interview/config/CorsConfig.java`

Nella lista `setAllowedOriginPatterns`, aggiungi i pattern del tuo dominio:

```java
config.setAllowedOriginPatterns(List.of(
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.vercel.app",
    "https://tuodominio.com"
));
```

**Cosa fa CORS:** il browser blocca richieste da `vercel.app` verso `run.app` se Java non autorizza l’origine.

Dopo la modifica: **rebuild e redeploy Java** (fase 3, step 3.10).

---

## Step 5.2 — Collega repo a Vercel

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Importa il repository GitHub `applicants-pro` (o il tuo fork)
3. **Root Directory:** imposta `frontend` (monorepo — Vercel deve buildare solo Next.js)
4. Framework Preset: **Next.js** (auto-detect)

Non cliccare Deploy ancora — configura env prima.

---

## Step 5.3 — Variabili d’ambiente su Vercel

In **Settings → Environment Variables** del progetto Vercel:

| Nome | Valore | Ambiente |
|------|--------|----------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://interview-java-xxxxx-ew.a.run.app` | Production, Preview |
| `NEXT_PUBLIC_GRAPHQL_URL` | `https://interview-java-xxxxx-ew.a.run.app/graphql` | Production, Preview |

**Cosa fa `NEXT_PUBLIC_*`:**
- Prefisso `NEXT_PUBLIC_` = esposto al browser (vedi `frontend/src/lib/env.ts`)
- Il frontend chiama Java su quella URL per API REST e GraphQL

**Non serve** esporre Python al frontend — passa sempre da Java.

Opzionali:

| Nome | Valore |
|------|--------|
| `NEXT_PUBLIC_USE_JAVA_SEARCH` | `true` (default) |
| `NEXT_PUBLIC_EXTENSION_ID` | ID extension Chrome se la usi |

---

## Step 5.4 — Aggiorna Java con URL Vercel reale

Dopo il primo deploy Vercel avrai un URL tipo `https://interview-xxx.vercel.app`.

Aggiorna Java per redirect Stripe e link email:

```bash
export VERCEL_URL='https://interview-xxx.vercel.app'

gcloud run services update interview-java \
  --region="$GCP_REGION" \
  --set-env-vars="APP_PUBLIC_URL=${VERCEL_URL}"
```

Se usi Stripe, aggiorna anche in GCP (o Secret Manager):
- `APP_STRIPE_SUCCESS_URL`
- `APP_STRIPE_CANCEL_URL`
- webhook endpoint → `https://interview-java-xxxxx.run.app/api/stripe/webhook` (path esatto da verificare nel codice)

---

## Step 5.5 — Deploy

Clicca **Deploy** su Vercel (o push su branch `main` se auto-deploy attivo).

**Cosa fa Vercel:**
1. `npm install` in `frontend/`
2. `npm run build` (Next.js production build)
3. Deploy su CDN globale

**Build locale di prova** (opzionale, sul tuo Mac):

```bash
cd frontend
export NEXT_PUBLIC_BACKEND_URL='https://interview-java-xxxxx.run.app'
npm run build
```

Se build locale ok, Vercel dovrebbe andare liscio.

---

## Step 5.6 — Verifica in produzione

Apri l’URL Vercel e controlla:

| Test | Esito atteso |
|------|--------------|
| Pagina login carica | ok |
| Login utente migrato | ok |
| Applications list | dati da Neon |
| Discover | Java → Python ok |
| Console browser (F12) | nessun errore CORS |

**Errore CORS tipico:**

```
Access to fetch at 'https://interview-java...run.app/...' from origin 'https://xxx.vercel.app' has been blocked by CORS
```

→ Ripeti step 5.1 e redeploy Java.

**Errore 401/403:** normale su endpoint protetti senza login.

---

## Step 5.7 — Dominio custom (opzionale)

1. Vercel → Project → Settings → Domains
2. Aggiungi `app.tuodominio.com`
3. Configura DNS (CNAME verso Vercel)
4. Aggiungi `https://app.tuodominio.com` in `CorsConfig.java`
5. Redeploy Java
6. Aggiorna `APP_PUBLIC_URL` su Cloud Run

---

## Step 5.8 — Checkpoint ✅

- [ ] Vercel deploy verde
- [ ] `NEXT_PUBLIC_BACKEND_URL` punta a Java Cloud Run
- [ ] CORS aggiornato e Java redeployato
- [ ] Login e navigazione ok in produzione
- [ ] `VERCEL_URL` salvata in `deploy-notes.txt`

**Prossimo passo:** [06-post-deploy-checklist.md](./06-post-deploy-checklist.md)

---

## Preview deployments

Ogni PR su Vercel genera un URL preview (`xxx-git-branch.vercel.app`).

Aggiungi in CORS:

```java
"https://*.vercel.app"
```

Così funzionano anche le preview senza redeploy per ogni branch.
