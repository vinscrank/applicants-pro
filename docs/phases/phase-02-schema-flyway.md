# Fase 2 — Flyway + schema DB + entity JPA

**Branch:** `refactor/phase-02-schema-flyway`  
**Prerequisito:** [Fase 1](phase-01-java-scaffold.md)  
**Stato:** completata  
**Python / frontend modificati:** no

> Stile guide: spiegazioni per chi viene da **PHP/Laravel**. Vedi [CONVENZIONE-DOC.md](CONVENZIONE-DOC.md) (valida per **tutte** le fasi).

---

## Obiettivo in una frase

Scrivere le **migration del database** in file SQL versionati (Flyway) e creare le **classi Java** che rappresentano le tabelle `users`, `user_profiles` e `applications` — la stessa cosa che in Laravel faresti con `php artisan make:migration` + Model Eloquent, ma in Java.

**Ancora nessuna API:** niente login, niente lista candidature via Java. Solo database + classi.

---

## Glossario — cosa significano Flyway e JPA

### Flyway

**Cos'è:** un tool che esegue file SQL in ordine numerato per creare/aggiornare il database.

**In Laravel fai così:**

```bash
php artisan make:migration create_users_table
php artisan migrate
```

Laravel crea `database/migrations/2024_01_01_000000_create_users_table.php` e lo esegue una volta.

**In Java (Spring + Flyway) fai così:**

```
java-backend/src/main/resources/db/migration/
├── V1__extensions.sql
├── V2__users_profiles.sql
└── V3__applications.sql
```

All'avvio dell'app (`bootRun`), Flyway:

1. Controlla la tabella `flyway_schema_history` nel PostgreSQL
2. Esegue solo i file **non ancora applicati**
3. Non riesegue mai lo stesso file (come Laravel `migrations` table)

| Laravel | Flyway (Java) |
|---------|---------------|
| `database/migrations/*.php` | `db/migration/V1__*.sql` |
| `php artisan migrate` | Automatico all'avvio Spring Boot |
| tabella `migrations` | tabella `flyway_schema_history` |
| `Schema::create('users', ...)` | `CREATE TABLE users (...)` in SQL puro |

**Perché SQL puro e non PHP/Java nella migration?** In enterprise Java lo schema è spesso SQL esplicito, reviewabile in PR, identico in dev/CI/prod.

---

### JPA

**Cos'è:** **J**ava **P**ersistence **A**PI — lo standard Java per dire «questa classe Java corrisponde a quella tabella PostgreSQL».

**Laravel equivalente:** **Eloquent Model**.

| Laravel Eloquent | JPA (Java) |
|------------------|------------|
| `class User extends Model` | `@Entity class User` |
| `protected $table = 'users';` | `@Table(name = "users")` |
| `protected $fillable = ['email', ...]` | campi con `@Column` |
| `$user->email` | `user.getEmail()` |
| `User::where('email', $e)->first()` | `userRepository.find...()` (fase successiva) |

**Hibernate** è la libreria concreta che implementa JPA (Spring Boot la usa sotto il cofano). Come Eloquent è l'ORM di Laravel.

---

### Repository

**Cos'è:** interfaccia che espone metodi per leggere/scrivere nel DB senza scrivere SQL a mano.

**Laravel equivalente:**

```php
User::find(1);
User::all();
User::create(['email' => 'a@b.com', ...]);
```

**Java equivalente:**

```java
userRepository.findById(1);
userRepository.findAll();
userRepository.save(user);
```

Spring **genera l'implementazione** automaticamente se estendi `JpaRepository<User, Integer>`.

---

## Situazione prima vs dopo Fase 2

### Prima (solo Python + Fase 1)

```
Python main.py → create_all() → crea tabelle al volo (non versionato)
Java → si connette al DB ma senza entity, Flyway spento
```

### Dopo (Fase 2)

```
Flyway Java → file V1, V2, V3 (schema versionato)
Entity Java User, Application → Hibernate valida che combacino col DB
Python → continua a funzionare come prima
```

| | Laravel che partirebbe da zero | Candidature oggi |
|---|-------------------------------|------------------|
| Schema | `artisan migrate` | Python `create_all` + **ora anche** Flyway Java |
| Model | `app/Models/User.php` | `domain/User.java` |

---

## File creati — cosa fa ognuno

