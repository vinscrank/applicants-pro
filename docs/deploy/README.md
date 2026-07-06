# Deploy in produzione — indice

**Documento principale (setup iniziale):** **[GUIDA-COMPLETA.md](./GUIDA-COMPLETA.md)**

**Uso quotidiano (locale + cosa deployare):** **[README.md](../../README.md)** — sezione *Sviluppo locale* e *Produzione — cosa lanciare*

**Errori visti nel primo deploy:** **[ERRORI-DEPLOY-REALI.md](./ERRORI-DEPLOY-REALI.md)**

---

## Cheat sheet — cosa lanciare

| Modifica | Comando |
|----------|---------|
| Frontend | `git push origin main` → Vercel automatico |
| Java | `./scripts/deploy-java-prod.sh` |
| Python | `./scripts/deploy-python-prod.sh` |
| Java + Python | `./scripts/deploy-backend-prod.sh` |
| Env `NEXT_PUBLIC_*` su Vercel | Dashboard → Redeploy manuale |

Locale: `docker compose up -d` + `cd frontend && npm run dev` (`.env.local` → `:8080`)

---

## Ordine delle fasi

| Fase | File | Obiettivo |
|------|------|-----------|
| 1 | [01-neon-migrate.md](./01-neon-migrate.md) | DB Docker → Neon |
| 2 | [02-neon-locale-test.md](./02-neon-locale-test.md) | Test locale con Neon |
| 3 | [03-gcp-cloud-run-java.md](./03-gcp-cloud-run-java.md) | Deploy Java GCP |
| 4 | [04-gcp-cloud-run-python.md](./04-gcp-cloud-run-python.md) | Deploy Python GCP |
| 5 | [05-vercel-frontend.md](./05-vercel-frontend.md) | Deploy Vercel |
| 6 | [06-post-deploy-checklist.md](./06-post-deploy-checklist.md) | Checklist finale |

---

## Architettura produzione

```
Browser → Vercel (Next.js)
            → Cloud Run Java → Neon
                  → Cloud Run Python → Neon
```

---

## URL produzione (esempio deploy reale)

| Servizio | URL |
|----------|-----|
| Java | `https://interview-java-932950348509.europe-west1.run.app` |
| Python | `https://interview-python-932950348509.europe-west1.run.app` |
| Vercel | `https://tuo-progetto.vercel.app` (dopo deploy Ready) |

---

## Sviluppo locale (dopo deploy prod)

```bash
docker compose up -d          # Java :8080, Python :8001, Postgres :5435
cd frontend && npm run dev    # .env.local → localhost:8080
```

**DB locale = Docker.** **DB prod = Neon.** Sono separati.

---

## Script utili

| Script | Uso |
|--------|-----|
| `scripts/deploy-java-prod.sh` | Redeploy Java (1 comando) |
| `scripts/deploy-python-prod.sh` | Redeploy Python |
| `scripts/deploy-backend-prod.sh` | Entrambi |
| `scripts/db-export-local.sh` | Export DB locale |
| `scripts/db-import-neon.sh` | Import su Neon |

---

## Fix critici da ricordare

1. **Mac ARM:** `docker build --platform linux/amd64` + push + verifica pull
2. **GCP env:** `--update-env-vars` per una chiave, `--set-env-vars` solo con tutte le env
3. **Vercel:** Root Directory = `frontend`, dipendenza `rxjs`, deploy **Ready**
4. **404 Vercel** (`dub1::...`): non è la tua app — build fallita o config sbagliata
5. **CORS:** `https://*.vercel.app` in Java + redeploy

---

## File config

| File | Ambiente |
|------|----------|
| `frontend/.env.local` | Dev locale (`localhost:8080`) |
| `frontend/.env` | Riferimento prod (copia su Vercel dashboard) |
| Vercel dashboard env | Produzione runtime |
| `deploy-notes.txt` | Appunti locali (non git) |
| `.env` (root) | `GEMINI_API_KEY` locale + deploy Python |
| `frontend/vercel.json` | Config framework Vercel |
