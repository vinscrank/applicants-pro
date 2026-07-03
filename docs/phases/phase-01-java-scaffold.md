# Fase 1 — Scaffold Java (primo backend Spring Boot)

**Branch:** `refactor/phase-01-java-scaffold`  
**Commit:** `915d56c` (merged in `main`)  
**Python / frontend modificati:** no  
**Stato:** completata

> Guide scritte per chi viene da **PHP/Laravel**. Ogni fase segue [CONVENZIONE-DOC.md](CONVENZIONE-DOC.md).

---

## Se vieni da Laravel — mappa mentale

Prima di leggere il codice Java, tieni a mente questa tabella. La useremo in **tutte** le fasi.

| Cosa fai in Laravel | Equivalente in questa fase (Java) |
|---------------------|-----------------------------------|
| `laravel new progetto` | Cartella `java-backend/` + Spring Boot |
| `composer.json` | `build.gradle.kts` |
| `composer install` | `./gradlew build` (scarica dipendenze) |
| `php artisan serve` | `./gradlew bootRun` |
| `public/index.php` (entry) | `CandidatureApplication.java` → `main()` |
| `.env` | `application.yml` + `application-local.yml` |
| `config/app.php` | classi `@Configuration` (es. `SecurityConfig`) |
| `app/Http/Middleware` | `SecurityFilterChain` (filtri HTTP) |
| `php artisan route:list` | (fase 5+) GraphQL schema / REST |
| `phpunit` | `./gradlew test` (JUnit) |
| Sail / Docker DB | Testcontainers (Postgres in Docker per i test) |

**Candidature oggi:** l'app che usi (login, kanban, offerte) gira ancora su **Python FastAPI :8000**. Java **:8081** è un secondo backend accanto, come avere due cartelle Laravel in monorepo ma solo una servita al browser.

---

## Obiettivo

Aggiungere `java-backend/` che **convive** con Python. Per ora:

- avvia un server HTTP (Tomcat embedded)
- si connette a PostgreSQL
- espone `GET /actuator/health`
- ha test automatici con Testcontainers

Il frontend **non** parla ancora con Java.

---

## Struttura file aggiunta

```
java-backend/
├── build.gradle.kts              ← dipendenze e versione Java
├── settings.gradle.kts
├── gradlew / gradlew.bat         ← wrapper Gradle (come npx local)
└── src/
    ├── main/
    │   ├── java/com/candidature/
    │   │   ├── CandidatureApplication.java   ← main()
    │   │   ├── config/SecurityConfig.java
    │   │   ├── domain/          (vuoto — fase 2)
    │   │   ├── repository/      (vuoto — fase 2)
    │   │   ├── service/         (vuoto — fase 5)
    │   │   ├── graphql/         (vuoto — fase 5)
    │   │   └── exception/       (vuoto — fase 6)
    │   └── resources/
    │       ├── application.yml         ← config default
    │       └── application-local.yml   ← config dev (profilo local)
    └── test/
        └── java/com/candidature/
            └── CandidatureApplicationTests.java
```

---

## 1. Gradle — dipendenze del progetto

**File:** `java-backend/build.gradle.kts`

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.5.0"
    id("io.spring.dependency-management") version "1.1.7"
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(25))
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-graphql")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

### Cosa imparare (confronto Laravel)

| Riga / blocco | Java / Spring | Laravel / PHP |
|---------------|---------------|---------------|
| `build.gradle.kts` | File build + dipendenze | `composer.json` |
| `JavaLanguageVersion.of(25)` | Versione JDK richiesta | `"php": "^8.2"` in composer |
| `spring-boot-starter-web` | Server HTTP (Tomcat) | Laravel HTTP kernel + `artisan serve` |
| `starter-data-jpa` | ORM Hibernate (Model in fase 2) | Eloquent |
| `starter-actuator` | `/actuator/health` | route custom `/health` o package |
| `starter-security` | Auth filter (JWT fase 4) | Middleware + Sanctum/Passport |
| `flyway-core` | Migration SQL (fase 2) | `database/migrations` |
| `testcontainers` | Postgres Docker nei test | `RefreshDatabase` + DB test |