```
db/migration/V1__extensions.sql     → CREATE EXTENSION vector, pgcrypto
db/migration/V2__users_profiles.sql → tabelle users, user_profiles
db/migration/V3__applications.sql   → tabella applications

domain/User.java                    → Model Eloquent di users
domain/UserProfile.java             → Model di user_profiles
domain/Application.java             → Model di applications

repository/UserRepository.java      → User::query() generico
repository/UserProfileRepository.java
repository/ApplicationRepository.java
```

---

## 1. Migration Flyway — esempio concreto `users`

**File:** `V2__users_profiles.sql`

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    plan_tier VARCHAR(32) NOT NULL DEFAULT 'free'
);
```

**Stesso concetto in Laravel:**

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('email')->unique();
    $table->string('password_hash');
    $table->boolean('is_active')->default(true);
    $table->timestamp('created_at')->useCurrent();
    $table->string('plan_tier', 32)->default('free');
});
```

**Perché `V2__` e il doppio underscore?** Convenzione Flyway: `V` + numero versione + `__` + descrizione. Ordine: V1, poi V2, poi V3.

**Perché allineato a Python?** Il file `backend/models.py` aveva già quelle colonne. Java non inventa un DB diverso: **stesso PostgreSQL**, stesse tabelle.

---

## 2. Entity JPA — `User.java` spiegata riga per riga

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
}
```

| Riga Java | Significato | Laravel |
|-----------|-------------|---------|
| `@Entity` | Questa classe = una tabella | `class User extends Model` |
| `@Table(name = "users")` | Nome tabella | `protected $table = 'users'` |
| `@Id` | Primary key | `$primaryKey = 'id'` |
| `@GeneratedValue(IDENTITY)` | Auto-increment DB | `$incrementing = true` |
| `private String email` | Colonna email | `$fillable` / attributo |
| `@Column(name = "password_hash")` | Colonna DB snake_case | colonna `password_hash` |
| `passwordHash` in Java | camelCase nel codice | `$user->password_hash` in PHP |
| getter/setter `getEmail()` | Accesso al campo | `$user->email` magic property |

**Nota Java vs PHP:** in Java i campi sono spesso `private` e ci accedi con `getEmail()` / `setEmail()`. Laravel Eloquent usa proprietà magiche; concetto uguale, sintassi diversa.

**Confronto con Python (Candidature attuale):**

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
```

Stessa idea: **classe = tabella**, **attributo = colonna**.

---

## 3. Entity `Application` — candidatura nel tracker

In Laravel avresti:

```php
// app/Models/Application.php
class Application extends Model {
    protected $fillable = ['company_name', 'job_title', 'status', ...];
}
```

In Java:

```java
@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "job_title", nullable = false)
    private String jobTitle;

    @Column(nullable = false, length = 50)
    private String status = "applied";
}
```

| Campo Java | Colonna DB | Cosa vedi nell'app |
|------------|------------|-------------------|
| `companyName` | `company_name` | Nome azienda in kanban |
| `jobTitle` | `job_title` | Titolo offerta |
| `status` | `status` | `applied`, `interview`, ecc. |
| `userId` | `user_id` | FK verso `users` (come `$application->user_id`) |

**Date in Java:** colonne `DATE` → `LocalDate`; colonne `TIMESTAMP` → `LocalDateTime`. In Laravel spesso `Carbon`; concetto identico.

---

## 4. Repository — zero SQL scritto a mano

```java
public interface UserRepository extends JpaRepository<User, Integer> {
}
```

Sembra «vuoto», ma Spring a runtime crea un'implementazione con:

| Metodo generato | Laravel equivalente |
|-----------------|----------------------|
| `findById(1)` | `User::find(1)` |
| `findAll()` | `User::all()` |
| `save(user)` | `$user->save()` o `User::create(...)` |
| `deleteById(1)` | `User::destroy(1)` |
| `count()` | `User::count()` |

`JpaRepository<User, Integer>` = Model `User`, primary key tipo `Integer`.

**Non usiamo ancora questi metodi da API HTTP** — li useremo in Fase 5 (GraphQL lettura candidature).

---

## 5. Configurazione — `.env` vs YAML

### Laravel `.env`

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5434
DB_DATABASE=candidature
DB_USERNAME=candidature
DB_PASSWORD=candidature
```

### Java `application-local.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5434/candidature
    username: candidature
    password: candidature
  flyway:
    baseline-on-migrate: true
    baseline-version: 3
