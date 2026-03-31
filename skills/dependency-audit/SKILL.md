---
name: dependency-audit
category: security
description: Dependency management covering npm audit, pip-audit, govulncheck, Dependabot/Renovate configuration, license compliance, and SBOM generation
---

# Dependency Audit

## Overview
Load this skill when auditing project dependencies for vulnerabilities, configuring automated dependency updates, verifying license compliance, or generating Software Bill of Materials (SBOM). Third-party code is part of your attack surface — treat it accordingly.

## Workflow
1. **Audit** — Scan all dependencies for known vulnerabilities
2. **Triage** — Assess severity, exploitability, and whether your code exercises the vulnerable path
3. **Remediate** — Update, patch, or replace vulnerable dependencies
4. **Automate** — Configure automated PR-based dependency updates
5. **Comply** — Verify licenses are compatible with your project and generate SBOM
6. **Monitor** — Continuously watch for new CVEs affecting your dependency tree

## Key Patterns

### Vulnerability Scanning by Ecosystem
| Ecosystem | Tool | Command |
|-----------|------|---------|
| Node.js | npm audit | `npm audit --audit-level=high` |
| Node.js | Socket.dev | GitHub App or `socket npm audit` |
| Python | pip-audit | `pip-audit -r requirements.txt` |
| Go | govulncheck | `govulncheck ./...` |
| Java | OWASP Dependency-Check | `mvn dependency-check:check` |
| Rust | cargo-audit | `cargo audit` |
| Multi-lang | Snyk / Trivy | `trivy fs --security-checks vuln .` |

### Triage Guidelines
- **Critical/High with exploit** — Fix immediately; block deployment
- **Critical/High without known exploit** — Fix within current sprint
- **Medium** — Schedule within the next 2 sprints
- **Low / informational** — Track; fix opportunistically
- **Not reachable** — Your code does not call the vulnerable function; document and accept risk

### Automated Dependency Updates
- **Dependabot** — Native GitHub; configure `.github/dependabot.yml` with update schedule and grouping
- **Renovate** — More flexible; supports monorepos, custom grouping, auto-merge for patch updates
- Group minor/patch updates by ecosystem to reduce PR noise
- Auto-merge patch updates that pass CI; require review for major version bumps
- Pin exact versions in lockfiles; use ranges only in library `package.json`

### License Compliance
- Maintain an allowlist of approved licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
- Flag copyleft licenses (GPL, AGPL, LGPL) for legal review before adoption
- Check transitive dependencies — a permissive direct dependency may pull in a copyleft transitive one
- Use `license-checker` (Node), `pip-licenses` (Python), or `go-licenses` (Go) in CI

### SBOM Generation
- Generate SBOM in CycloneDX or SPDX format for every release
- Include: component name, version, license, supplier, hash
- Attach SBOM as a release artifact; provide to customers upon request
- Use `syft` or `cdxgen` for multi-ecosystem SBOM generation

## Best Practices
- Run dependency audit in CI — fail the build on critical/high vulnerabilities
- Keep dependencies minimal — every dependency is a liability; evaluate before adding
- Prefer well-maintained libraries with active security response (check: last commit, issue response time, CVE history)
- Review dependency diffs on update PRs — changelog and code changes, not just version bump
- Separate development and production dependencies — audit production deps with higher scrutiny

## Anti-patterns
- Ignoring `npm audit` warnings because they are "dev dependencies" — build-time attacks are real
- Pinning to ancient versions to avoid breaking changes — accumulates security debt
- Adding dependencies for trivial functionality (left-pad syndrome)
- Auto-merging major version updates without review — breaking changes and new vulnerabilities
- Running audit only locally, never in CI — inconsistent and forgettable
- Vendoring dependencies without a process to update them

## Checklist
- [ ] Dependency audit runs in CI and blocks on critical/high findings
- [ ] Dependabot or Renovate configured with appropriate update schedule
- [ ] Patch updates auto-merge after passing CI
- [ ] Major updates require manual review
- [ ] License allowlist defined and enforced in CI
- [ ] No copyleft dependencies without legal approval
- [ ] SBOM generated for every release in CycloneDX or SPDX format
- [ ] Production and development dependencies are separated
- [ ] Transitive dependency tree reviewed for unexpected inclusions
- [ ] Vulnerability remediation SLA defined by severity level
