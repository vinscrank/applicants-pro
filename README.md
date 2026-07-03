# Candidature — refactor Java (progetto pulito)

Progetto **greenfield**: si costruisce fase per fase seguendo il piano in `docs/`.
Nessun codice ereditato da altri repo — ogni fase aggiunge solo ciò che serve.

## Stato attuale

| Fase | Branch | Stato |
|------|--------|-------|
| 0 | `refactor/phase-00-baseline` | In corso — solo documentazione |

## Documentazione

- [Piano completo (16 fasi)](docs/refactor-java-portfolio.md)
- [Guide operative per fase](docs/phases/README.md)
- [Inventario API target](docs/phase-00-api-inventory.md)

## Struttura target (fine percorso)

```
interview/
├── java-backend/      ← fase 1+
├── python-ai/         ← fase 9+
├── frontend/          ← fase 7+
├── extension/         ← fase 13+
├── docs/
└── docker-compose.yml ← fase 3+
```

## Workflow

```bash
git checkout main
git pull
git checkout -b refactor/phase-NN-nome
# lavoro della fase
git checkout main && git merge refactor/phase-NN-nome
```

## Fase 0 — cosa fare ora

1. Leggere `docs/phases/phase-00-baseline.md`
2. Leggere l'inventario API e lo schema DB nel piano
3. Capire owner futuro (Java / Python / Java→Python)
4. Merge in `main` quando la checklist fase 0 è completa

Nessun codice in questa fase.
