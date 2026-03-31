---
name: microservices-patterns
category: architecture
description: Microservices architecture covering service decomposition, API gateway, event-driven communication, saga pattern, circuit breaker, and service mesh
---

# Microservices Patterns

## Overview
Load this skill when designing distributed systems, decomposing a monolith, or solving cross-service communication and reliability challenges. Microservices trade development simplicity for operational complexity — only adopt them when the organizational and scaling benefits justify that cost.

## Key Patterns

### Service Decomposition
1. **Business capability** — Align services to business domains: Orders, Inventory, Payments, Users
2. **Bounded context** — Use Domain-Driven Design to find natural service boundaries; each service owns its data
3. **Strangler fig** — Incrementally extract services from a monolith; route traffic gradually to the new service
4. **Right-sizing** — A service should be owned by one team (2-pizza rule); not too large to block deployments, not too small to create unnecessary network hops
5. **Data ownership** — Each service owns its database; no shared databases between services

### API Gateway
- Single entry point for external clients — routes requests to internal services
- Handles cross-cutting concerns: authentication, rate limiting, request transformation, TLS termination
- Aggregates responses from multiple services for client convenience (BFF pattern)
- Avoid business logic in the gateway — it is a routing and policy layer only
- Implementations: Kong, NGINX, AWS API Gateway, Envoy

### Inter-service Communication
- **Synchronous (REST/gRPC)** — Use for queries and commands that need immediate responses
- **Asynchronous (events/messages)** — Use for operations that can tolerate latency and need decoupling
- **gRPC** — Prefer for internal service-to-service calls; binary protocol, schema enforcement, streaming
- **Events** — Publish domain events to a message broker; consuming services react independently
- Always define service contracts (OpenAPI, protobuf) and version them explicitly

### Circuit Breaker
- Wrap remote calls with a circuit breaker to prevent cascade failures
- States: **Closed** (normal) → **Open** (failing, reject immediately) → **Half-open** (test with limited traffic)
- Configure thresholds: failure rate > 50% over 10 requests → open circuit for 30 seconds
- Return fallback responses when circuit is open — degraded experience is better than error page
- Combine with timeouts and retries with exponential backoff and jitter

### Saga Pattern
- Coordinate multi-service transactions without distributed locks
- **Choreography** — Each service publishes events; next service reacts; simpler but harder to trace
- **Orchestration** — Central coordinator directs the saga steps; easier to reason about and monitor
- Define compensating transactions for every step — if step 3 fails, undo steps 2 and 1
- Persist saga state for crash recovery — the saga must resume after service restart

### Service Mesh
- Sidecar proxy (Envoy/Istio, Linkerd) handles networking concerns transparently
- Provides: mTLS between services, traffic shaping, observability, retries, circuit breaking
- Removes networking logic from application code — services communicate as if on localhost
- Use for: large deployments (>10 services), strict mTLS requirements, canary deployments

## Best Practices
- Start with a well-structured monolith — extract services when you have clear domain boundaries and team scaling pressure
- Each service is independently deployable, testable, and scalable
- Use correlation IDs for distributed tracing across all service calls
- Implement health checks (liveness and readiness probes) in every service
- Design for failure — every remote call can fail, time out, or return unexpected data
- Contract testing (Pact) between services to catch breaking changes before deployment

## Anti-patterns
- **Distributed monolith** — Services tightly coupled via synchronous calls or shared databases; worst of both worlds
- **Nano-services** — Services so small they add network latency without organizational benefit
- **Shared database** — Multiple services reading/writing the same tables; defeats independent deployment
- **Synchronous chains** — Service A calls B calls C calls D; latency compounds, availability multiplies
- **Missing circuit breakers** — One slow service cascades failure to every upstream caller
- **Big bang migration** — Rewriting the entire monolith at once instead of incremental extraction

## Checklist
- [ ] Services aligned to business domains with clear bounded contexts
- [ ] Each service owns its data — no shared databases
- [ ] API gateway handles authentication, rate limiting, and routing
- [ ] Circuit breakers configured on all inter-service calls
- [ ] Async communication used where immediate response is not required
- [ ] Saga pattern or equivalent handles cross-service transactions
- [ ] Service contracts defined and version-controlled (OpenAPI/protobuf)
- [ ] Contract tests verify compatibility between service pairs
- [ ] Distributed tracing with correlation IDs across all services
- [ ] Health checks (liveness/readiness) implemented in every service


## Related

- **Agents**: [architect](../../agents/architect.md)
- **Rules**: [patterns](../../rules/common/patterns.md), [performance](../../rules/common/performance.md)
