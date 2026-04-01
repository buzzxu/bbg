---
name: ci-cd-patterns
category: operations
description: CI/CD pipeline patterns for GitHub Actions, GitLab CI, Jenkins, and Azure DevOps with caching, matrix builds, and environment promotion
---

# CI/CD Patterns

## Overview
Load this skill when designing, debugging, or optimizing CI/CD pipelines. Applies to any platform — GitHub Actions, GitLab CI, Jenkins, Azure DevOps — with transferable patterns for fast, reliable, and secure delivery.

## Key Patterns

### Pipeline Structure
1. **Lint → Test → Build → Deploy** — Fail fast; cheapest checks run first
2. **Matrix builds** — Test across OS, language version, and dependency combinations in parallel
3. **Fan-out / fan-in** — Parallelize independent jobs, gate on all completing before promotion
4. **Reusable workflows** — Extract shared pipeline logic into callable templates (GitHub composite actions, GitLab includes)
5. **Environment promotion** — dev → staging → production with manual approval gates for production

### Caching Strategies
- Cache dependency installs (`node_modules`, `.venv`, `~/.m2`) keyed on lockfile hash
- Cache build artifacts between jobs within the same workflow run
- Invalidate caches on lockfile change — never cache without a versioned key
- Layer Docker builds to maximize cache hits (`COPY package.json` before `COPY src/`)

### Artifact Management
- Upload test results, coverage reports, and build outputs as pipeline artifacts
- Tag artifacts with commit SHA and build number for traceability
- Set retention policies — keep release artifacts longer than PR artifacts
- Sign artifacts in release pipelines for integrity verification

### Environment Promotion
- Use identical build artifacts across all environments — never rebuild for production
- Parameterize environment-specific config via environment variables or secrets
- Implement canary or blue-green deployments for zero-downtime releases
- Require manual approval for production deployments with audit trail

## Best Practices
- Pin action/image versions to SHA, not tags (`uses: actions/checkout@v4` → use full SHA)
- Set timeout limits on every job to prevent runaway builds
- Use OIDC for cloud authentication — never store long-lived cloud credentials
- Run security scans (SAST, dependency audit) in CI, not just locally
- Keep pipeline definitions in version control alongside application code
- Emit structured logs from pipelines for debugging failed runs

## Anti-patterns
- Running the entire test suite on every push to every branch — use path filters
- Storing secrets in pipeline YAML — use platform secret stores
- Manual SSH deployments bypassing the pipeline
- Ignoring flaky tests — quarantine and fix, never skip permanently
- Deploying different artifacts to staging vs production
- Pipelines that take >15 minutes without parallelization effort

## Checklist
- [ ] Pipeline fails fast — lint and static analysis run before tests
- [ ] Dependencies cached with lockfile-based keys
- [ ] Matrix builds cover target OS and language versions
- [ ] Secrets injected from platform secret store, never hardcoded
- [ ] Build artifacts are immutable and promoted across environments
- [ ] Production deployment requires approval gate
- [ ] Pipeline has timeout limits on all jobs
- [ ] Flaky tests are quarantined and tracked for resolution
- [ ] Action/image versions are pinned to specific SHA or digest
- [ ] Pipeline runs complete in under 10 minutes for PR checks


## Related

- **Agents**: [build-error-resolver](../../agents/build-error-resolver.md), [devops-reviewer](../../agents/devops-reviewer.md), [typescript-build-resolver](../../agents/typescript-build-resolver.md), [python-build-resolver](../../agents/python-build-resolver.md), [go-build-resolver](../../agents/go-build-resolver.md), [java-build-resolver](../../agents/java-build-resolver.md), [rust-build-resolver](../../agents/rust-build-resolver.md), [cpp-build-resolver](../../agents/cpp-build-resolver.md)
- **Commands**: [/build-fix](../../commands/build-fix.md)
