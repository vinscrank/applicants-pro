# Observability (Java backend)

## Structured logging

Spring Boot ECS structured logs on stdout:

```yaml
logging.structured.format.console: ecs
```

Each HTTP request logs:

- `http.method`, `http.path`, `http.status`, `duration_ms`

Filter: `RequestObservabilityFilter`

## Metrics

Actuator endpoints (public in dev/docker):

- `/actuator/health`
- `/actuator/metrics`
- `/actuator/prometheus`

Custom meters:

- `http.server.requests` (counter, tags: method, path, status)
- `http.server.request.duration` (timer)

## Phase 2 (not in MVP)

- Redis cache (phase 14)
- Distributed tracing (OpenTelemetry)
- Centralized log aggregation