```

| Laravel | Java |
|---------|------|
| `.env` | `application-local.yml` (profilo `local`) |
| `config/database.php` legge `.env` | Spring legge YAML |

### `ddl-auto: validate` — cosa significa

In `application.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
```

| Valore | Comportamento | Laravel analogia |
|--------|---------------|------------------|
| `validate` | Hibernate **controlla** che Entity = tabelle, **non modifica** nulla | Non esiste uguale; simile a «solo Model, migrate fa lo schema» |
| `update` (NON usato) | Hibernate modifica tabelle da solo | **Anti-pattern** — come cambiare DB senza migration |
| Flyway `enabled: true` | SQL in `V1__`, `V2__` crea lo schema | `php artisan migrate` |

**Regola enterprise:** Flyway crea lo schema, Hibernate solo valida. Come in Laravel: **solo migration**, non `Schema` a runtime.

---

## 6. Baseline — DB che esiste già (importante)

Il tuo PostgreSQL Docker **ha già dati** creati da Python (`create_all`).

Se Flyway lanciasse `CREATE TABLE users` su un DB che ha già `users` → **errore**.

Soluzione in `application-local.yml`:

```yaml
spring:
  flyway:
    baseline-on-migrate: true
    baseline-version: 3
```

**In parole semplici:**

- Flyway dice: «questo DB è già alla versione 3, non rieseguire V1–V3»
- I **test** usano DB Docker **vuoto** → Flyway esegue V1, V2, V3 normalmente

| Scenario | Cosa fa Flyway |
|----------|----------------|
| DB vuoto (test CI) | Esegue V1 → V2 → V3 |
| DB dev con tabelle Python | Baseline V3, salta CREATE TABLE |

Analogia Laravel: è come marcare manualmente le migration come «già eseguite» su un DB legacy (`migrate --pretend` / insert in `migrations`).

---

## 7. Test automatici

```java
@Test
void flywayCreatesCoreTables() {
    assertThat(tableExists("users")).isTrue();
    assertThat(tableExists("applications")).isTrue();
}
```

| Java test | Laravel equivalente |
|-----------|----------------------|
| `@SpringBootTest` | `$this->artisan('migrate')` + feature test |
| Testcontainers PostgreSQL | `RefreshDatabase` con DB reale Docker |
| `assert tableExists` | `$this->assertDatabaseHas(...)` o Schema::hasTable |

Immagine Docker: `pgvector/pgvector:pg16` perché V1 fa `CREATE EXTENSION vector`.

---

## Flusso completo all'avvio (Fase 2)

```
./gradlew bootRun --spring.profiles.active=local
        │
        ▼
Spring legge application.yml + application-local.yml
        │
        ▼
Flyway: baseline o esegue migration
        │
        ▼
Hibernate: validate (Entity ↔ tabelle)
        │
        ▼
Tomcat parte su :8081
        │
        ▼
/actuator/health → db: UP
```

Come Laravel:

```
php artisan serve
  → migrate (se pending)
  → app pronta
```

---

## Come testare tu

```bash
cd java-backend
./gradlew test
```

Atteso: `BUILD SUCCESSFUL`

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

Altro terminale:

```bash
curl http://localhost:8081/actuator/health
```

Atteso: `"status":"UP"` e `"db":{"status":"UP"}`.

**App Candidature (Python):** http://localhost:3000 — deve funzionare uguale a prima.

---

## Errori comuni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `relation "users" already exists` | Flyway senza baseline su DB esistente | Profilo `local` con `baseline-version: 3` |
| `Schema-validation: missing table` | Entity Java non coincide con DB | Allinea SQL migration e `@Entity` |
| Test fallisce su `vector` extension | Immagine Postgres senza pgvector | Testcontainers usa `pgvector/pgvector:pg16` |
| `bootRun` exit 143 | Hai premuto Ctrl+C | Normale se prima vedi `Started CandidatureApplication` |

---

## Cosa ricordare (Fase 2)

1. **Flyway** = `artisan migrate` in SQL puro, file versionati `V1__`, `V2__`, …
2. **JPA Entity** = Model Eloquent (`User`, `Application`)
3. **Repository** = query Eloquent generate (`find`, `save`, …)
4. **Flyway crea**, **Hibernate valida** — non il contrario
5. **Baseline** = DB Python già popolato, Flyway non ricrea tabelle
6. **Nessuna API nuova** — solo fondamenta DB lato Java

---

## Definition of Done

- [x] V1–V3 migration allineate a `backend/models.py`
- [x] Entity + Repository per users, profiles, applications
- [x] `./gradlew test` verde
- [x] Health UP con profilo `local`
- [x] Python/FE invariati

---

## Prossima fase

→ [Fase 3 — Java in Docker](phase-03-health-parallel.md): aggiungere `java-backend` al `docker-compose.yml` (come un secondo servizio accanto a Python).