Comandi:

```bash
./gradlew test      # compila + test
./gradlew bootRun   # compila + avvia app
```

---

## 2. Entry point — come parte l'app

**File:** `java-backend/src/main/java/com/candidature/CandidatureApplication.java`

```java
package com.candidature;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class CandidatureApplication {

    public static void main(String[] args) {
        SpringApplication.run(CandidatureApplication.class, args);
    }
}
```

### Cosa imparare (confronto Laravel)

| Elemento | Java | Laravel |
|----------|------|---------|
| `package com.candidature` | Namespace + cartelle | `namespace App\\` + PSR-4 |
| `@SpringBootApplication` | Avvia app + auto-config | `bootstrap/app.php` + Service Providers |
| `main()` | Entry point processo | `public/index.php` |
| `SpringApplication.run` | Boot framework | `$app->handleRequest()` |
| `@Configuration` + `@Bean` | Registra servizi nel container IoC | `AppServiceProvider::register()` |

**Flusso avvio (semplificato):**

```
main() → SpringApplication.run
      → legge application.yml + application-local.yml (se profilo active)
      → crea DataSource (PostgreSQL)
      → crea EntityManagerFactory (JPA/Hibernate)
      → applica SecurityConfig
      → avvia Tomcat sulla porta configurata
      → log: "Started CandidatureApplication in X seconds"
```

---

## 3. Configurazione — YAML e profili

### Default — `application.yml`

```yaml
spring:
  application:
    name: candidature-backend
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: false
    locations: classpath:db/migration

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

### Dev locale — `application-local.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5434/candidature
    username: candidature
    password: candidature

server:
  port: 8081

management:
  endpoint:
    health:
      show-details: always
```

### Cosa imparare

| Impostazione | Perché è importante |
|--------------|---------------------|
| **Profilo `local`** | Attivi con `--spring.profiles.active=local`. Spring **merge** `application.yml` + `application-local.yml`. |
| `open-in-view: false` | Best practice enterprise: la sessione DB non resta aperta per tutta la HTTP request (evita N+1 lazy loading). |
| `ddl-auto: validate` | Hibernate **non** crea/modifica tabelle: solo verifica che entity (fase 2) combacino col DB. Flyway possiederà lo schema. |
| `flyway.enabled: false` | Fase 1: schema ancora gestito da Python. Fase 2: `true` + file `V1__`, `V2__`, … |
| `server.port: 8081` (local) | Evita conflitto con altro servizio su 8080. |
| `jdbc:postgresql://localhost:5434/...` | Stesso DB Docker di Candidature Python (`docker-compose` espone 5434). |
| `management.endpoints` | Actuator: `/actuator/health`, `/actuator/info`. |

Confronto Python:

```python
# FastAPI — uvicorn legge env / settings
DATABASE_URL = "postgresql://candidature:candidature@localhost:5434/candidature"
```

```yaml
# Spring — stesso DB, formato JDBC
url: jdbc:postgresql://localhost:5434/candidature
```

---

## 4. Security — filtro HTTP (minimo)

**File:** `java-backend/src/main/java/com/candidature/config/SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .anyRequest().permitAll())
                .build();
    }
}
```

### Cosa imparare

| Elemento | Significato |
|----------|-------------|
| `@Configuration` | Classe di config Spring: i `@Bean` dentro vengono registrati nel container. |
| `@Bean` | Spring crea e gestisce un oggetto (qui la catena di filtri security). |
| `csrf.disable()` | API stateless JSON: no cookie form → CSRF off (standard per API + JWT). |
| `STATELESS` | Nessuna sessione server-side. Ogni request è indipendente (JWT in fase 4). |
| `requestMatchers(...).permitAll()` | `/actuator/health` accessibile senza login. |
| `anyRequest().permitAll()` | Fase 1: tutto aperto. Fase 4: solo login/register pubblici, resto autenticato. |

