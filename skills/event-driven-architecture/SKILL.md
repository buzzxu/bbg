---
name: event-driven-architecture
category: architecture
description: Event-driven architecture covering event sourcing, CQRS, message queues (Kafka, RabbitMQ, SQS), idempotency, and dead letter queues
---

# Event-Driven Architecture

## Overview
Load this skill when designing asynchronous systems, implementing event sourcing, choosing message brokers, or solving problems with temporal decoupling, audit trails, and eventual consistency. Events are facts about things that happened — build systems that react to facts.

## Key Patterns

### Event Types
1. **Domain events** — Business-meaningful occurrences: `OrderPlaced`, `PaymentProcessed`, `UserRegistered`
2. **Integration events** — Cross-service notifications: published to a broker for other services to consume
3. **Change data capture (CDC)** — Database changes streamed as events via Debezium or similar
4. **Commands vs events** — Commands request action (may be rejected); events record what happened (immutable facts)

### Event Sourcing
- Store the sequence of events as the source of truth, not the current state
- Derive current state by replaying events: `state = fold(initialState, events)`
- Benefits: complete audit trail, temporal queries ("what was the state on Tuesday?"), easy debugging
- Use snapshots to optimize replay — periodically save computed state to avoid replaying from event 0
- Event schema evolution: always add new fields as optional; never remove or rename existing fields
- Not appropriate for every domain — best for: order processing, financial transactions, inventory tracking

### CQRS (Command Query Responsibility Segregation)
- Separate write model (commands → events) from read model (projections → queries)
- Write model enforces business rules and produces events
- Read model is optimized for query patterns — denormalized, pre-computed, indexed for specific access patterns
- Read models are disposable and rebuildable from the event store
- Eventual consistency between write and read sides — design the UI to accommodate this

### Message Brokers

| Broker | Best For | Delivery | Ordering |
|--------|----------|----------|----------|
| Kafka | High-throughput event streaming, log compaction | At-least-once | Per-partition |
| RabbitMQ | Task queues, routing, request-reply | At-least-once / at-most-once | Per-queue |
| SQS | AWS-native, simple queues, low-ops | At-least-once | Best-effort (FIFO available) |
| NATS | Low-latency, cloud-native, lightweight | At-most-once / JetStream for durability | Per-subject (stream) |

### Idempotency
- Consumers must handle duplicate messages — at-least-once delivery means messages can arrive more than once
- Assign a unique event ID at production time; consumers track processed IDs
- Use idempotency keys in the database: `INSERT ... ON CONFLICT DO NOTHING`
- Design event handlers to be naturally idempotent where possible — `SET status = 'shipped'` is idempotent; `INCREMENT counter` is not
- Store the event ID alongside the side effect in the same database transaction

### Dead Letter Queues (DLQ)
- Route messages that fail processing after N retries to a DLQ
- DLQ messages need: original message, error details, failure timestamp, retry count
- Monitor DLQ depth — growing queues indicate systemic consumer issues
- Build tooling to inspect, replay, or discard DLQ messages
- Set alerts on DLQ message arrival — every DLQ message represents a failure to process business logic

### Consumer Patterns
- **Competing consumers** — Multiple instances consume from the same queue for horizontal scaling
- **Consumer groups** (Kafka) — Each group gets every message; within a group, partitions are distributed
- **Poison message handling** — Detect and quarantine messages that consistently cause failures
- **Backpressure** — Pull-based consumption; consumer controls rate to avoid overwhelming downstream systems

## Best Practices
- Events are immutable facts — never update or delete published events
- Include enough context in the event for consumers to process independently (fat events)
- Schema registry (Confluent, Apicurio) to enforce event contract compatibility
- Correlate events with a trace ID for end-to-end observability
- Design consumers to be restartable — they must recover from any point in the stream
- Test with chaos: simulate broker failures, consumer crashes, and duplicate delivery

## Anti-patterns
- Using events for synchronous request-reply — adds latency and complexity over a direct call
- Putting too many consumers on a single topic — creates tight coupling through shared schema
- Events without schema versioning — consumers break on producer changes
- Ignoring DLQ messages — they represent lost business transactions
- Processing order-dependent logic across partitions — Kafka only guarantees order within a partition
- Event payloads that reference external state (`userId: 123` with no user details) — consumer needs the producer's database

## Checklist
- [ ] Events follow a consistent naming convention and schema registry
- [ ] Event IDs are unique and used for consumer idempotency
- [ ] Dead letter queues configured for all consumers with monitoring
- [ ] Consumer idempotency verified with duplicate delivery tests
- [ ] Schema evolution strategy defined — additive-only changes
- [ ] Correlation IDs propagated through event chains
- [ ] Consumer lag monitored and alerted on
- [ ] Read model rebuilds tested end-to-end from event store
- [ ] Poison message handling prevents infinite retry loops
- [ ] Broker failover and consumer restart recovery tested


## Related

- **Agents**: [architect](../../agents/architect.md)
- **Rules**: [patterns](../../rules/common/patterns.md)
