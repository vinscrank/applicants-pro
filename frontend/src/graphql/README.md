# GraphQL / Apollo

Dominio **candidature** interamente su Apollo Client.

## Struttura

```
graphql/
  queries.ts       # TypedDocumentNode + tipi risposta
  mutations.ts     # create / update / delete / job search
  policies.ts      # watchFetchPolicy (hooks), clientFetchPolicy (apolloClient.query)
  applications.ts  # API imperativa (extension, jobs bridge)
hooks/
  useApplicationsQuery.ts
  useApplicationQuery.ts
  useApplicationMutations.ts
  useApplicationTasks.ts
lib/
  apollo-client.ts # client singleton + cache typePolicies
```

## React

Usa sempre gli hook in `hooks/` nei componenti.

- `useApplicationsQuery` → `applicationsPage` + opzionale `applicationStats`
- `useApplicationQuery` → `application(id)`
- `useApplicationMutations` → mutazioni con `refetchQueries` automatico
- `useApplicationTasks` → `applicationTasks(scope)`

## Fuori da React

Extension e jobs bridge importano da `@/graphql/applications`:

- `queryApplicationsPage` / `queryApplicationsFiltered`
- `queryApplication`
- `mutateCreateApplication` / `mutateUpdateApplication` / `mutateDeleteApplication`

## REST (altri domini)

Auth, billing e job scrape restano REST (`authFetch`, `jobsFetch`) per upload file, webhook Stripe e timeout lunghi verso Python AI.
