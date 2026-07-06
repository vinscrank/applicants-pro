# Application Pro

Repository: [vinscrank/applicants-pro](https://github.com/vinscrank/applicants-pro)

Tracker candidature e ricerca lavoro — Java GraphQL + React + Python AI.

## Struttura

```
applicants-pro/
├── java-backend/      Spring Boot, GraphQL, PostgreSQL
├── python-ai/         Scraper e AI
├── frontend/          Next.js, Apollo Client
├── docs/
└── docker-compose.yml
```

## Avvio rapido

```bash
docker compose up --build
```

Frontend dev locale: `cd frontend && npm run dev`

## Documentazione

- [Piano refactor (16 fasi)](docs/refactor-java-portfolio.md)
- [GraphQL API](docs/graphql-schema.md)
- [Migrazione DB locale → Neon](docs/db-migrate-local-to-neon.md)
- [Deploy in produzione — guida completa](docs/deploy/GUIDA-COMPLETA.md)
- [Deploy — indice fasi](docs/deploy/README.md)
- [Apollo frontend](frontend/src/graphql/README.md)