Ogni richiesta HTTP passa da una **catena di filtri** prima di arrivare al controller (GraphQL in fase 5):

```
HTTP Request → SecurityFilterChain → DispatcherServlet → (GraphQL / REST)
```

---

## 5. Test — Testcontainers + smoke test

**File:** `java-backend/src/test/java/com/candidature/CandidatureApplicationTests.java`

```java
@SpringBootTest
@Testcontainers
class CandidatureApplicationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("candidature")
            .withUsername("candidature")
            .withPassword("candidature");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void contextLoads() {
    }
}
```

### Cosa imparare

| Elemento | Significato |
|----------|-------------|
| `@SpringBootTest` | Carica l'intero contesto Spring (come `bootRun` ma in test). |
| `@Testcontainers` | Abilita container Docker nei test JUnit 5. |
| `@Container static PostgreSQLContainer` | Avvia PostgreSQL 16 in Docker **una volta** per la classe test. |
| `@DynamicPropertySource` | Sovrascrive `spring.datasource.*` con URL/porta del container (dinamici). |
| `void contextLoads()` | Test vuoto ma utile: se Spring non parte (config errata), fallisce. |

Equivalente concettuale pytest:

```python
@pytest.fixture(scope="module")
def postgres_container():
    # docker run postgres:16 ...
    yield url
```

**Requisito:** Docker Desktop avviato per `./gradlew test`.

---

## 6. Package vuoti — perché esistono già

File `package-info.java` in `domain/`, `repository/`, `service/`, `graphql/`, `exception/`.

In Java una cartella senza classi può non essere un package valido nel repo. I `package-info.java` segnano la struttura **a layer** che useremo:

| Package Java | Fase | Laravel |
|--------------|------|---------|
| `domain` | 2+ | `app/Models/` |
| `repository` | 2+ | Eloquent query / Repository pattern |
| `service` | 5+ | `app/Services/` |
| `graphql` | 5+ | `routes/api.php` + Controller sottili |
| `exception` | 6+ | `app/Exceptions/Handler.php` |

---

## Architettura dopo Fase 1

```
Browser (Next.js :3000)
        │
        ▼
Python FastAPI (:8000)  ──►  PostgreSQL (:5434)   ← app reale
        │
   scraper + AI + vector

Java Spring Boot (:8081) ──►  stesso PostgreSQL     ← parallelo, solo health
```

---

## Come testare

```bash
cd java-backend
./gradlew test
./gradlew bootRun --args='--spring.profiles.active=local'
```

Altro terminale:

```bash
curl http://localhost:8081/actuator/health
```

Risposta attesa (estratti):

```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP", "details": { "database": "PostgreSQL" } }
  }
}
```

Log atteso:

```text
Started CandidatureApplication in 1.2 seconds
Tomcat started on port 8081 (http)
```

### `bootRun` e exit code 143

`bootRun` **non termina da solo** — resta in esecuzione. Se vedi:

```text
BUILD FAILED — exit value 143
```

significa che il processo è stato **interrotto** (`Ctrl+C` o kill), non che l'avvio è fallito. Se prima compare `Started CandidatureApplication`, l'avvio è OK.

---

## Definition of Done — Fase 1

- [x] `java-backend/` con Gradle + Spring Boot 3.5
- [x] `./gradlew test` verde (Docker avviato)
- [x] `bootRun` + `/actuator/health` → UP
- [x] Python `:8000` e frontend `:3000` invariati
- [x] Flyway disabilitato (fase 2)

---

## Cosa NON fa ancora Java

- Nessuna API per candidature / auth / offerte
- Nessun GraphQL endpoint usato
- Nessuna entity JPA
- Frontend non chiama `:8081`

---

## Prossima fase

→ [Fase 2 — Flyway + schema DB](phase-02-schema-flyway.md): migrations SQL + entity `User`, `UserProfile`, `Application`.
