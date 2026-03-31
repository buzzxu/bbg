---
name: monitoring-patterns
category: operations
description: Observability patterns covering structured logging, metrics with Prometheus/Grafana, distributed tracing with OpenTelemetry, and SLO/SLI definition
---

# Monitoring Patterns

## Overview
Load this skill when instrumenting applications, setting up alerting, defining SLOs, or debugging production issues. The three pillars of observability — logs, metrics, traces — work together to provide full system visibility.

## Key Patterns

### Structured Logging
1. **JSON format** — Every log entry is a structured JSON object with timestamp, level, message, and context fields
2. **Correlation IDs** — Propagate a request ID across all services for end-to-end tracing
3. **Log levels** — DEBUG for development, INFO for normal operations, WARN for recoverable issues, ERROR for failures requiring attention
4. **Context enrichment** — Attach user ID, request path, duration, and service version to every log line
5. **Sensitive data** — Never log passwords, tokens, PII, or credit card numbers; mask or omit them

### Metrics (Prometheus / Grafana)
- **RED method for services** — Rate (requests/sec), Errors (error rate), Duration (latency percentiles)
- **USE method for resources** — Utilization, Saturation, Errors for CPU, memory, disk, network
- **Histogram over summary** — Prefer histograms for latency; they support aggregation across instances
- **Label cardinality** — Keep label values bounded; never use user IDs or request IDs as metric labels
- **Custom business metrics** — Track signups, purchases, feature usage alongside infrastructure metrics

### Distributed Tracing (OpenTelemetry)
- Instrument at service boundaries — HTTP handlers, database calls, external API calls, message consumers
- Propagate trace context via W3C Trace Context headers
- Add span attributes for query parameters, response codes, and business context
- Sample intelligently — 100% of errors, tail-sample for high-latency requests, percentage-sample the rest
- Export to a backend (Jaeger, Zipkin, Tempo) for trace visualization

### SLO / SLI Definition
- **SLI** — Measurable indicator: request latency p99, error rate, availability percentage
- **SLO** — Target threshold: "99.9% of requests complete in under 500ms over 30 days"
- **Error budget** — The allowed failure margin (0.1% in the example above); spend it on feature velocity
- **Burn rate alerts** — Alert when error budget consumption rate predicts exhaustion within the SLO window

## Best Practices
- Instrument before you need to debug — add observability at build time, not during incidents
- Use OpenTelemetry SDK as the vendor-neutral instrumentation layer
- Dashboard hierarchy: high-level service health → per-service detail → individual endpoint drill-down
- Alert on symptoms (high error rate), not causes (high CPU) — causes are for investigation
- Set up on-call runbooks that link alerts to dashboards and known remediation steps
- Review SLOs quarterly; adjust based on user impact data

## Anti-patterns
- Logging at DEBUG level in production without sampling — creates log flood
- Alerting on every metric deviation — causes alert fatigue; focus on user-impacting symptoms
- Using high-cardinality labels in metrics — explodes storage and query cost
- Tracing only happy paths — instrument error paths and retries too
- Setting SLOs at 100% — impossible to achieve; leaves no room for deployments or experiments
- Building dashboards nobody looks at — tie dashboards to on-call rotation and incident workflow

## Checklist
- [ ] All services emit structured JSON logs with correlation IDs
- [ ] RED metrics (rate, errors, duration) exported for every service
- [ ] Distributed traces propagated across service boundaries
- [ ] SLIs defined for critical user journeys
- [ ] SLOs set with realistic targets and error budgets
- [ ] Alerts fire on SLO burn rate, not raw metric thresholds
- [ ] Dashboards exist for service health overview and per-service drill-down
- [ ] Sensitive data excluded from all logs and trace attributes
- [ ] On-call runbooks link alerts to dashboards and remediation steps
- [ ] Observability stack tested — verify traces and metrics flow end-to-end
