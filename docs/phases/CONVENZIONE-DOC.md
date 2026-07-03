# Convenzione documentazione fasi — da memorizzare

Ogni file `phase-NN-*.md` deve essere scritto per chi **non conosce Java** e conosce già **PHP + Laravel** (e un po' di Python/FastAPI del progetto Candidature).

## Regole obbligatorie

1. **Spiegare ogni termine nuovo** alla prima occorrenza (Flyway, JPA, Entity, Bean, …).
2. **Confronto Laravel/PHP** per ogni concetto importante (tabella sotto).
3. **Esempi concreti** presi da questo progetto (`users`, `applications`, Candidature).
4. **Snippet di codice** reali dal repo con spiegazione riga per riga.
5. Sezione **«Cosa ricordare»** breve alla fine.
6. Sezione **«Come testare»** con comandi e output atteso.
7. Nessun assunto implicito tipo «ovviamente sai cos'è un ORM».

## Tabella riferimento Laravel → Java (Spring)

| Laravel / PHP | Java / Spring | Note |
|---------------|---------------|------|
| `composer.json` | `build.gradle.kts` | Dipendenze e build |
| `artisan` | `./gradlew` | CLI del progetto |
| `php artisan serve` | `./gradlew bootRun` | Avvia server dev |
| `php artisan migrate` | Flyway (automatico all'avvio) | Migration DB |
| `database/migrations/*.php` | `db/migration/V1__*.sql` | File migration |
| `.env` | `application.yml` + profili | Configurazione |
| `config/database.php` | `spring.datasource` in YAML | Connessione PostgreSQL |
| Model Eloquent `User` | `@Entity class User` | Classe ↔ tabella |
| `$fillable`, `$casts` | `@Column`, tipi Java | Mapping colonne |
| `User::find(1)` | `userRepository.findById(1)` | Lettura DB |
| `User::create([...])` | `userRepository.save(user)` | Scrittura DB |
| Controller | `@RestController` / GraphQL Resolver | HTTP (fasi future) |
| Service class | `@Service` | Logica business (fasi future) |
| Route `routes/api.php` | Router Spring / GraphQL schema | Endpoint |
| Middleware | `SecurityFilterChain` | Filtri HTTP |
| `phpunit` / Pest | JUnit 5 | Test unit/integration |
| Docker Sail | Docker Compose + Testcontainers | Ambiente dev/test |
| `Schema::create()` in migration | SQL in file Flyway | Crea tabelle |
| Laravel Sanctum / Passport JWT | Spring Security + JWT (fase 4) | Auth |

## Tabella riferimento Python (Candidature) → Java

| Python FastAPI | Java Spring | File attuale |
|----------------|-------------|--------------|
| `backend/main.py` | `CandidatureApplication.java` | Entry point |
| `models.py` + SQLAlchemy | `domain/*.java` + JPA | Entity |
| `crud.py` | `repository/*` + `service/*` | Accesso dati |
| `requirements.txt` | `build.gradle.kts` | Dipendenze |
| `create_all()` | Flyway migrations | Schema DB |
| `uvicorn :8000` | `bootRun :8081` | Server dev |

## Struttura minima di ogni guida fase

1. Metadati (branch, stato, prerequisiti)
2. Obiettivo in una frase
3. **Prima di iniziare: glossario** (se ci sono termini nuovi)
4. Cosa è stato fatto (file per file)
5. Codice + spiegazione + confronto Laravel
6. Architettura (diagramma ASCII)
7. Come testare
8. Errori comuni
9. Definition of Done
10. Prossima fase
