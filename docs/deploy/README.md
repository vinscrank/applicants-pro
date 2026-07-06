# Deploy in produzione — indice

**Documento principale (riproducibile):** **[GUIDA-COMPLETA.md](./GUIDA-COMPLETA.md)**

Contiene tutti gli step con badge **OBBLIGATORIO** / **OPZIONALE** / **SE SERVE**, inclusi fix incontrati in deploy reale (psql PATH, python venv, porta 8081, `.env.local`, Neon pooling toggle).

---

## Ordine delle fasi

| Fase | File dettaglio | Obiettivo |
|------|----------------|-----------|
| 1 | [01-neon-migrate.md](./01-neon-migrate.md) | DB Docker → Neon |
| 2 | [02-neon-locale-test.md](./02-neon-locale-test.md) | Test locale con Neon |
| 3 | [03-gcp-cloud-run-java.md](./03-gcp-cloud-run-java.md) | Deploy Java GCP |
| 4 | [04-gcp-cloud-run-python.md](./04-gcp-cloud-run-python.md) | Deploy Python GCP |
| 5 | [05-vercel-frontend.md](./05-vercel-frontend.md) | Deploy Vercel |
| 6 | [06-post-deploy-checklist.md](./06-post-deploy-checklist.md) | Checklist finale |

---

## Architettura target

```
Vercel (Next.js) → Cloud Run Java → Neon
                        ↓
                  Cloud Run Python → Neon
```

---

## Prerequisiti

- Docker, `psql` (`brew install libpq`), `gcloud`
- Account Neon, GCP (billing), Vercel
- File locale `deploy-notes.txt` (password, URL — **non committare**)

---

## Stato tipico dopo Fase 1–2 (esempio reale)

| Item | Valore esempio |
|------|----------------|
| GCP project | `interview-pro-vincenzo` |
| GCP region | `europe-west1` |
| Neon users | 4 |
| Neon applications | 190 |
| Java locale | `:8081` + Neon pooled |
| Python locale | `:8001` + Neon pooled |
| Frontend locale | `.env.local` → `:8081` |
| GEMINI_API_KEY | root `.env` |

Prossimo: **Fase 3** in [GUIDA-COMPLETA.md](./GUIDA-COMPLETA.md#fase-3--deploy-java-su-gcp-cloud-run).
