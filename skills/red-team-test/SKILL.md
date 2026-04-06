---
name: red-team-test
category: security
description: Backend red team testing -- 2-round protocol with OWASP-based attack taxonomy, severity scoring, and structured reporting
---

# Red Team Testing

## Overview

Load this skill when performing red team security testing on backend API projects. This skill uses a 2-round protocol:

- Round 1: systematic sweep across endpoints and attack categories
- Round 2: adversarial creative testing with attack chaining and edge-case probes

## Applicability

Backend projects only:

- Java (Spring Boot, Quarkus, Micronaut)
- Go (Gin, Echo, Fiber, net/http)
- Python with web frameworks (Django, FastAPI, Flask)
- Rust (Axum, Actix-web, Rocket)

## Attack Taxonomy (6 Domains, 22 Categories)

Based on OWASP API Security Top 10 2023 and WSTG.

### 1) Authentication & Authorization (AA)

- **AA-01** Broken Object-Level Authorization (BOLA/IDOR)
- **AA-02** Broken Authentication
- **AA-03** Broken Function-Level Authorization
- **AA-04** Broken Object Property-Level Authorization (mass assignment)

### 2) Input Validation & Injection (IV)

- **IV-01** SQL Injection
- **IV-02** NoSQL Injection
- **IV-03** Command Injection
- **IV-04** SSRF
- **IV-05** Path Traversal

### 3) Business Logic (BL)

- **BL-01** Race Conditions
- **BL-02** Workflow Bypass
- **BL-03** Rate Limit Bypass

### 4) Resource & Configuration (RC)

- **RC-01** Unrestricted Resource Consumption
- **RC-02** Server Misconfiguration
- **RC-03** Improper Inventory Management
- **RC-04** Unsafe API Consumption

### 5) Data Security (DS)

- **DS-01** Excessive Data Exposure
- **DS-02** Sensitive Data in Logs
- **DS-03** Insecure Data Storage

### 6) Session & Token (ST)

- **ST-01** JWT Vulnerabilities
- **ST-02** Session Fixation/Hijacking

## Two-Round Protocol

### Round 1: Systematic Sweep

Objective: check every attack category against every endpoint.

1. Enumerate all API endpoints from routes/controllers
2. For each endpoint x category:
   - Craft payloads
   - Send requests and analyze responses
   - Check data leakage and authorization gaps
   - Record finding or mark N/A
3. Score each finding (simplified CVSS)
4. Generate Round 1 report

### Round 2: Adversarial Creative Attack

Objective: chain weaknesses and probe attacker-style edge cases.

1. Review Round 1 findings for chaining opportunities
2. Attempt multi-step chains
3. Probe timing channels and race conditions
4. Test boundary conditions (overflow, encoding, null-byte)
5. Generate Round 2 report

## Severity Scoring (Simplified CVSS)

| Severity | Score Range | Action | Blocks Release? |
| --- | --- | --- | --- |
| Critical | 9.0 - 10.0 | Must fix | Yes |
| High | 7.0 - 8.9 | Should fix | Yes |
| Medium | 4.0 - 6.9 | Recommended | No |
| Low | 0.1 - 3.9 | Optional | No |
| Info | 0.0 | Record only | No |

Factors:

- attack complexity
- required privileges
- user interaction required
- confidentiality/integrity/availability impact

## Verdict Rules

- **PASS**: no critical/high findings remain
- **CONDITIONAL**: high findings accepted with explicit justification
- **BLOCK**: critical findings present

## SQLite Tracking

Record all rounds and findings in `.bbg/telemetry.db`:

- Initialize schema: `sqlite3 .bbg/telemetry.db < .bbg/scripts/red-team-schema.sql`
- Trend: `SELECT * FROM v_red_team_trend`
- Domain heatmap: `SELECT * FROM v_attack_domain_heatmap`

## Rules

- Always complete Round 1 before Round 2
- Never skip attack categories in Round 1 (mark N/A if needed)
- Score every finding
- Record all findings, including informational
- Generate report from `docs/reports/red-team-report-TEMPLATE.md`
- Reference playbook `docs/security/backend-red-team-playbook.md`

## Checklist

- [ ] Endpoints enumerated
- [ ] Round 1 matrix complete
- [ ] Findings scored
- [ ] Round 2 chains explored
- [ ] Timing and boundary attacks attempted
- [ ] SQLite records created
- [ ] Structured report generated
- [ ] Verdict determined

## Related

- **Skills**: [security-review](../security-review/SKILL.md), [security-hardening](../security-hardening/SKILL.md)
- **Commands**: [/red-team](../../commands/red-team.md), [/security-scan](../../commands/security-scan.md)
- **Docs**: [backend-red-team-playbook](../../templates/generic/docs/security/backend-red-team-playbook.md)
