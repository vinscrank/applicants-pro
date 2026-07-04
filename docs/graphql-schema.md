# GraphQL API

Schema file: `java-backend/src/main/resources/graphql/schema.graphqls`

## Core queries

| Query | Description |
| --- | --- |
| `me` | Current authenticated user |
| `applicationsPage(input)` | Paginated applications (offset/limit, max 500) |
| `applications` | Full list (legacy, prefer paginated query) |
| `application(id)` | Single application |
| `applicationStats` | Dashboard counters |
| `applicationTasks(scope)` | Follow-up / interview tasks for Today |

## Pagination

```graphql
query GetApplicationsPage($input: ApplicationPageInput) {
  applicationsPage(input: $input) {
    items { id companyName jobTitle status }
    totalCount
    limit
    offset
    hasNextPage
  }
}
```

Defaults: `limit=100`, `offset=0`, max `limit=500`.

## Error format

GraphQL errors include extensions:

```json
{
  "message": "Application not found",
  "extensions": {
    "code": 404,
    "status": 404,
    "classification": "DataFetchingException"
  }
}
```

Handled centrally in `GraphQlGlobalExceptionHandler`.

## Mutations

- `createApplication`, `updateApplication`, `deleteApplication`
- `parseSearchPrompt`, `runJobSearch` (job discovery orchestration)

## REST vs GraphQL

| Domain | Protocol | Reason |
| --- | --- | --- |
| Applications, stats, tasks | GraphQL | Core tracker domain, typed schema |
| Auth, profile, CV upload | REST | File upload, cookie/token flows |
| Billing / Stripe webhooks | REST | External provider contract |
| Job search, scrape, embed | REST | Long-running calls, Python AI proxy |
