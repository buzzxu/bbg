---
name: deployment-patterns
category: devops
description: CI/CD pipelines, blue-green deployment, canary releases, health checks, and rollback strategies
---

# Deployment Patterns

## Overview
Load this skill when designing CI/CD pipelines, planning releases, or implementing deployment strategies. The goal is shipping changes safely and frequently with the ability to roll back instantly when something goes wrong.

## Patterns

### CI/CD Pipeline Stages
```
1. Build      → Compile, bundle, create artifacts
2. Test       → Unit, integration, E2E tests
3. Scan       → Security audit, license check, SAST
4. Package    → Docker image, npm package, binary
5. Deploy     → Push to staging/production
6. Verify     → Health checks, smoke tests, monitoring
7. Promote    → Approve for next environment (staging → production)
```

### Blue-Green Deployment
- Maintain two identical environments: Blue (current) and Green (new)
- Deploy new version to Green while Blue serves traffic
- Run smoke tests against Green
- Switch traffic from Blue to Green (DNS, load balancer, or router)
- Keep Blue running for instant rollback
- Rollback: switch traffic back to Blue (seconds, not minutes)

### Canary Release
- Route a small percentage (1-5%) of traffic to the new version
- Monitor error rates, latency, and business metrics
- Gradually increase traffic: 5% → 25% → 50% → 100%
- Automatic rollback if error rate exceeds threshold
- Requires: traffic splitting at load balancer/service mesh level

### Rolling Update
- Replace instances one at a time (or in small batches)
- Each new instance passes health checks before old instance is removed
- Configure: `maxUnavailable: 25%`, `maxSurge: 25%`
- Supports rollback by reversing the update
- Simplest strategy — default for Kubernetes deployments

### Feature Flags
- Decouple deployment from release — deploy disabled features
- Enable for internal users first, then beta, then all users
- Kill switch: disable problematic features without redeploying
- Clean up: remove flags within 2 weeks of full rollout
- Store flags in a service (LaunchDarkly, Unleash) — not in code

### Health Checks
```
Liveness   → Is the process alive? Restart if not.
Readiness  → Can it serve traffic? Remove from LB if not.
Startup    → Has it finished initializing? Wait before checking liveness.
```
- Liveness: simple check — process responds to HTTP
- Readiness: dependency check — database connected, cache warm, required services reachable
- Never include external dependencies in liveness checks — causes cascading restarts

### Rollback Strategy
- **Instant**: blue-green switch, feature flag toggle (seconds)
- **Fast**: revert to previous container image or artifact (minutes)
- **Slow**: revert code, rebuild, redeploy (avoid this)
- Always have a tested rollback plan before deploying
- Practice rollbacks regularly — an untested rollback is not a rollback

### Environment Promotion
```
Development → runs on every commit; fast feedback
Staging     → mirrors production config; integration testing
Production  → promoted from staging; gradual rollout
```
- Same artifact in every environment — never rebuild per environment
- Configuration differs per environment — use environment variables
- Production access requires explicit promotion (manual gate or approval)

## Rules
- Every deployment must be rollback-ready before execution
- Every service must have liveness and readiness health checks
- Same build artifact must be used across all environments
- Feature flags must be cleaned up within 2 weeks of full rollout
- Deployments must be automated — no manual steps in the pipeline
- Production deploys require passing tests in staging first

## Anti-patterns
- "Big bang" deployments — deploying everything at once with no gradual rollout
- Manual production deployments — error-prone and unrepeatable
- No health checks — dead instances continue receiving traffic
- Rebuilding artifacts per environment — introduces inconsistency
- Rollback by revert+rebuild — too slow for incident response
- Feature flags that live forever — become technical debt

## Checklist
- [ ] CI/CD pipeline automates build, test, scan, deploy
- [ ] Deployment strategy chosen (blue-green, canary, rolling)
- [ ] Health checks configured (liveness, readiness, startup)
- [ ] Rollback plan tested and documented
- [ ] Same artifact promoted across environments
- [ ] Feature flags used for decoupling deploy from release
- [ ] Monitoring and alerts verify deployment health
- [ ] Production deploy requires staging validation first


## Related

- **Agents**: [devops-reviewer](../../agents/devops-reviewer.md)
- **Rules**: [performance](../../rules/common/performance.md)
