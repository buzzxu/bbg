---
name: api-versioning
category: architecture
description: API versioning strategies covering URL path, header, content negotiation, backward compatibility, deprecation policies, and migration guides
---

# API Versioning

## Overview
Load this skill when designing APIs that will evolve over time, planning breaking changes, or establishing deprecation policies. Every public API will change — a versioning strategy decides whether those changes break your consumers or not.

## Key Patterns

### Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL path | `/api/v2/users` | Simple, visible, cacheable | Clients must update every URL |
| Query parameter | `/api/users?version=2` | Easy to default to latest | Easy to forget, poor caching |
| Custom header | `X-API-Version: 2` | Clean URLs | Hidden from browser, harder to test |
| Content negotiation | `Accept: application/vnd.api.v2+json` | REST-purist, flexible | Complex, poor tooling support |
| No versioning (evolve) | Always backward compatible | No version management | Constrains design evolution |

**Recommendation**: URL path versioning for public APIs (simple, explicit, discoverable). Evolutionary approach for internal APIs with coordinated consumers.

### Backward Compatible Changes (Non-breaking)
- Adding new optional fields to responses
- Adding new endpoints
- Adding new optional query parameters or headers
- Adding new enum values (if clients tolerate unknown values)
- Widening input validation (accepting more formats)

### Breaking Changes (Require New Version)
- Removing or renaming fields in responses
- Changing field types or semantics
- Removing endpoints
- Adding required request fields
- Narrowing input validation (rejecting previously accepted input)
- Changing error response format

### Deprecation Policy
1. **Announce** — Mark endpoints/fields as deprecated in API docs, response headers (`Deprecation: true`, `Sunset: <date>`), and changelogs
2. **Instrument** — Log usage of deprecated features; contact active consumers directly
3. **Grace period** — Minimum 6 months for public APIs; 2 sprints for internal APIs
4. **Migrate** — Provide migration guides with before/after examples for every breaking change
5. **Remove** — Only after usage drops to zero or grace period expires; monitor for stragglers

### Migration Guide Template
```
## Migrating from v1 to v2

### Breaking Changes
1. `GET /v1/users/:id` → `GET /v2/users/:id`
   - Response field `name` split into `firstName` and `lastName`
   - Before: { "name": "Jane Doe" }
   - After:  { "firstName": "Jane", "lastName": "Doe" }

### New Features
- Added `GET /v2/users/:id/preferences` endpoint

### Deprecated (will be removed in v3)
- `GET /v2/users/:id?include=prefs` — use the new preferences endpoint

### Timeline
- v2 available: 2025-01-15
- v1 deprecated: 2025-01-15
- v1 sunset: 2025-07-15
```

### Version Lifecycle
- **Active** — Fully supported, receives bug fixes and security patches
- **Deprecated** — Still functional but no new features; consumers warned on every response
- **Sunset** — Disabled; returns 410 Gone with pointer to current version
- Support at most 2 active major versions simultaneously — more creates unsustainable maintenance burden

## Best Practices
- Design APIs to minimize breaking changes — prefer additive evolution over versioning
- Use expand/fields parameters for response shaping instead of new versions
- Version at the API level, not per-endpoint — consumers should not mix versions
- Include version in API documentation URL and SDK package names
- Run integration tests against all supported API versions
- Return `Sunset` and `Deprecation` headers on deprecated versions in every response
- Semantic versioning for API SDKs — major version aligns with API version

## Anti-patterns
- Versioning every minor change — leads to version proliferation and maintenance nightmare
- Supporting 5+ active versions simultaneously — impossible to maintain quality
- Breaking changes without version bump — destroys consumer trust
- Deprecating without instrumentation — you do not know who is affected
- Internal APIs with the same rigidity as public APIs — internal consumers can coordinate
- Removing deprecated versions without checking usage — breaks consumers silently

## Checklist
- [ ] Versioning strategy chosen and documented (URL path recommended for public APIs)
- [ ] Backward compatibility guidelines defined — team knows what is breaking vs non-breaking
- [ ] Deprecation policy established with minimum grace periods
- [ ] Deprecated endpoints return `Deprecation` and `Sunset` headers
- [ ] Usage of deprecated features is instrumented and monitored
- [ ] Migration guide provided for every breaking change with before/after examples
- [ ] Integration tests cover all supported API versions
- [ ] Maximum 2 active major versions supported simultaneously
- [ ] API changelog maintained and published with every release
- [ ] Sunset versions return 410 Gone with migration pointer
