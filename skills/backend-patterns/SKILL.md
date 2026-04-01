---
name: backend-patterns
category: backend
description: Backend architecture — repository pattern, service layer, middleware, caching, and queue patterns
---

# Backend Patterns

## Overview
Load this skill when designing or implementing server-side architecture. These patterns separate concerns, improve testability, and scale from small services to large applications. Apply them when building APIs, background jobs, or data processing pipelines.

## Workflow
1. **Layer** — Identify which architectural layer the code belongs to
2. **Pattern** — Select the appropriate pattern for the concern
3. **Implement** — Follow the pattern's conventions
4. **Test** — Each layer is testable in isolation via dependency injection

## Patterns

### Layered Architecture
```
Controller/Handler  → HTTP concerns: parse request, call service, format response
Service Layer       → Business logic: orchestrate operations, enforce rules
Repository Layer    → Data access: queries, mutations, caching
Infrastructure      → External systems: databases, queues, APIs, filesystems
```

### Repository Pattern
- Encapsulates all data access behind an interface
- One repository per aggregate root (UserRepository, OrderRepository)
- Methods: `findById`, `findMany`, `create`, `update`, `delete`
- Never expose query builders or ORM internals outside the repository
- Use interfaces for testability — swap real DB for in-memory in tests

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findMany(filter: UserFilter): Promise<PaginatedResult<User>>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}
```

### Service Layer
- Contains business logic — the "what" and "why" of operations
- Orchestrates multiple repositories and external services
- Validates business rules (not input format — that's the controller's job)
- Returns domain objects, not HTTP responses
- One public method per use case for clarity

### Middleware Pattern
- Cross-cutting concerns: auth, logging, rate limiting, error handling
- Execute in a defined order: auth → rate limit → validate → handle → log
- Each middleware does one thing and calls `next()`
- Error middleware catches all unhandled errors and formats responses

### Caching Strategy
- **Cache-aside**: application checks cache first, fetches from DB on miss, writes to cache
- **TTL**: set expiration based on data volatility (user profiles: 5min, config: 1hr)
- **Invalidation**: invalidate on write — never serve stale data for critical operations
- **Cache keys**: deterministic, namespaced (`users:${id}`, `orders:list:${hash(filter)}`)
- **Layered caching**: in-memory (process) → distributed (Redis) → database

### Queue Patterns
- **Fire-and-forget**: enqueue and return immediately (email sending, notifications)
- **Request-reply**: enqueue, wait for result with timeout (async processing)
- **Dead letter queue**: failed messages go to DLQ after N retries for manual inspection
- **Idempotency**: every job must be safe to retry — use idempotency keys
- **Backpressure**: monitor queue depth, scale consumers, reject when overwhelmed

### Error Handling Strategy
- Controllers: catch errors, map to HTTP status codes, format response
- Services: throw domain-specific errors (`UserNotFoundError`, `InsufficientFundsError`)
- Repositories: wrap database errors in domain errors, never leak DB internals
- Global handler: catch unhandled errors, log with context, return 500

## Rules
- Business logic lives in services — never in controllers or repositories
- Repositories return domain objects — never raw database rows
- Controllers never call repositories directly — always through services
- Every external call must have a timeout and retry strategy
- Queue jobs must be idempotent — retries must not cause side effects
- Cache invalidation must happen on every write path

## Anti-patterns
- Fat controllers that contain business logic and data access
- Services that return HTTP status codes or format responses
- Repositories that contain business rules or validation
- Caching without invalidation — stale data causes subtle bugs
- Queue jobs without idempotency — retries cause duplicate side effects
- Leaking database abstractions (ORM models, query builders) outside the repository

## Checklist
- [ ] Code is organized in clear layers (controller → service → repository)
- [ ] Business logic is in service layer only
- [ ] Repositories use interfaces for testability
- [ ] Middleware handles cross-cutting concerns
- [ ] Caching has TTL and invalidation strategies
- [ ] Queue jobs are idempotent with dead letter queues
- [ ] All external calls have timeouts and retries
- [ ] Each layer is testable in isolation


## Related

- **Agents**: [architect](../../agents/architect.md)
- **Rules**: [patterns](../../rules/common/patterns.md), [performance](../../rules/common/performance.md)
