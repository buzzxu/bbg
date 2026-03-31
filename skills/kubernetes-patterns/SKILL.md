---
name: kubernetes-patterns
category: devops
description: Kubernetes patterns — deployment strategies, service mesh, ConfigMap/Secret management, HPA, and resource limits
---

# Kubernetes Patterns

## Overview
Load this skill when designing, deploying, or operating applications on Kubernetes. These patterns cover the most common and impactful decisions for production K8s workloads.

## Patterns

### Deployment Strategies
```yaml
# Rolling Update (default) — zero-downtime replacement
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 0     # Never have fewer than desired replicas

# Recreate — all pods terminated before new ones created (for stateful apps that can't share storage)
strategy:
  type: Recreate
```
- Use RollingUpdate for stateless services (web APIs, workers)
- Use Recreate only when multiple versions cannot coexist
- For canary/blue-green: use Argo Rollouts or Flagger

### Resource Management
```yaml
resources:
  requests:
    cpu: 100m        # Guaranteed minimum — used for scheduling
    memory: 128Mi    # Guaranteed minimum — pod killed if node is under pressure
  limits:
    cpu: 500m        # Throttled (not killed) if exceeded
    memory: 512Mi    # OOMKilled if exceeded
```
- Always set requests and limits — pods without limits can starve the node
- Requests ≤ Limits — requests are for scheduling, limits are for enforcement
- Memory limits should be 2-4x requests for bursty workloads
- CPU limits are optional (throttling vs. killing trade-off)
- Monitor actual usage and adjust — don't guess

### Horizontal Pod Autoscaler (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5min before scaling down
```
- Minimum 2 replicas for availability
- Scale on CPU for compute-bound, custom metrics (queue depth, request rate) for I/O-bound
- Set stabilization window for scale-down to prevent flapping
- HPA requires resource requests to be set

### ConfigMap & Secret Management
- **ConfigMaps**: non-sensitive configuration — feature flags, service URLs, tuning parameters
- **Secrets**: sensitive data — API keys, database credentials, TLS certificates
- Mount as environment variables for simple values
- Mount as volumes for files (TLS certs, config files)
- Use external secrets operators (ESO) to sync from Vault/AWS Secrets Manager
- Never store secrets in git — use sealed-secrets or external secret stores
- Rotate secrets without pod restart: use volume mounts (auto-updated) instead of env vars

### Probes
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30
  periodSeconds: 10    # 30 * 10s = 5min startup window
```
- Liveness: restart pod if unhealthy — keep simple, don't check dependencies
- Readiness: remove from service if not ready — check dependencies here
- Startup: delay liveness checks for slow-starting apps

### Network Policies
- Default deny all ingress and egress — then allow explicitly
- Allow only required communication between services
- Isolate namespaces: dev, staging, production should not communicate
- Allow DNS (port 53) in egress policies — pods need name resolution

### Pod Disruption Budgets
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
spec:
  minAvailable: 1      # At least 1 pod always running during disruptions
  selector:
    matchLabels:
      app: api-server
```
- Set PDB for every production deployment
- Protects against voluntary disruptions (node drain, cluster upgrade)
- Use `minAvailable` or `maxUnavailable` — not both

## Rules
- Every pod must have resource requests and limits
- Every pod must have liveness and readiness probes
- Every production deployment must have a PodDisruptionBudget
- Secrets must never be stored in git or ConfigMaps
- Minimum 2 replicas for any production service
- Network policies must default-deny and explicitly allow

## Anti-patterns
- No resource limits — a single pod can consume all node resources
- Liveness probes that check external dependencies — causes cascading restarts
- Single replica in production — any disruption causes downtime
- Secrets in ConfigMaps or environment variable literals in manifests
- No PDB — cluster upgrades can take down all pods simultaneously
- Over-provisioned resources — wastes cluster capacity and money

## Checklist
- [ ] Resource requests and limits set for all containers
- [ ] Liveness, readiness, and startup probes configured
- [ ] HPA configured with appropriate metrics and min replicas
- [ ] Secrets managed via external secrets operator or sealed-secrets
- [ ] Network policies default-deny with explicit allows
- [ ] PodDisruptionBudget set for production deployments
- [ ] Deployment strategy appropriate for the workload type
- [ ] Minimum 2 replicas for production services
