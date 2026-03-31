---
name: api-design
category: backend
description: REST API design — resource modeling, pagination, error responses, versioning, and HATEOAS
---

# API Design

## Overview
Load this skill when designing, implementing, or reviewing HTTP APIs. A well-designed API is intuitive, consistent, and evolvable. These patterns apply to REST APIs and can inform GraphQL and gRPC design as well.

## Workflow
1. **Model resources** — Identify nouns, not verbs; map to HTTP methods
2. **Define endpoints** — Consistent URL structure with proper HTTP semantics
3. **Design responses** — Uniform envelope, error format, pagination
4. **Plan evolution** — Versioning strategy, deprecation, backward compatibility
5. **Document** — OpenAPI spec, examples, error catalog

## Patterns

### Resource Modeling
- URLs are nouns: `/users`, `/orders`, `/products` — never `/getUsers` or `/createOrder`
- Use plural nouns for collections: `/users` not `/user`
- Nest for relationships: `/users/:id/orders` (max 2 levels deep)
- Use HTTP methods for actions: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)

### URL Structure
```
GET    /api/v1/users           → List users (paginated)
POST   /api/v1/users           → Create a user
GET    /api/v1/users/:id       → Get a specific user
PATCH  /api/v1/users/:id       → Update a user
DELETE /api/v1/users/:id       → Delete a user
GET    /api/v1/users/:id/orders → List user's orders
```

### Response Envelope
```json
{
  "data": { ... },
  "meta": { "requestId": "abc-123", "timestamp": "2025-01-01T00:00:00Z" }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  },
  "meta": { "requestId": "abc-123" }
}
```

### Status Codes
- 200 OK — successful GET, PATCH
- 201 Created — successful POST (include Location header)
- 204 No Content — successful DELETE
- 400 Bad Request — validation errors
- 401 Unauthorized — missing or invalid authentication
- 403 Forbidden — authenticated but not authorized
- 404 Not Found — resource doesn't exist
- 409 Conflict — duplicate or state conflict
- 422 Unprocessable Entity — semantically invalid request
- 429 Too Many Requests — rate limited (include Retry-After header)
- 500 Internal Server Error — unhandled server failure

### Pagination
```
GET /api/v1/users?page=2&limit=20
```
```json
{
  "data": [...],
  "pagination": {
    "page": 2, "limit": 20, "total": 150, "totalPages": 8
  }
}
```
- Default limit: 20, max limit: 100
- Use cursor-based pagination for large datasets: `?cursor=abc&limit=20`

### Versioning
- URL prefix: `/api/v1/`, `/api/v2/` (simplest, most explicit)
- Support at least one previous version after a new release
- Deprecate with `Sunset` and `Deprecation` headers

## Rules
- Every endpoint must require authentication unless explicitly public
- Every endpoint must validate input before processing
- Every response must include a request ID for traceability
- Never return 200 for errors — use appropriate 4xx/5xx codes
- Never expose internal IDs, stack traces, or database details in responses
- Always set `Content-Type` and standard security headers

## Anti-patterns
- Verbs in URLs: `/api/getUsers`, `/api/deleteOrder`
- Deeply nested resources: `/users/:id/orders/:id/items/:id/reviews`
- Returning 200 with `{ "success": false }` in the body
- Inconsistent response formats across endpoints
- No pagination on list endpoints — unbounded queries kill performance
- Breaking changes without versioning

## Checklist
- [ ] Resources modeled as nouns with proper HTTP methods
- [ ] Consistent URL structure across all endpoints
- [ ] Uniform response envelope for success and errors
- [ ] Proper HTTP status codes for all scenarios
- [ ] Pagination on all list endpoints
- [ ] Input validation on all endpoints
- [ ] Authentication required on all non-public endpoints
- [ ] Versioning strategy defined and applied
- [ ] OpenAPI/Swagger documentation generated
