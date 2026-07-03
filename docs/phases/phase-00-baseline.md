# Fase 0 — Baseline (inventario e punto di partenza)

**Branch:** `refactor/phase-00-baseline`  
**Commit:** `c536a7e` (merged in `main`)  
**Codice Java scritto:** nessuno  
**L'app continua a funzionare come prima:** sì, al 100%

---

## Obiettivo

Fare una **foto** del progetto prima del refactor: API, tabelle DB, flussi utente. Zero codice nuovo.

Le fasi successive (da 1 in poi) hanno guide con **snippet di codice** e spiegazione Java nel file `phase-NN-*.md`.

---

## Cosa è stato fatto

### 1. Piano refactor (16 fasi)

**File:** [docs/refactor-java-portfolio.md](../refactor-java-portfolio.md)

### 2. Inventario API REST

**File:** [docs/phase-00-api-inventory.md](../phase-00-api-inventory.md)

Esempio di riga tipica:

| Metodo | Path | Owner futuro |
|--------|------|--------------|
| `GET` | `/api/applications` | Java |
| `POST` | `/api/offerte/search` | Java→Python |
| `POST` | `/api/apply/page-fit` | Java→Python |

**Owner futuro** = chi gestirà quell'endpoint dopo la migrazione.

### 3. Stack baseline (nessun Java)

Backend attuale — entry point Python:

```python
# backend/main.py (semplificato)
app = FastAPI()
app.include_router(auth_router)      # /api/auth
app.include_router(offerte_router)   # /api/offerte
app.include_router(apply_router)   # /api/apply
app.include_router(vector_router)  # /api/vector
```

Modelli core — SQLAlchemy:

```python
# backend/models.py (estratti)
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)

class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    company_name: Mapped[str] = mapped_column(String(255))
    job_title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="applied")
```

In **fase 2** le stesse tabelle avranno classi Java `@Entity` equivalenti e migration Flyway.

### 4. Schema DB — tabelle principali

| Tabella | Uso | Owner futuro |
|---------|-----|--------------|
| `users` | Login | Java |
| `user_profiles` | Profilo + CV | Java |
| `applications` | Tracker candidature | Java |
| `offerte_searches` / `offerte_offers` | Ricerca offerte | Java + Python |
| `vector_documents` | Embedding AI | Python |
| `monitored_companies` | Aziende careers | Java + Python |

---

## Architettura Fase 0

```
Next.js (:3000) → FastAPI (:8000) → PostgreSQL (:5434)
                      │
                 scraper / Gemini / pgvector
```

---

## Checklist verifica

- [ ] `docker compose up -d --build`
- [ ] Login, kanban, search offerte, extension smoke
- [ ] `curl http://localhost:8000/api/health`

---

## Glossario

| Termine | Significato |
|---------|-------------|
| Baseline | Stato di riferimento pre-refactor |
| Owner futuro | Modulo che gestirà quella parte (Java / Python) |
| Branch per fase | `refactor/phase-NN-nome` — lavoro isolato |

---

## Prossima fase

→ [Fase 1 — Scaffold Java](phase-01-java-scaffold.md) (con codice e spiegazioni Spring Boot)
